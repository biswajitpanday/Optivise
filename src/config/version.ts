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
    const version = packageData.version || '4.0.0';
    cachedVersion = version;
    return version;
  } catch (error) {
    console.warn('Warning: Could not read package.json version, using fallback');
    const fallbackVersion = '4.0.0';
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
    description: 'Intelligent MCP tool for Optimizely context analysis',
    features: [
      'Context analysis with relevance scoring',
      'Automatic product detection (11+ Optimizely products)', 
      'Curated responses with actionable steps',
      'Modern TypeScript architecture'
    ]
  };
}

/**
 * Reset cached version (useful for testing)
 */
export function resetVersionCache(): void {
  cachedVersion = null;
}