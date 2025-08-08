import { describe, it, expect, beforeAll } from 'vitest';
import { createLogger } from '../utils/logger.js';
import { DebugHelperTool } from '../tools/debug-helper-tool.js';
import { ProjectHelperTool } from '../tools/project-helper-tool.js';
import { CodeAnalyzerTool } from '../tools/code-analyzer-tool.js';

const logger = createLogger('error');
const projectPath = process.cwd();

describe('E2E agent-ready outputs for common flows', () => {
  let debugTool: DebugHelperTool;
  let projectTool: ProjectHelperTool;
  let codeTool: CodeAnalyzerTool;

  beforeAll(async () => {
    debugTool = new DebugHelperTool(logger);
    await debugTool.initialize();
    projectTool = new ProjectHelperTool(logger);
    await projectTool.initialize();
    codeTool = new CodeAnalyzerTool(logger);
    await codeTool.initialize();
  });

  it('Troubleshooting flow (bugfix) produces agent-ready llm_request with rules', async () => {
    const res = await debugTool.analyzeBug({
      bugDescription: 'Payment timeout during checkout',
      userPrompt: 'Investigate payment timeout',
      projectPath,
      promptContext: { userIntent: 'troubleshooting', severity: 'high' }
    });
    const req = res.llm_request!;
    expect(req).toBeDefined();
    expect(req.tags?.find(t => t.includes('[tool:optidev_debug_helper]'))).toBeDefined();
    expect(req.contentTypes?.includes('text/markdown')).toBe(true);
    expect(req.previewMarkdown).toBeDefined();
    const hasRules = req.contextBlocks.some(b => b.type === 'rules');
    expect(hasRules).toBe(true);
  });

  it('Migration flow produces agent-ready llm_request with migration plan and rules', async () => {
    const res = await projectTool.provideAssistance({
      requestType: 'migration',
      projectDetails: 'Migrate Optimizely CMS from 11.0 to 12.0',
      userPrompt: 'Plan migration',
      projectPath,
      promptContext: { userIntent: 'migration' }
    });
    const req = res.llm_request!;
    expect(req).toBeDefined();
    expect(req.tags?.find(t => t.includes('[tool:optidev_project_helper]'))).toBeDefined();
    const hasMigrationPlan = req.contextBlocks.some(b => b.title?.includes('Migration Plan'));
    expect(hasMigrationPlan).toBe(true);
    const hasRules = req.contextBlocks.some(b => b.type === 'rules');
    expect(hasRules).toBe(true);
  });

  it('Performance flow (code analyzer) includes detection evidence, performance issues, and ordering by relevance', async () => {
    const code = `
      const arr = [1,2,3,4,5];
      var total = 0; // best-practices issue
      for (let i = 0; i < arr.length; i++) { // performance pattern
        total += arr[i];
      }
      console.log(total);
    `;
    const res = await codeTool.analyzeCode({
      codeSnippet: code,
      language: 'typescript',
      analysisType: 'performance',
      userPrompt: 'Improve performance',
      projectPath,
      promptContext: { userIntent: 'performance' }
    });
    const req = res.llm_request!;
    expect(req).toBeDefined();
    expect(req.tags?.find(t => t.includes('[tool:optidev_code_analyzer]'))).toBeDefined();
    const hasPerf = req.contextBlocks.some(b => b.title?.includes('Performance Issues'));
    expect(hasPerf).toBe(true);
    const hasEvidence = req.contextBlocks.some(b => b.type === 'detection-evidence');
    expect(hasEvidence).toBe(true);
    // Relevance ordering: first block should be high relevance summary/plan
    expect(['Code Quality Summary', 'Performance Issues']).toContain(req.contextBlocks[0].title);
  });
});


