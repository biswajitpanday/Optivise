import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { LoggingConfig } from '../types/index.js';

export class Logger {
  private logger: winston.Logger;

  constructor(config?: LoggingConfig) {
    const logConfig = config || {
      level: 'info',
      console: { enabled: true, colorize: true },
      file: { enabled: false, path: './logs', maxSize: '10m', maxFiles: '5' },
    };

    const transports: winston.transport[] = [];

    // Console transport
    if (logConfig.console.enabled) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            logConfig.console.colorize
              ? winston.format.colorize()
              : winston.format.uncolorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${level}]: ${message}${metaStr}`;
            })
          ),
        })
      );
    }

    // File transport with rotation
    if (logConfig.file?.enabled) {
      transports.push(
        new DailyRotateFile({
          dirname: logConfig.file.path,
          filename: 'optidevdoc-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: logConfig.file.maxSize,
          maxFiles: logConfig.file.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.json()
          ),
        })
      );
    }

    this.logger = winston.createLogger({
      level: logConfig.level,
      transports,
      exitOnError: false,
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  // For MCP server integration
  log(level: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.log(level, message, meta);
  }
} 