# OptiDevDoc - Deployment Guide

## 🎯 **Overview**

This guide covers **deployment and configuration** for both OptiDevDoc modes:

1. **🌐 Remote Mode**: Zero-setup via cloud deployment
2. **📦 NPM Mode**: Local installation with full features

---

## 🌐 **Remote Mode Deployment**

### **For End Users (Team Setup)**

#### **Step 1: Download MCP Bridge**
```bash
# Download the MCP bridge file
curl -o optidevdoc-remote.js https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/optidevdoc-remote.js

# Or using wget
wget https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/optidevdoc-remote.js
```

#### **Step 2: Configure Cursor IDE**
Add to your Cursor IDE MCP settings:

```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": ["/absolute/path/to/optidevdoc-remote.js"],
      "env": {
        "DEBUG_MCP": "false"
      }
    }
  }
}
```

**Location**: 
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\config.json`
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/config.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/cursor.mcp/config.json`

#### **Step 3: Verify Setup**
1. Restart Cursor IDE
2. Look for **"3 tools enabled"** in green status
3. Test with: *"How do I implement custom pricing in Optimizely?"*

### **For Server Administrators (Cloud Deployment)**

#### **Step 1: Fork & Configure Repository**
```bash
# Fork the repository
git clone https://github.com/biswajitpanday/OptiDevDoc.git
cd OptiDevDoc

# Configure for your organization (optional)
# Edit src/config/default.ts for custom settings
```

#### **Step 2: Deploy to Render.com**
1. **Create Render Account**: Sign up at [render.com](https://render.com)
2. **Connect Repository**: Link your GitHub fork
3. **Configure Service**:
   ```yaml
   # render.yaml configuration
   services:
     - type: web
       name: optidevdoc-mcp
       env: node
       buildCommand: npm install && npm run build
       startCommand: node index.js
       plan: free
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 10000
   ```

#### **Step 3: Verify Deployment**
```bash
# Test the deployed server
curl https://your-app-name.onrender.com/health

# Expected response:
{
  "status": "healthy",
  "version": "2.0.0",
  "uptime": 12345,
  "features": ["search", "patterns", "bug-analysis"]
}
```

#### **Step 4: Update Bridge URL (if custom domain)**
If using custom domain, update `optidevdoc-remote.js`:
```javascript
// Change this line:
const SERVER_URL = 'https://optidevdoc.onrender.com';
// To your custom domain:
const SERVER_URL = 'https://your-custom-domain.com';
```

---

## 📦 **NPM Mode Deployment**

### **For End Users (Local Installation)**

#### **Step 1: Install Package**
```bash
# Install globally
npm install -g optidevdoc

# Verify installation
optidevdoc version
# Expected: OptiDevDoc v2.0.1
```

#### **Step 2: Initial Setup**
```bash
# Run interactive setup
optidevdoc setup

# This will:
# 1. Create ~/.optidevdoc/config.json
# 2. Download initial patterns
# 3. Configure default settings
```

#### **Step 3: Configure IDE**
Add to your Cursor IDE MCP settings:

```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "optidevdoc",
      "args": ["mcp"]
    }
  }
}
```

#### **Step 4: Start Local Server**
```bash
# Start enhanced MCP server
optidevdoc mcp

# Alternative: Start with debug mode
DEBUG_MCP=true optidevdoc mcp

# Server will start on localhost with full features
```

### **For NPM Publishers (Package Deployment)**

#### **Step 1: Prepare Package**
```bash
# Clone and prepare
git clone https://github.com/biswajitpanday/OptiDevDoc.git
cd OptiDevDoc

# Install dependencies
npm install

# Build for production
npm run build

# Test package locally
npm pack
npm install -g ./optidevdoc-*.tgz
```

#### **Step 2: Publish to NPM**
```bash
# Login to npm (requires npm account)
npm login

# Publish package
npm publish

# Or publish beta version
npm publish --tag beta
```

#### **Step 3: Version Management**
```bash
# Update version
npm version patch   # 2.0.1 → 2.0.2
npm version minor   # 2.0.1 → 2.1.0  
npm version major   # 2.0.1 → 3.0.0

# Publish new version
npm publish
```

---

## ⚙️ **IDE Configuration Details**

### **Cursor IDE Setup**

#### **Method 1: Global Settings**
1. Open Cursor IDE
2. Go to **Settings** → **MCP** 
3. Add new server configuration
4. Use configurations from above

#### **Method 2: Project-specific**
Create `.cursor/mcp-config.json` in your project:
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "optidevdoc",
      "args": ["mcp"]
    }
  }
}
```

### **VS Code Setup**

#### **Using REST Client Extension**
Install REST Client extension and create `optidevdoc.http`:

```http
### Test Documentation Search
POST https://optidevdoc.onrender.com/api/search
Content-Type: application/json

{
  "query": "pricing handler implementation",
  "product": "configured-commerce"
}

### Find Patterns
POST https://optidevdoc.onrender.com/api/patterns
Content-Type: application/json

{
  "scenario": "implement custom checkout validation",
  "product": "configured-commerce"
}
```

#### **Using MCP Extension (Future)**
When VS Code MCP extension is available:
```json
{
  "mcp.servers": {
    "optidevdoc": {
      "command": "optidevdoc",
      "args": ["mcp"]
    }
  }
}
```

### **Other IDEs**

#### **Any IDE with HTTP Support**
Use direct HTTP calls to the API:
```bash
# Documentation search
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pricing patterns"}'

# Pattern analysis  
curl -X POST https://optidevdoc.onrender.com/api/patterns \
  -H "Content-Type: application/json" \
  -d '{"scenario": "custom tax calculation"}'
```

---

## 🔧 **Configuration Options**

### **Remote Mode Configuration**

#### **Environment Variables**
```bash
# For bridge client
export DEBUG_MCP=true                    # Enable debug logging
export OPTIDEVDOC_SERVER=https://...     # Custom server URL
export OPTIDEVDOC_TIMEOUT=15000          # Request timeout (ms)
```

#### **Custom Bridge Configuration**
Edit `optidevdoc-remote.js` for customization:
```javascript
// Configuration section at top of file
const CONFIG = {
  serverUrl: 'https://optidevdoc.onrender.com',
  timeout: 15000,
  retries: 3,
  debugMode: false
};
```

### **NPM Mode Configuration**

#### **Configuration File (`~/.optidevdoc/config.json`)**
```json
{
  "server": {
    "port": 3000,
    "host": "localhost",
    "timeout": 30000
  },
  "crawler": {
    "enabled": true,
    "interval_hours": 24,
    "max_concurrency": 3
  },
  "database": {
    "type": "sqlite",
    "path": "~/.optidevdoc/patterns.db",
    "cache_size": 1000
  },
  "ai": {
    "enabled": true,
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "local_only": true
  },
  "logging": {
    "level": "info",
    "file": "~/.optidevdoc/logs/optidevdoc.log"
  }
}
```

#### **Command Line Options**
```bash
# Override config with CLI flags
optidevdoc mcp --port 3001 --debug --no-ai

# Available flags:
--port <number>      # Server port
--host <string>      # Server host
--debug              # Enable debug mode
--no-ai              # Disable AI features
--no-crawler         # Disable documentation crawler
--config <path>      # Custom config file path
```

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **Issue: "0 tools enabled" in Cursor**
**Symptoms**: Red status, no tools available
**Solutions**:
1. Check file path is absolute
2. Verify Node.js is installed
3. Test bridge manually: `node optidevdoc-remote.js`
4. Enable debug mode: `"DEBUG_MCP": "true"`

#### **Issue: NPM installation fails**
**Symptoms**: Permission errors, missing dependencies
**Solutions**:
```bash
# Permission fix (macOS/Linux)
sudo npm install -g optidevdoc

# Node version check
node --version  # Should be >= 18.0.0

# Clear npm cache
npm cache clean --force
```

#### **Issue: Server connection timeout**
**Symptoms**: Slow responses, timeout errors
**Solutions**:
1. Check internet connection
2. Server might be sleeping (first request wakes it)
3. Try direct server test: `curl https://optidevdoc.onrender.com/health`
4. Switch to NPM mode for local processing

#### **Issue: Patterns not updating**
**Symptoms**: Outdated results, missing new patterns
**Solutions**:
```bash
# NPM mode: Refresh patterns
optidevdoc refresh

# Remote mode: Server auto-updates every 24h
# Manual refresh via API:
curl -X POST https://optidevdoc.onrender.com/api/refresh
```

### **Debug Mode**

#### **Enable Debug Logging**
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "optidevdoc",
      "args": ["mcp"],
      "env": {
        "DEBUG_MCP": "true"
      }
    }
  }
}
```

#### **View Debug Output**
- **Cursor**: View → Output → MCP Logs
- **NPM Mode**: Check `~/.optidevdoc/logs/optidevdoc.log`
- **Terminal**: Run `optidevdoc mcp --debug` directly

---

## 📊 **Performance Optimization**

### **Remote Mode Optimization**
```bash
# Keep server warm (prevents cold starts)
# Add to cron job (every 25 minutes):
*/25 * * * * curl -s https://optidevdoc.onrender.com/health >/dev/null
```

### **NPM Mode Optimization**
```json
// ~/.optidevdoc/config.json
{
  "performance": {
    "cache_enabled": true,
    "cache_ttl_hours": 24,
    "max_memory_mb": 512,
    "background_updates": true
  }
}
```

---

## 🔒 **Security Considerations**

### **Remote Mode Security**
- ✅ HTTPS encryption for all communication
- ✅ No authentication required (public documentation)
- ✅ Rate limiting to prevent abuse
- ⚠️ Queries are logged (no sensitive data recommended)

### **NPM Mode Security**
- ✅ All processing happens locally
- ✅ No data sent to external servers
- ✅ Standard Node.js file permissions
- ✅ Only outbound connections for documentation updates

---

## 🚀 **Production Deployment Checklist**

### **Remote Mode Checklist**
- [ ] Repository forked and configured
- [ ] Render.com account set up
- [ ] Service deployed and healthy
- [ ] Custom domain configured (optional)
- [ ] Bridge file distributed to team
- [ ] IDE configurations tested
- [ ] Health monitoring set up

### **NPM Mode Checklist**
- [ ] Package built and tested
- [ ] NPM account configured
- [ ] Package published to registry
- [ ] Installation tested on multiple platforms
- [ ] Configuration templates created
- [ ] Documentation updated
- [ ] Team training completed

This deployment guide provides complete instructions for both deployment modes, ensuring teams can choose the option that best fits their needs and infrastructure requirements. 