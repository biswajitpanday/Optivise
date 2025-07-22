export const DATABASE_SCHEMA = `
-- Documents table for storing scraped documentation
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    product TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    last_updated TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    metadata TEXT, -- JSON stringified metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Index for better search performance
CREATE INDEX IF NOT EXISTS idx_documents_product ON documents(product);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_url ON documents(url);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(last_updated);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    title, 
    content, 
    product, 
    category,
    content='documents',
    content_rowid='rowid'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, title, content, product, category)
    VALUES (new.rowid, new.title, new.content, new.product, new.category);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, content, product, category)
    VALUES ('delete', old.rowid, old.title, old.content, old.product, old.category);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, title, content, product, category)
    VALUES ('delete', old.rowid, old.title, old.content, old.product, old.category);
    INSERT INTO documents_fts(rowid, title, content, product, category)
    VALUES (new.rowid, new.title, new.content, new.product, new.category);
END;

-- Keywords table for term frequency analysis
CREATE TABLE IF NOT EXISTS keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL,
    document_id TEXT NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    field TEXT NOT NULL, -- 'title', 'content', 'tags'
    position INTEGER, -- position in text for phrase matching
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_keywords_term ON keywords(term);
CREATE INDEX IF NOT EXISTS idx_keywords_document ON keywords(document_id);
CREATE INDEX IF NOT EXISTS idx_keywords_field ON keywords(field);
CREATE INDEX IF NOT EXISTS idx_keywords_freq ON keywords(frequency);

-- Code examples table
CREATE TABLE IF NOT EXISTS code_examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    filename TEXT,
    line_start INTEGER,
    line_end INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_code_language ON code_examples(language);
CREATE INDEX IF NOT EXISTS idx_code_document ON code_examples(document_id);

-- Crawl status table for tracking crawling progress
CREATE TABLE IF NOT EXISTS crawl_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'crawling', 'completed', 'failed'
    last_crawled TEXT,
    last_modified TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    next_crawl TEXT, -- scheduled next crawl time
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crawl_source ON crawl_status(source_id);
CREATE INDEX IF NOT EXISTS idx_crawl_status ON crawl_status(status);
CREATE INDEX IF NOT EXISTS idx_crawl_next ON crawl_status(next_crawl);

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    product TEXT,
    results_count INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    clicked_result_id TEXT,
    session_id TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON search_analytics(timestamp);

-- Configuration table for storing crawler settings
CREATE TABLE IF NOT EXISTS crawler_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert default crawler configuration
INSERT OR IGNORE INTO crawler_config (key, value, description) VALUES
    ('last_full_crawl', '1970-01-01T00:00:00Z', 'Timestamp of last full documentation crawl'),
    ('crawl_interval_hours', '24', 'Hours between full crawls'),
    ('max_concurrent_requests', '5', 'Maximum concurrent HTTP requests'),
    ('request_delay_ms', '1000', 'Delay between requests to be respectful'),
    ('user_agent', 'OptiDevDoc-MCP/1.0.0 (+https://github.com/your-org/optidevdoc-mcp)', 'User agent for HTTP requests'),
    ('respect_robots_txt', 'true', 'Whether to respect robots.txt files');
`;

export const SAMPLE_DATA_QUERIES = `
-- Insert sample Configured Commerce documentation
INSERT OR IGNORE INTO documents (
    id, title, content, url, product, category, version, last_updated, content_hash, metadata
) VALUES (
    'configured-commerce-pricing-overview',
    'Pricing Engine Overview - Optimizely Configured Commerce',
    '# Pricing Engine Overview

The Optimizely Configured Commerce pricing engine provides flexible pricing calculations for B2B commerce scenarios.

## Key Features

- **Dynamic Pricing**: Real-time price calculations based on customer context
- **Rule-Based Pricing**: Configure complex pricing rules through the admin interface
- **Volume Discounts**: Support for quantity-based pricing tiers
- **Customer-Specific Pricing**: Personalized pricing for different customer segments

## Implementation

### Basic Price Calculation

The pricing engine calculates prices using the following hierarchy:

1. Customer-specific pricing
2. Volume discount rules
3. Promotional pricing
4. Base product pricing

### Code Example

\`\`\`csharp
public class CustomPriceCalculator : IPriceCalculator
{
    public PriceCalculationResult CalculatePrice(PriceCalculationRequest request)
    {
        var basePrice = GetBasePrice(request.Product);
        var customerPrice = ApplyCustomerPricing(basePrice, request.Customer);
        var volumePrice = ApplyVolumeDiscounts(customerPrice, request.Quantity);
        var finalPrice = ApplyPromotions(volumePrice, request.Promotions);
        
        return new PriceCalculationResult
        {
            UnitPrice = finalPrice,
            ExtendedPrice = finalPrice * request.Quantity,
            Discounts = GetAppliedDiscounts()
        };
    }
}
\`\`\`

## Configuration

Configure pricing rules in the admin interface under **Commerce > Pricing > Rules**.',
    'https://docs.developers.optimizely.com/configured-commerce/pricing/overview',
    'configured-commerce',
    'developer-guide',
    '12.x',
    '2024-01-15T10:30:00Z',
    'abc123hash456',
    '{"tags": ["pricing", "commerce", "calculation", "discounts"], "breadcrumb": ["Home", "Configured Commerce", "Developer Guide", "Pricing"]}'
);

-- Insert sample CMS documentation
INSERT OR IGNORE INTO documents (
    id, title, content, url, product, category, version, last_updated, content_hash, metadata
) VALUES (
    'cms-content-delivery-api',
    'Content Delivery API - Optimizely CMS',
    '# Content Delivery API

Access your content programmatically using the Optimizely Content Delivery API.

## Overview

The Content Delivery API provides RESTful endpoints to retrieve content from your Optimizely CMS instance.

### Authentication

All API requests require authentication using an API key:

\`\`\`http
GET /api/episerver/v3.0/content/123
Authorization: Bearer your-api-key-here
\`\`\`

### Retrieving Content

#### Get Page by ID

\`\`\`javascript
fetch(''/api/episerver/v3.0/content/123'', {
    headers: {
        ''Authorization'': ''Bearer '' + apiKey,
        ''Accept'': ''application/json''
    }
})
.then(response => response.json())
.then(content => {
    console.log(''Page title:'', content.name);
    console.log(''Page content:'', content.mainBody);
});
\`\`\`

#### Search Content

\`\`\`javascript
const searchResults = await fetch(''/api/episerver/v3.0/search'', {
    method: ''POST'',
    headers: {
        ''Content-Type'': ''application/json'',
        ''Authorization'': ''Bearer '' + apiKey
    },
    body: JSON.stringify({
        query: ''product information'',
        contentTypes: [''StandardPage'', ''ProductPage'']
    })
});
\`\`\`',
    'https://docs.developers.optimizely.com/content-management-system/content-delivery-api',
    'cms-paas',
    'api-reference',
    '12.x',
    '2024-01-10T14:20:00Z',
    'def456hash789',
    '{"tags": ["api", "content", "rest", "javascript"], "breadcrumb": ["Home", "CMS", "API Reference", "Content Delivery"]}'
);
`;

export default DATABASE_SCHEMA; 