#!/usr/bin/env node
import { RuleIntelligenceService } from '../services/rule-intelligence-service.js';
import { createLogger } from '../utils/logger.js';
import * as path from 'path';

async function main() {
  const logger = createLogger('error');
  const svc = new RuleIntelligenceService(logger);
  await svc.initialize();

  const [,, sub, projectPathArg, flag] = process.argv;
  const projectPath = projectPathArg ? path.resolve(process.cwd(), projectPathArg) : process.cwd();

  switch (sub) {
    case 'propose': {
      const analysis = await svc.analyzeIDERules(projectPath);
      const result = {
        foundFiles: analysis.foundFiles,
        lintWarnings: analysis.lintWarnings,
        conflicts: analysis.conflicts,
        normalized: analysis.normalizedDirectives,
        proposed: analysis.proposedCursorRules,
        diff: analysis.proposedCursorRulesDiff
      };
      console.log(JSON.stringify(result, null, 2));
      // Write .cursorrules if --write or --yes present
      const shouldWrite = flag === '--write' || flag === '--yes';
      if (shouldWrite && analysis.proposedCursorRules) {
        const fs = await import('fs/promises');
        const target = path.join(projectPath, '.cursorrules');
        await fs.writeFile(target, analysis.proposedCursorRules, 'utf-8');
        console.log(JSON.stringify({ action: 'write', file: target, ok: true }, null, 2));
      }
      break;
    }
    default: {
      console.log('Usage: optivise-rules propose [projectPath] [--write|--yes]');
    }
  }
}

main().catch((err) => {
  console.error('Rules CLI failed:', err);
  process.exit(1);
});


