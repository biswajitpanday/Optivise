# Optivise Installation Guide

## Quick Installation

### 1. Install via npm

```bash
# Global installation (recommended)
npm install -g optivise

# Or local installation
npm install optivise
```

### 2. Configure Your IDE

#### For Cursor IDE

Create or update your `.cursor/mcp.json` file:

**For Global Installation:**
```json
{
  "mcpServers": {
    "optivise": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/optivise/mcp-wrapper.cjs"],
      "env": {
        "OPTIDEV_DEBUG": "false",
        "LOG_LEVEL": "error",
        "NODE_OPTIONS": "--no-warnings"
      }
    }
  }
}
```

**For Local Installation:**
```json
{
  "mcpServers": {
    "optivise": {
      "command": "node",
      "args": ["./node_modules/optivise/mcp-wrapper.cjs"],
      "env": {
        "OPTIDEV_DEBUG": "false",
        "LOG_LEVEL": "error",
        "NODE_OPTIONS": "--no-warnings"
      }
    }
  }
}
```

**Find Your Global Path:**
```bash
# On macOS/Linux
npm root -g
# Output: /usr/local/lib/node_modules

# On Windows
npm root -g
# Output: C:\Users\{username}\AppData\Roaming\npm\node_modules
```

#### For VS Code

Add to your VS Code settings (`settings.json`):

```json
{
  "mcp.servers": [
    {
      "name": "optivise",
      "command": "node",
      "args": ["./node_modules/optivise/mcp-wrapper.cjs"],
      "env": {
        "OPTIDEV_DEBUG": "false",
        "LOG_LEVEL": "error"
      }
    }
  ]
}
```

### 3. Verify Installation

After restarting your IDE, you should see:
- ✅ Green MCP connection indicator
- 🛠️ 5 Optivise tools available
- 📝 Tools listed: `optidev_context_analyzer`, `optidev_implementation_guide`, `optidev_debug_helper`, `optidev_code_analyzer`, `optidev_project_helper`

### 4. Test Your Setup

Try using a tool:
```
@optidev_context_analyzer "How do I implement a custom handler chain in Optimizely Commerce?"
```

Expected: Intelligent analysis with Optimizely-specific guidance.

## Troubleshooting

### Issue: "No server info found"
- **Check Node.js version**: Must be >= 18.0.0
- **Verify file path**: Ensure the `mcp-wrapper.cjs` path is correct
- **Restart IDE**: Configuration changes require IDE restart

### Issue: Tools not available
- **Test manually**: `npx @modelcontextprotocol/inspector node ./node_modules/optivise/mcp-wrapper.cjs`
- **Check logs**: Set `"LOG_LEVEL": "debug"` temporarily
- **Verify installation**: `npm list optivise`

### Issue: Windows path problems
Use forward slashes or escape backslashes:
```json
"args": ["./node_modules/optivise/mcp-wrapper.cjs"]
// OR
"args": ["C:\\path\\to\\node_modules\\optivise\\mcp-wrapper.cjs"]
```

### Getting Help
- **GitHub Issues**: [Report a bug](https://github.com/biswajitpanday/OptiDevDoc/issues)
- **Documentation**: [User Guide](./docs/USER_GUIDE.md)
- **Discord**: [Join our community](https://discord.gg/optivise)

## What's Included

After installation, you get:
- ✅ **5 Specialized MCP Tools** for complete Optimizely development assistance
- 🔍 **Context Analysis** with Optimizely product detection
- 📋 **Implementation Guidance** for Jira tickets and requirements
- 🐛 **Debug Helper** for issue resolution
- 📊 **Code Analysis** for performance and best practices
- 🚀 **Project Helper** for setup and migration

**Ready to start? Install now and transform your Optimizely development experience!**