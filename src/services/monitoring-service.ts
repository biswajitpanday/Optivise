/**
 * Comprehensive Monitoring and Analytics Service
 * Tracks performance, usage patterns, and system health with real-time analytics
 */

import { EventEmitter } from 'events';
import type { Logger, OptimizelyProduct } from '../types/index.js';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface UsageMetric {
  tool: string;
  feature: string;
  user?: string;
  timestamp: number;
  context?: Record<string, any>;
}

export interface SystemMetric {
  metric: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: SystemMetric[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // seconds
  lastTriggered?: number;
}

export interface AnalyticsReport {
  timeframe: { start: number; end: number };
  performance: {
    avgResponseTime: number;
    operationsPerSecond: number;
    errorRate: number;
    slowestOperations: Array<{ operation: string; avgDuration: number }>;
  };
  usage: {
    totalRequests: number;
    uniqueUsers: number;
    topTools: Array<{ tool: string; usage: number }>;
    topFeatures: Array<{ feature: string; usage: number }>;
    productDistribution: Record<OptimizelyProduct, number>;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    cacheHitRate: number;
    aiServiceUptime: number;
  };
  trends: {
    hourlyUsage: number[];
    dailyGrowth: number;
    performanceTrend: 'improving' | 'stable' | 'declining';
  };
}

export class MonitoringService extends EventEmitter {
  private performanceMetrics: PerformanceMetric[] = [];
  private usageMetrics: UsageMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Set<string> = new Set();
  private logger: Logger;
  private metricsRetentionMs: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(logger: Logger, retentionHours: number = 24) {
    super();
    this.logger = logger;
    this.metricsRetentionMs = retentionHours * 60 * 60 * 1000;
    
    this.setupDefaultAlerts();
    this.startCleanupTimer();
    
    this.logger.info('Monitoring Service initialized', {
      retentionHours,
      defaultAlerts: this.alertRules.size
    });
  }

  /**
   * Record performance metric
   */
  recordPerformance(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.performanceMetrics.push(fullMetric);
    this.emit('performance', fullMetric);

    // Check for performance alerts
    this.checkPerformanceAlerts(fullMetric);
  }

  /**
   * Record usage metric
   */
  recordUsage(metric: Omit<UsageMetric, 'timestamp'>): void {
    const fullMetric: UsageMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.usageMetrics.push(fullMetric);
    this.emit('usage', fullMetric);
  }

  /**
   * Record system metric
   */
  recordSystem(metric: Omit<SystemMetric, 'timestamp'>): void {
    const fullMetric: SystemMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.systemMetrics.push(fullMetric);
    this.emit('system', fullMetric);

    // Check for system alerts
    this.checkSystemAlerts(fullMetric);
  }

  /**
   * Start timing a performance operation
   */
  startTimer(operation: string, metadata?: Record<string, any>): () => void {
    const start = Date.now();
    
    return (success: boolean = true) => {
      this.recordPerformance({
        operation,
        duration: Date.now() - start,
        success,
        metadata
      });
    };
  }

  /**
   * Decorator for timing async operations
   */
  timeAsync<T>(operation: string, metadata?: Record<string, any>) {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(this: any, ...args: any[]): Promise<T> {
        const timer = this.monitoringService?.startTimer?.(operation, metadata) ?? (() => {});
        
        try {
          const result = await originalMethod.apply(this, args);
          timer(true);
          return result;
        } catch (error) {
          timer(false);
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Add or update alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.debug('Alert rule added', { id: rule.id, name: rule.name });
    this.emit('alertRuleAdded', rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(id: string): boolean {
    const removed = this.alertRules.delete(id);
    if (removed) {
      this.activeAlerts.delete(id);
      this.logger.debug('Alert rule removed', { id });
      this.emit('alertRuleRemoved', { id });
    }
    return removed;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): string[] {
    return Array.from(this.activeAlerts);
  }

  /**
   * Generate comprehensive analytics report
   */
  generateReport(timeframeHours: number = 24): AnalyticsReport {
    const now = Date.now();
    const timeframe = {
      start: now - (timeframeHours * 60 * 60 * 1000),
      end: now
    };

    const performanceMetrics = this.performanceMetrics.filter(
      m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end
    );

    const usageMetrics = this.usageMetrics.filter(
      m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end
    );

    const systemMetrics = this.systemMetrics.filter(
      m => m.timestamp >= timeframe.start && m.timestamp <= timeframe.end
    );

    return {
      timeframe,
      performance: this.analyzePerformance(performanceMetrics),
      usage: this.analyzeUsage(usageMetrics),
      system: this.analyzeSystem(systemMetrics),
      trends: this.analyzeTrends(performanceMetrics, usageMetrics, timeframeHours)
    };
  }

  /**
   * Get real-time system status
   */
  getSystemStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    activeAlerts: number;
    recentErrors: number;
    performance: { avgResponseTime: number; throughput: number };
  } {
    const now = Date.now();
    const last5Min = now - (5 * 60 * 1000);
    
    const recentPerformance = this.performanceMetrics.filter(m => m.timestamp >= last5Min);
    const recentErrors = recentPerformance.filter(m => !m.success).length;
    
    const avgResponseTime = recentPerformance.length > 0
      ? recentPerformance.reduce((sum, m) => sum + m.duration, 0) / recentPerformance.length
      : 0;
    
    const throughput = recentPerformance.length / 5; // per minute

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (this.activeAlerts.size > 0) {
      const criticalAlerts = Array.from(this.activeAlerts).some(id => {
        const rule = this.alertRules.get(id);
        return rule?.severity === 'critical';
      });
      status = criticalAlerts ? 'critical' : 'warning';
    }

    return {
      status,
      uptime: process.uptime() * 1000,
      activeAlerts: this.activeAlerts.size,
      recentErrors,
      performance: { avgResponseTime, throughput }
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const data = {
      performance: this.performanceMetrics,
      usage: this.usageMetrics,
      system: this.systemMetrics,
      exportTime: Date.now()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Simple CSV export for performance metrics
      const headers = 'timestamp,operation,duration,success,metadata\n';
      const rows = this.performanceMetrics.map(m => 
        `${m.timestamp},${m.operation},${m.duration},${m.success},"${JSON.stringify(m.metadata || {})}"`
      ).join('\n');
      return headers + rows;
    }
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlerts(): void {
    this.addAlertRule({
      id: 'high_response_time',
      name: 'High Response Time',
      condition: (metrics) => {
        const recent = metrics.filter(m => 
          m.metric === 'response_time' && 
          Date.now() - m.timestamp < 5 * 60 * 1000
        );
        return recent.length > 0 && recent.reduce((sum, m) => sum + m.value, 0) / recent.length > 2000;
      },
      severity: 'high',
      enabled: true,
      cooldown: 300 // 5 minutes
    });

    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: () => {
        const recent = this.performanceMetrics.filter(m => Date.now() - m.timestamp < 5 * 60 * 1000);
        if (recent.length < 10) return false;
        const errorRate = recent.filter(m => !m.success).length / recent.length;
        return errorRate > 0.1; // 10% error rate
      },
      severity: 'critical',
      enabled: true,
      cooldown: 300
    });

    this.addAlertRule({
      id: 'memory_usage',
      name: 'High Memory Usage',
      condition: (metrics) => {
        const recent = metrics.filter(m => 
          m.metric === 'memory_usage' && 
          Date.now() - m.timestamp < 60 * 1000
        );
        return recent.length > 0 && Math.max(...recent.map(m => m.value)) > 512 * 1024 * 1024; // 512MB
      },
      severity: 'medium',
      enabled: true,
      cooldown: 600 // 10 minutes
    });
  }

  /**
   * Check performance alerts
   */
  private checkPerformanceAlerts(metric: PerformanceMetric): void {
    // Convert to system metric format for alert checking
    const systemMetric: SystemMetric = {
      metric: 'response_time',
      value: metric.duration,
      unit: 'ms',
      timestamp: metric.timestamp,
      tags: { operation: metric.operation }
    };

    this.checkSystemAlerts(systemMetric);
  }

  /**
   * Check system alerts
   */
  private checkSystemAlerts(metric: SystemMetric): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;
      
      // Check cooldown period
      if (rule.lastTriggered && (Date.now() - rule.lastTriggered) < (rule.cooldown * 1000)) {
        continue;
      }

      try {
        const recentMetrics = this.systemMetrics.filter(m => 
          Date.now() - m.timestamp < 10 * 60 * 1000 // Last 10 minutes
        );

        if (rule.condition(recentMetrics)) {
          this.triggerAlert(rule);
        } else {
          this.resolveAlert(rule.id);
        }
      } catch (error) {
        this.logger.error('Error checking alert rule', error as Error, { ruleId: rule.id });
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule): void {
    if (!this.activeAlerts.has(rule.id)) {
      this.activeAlerts.add(rule.id);
      rule.lastTriggered = Date.now();
      
      this.logger.warn('Alert triggered', {
        id: rule.id,
        name: rule.name,
        severity: rule.severity
      });

      this.emit('alert', {
        rule,
        status: 'triggered',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(ruleId: string): void {
    if (this.activeAlerts.has(ruleId)) {
      this.activeAlerts.delete(ruleId);
      const rule = this.alertRules.get(ruleId);
      
      this.logger.info('Alert resolved', {
        id: ruleId,
        name: rule?.name
      });

      this.emit('alert', {
        rule,
        status: 'resolved',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformance(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) {
      return {
        avgResponseTime: 0,
        operationsPerSecond: 0,
        errorRate: 0,
        slowestOperations: []
      };
    }

    const avgResponseTime = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    const timeSpan = (metrics[metrics.length - 1]?.timestamp || 0) - (metrics[0]?.timestamp || 0);
    const operationsPerSecond = timeSpan > 0 ? metrics.length / (timeSpan / 1000) : metrics.length;
    const errorRate = metrics.filter(m => !m.success).length / metrics.length;

    // Group by operation and calculate average duration
    const operationGroups = new Map<string, number[]>();
    metrics.forEach(m => {
      if (!operationGroups.has(m.operation)) {
        operationGroups.set(m.operation, []);
      }
      operationGroups.get(m.operation)!.push(m.duration);
    });

    const slowestOperations = Array.from(operationGroups.entries())
      .map(([operation, durations]) => ({
        operation,
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      avgResponseTime,
      operationsPerSecond,
      errorRate,
      slowestOperations
    };
  }

  /**
   * Analyze usage metrics
   */
  private analyzeUsage(metrics: UsageMetric[]) {
    const totalRequests = metrics.length;
    const uniqueUsers = new Set(metrics.map(m => m.user).filter(Boolean)).size;

    // Top tools by usage
    const toolCounts = new Map<string, number>();
    metrics.forEach(m => {
      toolCounts.set(m.tool, (toolCounts.get(m.tool) || 0) + 1);
    });
    const topTools = Array.from(toolCounts.entries())
      .map(([tool, usage]) => ({ tool, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    // Top features by usage
    const featureCounts = new Map<string, number>();
    metrics.forEach(m => {
      featureCounts.set(m.feature, (featureCounts.get(m.feature) || 0) + 1);
    });
    const topFeatures = Array.from(featureCounts.entries())
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);

    // Product distribution (from context)
    const productDistribution: Record<string, number> = {};
    metrics.forEach(m => {
      const products = m.context?.detectedProducts as string[] || [];
      products.forEach(product => {
        productDistribution[product] = (productDistribution[product] || 0) + 1;
      });
    });

    return {
      totalRequests,
      uniqueUsers,
      topTools,
      topFeatures,
      productDistribution
    };
  }

  /**
   * Analyze system metrics
   */
  private analyzeSystem(metrics: SystemMetric[]) {
    const getLatestMetric = (metricName: string) => {
      const filtered = metrics.filter(m => m.metric === metricName);
      const lastMetric = filtered[filtered.length - 1];
    return lastMetric ? lastMetric.value : 0;
    };

    return {
      memoryUsage: getLatestMetric('memory_usage'),
      cpuUsage: getLatestMetric('cpu_usage'),
      cacheHitRate: getLatestMetric('cache_hit_rate'),
      aiServiceUptime: getLatestMetric('ai_service_uptime')
    };
  }

  /**
   * Analyze trends
   */
  private analyzeTrends(performance: PerformanceMetric[], usage: UsageMetric[], timeframeHours: number) {
    const hoursArray = new Array(Math.min(timeframeHours, 24)).fill(0);
    const now = Date.now();

    // Hourly usage distribution
    usage.forEach(m => {
      const hourIndex = Math.floor((now - m.timestamp) / (60 * 60 * 1000));
      if (hourIndex >= 0 && hourIndex < hoursArray.length) {
        hoursArray[hoursArray.length - 1 - hourIndex]++;
      }
    });

    // Daily growth (comparing current period to previous period)
    const halfPoint = now - (timeframeHours * 60 * 60 * 1000 / 2);
    const recentUsage = usage.filter(m => m.timestamp >= halfPoint).length;
    const previousUsage = usage.filter(m => m.timestamp < halfPoint).length;
    const dailyGrowth = previousUsage > 0 ? ((recentUsage - previousUsage) / previousUsage) * 100 : 0;

    // Performance trend
    const firstHalf = performance.filter(m => m.timestamp < halfPoint);
    const secondHalf = performance.filter(m => m.timestamp >= halfPoint);
    
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, m) => sum + m.duration, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, m) => sum + m.duration, 0) / secondHalf.length : 0;
    
    let performanceTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (firstHalfAvg > 0) {
      const change = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
      if (change < -0.1) performanceTrend = 'improving';
      else if (change > 0.1) performanceTrend = 'declining';
    }

    return {
      hourlyUsage: hoursArray,
      dailyGrowth,
      performanceTrend
    };
  }

  /**
   * Start cleanup timer to remove old metrics
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Remove old metrics beyond retention period
   */
  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.metricsRetentionMs;
    
    const beforeCleanup = {
      performance: this.performanceMetrics.length,
      usage: this.usageMetrics.length,
      system: this.systemMetrics.length
    };

    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff);
    this.usageMetrics = this.usageMetrics.filter(m => m.timestamp >= cutoff);
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp >= cutoff);

    const afterCleanup = {
      performance: this.performanceMetrics.length,
      usage: this.usageMetrics.length,
      system: this.systemMetrics.length
    };

    const cleaned = {
      performance: beforeCleanup.performance - afterCleanup.performance,
      usage: beforeCleanup.usage - afterCleanup.usage,
      system: beforeCleanup.system - afterCleanup.system
    };

    const totalCleaned = cleaned.performance + cleaned.usage + cleaned.system;
    
    if (totalCleaned > 0) {
      this.logger.debug('Metrics cleanup completed', { cleaned, remaining: afterCleanup });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.performanceMetrics = [];
    this.usageMetrics = [];
    this.systemMetrics = [];
    this.alertRules.clear();
    this.activeAlerts.clear();
    this.removeAllListeners();
    
    this.logger.info('Monitoring Service destroyed');
  }
}

// Global monitoring instance
export const monitoringService = (logger: Logger) => new MonitoringService(logger);