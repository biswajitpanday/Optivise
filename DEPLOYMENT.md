# OptiDevDoc Deployment Guide

## 🎉 Successfully Deployed!

**OptiDevDoc is now live at: [https://optidevdoc.onrender.com/](https://optidevdoc.onrender.com/)**

## 🚀 How to Use the Deployed Server

### Quick Test

Verify the server is working:
```bash
curl https://optidevdoc.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-XX...",
  "version": "1.0.0",
  "uptime": "...",
  "server": "OptiDevDoc Standalone Server",
  "documentation_count": 2
}
```

### Test Search Functionality

```bash
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pricing", "maxResults": 2}'
```

## 🔧 IDE Configuration

### Cursor IDE Setup

Add this to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": [
        "-e", 
        "const https = require('https'); process.stdin.on('data', (data) => { const req = JSON.parse(data.toString()); if (req.method === 'tools/list') { console.log(JSON.stringify({jsonrpc: '2.0', id: req.id, result: {tools: [{name: 'search-optimizely-docs', description: 'Search Optimizely documentation', inputSchema: {type: 'object', properties: {query: {type: 'string'}, product: {type: 'string'}}}}]}})); } else if (req.method === 'tools/call') { const options = {hostname: 'optidevdoc.onrender.com', port: 443, path: '/api/search', method: 'POST', headers: {'Content-Type': 'application/json'}}; const apiReq = https.request(options, (res) => { let data = ''; res.on('data', (chunk) => data += chunk); res.on('end', () => { console.log(JSON.stringify({jsonrpc: '2.0', id: req.id, result: {content: [{type: 'text', text: data}]}})); }); }); apiReq.write(JSON.stringify(req.params.arguments)); apiReq.end(); } });"
      ],
      "env": {
        "OPTIDEVDOC_URL": "https://optidevdoc.onrender.com"
      }
    }
  }
}
```

### VS Code Setup

For VS Code, you can use the REST Client extension:

```http
### Search Optimizely Documentation
POST https://optidevdoc.onrender.com/api/search
Content-Type: application/json

{
  "query": "custom price calculator",
  "product": "configured-commerce",
  "maxResults": 5
}
```

## 📊 Server Status & Monitoring

### Live Endpoints

- **Health Check**: [https://optidevdoc.onrender.com/health](https://optidevdoc.onrender.com/health)
- **API Documentation**: [https://optidevdoc.onrender.com/api/docs](https://optidevdoc.onrender.com/api/docs)
- **Main Endpoint**: [https://optidevdoc.onrender.com/](https://optidevdoc.onrender.com/)

### Performance Expectations

- **First Request**: May take 30-60 seconds (free tier cold start)
- **Subsequent Requests**: <500ms response time
- **Availability**: 99%+ uptime

## 🎯 Usage Examples

### Example 1: Basic Search
```bash
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pricing engine"}'
```

### Example 2: Product-Specific Search
```bash
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "price calculator", "product": "configured-commerce"}'
```

### Example 3: Limited Results
```bash
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "api", "maxResults": 3}'
```

## 🚨 Troubleshooting

### Common Issues

1. **Server Takes Long to Respond**
   - First request after inactivity takes 30-60 seconds (free tier limitation)
   - Keep the service warm with periodic health checks

2. **Empty Results**
   - Current deployment uses mock data with limited content
   - Try these sample queries: "pricing", "api", "calculator", "commerce"

3. **MCP Configuration Not Working**
   - Verify JSON syntax is correct
   - Restart your IDE after configuration changes
   - Check IDE console for error messages

### Debug Steps

1. **Test Direct API**:
   ```bash
   curl https://optidevdoc.onrender.com/health
   ```

2. **Test Search**:
   ```bash
   curl -X POST https://optidevdoc.onrender.com/api/search \
     -H "Content-Type: application/json" \
     -d '{"query": "test"}'
   ```

3. **Check Server Logs**: View logs in Render.com dashboard

## 📈 Current Deployment Details

### Technology Stack
- **Platform**: Render.com (Free Tier)
- **Runtime**: Node.js 24.4.1
- **Framework**: Express.js with CORS
- **Data**: Mock documentation (2 sample entries)

### Server Configuration
- **Port**: 10000 (internal), 443 (HTTPS)
- **Host**: 0.0.0.0
- **Health Check**: `/health` endpoint
- **API Base**: `/api/`

### Repository Information
- **GitHub**: [https://github.com/biswajitpanday/OptiDevDoc](https://github.com/biswajitpanday/OptiDevDoc)
- **Branch**: master
- **Auto-Deploy**: Enabled on push to master

## 🔄 Making Changes

### To Update the Server
1. Push changes to the master branch
2. Render.com will automatically rebuild and redeploy
3. Check deployment status in Render dashboard
4. Verify with health check: `curl https://optidevdoc.onrender.com/health`

### To Upgrade Features
- Add real documentation crawling
- Implement semantic search with OpenAI
- Upgrade to paid tier for better performance
- Add authentication for team usage

## ✅ Success Checklist

Your deployment is successful when:

- ✅ Health endpoint returns `200 OK`
- ✅ Search endpoint returns JSON with mock results
- ✅ Server responds within reasonable time (<30s first request, <500ms subsequent)
- ✅ CORS headers allow browser access
- ✅ MCP configuration works in your IDE

## 🎉 Next Steps

1. **Configure your IDE** with the provided MCP settings
2. **Test search functionality** with sample queries
3. **Share with your team** using the live URL
4. **Consider upgrades** for production usage (real data, better performance)

---

**🚀 Deployment Complete!** Your OptiDevDoc server is live and ready to enhance your Optimizely development workflow. 