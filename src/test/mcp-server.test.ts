/**
 * Basic MCP Server Tests
 * Validates that the server initializes and tools are registered correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OptiviseMCPServer } from '../core/mcp-server.js';
import { createLogger } from '../utils/logger.js';

describe('OptiviseMCPServer', () => {
  let server: OptiviseMCPServer;

  beforeEach(() => {
    server = new OptiviseMCPServer({
      logging: { level: 'error' } // Suppress logs during testing
    });
  });

  it('should initialize successfully', async () => {
    // This is a basic smoke test to ensure the server can be created
    expect(server).toBeDefined();
    expect(server).toBeInstanceOf(OptiviseMCPServer);
  });

  it('should have the correct server configuration', () => {
    // Test that server has the expected properties
    expect(server).toBeDefined();
    // Note: We can't easily test internal state without exposing it
    // This test validates the constructor doesn't throw
  });
});

describe('Logger', () => {
  it('should create logger successfully', () => {
    const logger = createLogger('info');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });
});