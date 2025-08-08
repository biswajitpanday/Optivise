#!/usr/bin/env node
import { chromaDBService } from '../integrations/chromadb-client.js';
import { documentationSyncService } from '../services/documentation-service.js';

async function main() {
  const cmd = process.argv[2];
  try {
    switch (cmd) {
      case 'seed': {
        const synced = await documentationSyncService.syncDocumentation({ force: true });
        console.log(JSON.stringify({ action: 'seed', result: synced }, null, 2));
        break;
      }
      case 'reindex': {
        const stats = await chromaDBService.getCollectionStats();
        console.log(JSON.stringify({ action: 'reindex', stats }, null, 2));
        break;
      }
      case 'clear': {
        const product = process.argv[3] || 'platform';
        const ok = await chromaDBService.clearCollection(product);
        console.log(JSON.stringify({ action: 'clear', product, ok }, null, 2));
        break;
      }
      case 'stats':
      default: {
        const stats = await chromaDBService.getCollectionStats();
        console.log(JSON.stringify({ action: 'stats', stats }, null, 2));
        break;
      }
    }
  } catch (err) {
    console.error('Indexing CLI failed:', err);
    process.exit(1);
  }
}

main();


