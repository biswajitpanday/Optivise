#!/usr/bin/env node
import fetch from 'node-fetch';

function parseArgs(argv: string[]) {
  const args: { url: string; ready: boolean } = { url: '', ready: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i] ?? '';
    if (a === '--ready') {
      args.ready = true;
    } else if (a.startsWith('--url=')) {
      args.url = a.substring('--url='.length);
    } else if (!args.url && a) {
      args.url = a;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const defaultUrl = args.ready ? 'http://localhost:3007/ready' : 'http://localhost:3007/health';
  const url = args.url || process.env.OPTIVISE_HEALTH_URL || defaultUrl;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'accept': 'application/json' } });
    const json: any = await (res.json() as Promise<unknown>);
    const summary: any = {
      ok: res.ok,
      status: (json as any).status || 'unknown',
      service: (json as any).service,
      version: (json as any).version,
      uptimeSec: Math.round(((json as any).uptime || 0)),
      ai: (json as any).ai || {},
      index: (json as any).index || {},
      docSync: (json as any).docSync || {},
      timestamp: (json as any).timestamp || new Date().toISOString()
    };
    if (args.ready) {
      summary.features = (json as any).features;
      summary.services = (json as any).services;
      summary.stats = (json as any).stats;
    }
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: 'HEALTH_UNAVAILABLE', url, message: (err as Error).message }, null, 2));
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, error: 'HEALTH_CLI_FAILED', message: (err as Error).message }, null, 2));
  process.exit(1);
});


