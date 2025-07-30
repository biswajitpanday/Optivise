import BetterSQLite3 from 'better-sqlite3';

import * as fs from 'fs';
import * as path from 'path';
import { DATABASE_SCHEMA, SAMPLE_DATA_QUERIES } from './schema.js';
import type { Logger } from '../utils/logger.js';
import type { 
  SearchQuery, 
  SearchResult, 
  OptimizelyDocumentationResult,
  DatabaseConfig 
} from '../types/index.js';

export class DatabaseManager {
  private db: BetterSQLite3.Database | null = null;
  private logger: Logger;
  private config: DatabaseConfig;
  private isInitialized = false;

  constructor(config: DatabaseConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Database already initialized');
      return;
    }

    try {
      this.logger.info('Initializing database...', { 
        type: this.config.type, 
        path: this.config.path 
      });

      if (this.config.type === 'sqlite') {
        await this.initializeSQLite();
      } else {
        throw new Error(`Database type ${this.config.type} not yet implemented`);
      }

      await this.createTables();
      await this.insertSampleData();

      this.isInitialized = true;
      this.logger.info('Database initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize database', { error });
      throw error;
    }
  }

  private async initializeSQLite(): Promise<void> {
    if (!this.config.path) {
      throw new Error('SQLite database path is required');
    }

    // Ensure the directory exists
    const dbDir = path.dirname(this.config.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      this.logger.info('Created database directory', { path: dbDir });
    }

    try {
      // Create database connection
      this.db = new BetterSQLite3(this.config.path);
      this.logger.info('Connected to SQLite database', { path: this.config.path });

      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');
      
      // Optimize SQLite for our use case
      await this.run('PRAGMA journal_mode = WAL');
      await this.run('PRAGMA synchronous = NORMAL');
      await this.run('PRAGMA cache_size = 1000');
      await this.run('PRAGMA temp_store = MEMORY');
    } catch (error) {
      this.logger.error('Failed to connect to SQLite database', { error });
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    this.logger.info('Creating database tables...');
    
    // Split schema into individual statements
    const statements = DATABASE_SCHEMA
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await this.run(statement);
    }

    this.logger.info('Database tables created successfully');
  }

  private async insertSampleData(): Promise<void> {
    this.logger.info('Inserting sample data...');
    
    // Check if data already exists
    const count = await this.get('SELECT COUNT(*) as count FROM documentation');
    if (count && count.count > 0) {
      this.logger.info('Sample data already exists, skipping insertion');
      return;
    }
    
    // Split sample data queries into individual statements
    const statements = SAMPLE_DATA_QUERIES
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      await this.run(statement);
    }

    this.logger.info('Sample data inserted successfully');
  }

  async searchDocuments(query: SearchQuery): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    let sql = '';
    const params: any[] = [];

    // Build search query based on search type
    if (query.text && query.text.trim()) {
      // Full-text search
      sql = `
        SELECT 
          d.id, d.title, d.content, d.url, d.product, d.category, d.version, d.last_updated,
          fts.rank as score
        FROM documentation_fts fts
        JOIN documentation d ON fts.rowid = d.rowid
        WHERE documentation_fts MATCH ?
      `;
      
      params.push(this.prepareFTSQuery(query.text));
      
      // Add product filter if specified
      if (query.product) {
        sql += ' AND d.product = ?';
        params.push(query.product);
      }
      
      // Add category filter if specified
      if (query.category) {
        sql += ' AND d.category = ?';
        params.push(query.category);
      }
      
      sql += ' ORDER BY score DESC';
    } else {
      // Regular search (no full-text)
      sql = `
        SELECT 
          d.id, d.title, d.content, d.url, d.product, d.category, d.version, d.last_updated,
          1 as score
        FROM documentation d
        WHERE 1=1
      `;
      
      // Add product filter if specified
      if (query.category) {
        sql += ' AND d.category = ?';
        params.push(query.category);
      }
      
      sql += ' ORDER BY d.title ASC';
    }
    
    // Add limit
    const limit = query.options?.maxResults || 10;
    sql += ` LIMIT ${limit}`;
    
    try {
      const rows = await this.all(sql, params);
      
      // Map database rows to SearchResult objects
      const results: SearchResult[] = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        relevance: row.score
      }));
      
      const responseTime = Date.now() - startTime;
      
      // Log search analytics
      await this.logSearchAnalytics(query, results.length, responseTime);
      
      return results;
    } catch (error) {
      this.logger.error('Error searching documents', { 
        error, 
        query: query.text || '',
        product: query.product 
      });
      throw error;
    }
  }

  async getDocumentById(id: string): Promise<OptimizelyDocumentationResult | null> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const row = await this.get(
        'SELECT * FROM documentation WHERE id = ?',
        [id]
      );
      
      if (!row) return null;
      
      return this.mapRowToDocument(row);
    } catch (error) {
      this.logger.error('Error getting document by ID', { error, id });
      throw error;
    }
  }

  async upsertDocument(doc: OptimizelyDocumentationResult): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Generate content hash for change detection
      const contentHash = this.generateContentHash(doc.content);
      
      // Check if document exists
      const existing = await this.get(
        'SELECT id, content_hash FROM documentation WHERE id = ?',
        [doc.id]
      );
      
      if (existing && existing.content_hash === contentHash) {
        // Document exists and content hasn't changed
        this.logger.debug('Document content unchanged, skipping update', { id: doc.id });
        return;
      }
      
      // Begin transaction
      await this.run('BEGIN TRANSACTION');
      
      try {
        if (existing) {
          // Update existing document
          await this.run(
            `UPDATE documentation SET 
              title = ?, content = ?, url = ?, product = ?, 
              category = ?, version = ?, last_updated = ?, 
              content_hash = ?
            WHERE id = ?`,
            [
              doc.title, doc.content, doc.url, doc.product,
              doc.category, doc.version, doc.lastUpdated,
              contentHash, doc.id
            ]
          );
          
          // Delete existing code examples
          await this.run(
            'DELETE FROM code_examples WHERE document_id = ?',
            [doc.id]
          );
          
          // Delete existing tags
          await this.run(
            'DELETE FROM document_tags WHERE document_id = ?',
            [doc.id]
          );
        } else {
          // Insert new document
          await this.run(
            `INSERT INTO documentation (
              id, title, content, url, product, category, 
              version, last_updated, content_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              doc.id, doc.title, doc.content, doc.url, doc.product,
              doc.category, doc.version, doc.lastUpdated, contentHash
            ]
          );
        }
        
        // Insert code examples
        if (doc.codeExamples && doc.codeExamples.length > 0) {
          await this.insertCodeExamples(doc.id, doc.codeExamples);
        }
        
        // Insert tags
        if (doc.tags && doc.tags.length > 0) {
          for (const tag of doc.tags) {
            await this.run(
              'INSERT INTO document_tags (document_id, tag) VALUES (?, ?)',
              [doc.id, tag]
            );
          }
        }
        
        // Commit transaction
        await this.run('COMMIT');
        
        this.logger.info(existing ? 'Document updated' : 'Document inserted', { id: doc.id });
      } catch (error) {
        // Rollback transaction on error
        await this.run('ROLLBACK');
        throw error;
      }
    } catch (error) {
      this.logger.error('Error upserting document', { error, id: doc.id });
      throw error;
    }
  }

  private async insertCodeExamples(documentId: string, examples: any[]): Promise<void> {
    for (const example of examples) {
      await this.run(
        `INSERT INTO code_examples (
          document_id, language, code, description, type
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          documentId,
          example.language,
          example.code,
          example.description,
          example.type || 'neutral'
        ]
      );
    }
  }

  private mapRowToDocument(row: any): OptimizelyDocumentationResult {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      url: row.url,
      product: row.product,
      category: row.category as any,
      version: row.version,
      lastUpdated: row.last_updated,
      relevanceScore: 0,
      codeExamples: [],
      tags: [],
      breadcrumb: []
    };
  }

  private prepareFTSQuery(text: string): string {
    // Clean and prepare the search query for SQLite FTS5
    return text
      .trim()
      .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric chars with space
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .split(' ')
      .filter(term => term.length > 1)
      .map(term => `${term}*`)  // Add wildcard to each term
      .join(' ');
  }

  private extractSearchTerms(text: string): string[] {
    return text
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(term => term.length > 1);
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  private async logSearchAnalytics(
    query: SearchQuery, 
    resultCount: number, 
    responseTime: number
  ): Promise<void> {
    try {
      await this.run(
        `INSERT INTO search_analytics (
          query, product, result_count, response_time_ms, timestamp
        ) VALUES (?, ?, ?, ?, datetime('now'))`,
        [
          query.text || '',
          query.product || 'all',
          resultCount,
          responseTime
        ]
      );
    } catch (error) {
      this.logger.error('Error logging search analytics', { error });
      // Don't throw, this is non-critical
    }
  }

  private run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          throw new Error('Database not initialized');
        }
        const stmt = this.db.prepare(sql);
        const result = stmt.run(...params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  private get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          throw new Error('Database not initialized');
        }
        const stmt = this.db.prepare(sql);
        const result = stmt.get(...params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          throw new Error('Database not initialized');
        }
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getSearchAnalytics(limit: number = 100): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      return await this.all(
        `SELECT * FROM search_analytics 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [limit]
      );
    } catch (error) {
      this.logger.error('Error getting search analytics', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.db) {
      this.logger.warn('Database not initialized, nothing to close');
      return;
    }

    try {
      this.logger.info('Closing database connection');
      this.db.close();
      this.logger.info('Database connection closed');
      this.db = null;
      this.isInitialized = false;
    } catch (error) {
      this.logger.error('Error closing database', { error });
      throw error;
    }
  }

  get isReady(): boolean {
    return this.isInitialized;
  }
}