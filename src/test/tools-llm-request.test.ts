import { describe, it, expect } from 'vitest';
import { createLogger } from '../utils/logger.js';
import { CodeAnalyzerTool } from '../tools/code-analyzer-tool.js';
import { DebugHelperTool } from '../tools/debug-helper-tool.js';
import { ImplementationGuideTool } from '../tools/implementation-guide-tool.js';
import { ProjectHelperTool } from '../tools/project-helper-tool.js';

const logger = createLogger('error');

describe('Tools emit llm_request handoff', () => {
  it('code-analyzer emits llm_request', async () => {
    const tool = new CodeAnalyzerTool(logger);
    await tool.initialize();
    const res = await tool.analyzeCode({
      codeSnippet: 'const x = 1; var y = 2;',
      language: 'typescript',
      analysisType: 'all',
      userPrompt: 'Improve code quality',
      promptContext: { userIntent: 'best-practices' }
    });
    expect(res.llm_request).toBeDefined();
    expect(res.llm_request?.tags?.length).toBeGreaterThan(0);
    expect(res.llm_request?.contextBlocks?.length).toBeGreaterThan(0);
  });

  it('debug-helper emits llm_request', async () => {
    const tool = new DebugHelperTool(logger);
    await tool.initialize();
    const res = await tool.analyzeBug({
      bugDescription: 'Checkout payment fails with timeout',
      userPrompt: 'Fix payment timeout',
      promptContext: { userIntent: 'troubleshooting', severity: 'high' }
    });
    expect(res.llm_request).toBeDefined();
  });

  it('implementation-guide emits llm_request', async () => {
    const tool = new ImplementationGuideTool(logger);
    await tool.initialize();
    const res = await tool.analyzeTicket({
      ticketContent: 'Implement a new CMS page for promotions with approval workflow',
      userPrompt: 'Plan implementation',
      promptContext: { userIntent: 'feature' }
    });
    expect(res.llm_request).toBeDefined();
  });

  it('project-helper emits llm_request', async () => {
    const tool = new ProjectHelperTool(logger);
    await tool.initialize();
    const res = await tool.provideAssistance({
      requestType: 'setup',
      projectDetails: 'New Optimizely CMS project on PaaS',
      userPrompt: 'Set me up',
      promptContext: { userIntent: 'configuration' }
    });
    expect(res.llm_request).toBeDefined();
  });
});


