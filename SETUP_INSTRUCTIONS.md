# Optivise v5.0.0 - Complete Setup Instructions
## 🚀 From Zero to Production in Minutes

This guide provides step-by-step instructions to get Optivise v5.0.0 running on your system, from basic installation to advanced production deployment.

---

## 📋 Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher (LTS recommended)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 2GB free space (including dependencies and cache)
- **Network**: Internet connection for AI features and documentation sync

### Supported IDEs

- **Cursor IDE** (Primary support - recommended)
- **VS Code** (Full support)
- **Any MCP-compatible editor** (Basic support)

### Optional Dependencies (for enhanced features)

- **OpenAI API Key** (for AI-powered semantic search)
- **ChromaDB Server** (for advanced vector database features)
- **Docker** (for containerized ChromaDB deployment)

---

## 🚀 Quick Installation (5 minutes)

### Step 1: Install Optivise

```bash
# Option A: Global installation (recommended for most users)
npm install -g optivise

# Option B: Local project installation
npm install optivise

# Option C: Using Yarn
yarn global add optivise
```

### Step 2: Verify Installation

```bash
# Check if Optivise is installed correctly
optivise --version

# Run health check
optivise --health-check
```

**Expected output:**
```
✅ Optivise v5.0.0 installed successfully
✅ All core services operational
✅ MCP server ready
ℹ️  AI services available (configure OpenAI/ChromaDB for enhanced features)
```

### Step 3: Configure Your IDE

#### For Cursor IDE (Recommended):

1. Open Cursor IDE
2. Go to Settings (`Cmd/Ctrl + ,`)
3. Navigate to "Extensions" → "MCP"
4. Add this configuration:

```json
{
  "mcpServers": {
    "optivise": {
      "command": "optivise",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

5. Restart Cursor IDE

#### For VS Code:

1. Install the MCP extension from the marketplace
2. Open workspace settings (`.vscode/settings.json`)
3. Add this configuration:

```json
{
  "mcp.servers": [
    {
      "name": "optivise",
      "command": "optivise",
      "args": ["mcp"]
    }
  ]
}
```

4. Reload VS Code window

### Step 4: Test Basic Functionality

1. Open any file in your IDE
2. Try using one of the MCP tools:

```
@optidev_context_analyzer "Test if Optivise is working correctly"
```

**Expected behavior:**
- Tool responds with relevance analysis
- Provides basic Optimizely context or indicates query is not Optimizely-related
- No errors in IDE console

---

## 🤖 Enhanced AI Setup (Optional but Recommended)

### OpenAI Integration

#### Step 1: Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create account or sign in
3. Navigate to API Keys section
4. Create a new API key

#### Step 2: Configure OpenAI

```bash
# Option A: Environment variable (recommended)
export OPENAI_API_KEY="sk-your-api-key-here"

# Option B: Using .env file
echo "OPENAI_API_KEY=sk-your-api-key-here" >> .env

# Option C: IDE-specific configuration
# Add to your IDE's MCP configuration:
```

```json
{
  "mcpServers": {
    "optivise": {
      "command": "optivise",
      "args": ["mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-your-api-key-here"
      }
    }
  }
}
```

#### Step 3: Test OpenAI Integration

```bash
# Test OpenAI connection
optivise --test-openai
```

**Expected output:**
```
✅ OpenAI API key configured
✅ API connection successful
✅ Embeddings service operational
ℹ️  AI-powered features now available
```

### ChromaDB Setup

#### Option A: Docker Deployment (Recommended)

```bash
# Start ChromaDB server
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chromadb_data:/chroma/chroma \
  chromadb/chroma:latest

# Verify ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat
```

#### Option B: Local Installation

```bash
# Install ChromaDB
pip install chromadb

# Start ChromaDB server
chroma run --host localhost --port 8000
```

#### Step 3: Configure ChromaDB Connection

```bash
# Set ChromaDB connection details
export CHROMA_HOST="localhost"
export CHROMA_PORT="8000"

# Test ChromaDB connection
optivise --test-chromadb
```

**Expected output:**
```
✅ ChromaDB server accessible
✅ Vector database connection established
✅ Collections initialized
ℹ️  Semantic search capabilities now available
```

---

## 🎯 Complete Feature Test

### Test All 5 MCP Tools

Run these tests to verify all tools are working:

#### 1. Context Analyzer
```
@optidev_context_analyzer "How do I implement a custom handler chain in Optimizely Commerce?"
```

#### 2. Implementation Guide
```
@optidev_implementation_guide "Create an implementation plan for a customer registration feature with email validation and password requirements"
```

#### 3. Debug Helper
```
@optidev_debug_helper "I'm getting a NullReferenceException in my Commerce cart handler. How do I debug this?"
```

#### 4. Code Analyzer
```
@optidev_code_analyzer "Analyze this code for performance issues: public class CartHandler { /* your code here */ }"
```

#### 5. Project Helper
```
@optidev_project_helper "Help me set up a new Optimizely Commerce project with CMS integration"
```

### Expected Results

Each tool should:
- ✅ Respond within 2 seconds (basic mode) or 5 seconds (AI-enhanced mode)
- ✅ Provide relevant, actionable guidance
- ✅ Include code examples or step-by-step instructions when appropriate
- ✅ Indicate which Optimizely products are relevant to your query

---

## 🏢 Team & Collaboration Setup

### Setting Up Team Workspaces

#### Step 1: Create a Workspace

```javascript
// Using the collaboration service programmatically
const collaborationService = require('optivise/collaboration');

const workspace = collaborationService.createWorkspace({
  name: "My Team Workspace",
  description: "Shared workspace for Optimizely development",
  owner: "your-user-id",
  isPublic: false
});

console.log('Workspace created:', workspace.id);
```

#### Step 2: Invite Team Members

```javascript
// Each team member joins the workspace
const success = collaborationService.joinWorkspace(
  workspace.id, 
  "team-member-user-id", 
  "team-member-username", 
  "editor"  // role: 'viewer', 'editor', or 'owner'
);
```

#### Step 3: Share Development Rules

```javascript
// Share a development rule with the team
collaborationService.shareRule(workspace.id, "your-user-id", {
  name: "Commerce Handler Best Practices",
  content: `
    // Always validate input parameters
    if (!request.IsValid) {
        return new ProcessResult(false, "Invalid request");
    }
    
    // Use try-catch for error handling
    try {
        // Your handler logic here
    } catch (Exception ex) {
        Logger.Error("Handler failed", ex);
        return new ProcessResult(false, ex.Message);
    }
  `
});
```

---

## 🔒 Security & Privacy Configuration

### Basic Security Setup

```bash
# Configure security settings
export OPTIVISE_SECURITY_LEVEL="standard"  # options: basic, standard, enhanced
export OPTIVISE_DATA_RETENTION_DAYS="365"
export OPTIVISE_ENABLE_AUDIT_LOGGING="true"
```

### Advanced Security Configuration

```javascript
// Configure advanced security features
const securityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    saltLength: 16
  },
  authentication: {
    tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },
  privacy: {
    dataRetentionDays: 365,
    anonymizeAfterDays: 90,
    enableAuditLogging: true
  }
};
```

### Privacy Controls

```bash
# Configure privacy settings
export OPTIVISE_ENABLE_LEARNING="false"     # Disable learning features
export OPTIVISE_ENABLE_TELEMETRY="false"    # Disable telemetry
export OPTIVISE_LOCAL_ONLY="true"           # Local processing only
```

---

## 📊 Monitoring & Analytics Setup

### Basic Monitoring

```bash
# Enable monitoring
export OPTIVISE_ENABLE_MONITORING="true"
export OPTIVISE_METRICS_RETENTION_HOURS="24"

# Start monitoring service
optivise --start-monitoring
```

### Advanced Analytics Configuration

```javascript
// Configure comprehensive monitoring
const monitoringService = new MonitoringService(logger, {
  retentionHours: 168, // 7 days
  enableRealTimeAlerts: true,
  performanceThresholds: {
    responseTime: 2000,    // 2 seconds
    memoryUsage: 512,      // 512MB
    errorRate: 0.05        // 5%
  }
});

// Add custom alert rules
monitoringService.addAlertRule({
  id: 'high_memory_usage',
  name: 'High Memory Usage Alert',
  condition: (metrics) => {
    const memoryMetrics = metrics.filter(m => m.metric === 'memory_usage');
    return memoryMetrics.some(m => m.value > 400 * 1024 * 1024); // 400MB
  },
  severity: 'medium',
  enabled: true,
  cooldown: 300 // 5 minutes
});
```

---

## 🚀 Production Deployment

### Local Development

```bash
# Start Optivise in development mode
optivise mcp --dev

# Enable debug logging
export LOG_LEVEL="debug"
optivise mcp --debug
```

### Production Deployment

#### Option A: NPM Package Deployment

```bash
# Install for production
npm install -g optivise

# Start in production mode
export NODE_ENV="production"
export LOG_LEVEL="info"
optivise mcp --production
```

#### Option B: Docker Deployment

```dockerfile
# Dockerfile for Optivise
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
CMD ["optivise", "mcp", "--production"]
```

```bash
# Build and run Docker container
docker build -t optivise:v5.0.0 .
docker run -d \
  --name optivise-prod \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  optivise:v5.0.0
```

#### Option C: Cloud Deployment (Render, AWS, etc.)

```yaml
# render.yaml for Render deployment
services:
  - type: web
    name: optivise
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENAI_API_KEY
        fromEnvVar: OPENAI_API_KEY
```

### Health Checks and Monitoring

```bash
# Set up health check endpoint
curl http://localhost:3000/health

# Monitor system status
curl http://localhost:3000/api/status

# View performance metrics
curl http://localhost:3000/api/metrics
```

---

## 🔧 Advanced Configuration

### Performance Tuning

```bash
# Configure caching
export OPTIVISE_CACHE_MAX_SIZE="256"        # 256MB cache size
export OPTIVISE_CACHE_TTL="900000"          # 15 minutes TTL
export OPTIVISE_CACHE_CLEANUP_INTERVAL="300000"  # 5 minutes cleanup

# Configure concurrency
export OPTIVISE_MAX_CONCURRENT_REQUESTS="50"
export OPTIVISE_REQUEST_TIMEOUT="30000"     # 30 seconds timeout
```

### Database Configuration

```bash
# ChromaDB configuration
export CHROMA_HOST="your-chromadb-host"
export CHROMA_PORT="8000"
export CHROMA_TIMEOUT="10000"               # 10 seconds

# Vector database settings
export VECTOR_DIMENSION="1536"              # OpenAI embedding dimension
export MAX_VECTOR_RESULTS="20"              # Maximum search results
```

### Custom Tool Configuration

```javascript
// Configure individual tools
const toolConfig = {
  contextAnalyzer: {
    relevanceThreshold: 0.7,
    maxResponseLength: 2000,
    enableAI: true
  },
  implementationGuide: {
    maxPlanningSteps: 10,
    includeCodeExamples: true,
    riskAssessment: true
  },
  debugHelper: {
    maxSolutionSteps: 8,
    includePreventionTips: true,
    errorPatternMatching: true
  },
  codeAnalyzer: {
    performanceAnalysis: true,
    securityScanning: true,
    bestPracticeValidation: true
  },
  projectHelper: {
    includeTemplates: true,
    migrationSupport: true,
    configurationValidation: true
  }
};
```

---

## 🆘 Troubleshooting Common Issues

### Installation Issues

#### Issue: NPM Install Fails
```bash
# Clear NPM cache
npm cache clean --force

# Use different registry
npm install -g optivise --registry https://registry.npmjs.org

# Try with sudo (Linux/Mac)
sudo npm install -g optivise
```

#### Issue: Permission Errors (Windows)
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install using Windows package manager
winget install Node.js
npm install -g optivise
```

### IDE Integration Issues

#### Issue: MCP Tools Not Appearing
```bash
# Verify MCP configuration
optivise --verify-mcp

# Check IDE MCP extension status
# Restart IDE and check console for errors

# Test MCP server directly
optivise mcp --test
```

#### Issue: Tools Responding Slowly
```bash
# Check system resources
optivise --system-status

# Clear cache
optivise --clear-cache

# Restart with debug logging
optivise mcp --debug
```

### AI Feature Issues

#### Issue: OpenAI API Errors
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check API usage limits
optivise --check-openai-limits

# Use alternative AI backend
export OPTIVISE_AI_BACKEND="local"  # Disable OpenAI
```

#### Issue: ChromaDB Connection Failed
```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB
docker restart chromadb

# Use alternative port
export CHROMA_PORT="8080"
```

### Performance Issues

#### Issue: High Memory Usage
```bash
# Check memory usage
optivise --memory-status

# Reduce cache size
export OPTIVISE_CACHE_MAX_SIZE="128"

# Enable memory optimization
export OPTIVISE_MEMORY_OPTIMIZATION="true"
```

#### Issue: Slow Response Times
```bash
# Enable performance monitoring
export OPTIVISE_ENABLE_PROFILING="true"

# Check cache hit rates
optivise --cache-stats

# Optimize for speed
export OPTIVISE_PERFORMANCE_MODE="fast"
```

---

## 📞 Getting Help

### Self-Service Options

1. **Health Check**: `optivise --health-check`
2. **System Status**: `optivise --system-status`
3. **Logs**: `optivise --show-logs`
4. **Configuration**: `optivise --show-config`

### Community Support

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/optimizely/optivise/issues)
- **Documentation**: [Complete technical docs](https://docs.optivise.dev)
- **Community Forum**: [Get help from other users](https://community.optivise.dev)
- **Discord**: [Real-time community chat](https://discord.gg/optivise)

### Professional Support

- **Enterprise Support**: Contact enterprise@optivise.dev
- **Custom Integration**: Contact integrations@optivise.dev
- **Training Services**: Contact training@optivise.dev

---

## 🎉 You're All Set!

Congratulations! You now have Optivise v5.0.0 fully configured and ready to transform your Optimizely development experience.

### Quick Reference

- **5 MCP Tools**: Use `@optidev_*` commands in your IDE
- **AI Features**: Enhanced with OpenAI and ChromaDB
- **Team Collaboration**: Real-time workspaces and sharing
- **Enterprise Security**: Encryption, access control, and audit logging
- **Production Ready**: Monitoring, scaling, and deployment features

### Next Steps

1. **Explore the Tools**: Try each of the 5 specialized MCP tools
2. **Set Up Team Workspace**: Create shared workspaces for collaboration
3. **Configure AI Features**: Enable OpenAI and ChromaDB for advanced capabilities
4. **Monitor Performance**: Use built-in monitoring and analytics
5. **Join the Community**: Connect with other Optivise users

**Happy coding with Optivise v5.0.0!** 🚀