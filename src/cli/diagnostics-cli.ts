#!/usr/bin/env node
import { getVersionInfo } from '../config/version.js';
import { openAIClient } from '../integrations/openai-client.js';
import { chromaDBService } from '../integrations/chromadb-client.js';
import { documentationSyncService } from '../services/documentation-sync-service.js';

async function main() {
  const info = getVersionInfo();
  const ai = { available: openAIClient.isAvailable?.() ?? false, circuit: (openAIClient as any).getCircuitState?.() };
  const chroma = { available: chromaDBService.isAvailable?.() ?? false, circuit: chromaDBService.getCircuitState?.() };
  const docs = documentationSyncService.getSyncStatus?.() || {};
  console.log(JSON.stringify({
    app: info,
    services: { ai, chromaDB: chroma, documentationSync: docs },
    env: {
      mode: process.env.OPTIVISE_MODE || 'mcp',
      logLevel: process.env.LOG_LEVEL || 'info'
    }
  }, null, 2));
}

main().catch((err) => {
  console.error('Diagnostics CLI failed:', err);
  process.exit(1);
});


