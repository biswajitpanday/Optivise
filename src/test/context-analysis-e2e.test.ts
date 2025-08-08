import { describe, it, expect } from 'vitest';
import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';

const logger = {
  debug: () => {}, info: () => {}, warn: () => {}, error: () => {}
} as any;

describe('ContextAnalysisEngine prompt-aware search', () => {
  it('includes prompt artifacts in promptContext when present', async () => {
    const engine = new ContextAnalysisEngine(logger);
    await engine.initialize();
    const res = await engine.analyze({ prompt: 'Check FooHandler.cs and Startup.cs for Configured Commerce', projectPath: process.cwd() });
    expect(res.promptContext?.artifacts?.length).toBeGreaterThan(0);
  });
});


