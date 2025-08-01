/**
 * Real-time Collaboration and Workspace Synchronization Service
 * Enables shared contexts, collaborative workflows, and team synchronization
 */

import { EventEmitter } from 'events';
import type { Logger, OptimizelyProduct } from '../types/index.js';

export interface WorkspaceContext {
  id: string;
  name: string;
  description?: string;
  owner: string;
  collaborators: string[];
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  settings: {
    allowEditing: boolean;
    requireApproval: boolean;
    syncFrequency: number; // milliseconds
    maxCollaborators: number;
  };
  data: {
    sharedRules: Array<{
      id: string;
      name: string;
      content: string;
      author: string;
      version: number;
      lastModified: number;
    }>;
    projectSettings: Record<string, any>;
    detectedProducts: OptimizelyProduct[];
    learningPatterns: Array<{
      pattern: string;
      confidence: number;
      sharedBy: string;
      votes: number;
    }>;
    collaborativeNotes: Array<{
      id: string;
      content: string;
      author: string;
      timestamp: number;
      tags: string[];
    }>;
  };
}

export interface CollaborationSession {
  id: string;
  workspaceId: string;
  participants: Array<{
    userId: string;
    username: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: number;
    lastActivity: number;
    isActive: boolean;
  }>;
  activeEditors: Set<string>;
  lockState: Map<string, { userId: string; timestamp: number; resource: string }>;
  messageHistory: Array<{
    id: string;
    userId: string;
    message: string;
    timestamp: number;
    type: 'chat' | 'system' | 'notification';
  }>;
}

export interface SyncEvent {
  id: string;
  workspaceId: string;
  type: 'rule_update' | 'setting_change' | 'pattern_share' | 'note_add' | 'user_join' | 'user_leave';
  userId: string;
  timestamp: number;
  data: any;
  version: number;
}

export interface ConflictResolution {
  id: string;
  resourceType: string;
  resourceId: string;
  conflictType: 'edit_conflict' | 'version_mismatch' | 'permission_denied';
  participants: string[];
  proposedChanges: Array<{
    userId: string;
    changes: any;
    timestamp: number;
    rationale?: string;
  }>;
  resolution?: {
    method: 'merge' | 'override' | 'manual';
    finalState: any;
    resolvedBy: string;
    resolvedAt: number;
  };
}

export class CollaborationService extends EventEmitter {
  private workspaces = new Map<string, WorkspaceContext>();
  private activeSessions = new Map<string, CollaborationSession>();
  private syncEvents: SyncEvent[] = [];
  private pendingConflicts = new Map<string, ConflictResolution>();
  private logger: Logger;
  private syncInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    
    this.startSyncTimer();
    this.startCleanupTimer();
    
    this.logger.info('Collaboration Service initialized');
  }

  /**
   * Create a new workspace for collaboration
   */
  createWorkspace(config: {
    name: string;
    description?: string;
    owner: string;
    isPublic?: boolean;
    settings?: Partial<WorkspaceContext['settings']>;
  }): WorkspaceContext {
    const workspace: WorkspaceContext = {
      id: `workspace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      owner: config.owner,
      collaborators: [config.owner],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic: config.isPublic || false,
      settings: {
        allowEditing: true,
        requireApproval: false,
        syncFrequency: 5000, // 5 seconds
        maxCollaborators: 10,
        ...config.settings
      },
      data: {
        sharedRules: [],
        projectSettings: {},
        detectedProducts: [],
        learningPatterns: [],
        collaborativeNotes: []
      }
    };

    this.workspaces.set(workspace.id, workspace);
    
    this.logger.info('Workspace created', {
      workspaceId: workspace.id,
      name: workspace.name,
      owner: workspace.owner
    });

    this.emit('workspaceCreated', workspace);
    return workspace;
  }

  /**
   * Join a workspace as a collaborator
   */
  joinWorkspace(workspaceId: string, userId: string, username: string, role: 'editor' | 'viewer' = 'viewer'): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      this.logger.warn('Workspace not found', { workspaceId, userId });
      return false;
    }

    // Check if user is already a collaborator
    if (workspace.collaborators.includes(userId)) {
      this.logger.debug('User already in workspace', { workspaceId, userId });
      return true;
    }

    // Check workspace limits
    if (workspace.collaborators.length >= workspace.settings.maxCollaborators) {
      this.logger.warn('Workspace at capacity', { workspaceId, userId, capacity: workspace.settings.maxCollaborators });
      return false;
    }

    // Add user to workspace
    workspace.collaborators.push(userId);
    workspace.updatedAt = Date.now();

    // Create or update session
    let session = this.activeSessions.get(workspaceId);
    if (!session) {
      session = {
        id: `session_${workspaceId}_${Date.now()}`,
        workspaceId,
        participants: [],
        activeEditors: new Set(),
        lockState: new Map(),
        messageHistory: []
      };
      this.activeSessions.set(workspaceId, session);
    }

    // Add participant to session
    const participant = {
      userId,
      username,
      role: (userId === workspace.owner ? 'owner' : role) as 'owner' | 'editor' | 'viewer',
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      isActive: true
    };

    session.participants.push(participant);

    // Record sync event
    this.recordSyncEvent({
      workspaceId,
      type: 'user_join',
      userId,
      data: { username, role: participant.role }
    });

    this.logger.info('User joined workspace', { workspaceId, userId, username, role: participant.role });
    this.emit('userJoined', { workspace, userId, username, role: participant.role });

    return true;
  }

  /**
   * Leave a workspace
   */
  leaveWorkspace(workspaceId: string, userId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    const session = this.activeSessions.get(workspaceId);

    if (workspace) {
      // Remove from collaborators (unless owner)
      if (userId !== workspace.owner) {
        workspace.collaborators = workspace.collaborators.filter(id => id !== userId);
        workspace.updatedAt = Date.now();
      }
    }

    if (session) {
      // Remove from active session
      session.participants = session.participants.filter(p => p.userId !== userId);
      session.activeEditors.delete(userId);
      
      // Release any locks held by this user
      for (const [lockId, lock] of session.lockState) {
        if (lock.userId === userId) {
          session.lockState.delete(lockId);
        }
      }
    }

    // Record sync event
    this.recordSyncEvent({
      workspaceId,
      type: 'user_leave',
      userId,
      data: {}
    });

    this.logger.info('User left workspace', { workspaceId, userId });
    this.emit('userLeft', { workspaceId, userId });

    return true;
  }

  /**
   * Share a rule with the workspace
   */
  shareRule(workspaceId: string, userId: string, rule: {
    name: string;
    content: string;
  }): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !this.canUserEdit(workspaceId, userId)) {
      return false;
    }

    const sharedRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: rule.name,
      content: rule.content,
      author: userId,
      version: 1,
      lastModified: Date.now()
    };

    workspace.data.sharedRules.push(sharedRule);
    workspace.updatedAt = Date.now();

    // Record sync event
    this.recordSyncEvent({
      workspaceId,
      type: 'rule_update',
      userId,
      data: { action: 'add', rule: sharedRule }
    });

    this.logger.info('Rule shared in workspace', { workspaceId, userId, ruleId: sharedRule.id });
    this.emit('ruleShared', { workspace, rule: sharedRule, userId });

    return true;
  }

  /**
   * Update a shared rule
   */
  updateSharedRule(workspaceId: string, userId: string, ruleId: string, updates: {
    name?: string;
    content?: string;
  }): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !this.canUserEdit(workspaceId, userId)) {
      return false;
    }

    const rule = workspace.data.sharedRules.find(r => r.id === ruleId);
    if (!rule) {
      return false;
    }

    // Check for edit conflicts
    if (this.hasEditConflict(workspaceId, ruleId, userId)) {
      this.handleEditConflict(workspaceId, ruleId, userId, updates);
      return false;
    }

    // Apply updates
    if (updates.name) rule.name = updates.name;
    if (updates.content) rule.content = updates.content;
    rule.version++;
    rule.lastModified = Date.now();
    workspace.updatedAt = Date.now();

    // Record sync event
    this.recordSyncEvent({
      workspaceId,
      type: 'rule_update',
      userId,
      data: { action: 'update', ruleId, updates, version: rule.version }
    });

    this.logger.info('Shared rule updated', { workspaceId, userId, ruleId, version: rule.version });
    this.emit('ruleUpdated', { workspace, rule, userId });

    return true;
  }

  /**
   * Add a collaborative note
   */
  addNote(workspaceId: string, userId: string, note: {
    content: string;
    tags?: string[];
  }): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.collaborators.includes(userId)) {
      return false;
    }

    const collaborativeNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: note.content,
      author: userId,
      timestamp: Date.now(),
      tags: note.tags || []
    };

    workspace.data.collaborativeNotes.push(collaborativeNote);
    workspace.updatedAt = Date.now();

    // Record sync event
    this.recordSyncEvent({
      workspaceId,
      type: 'note_add',
      userId,
      data: { note: collaborativeNote }
    });

    this.logger.debug('Note added to workspace', { workspaceId, userId, noteId: collaborativeNote.id });
    this.emit('noteAdded', { workspace, note: collaborativeNote, userId });

    return true;
  }

  /**
   * Share a learning pattern with the workspace
   */
  sharePattern(workspaceId: string, userId: string, pattern: {
    pattern: string;
    confidence: number;
  }): boolean {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace || !workspace.collaborators.includes(userId)) {
      return false;
    }

    // Check if pattern already exists
    const existingPattern = workspace.data.learningPatterns.find(p => p.pattern === pattern.pattern);
    if (existingPattern) {
      existingPattern.votes++;
      existingPattern.confidence = Math.max(existingPattern.confidence, pattern.confidence);
    } else {
      workspace.data.learningPatterns.push({
        pattern: pattern.pattern,
        confidence: pattern.confidence,
        sharedBy: userId,
        votes: 1
      });
    }

    workspace.updatedAt = Date.now();

    // Record sync event
    this.recordSyncEvent({
      workspaceId,
      type: 'pattern_share',
      userId,
      data: { pattern: pattern.pattern, confidence: pattern.confidence }
    });

    this.logger.debug('Pattern shared in workspace', { workspaceId, userId, pattern: pattern.pattern });
    this.emit('patternShared', { workspace, pattern, userId });

    return true;
  }

  /**
   * Get workspace information
   */
  getWorkspace(workspaceId: string): WorkspaceContext | null {
    return this.workspaces.get(workspaceId) || null;
  }

  /**
   * Get active session for workspace
   */
  getSession(workspaceId: string): CollaborationSession | null {
    return this.activeSessions.get(workspaceId) || null;
  }

  /**
   * Get workspaces for a user
   */
  getUserWorkspaces(userId: string): WorkspaceContext[] {
    const workspaces: WorkspaceContext[] = [];
    
    for (const workspace of this.workspaces.values()) {
      if (workspace.collaborators.includes(userId) || workspace.isPublic) {
        workspaces.push(workspace);
      }
    }

    return workspaces.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get recent sync events for a workspace
   */
  getRecentEvents(workspaceId: string, limit: number = 50): SyncEvent[] {
    return this.syncEvents
      .filter(event => event.workspaceId === workspaceId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Acquire edit lock for a resource
   */
  acquireLock(workspaceId: string, userId: string, resource: string): boolean {
    const session = this.activeSessions.get(workspaceId);
    if (!session || !this.canUserEdit(workspaceId, userId)) {
      return false;
    }

    const lockId = `${workspaceId}_${resource}`;
    const existingLock = session.lockState.get(lockId);

    // Check if resource is already locked by another user
    if (existingLock && existingLock.userId !== userId) {
      const lockAge = Date.now() - existingLock.timestamp;
      // Auto-release locks after 5 minutes of inactivity
      if (lockAge < 5 * 60 * 1000) {
        return false;
      }
    }

    // Acquire lock
    session.lockState.set(lockId, {
      userId,
      timestamp: Date.now(),
      resource
    });

    session.activeEditors.add(userId);

    this.logger.debug('Edit lock acquired', { workspaceId, userId, resource });
    this.emit('lockAcquired', { workspaceId, userId, resource });

    return true;
  }

  /**
   * Release edit lock
   */
  releaseLock(workspaceId: string, userId: string, resource: string): boolean {
    const session = this.activeSessions.get(workspaceId);
    if (!session) {
      return false;
    }

    const lockId = `${workspaceId}_${resource}`;
    const lock = session.lockState.get(lockId);

    if (lock && lock.userId === userId) {
      session.lockState.delete(lockId);
      
      // Check if user has any other locks
      const hasOtherLocks = Array.from(session.lockState.values()).some(l => l.userId === userId);
      if (!hasOtherLocks) {
        session.activeEditors.delete(userId);
      }

      this.logger.debug('Edit lock released', { workspaceId, userId, resource });
      this.emit('lockReleased', { workspaceId, userId, resource });

      return true;
    }

    return false;
  }

  /**
   * Send message to workspace chat
   */
  sendMessage(workspaceId: string, userId: string, message: string, type: 'chat' | 'system' | 'notification' = 'chat'): boolean {
    const session = this.activeSessions.get(workspaceId);
    if (!session) {
      return false;
    }

    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      message,
      timestamp: Date.now(),
      type
    };

    session.messageHistory.push(chatMessage);

    // Keep only last 100 messages
    if (session.messageHistory.length > 100) {
      session.messageHistory = session.messageHistory.slice(-100);
    }

    this.logger.debug('Message sent to workspace', { workspaceId, userId, type });
    this.emit('messageSent', { workspaceId, message: chatMessage });

    return true;
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats(workspaceId: string): {
    collaborators: number;
    activeUsers: number;
    sharedRules: number;
    notes: number;
    patterns: number;
    totalActivity: number;
  } | null {
    const workspace = this.workspaces.get(workspaceId);
    const session = this.activeSessions.get(workspaceId);

    if (!workspace) {
      return null;
    }

    const recentEvents = this.getRecentEvents(workspaceId, 1000);

    return {
      collaborators: workspace.collaborators.length,
      activeUsers: session ? session.participants.filter(p => p.isActive).length : 0,
      sharedRules: workspace.data.sharedRules.length,
      notes: workspace.data.collaborativeNotes.length,
      patterns: workspace.data.learningPatterns.length,
      totalActivity: recentEvents.length
    };
  }

  /**
   * Export workspace data
   */
  exportWorkspace(workspaceId: string): WorkspaceContext | null {
    const workspace = this.workspaces.get(workspaceId);
    return workspace ? { ...workspace } : null;
  }

  /**
   * Import workspace data
   */
  importWorkspace(workspaceData: WorkspaceContext): boolean {
    try {
      // Validate workspace data
      if (!workspaceData.id || !workspaceData.name || !workspaceData.owner) {
        return false;
      }

      // Check if workspace already exists
      if (this.workspaces.has(workspaceData.id)) {
        return false;
      }

      this.workspaces.set(workspaceData.id, workspaceData);
      
      this.logger.info('Workspace imported', { workspaceId: workspaceData.id, name: workspaceData.name });
      this.emit('workspaceImported', workspaceData);

      return true;
    } catch (error) {
      this.logger.error('Failed to import workspace', error as Error);
      return false;
    }
  }

  /**
   * Check if user can edit in workspace
   */
  private canUserEdit(workspaceId: string, userId: string): boolean {
    const workspace = this.workspaces.get(workspaceId);
    const session = this.activeSessions.get(workspaceId);

    if (!workspace || !workspace.settings.allowEditing) {
      return false;
    }

    if (!workspace.collaborators.includes(userId)) {
      return false;
    }

    if (session) {
      const participant = session.participants.find(p => p.userId === userId);
      return participant ? participant.role !== 'viewer' : false;
    }

    return true;
  }

  /**
   * Check for edit conflicts
   */
  private hasEditConflict(workspaceId: string, resourceId: string, userId: string): boolean {
    const session = this.activeSessions.get(workspaceId);
    if (!session) {
      return false;
    }

    const lockId = `${workspaceId}_${resourceId}`;
    const lock = session.lockState.get(lockId);

    return lock ? lock.userId !== userId : false;
  }

  /**
   * Handle edit conflict
   */
  private handleEditConflict(workspaceId: string, resourceId: string, userId: string, proposedChanges: any): void {
    const conflictId = `conflict_${workspaceId}_${resourceId}_${Date.now()}`;
    
    const conflict: ConflictResolution = {
      id: conflictId,
      resourceType: 'rule',
      resourceId,
      conflictType: 'edit_conflict',
      participants: [userId],
      proposedChanges: [{
        userId,
        changes: proposedChanges,
        timestamp: Date.now()
      }]
    };

    this.pendingConflicts.set(conflictId, conflict);

    this.logger.warn('Edit conflict detected', { workspaceId, resourceId, userId });
    this.emit('conflictDetected', conflict);
  }

  /**
   * Record sync event
   */
  private recordSyncEvent(event: Omit<SyncEvent, 'id' | 'timestamp' | 'version'>): void {
    const syncEvent: SyncEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      version: this.syncEvents.length + 1,
      ...event
    };

    this.syncEvents.push(syncEvent);

    // Keep only recent events
    if (this.syncEvents.length > 10000) {
      this.syncEvents = this.syncEvents.slice(-5000);
    }

    this.emit('syncEvent', syncEvent);
  }

  /**
   * Start sync timer for real-time updates
   */
  private startSyncTimer(): void {
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 5000); // Sync every 5 seconds
  }

  /**
   * Perform synchronization across active sessions
   */
  private performSync(): void {
    for (const [workspaceId, session] of this.activeSessions) {
      // Update participant activity status
      const now = Date.now();
      for (const participant of session.participants) {
        participant.isActive = (now - participant.lastActivity) < 30000; // 30 seconds
      }

      // Auto-release old locks
      for (const [lockId, lock] of session.lockState) {
        if ((now - lock.timestamp) > 5 * 60 * 1000) { // 5 minutes
          session.lockState.delete(lockId);
          this.logger.debug('Auto-released expired lock', { workspaceId, lockId, userId: lock.userId });
        }
      }
    }
  }

  /**
   * Start cleanup timer for old data
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Cleanup old data and inactive sessions
   */
  private performCleanup(): void {
    const now = Date.now();
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours

    // Remove old sync events
    const beforeCount = this.syncEvents.length;
    this.syncEvents = this.syncEvents.filter(event => event.timestamp >= cutoff);
    
    if (this.syncEvents.length < beforeCount) {
      this.logger.debug('Cleaned up old sync events', { 
        removed: beforeCount - this.syncEvents.length,
        remaining: this.syncEvents.length 
      });
    }

    // Remove inactive sessions
    let removedSessions = 0;
    for (const [workspaceId, session] of this.activeSessions) {
      const hasActiveParticipants = session.participants.some(p => p.isActive);
      if (!hasActiveParticipants) {
        this.activeSessions.delete(workspaceId);
        removedSessions++;
      }
    }

    if (removedSessions > 0) {
      this.logger.debug('Cleaned up inactive sessions', { removed: removedSessions });
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.workspaces.clear();
    this.activeSessions.clear();
    this.syncEvents = [];
    this.pendingConflicts.clear();
    this.removeAllListeners();

    this.logger.info('Collaboration Service destroyed');
  }
}

// Global collaboration service instance
export const collaborationService = (logger: Logger) => new CollaborationService(logger);