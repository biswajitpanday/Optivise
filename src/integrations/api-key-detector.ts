/**
 * API Key Detection Service
 * Automatically detects and securely handles API keys from various IDE configurations
 * Supports Cursor, VSCode, JetBrains IDEs, and environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { platform } from 'os';
import fetch from 'node-fetch';

export interface APIKeySource {
  source: 'cursor' | 'vscode' | 'jetbrains' | 'environment' | 'manual';
  type: 'openai' | 'anthropic' | 'github-copilot' | 'other';
  keyName: string;
  filePath?: string;
  environmentVar?: string;
  isValid?: boolean;
}

export interface APIKeyDetectionResult {
  found: APIKeySource[];
  recommended?: APIKeySource;
  hasOpenAI: boolean;
  hasAnthropic: boolean;
  requiresPermission: boolean;
}

export interface APIKeyPermissionRequest {
  sources: APIKeySource[];
  reason: string;
  usage: string[];
  privacy: string[];
}

export class APIKeyDetector {
  private userHome: string;
  private osType: string;

  constructor() {
    this.userHome = homedir();
    this.osType = platform();
  }

  /**
   * Detect all available API keys from various sources
   */
  async detectAPIKeys(): Promise<APIKeyDetectionResult> {
    const foundSources: APIKeySource[] = [];

    // Detect from environment variables
    const envSources = this.detectEnvironmentVariables();
    foundSources.push(...envSources);

    // Detect from Cursor IDE
    const cursorSources = await this.detectCursorKeys();
    foundSources.push(...cursorSources);

    // Detect from VS Code
    const vscodeSources = await this.detectVSCodeKeys();
    foundSources.push(...vscodeSources);

    // Detect from JetBrains IDEs
    const jetbrainsSources = await this.detectJetBrainsKeys();
    foundSources.push(...jetbrainsSources);

    const result: APIKeyDetectionResult = {
      found: foundSources,
      hasOpenAI: foundSources.some(s => s.type === 'openai'),
      hasAnthropic: foundSources.some(s => s.type === 'anthropic'),
      requiresPermission: foundSources.length > 0
    };

    // Recommend the best key to use
    result.recommended = this.selectRecommendedKey(foundSources);

    return result;
  }

  /**
   * Detect API keys from environment variables
   */
  private detectEnvironmentVariables(): APIKeySource[] {
    const sources: APIKeySource[] = [];
    const envVars = [
      { name: 'OPENAI_API_KEY', type: 'openai' as const },
      { name: 'ANTHROPIC_API_KEY', type: 'anthropic' as const },
      { name: 'CLAUDE_API_KEY', type: 'anthropic' as const },
      { name: 'CURSOR_API_KEY', type: 'openai' as const }
    ];

    for (const envVar of envVars) {
      if (process.env[envVar.name]) {
        sources.push({
          source: 'environment',
          type: envVar.type,
          keyName: envVar.name,
          environmentVar: envVar.name,
          isValid: this.validateKeyFormat(process.env[envVar.name]!, envVar.type)
        });
      }
    }

    return sources;
  }

  /**
   * Detect API keys from Cursor IDE configuration
   */
  private async detectCursorKeys(): Promise<APIKeySource[]> {
    const sources: APIKeySource[] = [];
    const cursorPaths = this.getCursorConfigPaths();

    for (const configPath of cursorPaths) {
      try {
        if (existsSync(configPath)) {
          const configContent = readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);

          // Check for OpenAI API key
          if (config['openai.api_key'] || config.openai?.apiKey) {
            const key = config['openai.api_key'] || config.openai?.apiKey;
            sources.push({
              source: 'cursor',
              type: 'openai',
              keyName: 'OpenAI API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(key, 'openai')
            });
          }

          // Check for Anthropic/Claude API key
          if (config['anthropic.api_key'] || config.claude?.apiKey) {
            const key = config['anthropic.api_key'] || config.claude?.apiKey;
            sources.push({
              source: 'cursor',
              type: 'anthropic',
              keyName: 'Anthropic API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(key, 'anthropic')
            });
          }

          // Check for Cursor-specific AI settings
          if (config['cursor.ai.api_key'] || config.cursor?.ai?.apiKey) {
            const key = config['cursor.ai.api_key'] || config.cursor?.ai?.apiKey;
            sources.push({
              source: 'cursor',
              type: 'openai',
              keyName: 'Cursor AI API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(key, 'openai')
            });
          }
        }
      } catch (error) {
        // Silent fail - configuration file might be corrupted or inaccessible
        console.debug(`Could not read Cursor config at ${configPath}:`, error);
      }
    }

    return sources;
  }

  /**
   * Detect API keys from VS Code configuration
   */
  private async detectVSCodeKeys(): Promise<APIKeySource[]> {
    const sources: APIKeySource[] = [];
    const vscodePaths = this.getVSCodeConfigPaths();

    for (const configPath of vscodePaths) {
      try {
        if (existsSync(configPath)) {
          const configContent = readFileSync(configPath, 'utf8');
          const config = JSON.parse(configContent);

          // Check for GitHub Copilot
          if (config['github.copilot.api_key'] || config.github?.copilot?.apiKey) {
            sources.push({
              source: 'vscode',
              type: 'github-copilot',
              keyName: 'GitHub Copilot',
              filePath: configPath,
              isValid: true // Copilot uses OAuth, assume valid if present
            });
          }

          // Check for OpenAI extension keys
          if (config['openai.api_key'] || config.openai?.apiKey) {
            const key = config['openai.api_key'] || config.openai?.apiKey;
            sources.push({
              source: 'vscode',
              type: 'openai',
              keyName: 'OpenAI API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(key, 'openai')
            });
          }

          // Check for other AI extensions
          if (config['claude.api_key'] || config.claude?.apiKey) {
            const key = config['claude.api_key'] || config.claude?.apiKey;
            sources.push({
              source: 'vscode',
              type: 'anthropic',
              keyName: 'Claude API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(key, 'anthropic')
            });
          }
        }
      } catch (error) {
        console.debug(`Could not read VS Code config at ${configPath}:`, error);
      }
    }

    return sources;
  }

  /**
   * Detect API keys from JetBrains IDEs
   */
  private async detectJetBrainsKeys(): Promise<APIKeySource[]> {
    const sources: APIKeySource[] = [];
    const jetbrainsPaths = this.getJetBrainsConfigPaths();

    for (const configPath of jetbrainsPaths) {
      try {
        if (existsSync(configPath)) {
          // JetBrains uses XML configuration files
          const configContent = readFileSync(configPath, 'utf8');
          
          // Simple XML parsing for API keys (basic implementation)
          const openAIMatch = configContent.match(/<option name="openai\.api\.key" value="([^"]+)"/);
          if (openAIMatch?.[1]) {
            sources.push({
              source: 'jetbrains',
              type: 'openai',
              keyName: 'OpenAI API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(openAIMatch[1], 'openai')
            });
          }

          const claudeMatch = configContent.match(/<option name="claude\.api\.key" value="([^"]+)"/);
          if (claudeMatch?.[1]) {
            sources.push({
              source: 'jetbrains',
              type: 'anthropic',
              keyName: 'Claude API Key',
              filePath: configPath,
              isValid: this.validateKeyFormat(claudeMatch[1], 'anthropic')
            });
          }
        }
      } catch (error) {
        console.debug(`Could not read JetBrains config at ${configPath}:`, error);
      }
    }

    return sources;
  }

  /**
   * Get potential Cursor IDE configuration paths
   */
  private getCursorConfigPaths(): string[] {
    const paths: string[] = [];
    
    switch (this.osType) {
      case 'win32':
        paths.push(
          join(this.userHome, 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json'),
          join(this.userHome, 'AppData', 'Local', 'Cursor', 'User', 'settings.json')
        );
        break;
      case 'darwin':
        paths.push(
          join(this.userHome, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
          join(this.userHome, '.cursor', 'settings.json')
        );
        break;
      default: // Linux and others
        paths.push(
          join(this.userHome, '.config', 'Cursor', 'User', 'settings.json'),
          join(this.userHome, '.cursor', 'settings.json')
        );
    }

    return paths;
  }

  /**
   * Get potential VS Code configuration paths
   */
  private getVSCodeConfigPaths(): string[] {
    const paths: string[] = [];
    
    switch (this.osType) {
      case 'win32':
        paths.push(
          join(this.userHome, 'AppData', 'Roaming', 'Code', 'User', 'settings.json')
        );
        break;
      case 'darwin':
        paths.push(
          join(this.userHome, 'Library', 'Application Support', 'Code', 'User', 'settings.json')
        );
        break;
      default: // Linux and others
        paths.push(
          join(this.userHome, '.config', 'Code', 'User', 'settings.json')
        );
    }

    return paths;
  }

  /**
   * Get potential JetBrains IDE configuration paths
   */
  private getJetBrainsConfigPaths(): string[] {
    const paths: string[] = [];
    const jetbrainsIdes = ['IntelliJIdea', 'WebStorm', 'PyCharm', 'PhpStorm', 'RubyMine'];
    
    switch (this.osType) {
      case 'win32':
        for (const ide of jetbrainsIdes) {
          paths.push(
            join(this.userHome, 'AppData', 'Roaming', 'JetBrains', ide, 'options', 'other.xml')
          );
        }
        break;
      case 'darwin':
        for (const ide of jetbrainsIdes) {
          paths.push(
            join(this.userHome, 'Library', 'Application Support', 'JetBrains', ide, 'options', 'other.xml')
          );
        }
        break;
      default: // Linux and others
        for (const ide of jetbrainsIdes) {
          paths.push(
            join(this.userHome, '.config', 'JetBrains', ide, 'options', 'other.xml')
          );
        }
    }

    return paths;
  }

  /**
   * Validate API key format
   */
  private validateKeyFormat(key: string, type: 'openai' | 'anthropic' | 'github-copilot' | 'other'): boolean {
    if (!key || key.length < 10) return false;

    switch (type) {
      case 'openai':
        return key.startsWith('sk-') && key.length > 40;
      case 'anthropic':
        return key.startsWith('sk-ant-') && key.length > 40;
      case 'github-copilot':
        return true; // OAuth token format varies
      default:
        return key.length > 20; // Generic validation
    }
  }

  /**
   * Select the best API key to recommend for use
   */
  private selectRecommendedKey(sources: APIKeySource[]): APIKeySource | undefined {
    if (sources.length === 0) return undefined;

    // Priority order: OpenAI > Anthropic > GitHub Copilot > Others
    const priorityOrder = ['openai', 'anthropic', 'github-copilot', 'other'];
    
    for (const type of priorityOrder) {
      const found = sources.find(s => s.type === type && s.isValid);
      if (found) return found;
    }

    // Return the first valid key if no priority match
    return sources.find(s => s.isValid) || sources[0];
  }

  /**
   * Create permission request for user consent
   */
  createPermissionRequest(sources: APIKeySource[]): APIKeyPermissionRequest {
    return {
      sources,
      reason: 'Optivise can use your existing AI API keys to provide enhanced features',
      usage: [
        'Generate embeddings for documentation search',
        'Provide intelligent code analysis and suggestions',
        'Enhance context relevance scoring',
        'Improve implementation guidance accuracy'
      ],
      privacy: [
        'API keys are never stored or logged by Optivise',
        'Keys are used only for AI service requests',
        'All processing remains local to your machine',
        'You can revoke permission at any time'
      ]
    };
  }

  /**
   * Test if an API key is working
   */
  async testAPIKey(source: APIKeySource, apiKey: string): Promise<boolean> {
    try {
      switch (source.type) {
        case 'openai':
          return await this.testOpenAIKey(apiKey);
        case 'anthropic':
          return await this.testAnthropicKey(apiKey);
        default:
          return false;
      }
    } catch (error) {
      console.debug(`API key test failed for ${source.keyName}:`, error);
      return false;
    }
  }

  /**
   * Test OpenAI API key
   */
  private async testOpenAIKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test Anthropic API key
   */
  private async testAnthropicKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      });
      return response.status !== 401; // Not unauthorized
    } catch (error) {
      return false;
    }
  }
}