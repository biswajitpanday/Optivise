/**
 * MCP (Model Context Protocol) Types and Interfaces
 * Types for MCP server implementation and tool definitions
 */

import type { ContextAnalysisRequest, ContextAnalysisResponse } from './context.js';

export type MCPToolName = 
  | 'optidev_context_analyzer'
  | 'optidev_implementation_guide'
  | 'optidev_debug_helper'
  | 'optidev_code_analyzer'
  | 'optidev_project_helper';

export interface MCPToolDefinition {
  name: MCPToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
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
    aiIntegration?: boolean;
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