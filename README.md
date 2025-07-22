# OptiDevDoc MCP Server

An MCP (Model Context Protocol) tool that provides real-time Optimizely documentation context to AI coding assistants, designed specifically for senior Optimizely developers working with B2B Commerce and related products.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Cursor IDE, VS Code, or other MCP-compatible editor

### Installation

1. **Clone and setup the project:**
   ```bash
   git clone <your-repository-url>
   cd OptiDevDoc
   npm install
   npm run build
   ```

2. **Configure Cursor IDE:**
   
   Add this to your Cursor settings (File > Preferences > Settings > MCP):
   ```json
   {
     "mcpServers": {
       "optidevdoc": {
         "command": "npm",
         "args": ["run", "dev"],
         "cwd": "/path/to/OptiDevDoc",
         "env": {
           "NODE_ENV": "development",
           "LOG_LEVEL": "info"
         }
       }
     }
   }
   ```

   **For Windows users, use the absolute path like:**
   ```json
   "cwd": "C:/D/RND/MCPs/OptiDevDoc"
   ```

3. **Test the connection:**
   ```bash
   npm run dev
   ```

## 🛠️ Available Tools

### `resolve-optimizely-id`
Resolves an Optimizely product or documentation topic name to specific documentation IDs.

**Example usage in Cursor:**
```
@optidevdoc resolve-optimizely-id: "configured commerce pricing"
```

### `get-optimizely-docs`
Retrieves detailed Optimizely documentation content for specific topics.

**Example usage in Cursor:**
```
@optidevdoc get-optimizely-docs: {"query": "custom price calculator", "product": "configured-commerce"}
```

## 📚 Supported Products

- **Configured Commerce**: B2B Commerce platform
- **CMS (PaaS)**: Content Management System (Platform as a Service)  
- **CMS (SaaS)**: Content Management System (Software as a Service)
- **ODP**: Optimizely Data Platform
- **Experimentation**: A/B Testing and Feature Flags
- **Commerce Connect**: Integration connectors
- **Content Recommendations**: Personalization engine

## 💡 Usage Examples

### Example 1: Finding Pricing Documentation
```
User: "How do I implement custom pricing in Optimizely Configured Commerce?"

AI with OptiDevDoc: I'll help you implement custom pricing. Let me get the latest documentation.

@optidevdoc get-optimizely-docs: {"query": "custom pricing calculator", "product": "configured-commerce"}

Based on the current documentation, here's how to implement custom pricing...
[Provides up-to-date code examples and implementation details]
```

### Example 2: CMS API Integration
```
User: "What's the latest Content Delivery API for Optimizely CMS?"

AI with OptiDevDoc: Let me fetch the current API documentation for you.

@optidevdoc get-optimizely-docs: {"query": "content delivery api", "product": "cms-paas"}

Here's the latest Content Delivery API information...
[Provides current API endpoints, authentication, and examples]
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `LOG_LEVEL` | Logging level | info |
| `DATABASE_PATH` | SQLite database path | ./data/optidevdoc.db |
| `CACHE_ENABLED` | Enable caching | true |

### Configuration File

Create a `config.json` file in the project root for custom settings:

```json
{
  "logging": {
    "level": "debug",
    "file": {
      "enabled": true,
      "path": "./logs"
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  }
}
```

## 📊 Features

### ✅ Phase 2 Features (Current) 
- [x] **Real Documentation Crawling**: Intelligent web scraping of Optimizely documentation
- [x] **SQLite Database**: Full-text search with FTS5, content storage, and analytics
- [x] **Advanced Search**: Keyword search with TF-IDF scoring and query optimization
- [x] **Content Parsing**: Automatic extraction of code examples, tags, and breadcrumbs
- [x] **Caching System**: Smart content deduplication and change detection
- [x] **Production Database**: Schema with indexes, analytics, and crawler management
- [x] **Error Resilience**: Circuit breakers, retry logic, and graceful degradation
- [x] **TypeScript with strict type checking**

### 🚧 Phase 3 Features (Planned)
- [ ] Semantic search with vector embeddings (OpenAI/local models)
- [ ] HTTP/SSE transport for remote deployment
- [ ] Render.com deployment configuration
- [ ] Real-time documentation updates and webhooks
- [ ] Advanced analytics and usage insights
- [ ] Team collaboration features

## 🔧 Development

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Type Checking
```bash
npm run type-check
```

## 📁 Project Structure

```
OptiDevDoc/
├── src/
│   ├── server/          # MCP server implementation
│   ├── tools/           # MCP tools (resolve-id, get-docs)
│   ├── config/          # Configuration management
│   ├── utils/           # Utilities (logger, error handler)
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main entry point
├── Resources/           # Project documentation
├── dist/                # Compiled JavaScript
├── logs/                # Log files
└── data/                # Database files
```

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check that Node.js version is 18+

2. **MCP server not connecting in Cursor**
   - Verify the `cwd` path in MCP configuration
   - Check that the server starts without errors: `npm run dev`
   - Review logs in the `logs/` directory

3. **Permission errors on Windows**
   - Run as administrator if needed
   - Check antivirus software isn't blocking the server

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## 🚀 Deployment

### Local Development
The current MVP is designed for local development with Cursor IDE.

### Render.com (Planned)
Future deployment instructions will be added for team sharing on Render.com.

## 📈 Success Metrics

- ✅ Response time <1.5 seconds for 95% of queries
- ✅ Zero-config setup for local development  
- ✅ Error rate <1% for valid queries
- ✅ Memory usage <300MB under normal load

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [Optimizely Developer Documentation](https://docs.developers.optimizely.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cursor IDE](https://cursor.sh)

---

**Status**: ✅ **Phase 2 Complete** - Production-ready with real documentation crawling and database search
**Next Phase**: Semantic search and team deployment features 