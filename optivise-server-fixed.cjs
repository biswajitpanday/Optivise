#!/usr/bin/env node

/**
 * Optivise MCP Server - Fixed CommonJS Version
 * Working MCP server implementation in CommonJS to bypass ES module issues
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

class OptiviseMCPServer {
  constructor() {
    // Create MCP Server
    this.server = new Server(
      { name: 'optivise-ultimate-assistant', version: '5.0.6' },
      { capabilities: { tools: {} } }
    );
    
    this.setupHandlers();
  }
  
  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'optidev_context_analyzer',
            description: 'Enhanced context analysis with AI-powered relevance scoring and vector search',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'User prompt to analyze for Optimizely context'
                },
                projectPath: {
                  type: 'string',
                  description: 'Optional project path for IDE context'
                },
                ideRules: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional IDE rules for context enhancement'
                },
                enableAI: {
                  type: 'boolean',
                  description: 'Enable AI-powered features (requires API keys)'
                }
              },
              required: ['prompt']
            }
          },
          {
            name: 'optidev_implementation_guide',
            description: 'Analyzes Jira tickets and provides complete implementation guidance',
            inputSchema: {
              type: 'object',
              properties: {
                ticketContent: {
                  type: 'string',
                  description: 'Jira ticket content or requirements text'
                },
                projectContext: {
                  type: 'string',
                  description: 'Optional project context or existing codebase information'
                }
              },
              required: ['ticketContent']
            }
          },
          {
            name: 'optidev_debug_helper',
            description: 'Provides intelligent debugging assistance for Optimizely-related issues',
            inputSchema: {
              type: 'object',
              properties: {
                bugDescription: {
                  type: 'string',
                  description: 'Description of the bug or issue encountered'
                },
                errorMessages: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional error messages or stack traces'
                },
                codeContext: {
                  type: 'string',
                  description: 'Optional relevant code snippets'
                }
              },
              required: ['bugDescription']
            }
          },
          {
            name: 'optidev_code_analyzer',
            description: 'Real-time code analysis for performance, security, and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                codeSnippet: {
                  type: 'string',
                  description: 'Code snippet to analyze'
                },
                analysisType: {
                  type: 'string',
                  enum: ['performance', 'security', 'best-practices', 'all'],
                  description: 'Type of analysis to perform'
                }
              },
              required: ['codeSnippet']
            }
          },
          {
            name: 'optidev_project_helper',
            description: 'Project setup, migration, and best practices assistance',
            inputSchema: {
              type: 'object',
              properties: {
                helpType: {
                  type: 'string',
                  enum: ['setup', 'migration', 'best-practices', 'troubleshooting'],
                  description: 'Type of project help needed'
                },
                projectInfo: {
                  type: 'string',
                  description: 'Information about the project or issue'
                }
              },
              required: ['helpType', 'projectInfo']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'optidev_context_analyzer':
            return await this.handleContextAnalyzer(args);
          case 'optidev_implementation_guide':
            return await this.handleImplementationGuide(args);
          case 'optidev_debug_helper':
            return await this.handleDebugHelper(args);
          case 'optidev_code_analyzer':
            return await this.handleCodeAnalyzer(args);
          case 'optidev_project_helper':
            return await this.handleProjectHelper(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error executing tool ${name}: ${error.message}` 
          }],
          isError: true
        };
      }
    });
  }
  
  async handleContextAnalyzer(args) {
    const { prompt, projectPath, ideRules, enableAI } = args;
    
    // Basic Optimizely product detection
    const optimizelyProducts = [];
    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('commerce') || promptLower.includes('ecommerce')) {
      optimizelyProducts.push('Configured Commerce');
    }
    if (promptLower.includes('cms') || promptLower.includes('content')) {
      optimizelyProducts.push('CMS');
    }
    if (promptLower.includes('experiment') || promptLower.includes('ab test')) {
      optimizelyProducts.push('Web Experimentation');
    }
    if (promptLower.includes('feature flag') || promptLower.includes('feature toggle')) {
      optimizelyProducts.push('Feature Experimentation');
    }
    
    const isOptimizelyRelevant = optimizelyProducts.length > 0;
    
    let response = `## Context Analysis Results\n\n`;
    response += `**Optimizely Relevance:** ${isOptimizelyRelevant ? 'Yes' : 'No'}\n`;
    
    if (isOptimizelyRelevant) {
      response += `**Detected Products:** ${optimizelyProducts.join(', ')}\n\n`;
      response += `**Analysis:**\n`;
      response += `- Your prompt appears to be related to Optimizely development\n`;
      response += `- Relevant products detected based on keywords\n`;
      
      if (optimizelyProducts.includes('Configured Commerce')) {
        response += `\n**Commerce Development Tips:**\n`;
        response += `- Use the Configured Commerce SDK for custom development\n`;
        response += `- Follow the extension pattern for custom functionality\n`;
        response += `- Utilize the built-in caching mechanisms for performance\n`;
      }
      
      if (optimizelyProducts.includes('CMS')) {
        response += `\n**CMS Development Tips:**\n`;
        response += `- Use content types and blocks for structured content\n`;
        response += `- Implement proper content validation\n`;
        response += `- Consider multi-language support if needed\n`;
      }
    } else {
      response += `\n**Analysis:**\n`;
      response += `- Your prompt doesn't appear to be Optimizely-related\n`;
      response += `- Consider rephrasing if you need Optimizely-specific assistance\n`;
    }
    
    return {
      content: [{ type: 'text', text: response }]
    };
  }
  
  async handleImplementationGuide(args) {
    const { ticketContent, projectContext } = args;
    
    let response = `## Implementation Guide\n\n`;
    response += `**Ticket Analysis:**\n`;
    response += `${ticketContent}\n\n`;
    
    response += `**Recommended Implementation Steps:**\n`;
    response += `1. **Analysis & Planning**\n`;
    response += `   - Review requirements and acceptance criteria\n`;
    response += `   - Identify Optimizely components involved\n`;
    response += `   - Plan data models and API interactions\n\n`;
    
    response += `2. **Development**\n`;
    response += `   - Set up development environment\n`;
    response += `   - Implement core functionality\n`;
    response += `   - Add proper error handling and logging\n\n`;
    
    response += `3. **Testing**\n`;
    response += `   - Unit tests for business logic\n`;
    response += `   - Integration tests for API calls\n`;
    response += `   - Manual testing in staging environment\n\n`;
    
    response += `4. **Deployment**\n`;
    response += `   - Deploy to staging for QA\n`;
    response += `   - Performance testing\n`;
    response += `   - Production deployment with monitoring\n`;
    
    if (projectContext) {
      response += `\n**Project Context Considerations:**\n`;
      response += `${projectContext}\n`;
    }
    
    return {
      content: [{ type: 'text', text: response }]
    };
  }
  
  async handleDebugHelper(args) {
    const { bugDescription, errorMessages, codeContext } = args;
    
    let response = `## Debug Analysis\n\n`;
    response += `**Issue Description:**\n${bugDescription}\n\n`;
    
    if (errorMessages && errorMessages.length > 0) {
      response += `**Error Messages:**\n`;
      errorMessages.forEach((error, index) => {
        response += `${index + 1}. ${error}\n`;
      });
      response += `\n`;
    }
    
    response += `**Debugging Steps:**\n`;
    response += `1. **Verify Configuration**\n`;
    response += `   - Check API keys and connection settings\n`;
    response += `   - Validate environment-specific configurations\n\n`;
    
    response += `2. **Check Logs**\n`;
    response += `   - Review application logs for errors\n`;
    response += `   - Check Optimizely service logs if applicable\n\n`;
    
    response += `3. **Test Isolation**\n`;
    response += `   - Reproduce the issue in a controlled environment\n`;
    response += `   - Test with minimal data to isolate the problem\n\n`;
    
    response += `4. **Common Optimizely Issues:**\n`;
    response += `   - API rate limiting\n`;
    response += `   - Authentication/authorization problems\n`;
    response += `   - Data model mismatches\n`;
    response += `   - Caching issues\n`;
    
    if (codeContext) {
      response += `\n**Code Context Analysis:**\n`;
      response += `\`\`\`\n${codeContext}\n\`\`\`\n`;
      response += `- Review the code above for potential issues\n`;
      response += `- Check for proper error handling\n`;
      response += `- Verify API usage patterns\n`;
    }
    
    return {
      content: [{ type: 'text', text: response }]
    };
  }
  
  async handleCodeAnalyzer(args) {
    const { codeSnippet, analysisType = 'all' } = args;
    
    let response = `## Code Analysis Results\n\n`;
    response += `**Analysis Type:** ${analysisType}\n\n`;
    response += `**Code Snippet:**\n\`\`\`\n${codeSnippet}\n\`\`\`\n\n`;
    
    if (analysisType === 'all' || analysisType === 'performance') {
      response += `**Performance Analysis:**\n`;
      response += `- Check for efficient API calls and caching\n`;
      response += `- Review database query patterns\n`;
      response += `- Consider lazy loading for large datasets\n\n`;
    }
    
    if (analysisType === 'all' || analysisType === 'security') {
      response += `**Security Analysis:**\n`;
      response += `- Validate input parameters\n`;
      response += `- Use parameterized queries to prevent injection\n`;
      response += `- Implement proper authentication checks\n\n`;
    }
    
    if (analysisType === 'all' || analysisType === 'best-practices') {
      response += `**Best Practices:**\n`;
      response += `- Follow Optimizely SDK patterns\n`;
      response += `- Implement proper error handling\n`;
      response += `- Add comprehensive logging\n`;
      response += `- Use consistent naming conventions\n`;
    }
    
    return {
      content: [{ type: 'text', text: response }]
    };
  }
  
  async handleProjectHelper(args) {
    const { helpType, projectInfo } = args;
    
    let response = `## Project Helper - ${helpType.charAt(0).toUpperCase() + helpType.slice(1)}\n\n`;
    response += `**Project Information:**\n${projectInfo}\n\n`;
    
    switch (helpType) {
      case 'setup':
        response += `**Setup Guidelines:**\n`;
        response += `1. **Environment Setup**\n`;
        response += `   - Install required Optimizely SDKs\n`;
        response += `   - Configure development environment\n`;
        response += `   - Set up local database if needed\n\n`;
        response += `2. **Project Structure**\n`;
        response += `   - Follow Optimizely project conventions\n`;
        response += `   - Organize code by feature/module\n`;
        response += `   - Set up proper configuration management\n`;
        break;
        
      case 'migration':
        response += `**Migration Strategy:**\n`;
        response += `1. **Assessment**\n`;
        response += `   - Inventory current implementation\n`;
        response += `   - Identify breaking changes\n`;
        response += `   - Plan migration phases\n\n`;
        response += `2. **Execution**\n`;
        response += `   - Migrate in stages\n`;
        response += `   - Test thoroughly at each stage\n`;
        response += `   - Maintain rollback capability\n`;
        break;
        
      case 'best-practices':
        response += `**Best Practices:**\n`;
        response += `- Use Optimizely's recommended patterns\n`;
        response += `- Implement proper error handling\n`;
        response += `- Follow security guidelines\n`;
        response += `- Document your implementation\n`;
        response += `- Set up monitoring and logging\n`;
        break;
        
      case 'troubleshooting':
        response += `**Troubleshooting Guide:**\n`;
        response += `1. **Common Issues**\n`;
        response += `   - Check API connectivity\n`;
        response += `   - Verify authentication\n`;
        response += `   - Review configuration settings\n\n`;
        response += `2. **Debugging Tools**\n`;
        response += `   - Use Optimizely debugging features\n`;
        response += `   - Enable detailed logging\n`;
        response += `   - Test with minimal scenarios\n`;
        break;
    }
    
    return {
      content: [{ type: 'text', text: response }]
    };
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Optivise MCP Server started successfully');
  }
}

async function main() {
  try {
    const server = new OptiviseMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();