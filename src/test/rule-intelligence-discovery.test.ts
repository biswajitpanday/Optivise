import { describe, it, expect, beforeAll } from 'vitest';
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';

class TestLogger { debug(){} info(){} warn(){} error(){} }

describe('RuleIntelligenceService discovery', () => {
  const svc = new RuleIntelligenceService(new TestLogger() as any);
  beforeAll(async () => { await svc.initialize(); });

  it('returns lintWarnings and conflicts fields', async () => {
    const result = await svc.analyzeIDERules(process.cwd());
    expect(result).toHaveProperty('lintWarnings');
    expect(result).toHaveProperty('conflicts');
    expect(Array.isArray(result.lintWarnings)).toBe(true);
    expect(Array.isArray(result.conflicts)).toBe(true);
  });
});


