# Optivise - Complete User Guide
## 🚀 Ultimate Optimizely Development Assistant

Welcome to Optivise - your comprehensive AI-powered development assistant for Optimizely projects. This guide will help you get started and make the most of all the advanced features.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Installation & Setup](#installation--setup)
3. [The 5 Specialized Tools](#the-5-specialized-tools)
4. [AI-Powered Features](#ai-powered-features)
5. [Collaboration & Workspace](#collaboration--workspace)
6. [Advanced Configuration](#advanced-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## 🚀 Quick Start

### What is Optivise?

Optivise is a comprehensive MCP (Model Context Protocol) tool that provides 5 specialized development assistants specifically designed for Optimizely development. It transforms your IDE experience with AI-powered capabilities, real-time collaboration, and enterprise-grade features.

### Key Features at a Glance

- **5 Specialized MCP Tools** for every development scenario
- **AI-Powered Semantic Search** with ChromaDB and OpenAI integration
- **Real-Time Collaboration** with team workspaces
- **Enterprise Security** with encryption and access control
- **Production Infrastructure** with monitoring and auto-scaling
- **Zero-Configuration Setup** with intelligent fallbacks

---

## 🛠️ Installation & Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher (LTS recommended)
- **Supported IDEs**: Cursor IDE (primary), VS Code, or any MCP-compatible editor
- **Optional**: OpenAI API key for enhanced AI features
- **Optional**: ChromaDB server for advanced semantic search

### Step 1: Install Optivise

```bash
# Install globally via NPM
npm install -g optivise

# Or install locally in your project
npm install optivise
```

### Step 2: Configure Your IDE

#### For Cursor IDE:

1. Open Cursor settings (`Cmd/Ctrl + ,`)
2. Navigate to "Extensions" > "MCP"
3. Add the following configuration:

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

#### For VS Code:

1. Install the MCP extension from the VS Code marketplace
2. Add the Optivise configuration to your workspace settings:

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

### Step 3: Verify Installation

1. Restart your IDE
2. Open any Optimizely project
3. Try using one of the MCP tools (see [The 5 Specialized Tools](#the-5-specialized-tools))

### Step 4: Optional AI Enhancement

For enhanced AI capabilities, you can configure:

#### OpenAI Integration:
```bash
# Set your OpenAI API key (optional)
export OPENAI_API_KEY="your-api-key-here"
```

#### ChromaDB Integration:
```bash
# Start ChromaDB server (optional)
docker run -p 8000:8000 chromadb/chroma:latest
```

---

## 🧰 The 5 Specialized Tools

Optivise provides 5 specialized MCP tools, each designed for specific development scenarios:

### 1. 🎯 Context Analyzer (`optidev_context_analyzer`)

**Purpose**: AI-enhanced context analysis with intelligent product detection

**When to use**:
- General Optimizely questions
- Product identification in complex projects
- Getting contextual guidance for your current development task

**How to use**:
```
@optidev_context_analyzer "How do I implement a custom handler chain in Optimizely Commerce?"
```

**Features**:
- ✅ AI-powered relevance scoring
- ✅ Multi-product detection (11+ Optimizely products)
- ✅ Semantic search with ChromaDB
- ✅ Context-aware documentation retrieval
- ✅ Intelligent fallbacks for offline usage

### 2. 📋 Implementation Guide (`optidev_implementation_guide`)

**Purpose**: Jira ticket analysis and implementation planning

**When to use**:
- Planning implementation from Jira tickets
- Breaking down complex requirements
- Generating architecture guidance
- Creating code templates and boilerplates

**How to use**:
```
@optidev_implementation_guide "Analyze this Jira ticket: [COMMERCE-123] Implement custom product catalog with filtering and search capabilities..."
```

**Features**:
- ✅ Intelligent ticket parsing and requirement extraction
- ✅ Implementation planning with step-by-step guidance
- ✅ Architecture recommendations and patterns
- ✅ Code template generation
- ✅ Risk assessment and mitigation strategies

### 3. 🐛 Debug Helper (`optidev_debug_helper`)

**Purpose**: Intelligent bug analysis and resolution assistance

**When to use**:
- Debugging Optimizely-specific issues
- Understanding error patterns
- Getting resolution recommendations
- Learning prevention strategies

**How to use**:
```
@optidev_debug_helper "I'm getting this error in Optimizely Commerce: 'Handler chain execution failed at step ProcessCartHandler'"
```

**Features**:
- ✅ Error pattern recognition and classification
- ✅ Solution recommendation engine
- ✅ Step-by-step debugging guidance
- ✅ Prevention strategy suggestions
- ✅ Common issue database with solutions

### 4. 🔍 Code Analyzer (`optidev_code_analyzer`)

**Purpose**: Real-time code analysis and optimization

**When to use**:
- Analyzing code for performance issues
- Security vulnerability scanning
- Best practice validation
- Code optimization recommendations

**How to use**:
```
@optidev_code_analyzer "Analyze this Commerce handler code for performance and security issues: [paste your code]"
```

**Features**:
- ✅ Performance bottleneck detection
- ✅ Security vulnerability scanning
- ✅ Best practice validation
- ✅ Code optimization suggestions
- ✅ Architecture pattern recognition

### 5. 🏗️ Project Helper (`optidev_project_helper`)

**Purpose**: Project setup and migration assistance

**When to use**:
- Setting up new Optimizely projects
- Migrating between product versions
- Configuration assistance
- Best practices enforcement

**How to use**:
```
@optidev_project_helper "Help me set up a new Optimizely Commerce project with CMS integration"
```

**Features**:
- ✅ Project setup guidance and templates
- ✅ Migration planning and execution steps
- ✅ Configuration validation and recommendations
- ✅ Best practices enforcement
- ✅ Multi-product integration guidance

---

## 🤖 AI-Powered Features

### Semantic Search with ChromaDB

Optivise uses advanced vector database technology for intelligent documentation search:

**How it works**:
1. Documentation is automatically indexed using AI embeddings
2. Your queries are matched semantically, not just by keywords
3. Results are ranked by relevance and context

**Example**:
Instead of searching for exact terms, you can ask:
```
"How to handle customer data in commerce transactions?"
```
And get relevant results about GDPR compliance, data encryption, and customer management patterns.

### AI-Enhanced Context Analysis

**Intelligent Product Detection**:
- Automatically detects which Optimizely products you're working with
- Provides context-specific guidance and examples
- Handles multi-product scenarios intelligently

**Smart Documentation Retrieval**:
- Fetches the most relevant documentation snippets
- Provides up-to-date examples and code samples
- Includes best practices and common patterns

### Learning and Adaptation

**Pattern Recognition**:
- Learns from your successful interactions
- Improves recommendations over time
- Adapts to your coding style and preferences

**Privacy-First Learning**:
- All learning happens locally
- No source code is transmitted or stored
- User consent controls for all learning features

---

## 👥 Collaboration & Workspace

### Real-Time Team Collaboration

Optivise includes enterprise-grade collaboration features:

### Creating a Workspace

```javascript
// Using the collaboration service
const workspace = collaborationService.createWorkspace({
  name: "Commerce Project Team",
  description: "Shared workspace for our e-commerce implementation",
  owner: "user-id",
  isPublic: false
});
```

### Sharing Rules and Patterns

**Share Development Rules**:
```javascript
collaborationService.shareRule(workspaceId, userId, {
  name: "Commerce Handler Best Practices",
  content: "Always validate input parameters and implement proper error handling..."
});
```

**Share Learning Patterns**:
```javascript
collaborationService.sharePattern(workspaceId, userId, {
  pattern: "handler chain implementation",
  confidence: 0.95
});
```

### Real-Time Synchronization

- **Automatic Sync**: Changes are synchronized every 5 seconds
- **Conflict Resolution**: Intelligent handling of concurrent edits
- **Edit Locking**: Prevent conflicts with resource locking
- **Chat Integration**: Built-in messaging for team coordination

### Workspace Management

**Join an Existing Workspace**:
```javascript
const success = collaborationService.joinWorkspace(workspaceId, userId, username, 'editor');
```

**View Workspace Activity**:
```javascript
const events = collaborationService.getRecentEvents(workspaceId, 50);
const stats = collaborationService.getWorkspaceStats(workspaceId);
```

---

## ⚙️ Advanced Configuration

### Environment Variables

Configure Optivise behavior with environment variables:

```bash
# OpenAI Configuration
export OPENAI_API_KEY="your-api-key"
export OPENAI_MODEL="gpt-4"

# ChromaDB Configuration  
export CHROMA_HOST="localhost"
export CHROMA_PORT="8000"

# Logging Configuration
export LOG_LEVEL="info"
export LOG_FORMAT="json"

# Performance Configuration
export CACHE_TTL="900000"  # 15 minutes
export MAX_CACHE_SIZE="256"  # 256MB
```

### Advanced Caching Configuration

```javascript
// Configure specialized caches
const analysisCache = new CacheService(logger, {
  maxEntries: 5000,
  maxMemoryMB: 128,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000
});

const documentationCache = new CacheService(logger, {
  maxEntries: 10000,
  maxMemoryMB: 256,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 30 * 60 * 1000
});
```

### Security Configuration

```javascript
// Configure security service
const securityService = new SecurityService(logger, {
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
});
```

### Monitoring and Analytics

```javascript
// Configure monitoring
const monitoringService = new MonitoringService(logger, 24); // 24-hour retention

// Add custom alert rules
monitoringService.addAlertRule({
  id: 'custom_response_time',
  name: 'Custom Response Time Alert',
  condition: (metrics) => {
    const recent = metrics.filter(m => 
      m.metric === 'response_time' && 
      Date.now() - m.timestamp < 5 * 60 * 1000
    );
    return recent.length > 0 && recent.reduce((sum, m) => sum + m.value, 0) / recent.length > 1000;
  },
  severity: 'high',
  enabled: true,
  cooldown: 300
});
```

---

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. MCP Connection Issues

**Problem**: IDE doesn't recognize Optivise tools
**Solution**:
```bash
# Verify installation
npm list -g optivise

# Check MCP configuration
optivise --verify-mcp

# Restart IDE and try again
```

#### 2. AI Features Not Working

**Problem**: AI-powered features are disabled
**Solutions**:

**Check OpenAI Configuration**:
```bash
# Verify API key
echo $OPENAI_API_KEY

# Test OpenAI connection
optivise --test-openai
```

**Check ChromaDB Connection**:
```bash
# Verify ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Test ChromaDB connection
optivise --test-chromadb
```

#### 3. Performance Issues

**Problem**: Slow response times
**Solutions**:

**Check Cache Status**:
```javascript
const cacheStats = cacheService.getStats();
console.log('Hit rate:', cacheStats.hitRate);
console.log('Memory usage:', cacheStats.memoryUsage);
```

**Monitor Performance**:
```javascript
const report = monitoringService.generateReport(24);
console.log('Average response time:', report.performance.avgResponseTime);
```

#### 4. Collaboration Issues

**Problem**: Workspace synchronization failing
**Solutions**:

**Check Workspace Status**:
```javascript
const workspace = collaborationService.getWorkspace(workspaceId);
const session = collaborationService.getSession(workspaceId);
```

**Debug Sync Events**:
```javascript
const events = collaborationService.getRecentEvents(workspaceId, 100);
console.log('Recent sync events:', events);
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Enable debug logging
export LOG_LEVEL="debug"

# Run with debug output
optivise mcp --debug
```

### Health Checks

Run comprehensive health checks:

```bash
# Check all system components
optivise --health-check

# Check specific services
optivise --check-ai-services
optivise --check-cache-status
optivise --check-security-status
```

---

## 📚 Best Practices

### 1. Tool Usage Patterns

**Use the Right Tool for the Job**:

- **Planning Phase**: Use `optidev_implementation_guide` for requirement analysis
- **Development Phase**: Use `optidev_context_analyzer` for context-specific guidance
- **Code Review Phase**: Use `optidev_code_analyzer` for quality analysis
- **Debugging Phase**: Use `optidev_debug_helper` for issue resolution
- **Setup Phase**: Use `optidev_project_helper` for configuration assistance

**Combine Tools Effectively**:
```
# Start with planning
@optidev_implementation_guide "Analyze requirements for customer registration feature"

# Get specific implementation context  
@optidev_context_analyzer "Best practices for Commerce customer management"

# Analyze your implementation
@optidev_code_analyzer "Review this customer registration handler code"

# Debug any issues
@optidev_debug_helper "Customer registration validation is failing"
```

### 2. AI Feature Optimization

**Optimize for AI Performance**:

- **Be Specific**: Provide detailed context in your queries
- **Use Examples**: Include code snippets when asking for analysis
- **Iterate**: Build on previous responses for complex scenarios
- **Cache Wisely**: Frequently used patterns are cached automatically

**Example of Good AI Interaction**:
```
@optidev_context_analyzer "I'm working on an Optimizely Commerce B2B project where we need to implement custom pricing rules based on customer segments and product categories. The system should support volume discounts and promotional campaigns. What's the recommended architecture pattern?"
```

### 3. Team Collaboration Best Practices

**Workspace Organization**:

- **Name Clearly**: Use descriptive workspace names
- **Set Permissions**: Configure appropriate access levels
- **Share Actively**: Share successful patterns with the team
- **Document Decisions**: Use collaborative notes for important decisions

**Rule Sharing Guidelines**:

```javascript
// Good: Specific, actionable rule
collaborationService.shareRule(workspaceId, userId, {
  name: "Commerce Error Handling Pattern",
  content: `
    Always implement error handling in Commerce handlers:
    1. Validate input parameters
    2. Use try-catch blocks
    3. Log errors with context
    4. Return meaningful error responses
    
    Example: [include code example]
  `
});

// Avoid: Vague, non-actionable rule
collaborationService.shareRule(workspaceId, userId, {
  name: "Handle errors",
  content: "Make sure to handle errors properly"
});
```

### 4. Security Best Practices

**API Key Management**:
- Use environment variables for API keys
- Never commit API keys to version control
- Rotate keys regularly
- Monitor API key usage via audit logs

**Data Privacy**:
- Review privacy settings regularly
- Enable only necessary learning features
- Use local-first configurations when possible
- Regularly audit data retention settings

**Access Control**:
```javascript
// Configure role-based access
const session = securityService.createSession(userId, [
  'workspace:read',
  'workspace:write',
  'rules:share',
  'analytics:view'
], {
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### 5. Performance Optimization

**Caching Strategy**:
- Use appropriate TTL values for different content types
- Monitor cache hit rates and adjust configurations
- Clear caches when underlying data changes
- Use specialized caches for different use cases

**Resource Management**:
```javascript
// Monitor resource usage
const status = deploymentService.getInfrastructureStatus();
if (status.averageMemory > 80) {
  // Consider scaling up or optimizing memory usage
  console.warn('High memory usage detected:', status.averageMemory);
}
```

**Query Optimization**:
- Be specific in your queries to get better results
- Use context from previous interactions
- Batch related questions when possible
- Take advantage of semantic search capabilities

---

## 🎯 Next Steps

### Getting the Most from Optivise

1. **Start Simple**: Begin with basic tool usage and gradually explore advanced features
2. **Configure AI**: Set up OpenAI and ChromaDB for enhanced capabilities
3. **Enable Collaboration**: Create team workspaces for shared development
4. **Monitor Performance**: Use built-in monitoring to optimize your setup
5. **Share Knowledge**: Contribute patterns and rules to help your team

### Community and Support

- **GitHub Repository**: [Report issues and contribute](https://github.com/optimizely/optivise)
- **Documentation**: [Complete technical documentation](https://docs.optivise.dev)
- **Community Forum**: [Join the developer community](https://community.optivise.dev)
- **Updates**: Follow [@OptiviseAI](https://twitter.com/OptiviseAI) for updates

### Advanced Use Cases

As you become more comfortable with Optivise, explore these advanced scenarios:

- **Multi-Product Integration**: Use Optivise across Commerce + CMS + Experimentation projects
- **Team Onboarding**: Create structured learning paths for new team members
- **Quality Gates**: Integrate code analysis into your CI/CD pipeline
- **Documentation Generation**: Use AI features to generate project documentation
- **Performance Monitoring**: Set up alerting for development team productivity metrics

---

**Welcome to the future of Optimizely development with Optivise!** 🚀

*Need help? Check our [troubleshooting section](#troubleshooting) or reach out to the community.*