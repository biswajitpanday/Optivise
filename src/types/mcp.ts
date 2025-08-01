/**
 * MCP (Model Context Protocol) Types and Interfaces
 * Types for MCP server implementation and tool definitions
 */

import type { ContextAnalysisRequest, ContextAnalysisResponse } from './context.js';

export interface MCPToolDefinition {
  name: 'optidev_context_analyzer';
  description: 'Analyzes prompts for Optimizely context and provides curated information';
  parameters: {
    type: 'object';
    properties: {
      prompt: {
        type: 'string';
        description: 'User prompt to analyze for Optimizely context';
      };
      projectPath?: {
        type: 'string';
        description: 'Optional project path for IDE context';
      };
      ideRules?: {
        type: 'array';
        items: { type: 'string' };
        description: 'Optional IDE rules for context enhancement';
      };
    };
    required: ['prompt'];
  };
}

export interface MCPToolRequest {
  name: string;
  arguments: ContextAnalysisRequest;
}

export interface MCPToolResponse {
  status: 'success' | 'error';
  data?: ContextAnalysisResponse;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  capabilities: {
    tools: boolean;
    logging?: boolean;
    monitoring?: boolean;
  };
  tools: MCPToolDefinition[];
}

export interface MCPServerOptions {
  stdio?: boolean;
  http?: {
    port: number;
    host: string;
    cors: boolean;
  };
  logging?: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  features?: {
    productDetection: boolean;
    ruleIntelligence: boolean;
    documentationFetch: boolean;
    knowledgeLearning: boolean;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  features: {
    contextAnalysis: boolean;
    productDetection: boolean;
    documentationAccess: boolean;
    knowledgeBase: boolean;
  };
  performance: {
    averageResponseTime: number;
    totalRequests: number;
    errorRate: number;
    cacheHitRate: number;
  };
  lastHealthCheck: Date;
}