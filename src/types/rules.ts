/**
 * Rule Intelligence Types
 * Types for IDE rule reading and analysis
 */

export interface IDERule {
  type: 'text' | 'json';
  source: string;
  path: string;
  content: string;
  rules: string[];
  optimizelyTerms: string[];
  lastModified: Date;
  size: number;
}

export interface RuleAnalysisResult {
  foundFiles: string[];
  existingRules: IDERule[];
  optimizelyRelevance: number;
  suggestedEnhancements: RuleEnhancement[];
  analysisTime: number;
  timestamp: Date;
}

export interface RuleEnhancement {
  type: 'add' | 'modify' | 'remove';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  rationale: string;
  implementation: string;
}

export interface RuleConflict {
  type: 'duplicate' | 'contradiction' | 'obsolete';
  severity: 'error' | 'warning' | 'info';
  description: string;
  affectedRules: string[];
  resolution: string;
}