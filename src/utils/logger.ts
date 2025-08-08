/**
 * Logger Utility
 * Simple structured logging for Optivise
 */

import type { Logger } from '../types/index.js';
import { getCorrelationId } from './correlation.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class SimpleLogger implements Logger {
  private level: LogLevel;
  private readonly levelValues: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      ...meta
    } : meta;
    
    this.log('error', message, errorMeta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    // Silent mode for MCP - no output unless debug is explicitly enabled
    if (process.env.OPTIDEV_DEBUG !== 'true' && process.env.OPTIVISE_MODE !== 'server') {
      // In MCP mode, completely silent unless debug is enabled
      return;
    }
    
    // Always log debug messages when OPTIDEV_DEBUG is set
    if (process.env.OPTIDEV_DEBUG === 'true') {
      // Continue with logging regardless of level
    } else if (this.levelValues[level] < this.levelValues[this.level]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const corr = getCorrelationId();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(corr ? { correlationId: corr } : {}),
      ...(meta && Object.keys(meta).length > 0 ? { meta: this.redact(meta) } : {})
    };

    // Emit as compact JSON on stderr to avoid MCP stdout interference
    const output = JSON.stringify(logEntry);
    
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.error(output); // Use stderr for debug messages too
        break;
      default:
        console.error(output); // Use stderr for info messages to avoid interfering with MCP protocol
    }
  }

  private formatLogEntry(_entry: Record<string, unknown>): string {
    // Deprecated; kept for API compatibility
    return JSON.stringify(_entry);
  }

  private redact(obj: Record<string, unknown>): Record<string, unknown> {
    const json = JSON.stringify(obj, (_k, v) => v, 2);
    const redacted = json
      // redact obvious keys
      .replace(/(api[_-]?key"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2')
      .replace(/(authorization"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2')
      .replace(/(password"\s*:\s*")[^"]+(")/gi, '$1[REDACTED]$2')
      // redact bearer tokens
      .replace(/Bearer\s+[A-Za-z0-9-_\.]+/g, 'Bearer [REDACTED]')
      // redact email-like
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]');
    try {
      return JSON.parse(redacted);
    } catch {
      return obj;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

export { SimpleLogger };
export function createLogger(level: LogLevel = 'info'): Logger {
  return new SimpleLogger(level);
}