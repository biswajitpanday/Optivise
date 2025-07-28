import { OptimizelyProduct } from '../types/index.js';
import type { ServerConfig } from '../types/index.js';

export const defaultConfig: ServerConfig = {
  port: 3000,
  host: '0.0.0.0',
  cors: {
    origin: ['http://localhost:3000', 'https://cursor.sh', 'vscode-webview://*'],
    credentials: false,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
  },
  database: {
    type: 'sqlite',
    path: './data/optidevdoc.db',
    maxConnections: 10,
  },
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000,
    type: 'memory',
  },
  logging: {
    level: 'info',
    file: {
      enabled: true,
      path: './logs',
      maxSize: '10m',
      maxFiles: '5',
    },
    console: {
      enabled: true,
      colorize: true,
    },
  },
  crawler: {
    enabled: true,
    interval: 24, // hours
    maxConcurrency: 5,
    retryAttempts: 3,
    retryDelay: 2000, // ms
    userAgent: 'OptiDevDoc-MCP/1.0.0 (+https://github.com/your-org/optidevdoc-mcp)',
    respectRobotsTxt: true,
    sources: [
      {
        id: 'optimizely-configured-commerce',
        name: 'Optimizely Configured Commerce Documentation',
        url: 'https://docs.developers.optimizely.com/configured-commerce',
        product: OptimizelyProduct.CONFIGURED_COMMERCE,
        selectors: {
          container: '.markdown-body, .content, main',
          title: 'h1, h2.title, .title',
          content: '.markdown-body, .content-body, .page-content',
          navigation: '.toc, .navigation, nav',
          breadcrumb: '.breadcrumb, .breadcrumbs',
          lastUpdated: '.last-updated, .updated-date, time',
        },
        enabled: true,
        priority: 1,
      },
      {
        id: 'optimizely-cms-paas',
        name: 'Optimizely CMS (PaaS) Documentation',
        url: 'https://docs.developers.optimizely.com/content-management-system',
        product: OptimizelyProduct.CMS_PAAS,
        selectors: {
          container: '.markdown-body, .content, main',
          title: 'h1, h2.title, .title',
          content: '.markdown-body, .content-body, .page-content',
          navigation: '.toc, .navigation, nav',
          breadcrumb: '.breadcrumb, .breadcrumbs',
          lastUpdated: '.last-updated, .updated-date, time',
        },
        enabled: true,
        priority: 2,
      },
      {
        id: 'optimizely-cms-saas',
        name: 'Optimizely CMS (SaaS) Documentation',
        url: 'https://docs.developers.optimizely.com/content-cloud',
        product: OptimizelyProduct.CMS_SAAS,
        selectors: {
          container: '.markdown-body, .content, main',
          title: 'h1, h2.title, .title',
          content: '.markdown-body, .content-body, .page-content',
          navigation: '.toc, .navigation, nav',
          breadcrumb: '.breadcrumb, .breadcrumbs',
          lastUpdated: '.last-updated, .updated-date, time',
        },
        enabled: true,
        priority: 2,
      },
      {
        id: 'optimizely-odp',
        name: 'Optimizely Data Platform Documentation',
        url: 'https://docs.developers.optimizely.com/optimizely-data-platform',
        product: OptimizelyProduct.ODP,
        selectors: {
          container: '.markdown-body, .content, main',
          title: 'h1, h2.title, .title',
          content: '.markdown-body, .content-body, .page-content',
          navigation: '.toc, .navigation, nav',
          breadcrumb: '.breadcrumb, .breadcrumbs',
          lastUpdated: '.last-updated, .updated-date, time',
        },
        enabled: true,
        priority: 3,
      },
      {
        id: 'optimizely-experimentation',
        name: 'Optimizely Experimentation Documentation',
        url: 'https://docs.developers.optimizely.com/experimentation',
        product: OptimizelyProduct.EXPERIMENTATION,
        selectors: {
          container: '.markdown-body, .content, main',
          title: 'h1, h2.title, .title',
          content: '.markdown-body, .content-body, .page-content',
          navigation: '.toc, .navigation, nav',
          breadcrumb: '.breadcrumb, .breadcrumbs',
          lastUpdated: '.last-updated, .updated-date, time',
        },
        enabled: true,
        priority: 3,
      },
    ],
  },
  search: {
    semantic: {
      enabled: false, // Start with keyword search only for MVP
      model: 'text-embedding-ada-002',
      dimension: 1536,
      threshold: 0.7,
    },
    keyword: {
      enabled: true,
      minTermLength: 2,
      stopWords: [
        'the',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
        'is',
        'are',
        'was',
        'were',
        'be',
        'been',
        'have',
        'has',
        'had',
        'do',
        'does',
        'did',
        'will',
        'would',
        'could',
        'should',
        'may',
        'might',
        'can',
        'a',
        'an',
        'this',
        'that',
        'these',
        'those',
      ],
    },
    hybrid: {
      semanticWeight: 0.4,
      keywordWeight: 0.6,
    },
  },
};

export default defaultConfig; 