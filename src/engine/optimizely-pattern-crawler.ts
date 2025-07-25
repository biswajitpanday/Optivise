import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import type { Logger } from '@/utils/logger.js';

export interface OptimizelyPattern {
  id: string;
  title: string;
  product: 'configured-commerce' | 'cms-paas' | 'cms-saas' | 'cmp' | 'odp' | 'experimentation' | 'commerce-connect' | 'search-navigation';
  category: 'handler' | 'pipeline' | 'service' | 'integration' | 'best-practice' | 'api' | 'content-type' | 'block' | 'template';
  description: string;
  codeExample: string;
  language: string;
  rules: string[];
  guidelines: string[];
  useCases: string[];
  sourceUrl: string;
  lastUpdated: string;
}

export interface OptimizelyRule {
  id: string;
  title: string;
  product: string;
  category: string;
  rule: string;
  explanation: string;
  examples: string[];
  relatedPatterns: string[];
  sourceUrl: string;
}

export class OptimizelyPatternCrawler {
  private logger: Logger;
  private baseUrl = 'https://docs.developers.optimizely.com';

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Crawl Configured Commerce documentation for Handler and Pipeline patterns
   */
  async crawlConfiguredCommercePatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting Configured Commerce pattern extraction...');
    
    const patterns: OptimizelyPattern[] = [];
    
    // Updated URLs based on actual Optimizely documentation structure
    const commerceUrls = [
      `${this.baseUrl}/configured-commerce`,
      `${this.baseUrl}/configured-commerce/dev`,
      // These are placeholder URLs - we'll extract actual URLs from the main documentation page
    ];

    for (const url of commerceUrls) {
      try {
        this.logger.info(`Crawling: ${url}`);
        const pattern = await this.extractPatternFromUrl(url, 'configured-commerce');
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        this.logger.error(`Failed to crawl ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info(`Extracted ${patterns.length} Configured Commerce patterns`);
    return patterns;
  }

  /**
   * Crawl CMS documentation for Content Type and Block patterns
   */
  async crawlCMSPatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting CMS pattern extraction...');
    
    const patterns: OptimizelyPattern[] = [];
    
    // Updated CMS URLs based on documentation structure
    const cmsUrls = [
      `${this.baseUrl}/content-management-system`,
      `${this.baseUrl}/content-management-system/v12.0`,
      `${this.baseUrl}/content-management-system/saas`,
    ];

    for (const url of cmsUrls) {
      try {
        this.logger.info(`Crawling: ${url}`);
        const pattern = await this.extractPatternFromUrl(url, 'cms-paas');
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        this.logger.error(`Failed to crawl ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info(`Extracted ${patterns.length} CMS patterns`);
    return patterns;
  }

  /**
   * Crawl Content Marketing Platform (CMP) documentation
   */
  async crawlCMPPatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting CMP pattern extraction...');
    
    const patterns: OptimizelyPattern[] = [];
    
    const cmpUrls = [
      `${this.baseUrl}/content-marketing-platform`,
      `${this.baseUrl}/content-marketing-platform/api`,
    ];

    for (const url of cmpUrls) {
      try {
        this.logger.info(`Crawling: ${url}`);
        const pattern = await this.extractPatternFromUrl(url, 'cmp');
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        this.logger.error(`Failed to crawl ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info(`Extracted ${patterns.length} CMP patterns`);
    return patterns;
  }

  /**
   * Crawl Optimizely Data Platform (ODP) documentation
   */
  async crawlODPPatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting ODP pattern extraction...');
    
    const patterns: OptimizelyPattern[] = [];
    
    const odpUrls = [
      `${this.baseUrl}/data-platform`,
      `${this.baseUrl}/data-platform/dev`,
    ];

    for (const url of odpUrls) {
      try {
        this.logger.info(`Crawling: ${url}`);
        const pattern = await this.extractPatternFromUrl(url, 'odp');
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        this.logger.error(`Failed to crawl ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info(`Extracted ${patterns.length} ODP patterns`);
    return patterns;
  }

  /**
   * Crawl Experimentation documentation
   */
  async crawlExperimentationPatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting Experimentation pattern extraction...');
    
    const patterns: OptimizelyPattern[] = [];
    
    const expUrls = [
      `${this.baseUrl}/experimentation`,
      `${this.baseUrl}/experimentation/web`,
      `${this.baseUrl}/experimentation/feature`,
    ];

    for (const url of expUrls) {
      try {
        this.logger.info(`Crawling: ${url}`);
        const pattern = await this.extractPatternFromUrl(url, 'experimentation');
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        this.logger.error(`Failed to crawl ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info(`Extracted ${patterns.length} Experimentation patterns`);
    return patterns;
  }

  /**
   * Crawl Commerce Connect documentation
   */
  async crawlCommerceConnectPatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting Commerce Connect pattern extraction...');
    
    const patterns: OptimizelyPattern[] = [];
    
    const ccUrls = [
      `${this.baseUrl}/commerce-connect`,
      `${this.baseUrl}/commerce-connect/v14.0`,
      `${this.baseUrl}/commerce-connect/v13.0`,
    ];

    for (const url of ccUrls) {
      try {
        this.logger.info(`Crawling: ${url}`);
        const pattern = await this.extractPatternFromUrl(url, 'commerce-connect');
        if (pattern) {
          patterns.push(pattern);
        }
      } catch (error) {
        this.logger.error(`Failed to crawl ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    this.logger.info(`Extracted ${patterns.length} Commerce Connect patterns`);
    return patterns;
  }

  /**
   * Extract actual documentation URLs from the main documentation page
   */
  async extractDocumentationUrls(): Promise<string[]> {
    try {
      this.logger.info('Extracting documentation URLs from main page...');
      
      const response = await fetch(this.baseUrl, {
        headers: {
          'User-Agent': 'OptiDevDoc-Crawler/2.0.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      const urls: string[] = [];

      // Extract links from the documentation page
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && (href.includes('developer') || href.includes('guide') || href.includes('api'))) {
          if (href.startsWith('/')) {
            urls.push(`${this.baseUrl}${href}`);
          } else if (href.startsWith('http')) {
            urls.push(href);
          }
        }
      });

      // Remove duplicates
      const uniqueUrls = [...new Set(urls)];
      this.logger.info(`Found ${uniqueUrls.length} documentation URLs`);

      return uniqueUrls;
    } catch (error) {
      this.logger.error('Failed to extract documentation URLs:', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Extract coding pattern from a documentation URL
   */
  private async extractPatternFromUrl(url: string, product: OptimizelyPattern['product']): Promise<OptimizelyPattern | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'OptiDevDoc-Crawler/2.0.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (!response.ok) {
        this.logger.warn(`HTTP ${response.status} for ${url}`);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   $('[data-testid="page-title"]').text().trim() ||
                   'Optimizely Documentation';
      
      // Extract main content
      const content = $('.content, .markdown-body, main, .documentation-content, .docs-content').first().html() || 
                     $('body').html() || '';
      
      // Extract code examples with multiple selectors
      const codeBlocks = $('pre code, .highlight code, .language-csharp, .language-javascript, .language-typescript, code').map((_, el) => $(el).text()).get();
      const primaryCodeExample = codeBlocks.find(code => code.length > 50) || codeBlocks[0] || '';
      
      // Detect language from code or URL
      const language = this.detectLanguage(primaryCodeExample || '', url);
      
      // Extract patterns based on content
      const category = this.categorizePattern(title, content, url);
      
      // Extract rules and guidelines
      const rules = this.extractRules($, content);
      const guidelines = this.extractGuidelines($, content);
      const useCases = this.extractUseCases($, content);

      // Only create pattern if we have meaningful content
      if (!title || title.length < 3) {
        this.logger.warn(`Insufficient content for pattern extraction: ${url}`);
        return null;
      }

      const pattern: OptimizelyPattern = {
        id: this.generatePatternId(title, product),
        title,
        product,
        category,
        description: this.extractDescription($, content),
        codeExample: primaryCodeExample || '',
        language,
        rules,
        guidelines,
        useCases,
        sourceUrl: url,
        lastUpdated: new Date().toISOString()
      };

      this.logger.info(`Extracted pattern: ${pattern.title} (${pattern.category})`);
      return pattern;

    } catch (error) {
      this.logger.error(`Error extracting pattern from ${url}:`, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  /**
   * Categorize pattern based on content analysis with expanded categories
   */
  private categorizePattern(title: string, content: string, url: string): OptimizelyPattern['category'] {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();
    const urlLower = url.toLowerCase();

    // Handler patterns
    if (titleLower.includes('handler') || urlLower.includes('handler') || contentLower.includes('ihandler')) {
      return 'handler';
    }
    
    // Pipeline patterns
    if (titleLower.includes('pipeline') || urlLower.includes('pipeline') || contentLower.includes('pipeline')) {
      return 'pipeline';
    }

    // API patterns
    if (titleLower.includes('api') || urlLower.includes('api') || contentLower.includes('rest api')) {
      return 'api';
    }

    // Content type patterns
    if (titleLower.includes('content type') || contentLower.includes('contenttype') || contentLower.includes('[contenttype')) {
      return 'content-type';
    }

    // Block patterns
    if (titleLower.includes('block') || contentLower.includes('blockdata') || contentLower.includes('[block')) {
      return 'block';
    }

    // Template patterns
    if (titleLower.includes('template') || titleLower.includes('view') || contentLower.includes('@model')) {
      return 'template';
    }
    
    // Service patterns
    if (titleLower.includes('service') || contentLower.includes('service') || contentLower.includes('iservice')) {
      return 'service';
    }
    
    // Integration patterns
    if (titleLower.includes('integration') || urlLower.includes('integration') || contentLower.includes('integrate')) {
      return 'integration';
    }
    
    return 'best-practice';
  }

  /**
   * Detect programming language from code example with expanded language support
   */
  private detectLanguage(code: string, url: string): string {
    if (code.includes('public class') || code.includes('namespace') || code.includes('using System')) {
      return 'csharp';
    }
    if (code.includes('function') || code.includes('const ') || code.includes('let ') || code.includes('var ')) {
      return 'javascript';
    }
    if (code.includes('interface') || code.includes('type ') || code.includes('import ')) {
      return 'typescript';
    }
    if (code.includes('curl ') || code.includes('GET ') || code.includes('POST ')) {
      return 'http';
    }
    if (code.includes('<') && code.includes('>') && code.includes('html')) {
      return 'html';
    }
    if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')) {
      return 'sql';
    }
    
    // Product-specific language detection
    if (url.includes('configured-commerce') || url.includes('commerce-connect')) {
      return 'csharp'; // Commerce is primarily C#
    }
    if (url.includes('cms') || url.includes('content-management')) {
      return 'csharp'; // CMS is primarily C#
    }
    if (url.includes('experimentation') || url.includes('data-platform')) {
      return 'javascript'; // Experimentation and ODP often use JavaScript
    }
    
    return 'javascript'; // Default fallback
  }

  /**
   * Extract description from content with improved selectors
   */
  private extractDescription($: cheerio.CheerioAPI, content: string): string {
    // Try multiple approaches to get description
    const approaches = [
      () => $('h1').next('p').text().trim(),
      () => $('.description, .summary, .intro').first().text().trim(),
      () => $('p').first().text().trim(),
      () => $('[data-testid="description"]').text().trim(),
    ];

    for (const approach of approaches) {
      const description = approach();
      if (description && description.length > 20 && description.length < 500) {
        return description;
      }
    }

    // Fallback: extract from content
    const textContent = $('body').text() || content;
    const sentences = textContent.split(/[.!?]+/);
    const meaningfulSentence = sentences.find(s => s.trim().length > 30 && s.trim().length < 200);
    
    return meaningfulSentence?.trim() || 'Optimizely development pattern and implementation guide.';
  }

  /**
   * Extract rules from content with improved detection
   */
  private extractRules($: cheerio.CheerioAPI, _content: string): string[] {
    const rules: string[] = [];
    
    // Look for structured rules in lists
    $('ul li, ol li').each((_, el) => {
      const text = $(el).text().trim();
      if (this.isRule(text)) {
        rules.push(text);
      }
    });

    // Look for warning/note sections
    $('.warning, .note, .important, .alert').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20 && text.length < 300) {
        rules.push(text);
      }
    });

    // Look for "should", "must", "always", "never" patterns in paragraphs
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (this.isRule(text) && text.length > 20) {
        rules.push(text);
      }
    });

    return rules.slice(0, 10); // Limit to 10 most relevant rules
  }

  /**
   * Extract guidelines from content with improved detection
   */
  private extractGuidelines($: cheerio.CheerioAPI, _content: string): string[] {
    const guidelines: string[] = [];
    
    // Look for sections with guideline-related headings
    const guidelineSelectors = [
      'h2:contains("best"), h3:contains("best"), h4:contains("best")',
      'h2:contains("recommend"), h3:contains("recommend"), h4:contains("recommend")',
      'h2:contains("guideline"), h3:contains("guideline"), h4:contains("guideline")',
      'h2:contains("practice"), h3:contains("practice"), h4:contains("practice")',
    ];

    guidelineSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const nextContent = $(el).nextUntil('h1, h2, h3, h4').text().trim();
        if (nextContent && nextContent.length > 30) {
          guidelines.push(nextContent.substring(0, 200) + (nextContent.length > 200 ? '...' : ''));
        }
      });
    });

    return guidelines.slice(0, 5);
  }

  /**
   * Extract use cases from content with improved detection
   */
  private extractUseCases($: cheerio.CheerioAPI, _content: string): string[] {
    const useCases: string[] = [];
    
    // Look for use case related sections
    const useCaseSelectors = [
      'h2:contains("use case"), h3:contains("use case"), h4:contains("use case")',
      'h2:contains("scenario"), h3:contains("scenario"), h4:contains("scenario")',
      'h2:contains("example"), h3:contains("example"), h4:contains("example")',
      'h2:contains("when"), h3:contains("when"), h4:contains("when")',
    ];

    useCaseSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const nextContent = $(el).nextUntil('h1, h2, h3, h4').text().trim();
        if (nextContent && nextContent.length > 20) {
          useCases.push(nextContent.substring(0, 150) + (nextContent.length > 150 ? '...' : ''));
        }
      });
    });

    return useCases.slice(0, 5);
  }

  /**
   * Check if text represents a rule with improved detection
   */
  private isRule(text: string): boolean {
    const rulePhrases = [
      'must', 'should', 'always', 'never', 'required', 'mandatory',
      'ensure', 'avoid', 'do not', 'make sure', 'important', 'remember',
      'warning', 'note', 'caution', 'critical', 'essential'
    ];
    
    const textLower = text.toLowerCase();
    return rulePhrases.some(phrase => textLower.includes(phrase)) && 
           text.length > 15 && 
           text.length < 500;
  }

  /**
   * Generate unique pattern ID with improved naming
   */
  private generatePatternId(title: string, product: string): string {
    const cleanTitle = title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40);
    
    const timestamp = Date.now().toString(36);
    return `${product}-${cleanTitle}-${timestamp}`;
  }

  /**
   * Crawl all Optimizely documentation for patterns
   */
  async crawlAllPatterns(): Promise<OptimizelyPattern[]> {
    this.logger.info('Starting comprehensive Optimizely pattern crawl...');
    
    const allPatterns: OptimizelyPattern[] = [];
    
    try {
      // Crawl all product areas
      const crawlPromises = [
        this.crawlConfiguredCommercePatterns(),
        this.crawlCMSPatterns(),
        this.crawlCMPPatterns(),
        this.crawlODPPatterns(),
        this.crawlExperimentationPatterns(),
        this.crawlCommerceConnectPatterns(),
      ];

      const results = await Promise.allSettled(crawlPromises);
      
      results.forEach((result, index) => {
        const productNames = ['Configured Commerce', 'CMS', 'CMP', 'ODP', 'Experimentation', 'Commerce Connect'];
        if (result.status === 'fulfilled') {
          allPatterns.push(...result.value);
          this.logger.info(`${productNames[index]}: ${result.value.length} patterns extracted`);
        } else {
          this.logger.error(`${productNames[index]} crawl failed:`, { error: result.reason });
        }
      });
      
      this.logger.info(`Total patterns extracted: ${allPatterns.length}`);
      return allPatterns;
      
    } catch (error) {
      this.logger.error('Error during pattern crawl:', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
} 