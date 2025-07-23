# OptiDevDoc - Team Setup Guide

## 🎯 **2-Minute Setup for Any Developer**

### **Step 1: Download the Client**
```bash
curl -O https://raw.githubusercontent.com/biswajitpanday/OptiDevDoc/master/optidevdoc-remote.js
```

Or manually download: [optidevdoc-remote.js](https://github.com/biswajitpanday/OptiDevDoc/blob/master/optidevdoc-remote.js)

### **Step 2: Add to Cursor MCP Settings**
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "node",
      "args": ["optidevdoc-remote.js"],
      "cwd": "/path/to/where/you/downloaded/the/file"
    }
  }
}
```

### **Step 3: Test It**
Ask in Cursor: *"How do I implement custom pricing in Optimizely Commerce?"*

---

## 🌐 **Alternative: NPM Global Install (Coming Soon)**

```bash
npm install -g optidevdoc-mcp
```

Then use:
```json
{
  "mcpServers": {
    "optidevdoc": {
      "command": "optidevdoc-mcp"
    }
  }
}
```

---

## 🔧 **For VS Code Users**

**Option 1: Direct API Calls**
```javascript
// Install REST Client extension, then use:
POST https://optidevdoc.onrender.com/api/search
Content-Type: application/json

{
  "query": "pricing calculator",
  "maxResults": 5
}
```

**Option 2: Same MCP Setup**
Use the same `optidevdoc-remote.js` configuration as Cursor.

---

## 📋 **Working Examples**

Try these prompts:
- "Show me Optimizely pricing examples"
- "How do I use the CMS Content Delivery API?"
- "What's the authentication for Optimizely APIs?"

---

## 🚨 **Troubleshooting**

### ❌ "File not found"
- Make sure the path in `cwd` points to where you downloaded `optidevdoc-remote.js`
- Use absolute paths: `"cwd": "C:/Users/YourName/Downloads"`

### ❌ "No response"
- First request takes 30-60 seconds (server wake-up)
- Check: `curl https://optidevdoc.onrender.com/health`

### ❌ "No results"
- Current version has mock data
- Try: "pricing", "calculator", "api", "commerce"

---

**🎉 That's it!** You're now connected to the remote OptiDevDoc server. 