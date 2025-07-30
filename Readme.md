# OptiDevDoc

Intelligent Optimizely development assistant with product-aware rules, pattern analysis, bug resolution, and comprehensive documentation search.

## Features

- **Product-Aware Intelligence**: Automatic detection of Commerce vs CMS vs Experimentation with perfect rule isolation
- **Development Tools**: Documentation search, pattern analysis, bug resolution, and development rules
- **Multi-Deployment Support**: NPM package for full features, remote server for zero setup
- **Integration Features**: Cursor IDE integration via MCP protocol, CLI interface, HTTP API

## Installation

### NPM Package (Recommended for Developers)

Install globally to use as a CLI tool and MCP server:

```bash
npm install -g optidevdoc
```

Or install locally in your project:

```bash
npm install --save-dev optidevdoc
```

### Remote Mode (Zero Setup for Teams)

For teams that want a centralized deployment with zero local setup, use the remote mode:

1. Deploy to Render.com using the included `render.yaml` configuration
2. Configure Cursor IDE to use the remote server

## Usage

### NPM Mode

Start the MCP server:

```bash
optidevdoc mcp
```

Use the CLI commands:

```bash
# Detect Optimizely product in current directory
optidevdoc detect

# Start HTTP server on port 3001
optidevdoc serve --port 3001

# Generate Cursor IDE configuration
optidevdoc setup

# Show version information
optidevdoc version
```

### Remote Mode

Configure Cursor IDE to use the remote server by adding the following to your Cursor settings:

```json
"modelContextProtocol.tools": [
  {
    "name": "optidevdoc",
    "command": "node",
    "args": ["path/to/optidevdoc-remote.js"]
  }
]
```

## Configuration

OptiDevDoc uses a centralized configuration system that loads settings from environment variables and configuration files.

### Environment Variables

Create a `.env` file or use environment variables to configure OptiDevDoc:

```
# Server Configuration
NODE_ENV=development
PORT=10000
HOST=localhost

# Feature Flags
ENABLE_PRODUCT_DETECTION=true
ENABLE_ENHANCED_RULES=true
ENABLE_CORS=true
OPTIDEVDOC_ENHANCED=true
OPTIDEVDOC_MULTI_PRODUCT=true
OPTIDEVDOC_DEBUG=false

# MCP Configuration
MCP_MODE=stdio
OPTIDEVDOC_MODE=enhanced
OPTIDEVDOC_SERVER_MODE=http
```

### Configuration Files

OptiDevDoc supports configuration files in the `config/` directory:

- `config/default.env`: Default configuration for all environments
- `config/development.env`: Development environment configuration
- `config/production.env`: Production environment configuration

The configuration system loads environment variables in the following order (later sources override earlier ones):

1. `.env` file in the project root
2. `config/{NODE_ENV}.env` file (e.g., `config/development.env`, `config/production.env`)
3. `config/default.env` (fallback)

## Deployment

### Render.com Deployment

1. Fork this repository
2. Create a new Web Service on Render.com
3. Select "Deploy from GitHub"
4. Connect your forked repository
5. Render will automatically use the `render.yaml` configuration

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file or use `config/default.env`
4. Start the development server: `npm run dev`

## License

MIT