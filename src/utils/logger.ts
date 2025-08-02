/**
 * Logger Utility
 * Simple structured logging for Optivise
 */

import type { Logger } from '../types/index.js';

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
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(meta && Object.keys(meta).length > 0 ? { meta } : {})
    };

    // Simple console output for Phase 1
    // In future phases, this could write to files, send to monitoring systems, etc.
    const output = this.formatLogEntry(logEntry);
    
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

  private formatLogEntry(entry: Record<string, unknown>): string {
    const { timestamp, level, message, meta } = entry;
    
    let output = `[${timestamp}] ${level}: ${message}`;
    
    if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
      output += ` ${JSON.stringify(meta)}`;
    }
    
    return output;
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