import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../utils/logger.js';
import { runWithCorrelationId } from '../utils/correlation.js';

describe('Logger correlation ID and JSON output', () => {
  const originalError = console.error;
  const originalEnv = { ...process.env };
  let outputs: string[] = [];

  beforeEach(() => {
    outputs = [];
    // Enable debug so logger emits in test environment
    process.env.OPTIDEV_DEBUG = 'true';
    console.error = (msg?: any) => {
      if (typeof msg === 'string') outputs.push(msg);
    };
  });

  afterEach(() => {
    console.error = originalError;
    process.env = { ...originalEnv };
  });

  it('includes correlationId in JSON log entries', async () => {
    const logger = createLogger('info');
    await runWithCorrelationId('test-corr-123', async () => {
      logger.info('hello', { sample: true });
    });

    expect(outputs.length).toBeGreaterThan(0);
    const parsed = outputs.map((o) => {
      try { return JSON.parse(o); } catch { return {}; }
    });
    const found = parsed.find((e: any) => e.message === 'hello' && e.correlationId === 'test-corr-123');
    expect(found).toBeDefined();
    expect(found.level).toBe('INFO');
    expect(found.meta).toBeDefined();
  });
});


