# OptiDevDoc - Dual Deployment Architecture

## 🎯 **System Overview**

OptiDevDoc supports **two distinct deployment modes**, each with different architectural approaches optimized for different use cases:

1. **🌐 Remote Mode**: Zero-setup team deployment via Render.com
2. **📦 NPM Mode**: Local installation with enhanced features

---

## 🌐 **Remote Deployment Architecture**

### **Overview**
Zero-configuration deployment where teams download a single MCP bridge file and connect to hosted server.

### **Architecture Diagram**
```mermaid
graph TB
    subgraph "Developer Workstations"
        A[Cursor IDE]
        B[VS Code] 
        C[Other MCP IDEs]
    end
    
    subgraph "Local MCP Bridge"
        D[optidevdoc-remote.js<br/>Bridge Client]
    end
    
    subgraph "Render.com Cloud"
        E[Express.js Server<br/>Enhanced v2.0]
        F[Pattern Analysis Engine]
        G[Bug Analysis Engine] 
        H[Documentation Crawler]
        I[Live Optimizely Docs]
    end
    
    subgraph "External Sources"
        J[docs.developers.optimizely.com]
        K[GitHub Documentation]
        L[Community Patterns]
    end
    
    A --> D
    B --> D
    C --> D
    
    D -->|HTTPS/JSON-RPC| E
    E --> F
    E --> G
    E --> H
    H --> J
    H --> K
    H --> L
    
    style D fill:#e1f5fe
    style E fill:#f3e5f5
    style J fill:#fff3e0
```

### **Data Flow**
```mermaid
sequenceDiagram
    participant IDE as Cursor IDE
    participant Bridge as MCP Bridge
    participant Server as Render Server
    participant Crawler as Doc Crawler
    participant Docs as Optimizely Docs

    IDE->>Bridge: MCP tools/call request
    Bridge->>Server: HTTPS POST /api/search
    Server->>Crawler: Pattern analysis request
    Crawler->>Docs: Fetch live documentation
    Docs-->>Crawler: HTML content + patterns
    Crawler-->>Server: Structured patterns
    Server-->>Bridge: JSON response + code examples
    Bridge-->>IDE: Formatted MCP response
```

### **Remote Mode Components**

| Component | Technology | Purpose | Status |
|-----------|------------|---------|---------|
| **MCP Bridge** | Node.js client | Protocol translation | ✅ **Active** |
| **Express Server** | TypeScript/Express | API endpoints | ✅ **Deployed** |
| **Pattern Engine** | Custom crawler | Real-time pattern extraction | ✅ **Working** |
| **Bug Analyzer** | Rule-based engine | Optimizely-specific debugging | ✅ **Working** |
| **Documentation** | Live crawling | docs.developers.optimizely.com | ✅ **Active** |

### **Remote Mode Benefits**
- ✅ **Zero Setup**: Download one file, add IDE configuration
- ✅ **Team Distribution**: Share single bridge file across team
- ✅ **Auto Updates**: Server updates without client changes
- ✅ **Zero Cost**: Free tier hosting
- ✅ **Always Online**: 24/7 availability with auto-wake

---

## 📦 **NPM Package Architecture**

### **Overview**
Local installation providing full feature set with enhanced capabilities and offline functionality.

### **Architecture Diagram**  
```mermaid
graph TB
    subgraph "Developer Machine"
        A[Cursor IDE]
        B[VS Code]
        C[Other MCP IDEs]
        
        subgraph "NPM Package (Local)"
            D[CLI Entry Point<br/>bin/optidevdoc]
            E[Enhanced MCP Server<br/>Local Process]
            F[SQLite Database<br/>Pattern Cache]
            G[Semantic Search<br/>Local AI Models]
            H[Pattern Crawler<br/>Background Process]
        end
    end
    
    subgraph "External Sources"
        I[docs.developers.optimizely.com]
        J[Hugging Face Models<br/>Free Embeddings]
        K[Local File System<br/>Cache & Config]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> E
    E --> F
    E --> G
    E --> H
    
    H --> I
    G --> J
    F --> K
    
    style D fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#e1f5fe
    style G fill:#f3e5f5
```

### **NPM Mode Data Flow**
```mermaid
sequenceDiagram
    participant IDE as Cursor IDE
    participant CLI as NPM CLI
    participant Server as Local Server
    participant DB as SQLite DB
    participant AI as Local AI
    participant Cache as File Cache

    IDE->>CLI: MCP request via optidevdoc mcp
    CLI->>Server: Start local MCP server
    Server->>DB: Query pattern database
    DB-->>Server: Cached patterns
    Server->>AI: Semantic analysis
    AI-->>Server: Context-aware results
    Server->>Cache: Update pattern cache
    Server-->>CLI: Enhanced response
    CLI-->>IDE: Rich MCP response
```

### **NPM Mode Components**

| Component | Technology | Purpose | Local Features |
|-----------|------------|---------|----------------|
| **CLI Interface** | Node.js binary | Global commands | `optidevdoc mcp`, `serve`, `setup` |
| **Local Server** | TypeScript/Express | Enhanced MCP server | Full feature set |
| **SQLite Database** | better-sqlite3 | Pattern persistence | Offline capability |
| **Semantic Search** | Hugging Face | AI-powered search | Zero API costs |
| **Background Crawler** | Scheduled jobs | Auto-update patterns | Smart caching |
| **Configuration** | JSON/YAML | User preferences | `~/.optidevdoc/config` |

### **NPM Mode Benefits**
- ✅ **Full Feature Set**: All capabilities available locally
- ✅ **Offline Mode**: Works without internet after initial setup
- ✅ **Performance**: No network latency, local processing
- ✅ **Customization**: User-specific configuration and caching
- ✅ **Privacy**: No data sent to external servers
- ✅ **Advanced AI**: Local models for semantic search

---

## 🔄 **Deployment Mode Comparison**

### **Feature Matrix**

| Feature | Remote Mode | NPM Mode | Notes |
|---------|-------------|----------|-------|
| **Setup Complexity** | ⭐ Minimal | ⭐⭐ Moderate | Remote: 1 file. NPM: `npm install -g` |
| **Feature Set** | ⭐⭐⭐ Basic | ⭐⭐⭐⭐⭐ Complete | NPM has all advanced features |
| **Performance** | ⭐⭐ Network | ⭐⭐⭐⭐⭐ Local | NPM faster, no network calls |
| **Offline Support** | ❌ None | ✅ Full | NPM works offline |
| **Team Distribution** | ✅ Excellent | ⭐⭐ Manual | Remote easier to share |
| **Resource Usage** | ✅ Zero local | ⭐⭐ Moderate | NPM uses local CPU/memory |
| **Customization** | ⭐ Limited | ⭐⭐⭐⭐⭐ Extensive | NPM allows full configuration |

### **Use Case Recommendations**

#### **Choose Remote Mode When:**
- ✅ **Quick Team Onboarding**: Need immediate access for multiple developers
- ✅ **Resource Constraints**: Limited local machine resources
- ✅ **Simplicity Priority**: Want zero maintenance and configuration
- ✅ **Occasional Usage**: Don't need Optimizely assistance daily

#### **Choose NPM Mode When:**
- ✅ **Heavy Usage**: Daily Optimizely development work
- ✅ **Advanced Features**: Need semantic search, caching, offline mode
- ✅ **Performance Critical**: Can't tolerate network latency
- ✅ **Privacy Requirements**: Keep all data local
- ✅ **Customization Needs**: Want to configure behavior and caching

---

## 🏗️ **Technical Implementation Details**

### **Remote Mode Technical Stack**
```yaml
Infrastructure:
  Hosting: Render.com (Free Tier)
  Runtime: Node.js 20+
  Framework: Express.js + TypeScript
  
Communication:
  Protocol: MCP over HTTPS
  Format: JSON-RPC 2.0
  Transport: HTTP POST
  
Data Sources:
  Primary: docs.developers.optimizely.com
  Cache: In-memory (server restart clears)
  Patterns: Real-time extraction
```

### **NPM Mode Technical Stack**
```yaml
Installation:
  Distribution: npmjs.com
  Binary: Global CLI command
  Dependencies: Bundled (zero external deps)
  
Local Server:
  Runtime: Embedded Node.js server
  Database: SQLite with FTS5
  AI: Hugging Face Transformers.js
  
Storage:
  Config: ~/.optidevdoc/config.json
  Cache: ~/.optidevdoc/cache/
  Database: ~/.optidevdoc/patterns.db
```

### **Shared Components**
Both modes share core business logic:

```typescript
// Shared pattern analysis engine
interface PatternAnalyzer {
  analyzeScenario(scenario: string): Promise<OptimizelyPattern[]>;
  findBestPractices(product: string): Promise<BestPractice[]>;
  debugIssue(description: string): Promise<Solution[]>;
}

// Shared MCP tool definitions
const tools = [
  'search_optimizely_docs',
  'find_optimizely_pattern', 
  'analyze_optimizely_bug'
];
```

---

## 📊 **Performance & Scalability**

### **Remote Mode Performance**
- **Cold Start**: 10-30 seconds (Render free tier)
- **Warm Response**: 1-3 seconds
- **Concurrent Users**: ~10-20 (free tier limits)
- **Uptime**: 99%+ (managed infrastructure)

### **NPM Mode Performance**  
- **Startup Time**: 2-5 seconds (first run)
- **Response Time**: <100ms (local processing)
- **Concurrent Usage**: Limited by machine resources
- **Availability**: 100% (offline capable)

### **Scaling Strategies**

#### **Remote Mode Scaling**
```mermaid
graph LR
    A[Free Tier<br/>Basic Features] --> B[Paid Tier<br/>Enhanced Performance]
    B --> C[Multiple Regions<br/>Global Distribution] 
    C --> D[Premium Features<br/>Advanced AI]
```

#### **NPM Mode Scaling**
```mermaid
graph LR
    A[Local Install<br/>Full Features] --> B[Team Package<br/>Shared Config]
    B --> C[Enterprise<br/>Custom Sources]
    C --> D[Cloud Sync<br/>Hybrid Mode]
```

---

## 🔒 **Security & Privacy**

### **Remote Mode Security**
- **Transport**: HTTPS encryption
- **Authentication**: None required (public API)
- **Data Privacy**: Query logs not stored permanently
- **Rate Limiting**: Basic protection against abuse

### **NPM Mode Security**
- **Local Processing**: No data sent externally
- **File Permissions**: Standard Node.js file access
- **Network**: Only outbound for documentation updates
- **User Data**: Stored locally with user permissions

---

## 🚀 **Deployment Strategies**

### **Remote Mode Deployment**
```bash
# Automatic deployment via GitHub
git push origin master
# → Triggers Render.com build
# → TypeScript compilation  
# → Express server starts
# → Auto-scaling and health checks
```

### **NPM Mode Deployment**  
```bash
# Publishing to npm registry
npm version patch
npm publish
# → Available globally via npm install -g optidevdoc
# → Users install and run locally
```

### **Hybrid Deployment (Future)**
```mermaid
graph TB
    A[User Choice] --> B{Deployment Mode}
    B -->|Quick Start| C[Remote Mode]
    B -->|Full Features| D[NPM Mode]
    B -->|Best of Both| E[Hybrid Mode]
    
    E --> F[Remote for Basic Features]
    E --> G[Local for Advanced Features]
    E --> H[Seamless Fallback]
```

---

## 📈 **Future Architecture Evolution**

### **Phase 1 (Current): Dual Mode**
- ✅ Remote deployment working
- ✅ NPM package functional
- ✅ Clear separation of concerns

### **Phase 2: Enhanced Features**
- 📋 Real-time collaboration (Remote)
- 📋 Advanced AI models (NPM)
- 📋 Custom pattern libraries (Both)

### **Phase 3: Ecosystem**
- 📋 Plugin architecture
- 📋 Enterprise integrations
- 📋 Multi-cloud deployment options

This dual architecture provides maximum flexibility while maintaining simplicity and performance for different user needs and organizational requirements. 