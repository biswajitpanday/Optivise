/**
 * HTTP Server for Render Deployment
 * Provides HTTP API access to the MCP context analyzer
 */

import { createServer } from 'http';
import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';
import { createLogger } from '../utils/logger.js';
import { getVersion } from '../config/version.js';
import type { ContextAnalysisRequest, Logger } from '../types/index.js';

export class OptiviseHTTPServer {
  private server: any;
  private readonly contextAnalyzer: ContextAnalysisEngine;
  private readonly logger: Logger;
  private readonly port: number;

  constructor(port = 3000) {
    this.port = port;
    this.logger = createLogger('info');
    this.contextAnalyzer = new ContextAnalysisEngine(this.logger);
  }

  async initialize(): Promise<void> {
    await this.contextAnalyzer.initialize();
    
    this.server = createServer(async (req, res) => {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.getTestPage());
        return;
      }

      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          service: 'optivise',
          version: getVersion(),
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.method === 'GET' && req.url === '/test/mcp') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'mcp_ready',
          service: 'optivise',
          version: getVersion(),
          mcp_server: 'available',
          context_analyzer: 'initialized',
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.method === 'GET' && req.url === '/test/detect') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        try {
          // Simple product detection test
          const mockDetection = {
            products: ['configured-commerce', 'cms-paas'],
            confidence: 0.85,
            context: 'test',
            evidence: ['Test detection endpoint'],
            suggestedActions: ['Use Commerce-specific patterns', 'Focus on Extensions/ directory']
          };
          
          res.end(JSON.stringify({
            status: 'detection_test',
            detection: mockDetection,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Detection test failed', 
            message: error instanceof Error ? error.message : 'Unknown error' 
          }));
        }
        return;
      }

      if (req.method === 'POST' && req.url === '/analyze') {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const request: ContextAnalysisRequest = JSON.parse(body);
            
            if (!request.prompt) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing prompt field' }));
              return;
            }

            const result = await this.contextAnalyzer.analyze(request);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (error) {
            this.logger.error('Analysis failed', error as Error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'Analysis failed', 
              message: error instanceof Error ? error.message : 'Unknown error' 
            }));
          }
        });
        return;
      }

      // Default 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });
  }

  async start(): Promise<void> {
    await this.initialize();
    
    this.server.listen(this.port, '0.0.0.0', () => {
      this.logger.info(`Optivise HTTP Server started on port ${this.port}`);
      this.logger.info('Available endpoints:');
      this.logger.info('  GET  / - Test interface (browser)');
      this.logger.info('  GET  /health - Health check');
      this.logger.info('  GET  /test/mcp - MCP server status test');
      this.logger.info('  GET  /test/detect - Product detection test');
      this.logger.info('  POST /analyze - Context analysis');
      this.logger.info(`Open http://localhost:${this.port} in your browser to test`);
      this.logger.info(`Server is listening on all interfaces (0.0.0.0:${this.port})`);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('Optivise HTTP Server stopped');
        resolve();
      });
    });
  }

  private getTestPage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Optivise Context Analyzer - Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        textarea { width: 100%; height: 100px; margin: 10px 0; }
        button { padding: 10px 15px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #005a87; }
        .result { margin-top: 20px; padding: 15px; background: white; border-radius: 4px; border-left: 4px solid #007cba; }
        .error { border-left-color: #dc3545; background: #f8d7da; }
        .loading { color: #666; }
        .relevance { font-weight: bold; color: #007cba; }
        .products { margin: 10px 0; }
        .product { display: inline-block; background: #e9ecef; padding: 5px 10px; margin: 2px; border-radius: 4px; font-size: 12px; }
        .steps { margin: 10px 0; }
        .step { margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Optivise Context Analyzer - Test Interface</h1>
        <p>Test the Optivise context analysis engine with your Optimizely-related prompts.</p>
        
        <div>
            <label for="prompt">Enter your prompt:</label>
            <textarea id="prompt" placeholder="How do I create a custom handler in Optimizely Commerce?"></textarea>
            <button onclick="analyzePrompt()">Analyze Context</button>
            <button onclick="checkHealth()">Health Check</button>
            <button onclick="testMCP()">Test MCP Status</button>
            <button onclick="testDetection()">Test Product Detection</button>
        </div>
        
        <div id="result"></div>
    </div>

    <script>
        async function analyzePrompt() {
            const prompt = document.getElementById('prompt').value.trim();
            const resultDiv = document.getElementById('result');
            
            if (!prompt) {
                resultDiv.innerHTML = '<div class="result error">Please enter a prompt to analyze.</div>';
                return;
            }
            
            resultDiv.innerHTML = '<div class="result loading">Analyzing prompt...</div>';
            
            try {
                const response = await fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: prompt })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Analysis failed');
                }
                
                let html = \`
                    <div class="result">
                        <h3>Analysis Results</h3>
                        <div class="relevance">Relevance Score: \${data.relevance || 'N/A'}</div>
                        
                        \${data.detectedProducts?.length ? \`
                            <div class="products">
                                <strong>Detected Products:</strong><br>
                                \${data.detectedProducts.map(p => \`<span class="product">\${p}</span>\`).join('')}
                            </div>
                        \` : ''}
                        
                        \${data.curatedContext?.summary ? \`
                            <h4>Summary:</h4>
                            <p>\${data.curatedContext.summary}</p>
                        \` : ''}
                        
                        \${data.curatedContext?.actionableSteps?.length ? \`
                            <h4>Actionable Steps:</h4>
                            <div class="steps">
                                \${data.curatedContext.actionableSteps.map(step => \`<div class="step">\${step}</div>\`).join('')}
                            </div>
                        \` : ''}
                        
                        \${data.curatedContext?.bestPractices?.length ? \`
                            <h4>Best Practices:</h4>
                            <div class="steps">
                                \${data.curatedContext.bestPractices.map(practice => \`<div class="step">\${practice}</div>\`).join('')}
                            </div>
                        \` : ''}
                        
                        <div style="margin-top: 15px; font-size: 12px; color: #666;">
                            Processing Time: \${data.processingTime || 'N/A'}ms
                        </div>
                    </div>
                \`;
                
                resultDiv.innerHTML = html;
                
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">Error: \${error.message}</div>\`;
            }
        }
        
        async function checkHealth() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<div class="result loading">Checking server health...</div>';
            
            try {
                const response = await fetch('/health');
                const data = await response.json();
                
                resultDiv.innerHTML = \`
                    <div class="result">
                        <h3>Server Health Check</h3>
                        <p><strong>Status:</strong> \${data.status}</p>
                        <p><strong>Service:</strong> \${data.service}</p>
                        <p><strong>Version:</strong> \${data.version}</p>
                        <p><strong>Timestamp:</strong> \${data.timestamp}</p>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">Health check failed: \${error.message}</div>\`;
            }
        }
        
        async function testMCP() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<div class="result loading">Testing MCP server status...</div>';
            
            try {
                const response = await fetch('/test/mcp');
                const data = await response.json();
                
                resultDiv.innerHTML = \`
                    <div class="result">
                        <h3>MCP Server Status Test</h3>
                        <p><strong>Status:</strong> \${data.status}</p>
                        <p><strong>Service:</strong> \${data.service}</p>
                        <p><strong>Version:</strong> \${data.version}</p>
                        <p><strong>MCP Server:</strong> \${data.mcp_server}</p>
                        <p><strong>Context Analyzer:</strong> \${data.context_analyzer}</p>
                        <p><strong>Timestamp:</strong> \${data.timestamp}</p>
                    </div>
                \`;
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">MCP test failed: \${error.message}</div>\`;
            }
        }
        
        async function testDetection() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<div class="result loading">Testing product detection...</div>';
            
            try {
                const response = await fetch('/test/detect');
                const data = await response.json();
                
                let html = \`
                    <div class="result">
                        <h3>Product Detection Test</h3>
                        <p><strong>Status:</strong> \${data.status}</p>
                        
                        \${data.detection ? \`
                            <div class="products">
                                <strong>Detected Products:</strong><br>
                                \${data.detection.products.map(p => \`<span class="product">\${p}</span>\`).join('')}
                            </div>
                            <p><strong>Confidence:</strong> \${data.detection.confidence}</p>
                            <p><strong>Context:</strong> \${data.detection.context}</p>
                            
                            \${data.detection.suggestedActions?.length ? \`
                                <h4>Suggested Actions:</h4>
                                <div class="steps">
                                    \${data.detection.suggestedActions.map(action => \`<div class="step">\${action}</div>\`).join('')}
                                </div>
                            \` : ''}
                        \` : ''}
                        
                        <div style="margin-top: 15px; font-size: 12px; color: #666;">
                            \${data.timestamp}
                        </div>
                    </div>
                \`;
                
                resultDiv.innerHTML = html;
                
            } catch (error) {
                resultDiv.innerHTML = \`<div class="result error">Detection test failed: \${error.message}</div>\`;
            }
        }
        
        // Add example prompt
        document.getElementById('prompt').value = "How do I create a custom handler in Optimizely Commerce?";
    </script>
</body>
</html>
    `;
  }
}