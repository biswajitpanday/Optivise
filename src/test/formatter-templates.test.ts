import { describe, it, expect } from 'vitest';
import { RequestFormatter } from '../formatters/request-formatter.js';
import { FormatterTemplates } from '../formatters/templates.js';

describe('Formatter templates', () => {
  it('applies per-tool system prompt', () => {
    const req = RequestFormatter.format({
      toolName: 'optidev_code_analyzer',
      template: FormatterTemplates.optidev_code_analyzer,
      blocks: [],
      products: ['cms-paas']
    });
    expect(req.systemPrompt).toContain('meticulous Optimizely code reviewer');
  });

  it('prefixes user prompt when userPrefix provided', () => {
    const req = RequestFormatter.format({
      toolName: 'optidev_code_analyzer',
      template: { ...FormatterTemplates.optidev_code_analyzer, userPrefix: 'Context follows:' },
      userPrompt: 'Analyze this',
      blocks: []
    });
    expect(req.userPrompt.startsWith('Context follows:')).toBe(true);
  });
});



