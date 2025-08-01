/**
 * Advanced Security and Privacy Service
 * Provides comprehensive security features including encryption, access control, and privacy protection
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import type { Logger } from '../types/index.js';

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
    saltLength: number;
  };
  authentication: {
    tokenExpiry: number;
    maxFailedAttempts: number;
    lockoutDuration: number;
  };
  privacy: {
    dataRetentionDays: number;
    anonymizeAfterDays: number;
    enableAuditLogging: boolean;
  };
  permissions: {
    defaultRole: 'viewer' | 'editor' | 'admin';
    hierarchicalRoles: boolean;
    resourceBasedAccess: boolean;
  };
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  permissions: Set<string>;
  isRevoked: boolean;
}

export interface AccessAttempt {
  userId: string;
  resource: string;
  action: string;
  timestamp: number;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: number;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  categories: string[];
  retentionPeriod: number;
  encryptionRequired: boolean;
  accessRestrictions: string[];
}

export interface PrivacyRule {
  id: string;
  name: string;
  description: string;
  dataTypes: string[];
  actions: Array<{
    trigger: 'collect' | 'process' | 'store' | 'transmit' | 'delete';
    requirements: string[];
    approvals?: string[];
  }>;
  compliance: string[]; // GDPR, CCPA, etc.
  enabled: boolean;
}

export class SecurityService extends EventEmitter {
  private config: SecurityConfig;
  private logger: Logger;
  private activeSessions = new Map<string, UserSession>();
  private failedAttempts = new Map<string, number>();
  private lockedAccounts = new Map<string, number>();
  private auditLogs: AuditLog[] = [];
  private accessAttempts: AccessAttempt[] = [];
  private privacyRules = new Map<string, PrivacyRule>();
  private dataClassifications = new Map<string, DataClassification>();
  private encryptionKeys = new Map<string, Buffer>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(logger: Logger, config?: Partial<SecurityConfig>) {
    super();
    this.logger = logger;
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        saltLength: 16
      },
      authentication: {
        tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
        maxFailedAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
      },
      privacy: {
        dataRetentionDays: 365,
        anonymizeAfterDays: 90,
        enableAuditLogging: true
      },
      permissions: {
        defaultRole: 'viewer',
        hierarchicalRoles: true,
        resourceBasedAccess: true
      },
      ...config
    };

    this.initializeDefaultPrivacyRules();
    this.initializeDefaultClassifications();
    this.startCleanupTimer();

    this.logger.info('Security Service initialized', {
      encryption: this.config.encryption.algorithm,
      tokenExpiry: this.config.authentication.tokenExpiry,
      auditLogging: this.config.privacy.enableAuditLogging
    });
  }

  /**
   * Create secure user session with token
   */
  createSession(userId: string, permissions: string[], metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): UserSession {
    const sessionId = this.generateSecureId();
    const token = this.generateSecureToken();
    const now = Date.now();

    const session: UserSession = {
      id: sessionId,
      userId,
      token,
      createdAt: now,
      expiresAt: now + this.config.authentication.tokenExpiry,
      lastActivity: now,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      permissions: new Set(permissions),
      isRevoked: false
    };

    this.activeSessions.set(sessionId, session);

    this.logAudit({
      userId,
      action: 'session_created',
      resource: 'authentication',
      details: { sessionId, permissions: permissions.length },
      severity: 'low',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent
    });

    this.logger.info('User session created', { userId, sessionId, permissions: permissions.length });
    this.emit('sessionCreated', session);

    return session;
  }

  /**
   * Validate session token and refresh if needed
   */
  validateSession(token: string): UserSession | null {
    for (const session of this.activeSessions.values()) {
      if (session.token === token && !session.isRevoked) {
        const now = Date.now();
        
        // Check expiration
        if (now > session.expiresAt) {
          this.revokeSession(session.id);
          return null;
        }

        // Update last activity
        session.lastActivity = now;
        
        // Auto-refresh token if needed (when > 80% of expiry time has passed)
        const lifespan = session.expiresAt - session.createdAt;
        const elapsed = now - session.createdAt;
        if (elapsed > lifespan * 0.8) {
          session.token = this.generateSecureToken();
          session.expiresAt = now + this.config.authentication.tokenExpiry;
          
          this.logAudit({
            userId: session.userId,
            action: 'token_refreshed',
            resource: 'authentication',
            details: { sessionId: session.id },
            severity: 'low'
          });
        }

        return session;
      }
    }

    return null;
  }

  /**
   * Revoke user session
   */
  revokeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isRevoked = true;
      this.activeSessions.delete(sessionId);

      this.logAudit({
        userId: session.userId,
        action: 'session_revoked',
        resource: 'authentication',
        details: { sessionId },
        severity: 'medium'
      });

      this.logger.info('User session revoked', { userId: session.userId, sessionId });
      this.emit('sessionRevoked', session);
      return true;
    }
    return false;
  }

  /**
   * Check if user has permission for resource and action
   */
  checkPermission(userId: string, resource: string, action: string, metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): boolean {
    // Check if account is locked
    const lockEndTime = this.lockedAccounts.get(userId);
    if (lockEndTime && Date.now() < lockEndTime) {
      this.recordAccessAttempt(userId, resource, action, false, 'account_locked', metadata);
      return false;
    }

    // Find active session
    const session = Array.from(this.activeSessions.values()).find(s => 
      s.userId === userId && !s.isRevoked && Date.now() < s.expiresAt
    );

    if (!session) {
      this.recordAccessAttempt(userId, resource, action, false, 'no_valid_session', metadata);
      return false;
    }

    // Check permissions
    const requiredPermission = `${resource}:${action}`;
    const hasPermission = session.permissions.has(requiredPermission) || 
                         session.permissions.has(`${resource}:*`) ||
                         session.permissions.has('*:*');

    this.recordAccessAttempt(userId, resource, action, hasPermission, 
      hasPermission ? undefined : 'insufficient_permissions', metadata);

    if (hasPermission) {
      this.logAudit({
        userId,
        action: 'permission_granted',
        resource,
        details: { requiredPermission },
        severity: 'low',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });
    } else {
      this.logAudit({
        userId,
        action: 'permission_denied',
        resource,
        details: { requiredPermission, availablePermissions: Array.from(session.permissions) },
        severity: 'medium',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent
      });
    }

    return hasPermission;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string, keyId?: string): { encrypted: string; iv: string; keyId: string } {
    try {
      const effectiveKeyId = keyId || 'default';
      let encryptionKey = this.encryptionKeys.get(effectiveKeyId);
      
      if (!encryptionKey) {
        encryptionKey = crypto.randomBytes(this.config.encryption.keyLength);
        this.encryptionKeys.set(effectiveKeyId, encryptionKey);
        
        this.logAudit({
          userId: 'system',
          action: 'encryption_key_generated',
          resource: 'security',
          details: { keyId: effectiveKeyId },
          severity: 'high'
        });
      }

      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.config.encryption.algorithm, encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        keyId: effectiveKeyId
      };
    } catch (error) {
      this.logger.error('Encryption failed', error as Error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string, iv: string, keyId: string): string {
    try {
      const encryptionKey = this.encryptionKeys.get(keyId);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      const ivBuffer = Buffer.from(iv, 'hex');
      const decipher = crypto.createDecipheriv(this.config.encryption.algorithm, encryptionKey, ivBuffer);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error as Error, { keyId });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): { hash: string; salt: string } {
    const effectiveSalt = salt || crypto.randomBytes(this.config.encryption.saltLength).toString('hex');
    const hash = crypto.pbkdf2Sync(data, effectiveSalt, 100000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: effectiveSalt
    };
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hash: string, salt: string): boolean {
    try {
      const computedHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
      return computedHash.toString('hex') === hash;
    } catch (error) {
      this.logger.error('Hash verification failed', error as Error);
      return false;
    }
  }

  /**
   * Anonymize user data for privacy compliance
   */
  anonymizeData(data: Record<string, any>, preserveFields: string[] = []): Record<string, any> {
    const anonymized = { ...data };
    
    // Fields to anonymize by default
    const sensitiveFields = [
      'email', 'name', 'phone', 'address', 'ip', 'userId', 'username'
    ];

    for (const field of sensitiveFields) {
      if (field in anonymized && !preserveFields.includes(field)) {
        if (typeof anonymized[field] === 'string') {
          anonymized[field] = this.generateAnonymizedValue(field, anonymized[field]);
        }
      }
    }

    this.logAudit({
      userId: 'system',
      action: 'data_anonymized',
      resource: 'privacy',
      details: { anonymizedFields: sensitiveFields.filter(f => f in data && !preserveFields.includes(f)) },
      severity: 'medium'
    });

    return anonymized;
  }

  /**
   * Classify data based on sensitivity
   */
  classifyData(data: Record<string, any>, resourceType: string): DataClassification {
    let classification = this.dataClassifications.get(resourceType) || {
      level: 'internal',
      categories: ['general'],
      retentionPeriod: this.config.privacy.dataRetentionDays,
      encryptionRequired: false,
      accessRestrictions: []
    };

    // Check for sensitive data patterns
    const dataString = JSON.stringify(data).toLowerCase();
    
    if (this.containsSensitiveInfo(dataString)) {
      classification = {
        ...classification,
        level: 'confidential',
        encryptionRequired: true,
        accessRestrictions: ['authenticated_users_only']
      };
    }

    if (this.containsPersonalInfo(dataString)) {
      classification = {
        ...classification,
        level: 'restricted',
        categories: [...classification.categories, 'pii'],
        encryptionRequired: true,
        accessRestrictions: [...classification.accessRestrictions, 'privacy_officer_approval']
      };
    }

    return classification;
  }

  /**
   * Apply privacy rule to data operation
   */
  applyPrivacyRule(ruleId: string, operation: 'collect' | 'process' | 'store' | 'transmit' | 'delete', 
                   data: Record<string, any>): { allowed: boolean; requirements: string[]; modifications?: Record<string, any> } {
    const rule = this.privacyRules.get(ruleId);
    
    if (!rule?.enabled) {
      return { allowed: true, requirements: [] };
    }

    const applicableAction = rule.actions.find(action => action.trigger === operation);
    if (!applicableAction) {
      return { allowed: true, requirements: [] };
    }

    // Check if data contains any of the rule's data types
    const dataString = JSON.stringify(data).toLowerCase();
    const containsRuleData = rule.dataTypes.some(dataType => dataString.includes(dataType.toLowerCase()));

    if (!containsRuleData) {
      return { allowed: true, requirements: [] };
    }

    this.logAudit({
      userId: 'system',
      action: 'privacy_rule_applied',
      resource: 'privacy',
      details: { ruleId, operation, dataTypes: rule.dataTypes },
      severity: 'medium'
    });

    return {
      allowed: true,
      requirements: applicableAction.requirements,
      modifications: operation === 'store' ? this.anonymizeData(data) : undefined
    };
  }

  /**
   * Get security metrics and statistics
   */
  getSecurityMetrics(): {
    activeSessions: number;
    failedAttemptsLast24h: number;
    lockedAccounts: number;
    auditLogsLast24h: number;
    encryptionKeysCount: number;
    privacyRulesActive: number;
  } {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);

    return {
      activeSessions: this.activeSessions.size,
      failedAttemptsLast24h: this.accessAttempts.filter(attempt => 
        !attempt.success && attempt.timestamp >= last24h
      ).length,
      lockedAccounts: Array.from(this.lockedAccounts.values()).filter(lockTime => lockTime > now).length,
      auditLogsLast24h: this.auditLogs.filter(log => log.timestamp >= last24h).length,
      encryptionKeysCount: this.encryptionKeys.size,
      privacyRulesActive: Array.from(this.privacyRules.values()).filter(rule => rule.enabled).length
    };
  }

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    severity?: string;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) logs = logs.filter(log => log.userId === filters.userId);
      if (filters.action) logs = logs.filter(log => log.action === filters.action);
      if (filters.resource) logs = logs.filter(log => log.resource === filters.resource);
      if (filters.severity) logs = logs.filter(log => log.severity === filters.severity);
      if (filters.startTime) logs = logs.filter(log => log.timestamp >= filters.startTime!);
      if (filters.endTime) logs = logs.filter(log => log.timestamp <= filters.endTime!);
    }

    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    return logs.slice(0, filters?.limit || 1000);
  }

  /**
   * Generate secure random ID
   */
  private generateSecureId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Record access attempt for security monitoring
   */
  private recordAccessAttempt(userId: string, resource: string, action: string, success: boolean, 
                             failureReason?: string, metadata?: { ipAddress?: string; userAgent?: string }): void {
    const attempt: AccessAttempt = {
      userId,
      resource,
      action,
      timestamp: Date.now(),
      success,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      failureReason
    };

    this.accessAttempts.push(attempt);

    if (!success) {
      const failedCount = (this.failedAttempts.get(userId) || 0) + 1;
      this.failedAttempts.set(userId, failedCount);

      if (failedCount >= this.config.authentication.maxFailedAttempts) {
        const lockEndTime = Date.now() + this.config.authentication.lockoutDuration;
        this.lockedAccounts.set(userId, lockEndTime);
        this.failedAttempts.delete(userId);

        this.logAudit({
          userId,
          action: 'account_locked',
          resource: 'security',
          details: { reason: 'max_failed_attempts', lockDuration: this.config.authentication.lockoutDuration },
          severity: 'high',
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent
        });

        this.emit('accountLocked', { userId, lockEndTime });
      }
    } else {
      // Reset failed attempts on successful access
      this.failedAttempts.delete(userId);
    }

    // Keep only recent access attempts
    if (this.accessAttempts.length > 10000) {
      this.accessAttempts = this.accessAttempts.slice(-5000);
    }
  }

  /**
   * Log audit event
   */
  private logAudit(params: Omit<AuditLog, 'id' | 'timestamp'> & { timestamp?: number }): void {
    if (!this.config.privacy.enableAuditLogging) {
      return;
    }

    const auditLog: AuditLog = {
      id: this.generateSecureId(),
      timestamp: params.timestamp || Date.now(),
      ...params
    };

    this.auditLogs.push(auditLog);

    // Keep only recent audit logs
    if (this.auditLogs.length > 50000) {
      this.auditLogs = this.auditLogs.slice(-25000);
    }

    this.emit('auditLog', auditLog);
  }

  /**
   * Generate anonymized value for a field
   */
  private generateAnonymizedValue(fieldType: string, originalValue: string): string {
    switch (fieldType) {
      case 'email':
        return `user${crypto.randomBytes(4).toString('hex')}@example.com`;
      case 'name':
        return `Anonymous User ${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      case 'ip':
        return '192.168.1.1';
      case 'userId':
      case 'username':
        return `user_${crypto.randomBytes(6).toString('hex')}`;
      default:
        return `[ANONYMIZED_${crypto.randomBytes(3).toString('hex').toUpperCase()}]`;
    }
  }

  /**
   * Check if data contains sensitive information
   */
  private containsSensitiveInfo(dataString: string): boolean {
    const sensitivePatterns = [
      /password/i, /secret/i, /token/i, /key/i, /credential/i,
      /ssn/i, /social.?security/i, /credit.?card/i, /bank.?account/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Check if data contains personal information
   */
  private containsPersonalInfo(dataString: string): boolean {
    const piiPatterns = [
      /email/i, /phone/i, /address/i, /name/i, /birth/i,
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN pattern
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/ // Credit card pattern
    ];

    return piiPatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Initialize default privacy rules
   */
  private initializeDefaultPrivacyRules(): void {
    const defaultRules: PrivacyRule[] = [
      {
        id: 'gdpr_personal_data',
        name: 'GDPR Personal Data Protection',
        description: 'Ensures GDPR compliance for personal data processing',
        dataTypes: ['email', 'name', 'phone', 'address', 'ip'],
        actions: [
          {
            trigger: 'collect',
            requirements: ['explicit_consent', 'purpose_declaration'],
            approvals: ['privacy_officer']
          },
          {
            trigger: 'process',
            requirements: ['legal_basis', 'purpose_limitation']
          },
          {
            trigger: 'store',
            requirements: ['data_minimization', 'encryption', 'retention_limit']
          }
        ],
        compliance: ['GDPR'],
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.privacyRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize default data classifications
   */
  private initializeDefaultClassifications(): void {
    const defaultClassifications: Array<[string, DataClassification]> = [
      ['user_session', {
        level: 'confidential',
        categories: ['authentication'],
        retentionPeriod: 30,
        encryptionRequired: true,
        accessRestrictions: ['authenticated_users_only']
      }],
      ['workspace_data', {
        level: 'internal',
        categories: ['collaboration'],
        retentionPeriod: 365,
        encryptionRequired: false,
        accessRestrictions: ['workspace_members_only']
      }],
      ['audit_logs', {
        level: 'restricted',
        categories: ['security'],
        retentionPeriod: 2555, // 7 years
        encryptionRequired: true,
        accessRestrictions: ['security_team_only']
      }]
    ];

    defaultClassifications.forEach(([key, classification]) => {
      this.dataClassifications.set(key, classification);
    });
  }

  /**
   * Start cleanup timer for expired data
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.performSecurityCleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Perform security cleanup
   */
  private performSecurityCleanup(): void {
    const now = Date.now();

    // Remove expired sessions
    let expiredSessions = 0;
    for (const [sessionId, session] of this.activeSessions) {
      if (session.isRevoked || now > session.expiresAt) {
        this.activeSessions.delete(sessionId);
        expiredSessions++;
      }
    }

    // Remove expired account locks
    let unlockedAccounts = 0;
    for (const [userId, lockEndTime] of this.lockedAccounts) {
      if (now > lockEndTime) {
        this.lockedAccounts.delete(userId);
        unlockedAccounts++;
      }
    }

    // Clean old audit logs based on retention policy
    const retentionCutoff = now - (this.config.privacy.dataRetentionDays * 24 * 60 * 60 * 1000);
    const beforeAuditCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= retentionCutoff);

    // Clean old access attempts
    const accessAttemptCutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days
    const beforeAccessCount = this.accessAttempts.length;
    this.accessAttempts = this.accessAttempts.filter(attempt => attempt.timestamp >= accessAttemptCutoff);

    if (expiredSessions > 0 || unlockedAccounts > 0 || this.auditLogs.length < beforeAuditCount || this.accessAttempts.length < beforeAccessCount) {
      this.logger.debug('Security cleanup completed', {
        expiredSessions,
        unlockedAccounts,
        auditLogsRemoved: beforeAuditCount - this.auditLogs.length,
        accessAttemptsRemoved: beforeAccessCount - this.accessAttempts.length
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

    // Securely clear encryption keys
    this.encryptionKeys.clear();
    
    this.activeSessions.clear();
    this.failedAttempts.clear();
    this.lockedAccounts.clear();
    this.auditLogs = [];
    this.accessAttempts = [];
    this.privacyRules.clear();
    this.dataClassifications.clear();
    this.removeAllListeners();

    this.logger.info('Security Service destroyed');
  }
}

// Global security service instance
export const securityService = (logger: Logger, config?: Partial<SecurityConfig>) => new SecurityService(logger, config);