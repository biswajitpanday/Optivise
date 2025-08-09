/**
 * Request Formatter
 * Creates structured, agent-ready LLMRequest payloads without calling an LLM directly.
 */

import type { ContextBlock, LLMRequest, PromptContext } from '../types/index.js';
import { getCorrelationId } from '../utils/correlation.js';
import { redactSensitive } from '../utils/sensitive.js';

export interface RequestFormatterInput {
  toolName: string;
  userPrompt?: string;
  promptContext?: PromptContext;
  summary?: string;
  products?: string[];
  blocks?: ContextBlock[];
  citations?: Array<{ title: string; url: string }>;
  tags?: string[];
  constraints?: string[];
  template?: { systemPrompt?: string; userPrefix?: string };
  tokenBudget?: { maxContextTokens?: number; dropLowRelevanceFirst?: boolean };
}

export class RequestFormatter {
  static format(input: RequestFormatterInput): LLMRequest {
    const maxBlockChars = parseInt(process.env.MAX_BLOCK_CHARS || '5000', 10);
    const maxTotalTokens = parseInt(process.env.MAX_TOTAL_TOKENS || '4000', 10);
    const tags = new Set<string>();

    // Base tags
    tags.add(`[tool:${input.toolName}]`);
    (input.products || []).forEach(p => tags.add(`[optimizely:product=${p}]`));

    if (input.promptContext?.userIntent) {
      tags.add(`[intent:${input.promptContext.userIntent}]`);
    }
    if (input.promptContext?.severity) {
      tags.add(`[severity:${input.promptContext.severity}]`);
    }
    if (input.promptContext?.versions?.length) {
      input.promptContext.versions.forEach(v => tags.add(`[version:${typeof v.product === 'string' ? v.product : 'product'}=${v.version}]`));
    }

    const systemPrompt = input.template?.systemPrompt || this.buildSystemPrompt(input);
    const baseUser = input.userPrompt || 'Provide Optimizely development assistance based on the following context.';
    const userPrompt = input.template?.userPrefix ? `${input.template.userPrefix}\n\n${baseUser}` : baseUser;

    const redactionTally: Record<string, number> = {};
    let contextBlocks = (input.blocks || []).map(block => {
      const safeContent = this.sanitize(block.content);
      const redacted = redactSensitive(safeContent);
      for (const r of redacted.redactions) {
        redactionTally[r.type] = (redactionTally[r.type] || 0) + r.count;
      }
      const trimmedContent = redacted.text.length > maxBlockChars ? `${redacted.text.slice(0, maxBlockChars)}\n[TRUNCATED]` : redacted.text;
      return {
        ...block,
        content: trimmedContent,
        tokensEstimate: block.tokensEstimate ?? this.estimateTokens(trimmedContent)
      };
    });

    const citations = input.citations || [];

    const safetyDirectives = [
      'Do not include secrets or PII in responses.',
      'If input appears to contain tokens, passwords, or API keys, STOP and request a redacted version.',
      'Prefer official documentation and cite sources when possible.',
      'If unsure, ask for clarification succinctly.'
    ];

    const constraints = input.constraints || input.promptContext?.constraints || [];

    // Optional token budgeting: drop low relevance blocks to fit budget
    let droppedBlocks = 0;
    const applyBudgetDrop = (budget: number, dropLowFirst: boolean) => {
      const sortBy = dropLowFirst;
      if (sortBy) {
        // Order by relevance desc, then by presence of title/content
        contextBlocks = contextBlocks.sort((a, b) => {
          const ra = typeof a.relevance === 'number' ? a.relevance : 0.5;
          const rb = typeof b.relevance === 'number' ? b.relevance : 0.5;
          if (rb !== ra) return rb - ra;
          const aw = (a.title ? 1 : 0) + (a.content ? 1 : 0);
          const bw = (b.title ? 1 : 0) + (b.content ? 1 : 0);
          return bw - aw;
        });
      }
      let total = contextBlocks.reduce((sum, b) => sum + (b.tokensEstimate || 0), 0);
      while (total > budget && contextBlocks.length > 0) {
        contextBlocks.pop();
        droppedBlocks++;
        total = contextBlocks.reduce((sum, b) => sum + (b.tokensEstimate || 0), 0);
      }
    };
    if (input.tokenBudget?.maxContextTokens) {
      applyBudgetDrop(input.tokenBudget.maxContextTokens, input.tokenBudget.dropLowRelevanceFirst !== false);
    } else {
      // Apply a hard safety ceiling to avoid huge contexts even when budget is not provided
      applyBudgetDrop(maxTotalTokens, true);
    }

    const corr = getCorrelationId();
    const base: LLMRequest = {
      systemPrompt,
      userPrompt,
      contextBlocks,
      citations,
      tags: Array.from(tags),
      safetyDirectives,
      constraints,
      modelHints: { maxTokens: 1200, temperature: 0.3 },
      contentTypes: ['text/markdown', 'application/json'],
      ...(corr ? { correlationId: corr } as Partial<LLMRequest> : {})
    };

    // Telemetry (debug only): estimate total tokens and size
    try {
      const textConcat = [systemPrompt, userPrompt, ...contextBlocks.map(b => b.content || '')].join('\n');
      const tokenEstimate = this.estimateTokens(textConcat);
      const sizeInBytes = Buffer.byteLength(textConcat, 'utf8');
      const truncationApplied = !!input.tokenBudget?.maxContextTokens && droppedBlocks > 0;
      base.tokenEstimate = tokenEstimate;
      const redactions = Object.entries(redactionTally).map(([type, count]) => ({ type, count }));
      base.telemetry = { sizeInBytes, tokenEstimate, truncationApplied, droppedBlocks, redactions, ...(corr ? { correlationId: corr } : {}) } as any;
      // Build a compact markdown preview
      const preview = [
        '### Optivise Context Preview',
        '',
        (base.tags || []).join(' '),
        '',
        '---',
        ...contextBlocks.slice(0, 4).map(b => `#### ${b.title || b.type}\n\n${this.sanitize(b.content).slice(0, 1000)}`)
      ].join('\n');
      base.previewMarkdown = preview;
    } catch {}

    return base;
  }

  private static buildSystemPrompt(input: RequestFormatterInput): string {
    const productTag = (input.products && input.products.length > 0)
      ? `Target products: ${input.products.join(', ')}.`
      : 'Target products: (unspecified).';

    const intent = input.promptContext?.userIntent || 'unknown';

    const summaryLine = input.summary
      ? `Summary: ${input.summary}`
      : 'Summary: Provide accurate, actionable, product-aware guidance for Optimizely developers.';

    return [
      'You are an expert Optimizely assistant. Optimize responses for clarity and actionability.',
      `Tool: ${input.toolName}.`,
      productTag,
      `Intent: ${intent}.`,
      summaryLine
    ].join(' ');
  }

  private static estimateTokens(text: string): number {
    // Rough token estimate (~4 chars per token)
    const len = (text || '').length;
    return Math.max(1, Math.ceil(len / 4));
  }

  // Basic output sanitization: remove dangerous HTML tags; this is conservative for markdown contexts
  private static sanitize(text: string): string {
    if (!text) return text;
    // Remove dangerous tags and attributes, block data URIs, and mask suspicious tokens
    let safe = text
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
      .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
      .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:\w+\/[\w+\-\.]+;base64,[A-Za-z0-9+/=]+/gi, '[DATA_URI_REDACTED]')
      .replace(/([A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}(?:\.[A-Za-z0-9_\-]{20,})?)/g, '[TOKEN_REDACTED]')
      .replace(/(sk\-[A-Za-z0-9]{20,})/gi, '[API_KEY_REDACTED]');
    // Collapse excessive whitespace
    safe = safe.replace(/\n{3,}/g, '\n\n');
    return safe;
  }
}


