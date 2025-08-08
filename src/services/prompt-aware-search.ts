import { promises as fs } from 'fs';
import * as path from 'path';
import type { Logger } from '../types/index.js';

export interface SearchResultItem {
  path: string;
  type: 'file' | 'directory';
  reason: string;
}

export class PromptAwareSearchService {
  private readonly logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }

  async findMentionedArtifacts(root: string, entities: { files?: string[]; classes?: string[] }): Promise<SearchResultItem[]> {
    const results: SearchResultItem[] = [];
    try {
      // Search for file name matches in a shallow walk (non-recursive heavy), limited for perf
      const items = await fs.readdir(root, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(root, item.name);
        if (item.isDirectory()) {
          if (/src|app|extensions|modules|Controllers|Views|FrontEnd/i.test(item.name)) {
            results.push({ path: full, type: 'directory', reason: 'likely source directory' });
          }
          continue;
        }
        if (entities.files?.some(f => item.name.toLowerCase().includes(path.basename(f).toLowerCase()))) {
          results.push({ path: full, type: 'file', reason: 'mentioned in prompt' });
        }
        if (entities.classes?.some(c => item.name.includes(c))) {
          results.push({ path: full, type: 'file', reason: 'class name match' });
        }
      }
    } catch (error) {
      this.logger.debug?.('Prompt-aware search skipped (no workspace or access denied)');
    }
    return results.slice(0, 50);
  }
}


