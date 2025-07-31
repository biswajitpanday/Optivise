# OptiDevAssistant

**Intelligent MCP tool that provides curated Optimizely context to LLMs for enhanced AI-assisted development.**

OptiDevAssistant is a focused, single-purpose MCP tool that serves as a context-aware intermediary between Optimizely developers and LLMs. It automatically detects Optimizely product contexts and delivers precise, relevant guidance without overwhelming the AI with irrelevant information.

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
npm install -g optidev-assistant
```

### Local Installation

```bash
npm install --save-dev optidev-assistant
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
optidev-assistant mcp

# Using npm scripts (from source)
npm start
npm run dev  # Build and start
npm run dev:watch  # Development mode with tsx
```

### 2. **Test Product Detection**
```bash
optidev-assistant detect
```

### 3. **Generate IDE Configuration**
```bash
optidev-assistant setup
```

### 4. **View Available Commands**
```bash
optidev-assistant --help
optidev-assistant version
```

## 🔧 IDE Integration

### Cursor IDE

Create `.cursor-mcp.json` or `cursor-mcp.json` in your project root:

```json
{
  "mcpServers": {
    "optidev-assistant": {
      "command": "optidev-assistant",
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
    "optidev-assistant": {
      "command": "optidev-assistant",
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
    "optidev-assistant": {
      "command": "optidev-assistant",
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

OptiDevAssistant automatically detects your Optimizely products:

```bash
$ optidev-assistant detect
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
# Build and publish
npm run build
npm run deploy

# Or with version bump
npm version patch
npm run deploy
```

### **Local Package Testing**

```bash
# Create global symlink for testing
npm link

# Test globally
optidev-assistant version
optidev-assistant mcp

# Remove symlink
npm unlink -g optidev-assistant
```

## 🔍 Troubleshooting

### **Common Issues**

#### **"Command not found: optidev-assistant"**
```bash
# Verify global installation
npm list -g optidev-assistant

# Reinstall if needed
npm uninstall -g optidev-assistant
npm install -g optidev-assistant
```

#### **"Compiled server not found"**
```bash
# Build the project
npm run build

# Or install dependencies
npm install
npm run build
```

#### **MCP Connection Issues**
```bash
# Test server manually
optidev-assistant mcp

# Enable debug mode
optidev-assistant --debug mcp

# Check IDE MCP configuration
optidev-assistant setup
```

#### **Product Detection Not Working**
```bash
# Test detection manually
optidev-assistant detect

# Check project structure
ls -la  # Look for Optimizely-specific files/folders

# Override product detection
export OPTIMIZELY_PRODUCT=configured-commerce
```

### **Debug Mode**

Enable verbose logging:

```bash
# CLI debug
optidev-assistant --debug mcp

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

**OptiDevAssistant v3.0.0-alpha.1** - Intelligent MCP tool for Optimizely context analysis