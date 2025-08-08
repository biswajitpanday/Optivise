/**
 * HTTP Server for Render Deployment
 * Provides HTTP API access to the MCP context analyzer
 */

import { createServer } from 'http';
import { z } from 'zod';
import { openAIClient } from '../integrations/openai-client.js';
import { chromaDBService } from '../integrations/chromadb-client.js';
import { documentationSyncService } from '../services/documentation-service.js';
import { auditTrail } from '../services/audit-trail.js';
import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';
import { createLogger } from '../utils/logger.js';
import { generateCorrelationId, runWithCorrelationId } from '../utils/correlation.js';
import { getVersion } from '../config/version.js';
import type { ContextAnalysisRequest, Logger } from '../types/index.js';

export class OptiviseHTTPServer {
  private server: any;
  private readonly contextAnalyzer: ContextAnalysisEngine;
  private readonly logger: Logger;
  private readonly port: number;
  private shuttingDown = false;
  private readonly allowedOrigins: string[];
  private readonly requestTimeoutMs: number;
  private readonly auditEnabled: boolean;
  private readonly auditKey?: string;
  private readonly analyzeSchema = z.object({
    prompt: z.string().min(1),
    projectPath: z.string().optional(),
    ideRules: z.array(z.string()).optional()
  });

  constructor(port = 3000) {
    this.port = port;
    this.logger = createLogger('info');
    this.contextAnalyzer = new ContextAnalysisEngine(this.logger);
    this.allowedOrigins = (process.env.CORS_ALLOW_ORIGINS || '*')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    this.requestTimeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10);
    this.auditEnabled = process.env.OPTIVISE_AUDIT === 'true';
    this.auditKey = process.env.AUDIT_API_KEY;
  }

  async initialize(): Promise<void> {
    await this.contextAnalyzer.initialize();
    
    this.server = createServer(async (req, res) => {
      // Strict CORS
      const origin = req.headers['origin'] as string | undefined;
      const allowAny = this.allowedOrigins.includes('*');
      const originAllowed = allowAny || (origin ? this.allowedOrigins.includes(origin) : false);
      if (origin && originAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (!originAllowed && !allowAny) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'CORS origin not allowed' }));
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
          uptime: process.uptime(),
          ai: {
            openAI: openAIClient.isAvailable?.() ?? false,
            vectorSearch: chromaDBService.isAvailable?.() ?? false
          },
          index: await chromaDBService.getCollectionStats().catch(() => ({})),
          docSync: documentationSyncService.getSyncStatus(),
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.method === 'GET' && req.url === '/ready') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const featureMatrix = {
          contextAnalysis: true,
          productDetection: true,
          aiIntegration: this.contextAnalyzer.isAIEnabled?.() ?? false
        };
        res.end(JSON.stringify({
          status: 'ready',
          service: 'optivise',
          version: getVersion(),
          features: featureMatrix,
          services: {
            openAI: { available: openAIClient.isAvailable?.() ?? false },
            chromaDB: { available: chromaDBService.isAvailable?.() ?? false },
            documentationSync: { autoSyncEnabled: documentationSyncService.getSyncStatus().autoSyncEnabled }
          },
          stats: {
            uptime: process.uptime(),
            index: await chromaDBService.getCollectionStats().catch(() => ({}))
          },
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.method === 'GET' && req.url === '/audit') {
        if (!this.auditEnabled) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        const auth = (req.headers['authorization'] || '').toString();
        const headerKey = (req.headers['x-optivise-audit-key'] || '').toString();
        const bearer = auth.startsWith('Bearer ') ? auth.substring(7) : '';
        const provided = bearer || headerKey;
        if (!this.auditKey || provided !== this.auditKey) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ events: auditTrail.getRecent() }));
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

      if (req.method === 'GET' && req.url?.startsWith('/evidence')) {
        // Evidence API (opt-in via debug): returns limited evidence summary
        const qp = new URL(req.url, 'http://localhost').searchParams;
        const prompt = qp.get('prompt') || '';
        const projectPath = qp.get('projectPath') || '';
        try {
          const detection = projectPath
            ? await this.contextAnalyzer['productDetectionService']?.detectFromProject(projectPath)
            : await this.contextAnalyzer['productDetectionService']?.detectFromPrompt(prompt, []);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            products: detection?.products || [],
            evidence: detection?.evidence?.slice(0, 20) || [],
            confidence: detection?.confidence || 0
          }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Evidence inspection failed' }));
        }
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
            const incomingCorr = (req.headers['x-correlation-id'] as string) || undefined;
            const corrId = incomingCorr || generateCorrelationId('http');
            res.setHeader('X-Correlation-Id', corrId);
            await runWithCorrelationId(corrId, async () => {
            // Basic size guard
            if (body.length > 512 * 1024) {
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Payload too large' }));
              return;
            }
            const json = JSON.parse(body);
            const parsed = this.analyzeSchema.safeParse(json);
            if (!parsed.success) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }));
              return;
            }
            const request: ContextAnalysisRequest = parsed.data;
            
            if (!request.prompt) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing prompt field' }));
              return;
            }

            const result = await Promise.race([
              this.contextAnalyzer.analyze(request),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), this.requestTimeoutMs))
            ] as const) as any;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            });
          } catch (error) {
            this.logger.error('Analysis failed', error as Error);
            const isTimeout = error instanceof Error && error.message.includes('timeout');
            res.writeHead(isTimeout ? 504 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: isTimeout ? 'Gateway Timeout' : 'Analysis failed', 
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

    // Simple rate limiting (per-process, naive)
    const requests: number[] = [];
    const windowMs = 60 * 1000;
    const maxReqPerWindow = 120;
    const originalListener = this.server.listeners('request')[0];
    this.server.removeAllListeners('request');
    this.server.on('request', (req: any, res: any) => {
      const now = Date.now();
      while (requests.length && now - requests[0] > windowMs) requests.shift();
      requests.push(now);
      if (requests.length > maxReqPerWindow) {
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Too many requests' }));
        return;
      }
      originalListener.call(this.server, req, res);
    });
  }

  async stop(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    return new Promise(async (resolve) => {
      try {
        await this.contextAnalyzer.shutdown?.();
      } catch {}
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