# Optivise v5.0.0

**The Ultimate Optimizely Development Assistant - AI-Powered MCP Tool with Zero-Config Setup**

Optivise is the most advanced MCP tool for Optimizely developers, providing real-time coding assistance, intelligent bug fixing, Jira ticket implementation guidance, and comprehensive development support. With automatic API key detection and AI-powered features, it transforms your IDE into an Optimizely expertise center.

## 🚀 Revolutionary Features

### 🤖 **AI-Powered Development Assistant**
- **Zero-Config AI Setup**: Automatically detects and uses your existing IDE AI keys (Cursor, VSCode)
- **Real-Time Coding Assistance**: Live error prevention, optimization suggestions, and best practice enforcement
- **Intelligent Auto-completion**: Context-aware Optimizely API suggestions and code snippets
- **Vector-Based Search**: Semantic similarity search across 10,000+ Optimizely documentation pages

### 🎯 **Advanced Development Support**
- **Jira Ticket Implementation**: Paste any Jira ticket → Get complete implementation guidance
- **Bug Fixing Intelligence**: Describe any bug → Receive step-by-step debugging assistance
- **Product Auto-Detection**: Automatically identifies your Optimizely products from code context
- **Multi-Scenario Expertise**: Handles complex multi-product implementations and integrations

### 🛠️ **Five Specialized MCP Tools**
- **`optidev_context_analyzer`**: Enhanced context analysis with AI-powered relevance scoring
- **`optidev_implementation_guide`**: Jira ticket parsing and implementation planning
- **`optidev_debug_helper`**: Bug analysis and resolution assistance
- **`optidev_code_analyzer`**: Real-time code analysis and optimization
- **`optidev_project_helper`**: Project setup, migration, and best practices

### ⚡ **Cutting-Edge Technology**
- **Automatic API Key Integration**: Uses your existing Cursor/VSCode AI subscriptions
- **ChromaDB Vector Database**: Intelligent documentation storage and retrieval
- **Daily Documentation Sync**: Always up-to-date with latest Optimizely content
- **Local Learning System**: Improves over time while maintaining privacy

## 📦 Zero-Config Installation

### 🚀 **One Command Setup** (Recommended)

```bash
# Install globally for universal IDE access
npm install -g optivise

# That's it! Optivise will automatically:
# ✅ Detect your IDE (Cursor, VSCode, etc.)
# ✅ Find your existing AI API keys (with permission)
# ✅ Set up AI-powered features instantly
# ✅ Start providing intelligent assistance
```

### 🎯 **Instant AI Setup**
No manual API key configuration needed! Optivise intelligently detects and uses your existing IDE AI setup:
- **Cursor IDE**: Uses your existing Claude/GPT subscriptions
- **VS Code**: Integrates with GitHub Copilot and other AI extensions
- **Secure & Transparent**: Always asks permission before accessing any keys

### 📥 **Alternative Installation Methods**

#### Local Project Installation
```bash
npm install --save-dev optivise
```

#### From Source (Development)
```bash
git clone https://github.com/biswajitpanday/OptiDevDoc.git
cd OptiDevDoc
npm install
npm run build
```

## 🏃 Quick Start (30 seconds to AI-powered development!)

### 1. **Automatic Setup** ✨
```bash
# Install and setup automatically
npm install -g optivise

# Optivise detects your IDE and asks for permission to use existing AI keys
# ✅ Permission granted? You're ready for AI-powered Optimizely development!
# ❌ No AI keys found? No problem - basic features work without AI
```

### 2. **Start Development Assistant**
```bash
# Start with full AI features (auto-detected keys)
optivise mcp

# Or start in basic mode (no AI dependencies)
optivise mcp --basic

# Development mode with hot reload
npm run dev
```

### 3. **Test Your Setup**
```bash
# Verify everything works
optivise test

# Test AI features specifically
optivise test --ai

# Detect your Optimizely products
optivise detect
```

### 4. **Explore Advanced Features**
```bash
# Manual documentation sync
optivise sync-docs

# View comprehensive help
optivise --help

# Check current version and capabilities
optivise version --features
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

## 🎯 Real-World Usage Examples

### 🎫 **Jira Ticket Implementation**

Paste any Jira ticket and get complete implementation guidance:

```typescript
// User pastes Jira ticket content
"Epic: User Preferences Center - Allow users to manage email marketing preferences"

// optidev_implementation_guide responds with:
{
  "detectedProducts": ["content-marketing-platform", "cms"],
  "implementationPlan": {
    "approach": "CMP preference center with CMS integration",
    "architecture": "Headless CMS + React preference center",
    "estimatedEffort": "2-3 sprints",
    "keyComponents": [
      "User preference API endpoints",
      "React preference center UI",
      "Email integration with CMP",
      "Data persistence layer"
    ]
  },
  "codeTemplates": [
    "PreferenceCenter.tsx boilerplate",
    "API controller templates", 
    "Database migration scripts"
  ],
  "testingStrategy": "Unit tests + Integration tests + User acceptance criteria"
}
```

### 🐛 **Intelligent Bug Fixing**

Describe any bug and receive step-by-step debugging assistance:

```typescript
// User describes a bug
"Commerce pricing engine not calculating tax correctly for international orders"

// optidev_debug_helper analyzes and responds:
{
  "detectedProducts": ["configured-commerce"],
  "bugAnalysis": {
    "category": "tax_calculation_error",
    "likelyCauses": [
      "Incorrect tax provider configuration",
      "Missing international tax rules",
      "Currency conversion timing issues"
    ],
    "confidence": 0.92
  },
  "debuggingSteps": [
    "Check tax provider configuration in Commerce Manager",
    "Verify international tax rules are configured",
    "Review order processing logs for currency conversion",
    "Test with specific international addresses"
  ],
  "solutions": [
    "Configure Avalara for international tax calculation",
    "Implement custom tax calculator for specific regions",
    "Add currency conversion validation"
  ],
  "preventionTips": [
    "Always test with international addresses",
    "Monitor tax calculation logs",
    "Set up alerts for tax calculation failures"
  ]
}
```

### 🔍 **Automatic Product Detection**

Ask questions without specifying products - Optivise figures it out:

```typescript
// User asks without mentioning specific products
"How do I customize the checkout flow to include gift wrapping options?"

// System automatically detects context and responds:
{
  "detectedProducts": ["configured-commerce"],
  "confidence": 0.96,
  "detectionEvidence": [
    "checkout flow - commerce indicator",
    "gift wrapping - e-commerce feature",
    "Project analysis found Commerce dependencies"
  ],
  "contextualResponse": {
    "solution": "Commerce checkout customization with gift service extension",
    "implementation": "Custom checkout step + gift service integration",
    "codeExamples": ["CheckoutGiftStep.cs", "GiftWrapService.cs"]
  }
}
```

### 💰 **Feature Possibility Queries**

Get definitive answers about Optimizely capabilities:

```typescript
// User asks about specific feature possibility
"Is it possible to increase tax by 3% more in Configured Commerce pricing?"

// optidev_context_analyzer provides comprehensive answer:
{
  "answer": "YES",
  "confidence": 0.98,
  "explanation": "Commerce supports custom tax calculators and pricing adjustments",
  "implementationOptions": [
    {
      "method": "Custom Tax Calculator",
      "complexity": "Medium",
      "description": "Implement ITaxCalculator interface with percentage adjustment",
      "codeExample": "CustomTaxCalculator.cs implementation"
    },
    {
      "method": "Promotion Engine",
      "complexity": "Low", 
      "description": "Use promotion system to add tax adjustment",
      "codeExample": "TaxAdjustmentPromotion configuration"
    }
  ],
  "limitations": [
    "May require compliance review for tax regulations",
    "Should validate against local tax laws"
  ],
  "documentationLinks": [
    "https://docs.optimizely.com/commerce/tax-calculation",
    "https://docs.optimizely.com/commerce/promotions"
  ]
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

### **Quick Diagnostic Commands**

```bash
# 🧪 Test everything at once
optivise test

# 🌐 Start browser testing server
optivise server

# 🔍 Detect current project products
optivise detect

# ⚙️  Generate IDE configuration
optivise setup
```

### **Common Issues & Solutions**

#### **❌ "Command not found: optivise"**
**Problem**: Optivise not globally accessible
```bash
# Check global installation
npm list -g optivise

# Reinstall if missing
npm uninstall -g optivise
npm install -g optivise

# Verify PATH includes npm global binaries
npm config get prefix
# Add <prefix>/bin to your PATH if needed
```

#### **❌ "Compiled server not found"**
**Problem**: Project not built after installation
```bash
# Build the project
npm run build

# Or clean rebuild
npm run clean && npm run build

# For development
npm install && npm run build
```

#### **❌ MCP Server Won't Start in Cursor IDE**
**Problem**: Incorrect configuration or path issues

**Solution 1**: Update configuration
```bash
# Generate correct config
optivise setup

# Copy the generated configuration to your project
# Use .cursor-mcp.json or cursor-mcp.json
```

**Solution 2**: Test MCP server manually
```bash
# Test MCP connectivity
optivise test

# Start MCP server manually (should show connection logs)
optivise mcp

# Debug mode for detailed logs  
optivise --debug mcp
```

**Solution 3**: Check Cursor IDE settings
- Restart Cursor IDE after configuration changes
- Check MCP logs in Cursor IDE (View > Toggle Developer Tools > Console)
- Verify no other MCP servers are conflicting

#### **❌ HTTP Server Issues**
**Problem**: Cannot test locally via browser

```bash
# Start HTTP server (automatic build)
optivise server

# Manual testing
npm run server

# Test endpoints directly
curl http://localhost:3000/health
curl http://localhost:3000/test/mcp
curl http://localhost:3000/test/detect

# Test with browser
open http://localhost:3000
```

#### **❌ Product Detection Not Working**
**Problem**: No Optimizely products detected

```bash
# Test detection manually
optivise detect

# Check for Optimizely-specific files
ls -la Extensions/  # Commerce
ls -la modules/     # CMS
ls -la package.json # Check dependencies

# Override detection for testing
export OPTIMIZELY_PRODUCT=configured-commerce
optivise server
```

#### **❌ Context Analysis Returns No Results**
**Problem**: Queries not recognized as Optimizely-related

**Check relevance threshold**: Optivise only responds to queries with >0.7 Optimizely relevance

```bash
# Test with HTTP server
optivise server
# Navigate to http://localhost:3000
# Try these test prompts:
#   "How do I create a Commerce extension?"
#   "Configure CMS content types"
#   "Set up A/B testing in Optimizely"
```

#### **❌ ESLint v9 Configuration Errors**
**Problem**: Modern ESLint flat config format

```bash
# Project uses eslint.config.js (v9 format)
# Update ESLint if needed
npm install --save-dev eslint@^9.15.0

# Run lint check
npm run lint

# Auto-fix issues
npm run lint:fix
```

### **Advanced Debugging**

#### **🔍 Enable Debug Mode**
```bash
# CLI debug (verbose logging)
optivise --debug mcp
optivise --debug server

# Environment variable
export OPTIDEV_DEBUG=true
npm start

# Package.json debug scripts
npm run mcp:test    # Quick MCP server test
npm run server:test # Quick HTTP server test
```

#### **🧪 Step-by-Step Testing**

**1. Test Server Startup**
```bash
# Build and test startup
npm run build
optivise test
```

**2. Test HTTP Endpoints**
```bash
# Start server in background
optivise server &

# Test all endpoints
curl http://localhost:3000/health
curl http://localhost:3000/test/mcp  
curl http://localhost:3000/test/detect

# Stop background server
pkill -f "optivise server"
```

**3. Test MCP Protocol**
```bash
# Test MCP server directly
optivise --debug mcp

# In another terminal, check if process is running
ps aux | grep optivise
```

**4. Test IDE Integration**
```bash
# Generate fresh config
optivise setup

# Copy config to project root
cp cursor-mcp.json .cursor-mcp.json

# Restart IDE and check MCP connection
```

### **🚨 Emergency Recovery**

If everything fails, try this recovery sequence:

```bash
# 1. Complete clean reinstall
npm uninstall -g optivise
npm cache clean --force

# 2. Reinstall from npm
npm install -g optivise

# 3. Verify installation
optivise version
optivise test

# 4. Regenerate all configs
optivise setup

# 5. Test everything
optivise server  # Test in browser
optivise detect  # Test product detection
```

### **📞 Getting Help**

If issues persist:

1. **Run Full Diagnostic**: `optivise test` and share output
2. **Enable Debug Mode**: `optivise --debug mcp` for detailed logs  
3. **Check GitHub Issues**: [Known Issues](https://github.com/biswajitpanday/OptiDevDoc/issues)
4. **Browser Testing**: Use `optivise server` for interactive testing

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

**Optivise v5.0.0** - The Ultimate Optimizely Development Assistant

### 🚀 Revolutionary in v5.0.0:
- **🤖 Zero-Config AI Setup** - Automatically uses your existing IDE AI keys (Cursor, VSCode)
- **🎯 Five Specialized MCP Tools** - Complete development assistance suite
- **⚡ Real-Time Coding Assistant** - Live error prevention and optimization
- **📚 AI-Powered Documentation** - Vector search across 10,000+ Optimizely pages
- **🔧 Jira Integration** - Complete ticket implementation guidance
- **🐛 Intelligent Bug Fixing** - Step-by-step debugging assistance
- **🧠 Learning System** - Improves over time while maintaining privacy
- **🔒 Privacy-First AI** - Local processing with secure API key handling