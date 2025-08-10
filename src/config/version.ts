/**
 * Centralized version management for Optix
 * This file reads version from package.json and provides it to the entire application
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, '../..');

let cachedVersion: string | null = null;

/**
 * Get the current version from package.json
 * Falls back to a default version if package.json cannot be read
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    const packagePath = join(PACKAGE_ROOT, 'package.json');
    const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
    const version = packageData.version || '5.2.1';
    cachedVersion = version;
    return version;
  } catch (error) {
    console.warn('Warning: Could not read package.json version, using fallback');
    const fallbackVersion = '5.2.1';
    cachedVersion = fallbackVersion;
    return fallbackVersion;
  }
}

/**
 * Get version info object with additional metadata
 */
export function getVersionInfo() {
  const version = getVersion();
  return {
    version,
    name: 'Optivise',
    fullName: `Optivise v${version}`,
    description: 'The Ultimate Optimizely Development Assistant with AI-powered features',
    features: [
      'Zero-config AI setup with automatic API key detection',
      'Five specialized MCP tools for comprehensive development support',
      'Real-time coding assistance with error prevention',
      'AI-powered documentation search with vector database',
      'Jira ticket implementation guidance',
      'Intelligent bug fixing assistance',
      'Local learning system with privacy-first approach',
      'Daily Optimizely.com documentation sync'
    ]
  };
}

/**
 * Reset cached version (useful for testing)
 */
export function resetVersionCache(): void {
  cachedVersion = null;
}