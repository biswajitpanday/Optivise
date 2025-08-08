import type { Logger, OptimizelyProduct } from '../types/index.js';

export interface SessionSnapshot {
  recentProducts: OptimizelyProduct[];
  recentFiles: string[];
  recentTools: string[];
}

export class SessionMemoryService {
  private readonly logger: Logger;
  private readonly recentProducts: OptimizelyProduct[] = [];
  private readonly recentFiles: string[] = [];
  private readonly recentTools: string[] = [];
  private readonly maxItems = 10;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  recordInteraction(data: { products?: OptimizelyProduct[]; files?: string[]; toolName?: string }): void {
    if (data.products?.length) {
      data.products.forEach(p => this.pushUnique(this.recentProducts, p));
    }
    if (data.files?.length) {
      data.files.forEach(f => this.pushUnique(this.recentFiles, f));
    }
    if (data.toolName) {
      this.pushUnique(this.recentTools, data.toolName);
    }
  }

  getSnapshot(): SessionSnapshot {
    return {
      recentProducts: [...this.recentProducts],
      recentFiles: [...this.recentFiles],
      recentTools: [...this.recentTools]
    };
  }

  private pushUnique<T>(arr: T[], value: T): void {
    const idx = arr.indexOf(value);
    if (idx !== -1) {
      arr.splice(idx, 1);
    }
    arr.unshift(value);
    if (arr.length > this.maxItems) {
      arr.pop();
    }
  }
}


