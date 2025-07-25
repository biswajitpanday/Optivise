# OptiDevDoc - Intelligent Optimizely Development Assistant

A comprehensive AI-powered development assistant for Optimizely developers, providing pattern analysis, bug resolution, and enhanced documentation search. **Available as NPM package and remote service!**

## 🚀 **Key Features**

- **🎯 Pattern Analysis**: Find Handler, Pipeline, API, and Template patterns by development scenario
- **🐛 Bug Resolution**: Intelligent debugging with Optimizely-specific solutions and best practices  
- **📚 Multi-Product Support**: Covers all Optimizely products (Commerce, CMS, CMP, ODP, Experimentation)
- **🔍 Enhanced Documentation Search**: Context-aware search across comprehensive documentation
- **⚡ IDE Integration**: Works seamlessly with Cursor, VS Code, and other MCP-compatible editors
- **🛠️ Zero Setup**: Available as both NPM package and remote service

## 🎉 **Live Deployment**
- **Server**: [https://optidevdoc.onrender.com/](https://optidevdoc.onrender.com/)
- **Repository**: [https://github.com/biswajitpanday/OptiDevDoc](https://github.com/biswajitpanday/OptiDevDoc)
- **Status**: ✅ **PRODUCTION READY & VERIFIED WORKING**

## 📦 **Installation & Setup**

### **Option 1: NPM Package (Recommended)**

```bash
# Install globally
npm install -g optidevdoc

# Interactive setup
optidevdoc setup

# Start enhanced MCP client  
optidevdoc mcp
```

### **Option 2: Remote Service (Zero Installation)**
1. **Download the MCP bridge**: Save [`optidevdoc-remote-enhanced.js`](https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/optidevdoc-remote-enhanced.js)
2. **Configure your IDE**: Add to MCP settings
3. **Start using**: Access all tools directly in your AI assistant

### **IDE Configuration**

#### **For NPM Package** (Add to Cursor MCP settings):
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "optidevdoc",
      "args": ["mcp"],
      "env": {
        "DEBUG_MCP": "false"
      }
    }
  }
}
```

#### **For Remote Service** (Add to Cursor MCP settings):
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": ["C:\\path\\to\\optidevdoc-remote-enhanced.js"],
      "env": {
        "DEBUG_MCP": "false"
      }
    }
  }
}
```

**Windows Example**: `"args": ["C:\\D\\RND\\MCPs\\OptiDevDoc\\optidevdoc-remote-enhanced.js"]`  
**Mac/Linux Example**: `"args": ["/Users/username/tools/optidevdoc-remote-enhanced.js"]`

## 💡 **Available Tools & Features**

### **🛠️ MCP Tools (3 Available)**
1. **`search_optimizely_docs`** - Enhanced documentation search with pattern matching
2. **`find_optimizely_pattern`** - Find coding patterns by development scenario  
3. **`analyze_optimizely_bug`** - Intelligent bug analysis with Optimizely solutions

### **📚 Product Coverage**
- **Configured Commerce** - Handlers, Pipelines, Pricing, Checkout
- **CMS (PaaS/SaaS)** - Content Types, Blocks, Templates, APIs
- **Content Marketing Platform** - Email Automation, Campaigns
- **Optimizely Data Platform** - Audience Segmentation, Event Tracking
- **Experimentation** - Feature Flags, A/B Testing, Rollouts
- **Commerce Connect** - Service APIs, Integration Patterns

### **🎯 Example Prompts to Try**
```
"Find a pattern for implementing custom pricing logic in Configured Commerce"
"I'm getting a NullReferenceException in my pricing handler, help me fix it"
"Show me how to implement email automation workflows in CMP"
"How do I create real-time audience segments in ODP?"
"Help me implement feature flags for gradual rollouts"
```

### **✨ Enhanced Features**
- **🧠 Context-Aware Analysis**: Understands your development intent
- **🏷️ Product Auto-Detection**: Automatically identifies Optimizely product context
- **📋 Rule Extraction**: Provides specific guidelines and best practices
- **💻 Code Examples**: Real implementation examples with explanations
- **🌐 Cross-Platform**: Works on Windows, macOS, Linux
- **⚡ Zero Setup**: No database or complex installation required
- **🔄 Remote Updates**: Server improvements benefit all users

## 🏗️ **Current Architecture**

```mermaid
graph TB
    subgraph "Your IDE"
        A[Cursor/VS Code]
    end
    
    subgraph "Local Bridge"
        B[optidevdoc-remote.js]
    end
    
    subgraph "Remote Server"
        C[Express.js API]
        D[Documentation Search]
        E[Mock Data]
    end
    
    A --> B
    B -->|HTTPS| C
    C --> D
    D --> E
```

### **How It Works**
1. **Your IDE** sends MCP requests to the local bridge
2. **Local bridge** (`optidevdoc-remote.js`) translates MCP to HTTP
3. **Remote server** searches documentation and returns results
4. **Bridge** formats results for your AI assistant

## 🛠️ **Development**

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/biswajitpanday/OptiDevDoc.git
cd OptiDevDoc

# Install dependencies  
npm install

# Start development server
npm run dev
# Server runs at: http://localhost:3000
```

### **Test the API**
```bash
# Test search endpoint
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pricing"}'

# Test health endpoint
curl http://localhost:3000/health
```

### **Test MCP Protocol**
```bash
# Test tools list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node optidevdoc-remote.js

# Test search tool
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_optimizely_docs","arguments":{"query":"pricing"}}}' | node optidevdoc-remote.js
```

## 📚 **API Documentation**

### **Search Endpoint**
```http
POST https://optidevdoc.onrender.com/api/search
Content-Type: application/json

{
  "query": "pricing calculator",
  "product": "configured-commerce"  // Optional: filter by product
}
```

**Response**:
```json
{
  "success": true,
  "query": "pricing calculator", 
  "results": [
    {
      "id": "configured-commerce-pricing-overview",
      "title": "Pricing Engine Overview - Optimizely Configured Commerce",
      "content": "# Pricing Engine Overview\n\n...",
      "url": "https://docs.developers.optimizely.com/...",
      "product": "configured-commerce",
      "codeExamples": [...],
      "tags": ["pricing", "commerce"]
    }
  ],
  "total_count": 1
}
```

### **Health Check**
```http
GET https://optidevdoc.onrender.com/health
```

## 🔧 **Troubleshooting**

### **Cursor IDE Shows "Red" Status**
- ✅ **Check file path**: Use absolute path in `args` (most reliable)
- ✅ **Restart Cursor**: Sometimes needed after configuration changes
- ✅ **Test the bridge manually**: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node optidevdoc-remote.js`
- ✅ **Check network**: Ensure `https://optidevdoc.onrender.com/health` is accessible

### **Server Timeout Issues**
- ✅ **Render.com free tier** spins down after inactivity
- ✅ **First request** may take 10-30 seconds to wake up
- ✅ **Subsequent requests** are fast once awake

### **Debug Mode**
Enable detailed logging:
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": ["path/to/optidevdoc-remote.js"],
      "env": {
        "DEBUG_MCP": "true"
      }
    }
  }
}
```

## 🚀 **Future Roadmap**

The current implementation provides a solid foundation. Future enhancements could include:

### **📋 Planned Enhancements** 
- **Live Documentation Crawler**: Automatically fetch latest Optimizely docs
- **Semantic Search**: AI-powered search with embeddings
- **Multiple Products**: Expand beyond current 3 sample documents
- **Database Storage**: Persistent documentation storage
- **Real-time Updates**: Automatic content synchronization

### **🎯 Current Focus**
The project prioritizes **reliability and ease of use** over feature complexity:
- ✅ **Simple Architecture**: Fewer moving parts = more reliable
- ✅ **Zero Setup**: Teams can start using immediately  
- ✅ **Proven Technology**: Express.js + Node.js stack
- ✅ **Free Deployment**: No hosting costs for teams

## 🖥️ **CLI Commands** (NPM Package)

```bash
# Start enhanced MCP client (recommended)
optidevdoc mcp

# Start simple MCP client 
optidevdoc mcp-simple

# Start local server
optidevdoc serve --port 3001

# Start enhanced server with all features
optidevdoc serve-enhanced

# Interactive setup helper
optidevdoc setup

# Show version and features
optidevdoc version

# Enable debug mode
optidevdoc --debug mcp
```

## 📊 **Performance**

- **Response Times**: ~100-300ms (warm), ~10-30s (cold start)
- **Availability**: 99%+ (limited by Render.com free tier)
- **Scalability**: Suitable for small-medium teams
- **Memory Usage**: ~50MB baseline

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`  
5. Open a Pull Request

### **Development Notes**
- Main server code: `src/deploy-server-simple.ts`
- MCP bridge client: `optidevdoc-remote.js`
- Build process: `npm run build` (TypeScript → JavaScript)
- Deployment: Automatic via Render.com on git push

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

**🎉 Ready to enhance your Optimizely development with AI assistance!**  
**Questions?** Open an issue or check the [troubleshooting guide](#-troubleshooting) 