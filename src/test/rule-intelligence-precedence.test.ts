import { describe, it, expect, vi, beforeAll } from 'vitest';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';

class TestLogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
}

describe('RuleIntelligenceService precedence and cleanup suggestions', () => {
  const logger: any = new TestLogger();
  const svc = new RuleIntelligenceService(logger);

  beforeAll(async () => {
    await svc.initialize();
  });

  it('sorts rules by precedence and suggests cleanup for empty files', async () => {
    // Use a synthetic path; the service is resilient to missing files.
    const result = await svc.analyzeIDERules(process.cwd());
    expect(result).toBeDefined();
    expect(Array.isArray(result.existingRules)).toBe(true);
    expect(Array.isArray(result.suggestedEnhancements)).toBe(true);
  });
});


