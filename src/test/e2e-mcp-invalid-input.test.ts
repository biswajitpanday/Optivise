import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const ROOT = path.join(__dirname, '..', '..');

describe('E2E MCP (stdio) - invalid input structured errors', () => {
  let child: ChildProcessWithoutNullStreams | null = null;
  let client: Client | null = null;

  beforeAll(async () => {
    const distEntry = path.join(ROOT, 'dist', 'index.js');
    if (!fs.existsSync(distEntry)) return;

    child = spawn('node', [distEntry], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, LOG_LEVEL: 'error', OPTIDEV_DEBUG: 'false' }
    });

    const transport = new StdioClientTransport({ stdin: child.stdin!, stdout: child.stdout! });
    client = new Client({ name: 'optivise-e2e-invalid', version: '0.0.1' }, { transport });
    await client.connect();
  }, 15000);

  afterAll(async () => {
    try { await client?.close(); } catch {}
    try { child?.kill('SIGTERM'); } catch {}
  });

  it('returns structured Zod error for missing required fields', async function () {
    if (!client) return this.skip();
    const resp = await client.request(CallToolRequestSchema, {
      name: 'optidev_code_analyzer',
      arguments: {
        // Missing required codeSnippet
        language: 'typescript',
        analysisType: 'all'
      }
    } as any);
    const content = (resp as any).content?.[0]?.text;
    const parsed = JSON.parse(content);
    expect(parsed?.status).toBe('error');
    expect(parsed?.error?.code).toBe('INVALID_INPUT');
    expect(Array.isArray(parsed?.error?.issues)).toBe(true);
  }, 20000);
});


