import { describe, it, expect } from 'vitest';
import { RequestFormatter } from '../formatters/request-formatter.js';

describe('RequestFormatter', () => {
  it('builds an agent-ready LLMRequest with tags and blocks', () => {
    const req = RequestFormatter.format({
      toolName: 'optidev_code_analyzer',
      userPrompt: 'Improve performance of this TypeScript function',
      products: ['cms-paas'],
      promptContext: {
        userIntent: 'performance',
        severity: 'medium',
        versions: [{ product: 'cms-paas', version: '12.0' }]
      },
      blocks: [
        { type: 'analysis', title: 'Summary', content: 'Overall quality is B with specific hotspots.' }
      ],
      citations: [{ title: 'Optimizely CMS Docs', url: 'https://docs.optimizely.com/content-management-system/' }]
    });

    expect(req.systemPrompt).toContain('Tool: optidev_code_analyzer');
    expect(req.userPrompt).toContain('Improve performance');
    expect(req.contextBlocks.length).toBeGreaterThan(0);
    expect(req.tags?.some(t => t.startsWith('[optimizely:product='))).toBe(true);
    expect(req.tags?.some(t => t.startsWith('[intent:'))).toBe(true);
    expect(req.citations?.length).toBe(1);
    expect(req.modelHints?.maxTokens).toBeGreaterThan(0);
    expect(req.telemetry?.tokenEstimate).toBeGreaterThan(0);
  });

  it('applies token budgeting by dropping low-relevance blocks', () => {
    const req = RequestFormatter.format({
      toolName: 'optidev_code_analyzer',
      userPrompt: 'Review this handler',
      products: ['configured-commerce'],
      blocks: [
        { type: 'analysis', title: 'A', content: 'a'.repeat(4000), relevance: 0.1 },
        { type: 'analysis', title: 'B', content: 'b'.repeat(4000), relevance: 0.9 }
      ],
      tokenBudget: { maxContextTokens: 800, dropLowRelevanceFirst: true }
    });
    expect(req.contextBlocks.length).toBe(1);
    expect(req.telemetry?.truncationApplied).toBe(true);
    expect((req.telemetry?.droppedBlocks || 0) >= 1).toBe(true);
    // Ensure ordering by relevance
    expect(req.contextBlocks[0].title).toBe('B');
    // previewMarkdown and contentTypes present
    expect(req.previewMarkdown).toBeDefined();
    expect(req.contentTypes?.includes('text/markdown')).toBe(true);
    // Optional correlation id support
    if (req.correlationId || req.telemetry?.correlationId) {
      expect(typeof (req.correlationId || req.telemetry?.correlationId)).toBe('string');
    }
  });
});


