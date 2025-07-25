# OptiDevDoc MCP Server

An MCP (Model Context Protocol) server that provides real-time Optimizely documentation access to AI coding assistants. **Successfully deployed and ready for team use!**

## 🎉 **Live Deployment**
- **Server**: [https://optidevdoc.onrender.com/](https://optidevdoc.onrender.com/)
- **Repository**: [https://github.com/biswajitpanday/OptiDevDoc](https://github.com/biswajitpanday/OptiDevDoc)
- **Status**: ✅ **PRODUCTION READY & VERIFIED WORKING**


## 🏗️ Architecture Diagram

![High-Level Architecture](https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/assets/OptiDevDoc_Arch_1.svg)


## 🛠️ **How It Works**

<div align="center">
  <img src="https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/assets/How_it_works.svg" alt="How it works" height="500"/>
</div>


## 🚀 **Quick Setup for New Users**

### **Step 1: Download the Remote Client**
```bash
# Download the MCP bridge client
curl -O https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/optidevdoc-remote.js
```

### **Step 2: Configure Your IDE**

#### **For Cursor IDE (Verified Working)**
Add this to your MCP settings (`~/.cursor/mcp.json` or Cursor Settings):

**Option A: Using Absolute Path (Recommended)**
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

**Option B: Using Working Directory**
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": ["optidevdoc-remote.js"],
      "cwd": "/path/to/downloaded/file/directory",
      "env": {
        "DEBUG_MCP": "false"
      }
    }
  }
}
```

**Windows Example (Tested & Working)**:
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": ["C:\\D:\\RND\\MCPs\\OptiDevDoc\\optidevdoc-remote.js"],
      "env": {
        "DEBUG_MCP": "false"
      }
    }
  }
}
```

#### **For VS Code**
Use the REST Client extension:
```http
### Search Optimizely Documentation
POST https://optidevdoc.onrender.com/api/search
Content-Type: application/json

{
  "query": "custom price calculator",
  "product": "configured-commerce",
  "maxResults": 5
}
```

### **Step 3: Restart Your IDE**
- **Cursor**: Completely close and reopen Cursor IDE
- **Wait**: Allow 30-60 seconds for the remote server to wake up from idle state
- **Verify**: You should see "optidevdoc" showing **green** with "1 tool enabled"

## 🎯 **Usage Examples**

Once configured, you can use these prompts in your AI coding assistant:

### **Optimizely B2B Commerce Questions**
```
"How do I implement a custom price calculator in Optimizely B2B Commerce?"

"Show me the API structure for Optimizely CMS content delivery"

"What are the checkout flow options in Optimizely Commerce?"
```

### **Direct Tool Usage**
The MCP tool `search_optimizely_docs` will be available with parameter:
- `query`: Your search terms (e.g., "pricing calculator", "CMS API")

## 📊 **Server Status & Monitoring**

### **Health Check**
```bash
curl https://optidevdoc.onrender.com/health
```

### **API Documentation**
```bash
curl https://optidevdoc.onrender.com/api/docs
```

### **Direct API Usage**
```bash
curl -X POST https://optidevdoc.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "pricing calculator"}'
```

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

#### **Red Status in Cursor IDE**
- ✅ **Use absolute file paths** in `args` (most reliable)
- ✅ **Restart Cursor completely** (close and reopen)
- ✅ **Wait for server wake-up** (30-60 seconds)
- ✅ **Check file permissions** (ensure Node.js can execute the file)

#### **"0 tools enabled" or Connection Issues**
- ✅ **Verify Node.js** is installed and accessible via `node` command
- ✅ **Test the client manually**:
  ```bash
  echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node optidevdoc-remote.js
  ```
- ✅ **Check network connectivity** to https://optidevdoc.onrender.com/

#### **Server Timeout Issues**
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

## 🏗️ **Technical Architecture**

### **Component Overview**
1. **Remote HTTP Server** - Deployed on Render.com
2. **MCP Bridge Client** - Local Node.js script (`optidevdoc-remote.js`)
3. **IDE Integration** - MCP protocol communication
4. **Documentation API** - RESTful search endpoint

### **Data Flow**
```
IDE → MCP Protocol → Bridge Client → HTTPS → Remote Server → Documentation Search → Response
```

### **Key Features**
- ✅ **Zero Local Setup** - No database or complex installation
- ✅ **Team Ready** - Share one file for instant access
- ✅ **Real-time Updates** - Server can be updated without client changes
- ✅ **Cross-Platform** - Works on Windows, macOS, Linux
- ✅ **Multiple IDEs** - MCP protocol support across tools

## 🚀 **For Developers**

### **Local Development**
```bash
# Clone repository
git clone https://github.com/biswajitpanday/OptiDevDoc.git
cd OptiDevDoc

# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production
npm run build
```

### **Extending Documentation**
The server uses a modular approach for adding new documentation sources:
- Add new data files to `src/data/`
- Update search algorithms in `src/search/`
- Extend API endpoints in `src/server/`

### **Contributing**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 **Project Resources**

- **[Architecture Documentation](Resources/ARCHITECTURE.md)** - Technical details
- **[Deployment Guide](Resources/DEPLOYMENT_PLAN.md)** - Server setup and deployment
- **[Task List](Resources/TASK_LIST.md)** - Project completion status

## 📞 **Support**

For issues or questions:
1. **Check the troubleshooting section** above
2. **Test the remote server** at https://optidevdoc.onrender.com/
3. **Verify your MCP configuration** matches the examples
4. **Open an issue** on GitHub if problems persist

---

**OptiDevDoc** - Bringing Optimizely documentation directly to your AI coding assistant! 🚀 