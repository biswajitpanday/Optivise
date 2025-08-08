import { describe, it, expect, beforeAll } from 'vitest';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';

class TestLogger { debug(){} info(){} warn(){} error(){} }

describe('RuleIntelligenceService normalization and merge notes', () => {
  const svc = new RuleIntelligenceService(new TestLogger() as any);
  beforeAll(async () => { await svc.initialize(); });

  it('returns normalizedDirectives and mergeNotes arrays', async () => {
    const result = await svc.analyzeIDERules(process.cwd());
    expect(result).toHaveProperty('normalizedDirectives');
    expect(result).toHaveProperty('mergeNotes');
    expect(Array.isArray(result.normalizedDirectives)).toBe(true);
    expect(Array.isArray(result.mergeNotes)).toBe(true);
    expect(typeof result.proposedCursorRules).toBeTypeOf('string');
    expect(typeof result.proposedCursorRulesDiff).toBeTypeOf('string');
  });
});


