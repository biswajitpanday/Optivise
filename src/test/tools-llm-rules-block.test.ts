import { describe, it, expect } from 'vitest';
import { createLogger } from '../utils/logger.js';
import { CodeAnalyzerTool } from '../tools/code-analyzer-tool.js';
import { DebugHelperTool } from '../tools/debug-helper-tool.js';
import { ImplementationGuideTool } from '../tools/implementation-guide-tool.js';
import { ProjectHelperTool } from '../tools/project-helper-tool.js';

const logger = createLogger('error');
const projectPath = process.cwd();

function hasRulesBlock(blocks: any[]): boolean {
  return Array.isArray(blocks) && blocks.some(b => b?.type === 'rules');
}

describe('Tools include rules context block when projectPath is provided', () => {
  it('code-analyzer includes rules block', async () => {
    const tool = new CodeAnalyzerTool(logger);
    await tool.initialize();
    const res = await tool.analyzeCode({
      codeSnippet: 'var x = 1; // test',
      language: 'typescript',
      analysisType: 'all',
      userPrompt: 'analyze',
      projectPath
    });
    expect(res.llm_request).toBeDefined();
    expect(hasRulesBlock(res.llm_request!.contextBlocks)).toBe(true);
  });

  it('debug-helper includes rules block', async () => {
    const tool = new DebugHelperTool(logger);
    await tool.initialize();
    const res = await tool.analyzeBug({
      bugDescription: 'Build error in project',
      userPrompt: 'help',
      projectPath
    });
    expect(res.llm_request).toBeDefined();
    expect(hasRulesBlock(res.llm_request!.contextBlocks)).toBe(true);
  });

  it('implementation-guide includes rules block', async () => {
    const tool = new ImplementationGuideTool(logger);
    await tool.initialize();
    const res = await tool.analyzeTicket({
      ticketContent: 'Implement a new feature in CMS',
      userPrompt: 'plan',
      projectPath
    });
    expect(res.llm_request).toBeDefined();
    expect(hasRulesBlock(res.llm_request!.contextBlocks)).toBe(true);
  });

  it('project-helper includes rules block', async () => {
    const tool = new ProjectHelperTool(logger);
    await tool.initialize();
    const res = await tool.provideAssistance({
      requestType: 'setup',
      projectDetails: 'New project details',
      userPrompt: 'setup',
      projectPath
    });
    expect(res.llm_request).toBeDefined();
    expect(hasRulesBlock(res.llm_request!.contextBlocks)).toBe(true);
  });
});


