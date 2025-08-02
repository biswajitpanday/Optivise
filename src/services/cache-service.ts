/**
 * Advanced Caching and Performance Optimization Service
 * Provides intelligent caching with TTL, LRU eviction, and performance monitoring
 */

import { EventEmitter } from 'events';
import type { Logger } from '../types/index.js';

export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  entries: number;
  memoryUsage: number; // bytes
  hitRate: number; // percentage
  avgAccessTime: number; // milliseconds
}

export interface CacheConfig {
  maxEntries: number;
  maxMemoryMB: number;
  defaultTTL: number; // milliseconds
  cleanupInterval: number; // milliseconds
  enableMetrics: boolean;
}

export class CacheService extends EventEmitter {
  private cache = new Map<string, CacheEntry>();
  private accessTimes: number[] = [];
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    entries: 0,
    memoryUsage: 0,
    hitRate: 0,
    avgAccessTime: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private logger: Logger;
  private config: CacheConfig;

  constructor(logger: Logger, config?: Partial<CacheConfig>) {
    super();
    this.logger = logger;
    this.config = {
      maxEntries: 10000,
      maxMemoryMB: 256,
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableMetrics: true,
      ...config
    };

    this.startCleanupTimer();
    this.logger.info('Cache Service initialized', this.config as unknown as Record<string, unknown>);
  }

  /**
   * Store value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttlMs?: number): boolean {
    const startTime = Date.now();
    
    try {
      const ttl = ttlMs || this.config.defaultTTL;
      const size = this.estimateSize(value);
      const entry: CacheEntry<T> = {
        value,
        timestamp: Date.now(),
        ttl,
        accessCount: 1,
        lastAccessed: Date.now(),
        size
      };

      // Check memory constraints before adding
      if (this.wouldExceedMemoryLimit(size)) {
        this.evictLRUEntries();
        
        // If still would exceed after eviction, reject
        if (this.wouldExceedMemoryLimit(size)) {
          this.logger.warn('Cache entry too large, rejecting', { key, size });
          return false;
        }
      }

      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key)!;
        this.stats.memoryUsage -= oldEntry.size;
      }

      this.cache.set(key, entry);
      this.stats.entries = this.cache.size;
      this.stats.memoryUsage += size;

      this.recordAccessTime(Date.now() - startTime);
      this.emit('set', { key, size, ttl });

      return true;
    } catch (error) {
      this.logger.error('Failed to set cache entry', error as Error, { key });
      return false;
    }
  }

  /**
   * Retrieve value from cache
   */
  get<T>(key: string): T | null {
    const startTime = Date.now();
    
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.stats.misses++;
      this.recordAccessTime(Date.now() - startTime);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.entries = this.cache.size;
      this.stats.memoryUsage -= entry.size;
      this.stats.evictions++;
      this.stats.misses++;
      this.recordAccessTime(Date.now() - startTime);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    this.recordAccessTime(Date.now() - startTime);
    return entry.value;
  }

  /**
   * Check if key exists in cache (without accessing)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? !this.isExpired(entry) : false;
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.entries = this.cache.size;
      this.stats.memoryUsage -= entry.size;
      this.emit('delete', { key });
      return true;
    }
    return false;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const previousEntries = this.cache.size;
    this.cache.clear();
    this.stats.entries = 0;
    this.stats.memoryUsage = 0;
    this.emit('clear', { previousEntries });
    this.logger.info('Cache cleared', { previousEntries });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration 
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Cache configuration updated', this.config as unknown as Record<string, unknown>);
    this.emit('configUpdate', this.config);
  }

  /**
   * Get cache keys with optional filtering
   */
  getKeys(pattern?: RegExp): string[] {
    const keys = Array.from(this.cache.keys());
    return pattern ? keys.filter(key => pattern.test(key)) : keys;
  }

  /**
   * Get memory usage breakdown by key patterns
   */
  getMemoryBreakdown(): Record<string, { entries: number; memory: number }> {
    const breakdown: Record<string, { entries: number; memory: number }> = {};
    
    for (const [key, entry] of this.cache) {
      const category = this.categorizeKey(key);
      if (!breakdown[category]) {
        breakdown[category] = { entries: 0, memory: 0 };
      }
      breakdown[category].entries++;
      breakdown[category].memory += entry.size;
    }

    return breakdown;
  }

  /**
   * Manually trigger cache cleanup
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.stats.memoryUsage -= entry.size;
        this.stats.evictions++;
        cleaned++;
      }
    }

    this.stats.entries = this.cache.size;
    
    if (cleaned > 0) {
      this.logger.debug('Cache cleanup completed', { cleaned, remaining: this.cache.size });
      this.emit('cleanup', { cleaned, remaining: this.cache.size });
    }

    return cleaned;
  }

  /**
   * Preload cache with key-value pairs
   */
  async preload(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<number> {
    let loaded = 0;
    
    for (const { key, value, ttl } of entries) {
      if (this.set(key, value, ttl)) {
        loaded++;
      }
    }

    this.logger.info('Cache preload completed', { 
      requested: entries.length, 
      loaded, 
      failed: entries.length - loaded 
    });

    return loaded;
  }

  /**
   * Export cache contents for backup
   */
  export(): Array<{ key: string; value: any; ttl: number; timestamp: number }> {
    const exports: Array<{ key: string; value: any; ttl: number; timestamp: number }> = [];
    
    for (const [key, entry] of this.cache) {
      if (!this.isExpired(entry)) {
        exports.push({
          key,
          value: entry.value,
          ttl: entry.ttl,
          timestamp: entry.timestamp
        });
      }
    }

    return exports;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    try {
      if (value === null || value === undefined) return 8;
      if (typeof value === 'string') return value.length * 2; // UTF-16
      if (typeof value === 'number') return 8;
      if (typeof value === 'boolean') return 4;
      if (Buffer.isBuffer(value)) return value.length;
      
      // For objects, use JSON string length as approximation
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default fallback size
    }
  }

  /**
   * Check if adding entry would exceed memory limit
   */
  private wouldExceedMemoryLimit(entrySize: number): boolean {
    const maxBytes = this.config.maxMemoryMB * 1024 * 1024;
    return (this.stats.memoryUsage + entrySize) > maxBytes;
  }

  /**
   * Evict least recently used entries
   */
  private evictLRUEntries(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (ascending)
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const targetSize = this.config.maxMemoryMB * 1024 * 1024 * 0.8; // 80% of limit
    let evicted = 0;
    
    for (const [key, entry] of entries) {
      if (this.stats.memoryUsage <= targetSize) break;
      
      this.cache.delete(key);
      this.stats.memoryUsage -= entry.size;
      this.stats.evictions++;
      evicted++;
    }
    
    this.stats.entries = this.cache.size;
    
    if (evicted > 0) {
      this.logger.debug('LRU eviction completed', { evicted, remaining: this.cache.size });
      this.emit('evict', { evicted, remaining: this.cache.size });
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Record access time for performance metrics
   */
  private recordAccessTime(timeMs: number): void {
    if (!this.config.enableMetrics) return;
    
    this.accessTimes.push(timeMs);
    
    // Keep only last 1000 access times
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000);
    }
    
    // Update average
    this.stats.avgAccessTime = this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length;
  }

  /**
   * Categorize cache key for memory breakdown
   */
  private categorizeKey(key: string): string {
    if (key.startsWith('docs:')) return 'documentation';
    if (key.startsWith('analysis:')) return 'analysis';
    if (key.startsWith('embedding:')) return 'embeddings';
    if (key.startsWith('detection:')) return 'detection';
    if (key.startsWith('rule:')) return 'rules';
    return 'other';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
    this.removeAllListeners();
    this.logger.info('Cache Service destroyed');
  }
}

// Global cache instances for different use cases
export const analysisCache = (logger: Logger) => new CacheService(logger, {
  maxEntries: 5000,
  maxMemoryMB: 128,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000
});

export const documentationCache = (logger: Logger) => new CacheService(logger, {
  maxEntries: 10000,
  maxMemoryMB: 256,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 30 * 60 * 1000 // 30 minutes
});

export const embeddingCache = (logger: Logger) => new CacheService(logger, {
  maxEntries: 2000,
  maxMemoryMB: 512,
  defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  cleanupInterval: 60 * 60 * 1000 // 1 hour
});