/**
 * Version helper for bin/optix (CommonJS)
 * This file provides version info to the CLI executable
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '../..');
const PACKAGE_ROOT = join(__dirname, '../../..');

/**
 * Get version from package.json for CLI usage
 */
export function getPackageVersion() {
  try {
    const packagePath = join(PACKAGE_ROOT, 'package.json');
    const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
    return packageData.version;
  } catch (error) {
    console.error('Warning: Could not read package.json version, using fallback');
    return '4.0.0';
  }
}

/**
 * Get full version info for CLI display
 */
export function getVersionDisplay() {
  const version = getPackageVersion();
  return {
    version,
    name: 'Optivise',
    fullName: `Optivise v${version}`,
    description: 'Intelligent MCP tool for Optimizely context analysis',
    tagline: '🎯 Intelligent MCP tool for Optimizely context analysis',
    features: '📚 Products: Commerce, CMS, Experimentation, DXP, and more'
  };
}