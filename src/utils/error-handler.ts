import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from './logger.js';
import type { OptimizelyError } from '@/types/index.js';
import { ErrorCode as OptiErrorCode } from '@/types/index.js';

export class ErrorHandler {
  private logger: Logger;
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async handleToolError(
    error: unknown,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ content: { text: string }; isError: boolean }> {
    const errorId = this.generateErrorId();
    const optimizelyError = this.classifyError(error);

    this.logger.error(`[${errorId}] Tool error in ${toolName}`, {
      error: optimizelyError,
      args,
      toolName,
    });

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(toolName);
    if (circuitBreaker.isOpen()) {
      return {
        content: {
          text: `Service temporarily unavailable. Tool "${toolName}" is experiencing issues. Please try again later. Error ID: ${errorId}`,
        },
        isError: true,
      };
    }

    // Record failure
    circuitBreaker.recordFailure();

    // Return user-friendly error message
    const userMessage = this.getUserFriendlyMessage(optimizelyError);
    
    return {
      content: {
        text: `${userMessage}\n\nError ID: ${errorId}\nTool: ${toolName}`,
      },
      isError: true,
    };
  }

  classifyError(error: unknown): OptimizelyError {
    const timestamp = new Date().toISOString();

    if (error instanceof McpError) {
      return {
        name: 'McpError',
        message: error.message,
        code: this.mapMcpErrorCode(error.code),
        statusCode: this.getStatusCodeFromErrorCode(error.code),
        context: { mcpErrorCode: error.code },
        timestamp,
      };
    }

    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return {
          name: error.name,
          message: error.message,
          code: 'NETWORK_ERROR',
          statusCode: 503,
          context: { originalError: error.message },
          timestamp,
        };
      }

      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return {
          name: error.name,
          message: error.message,
          code: 'NETWORK_ERROR',
          statusCode: 408,
          context: { originalError: error.message },
          timestamp,
        };
      }

      // Parse errors
      if (error.message.includes('JSON') || error.message.includes('parse')) {
        return {
          name: error.name,
          message: error.message,
          code: 'PARSING_ERROR',
          statusCode: 422,
          context: { originalError: error.message },
          timestamp,
        };
      }

      // Generic error
      return {
        name: error.name,
        message: error.message,
        code: 'SEARCH_FAILED',
        statusCode: 500,
        context: { originalError: error.message },
        timestamp,
      };
    }

    // Unknown error type
    return {
      name: 'UnknownError',
      message: String(error),
      code: 'SEARCH_FAILED',
      statusCode: 500,
      context: { originalError: String(error) },
      timestamp,
    };
  }

  private mapMcpErrorCode(mcpErrorCode: ErrorCode): OptiErrorCode {
    switch (mcpErrorCode) {
      case ErrorCode.InvalidRequest:
        return OptiErrorCode.INVALID_QUERY;
      case ErrorCode.MethodNotFound:
        return OptiErrorCode.SEARCH_FAILED;
      case ErrorCode.InvalidParams:
        return OptiErrorCode.INVALID_QUERY;
      case ErrorCode.InternalError:
        return OptiErrorCode.SEARCH_FAILED;
      default:
        return OptiErrorCode.SEARCH_FAILED;
    }
  }

  private getStatusCodeFromErrorCode(errorCode: ErrorCode): number {
    switch (errorCode) {
      case ErrorCode.InvalidRequest:
      case ErrorCode.InvalidParams:
        return 400;
      case ErrorCode.MethodNotFound:
        return 404;
      case ErrorCode.InternalError:
        return 500;
      default:
        return 500;
    }
  }

  private getUserFriendlyMessage(error: OptimizelyError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return `Unable to fetch Optimizely documentation at the moment. The documentation service may be temporarily unavailable.`;
      
      case 'INVALID_QUERY':
        return `Invalid search query. Please provide a valid Optimizely product name or documentation topic.`;
      
      case 'DOCUMENT_NOT_FOUND':
        return `No documentation found for your query. Please try different search terms or check the product name.`;
      
      case 'PARSING_ERROR':
        return `Unable to process the documentation content. The documentation format may have changed.`;
      
      case 'RATE_LIMITED':
        return `Too many requests. Please wait a moment before trying again.`;
      
      case 'SEARCH_FAILED':
      default:
        return `Search failed. Please try again with different search terms or contact support if the issue persists.`;
    }
  }

  private generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private getCircuitBreaker(toolName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(toolName)) {
      this.circuitBreakers.set(toolName, new CircuitBreaker(toolName, this.logger));
    }
    return this.circuitBreakers.get(toolName)!;
  }
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly failureThreshold = 5;

  private readonly recoveryTimeout = 30000; // 30 seconds

  constructor(
    private readonly name: string,
    private readonly logger: Logger
  ) {}

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold && this.state === 'CLOSED') {
      this.state = 'OPEN';
      this.logger.warn(`Circuit breaker ${this.name} OPENED after ${this.failures} failures`);
    }
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.logger.info(`Circuit breaker ${this.name} CLOSED after successful operation`);
  }
} 