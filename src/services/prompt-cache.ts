import crypto from 'crypto';

interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
}

export class PromptCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs = 5 * 60 * 1000) {}

  static hashPrompt(prompt: string): string {
    return crypto.createHash('sha256').update(prompt).digest('hex');
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { key, value, timestamp: Date.now() });
  }
}


