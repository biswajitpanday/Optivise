/**
 * HTTP Server for Render Deployment
 * Provides HTTP API access to the MCP context analyzer
 */

import { createServer } from 'http';
import { ContextAnalysisEngine } from '../analyzers/context-analysis-engine.js';
import { createLogger } from '../utils/logger.js';
import type { ContextAnalysisRequest, Logger } from '../types/index.js';

export class OptixHTTPServer {
  private server: any;
  private contextAnalyzer: ContextAnalysisEngine;
  private logger: Logger;
  private port: number;

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

      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          service: 'optix',
          version: '3.0.0-alpha.1',
          timestamp: new Date().toISOString()
        }));
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
    
    this.server.listen(this.port, () => {
      this.logger.info(`Optix HTTP Server started on port ${this.port}`);
      this.logger.info('Available endpoints:');
      this.logger.info('  GET  /health - Health check');
      this.logger.info('  POST /analyze - Context analysis');
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('Optix HTTP Server stopped');
        resolve();
      });
    });
  }
}