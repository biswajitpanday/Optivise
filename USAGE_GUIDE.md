# OptiDevDoc MCP Server - Complete Usage Guide

## 🎯 Quick Start - Get Up and Running in 5 Minutes

### Step 1: Configure Cursor IDE

Copy this configuration to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": [
        "-e",
        "console.log('OptiDevDoc: Using remote server at https://optidevdoc.onrender.com'); const https = require('https'); process.stdin.on('data', (data) => { try { const req = JSON.parse(data.toString()); if (req.method === 'tools/list') { console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { tools: [{ name: 'search-optimizely-docs', description: 'Search Optimizely documentation for code examples and guides', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query for Optimizely documentation' }, product: { type: 'string', description: 'Filter by Optimizely product', enum: ['configured-commerce', 'cms-paas', 'cms-saas', 'experimentation', 'odp'] }, maxResults: { type: 'number', description: 'Maximum number of results (default: 10)' } }, required: ['query'] } }] } })); } else if (req.method === 'tools/call' && req.params.name === 'search-optimizely-docs') { const options = { hostname: 'optidevdoc.onrender.com', port: 443, path: '/api/search', method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'OptiDevDoc-MCP-Client' } }; const apiReq = https.request(options, (res) => { let responseData = ''; res.on('data', (chunk) => responseData += chunk); res.on('end', () => { try { const apiResponse = JSON.parse(responseData); const formattedResults = apiResponse.results?.map(doc => `**${doc.title}**\\n\\nProduct: ${doc.product}\\nURL: ${doc.url}\\n\\n${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? '...' : ''}\\n\\n---\\n`).join('\\n') || 'No results found'; console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { content: [{ type: 'text', text: `Found ${apiResponse.total_count || 0} results for \"${apiResponse.query}\":\\n\\n${formattedResults}` }] } })); } catch (e) { console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'Failed to parse API response' } })); } }); }); apiReq.on('error', (e) => { console.log(JSON.stringify({ jsonrpc: '2.0', id: req.id, error: { code: -32603, message: 'API request failed: ' + e.message } })); }); apiReq.write(JSON.stringify(req.params.arguments)); apiReq.end(); } } catch (e) { console.error('MCP Error:', e); } });"
      ],
      "env": {
        "OPTIDEVDOC_URL": "https://optidevdoc.onrender.com"
      }
    }
  }
}
```

### Step 2: Test the Setup

Open Cursor and try this prompt:
```
How do I implement custom pricing in Optimizely Configured Commerce?
```

The AI should automatically search the OptiDevDoc server and provide relevant documentation.

## 🔍 Example Prompts That Work Great

### E-commerce Development
```
"Show me how to create a custom price calculator in Optimizely Configured Commerce"
"What are the best practices for B2B checkout flows in Optimizely?"
"How do I implement volume discounts in Optimizely Commerce?"
```

### CMS Development
```
"How do I use the Content Delivery API in Optimizely CMS?"
"Show me authentication examples for Optimizely CMS API"
"What's the latest way to retrieve content in Optimizely CMS?"
```

### General Optimizely
```
"What are the main differences between Optimizely CMS PaaS and SaaS?"
"How do I integrate Optimizely with external systems?"
"Show me the latest Optimizely API documentation"
```

## 🛠️ Advanced Usage

### Direct API Testing

Test the server directly without MCP:

```bash
# Basic health check
curl https://optidevdoc.onrender.com/health

# Search for pricing information
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pricing", "product": "configured-commerce"}'

# Get API documentation
curl https://optidevdoc.onrender.com/api/docs
```

### VS Code Integration

For VS Code users, install the REST Client extension and create a `.http` file:

```http
### Health Check
GET https://optidevdoc.onrender.com/health

### Search Documentation
POST https://optidevdoc.onrender.com/api/search
Content-Type: application/json

{
  "query": "custom price calculator",
  "product": "configured-commerce",
  "maxResults": 5
}
```

## 📋 Available Search Parameters

### Query Parameter (Required)
- **Type**: String
- **Description**: Your search terms
- **Examples**: "pricing", "api authentication", "checkout flow"

### Product Filter (Optional)
- **Type**: String
- **Options**: 
  - `configured-commerce` - B2B Commerce platform
  - `cms-paas` - CMS Platform as a Service
  - `cms-saas` - CMS Software as a Service
  - `experimentation` - A/B Testing and Feature Flags
  - `odp` - Optimizely Data Platform

### Max Results (Optional)
- **Type**: Number
- **Default**: 10
- **Range**: 1-50

## 🎨 Response Format

The API returns JSON with this structure:

```json
{
  "success": true,
  "query": "your search terms",
  "product": "filter applied",
  "results": [
    {
      "id": "unique-identifier",
      "title": "Documentation Title",
      "content": "Full documentation content...",
      "url": "https://docs.developers.optimizely.com/...",
      "product": "configured-commerce",
      "category": "developer-guide",
      "version": "12.x",
      "lastUpdated": "2024-01-15T10:30:00Z",
      "relevanceScore": 1.0,
      "tags": ["pricing", "commerce", "calculation"],
      "breadcrumb": ["Home", "Commerce", "Pricing"]
    }
  ],
  "total_count": 2,
  "timestamp": "2024-01-15T10:30:00Z",
  "server_info": {
    "type": "standalone_server",
    "search_method": "text_search",
    "documentation_source": "mock_data"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. "Server takes too long to respond"
**Cause**: Free tier cold start (30-60 seconds)  
**Solution**: The first request after inactivity is slow. Subsequent requests are fast.

#### 2. "No results found"
**Cause**: Limited mock data  
**Solutions**: 
- Try these working queries: "pricing", "api", "calculator", "commerce"
- Use broader search terms
- Don't use very specific technical terms

#### 3. "MCP not working in Cursor"
**Solutions**:
- Verify JSON configuration is valid (no syntax errors)
- Restart Cursor IDE after configuration changes
- Check Cursor's MCP panel for error messages

#### 4. "Connection failed"
**Solutions**:
- Check server status: `curl https://optidevdoc.onrender.com/health`
- Verify internet connection
- Try again after a few minutes (server may be starting up)

### Debug Commands

```bash
# Test server availability
curl -I https://optidevdoc.onrender.com

# Test health endpoint
curl https://optidevdoc.onrender.com/health

# Test search with minimal query
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'

# View server information
curl https://optidevdoc.onrender.com/
```

## 📊 Performance Expectations

### Response Times
- **First Request**: 30-60 seconds (cold start)
- **Subsequent Requests**: <500ms
- **Health Checks**: <200ms

### Availability
- **Uptime**: 99%+ (Render.com free tier)
- **Maintenance**: Occasional brief outages for deployments

### Current Limitations
- **Documentation**: Mock data with 2 sample entries
- **Search**: Text-based only (no semantic search yet)
- **Concurrency**: Limited on free tier

## 🔄 Keeping the Service Warm

To avoid cold starts, you can keep the service warm:

```bash
# Run this every 10 minutes to prevent sleeping
curl https://optidevdoc.onrender.com/health
```

Or create a simple cron job:
```bash
# Add to crontab: check every 10 minutes
*/10 * * * * curl -s https://optidevdoc.onrender.com/health > /dev/null
```

## 📈 Usage Analytics

The server logs basic usage information:
- Search queries and frequency
- Response times and error rates
- Popular documentation topics

This helps improve the service and identify which documentation is most needed.

## 🚀 Getting the Most Out of OptiDevDoc

### Best Practices
1. **Use specific product names**: Include "Optimizely", "Commerce", "CMS" in your prompts
2. **Ask for code examples**: "Show me code for..." gets better results
3. **Specify the version**: Mention version numbers when relevant
4. **Be contextual**: Provide context about what you're building

### Sample Workflow
1. **Start broad**: "How does Optimizely Commerce pricing work?"
2. **Get specific**: "Show me a custom price calculator implementation"
3. **Ask for details**: "What parameters does the price calculation API accept?"
4. **Request examples**: "Give me a complete code example with error handling"

## 🔗 Related Resources

- **Live Server**: [https://optidevdoc.onrender.com/](https://optidevdoc.onrender.com/)
- **GitHub Repository**: [https://github.com/biswajitpanday/OptiDevDoc](https://github.com/biswajitpanday/OptiDevDoc)
- **Optimizely Developer Docs**: [https://docs.developers.optimizely.com](https://docs.developers.optimizely.com)
- **Model Context Protocol**: [https://modelcontextprotocol.io](https://modelcontextprotocol.io)

---

**🎉 You're all set!** Start asking Optimizely questions in your IDE and get instant documentation assistance. 