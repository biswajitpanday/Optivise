/**
 * Optimizely Product Types and Interfaces
 * Core type definitions for Optivise v3.0.0
 */

export type OptimizelyProduct = 
  | 'configured-commerce'
  | 'commerce-connect'
  | 'cms-paas'
  | 'cms-saas'
  | 'cmp'
  | 'dxp'
  | 'web-experimentation'
  | 'feature-experimentation'
  | 'data-platform'
  | 'connect-platform'
  | 'recommendations';

export interface ProductInfo {
  id: OptimizelyProduct;
  name: string;
  category: 'commerce' | 'content' | 'experience' | 'experimentation' | 'platform';
  description: string;
  documentationUrl: string;
  isActive: boolean;
}

export interface DetectionEvidence {
  type: 'file' | 'directory' | 'dependency' | 'content';
  path: string;
  pattern: string;
  confidence: number;
  description: string;
}

export interface ProductDetectionResult {
  products: OptimizelyProduct[];
  confidence: number;
  context: 'ide' | 'prompt';
  evidence: DetectionEvidence[];
  suggestedActions: string[];
  timestamp: Date;
}

export interface ProjectContext {
  projectPath?: string;
  detectedProducts: OptimizelyProduct[];
  confidence: number;
  lastDetection: Date;
  ideRules?: any[];
}

