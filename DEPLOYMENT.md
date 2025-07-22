# OptiDevDoc Deployment Guide

## 🚀 Phase 3: Team Deployment & Collaboration

This guide covers deploying OptiDevDoc for team use with remote access, real-time documentation updates, and production monitoring.

## 📋 Prerequisites

- GitHub account with repository access
- Render.com account (free tier available)
- Optional: OpenAI API key for semantic search
- Team members with IDE MCP support (Cursor, VS Code, etc.)

## 🌐 Render.com Deployment

### 1. Repository Setup

1. **Fork or clone** the OptiDevDoc repository to your GitHub account
2. **Update `render.yaml`** with your repository URL:
   ```yaml
   repo: https://github.com/YOUR-ORG/optidevdoc-mcp.git
   ```

### 2. Deploy to Render

1. **Connect GitHub**: Link your GitHub account to Render.com
2. **Create New Service**: Choose "Web Service" from your repository
3. **Auto-Deploy**: Render will automatically detect the `render.yaml` configuration

### 3. Environment Configuration

In the Render dashboard, add these environment variables:

#### Required Variables
```bash
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
LOG_LEVEL=info
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/optidevdoc.db
```

#### Optional Enhancement Variables
```bash
# OpenAI Semantic Search (Recommended)
OPENAI_API_KEY=sk-your-openai-key-here

# Crawler Configuration
CRAWLER_ENABLED=true
CRAWLER_INTERVAL_HOURS=24
CRAWLER_MAX_CONCURRENCY=3

# Security & Performance
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
CORS_ENABLED=true
CORS_ORIGINS=*
```

### 4. Health Monitoring

Render automatically monitors your service health at `/health`. The deployment includes:

- **Health Checks**: Automatic service restart on failures
- **Metrics Endpoint**: `/metrics` for monitoring tools
- **Persistent Storage**: 1GB disk for SQLite database
- **Auto-scaling**: Handles traffic spikes automatically

## 🔧 Team IDE Configuration

### Cursor IDE Setup

Each team member adds this to their Cursor MCP configuration:

```json
{
  "mcpServers": {
    "optidevdoc-remote": {
      "command": "npx",
      "args": ["@modelcontextprotocol/client-sse", "https://your-app.onrender.com/mcp/sse"],
      "env": {
        "MCP_SERVER_URL": "https://your-app.onrender.com"
      }
    }
  }
}
```

### VS Code with MCP Extension

Install the MCP extension and add:

```json
{
  "mcp.servers": [
    {
      "name": "optidevdoc-remote",
      "url": "https://your-app.onrender.com/mcp/sse",
      "type": "sse"
    }
  ]
}
```

### Alternative: Direct API Access

For IDEs without MCP support, use the REST API:

```bash
# Search documentation
curl -X POST https://your-app.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "custom price calculator", "product": "configured-commerce"}'

# Resolve product context
curl -X POST https://your-app.onrender.com/api/resolve \
  -H "Content-Type: application/json" \
  -d '{"query": "B2B commerce pricing"}'
```

## 📊 Production Features

### Real-Time Documentation Updates

- **Automated Crawling**: Daily documentation refresh
- **Change Detection**: Smart content diffing and updates
- **Background Processing**: Non-blocking crawls during team usage
- **Analytics Tracking**: Search patterns and popular queries

### Performance Optimization

- **SQLite FTS5**: Sub-second search across all documentation
- **Intelligent Caching**: Reduces API calls and improves response times  
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Compression**: Optimized data transfer for remote connections

### Security & Reliability

- **CORS Protection**: Configurable access control
- **Rate Limiting**: 100 requests/minute per IP
- **Health Monitoring**: Automatic restart on failures
- **Error Handling**: Circuit breakers and graceful degradation
- **Persistent Storage**: SQLite database survives deployments

## 🔍 Advanced Configuration

### PostgreSQL Upgrade (Optional)

For larger teams, upgrade to PostgreSQL:

1. **Uncomment PostgreSQL** service in `render.yaml`
2. **Update environment**:
   ```bash
   DATABASE_TYPE=postgresql
   DATABASE_HOST=your-postgres-host
   DATABASE_NAME=optidevdoc
   DATABASE_USERNAME=optidevdoc
   DATABASE_PASSWORD=your-secure-password
   ```

### Redis Caching (Optional)

For enhanced performance:

1. **Enable Redis** service in `render.yaml`
2. **Configure caching**:
   ```bash
   CACHE_TYPE=redis
   REDIS_URL=redis://your-redis-instance
   ```

### Semantic Search Enhancement

Add OpenAI API key for intelligent search:

```bash
OPENAI_API_KEY=sk-your-key-here
SEMANTIC_SEARCH_ENABLED=true
SEMANTIC_SEARCH_MODEL=text-embedding-3-small
```

## 📈 Monitoring & Analytics

### Built-in Endpoints

- **Health Check**: `GET /health` - Service status
- **Metrics**: `GET /metrics` - Performance data  
- **API Docs**: `GET /api/docs` - Endpoint documentation

### Render Dashboard

Monitor through Render dashboard:
- **Deployment Logs**: Real-time server logs
- **Performance Metrics**: CPU, memory, response times
- **Error Tracking**: Automatic error notifications
- **Database Usage**: Storage and query performance

### Custom Analytics

OptiDevDoc tracks:
- **Search Queries**: Popular documentation topics
- **Response Times**: Performance optimization insights
- **Error Rates**: Service reliability metrics
- **Team Usage**: Individual and team patterns

## 🚨 Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check environment variables are set correctly
   - Verify `render.yaml` repository URL
   - Review deployment logs in Render dashboard

2. **Database Errors**
   - Ensure persistent disk is configured (1GB minimum)
   - Check SQLite file permissions in `/data/` directory

3. **Search Not Working**
   - Verify crawler is enabled and running
   - Check database has been populated (wait 10-15 minutes after first deploy)
   - Review crawler logs for documentation access issues

4. **Team Access Issues**
   - Verify CORS is enabled and origins configured
   - Check rate limiting hasn't been exceeded
   - Ensure MCP client configuration URLs are correct

### Debug Commands

```bash
# Check service health
curl https://your-app.onrender.com/health

# View API documentation  
curl https://your-app.onrender.com/api/docs

# Test search functionality
curl -X POST https://your-app.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test search"}'
```

## 🎯 Team Onboarding

### Quick Start for New Team Members

1. **Get Service URL** from team lead
2. **Configure IDE** with provided MCP settings
3. **Test Connection** with simple search query
4. **Join Team Channel** for support and updates

### Best Practices

- **Share Queries**: Use popular searches to improve team knowledge
- **Report Issues**: Help improve documentation coverage
- **Update Regularly**: Ensure latest IDE MCP configuration
- **Monitor Usage**: Respect rate limits for team access

## 🚀 Success Metrics

Your deployment is successful when:

- ✅ **Health endpoint** returns `200 OK`
- ✅ **Search requests** return relevant Optimizely documentation
- ✅ **Team members** can access through their IDEs
- ✅ **Documentation updates** automatically via daily crawls
- ✅ **Performance** maintains sub-second response times

## 🔄 Updates & Maintenance

### Automatic Updates

- **Auto-Deploy**: Pushes to main branch trigger deployments
- **Zero Downtime**: Rolling updates with health checks
- **Database Migration**: Automatic schema updates
- **Dependency Updates**: Security patches applied automatically

### Manual Maintenance

- **Environment Variables**: Update through Render dashboard
- **Database Backup**: Export SQLite via service shell access
- **Log Analysis**: Monitor search patterns and performance
- **Team Coordination**: Coordinate any breaking changes

---

**🎉 Congratulations!** Your team now has production-ready access to real-time Optimizely documentation through AI coding assistants, enabling faster development and fewer deprecated API issues.

**Next Steps**: Consider semantic search with OpenAI integration and PostgreSQL upgrade for larger teams. 