import { describe, it, expect } from 'vitest';
import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';

const logger = { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } as any;

describe('Session memory and prompt cache', () => {
  it('caches prompt analysis result and returns quickly on repeat', async () => {
    const engine = new ContextAnalysisEngine(logger);
    await engine.initialize();
    const prompt = 'How to configure CMS 12 content types?';
    const first = await engine.analyze({ prompt });
    const second = await engine.analyze({ prompt });
    expect(second.processingTime).toBeLessThanOrEqual(first.processingTime);
  });
});


