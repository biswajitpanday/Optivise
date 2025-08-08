import { describe, it, expect } from 'vitest';
import { PromptAnalyzer } from '../analyzers/prompt-analyzer.js';

describe('PromptAnalyzer', () => {
  it('classifies intent and extracts entities', async () => {
    const analyzer = new PromptAnalyzer({
      debug: () => {}, info: () => {}, warn: () => {}, error: () => {}
    } as any);
    await analyzer.initialize();
    const result = await analyzer.analyze('How to implement a custom Handler in Configured Commerce? See FooHandler.cs');
    expect(result.intent).toBe('code-help');
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.productHints.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });
});


