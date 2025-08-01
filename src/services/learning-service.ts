/**
 * Intelligent Prompt Learning and Adaptation Service
 * Learns from user interactions to improve response quality and personalization
 */

import { EventEmitter } from 'events';
import type { Logger, OptimizelyProduct } from '../types/index.js';

export interface LearningPattern {
  id: string;
  pattern: RegExp | string;
  intent: string;
  confidence: number;
  usage: number;
  successRate: number;
  lastUsed: number;
  metadata: {
    products: OptimizelyProduct[];
    keywords: string[];
    context: string;
  };
}

export interface UserPreference {
  userId: string;
  preferences: {
    favoriteProducts: OptimizelyProduct[];
    preferredResponseStyle: 'detailed' | 'concise' | 'technical' | 'beginner';
    commonTasks: string[];
    feedbackHistory: Array<{
      query: string;
      rating: number;
      timestamp: number;
      improvements?: string;
    }>;
  };
  learningData: {
    queryPatterns: string[];
    successfulResponses: string[];
    averageRating: number;
    totalInteractions: number;
  };
}

export interface AdaptationSuggestion {
  type: 'pattern' | 'response' | 'workflow';
  suggestion: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  evidence: Array<{
    query: string;
    outcome: string;
    timestamp: number;
  }>;
}

export interface LearningReport {
  timeframe: { start: number; end: number };
  patterns: {
    discovered: number;
    improved: number;
    deprecated: number;
  };
  users: {
    activeUsers: number;
    averageSatisfaction: number;
    topQueries: Array<{ query: string; frequency: number }>;
  };
  adaptations: {
    suggested: number;
    implemented: number;
    successRate: number;
  };
  insights: string[];
}

export class LearningService extends EventEmitter {
  private patterns = new Map<string, LearningPattern>();
  private userPreferences = new Map<string, UserPreference>();
  private logger: Logger;
  private adaptationThreshold = 0.7; // Confidence threshold for auto-adaptation
  private maxPatterns = 10000;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    
    this.initializeBasePatterns();
    this.startCleanupTimer();
    
    this.logger.info('Learning Service initialized', {
      maxPatterns: this.maxPatterns,
      adaptationThreshold: this.adaptationThreshold
    });
  }

  /**
   * Record user interaction for learning
   */
  recordInteraction(data: {
    userId?: string;
    query: string;
    response: string;
    detectedProducts: OptimizelyProduct[];
    relevanceScore: number;
    responseTime: number;
    userRating?: number;
    feedback?: string;
  }): void {
    try {
      // Extract patterns from successful interactions
      if (data.relevanceScore > 0.7) {
        this.extractAndUpdatePatterns(data);
      }

      // Update user preferences if user ID provided
      if (data.userId) {
        this.updateUserPreferences(data.userId, data);
      }

      // Emit learning event for monitoring
      this.emit('interaction', {
        timestamp: Date.now(),
        patterns: this.patterns.size,
        userScore: data.userRating,
        relevance: data.relevanceScore
      });

    } catch (error) {
      this.logger.error('Failed to record interaction for learning', error as Error);
    }
  }

  /**
   * Get personalized suggestions for a user
   */
  getPersonalizedSuggestions(userId: string, query: string): {
    suggestedProducts: OptimizelyProduct[];
    responseStyle: string;
    contextualHints: string[];
  } {
    const preferences = this.userPreferences.get(userId);
    
    if (!preferences) {
      return {
        suggestedProducts: [],
        responseStyle: 'detailed',
        contextualHints: []
      };
    }

    // Analyze query against user's historical patterns
    const queryLower = query.toLowerCase();
    const matchingPatterns = preferences.learningData.queryPatterns.filter(pattern =>
      queryLower.includes(pattern.toLowerCase())
    );

    const suggestedProducts = matchingPatterns.length > 0
      ? preferences.preferences.favoriteProducts.slice(0, 3)
      : [];

    const contextualHints = this.generateContextualHints(preferences, query);

    return {
      suggestedProducts,
      responseStyle: preferences.preferences.preferredResponseStyle,
      contextualHints
    };
  }

  /**
   * Analyze query and suggest improvements based on learned patterns
   */
  analyzeQuery(query: string): {
    detectedPatterns: LearningPattern[];
    suggestions: AdaptationSuggestion[];
    confidenceScore: number;
  } {
    const detectedPatterns: LearningPattern[] = [];
    const suggestions: AdaptationSuggestion[] = [];
    
    const queryLower = query.toLowerCase();

    // Find matching patterns
    for (const pattern of this.patterns.values()) {
      let matches = false;
      
      if (pattern.pattern instanceof RegExp) {
        matches = pattern.pattern.test(query);
      } else {
        matches = queryLower.includes(pattern.pattern.toLowerCase());
      }

      if (matches) {
        detectedPatterns.push(pattern);
        pattern.usage++;
        pattern.lastUsed = Date.now();
      }
    }

    // Sort by confidence and usage
    detectedPatterns.sort((a, b) => (b.confidence * b.usage) - (a.confidence * a.usage));

    // Generate suggestions based on patterns
    if (detectedPatterns.length > 0) {
      const topPattern = detectedPatterns[0];
      if (topPattern) {
        suggestions.push({
          type: 'response',
          suggestion: `Based on similar queries, focus on ${topPattern.metadata.products.join(', ')} with emphasis on ${topPattern.metadata.context}`,
          confidence: topPattern.confidence,
          impact: 'medium',
          evidence: [
            {
              query: 'Similar query pattern',
              outcome: `${topPattern.successRate * 100}% success rate`,
              timestamp: topPattern.lastUsed
            }
          ]
        });
      }
    }

    const confidenceScore = detectedPatterns.length > 0
      ? detectedPatterns.reduce((sum, p) => sum + p.confidence, 0) / detectedPatterns.length
      : 0;

    return {
      detectedPatterns: detectedPatterns.slice(0, 5),
      suggestions,
      confidenceScore
    };
  }

  /**
   * Get adaptation suggestions for improving the system
   */
  getAdaptationSuggestions(): AdaptationSuggestion[] {
    const suggestions: AdaptationSuggestion[] = [];

    // Analyze low-performing patterns
    const lowPerformingPatterns = Array.from(this.patterns.values())
      .filter(p => p.successRate < 0.6 && p.usage > 10)
      .sort((a, b) => a.successRate - b.successRate);

    lowPerformingPatterns.slice(0, 5).forEach(pattern => {
      suggestions.push({
        type: 'pattern',
        suggestion: `Pattern "${pattern.pattern}" has low success rate (${(pattern.successRate * 100).toFixed(1)}%) - consider refinement`,
        confidence: 1 - pattern.successRate,
        impact: pattern.usage > 50 ? 'high' : 'medium',
        evidence: [
          {
            query: `Pattern usage: ${pattern.usage}`,
            outcome: `Success rate: ${(pattern.successRate * 100).toFixed(1)}%`,
            timestamp: pattern.lastUsed
          }
        ]
      });
    });

    // Analyze user feedback trends
    const recentFeedback = this.getRecentFeedback(7 * 24 * 60 * 60 * 1000); // Last 7 days
    if (recentFeedback.length > 0) {
      const avgRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length;
      
      if (avgRating < 3.5) {
        suggestions.push({
          type: 'response',
          suggestion: `User satisfaction is low (${avgRating.toFixed(1)}/5) - consider improving response quality and relevance`,
          confidence: 0.8,
          impact: 'high',
          evidence: recentFeedback.map(f => ({
            query: f.query,
            outcome: `Rating: ${f.rating}/5`,
            timestamp: f.timestamp
          }))
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate learning report
   */
  generateLearningReport(timeframeHours: number = 24 * 7): LearningReport {
    const now = Date.now();
    const timeframe = {
      start: now - (timeframeHours * 60 * 60 * 1000),
      end: now
    };

    // Count patterns by age
    const recentPatterns = Array.from(this.patterns.values())
      .filter(p => p.lastUsed >= timeframe.start);

    const newPatterns = recentPatterns.filter(p => p.lastUsed >= timeframe.start);
    const improvedPatterns = recentPatterns.filter(p => p.successRate > 0.8);

    // Analyze user activity
    const activeUsers = this.userPreferences.size;
    const allFeedback = this.getAllFeedback();
    const recentFeedback = allFeedback.filter(f => f.timestamp >= timeframe.start);
    
    const averageSatisfaction = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length
      : 0;

    // Top queries analysis
    const queryFrequency = new Map<string, number>();
    for (const user of this.userPreferences.values()) {
      user.learningData.queryPatterns.forEach(pattern => {
        queryFrequency.set(pattern, (queryFrequency.get(pattern) || 0) + 1);
      });
    }

    const topQueries = Array.from(queryFrequency.entries())
      .map(([query, frequency]) => ({ query, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Generate insights
    const insights: string[] = [];
    
    if (newPatterns.length > 10) {
      insights.push(`High learning activity: ${newPatterns.length} new patterns discovered`);
    }
    
    if (averageSatisfaction > 4.0) {
      insights.push(`High user satisfaction: ${averageSatisfaction.toFixed(1)}/5 average rating`);
    } else if (averageSatisfaction < 3.0) {
      insights.push(`Low user satisfaction: ${averageSatisfaction.toFixed(1)}/5 - improvement needed`);
    }

    const commerceUsage = topQueries.filter(q => 
      q.query.toLowerCase().includes('commerce') || 
      q.query.toLowerCase().includes('handler')
    ).length;
    
    if (commerceUsage > topQueries.length * 0.5) {
      insights.push('Commerce-focused usage detected - prioritize commerce documentation');
    }

    return {
      timeframe,
      patterns: {
        discovered: newPatterns.length,
        improved: improvedPatterns.length,
        deprecated: 0 // Would need to track deprecated patterns
      },
      users: {
        activeUsers,
        averageSatisfaction,
        topQueries
      },
      adaptations: {
        suggested: this.getAdaptationSuggestions().length,
        implemented: 0, // Would need to track implementations
        successRate: 0 // Would need to track success
      },
      insights
    };
  }

  /**
   * Export learning data for backup or analysis
   */
  exportLearningData(): {
    patterns: LearningPattern[];
    userPreferences: UserPreference[];
    exportTime: number;
  } {
    return {
      patterns: Array.from(this.patterns.values()),
      userPreferences: Array.from(this.userPreferences.values()),
      exportTime: Date.now()
    };
  }

  /**
   * Import learning data from backup
   */
  importLearningData(data: {
    patterns: LearningPattern[];
    userPreferences: UserPreference[];
  }): boolean {
    try {
      // Import patterns
      this.patterns.clear();
      data.patterns.forEach(pattern => {
        this.patterns.set(pattern.id, pattern);
      });

      // Import user preferences
      this.userPreferences.clear();
      data.userPreferences.forEach(pref => {
        this.userPreferences.set(pref.userId, pref);
      });

      this.logger.info('Learning data imported successfully', {
        patterns: data.patterns.length,
        users: data.userPreferences.length
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to import learning data', error as Error);
      return false;
    }
  }

  /**
   * Initialize base patterns from common Optimizely queries
   */
  private initializeBasePatterns(): void {
    const basePatterns: Omit<LearningPattern, 'id' | 'usage' | 'lastUsed'>[] = [
      {
        pattern: /handler.*chain/i,
        intent: 'code-help',
        confidence: 0.9,
        successRate: 0.85,
        metadata: {
          products: ['configured-commerce'],
          keywords: ['handler', 'chain', 'pattern'],
          context: 'Commerce handler chain implementation'
        }
      },
      {
        pattern: /content.*type/i,
        intent: 'code-help',
        confidence: 0.85,
        successRate: 0.8,
        metadata: {
          products: ['cms-paas', 'cms-saas'],
          keywords: ['content', 'type', 'model'],
          context: 'CMS content type definition'
        }
      },
      {
        pattern: /experiment.*setup/i,
        intent: 'configuration',
        confidence: 0.8,
        successRate: 0.75,
        metadata: {
          products: ['web-experimentation', 'feature-experimentation'],
          keywords: ['experiment', 'setup', 'configuration'],
          context: 'Experimentation setup and configuration'
        }
      },
      {
        pattern: /blueprint.*development/i,
        intent: 'code-help',
        confidence: 0.85,
        successRate: 0.82,
        metadata: {
          products: ['configured-commerce'],
          keywords: ['blueprint', 'frontend', 'development'],
          context: 'Commerce frontend blueprint development'
        }
      }
    ];

    basePatterns.forEach((pattern, index) => {
      const fullPattern: LearningPattern = {
        ...pattern,
        id: `base_pattern_${index}`,
        usage: 0,
        lastUsed: Date.now()
      };
      this.patterns.set(fullPattern.id, fullPattern);
    });

    this.logger.debug('Base patterns initialized', { count: basePatterns.length });
  }

  /**
   * Extract and update patterns from user interactions
   */
  private extractAndUpdatePatterns(data: {
    query: string;
    detectedProducts: OptimizelyProduct[];
    relevanceScore: number;
    userRating?: number;
  }): void {
    const query = data.query.toLowerCase();
    const words = query.split(/\s+/).filter(w => w.length > 3);
    
    // Look for potential new patterns
    const significantPhrases = this.extractSignificantPhrases(query);
    
    significantPhrases.forEach(phrase => {
      const patternId = `learned_${phrase.replace(/\s+/g, '_')}`;
      let pattern = this.patterns.get(patternId);
      
      if (!pattern) {
        // Create new pattern if we have enough confidence
        if (data.relevanceScore > 0.8) {
          pattern = {
            id: patternId,
            pattern: phrase,
            intent: this.inferIntent(query),
            confidence: data.relevanceScore,
            usage: 1,
            successRate: data.userRating ? data.userRating / 5 : data.relevanceScore,
            lastUsed: Date.now(),
            metadata: {
              products: data.detectedProducts,
              keywords: words,
              context: this.inferContext(query, data.detectedProducts)
            }
          };
          
          this.patterns.set(patternId, pattern);
          this.emit('patternLearned', pattern);
        }
      } else {
        // Update existing pattern
        pattern.usage++;
        pattern.lastUsed = Date.now();
        
        // Update success rate with exponential moving average
        const alpha = 0.1; // Learning rate
        const currentSuccess = data.userRating ? data.userRating / 5 : data.relevanceScore;
        pattern.successRate = (1 - alpha) * pattern.successRate + alpha * currentSuccess;
        
        // Update confidence based on usage and success
        pattern.confidence = Math.min(0.95, pattern.confidence + (currentSuccess * 0.01));
      }
    });

    // Cleanup old patterns if we exceed max
    if (this.patterns.size > this.maxPatterns) {
      this.cleanupLowValuePatterns();
    }
  }

  /**
   * Update user preferences based on interaction
   */
  private updateUserPreferences(userId: string, data: {
    query: string;
    detectedProducts: OptimizelyProduct[];
    userRating?: number;
    feedback?: string;
  }): void {
    let preferences = this.userPreferences.get(userId);
    
    if (!preferences) {
      preferences = {
        userId,
        preferences: {
          favoriteProducts: [],
          preferredResponseStyle: 'detailed',
          commonTasks: [],
          feedbackHistory: []
        },
        learningData: {
          queryPatterns: [],
          successfulResponses: [],
          averageRating: 0,
          totalInteractions: 0
        }
      };
      this.userPreferences.set(userId, preferences);
    }

    // Update favorite products based on detected products
    data.detectedProducts.forEach(product => {
      if (!preferences!.preferences.favoriteProducts.includes(product)) {
        preferences!.preferences.favoriteProducts.push(product);
      }
    });

    // Keep only top 5 favorite products
    preferences.preferences.favoriteProducts = preferences.preferences.favoriteProducts.slice(0, 5);

    // Add query patterns
    const queryWords = data.query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    queryWords.forEach(word => {
      if (!preferences!.learningData.queryPatterns.includes(word)) {
        preferences!.learningData.queryPatterns.push(word);
      }
    });

    // Keep only recent query patterns (last 100)
    preferences.learningData.queryPatterns = preferences.learningData.queryPatterns.slice(-100);

    // Update feedback history if rating provided
    if (data.userRating !== undefined) {
      preferences.preferences.feedbackHistory.push({
        query: data.query,
        rating: data.userRating,
        timestamp: Date.now(),
        improvements: data.feedback
      });

      // Keep only last 50 feedback entries
      preferences.preferences.feedbackHistory = preferences.preferences.feedbackHistory.slice(-50);

      // Update average rating
      const ratings = preferences.preferences.feedbackHistory.map(f => f.rating);
      preferences.learningData.averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    }

    preferences.learningData.totalInteractions++;
  }

  /**
   * Generate contextual hints for user
   */
  private generateContextualHints(preferences: UserPreference, query: string): string[] {
    const hints: string[] = [];
    
    // Based on favorite products
    if (preferences.preferences.favoriteProducts.length > 0) {
      hints.push(`Based on your usage, consider ${preferences.preferences.favoriteProducts[0]} context`);
    }

    // Based on common tasks
    const queryLower = query.toLowerCase();
    if (queryLower.includes('error') || queryLower.includes('debug')) {
      hints.push('Use the debug helper tool for detailed troubleshooting steps');
    }
    
    if (queryLower.includes('implement') || queryLower.includes('create')) {
      hints.push('The implementation guide tool can provide detailed planning and code templates');
    }

    return hints.slice(0, 3);
  }

  /**
   * Extract significant phrases from query
   */
  private extractSignificantPhrases(query: string): string[] {
    const phrases: string[] = [];
    const words = query.toLowerCase().split(/\s+/);
    
    // Look for 2-3 word combinations that might be meaningful
    for (let i = 0; i < words.length - 1; i++) {
      const twoWord = `${words[i]} ${words[i + 1]}`;
      if (this.isSignificantPhrase(twoWord)) {
        phrases.push(twoWord);
      }
      
      if (i < words.length - 2) {
        const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        if (this.isSignificantPhrase(threeWord)) {
          phrases.push(threeWord);
        }
      }
    }
    
    return phrases;
  }

  /**
   * Check if phrase is significant enough to be a pattern
   */
  private isSignificantPhrase(phrase: string): boolean {
    const optimizelyTerms = [
      'handler', 'chain', 'content', 'type', 'experiment', 'blueprint',
      'commerce', 'cms', 'personalization', 'visitor', 'group'
    ];
    
    return optimizelyTerms.some(term => phrase.includes(term));
  }

  /**
   * Infer intent from query
   */
  private inferIntent(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('how') || queryLower.includes('implement') || queryLower.includes('create')) {
      return 'code-help';
    }
    if (queryLower.includes('error') || queryLower.includes('debug') || queryLower.includes('fix')) {
      return 'troubleshooting';
    }
    if (queryLower.includes('configure') || queryLower.includes('setup') || queryLower.includes('install')) {
      return 'configuration';
    }
    if (queryLower.includes('best') || queryLower.includes('practice') || queryLower.includes('recommend')) {
      return 'best-practices';
    }
    
    return 'documentation';
  }

  /**
   * Infer context from query and products
   */
  private inferContext(query: string, products: OptimizelyProduct[]): string {
    if (products.length === 0) return 'General Optimizely development';
    
    const primaryProduct = products[0];
    const queryLower = query.toLowerCase();
    
    const contextMap: Record<string, string> = {
      'configured-commerce': 'Commerce development and customization',
      'commerce-connect': 'Commerce integration and connectivity',
      'cms-paas': 'CMS content management and development',
      'cms-saas': 'Headless CMS and content delivery',
      'cmp': 'Content marketing and campaign management',
      'dxp': 'Digital experience and personalization',
      'web-experimentation': 'A/B testing and web experimentation',
      'feature-experimentation': 'Feature flags and experimentation',
      'data-platform': 'Data analytics and customer insights',
      'connect-platform': 'Platform integration and connectivity',
      'recommendations': 'Product recommendations and personalization'
    };
    
    let context = (primaryProduct && contextMap[primaryProduct]) || 'Optimizely development';
    
    // Add specific context based on query content
    if (queryLower.includes('frontend') || queryLower.includes('ui')) {
      context += ' - Frontend/UI focus';
    } else if (queryLower.includes('backend') || queryLower.includes('api')) {
      context += ' - Backend/API focus';
    }
    
    return context;
  }

  /**
   * Cleanup low-value patterns to stay under max limit
   */
  private cleanupLowValuePatterns(): void {
    const patterns = Array.from(this.patterns.values());
    
    // Sort by value score (combination of usage, success rate, and recency)
    patterns.sort((a, b) => {
      const scoreA = this.calculatePatternValue(a);
      const scoreB = this.calculatePatternValue(b);
      return scoreB - scoreA;
    });
    
    // Keep top patterns
    const toKeep = patterns.slice(0, this.maxPatterns * 0.9); // Keep 90% of max
    
    this.patterns.clear();
    toKeep.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
    
    this.logger.debug('Pattern cleanup completed', {
      removed: patterns.length - toKeep.length,
      remaining: toKeep.length
    });
  }

  /**
   * Calculate pattern value for cleanup decisions
   */
  private calculatePatternValue(pattern: LearningPattern): number {
    const usageScore = Math.log(pattern.usage + 1); // Logarithmic usage score
    const successScore = pattern.successRate;
    const recencyScore = Math.max(0, 1 - (Date.now() - pattern.lastUsed) / (30 * 24 * 60 * 60 * 1000)); // 30 days
    
    return (usageScore * 0.4) + (successScore * 0.4) + (recencyScore * 0.2);
  }

  /**
   * Get recent feedback for analysis
   */
  private getRecentFeedback(timeframeMs: number): Array<{
    query: string;
    rating: number;
    timestamp: number;
    improvements?: string;
  }> {
    const cutoff = Date.now() - timeframeMs;
    const feedback: Array<{
      query: string;
      rating: number;
      timestamp: number;
      improvements?: string;
    }> = [];
    
    for (const user of this.userPreferences.values()) {
      const recentFeedback = user.preferences.feedbackHistory.filter(f => f.timestamp >= cutoff);
      feedback.push(...recentFeedback);
    }
    
    return feedback.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get all feedback for analysis
   */
  private getAllFeedback(): Array<{
    query: string;
    rating: number;
    timestamp: number;
    improvements?: string;
  }> {
    const feedback: Array<{
      query: string;
      rating: number;
      timestamp: number;
      improvements?: string;
    }> = [];
    
    for (const user of this.userPreferences.values()) {
      feedback.push(...user.preferences.feedbackHistory);
    }
    
    return feedback.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Start cleanup timer for old data
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Cleanup old learning data
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days
    
    // Remove old patterns that haven't been used
    let removedPatterns = 0;
    for (const [id, pattern] of this.patterns) {
      if (pattern.lastUsed < cutoff && pattern.usage < 5) {
        this.patterns.delete(id);
        removedPatterns++;
      }
    }
    
    if (removedPatterns > 0) {
      this.logger.debug('Learning data cleanup completed', {
        removedPatterns,
        remainingPatterns: this.patterns.size
      });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.patterns.clear();
    this.userPreferences.clear();
    this.removeAllListeners();
    
    this.logger.info('Learning Service destroyed');
  }
}

// Global learning service instance
export const learningService = (logger: Logger) => new LearningService(logger);