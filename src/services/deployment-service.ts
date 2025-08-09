/**
 * Production Deployment and Scaling Service
 * Handles deployment orchestration, auto-scaling, health monitoring, and infrastructure management
 */

import { EventEmitter } from 'events';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import type { Logger } from '../types/index.js';

const execAsync = promisify(exec);

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  strategy: 'rolling' | 'blue-green' | 'canary';
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCpuPercent: number;
    targetMemoryPercent: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
    gracePeriod: number;
  };
  deployment: {
    timeout: number;
    rollbackOnFailure: boolean;
    preDeployHooks: string[];
    postDeployHooks: string[];
  };
}

export interface ServiceInstance {
  id: string;
  version: string;
  status: 'starting' | 'healthy' | 'unhealthy' | 'stopping' | 'stopped';
  cpu: number;
  memory: number;
  uptime: number;
  startTime: number;
  lastHealthCheck: number;
  endpoint: string;
  metadata: Record<string, any>;
}

export interface DeploymentStatus {
  id: string;
  version: string;
  strategy: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'rolled-back';
  startTime: number;
  endTime?: number;
  progress: number;
  instances: {
    target: number;
    current: number;
    healthy: number;
    unhealthy: number;
  };
  phases: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    message?: string;
  }>;
  error?: string;
}

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'no-action';
  currentInstances: number;
  targetInstances: number;
  reason: string;
  confidence: number;
  metrics: {
    avgCpu: number;
    avgMemory: number;
    requestRate: number;
    responseTime: number;
  };
}

export interface InfrastructureStatus {
  environment: string;
  totalInstances: number;
  healthyInstances: number;
  unhealthyInstances: number;
  averageCpu: number;
  averageMemory: number;
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastDeployment?: {
    version: string;
    timestamp: number;
    status: string;
  };
}

export class DeploymentService extends EventEmitter {
  private config: DeploymentConfig;
  private logger: Logger;
  private instances = new Map<string, ServiceInstance>();
  private activeDeployment?: DeploymentStatus;
  private deploymentHistory: DeploymentStatus[] = [];
  private scalingCooldown = new Map<'up' | 'down', number>();
  private healthCheckInterval?: NodeJS.Timeout;
  private autoscalingInterval?: NodeJS.Timeout;

  constructor(logger: Logger, config?: Partial<DeploymentConfig>) {
    super();
    this.logger = logger;
    this.config = {
      environment: 'development',
      strategy: 'rolling',
      scaling: {
        minInstances: 1,
        maxInstances: 10,
        targetCpuPercent: 70,
        targetMemoryPercent: 80,
        scaleUpCooldown: 5 * 60 * 1000, // 5 minutes
        scaleDownCooldown: 10 * 60 * 1000 // 10 minutes
      },
      healthCheck: {
        path: '/health',
        interval: 30 * 1000, // 30 seconds
        timeout: 5 * 1000, // 5 seconds
        retries: 3,
        gracePeriod: 60 * 1000 // 1 minute
      },
      deployment: {
        timeout: 15 * 60 * 1000, // 15 minutes
        rollbackOnFailure: true,
        preDeployHooks: [],
        postDeployHooks: []
      },
      ...config
    };

    this.startHealthChecks();
    this.startAutoscaling();

    this.logger.info('Deployment Service initialized', {
      environment: this.config.environment,
      strategy: this.config.strategy,
      scaling: this.config.scaling
    });
  }

  /**
   * Deploy new version of the service
   */
  async deploy(version: string, options?: {
    strategy?: DeploymentConfig['strategy'];
    targetInstances?: number;
    skipHooks?: boolean;
  }): Promise<DeploymentStatus> {
    if (this.activeDeployment && this.activeDeployment.status === 'in-progress') {
      throw new Error('Deployment already in progress');
    }

    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const strategy = options?.strategy || this.config.strategy;
    const targetInstances = options?.targetInstances || Math.max(this.instances.size, this.config.scaling.minInstances);

    const deployment: DeploymentStatus = {
      id: deploymentId,
      version,
      strategy,
      status: 'pending',
      startTime: Date.now(),
      progress: 0,
      instances: {
        target: targetInstances,
        current: this.instances.size,
        healthy: this.getHealthyInstanceCount(),
        unhealthy: this.getUnhealthyInstanceCount()
      },
      phases: [
        { name: 'pre-deploy-hooks', status: 'pending' },
        { name: 'deployment', status: 'pending' },
        { name: 'health-checks', status: 'pending' },
        { name: 'post-deploy-hooks', status: 'pending' }
      ]
    };

    this.activeDeployment = deployment;
    this.logger.info('Starting deployment', { deploymentId, version, strategy, targetInstances });
    this.emit('deploymentStarted', deployment);

    try {
      deployment.status = 'in-progress';

      // Phase 1: Pre-deploy hooks
      if (!options?.skipHooks && this.config.deployment.preDeployHooks.length > 0) {
        await this.executePhase(deployment, 'pre-deploy-hooks', async () => {
          await this.executeHooks(this.config.deployment.preDeployHooks, 'pre-deploy');
        });
      } else {
        this.markPhaseCompleted(deployment, 'pre-deploy-hooks');
      }

      // Phase 2: Deployment
      await this.executePhase(deployment, 'deployment', async () => {
        switch (strategy) {
          case 'rolling':
            await this.performRollingDeployment(deployment, version);
            break;
          case 'blue-green':
            await this.performBlueGreenDeployment(deployment, version);
            break;
          case 'canary':
            await this.performCanaryDeployment(deployment, version);
            break;
        }
      });

      // Phase 3: Health checks
      await this.executePhase(deployment, 'health-checks', async () => {
        await this.waitForHealthyInstances(deployment);
      });

      // Phase 4: Post-deploy hooks
      if (!options?.skipHooks && this.config.deployment.postDeployHooks.length > 0) {
        await this.executePhase(deployment, 'post-deploy-hooks', async () => {
          await this.executeHooks(this.config.deployment.postDeployHooks, 'post-deploy');
        });
      } else {
        this.markPhaseCompleted(deployment, 'post-deploy-hooks');
      }

      deployment.status = 'completed';
      deployment.endTime = Date.now();
      deployment.progress = 100;

      this.logger.info('Deployment completed successfully', { deploymentId, version });
      this.emit('deploymentCompleted', deployment);

    } catch (error) {
      deployment.status = 'failed';
      deployment.endTime = Date.now();
      deployment.error = (error as Error).message;

      this.logger.error('Deployment failed', error as Error, { deploymentId, version });
      this.emit('deploymentFailed', deployment);

      // Rollback if enabled
      if (this.config.deployment.rollbackOnFailure) {
        await this.rollback(deploymentId);
      }
    } finally {
      this.deploymentHistory.push(deployment);
      this.activeDeployment = undefined;

      // Keep only last 50 deployments
      if (this.deploymentHistory.length > 50) {
        this.deploymentHistory = this.deploymentHistory.slice(-50);
      }
    }

    return deployment;
  }

  /**
   * Rollback to previous version
   */
  async rollback(deploymentId?: string): Promise<boolean> {
    const targetDeployment = deploymentId 
      ? this.deploymentHistory.find(d => d.id === deploymentId)
      : this.deploymentHistory.find(d => d.status === 'completed');

    if (!targetDeployment) {
      this.logger.warn('No deployment found for rollback', { deploymentId });
      return false;
    }

    this.logger.info('Starting rollback', { targetVersion: targetDeployment.version });

    try {
      // Create rollback deployment
      const rollbackDeployment = await this.deploy(`rollback-${targetDeployment.version}`, {
        strategy: 'rolling',
        skipHooks: true
      });

      rollbackDeployment.status = 'rolled-back';
      this.logger.info('Rollback completed', { targetVersion: targetDeployment.version });
      this.emit('rollbackCompleted', { original: targetDeployment, rollback: rollbackDeployment });

      return true;
    } catch (error) {
      this.logger.error('Rollback failed', error as Error, { targetVersion: targetDeployment.version });
      return false;
    }
  }

  /**
   * Scale service instances
   */
  async scale(targetInstances: number, reason?: string): Promise<boolean> {
    const currentInstances = this.instances.size;
    
    if (targetInstances === currentInstances) {
      return true;
    }

    // Validate scaling limits
    if (targetInstances < this.config.scaling.minInstances || targetInstances > this.config.scaling.maxInstances) {
      this.logger.warn('Scaling request outside limits', { 
        target: targetInstances, 
        min: this.config.scaling.minInstances, 
        max: this.config.scaling.maxInstances 
      });
      return false;
    }

    this.logger.info('Scaling service', { from: currentInstances, to: targetInstances, reason });

    try {
      if (targetInstances > currentInstances) {
        // Scale up
        await this.scaleUp(targetInstances - currentInstances);
      } else {
        // Scale down
        await this.scaleDown(currentInstances - targetInstances);
      }

      this.emit('scaled', { from: currentInstances, to: targetInstances, reason });
      return true;
    } catch (error) {
      this.logger.error('Scaling failed', error as Error, { target: targetInstances });
      return false;
    }
  }

  /**
   * Get current infrastructure status
   */
  getInfrastructureStatus(): InfrastructureStatus {
    const instances = Array.from(this.instances.values());
    const healthyInstances = instances.filter(i => i.status === 'healthy');
    const unhealthyInstances = instances.filter(i => i.status === 'unhealthy');

    const avgCpu = instances.length > 0 
      ? instances.reduce((sum, i) => sum + i.cpu, 0) / instances.length 
      : 0;

    const avgMemory = instances.length > 0 
      ? instances.reduce((sum, i) => sum + i.memory, 0) / instances.length 
      : 0;

    const lastDeployment = this.deploymentHistory.length > 0 
      ? this.deploymentHistory[this.deploymentHistory.length - 1] 
      : undefined;

    return {
      environment: this.config.environment,
      totalInstances: instances.length,
      healthyInstances: healthyInstances.length,
      unhealthyInstances: unhealthyInstances.length,
      averageCpu: avgCpu,
      averageMemory: avgMemory,
      totalRequests: 0, // Would be populated from monitoring service
      averageResponseTime: 0, // Would be populated from monitoring service
      errorRate: 0, // Would be populated from monitoring service
      lastDeployment: lastDeployment ? {
        version: lastDeployment.version,
        timestamp: lastDeployment.startTime,
        status: lastDeployment.status
      } : undefined
    };
  }

  /**
   * Get service instances
   */
  getInstances(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(limit?: number): DeploymentStatus[] {
    return this.deploymentHistory
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  /**
   * Get active deployment status
   */
  getActiveDeployment(): DeploymentStatus | undefined {
    return this.activeDeployment;
  }

  /**
   * Register new service instance
   */
  registerInstance(instance: Omit<ServiceInstance, 'id' | 'startTime' | 'uptime' | 'lastHealthCheck'>): string {
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullInstance: ServiceInstance = {
      id: instanceId,
      startTime: Date.now(),
      uptime: 0,
      lastHealthCheck: 0,
      ...instance
    };

    this.instances.set(instanceId, fullInstance);
    
    this.logger.info('Service instance registered', { instanceId, version: instance.version });
    this.emit('instanceRegistered', fullInstance);

    return instanceId;
  }

  /**
   * Deregister service instance
   */
  deregisterInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    if (instance) {
      this.instances.delete(instanceId);
      this.logger.info('Service instance deregistered', { instanceId });
      this.emit('instanceDeregistered', instance);
      return true;
    }
    return false;
  }

  /**
   * Execute deployment phase
   */
  private async executePhase(deployment: DeploymentStatus, phaseName: string, executor: () => Promise<void>): Promise<void> {
    const phase = deployment.phases.find(p => p.name === phaseName);
    if (!phase) return;

    phase.status = 'running';
    phase.startTime = Date.now();

    try {
      await executor();
      phase.status = 'completed';
      phase.endTime = Date.now();
    } catch (error) {
      phase.status = 'failed';
      phase.endTime = Date.now();
      phase.message = (error as Error).message;
      throw error;
    }
  }

  /**
   * Mark phase as completed
   */
  private markPhaseCompleted(deployment: DeploymentStatus, phaseName: string): void {
    const phase = deployment.phases.find(p => p.name === phaseName);
    if (phase) {
      phase.status = 'completed';
      phase.startTime = Date.now();
      phase.endTime = Date.now();
    }
  }

  /**
   * Execute deployment hooks
   */
  private async executeHooks(hooks: string[], stage: 'pre-deploy' | 'post-deploy'): Promise<void> {
    for (const hook of hooks) {
      this.logger.debug(`Executing ${stage} hook`, { hook });
      
      try {
        const { stdout, stderr } = await execAsync(hook, { timeout: 60000 });
        if (stderr) {
          this.logger.warn(`${stage} hook stderr`, { hook, stderr });
        }
        this.logger.debug(`${stage} hook completed`, { hook, stdout });
      } catch (error) {
        this.logger.error(`${stage} hook failed`, error as Error, { hook });
        throw error;
      }
    }
  }

  /**
   * Perform rolling deployment
   */
  private async performRollingDeployment(deployment: DeploymentStatus, version: string): Promise<void> {
    const targetInstances = deployment.instances.target;
    const batchSize = Math.max(1, Math.floor(targetInstances * 0.25)); // 25% at a time

    this.logger.info('Starting rolling deployment', { version, targetInstances, batchSize });

    const oldInstances = Array.from(this.instances.values());
    
    // Deploy new instances in batches
    for (let i = 0; i < targetInstances; i += batchSize) {
      const batchCount = Math.min(batchSize, targetInstances - i);
      
      if (batchCount <= 0) break;
      
      // Start new instances
      for (let j = 0; j < batchCount; j++) {
        await this.startNewInstance(version);
      }

      // Wait for instances to become healthy
      await this.waitForHealthyInstances(deployment, 3 * 60 * 1000); // 3 minutes

      // Stop old instances if we have them
      const instancesToStop = oldInstances.splice(0, Math.min(batchCount, oldInstances.length));
      for (const instance of instancesToStop) {
        await this.stopInstance(instance.id);
      }

      deployment.progress = Math.floor((i + batchCount) / targetInstances * 80); // 80% for deployment phase
    }
  }

  /**
   * Perform blue-green deployment
   */
  private async performBlueGreenDeployment(deployment: DeploymentStatus, version: string): Promise<void> {
    this.logger.info('Starting blue-green deployment', { version });

    const targetInstances = deployment.instances.target;
    const oldInstances = Array.from(this.instances.values());

    // Start all new instances (green environment)
    const newInstancePromises = [];
    for (let i = 0; i < targetInstances; i++) {
      newInstancePromises.push(this.startNewInstance(version));
    }

    await Promise.all(newInstancePromises);
    deployment.progress = 40;

    // Wait for all instances to be healthy
    await this.waitForHealthyInstances(deployment, 5 * 60 * 1000); // 5 minutes
    deployment.progress = 60;

    // Switch traffic (would update load balancer configuration)
    await this.switchTraffic(version);
    deployment.progress = 80;

    // Stop old instances (blue environment)
    for (const instance of oldInstances) {
      await this.stopInstance(instance.id);
    }
  }

  /**
   * Perform canary deployment
   */
  private async performCanaryDeployment(deployment: DeploymentStatus, version: string): Promise<void> {
    this.logger.info('Starting canary deployment', { version });

    const targetInstances = deployment.instances.target;
    const canaryCount = Math.max(1, Math.floor(targetInstances * 0.1)); // 10% canary

    // Deploy canary instances
    for (let i = 0; i < canaryCount; i++) {
      await this.startNewInstance(version);
    }

    deployment.progress = 20;

    // Monitor canary for 5 minutes
    await this.monitorCanary(5 * 60 * 1000);
    deployment.progress = 40;

    // If canary is successful, deploy remaining instances
    const remainingCount = targetInstances - canaryCount;
    for (let i = 0; i < remainingCount; i++) {
      await this.startNewInstance(version);
    }

    deployment.progress = 80;
  }

  /**
   * Start new service instance
   */
  private async startNewInstance(version: string): Promise<string> {
    // In a real implementation, this would start a new container or process
    const instanceId = this.registerInstance({
      version,
      status: 'starting',
      cpu: 0,
      memory: 0,
      endpoint: `http://service-${Math.random().toString(36).substr(2, 9)}:3000`,
      metadata: { startedBy: 'deployment-service' }
    });

    // Simulate startup time
    setTimeout(() => {
      const instance = this.instances.get(instanceId);
      if (instance) {
        instance.status = 'healthy';
        instance.cpu = Math.random() * 50 + 10; // 10-60% CPU
        instance.memory = Math.random() * 40 + 20; // 20-60% Memory
      }
    }, 2000);

    return instanceId;
  }

  /**
   * Stop service instance
   */
  private async stopInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = 'stopping';
      
      // Simulate graceful shutdown
      setTimeout(() => {
        this.deregisterInstance(instanceId);
      }, 1000);
    }
  }

  /**
   * Wait for instances to become healthy
   */
  private async waitForHealthyInstances(deployment: DeploymentStatus, timeout: number = 5 * 60 * 1000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const healthyCount = this.getHealthyInstanceCount();
      const totalCount = this.instances.size;
      
      deployment.instances.current = totalCount;
      deployment.instances.healthy = healthyCount;
      deployment.instances.unhealthy = totalCount - healthyCount;

      if (healthyCount >= deployment.instances.target) {
        return; // All instances are healthy
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    throw new Error('Timeout waiting for instances to become healthy');
  }

  /**
   * Switch traffic to new version (placeholder for load balancer integration)
   */
  private async switchTraffic(version: string): Promise<void> {
    this.logger.info('Switching traffic to new version', { version });
    // In a real implementation, this would update load balancer configuration
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Monitor canary deployment
   */
  private async monitorCanary(duration: number): Promise<void> {
    this.logger.info('Monitoring canary deployment', { duration });
    
    const startTime = Date.now();
    while (Date.now() - startTime < duration) {
      // In a real implementation, this would check metrics like error rate, response time, etc.
      const canaryInstances = Array.from(this.instances.values()).filter(i => i.status === 'healthy');
      
      if (canaryInstances.length === 0) {
        throw new Error('All canary instances are unhealthy');
      }

      // Simulate monitoring - in reality would check real metrics
      const errorRate = Math.random() * 5; // 0-5% error rate
      if (errorRate > 2) { // Fail if error rate > 2%
        throw new Error(`Canary failed: high error rate ${errorRate.toFixed(2)}%`);
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds
    }
  }

  /**
   * Scale up instances
   */
  private async scaleUp(count: number): Promise<void> {
    const version = this.getLatestVersion();
    
    for (let i = 0; i < count; i++) {
      await this.startNewInstance(version);
    }

    // Set cooldown
    this.scalingCooldown.set('up', Date.now() + this.config.scaling.scaleUpCooldown);
  }

  /**
   * Scale down instances
   */
  private async scaleDown(count: number): Promise<void> {
    const instances = Array.from(this.instances.values());
    const instancesToStop = instances
      .filter(i => i.status === 'healthy')
      .sort((a, b) => a.startTime - b.startTime) // Stop oldest first
      .slice(0, count);

    for (const instance of instancesToStop) {
      await this.stopInstance(instance.id);
    }

    // Set cooldown
    this.scalingCooldown.set('down', Date.now() + this.config.scaling.scaleDownCooldown);
  }

  /**
   * Get latest deployed version
   */
  private getLatestVersion(): string {
    const instances = Array.from(this.instances.values());
    return instances.length > 0 && instances[0] ? instances[0].version : 'latest';
  }

  /**
   * Get healthy instance count
   */
  private getHealthyInstanceCount(): number {
    return Array.from(this.instances.values()).filter(i => i.status === 'healthy').length;
  }

  /**
   * Get unhealthy instance count
   */
  private getUnhealthyInstanceCount(): number {
    return Array.from(this.instances.values()).filter(i => i.status === 'unhealthy').length;
  }

  /**
   * Make scaling decision based on current metrics
   */
  private makeScalingDecision(): ScalingDecision {
    const instances = Array.from(this.instances.values()).filter(i => i.status === 'healthy');
    const currentInstances = instances.length;

    if (currentInstances === 0) {
      return {
        action: 'scale-up',
        currentInstances: 0,
        targetInstances: this.config.scaling.minInstances,
        reason: 'No healthy instances',
        confidence: 1.0,
        metrics: { avgCpu: 0, avgMemory: 0, requestRate: 0, responseTime: 0 }
      };
    }

    const avgCpu = instances.reduce((sum, i) => sum + i.cpu, 0) / instances.length;
    const avgMemory = instances.reduce((sum, i) => sum + i.memory, 0) / instances.length;

    // Check if we're in cooldown
    const now = Date.now();
    const upCooldown = this.scalingCooldown.get('up') || 0;
    const downCooldown = this.scalingCooldown.get('down') || 0;

    if (now < upCooldown || now < downCooldown) {
      return {
        action: 'no-action',
        currentInstances,
        targetInstances: currentInstances,
        reason: 'In cooldown period',
        confidence: 1.0,
        metrics: { avgCpu, avgMemory, requestRate: 0, responseTime: 0 }
      };
    }

    // Scale up if CPU or memory is high
    if (avgCpu > this.config.scaling.targetCpuPercent || avgMemory > this.config.scaling.targetMemoryPercent) {
      const targetInstances = Math.min(currentInstances + 1, this.config.scaling.maxInstances);
      
      if (targetInstances > currentInstances) {
        return {
          action: 'scale-up',
          currentInstances,
          targetInstances,
          reason: `High resource usage: CPU ${avgCpu.toFixed(1)}%, Memory ${avgMemory.toFixed(1)}%`,
          confidence: 0.8,
          metrics: { avgCpu, avgMemory, requestRate: 0, responseTime: 0 }
        };
      }
    }

    // Scale down if resources are underutilized
    const lowCpuThreshold = this.config.scaling.targetCpuPercent * 0.3; // 30% of target
    const lowMemoryThreshold = this.config.scaling.targetMemoryPercent * 0.3;

    if (avgCpu < lowCpuThreshold && avgMemory < lowMemoryThreshold && currentInstances > this.config.scaling.minInstances) {
      const targetInstances = Math.max(currentInstances - 1, this.config.scaling.minInstances);
      
      return {
        action: 'scale-down',
        currentInstances,
        targetInstances,
        reason: `Low resource usage: CPU ${avgCpu.toFixed(1)}%, Memory ${avgMemory.toFixed(1)}%`,
        confidence: 0.6,
        metrics: { avgCpu, avgMemory, requestRate: 0, responseTime: 0 }
      };
    }

    return {
      action: 'no-action',
      currentInstances,
      targetInstances: currentInstances,
      reason: 'Resources within target range',
      confidence: 0.7,
      metrics: { avgCpu, avgMemory, requestRate: 0, responseTime: 0 }
    };
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheck.interval);
  }

  /**
   * Perform health checks on all instances
   */
  private async performHealthChecks(): Promise<void> {
    const now = Date.now();
    
    for (const instance of this.instances.values()) {
      // Skip if instance is starting or stopping
      if (instance.status === 'starting' || instance.status === 'stopping') {
        continue;
      }

      // Update uptime
      instance.uptime = now - instance.startTime;

      // Simulate health check (in reality would make HTTP request)
      const isHealthy = Math.random() > 0.05; // 95% success rate
      
      instance.lastHealthCheck = now;
      const previousStatus = instance.status;
      instance.status = isHealthy ? 'healthy' : 'unhealthy';

      if (previousStatus !== instance.status) {
        this.logger.info('Instance status changed', { 
          instanceId: instance.id, 
          from: previousStatus, 
          to: instance.status 
        });
        this.emit('instanceStatusChanged', instance);
      }
    }
  }

  /**
   * Start autoscaling monitoring
   */
  private startAutoscaling(): void {
    this.autoscalingInterval = setInterval(() => {
      void this.performAutoscaling();
    }, 60 * 1000); // Check every minute
  }

  /**
   * Perform autoscaling based on current metrics
   */
  private async performAutoscaling(): Promise<void> {
    const decision = this.makeScalingDecision();
    
    if (decision.action !== 'no-action' && decision.confidence > 0.7) {
      this.logger.info('Autoscaling decision', decision as unknown as Record<string, unknown>);
      
      try {
      await this.scale(decision.targetInstances, `Autoscaling: ${decision.reason}`);
      } catch (error) {
        this.logger.error('Autoscaling failed', error as Error, decision as unknown as Record<string, unknown>);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.autoscalingInterval) {
      clearInterval(this.autoscalingInterval);
    }

    this.instances.clear();
    this.deploymentHistory = [];
    this.scalingCooldown.clear();
    this.activeDeployment = undefined;
    this.removeAllListeners();

    this.logger.info('Deployment Service destroyed');
  }
}

// Global deployment service instance
export const deploymentService = (logger: Logger, config?: Partial<DeploymentConfig>) => new DeploymentService(logger, config);