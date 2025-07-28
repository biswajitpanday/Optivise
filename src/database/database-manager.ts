import Database from 'better-sqlite3';

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
  private db: sqlite3.Database | null = null;
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

    // Create database connection
    this.db = new sqlite3.Database(this.config.path, (err) => {
      if (err) {
        this.logger.error('Failed to connect to SQLite database', { error: err });
        throw err;
      }
      this.logger.info('Connected to SQLite database', { path: this.config.path });
    });

    // Enable foreign keys
    await this.run('PRAGMA foreign_keys = ON');
    
    // Optimize SQLite for our use case
    await this.run('PRAGMA journal_mode = WAL');
    await this.run('PRAGMA synchronous = NORMAL');
    await this.run('PRAGMA cache_size = 1000');
    await this.run('PRAGMA temp_store = MEMORY');
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
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();
    let sql = '';
    let params: any[] = [];

    try {
      // Use FTS5 for full-text search
      if (query.text && query.text.trim()) {
        sql = `
          SELECT 
            d.*,
            documents_fts.rank as search_rank
          FROM documents_fts
          JOIN documents d ON documents_fts.rowid = d.rowid
          WHERE documents_fts MATCH ?
        `;
        params.push(this.prepareFTSQuery(query.text));

        // Add product filter
        if (query.product) {
          sql += ' AND d.product = ?';
          params.push(query.product);
        }

        // Add category filter
        if (query.category) {
          sql += ' AND d.category = ?';
          params.push(query.category);
        }

        sql += ' ORDER BY search_rank, d.last_updated DESC';
      } else {
        // No search text, just filter by product/category
        sql = 'SELECT *, 1.0 as search_rank FROM documents WHERE 1=1';
        
        if (query.product) {
          sql += ' AND product = ?';
          params.push(query.product);
        }

        if (query.category) {
          sql += ' AND category = ?';
          params.push(query.category);
        }

        sql += ' ORDER BY last_updated DESC';
      }

      // Add limit
      const limit = query.options?.maxResults || 10;
      sql += ' LIMIT ?';
      params.push(limit);

      this.logger.debug('Executing search query', { sql, params: params.slice(0, -1) });

      const rows = await this.all(sql, params);
      const searchTime = Date.now() - startTime;

      const results: SearchResult[] = rows.map((row: any) => ({
        document: this.mapRowToDocument(row),
        score: row.search_rank || 1.0,
        highlights: [], // TODO: Implement highlighting
        matchedTerms: query.text ? this.extractSearchTerms(query.text) : [],
      }));

      this.logger.info('Search completed', { 
        query: query.text, 
        resultCount: results.length, 
        searchTime 
      });

      // Log search analytics
      await this.logSearchAnalytics(query, results.length, searchTime);

      return results;
    } catch (error) {
      this.logger.error('Search query failed', { error, sql, params });
      throw error;
    }
  }

  async getDocumentById(id: string): Promise<OptimizelyDocumentationResult | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const row = await this.get('SELECT * FROM documents WHERE id = ?', [id]);
      return row ? this.mapRowToDocument(row) : null;
    } catch (error) {
      this.logger.error('Failed to get document by ID', { error, id });
      throw error;
    }
  }

  async upsertDocument(doc: OptimizelyDocumentationResult): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const contentHash = this.generateContentHash(doc.content);
      const metadata = JSON.stringify({
        tags: doc.tags,
        breadcrumb: doc.breadcrumb,
        codeExamples: doc.codeExamples,
      });

      const sql = `
        INSERT OR REPLACE INTO documents (
          id, title, content, url, product, category, version,
          last_updated, content_hash, metadata, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      await this.run(sql, [
        doc.id,
        doc.title,
        doc.content,
        doc.url,
        doc.product,
        doc.category,
        doc.version,
        doc.lastUpdated,
        contentHash,
        metadata,
      ]);

      // Insert code examples
      if (doc.codeExamples && doc.codeExamples.length > 0) {
        await this.insertCodeExamples(doc.id, doc.codeExamples);
      }

      this.logger.debug('Document upserted', { id: doc.id, title: doc.title });
    } catch (error) {
      this.logger.error('Failed to upsert document', { error, docId: doc.id });
      throw error;
    }
  }

  private async insertCodeExamples(documentId: string, examples: any[]): Promise<void> {
    // First, delete existing code examples for this document
    await this.run('DELETE FROM code_examples WHERE document_id = ?', [documentId]);

    // Insert new code examples
    for (const example of examples) {
      await this.run(`
        INSERT INTO code_examples (
          document_id, language, code, description, filename
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        documentId,
        example.language,
        example.code,
        example.description || null,
        example.filename || null,
      ]);
    }
  }

  private mapRowToDocument(row: any): OptimizelyDocumentationResult {
    const metadata = row.metadata ? JSON.parse(row.metadata) : {};
    
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      url: row.url,
      product: row.product,
      category: row.category,
      version: row.version,
      lastUpdated: row.last_updated,
      relevanceScore: row.search_rank || 1.0,
      codeExamples: metadata.codeExamples || [],
      tags: metadata.tags || [],
      breadcrumb: metadata.breadcrumb || [],
    };
  }

  private prepareFTSQuery(text: string): string {
    // Clean and prepare text for FTS5
    const cleaned = text
      .replace(/[^\w\s-]/g, ' ') // Remove special chars except hyphens
      .replace(/\s+/g, ' ')
      .trim();

    // Split into terms and add * for prefix matching
    const terms = cleaned
      .split(' ')
      .filter(term => term.length >= 2)
      .map(term => `"${term}"*`)
      .join(' OR ');

    return terms || '""';
  }

  private extractSearchTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length >= 2);
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async logSearchAnalytics(
    query: SearchQuery, 
    resultCount: number, 
    responseTime: number
  ): Promise<void> {
    try {
      await this.run(`
        INSERT INTO search_analytics (
          query, product, results_count, response_time_ms
        ) VALUES (?, ?, ?, ?)
      `, [
        query.text || '',
        query.product || null,
        resultCount,
        responseTime,
      ]);
    } catch (error) {
      // Don't fail the search if analytics logging fails
      this.logger.warn('Failed to log search analytics', { error });
    }
  }

  // Promisified database methods
  private run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  private get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getSearchAnalytics(limit: number = 100): Promise<any[]> {
    const sql = `
      SELECT query, COUNT(*) as count, AVG(response_time_ms) as avg_response_time
      FROM search_analytics 
      WHERE timestamp > datetime('now', '-7 days')
      GROUP BY query
      ORDER BY count DESC
      LIMIT ?
    `;
    return this.all(sql, [limit]);
  }

  async close(): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db!.close((err) => {
          if (err) {
            this.logger.error('Error closing database', { error: err });
            reject(err);
          } else {
            this.logger.info('Database connection closed');
            this.db = null;
            this.isInitialized = false;
            resolve();
          }
        });
      });
    }
  }

  get isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }
} 