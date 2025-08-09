#!/usr/bin/env node
import fetch from 'node-fetch';

function parseArgs(argv: string[]) {
  const args = { url: '', ready: false } as { url: string; ready: boolean };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ready') args.ready = true;
    else if (a.startsWith('--url=')) args.url = a.substring('--url='.length);
    else if (!args.url) args.url = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const defaultUrl = args.ready ? 'http://localhost:3000/ready' : 'http://localhost:3000/health';
  const url = args.url || process.env.OPTIVISE_HEALTH_URL || defaultUrl;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'accept': 'application/json' } });
    const json = await res.json();
    const summary: any = {
      ok: res.ok,
      status: json.status || 'unknown',
      service: json.service,
      version: json.version,
      uptimeSec: Math.round((json.uptime || 0)),
      ai: json.ai || {},
      index: json.index || {},
      docSync: json.docSync || {},
      timestamp: json.timestamp || new Date().toISOString()
    };
    if (args.ready) {
      summary.features = json.features;
      summary.services = json.services;
      summary.stats = json.stats;
    }
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: 'HEALTH_UNAVAILABLE', url, message: (err as Error).message }, null, 2));
    process.exit(1);
  }
}

main();


