# Optivise

**Intelligent MCP tool that provides curated Optimizely context to LLMs for enhanced AI-assisted development.**

Optivise is a focused, single-purpose MCP tool that serves as a context-aware intermediary between Optimizely developers and LLMs. It automatically detects Optimizely product contexts and delivers precise, relevant guidance without overwhelming the AI with irrelevant information.

## 🚀 Features

### ✨ **Intelligent Context Analysis**
- **Relevance Scoring**: Analyzes prompts for Optimizely relevance (0-1 score)
- **Smart Filtering**: Only responds to Optimizely-related queries (>0.7 relevance)
- **Curated Responses**: Provides structured, actionable information with code examples and best practices

### 🎯 **Product Detection Engine**
- **11+ Optimizely Products**: Configured Commerce, CMS (PaaS/SaaS), CMP, DXP, Web/Feature Experimentation, Data Platform, Connect Platform, Recommendations
- **Multi-Detection**: IDE file analysis + prompt-based detection
- **Evidence Tracking**: Shows why products were detected with confidence scores

### 🛠️ **Modern Architecture**
- **Single MCP Tool**: `optidev_context_analyzer` - unified, focused functionality
- **TypeScript Native**: Modern ES2022 with native TypeScript compilation (no Babel)
- **Fast & Efficient**: <300ms response time, <512MB memory usage
- **Local-First**: Privacy-focused, local processing and storage

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g optivise
```

### Local Installation

```bash
npm install --save-dev optivise
```

### From Source (Development)

```bash
git clone https://github.com/biswajitpanday/OptiDevDoc.git
cd OptiDevDoc
npm install
npm run build
```

## 🏃 Quick Start

### 1. **Start MCP Server**
```bash
# Using global installation
optivise mcp

# Using npm scripts (from source)
npm start
npm run dev  # Build and start
npm run dev:watch  # Development mode with tsx
```

### 2. **Test Product Detection**
```bash
optivise detect
```

### 3. **Generate IDE Configuration**
```bash
optivise setup
```

### 4. **View Available Commands**
```bash
optivise --help
optivise version
```

## 🧪 Browser Testing

For development and testing purposes, you can run Optivise as an HTTP server:

```bash
# Start HTTP server
npm run dev:server

# Open in browser
open http://localhost:3000
```

The browser interface provides:
- ✅ **Test Interface** - Interactive prompt testing with real-time results
- ✅ **Health Check** - Server status and version information  
- ✅ **Context Analysis** - Live testing of relevance scoring and product detection
- ✅ **Formatted Results** - Visual display of actionable steps and best practices

## 🔧 IDE Integration

### Cursor IDE

Create `.cursor-mcp.json` or `cursor-mcp.json` in your project root:

```json
{
  "mcpServers": {
    "optivise": {
      "command": "optivise",
      "args": ["mcp"],
      "env": {
        "OPTIDEV_DEBUG": "false"
      }
    }
  }
}
```

### VS Code

Add to your `settings.json`:

```json
{
  "mcp.servers": {
    "optivise": {
      "command": "optivise",
      "args": ["mcp"]
    }
  }
}
```

### Global Installation Integration

If installed globally, you can use it from any project:

```json
{
  "mcpServers": {
    "optivise": {
      "command": "optivise",
      "args": ["mcp"]
    }
  }
}
```

## 🎯 Usage Examples

### **Context Analysis Tool**

The `optidev_context_analyzer` tool provides intelligent context for Optimizely development:

```typescript
// Example prompt that gets analyzed
"How do I create a custom handler in Optimizely Commerce?"

// Tool response includes:
{
  "relevance": 0.95,
  "detectedProducts": ["configured-commerce"],
  "curatedContext": {
    "summary": "Code assistance for Configured Commerce development - analyzing handler chain requirements",
    "actionableSteps": [
      "Working with Configured Commerce",
      "Review relevant code examples and implementation patterns",
      "Check official documentation for API references"
    ],
    "bestPractices": [
      "Follow handler chain patterns for extending commerce functionality",
      "Use proper dependency injection in your extensions",
      "Implement proper error handling and logging"
    ]
  }
}
```

### **Product Detection**

Optivise automatically detects your Optimizely products:

```bash
$ optivise detect
🔍 Detecting Optimizely Products...
📁 Analyzing project: /your/project/path

✅ Detection Results:
   🛒 Configured Commerce - Extensions directory found
   🛒 Configured Commerce - Blueprint structure found
   ⚙️ .NET Project - C# project files found

💡 Recommendations:
   • Use Commerce-specific patterns and rules
   • Focus on Extensions/ and FrontEnd/ directories
```

## 🏗️ Development

### **Project Structure**

```
src/
├── core/                    # Core MCP server
├── analyzers/              # Context and prompt analysis
├── services/               # Product detection, documentation
├── types/                  # TypeScript definitions
└── utils/                  # Shared utilities

rules/                      # Development rules and patterns
├── configured-commerce/    # Commerce-specific rules
├── cms-paas/              # CMS (PaaS) rules
├── cms-saas/              # CMS (SaaS) rules
├── experimentation/       # Experimentation rules
├── dxp/                   # DXP rules
└── shared/                # Common rules
```

### **Development Commands**

```bash
# Development
npm run dev              # Build and start MCP server
npm run dev:server       # Build and start HTTP server on port 3000 (browser testing)
npm run dev:watch        # Development mode with hot reload
npm run build:watch      # Watch mode for TypeScript compilation

# Building
npm run build            # Build TypeScript to dist/
npm run clean            # Clean dist/ directory

# Quality Assurance
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Prettier formatting

# Testing
npm run test             # Run Vitest test suite
npm run test:watch       # Watch mode for tests
npm run test:coverage    # Generate coverage report
```

### **Environment Variables**

```bash
# Debug mode
OPTIDEV_DEBUG=true

# Custom rules path
OPTIDEVDOC_RULES_PATH=/path/to/rules

# Product override (for testing)
OPTIMIZELY_PRODUCT=configured-commerce
```

## 📚 Supported Optimizely Products

| Product                    | Detection Method | Rules Support |
|---------------------------|------------------|---------------|
| **Configured Commerce**   | ✅ File patterns | ✅ Complete   |
| **Commerce Connect**      | ✅ Dependencies  | ✅ Complete   |
| **CMS (PaaS)**           | ✅ File patterns | ✅ Complete   |
| **CMS (SaaS)**           | ✅ Dependencies  | ✅ Complete   |
| **Content Marketing**     | ✅ File patterns | ✅ Basic      |
| **Digital Experience**    | ✅ File patterns | ✅ Basic      |
| **Web Experimentation**   | ✅ Dependencies  | ✅ Complete   |
| **Feature Experimentation** | ✅ Dependencies | ✅ Complete   |
| **Data Platform**         | ✅ File patterns | ✅ Basic      |
| **Connect Platform**      | ✅ File patterns | ✅ Basic      |
| **Recommendations**       | ✅ Dependencies  | ✅ Basic      |

## 🚢 Deployment

### **NPM Package Publishing**

```bash
# Build and publish stable version
npm run build
npm run deploy

# Publish beta version (for testing)
npm run deploy:beta

# Or with version bump
npm version patch
npm run deploy
```

**Note for v4.0.0+**: The deploy command now includes `--access public` for proper NPM publishing.

### **Render.com Deployment**

Optivise supports cloud deployment on Render.com:

#### **1. Automatic Deployment**
```bash
# Fork the repository
# Connect to Render.com
# Render will automatically use render.yaml configuration
```

#### **2. Manual Setup**
1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Use these settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     NODE_ENV=production
     OPTIX_MODE=server
     OPTIDEV_DEBUG=false
     ```

#### **3. HTTP API Usage**

Once deployed, use the HTTP API:

```bash
# Health check
curl https://your-app.onrender.com/health

# Context analysis
curl -X POST https://your-app.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How do I create a Commerce extension?"}'
```

#### **4. Response Format**
```typescript
{
  "relevance": 0.95,
  "detectedProducts": ["configured-commerce"],
  "curatedContext": {
    "summary": "Code assistance for Configured Commerce development",
    "actionableSteps": [...],
    "bestPractices": [...]
  },
  "processingTime": 245,
  "timestamp": "2025-07-31T10:00:00.000Z"
}
```

### **Local Package Testing**

```bash
# Create global symlink for testing
npm link

# Test globally
optivise version
optivise mcp

# Remove symlink
npm unlink -g optivise
```

## 🔍 Troubleshooting

### **Common Issues**

#### **"Command not found: optivise"**
```bash
# Verify global installation
npm list -g optivise

# Reinstall if needed
npm uninstall -g optivise
npm install -g optivise
```

#### **"Compiled server not found"**
```bash
# Build the project
npm run build

# Or install dependencies
npm install
npm run build
```

#### **ESLint Configuration Issues**
```bash
# If you see ESLint v9 configuration errors
# The project uses the new flat config format (eslint.config.js)
# Make sure you have the latest ESLint version
npm install --save-dev eslint@^9.15.0

# Run lint to check
npm run lint
```

#### **HTTP Server Testing**
```bash
# Start HTTP server for browser testing
npm run dev:server

# Test health endpoint
curl http://localhost:3000/health

# Open browser interface
open http://localhost:3000
```

#### **MCP Connection Issues**
```bash
# Test server manually
optivise mcp

# Enable debug mode
optivise --debug mcp

# Check IDE MCP configuration
optivise setup
```

#### **Product Detection Not Working**
```bash
# Test detection manually
optivise detect

# Check project structure
ls -la  # Look for Optimizely-specific files/folders

# Override product detection
export OPTIMIZELY_PRODUCT=configured-commerce
```

### **Debug Mode**

Enable verbose logging:

```bash
# CLI debug
optivise --debug mcp

# Environment variable
export OPTIDEV_DEBUG=true
npm start
```

## 🏛️ Architecture

### **Phase 1 (Current) - MVP**
- ✅ Single MCP tool (`optidev_context_analyzer`)
- ✅ Basic context analysis and product detection
- ✅ Core Optimizely product support
- ✅ Modern TypeScript architecture

### **Phase 2 (Planned) - Enhanced Features**
- 🔄 IDE rule reading (`.cursorrules`, VS Code settings)
- 🔄 Live Optimizely documentation integration
- 🔄 Enhanced context curation
- 🔄 Performance optimizations

### **Phase 3 (Future) - Advanced Intelligence**
- ⏳ Knowledge base learning system
- ⏳ User feedback integration
- ⏳ Pattern recognition and improvement
- ⏳ Team collaboration features

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test: `npm run test`
4. Commit changes: `git commit -m "Add feature"`
5. Push to branch: `git push origin feature-name`
6. Create Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/biswajitpanday/OptiDevDoc/issues)
- **Documentation**: See `docs/` directory
- **Development Guide**: See `CLAUDE.md`

---

**Optivise v4.0.0** - Intelligent MCP tool for Optimizely context analysis

### ✨ New in v4.0.0:
- **Cross-platform support** - Windows, macOS, and Linux compatibility
- **Centralized version management** - Single source of truth for version info
- **Enhanced HTTP server** - Browser testing interface with real-time analysis
- **Improved ESLint configuration** - Modern v9 flat config with sensible defaults
- **Streamlined deployment** - Fixed NPM publishing with proper access controls