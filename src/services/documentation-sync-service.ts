/**
 * Documentation Sync Service
 * Automatically syncs Optimizely documentation from optimizely.com
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import cron from 'node-cron';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { chromaDBService, DocumentChunk } from '../integrations/chromadb-client.js';

export interface SyncResult {
  success: boolean;
  documentsProcessed: number;
  documentsAdded: number;
  documentsUpdated: number;
  errors: string[];
  duration: number;
}

export interface DocumentMetadata {
  url: string;
  title: string;
  section?: string;
  product: string;
  contentType: 'documentation' | 'tutorial' | 'api' | 'example';
  lastModified?: string;
  tags?: string[];
}

export class DocumentationSyncService {
  private textSplitter: RecursiveCharacterTextSplitter;
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;

  // Optimizely documentation URLs to monitor
  private static readonly DOC_SOURCES = {
    MAIN_SITEMAP: 'https://www.optimizely.com/sitemap.xml',
    DOCS_BASE: 'https://docs.optimizely.com',
    LEARN_BASE: 'https://world.optimizely.com/learn'
  };

  // Product URL patterns for classification
  private static readonly PRODUCT_PATTERNS = {
    'configured-commerce': [
      '/commerce/',
      '/configured-commerce/',
      '/b2b-commerce/',
      '/ecommerce/'
    ],
    'cms-paas': [
      '/cms/',
      '/content-management/',
      '/episerver/',
      '/optimizely-cms/'
    ],
    'cms-saas': [
      '/content-cloud/',
      '/saas-cms/',
      '/content-as-a-service/'
    ],
    'experimentation': [
      '/web-experimentation/',
      '/feature-experimentation/',
      '/experiments/',
      '/testing/',
      '/personalization/'
    ],
    'dxp': [
      '/digital-experience/',
      '/dxp/',
      '/experience-platform/'
    ],
    'platform': [
      '/data-platform/',
      '/connect-platform/',
      '/graph/',
      '/one-optimizely/'
    ]
  };

  constructor() {
    // Initialize text splitter for chunking documents
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ' ', '']
    });
  }

  /**
   * Start automatic documentation syncing
   */
  startAutoSync(): void {
    // Daily sync at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting scheduled documentation sync...');
      await this.syncDocumentation();
    });

    console.log('Automatic documentation sync scheduled (daily at 2 AM)');
  }

  /**
   * Stop automatic syncing
   */
  stopAutoSync(): void {
    // Stop all scheduled tasks
    const tasks = cron.getTasks();
    tasks.forEach(task => {
      try {
        (task as any).stop?.();
      } catch (error) {
        console.debug('Failed to stop cron task:', error);
      }
    });
  }

  /**
   * Manually trigger documentation sync
   */
  async syncDocumentation(options: { force?: boolean } = {}): Promise<SyncResult> {
    if (this.syncInProgress && !options.force) {
      return {
        success: false,
        documentsProcessed: 0,
        documentsAdded: 0,
        documentsUpdated: 0,
        errors: ['Sync already in progress'],
        duration: 0
      };
    }

    const startTime = Date.now();
    this.syncInProgress = true;
    
    const result: SyncResult = {
      success: false,
      documentsProcessed: 0,
      documentsAdded: 0,
      documentsUpdated: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log('Starting documentation sync from Optimizely sources...');

      // 1. Discover documentation URLs
      const discoveredUrls = await this.discoverDocumentationUrls();
      console.log(`Discovered ${discoveredUrls.length} documentation URLs`);

      // 2. Process each URL
      const documents: DocumentChunk[] = [];
      
      for (const urlInfo of discoveredUrls) {
        try {
          const docChunks = await this.processDocumentationUrl(urlInfo);
          documents.push(...docChunks);
          result.documentsProcessed++;

          // Add small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          const errorMsg = `Failed to process ${urlInfo.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 3. Store documents in ChromaDB
      if (documents.length > 0) {
        const stored = await chromaDBService.addDocuments(documents);
        if (stored) {
          result.documentsAdded = documents.length;
          result.success = true;
        } else {
          result.errors.push('Failed to store documents in vector database');
        }
      }

      this.lastSyncTime = new Date();
      console.log(`Documentation sync completed: ${result.documentsAdded} documents added`);

    } catch (error) {
      const errorMsg = `Documentation sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      console.error(errorMsg);

    } finally {
      this.syncInProgress = false;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Discover documentation URLs from sitemaps and known sources
   */
  private async discoverDocumentationUrls(): Promise<DocumentMetadata[]> {
    const urls: DocumentMetadata[] = [];

    try {
      // Parse main sitemap
      const sitemapResponse = await axios.get(DocumentationSyncService.DOC_SOURCES.MAIN_SITEMAP, {
        timeout: 10000,
        headers: { 'User-Agent': 'Optivise Documentation Sync Bot 1.0' }
      });

      const parser = new XMLParser();
      const sitemapData = parser.parse(sitemapResponse.data);

      // Extract URLs from sitemap
      const sitemapUrls = await this.extractUrlsFromSitemap(sitemapData);
      
      // Filter and classify documentation URLs
      for (const url of sitemapUrls) {
        const metadata = this.classifyDocumentationUrl(url);
        if (metadata) {
          urls.push(metadata);
        }
      }

      // Add known documentation URLs that might not be in sitemap
      urls.push(...this.getKnownDocumentationUrls());

      console.log(`Discovered ${urls.length} documentation URLs across ${new Set(urls.map(u => u.product)).size} products`);

    } catch (error) {
      console.error('Failed to discover documentation URLs:', error);
    }

    return urls;
  }

  /**
   * Extract URLs from sitemap XML
   */
  private async extractUrlsFromSitemap(sitemapData: any): Promise<string[]> {
    const urls: string[] = [];

    try {
      // Handle different sitemap structures
      if (sitemapData.urlset && sitemapData.urlset.url) {
        const urlEntries = Array.isArray(sitemapData.urlset.url) 
          ? sitemapData.urlset.url 
          : [sitemapData.urlset.url];

        for (const entry of urlEntries) {
          if (entry.loc) {
            urls.push(entry.loc);
          }
        }
      }

      if (sitemapData.sitemapindex && sitemapData.sitemapindex.sitemap) {
        const sitemapEntries = Array.isArray(sitemapData.sitemapindex.sitemap)
          ? sitemapData.sitemapindex.sitemap
          : [sitemapData.sitemapindex.sitemap];

        for (const entry of sitemapEntries) {
          if (entry.loc) {
            // Recursively fetch nested sitemaps
            try {
              const nestedResponse = await axios.get(entry.loc, { timeout: 10000 });
              const nestedData = new XMLParser().parse(nestedResponse.data);
              const nestedUrls = await this.extractUrlsFromSitemap(nestedData);
              urls.push(...nestedUrls);
            } catch (error) {
              console.warn(`Failed to fetch nested sitemap ${entry.loc}:`, error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error parsing sitemap:', error);
    }

    return urls;
  }

  /**
   * Classify a URL and determine if it's documentation
   */
  private classifyDocumentationUrl(url: string): DocumentMetadata | null {
    // Check if URL matches documentation patterns
    const isDocUrl = url.includes('/docs/') || 
                    url.includes('/learn/') || 
                    url.includes('/documentation/') ||
                    url.includes('/developer/') ||
                    url.includes('/api/');

    if (!isDocUrl) {
      return null;
    }

    // Classify by product
    let product = 'platform'; // default
    let contentType: DocumentMetadata['contentType'] = 'documentation';

    for (const [productName, patterns] of Object.entries(DocumentationSyncService.PRODUCT_PATTERNS)) {
      if (patterns.some(pattern => url.toLowerCase().includes(pattern))) {
        product = productName;
        break;
      }
    }

    // Determine content type
    if (url.includes('/api/') || url.includes('/reference/')) {
      contentType = 'api';
    } else if (url.includes('/tutorial/') || url.includes('/guide/') || url.includes('/how-to/')) {
      contentType = 'tutorial';
    } else if (url.includes('/example/') || url.includes('/sample/')) {
      contentType = 'example';
    }

    // Extract title from URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || 'index';
    const title = lastPart
      .replace(/[-_]/g, ' ')
      .replace(/\.[^/.]+$/, '') // Remove file extension
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || 'Documentation';

    return {
      url,
      title,
      product,
      contentType
    };
  }

  /**
   * Get known documentation URLs that should always be included
   */
  private getKnownDocumentationUrls(): DocumentMetadata[] {
    return [
      {
        url: 'https://docs.optimizely.com/configured-commerce/',
        title: 'Configured Commerce Documentation',
        product: 'configured-commerce',
        contentType: 'documentation'
      },
      {
        url: 'https://docs.optimizely.com/content-management-system/',
        title: 'CMS Documentation',
        product: 'cms-paas',
        contentType: 'documentation'
      },
      {
        url: 'https://docs.optimizely.com/web-experimentation/',
        title: 'Web Experimentation Documentation',
        product: 'experimentation',
        contentType: 'documentation'
      }
      // Add more known important URLs as needed
    ];
  }

  /**
   * Process a single documentation URL and extract content
   */
  private async processDocumentationUrl(metadata: DocumentMetadata): Promise<DocumentChunk[]> {
    try {
      const response = await axios.get(metadata.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Optivise Documentation Sync Bot 1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const $ = cheerio.load(response.data);

      // Extract main content (try multiple selectors for different site structures)
      const contentSelectors = [
        'main',
        '[role="main"]',
        '.content',
        '.main-content',
        '.documentation-content',
        '.article-content',
        '.entry-content'
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }

      // Fallback to body if no main content found
      if (!content) {
        content = $('body').text().trim();
      }

      // Clean up content
      content = this.cleanContent(content);

      if (!content || content.length < 100) {
        throw new Error('Insufficient content extracted');
      }

      // Extract additional metadata
      const title = $('title').text().trim() || metadata.title;
      const section = $('h1').first().text().trim() || undefined;

      // Split content into chunks
      const chunks = await this.textSplitter.splitText(content);
      
      // Create document chunks
      const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
        id: `${this.generateDocumentId(metadata.url)}_chunk_${index}`,
        content: chunk,
        metadata: {
          ...metadata,
          title,
          section,
          lastUpdated: new Date().toISOString(),
          tags: this.extractTags(content, metadata.product)
        }
      }));

      return documentChunks;

    } catch (error) {
      console.error(`Failed to process URL ${metadata.url}:`, error);
      return [];
    }
  }

  /**
   * Clean and normalize extracted content
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\r\n]+/g, '\n') // Normalize line breaks
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .trim();
  }

  /**
   * Generate a unique document ID from URL
   */
  private generateDocumentId(url: string): string {
    return Buffer.from(url).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Extract relevant tags from content
   */
  private extractTags(content: string, product: string): string[] {
    const tags: string[] = [product];
    
    // Common Optimizely terms to look for
    const termPatterns = [
      /\b(API|REST|GraphQL)\b/gi,
      /\b(extension|plugin|addon)\b/gi,
      /\b(commerce|cart|checkout|payment)\b/gi,
      /\b(content|cms|editor|publishing)\b/gi,
      /\b(experiment|test|variation|goal)\b/gi,
      /\b(personalization|targeting|audience)\b/gi,
      /\b(analytics|tracking|conversion)\b/gi
    ];

    for (const pattern of termPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        tags.push(...matches.map(match => match.toLowerCase()));
      }
    }

    // Remove duplicates and limit
    return [...new Set(tags)].slice(0, 10);
  }

  /**
   * Get sync status and statistics
   */
  getSyncStatus() {
    return {
      inProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime?.toISOString() || null,
      autoSyncEnabled: cron.getTasks().size > 0
    };
  }

  /**
   * Force stop current sync operation
   */
  stopCurrentSync(): void {
    this.syncInProgress = false;
  }
}

// Singleton instance for global use
export const documentationSyncService = new DocumentationSyncService();