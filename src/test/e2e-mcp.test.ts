import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const ROOT = path.join(__dirname, '..', '..');

describe('E2E MCP (stdio) - basic flows', () => {
  let child: ChildProcessWithoutNullStreams | null = null;
  let client: Client | null = null;

  beforeAll(async () => {
    // Skip on Windows or when explicitly disabled for local runs
    if (process.platform === 'win32' || process.env.SKIP_MCP_STDIO === 'true') {
      // eslint-disable-next-line no-console
      console.warn('E2E MCP stdio tests skipped on this platform/config');
      return;
    }
    // Prefer compiled server if available
    const distEntry = path.join(ROOT, 'dist', 'index.js');
    if (!fs.existsSync(distEntry)) {
      // If not built, skip E2E tests gracefully
      // eslint-disable-next-line no-console
      console.warn('E2E skipped: dist/index.js not found. Run "npm run build" to enable E2E tests.');
      return;
    }

    child = spawn('node', [distEntry], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'error',
        OPTIDEV_DEBUG: 'false',
      }
    });

    const transport = new StdioClientTransport({
      stdin: child.stdin!,
      stdout: child.stdout!
    });

    client = new Client({ name: 'optivise-e2e', version: '0.0.1' }, { transport });
    await client.connect();
  }, 15000);

  afterAll(async () => {
    try {
      await client?.close();
    } catch {}
    try {
      child?.kill('SIGTERM');
    } catch {}
  });

  it('lists tools and can call code analyzer returning llm_request', async function () {
    if (!client) return this.skip();

    const tools = await client.request(ListToolsRequestSchema, {} as any);
    expect(Array.isArray((tools as any).tools)).toBe(true);

    const resp = await client.request(CallToolRequestSchema, {
      name: 'optidev_code_analyzer',
      arguments: {
        codeSnippet: 'public class Foo { }',
        language: 'csharp',
        analysisType: 'best-practices',
        userPrompt: 'Review this snippet for Optimizely CMS patterns'
      }
    } as any);

    const content = (resp as any).content?.[0]?.text;
    expect(typeof content).toBe('string');
    const parsed = JSON.parse(content);
    expect(parsed?.data?.llm_request).toBeDefined();
    expect(parsed?.data?.llm_request?.systemPrompt).toBeTypeOf('string');
    expect(parsed?.data?.llm_request?.telemetry?.tokenEstimate).toBeGreaterThan(0);
  }, 20000);

  it('calls debug helper and returns llm_request', async function () {
    if (!client) return this.skip();
    const resp = await client.request(CallToolRequestSchema, {
      name: 'optidev_debug_helper',
      arguments: {
        bugDescription: 'Cart total incorrect after applying promotion',
        errorMessages: ['NullReferenceException at PricingService'],
        userPrompt: 'Help me debug a Configured Commerce pricing issue'
      }
    } as any);
    const content = (resp as any).content?.[0]?.text;
    const parsed = JSON.parse(content);
    expect(parsed?.data?.llm_request).toBeDefined();
    expect(parsed?.data?.llm_request?.telemetry?.sizeInBytes).toBeGreaterThan(0);
  }, 20000);

  it('calls implementation guide and returns llm_request', async function () {
    if (!client) return this.skip();
    const resp = await client.request(CallToolRequestSchema, {
      name: 'optidev_implementation_guide',
      arguments: {
        ticketContent: 'Implement Loyalty points accrual in Commerce',
        projectContext: 'Configured Commerce + CMS 12',
        userPrompt: 'Provide a solution outline and risks'
      }
    } as any);
    const content = (resp as any).content?.[0]?.text;
    const parsed = JSON.parse(content);
    expect(parsed?.data?.llm_request).toBeDefined();
    expect(parsed?.data?.llm_request?.telemetry?.tokenEstimate).toBeGreaterThan(0);
  }, 20000);

  it('calls project helper and returns llm_request', async function () {
    if (!client) return this.skip();
    const resp = await client.request(CallToolRequestSchema, {
      name: 'optidev_project_helper',
      arguments: {
        requestType: 'setup',
        projectDetails: 'New Configured Commerce + CMS integration',
        targetVersion: 'cms12',
        userPrompt: 'Guide initial project setup'
      }
    } as any);
    const content = (resp as any).content?.[0]?.text;
    const parsed = JSON.parse(content);
    expect(parsed?.data?.llm_request).toBeDefined();
  }, 20000);

  it('calls context analyzer via tool list and ensures formatted content exists when integrated', async function () {
    if (!client) return this.skip();
    const resp = await client.request(CallToolRequestSchema, {
      name: 'optidev_context_analyzer',
      arguments: {
        prompt: 'How to implement a custom handler in Optimizely Configured Commerce?',
        enableAI: false
      }
    } as any);
    const content = (resp as any).content?.[0]?.text;
    const parsed = JSON.parse(content);
    expect(parsed?.status).toBe('success');
    expect(parsed?.data?.curatedContext).toBeDefined();
  }, 20000);
});


