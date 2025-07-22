import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import PQueue from 'p-queue';
import pRetry from 'p-retry';
import type { Logger } from '@/utils/logger.js';
import type { 
  DocumentationSource, 
  OptimizelyDocumentationResult, 
  OptimizelyProduct,
  DocumentationCategory,
  CodeExample,
  CrawlerConfig 
} from '@/types/index.js';
import { DatabaseManager } from '@/database/database-manager.js';

export class DocumentationCrawler {
  private logger: Logger;
  private config: CrawlerConfig;
  private queue: PQueue;
  private database: DatabaseManager;
  private crawlStats = {
    totalPages: 0,
    successfulPages: 0,
    failedPages: 0,
    newDocuments: 0,
    updatedDocuments: 0,
  };

  constructor(config: CrawlerConfig, database: DatabaseManager, logger: Logger) {
    this.config = config;
    this.database = database;
    this.logger = logger;
    
    // Create queue with concurrency limit
    this.queue = new PQueue({ 
      concurrency: config.maxConcurrency,
      interval: config.retryDelay,
      intervalCap: 1,
    });
  }

  async crawlAllSources(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.info('Crawler is disabled, skipping crawl');
      return;
    }

    this.logger.info('Starting documentation crawl', {
      sources: this.config.sources.length,
      concurrency: this.config.maxConcurrency,
    });

    const startTime = Date.now();
    this.resetStats();

    try {
      // Process each documentation source
      for (const source of this.config.sources) {
        if (!source.enabled) {
          this.logger.info(`Skipping disabled source: ${source.name}`);
          continue;
        }

        await this.crawlSource(source);
      }

      // Wait for all queued tasks to complete
      await this.queue.onIdle();

      const duration = Date.now() - startTime;
      this.logger.info('Documentation crawl completed', {
        ...this.crawlStats,
        durationMs: duration,
        avgTimePerPage: this.crawlStats.totalPages > 0 ? duration / this.crawlStats.totalPages : 0,
      });

    } catch (error) {
      this.logger.error('Documentation crawl failed', { error, stats: this.crawlStats });
      throw error;
    }
  }

  private async crawlSource(source: DocumentationSource): Promise<void> {
    this.logger.info(`Crawling source: ${source.name}`, { url: source.url });

    try {
      // Discover all documentation pages from the source
      const pages = await this.discoverPages(source);
      this.logger.info(`Discovered ${pages.length} pages for ${source.name}`);

      // Queue each page for crawling
      for (const pageUrl of pages) {
        this.queue.add(() => this.crawlPage(source, pageUrl));
      }

    } catch (error) {
      this.logger.error(`Failed to crawl source: ${source.name}`, { error });
    }
  }

  private async discoverPages(source: DocumentationSource): Promise<string[]> {
    try {
      const response = await this.fetchWithRetry(source.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const pages = new Set<string>();

      // Add the main page
      pages.add(source.url);

      // Find all documentation links based on patterns
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        const fullUrl = this.resolveUrl(href, source.url);
        
        // Check if this looks like a documentation page
        if (this.isDocumentationUrl(fullUrl, source)) {
          pages.add(fullUrl);
        }
      });

      // Look for navigation menus and sitemaps
      const navLinks = this.extractNavigationLinks($, source);
      navLinks.forEach(url => pages.add(url));

      return Array.from(pages).slice(0, 100); // Limit initial crawl
    } catch (error) {
      this.logger.error(`Failed to discover pages for ${source.name}`, { error });
      return [source.url]; // Fallback to just the main page
    }
  }

  private async crawlPage(source: DocumentationSource, url: string): Promise<void> {
    this.crawlStats.totalPages++;

    try {
      this.logger.debug(`Crawling page: ${url}`);

      const response = await this.fetchWithRetry(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const document = await this.parsePage(source, url, html);

      if (document) {
        await this.database.upsertDocument(document);
        
        const existingDoc = await this.database.getDocumentById(document.id);
        if (existingDoc) {
          this.crawlStats.updatedDocuments++;
        } else {
          this.crawlStats.newDocuments++;
        }

        this.logger.debug(`Successfully processed: ${document.title}`);
      }

      this.crawlStats.successfulPages++;

    } catch (error) {
               this.crawlStats.failedPages++;
         this.logger.warn(`Failed to crawl page: ${url}`, { 
           error: error instanceof Error ? error.message : String(error) 
         });
    }
  }

  private async parsePage(
    source: DocumentationSource, 
    url: string, 
    html: string
  ): Promise<OptimizelyDocumentationResult | null> {
    try {
      const $ = cheerio.load(html);

      // Extract title
      let title = '';
      if (source.selectors.title) {
        title = $(source.selectors.title).first().text().trim();
      }
      if (!title) {
        title = $('title').text().trim() || $('h1').first().text().trim();
      }

      // Extract main content
      let content = '';
      if (source.selectors.content) {
        const contentEl = $(source.selectors.content).first();
        content = this.extractTextContent(contentEl, $);
      }

      if (!title || !content || content.length < 100) {
        this.logger.debug(`Skipping page with insufficient content: ${url}`);
        return null;
      }

      // Extract breadcrumb navigation
      const breadcrumb = this.extractBreadcrumb($, source);

      // Extract code examples
      const codeExamples = this.extractCodeExamples($);

      // Determine category from URL and content
      const category = this.determineCategory(url, content, breadcrumb);

      // Extract tags from content
      const tags = this.extractTags(content, title);

      // Generate document ID
      const id = this.generateDocumentId(url, source.product);

      // Get last updated date
      const lastUpdated = this.extractLastUpdated($, source) || new Date().toISOString();

      return {
        id,
        title,
        content,
        url,
        product: source.product,
        category,
        version: this.extractVersion(content, url) || '12.x',
        lastUpdated,
        relevanceScore: 1.0,
        codeExamples,
        tags,
        breadcrumb,
      };

    } catch (error) {
      this.logger.error(`Failed to parse page: ${url}`, { error });
      return null;
    }
  }

  private extractTextContent(element: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
    // Remove script and style elements
    element.find('script, style, nav, header, footer, .sidebar').remove();
    
    // Convert to markdown-like format
    let content = '';
    
    // Process headings
    element.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const level = parseInt(el.tagName.substring(1));
      const text = $(el).text().trim();
      content += '\n' + '#'.repeat(level) + ' ' + text + '\n\n';
    });

    // Process paragraphs
    element.find('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        content += text + '\n\n';
      }
    });

    // Process lists
    element.find('ul, ol').each((_, el) => {
      $(el).find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text) {
          content += '- ' + text + '\n';
        }
      });
      content += '\n';
    });

    // Process code blocks (preserve them)
    element.find('pre, code').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 10) {
        content += '\n```\n' + text + '\n```\n\n';
      }
    });

    return content.trim();
  }

  private extractCodeExamples($: cheerio.CheerioAPI): CodeExample[] {
    const examples: CodeExample[] = [];

    $('pre code, .highlight, .code-block').each((_, element) => {
      const codeText = $(element).text().trim();
      if (codeText.length < 20) return; // Skip very short code snippets

      // Try to detect language
      let language = 'text';
      const classes = $(element).attr('class') || '';
      
      // Common language detection patterns
      if (classes.includes('csharp') || classes.includes('cs')) language = 'csharp';
      else if (classes.includes('javascript') || classes.includes('js')) language = 'javascript';
      else if (classes.includes('typescript') || classes.includes('ts')) language = 'typescript';
      else if (classes.includes('json')) language = 'json';
      else if (classes.includes('xml') || classes.includes('html')) language = 'xml';
      else if (classes.includes('sql')) language = 'sql';
      else if (classes.includes('bash') || classes.includes('shell')) language = 'bash';
      else if (codeText.includes('public class') || codeText.includes('namespace')) language = 'csharp';
      else if (codeText.includes('function') || codeText.includes('const ')) language = 'javascript';

      // Get description from previous element
      let description = '';
      const prevElement = $(element).parent().prev();
      if (prevElement.length) {
        description = prevElement.text().trim().substring(0, 200);
      }

      examples.push({
        language,
        code: codeText,
        description: description || `${language} code example`,
      });
    });

    return examples.slice(0, 10); // Limit number of examples per page
  }

  private extractBreadcrumb($: cheerio.CheerioAPI, source: DocumentationSource): string[] {
    const breadcrumb: string[] = [];

    if (source.selectors.breadcrumb) {
      $(source.selectors.breadcrumb).find('a, span').each((_, el) => {
        const text = $(el).text().trim();
        if (text && !breadcrumb.includes(text)) {
          breadcrumb.push(text);
        }
      });
    }

    // Fallback: extract from URL path
    if (breadcrumb.length === 0) {
      const urlPath = new URL(source.url).pathname;
      const segments = urlPath.split('/').filter(segment => segment.length > 0);
      breadcrumb.push('Home');
      segments.forEach(segment => {
        const formatted = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        breadcrumb.push(formatted);
      });
    }

    return breadcrumb;
  }

  private determineCategory(url: string, content: string, breadcrumb: string[]): DocumentationCategory {
    const urlLower = url.toLowerCase();
    const contentLower = content.toLowerCase();
    const breadcrumbText = breadcrumb.join(' ').toLowerCase();

    if (urlLower.includes('/api/') || contentLower.includes('api reference') || breadcrumbText.includes('api')) {
      return 'api-reference' as DocumentationCategory;
    }
    if (urlLower.includes('/tutorial') || contentLower.includes('tutorial') || breadcrumbText.includes('tutorial')) {
      return 'tutorials' as DocumentationCategory;
    }
    if (urlLower.includes('/guide') || contentLower.includes('developer guide') || breadcrumbText.includes('guide')) {
      return 'developer-guide' as DocumentationCategory;
    }
    if (urlLower.includes('/troubleshoot') || contentLower.includes('troubleshoot') || contentLower.includes('error')) {
      return 'troubleshooting' as DocumentationCategory;
    }
    if (urlLower.includes('/integration') || contentLower.includes('integration')) {
      return 'integration-guide' as DocumentationCategory;
    }
    if (urlLower.includes('/release') || contentLower.includes('release notes') || contentLower.includes('changelog')) {
      return 'release-notes' as DocumentationCategory;
    }

    return 'developer-guide' as DocumentationCategory; // Default
  }

  private extractTags(content: string, title: string): string[] {
    const tags = new Set<string>();
    const text = (content + ' ' + title).toLowerCase();

    // Technical tags
    const techKeywords = [
      'api', 'rest', 'graphql', 'webhook', 'authentication', 'authorization',
      'csharp', 'javascript', 'typescript', 'react', 'angular', 'vue',
      'database', 'sql', 'mongodb', 'redis', 'cache',
      'pricing', 'commerce', 'cart', 'checkout', 'payment',
      'cms', 'content', 'page', 'block', 'media',
      'search', 'index', 'analytics', 'tracking',
      'integration', 'connector', 'sync', 'import', 'export'
    ];

    techKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.add(keyword);
      }
    });

    return Array.from(tags).slice(0, 10);
  }

  private extractVersion(content: string, url: string): string | null {
    // Look for version numbers in content or URL
    const versionMatches = content.match(/version\s+(\d+\.\d+)/i) || 
                          url.match(/v(\d+\.\d+)/) ||
                          content.match(/(\d+\.\d+\.\d+)/);
    
    return versionMatches ? versionMatches[1] || versionMatches[0] : null;
  }

  private extractLastUpdated($: cheerio.CheerioAPI, source: DocumentationSource): string | null {
    if (source.selectors.lastUpdated) {
      const dateText = $(source.selectors.lastUpdated).text().trim();
      if (dateText) {
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
    return null;
  }

  private generateDocumentId(url: string, product: OptimizelyProduct): string {
    const urlPath = new URL(url).pathname;
    const segments = urlPath.split('/').filter(s => s.length > 0);
    const lastSegment = segments[segments.length - 1] || 'index';
    
    return `${product}-${lastSegment.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;
  }

  private isDocumentationUrl(url: string, source: DocumentationSource): boolean {
    try {
      const parsedUrl = new URL(url);
      const sourceParsed = new URL(source.url);
      
      // Must be same domain
      if (parsedUrl.hostname !== sourceParsed.hostname) {
        return false;
      }

      // Must start with similar path
      if (!parsedUrl.pathname.startsWith(sourceParsed.pathname.split('/').slice(0, -1).join('/'))) {
        return false;
      }

      // Exclude certain file types and patterns
      const excludePatterns = [
        /\.(pdf|zip|tar|gz|exe|dmg)$/,
        /\/api\/v\d+\//,
        /\/(login|logout|register|admin)/,
        /\#/,
      ];

      return !excludePatterns.some(pattern => pattern.test(url.toLowerCase()));
    } catch {
      return false;
    }
  }

  private extractNavigationLinks($: cheerio.CheerioAPI, source: DocumentationSource): string[] {
    const links = new Set<string>();

    // Look for navigation menus
    $('nav a, .nav a, .navigation a, .menu a, .sidebar a').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        const fullUrl = this.resolveUrl(href, source.url);
        if (this.isDocumentationUrl(fullUrl, source)) {
          links.add(fullUrl);
        }
      }
    });

    return Array.from(links);
  }

  private resolveUrl(href: string, baseUrl: string): string {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  private async fetchWithRetry(url: string): Promise<any> {
    return pRetry(
      async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      },
      {
        retries: this.config.retryAttempts,
        minTimeout: this.config.retryDelay,
        maxTimeout: this.config.retryDelay * 4,
        onFailedAttempt: (error) => {
          this.logger.warn(`Retry attempt ${error.attemptNumber} failed for ${url}`, {
            error: error.message,
          });
        },
      }
    );
  }

  private resetStats(): void {
    this.crawlStats = {
      totalPages: 0,
      successfulPages: 0,
      failedPages: 0,
      newDocuments: 0,
      updatedDocuments: 0,
    };
  }

  getCrawlStats() {
    return { ...this.crawlStats };
  }
} 