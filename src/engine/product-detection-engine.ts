import { promises as fs } from 'fs';
import * as path from 'path';
import type { Logger } from '../utils/logger.js';
import type { 
  ProductDetectionConfig, 
  ProductContext, 
  ProductDetectionMethod
} from '../types/index.js';
import { OptimizelyProduct } from '../types/index.js';

export class ProductDetectionEngine {
  private logger: Logger;
  private config: ProductDetectionConfig;
  private detectionCache: Map<string, ProductContext> = new Map();

  constructor(logger: Logger, config: ProductDetectionConfig) {
    this.logger = logger;
    this.config = config;
  }

  async detectProduct(projectPath: string = process.cwd()): Promise<ProductContext> {
    // Check cache first
    const cacheKey = projectPath;
    if (this.detectionCache.has(cacheKey)) {
      return this.detectionCache.get(cacheKey)!;
    }

    this.logger.info('Detecting Optimizely product context', { projectPath });

    const detectionResults: Array<{
      method: string;
      matches: string[];
      confidence: number;
    }> = [];

    let totalConfidence = 0;
    let weightSum = 0;
    const productScores: Map<OptimizelyProduct, number> = new Map();

    // Run all detection methods
    for (const method of this.config.methods) {
      try {
        const result = await this.runDetectionMethod(method, projectPath);
        detectionResults.push(result);

        if (result.confidence > 0) {
          weightSum += method.weight;
          totalConfidence += result.confidence * method.weight;

          // Update product scores
          for (const pattern of method.patterns) {
            if (result.matches.some(match => this.matchesPattern(match, pattern.pattern))) {
              const currentScore = productScores.get(pattern.product) || 0;
              productScores.set(pattern.product, currentScore + pattern.confidence * method.weight);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Detection method ${method.type} failed`, { error, projectPath });
      }
    }

    // Determine the most likely product
    let detectedProduct: OptimizelyProduct = this.config.fallbackProduct || OptimizelyProduct.CONFIGURED_COMMERCE;
    let maxScore = 0;

    for (const [product, score] of productScores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        detectedProduct = product;
      }
    }

    // Normalize confidence
    const normalizedConfidence = weightSum > 0 ? totalConfidence / weightSum : 0;

    const context: ProductContext = {
      detectedProduct,
      confidence: normalizedConfidence,
      detectionMethods: detectionResults,
      projectPath,
      version: await this.detectVersion(projectPath, detectedProduct) || undefined,
      configFiles: await this.findConfigFiles(projectPath, detectedProduct)
    };

    // Cache the result
    this.detectionCache.set(cacheKey, context);

    this.logger.info('Product detection completed', {
      product: detectedProduct,
      confidence: normalizedConfidence,
      methods: detectionResults.length
    });

    return context;
  }

  private async runDetectionMethod(
    method: ProductDetectionMethod, 
    projectPath: string
  ): Promise<{ method: string; matches: string[]; confidence: number }> {
    const matches: string[] = [];
    let methodConfidence = 0;

    switch (method.type) {
      case 'file-pattern':
        const fileMatches = await this.detectByFilePatterns(method, projectPath);
        matches.push(...fileMatches);
        methodConfidence = fileMatches.length > 0 ? 0.8 : 0;
        break;

      case 'directory-structure':
        const dirMatches = await this.detectByDirectoryStructure(method, projectPath);
        matches.push(...dirMatches);
        methodConfidence = dirMatches.length > 0 ? 0.7 : 0;
        break;

      case 'package-dependencies':
        const depMatches = await this.detectByDependencies(method, projectPath);
        matches.push(...depMatches);
        methodConfidence = depMatches.length > 0 ? 0.9 : 0;
        break;

      case 'config-files':
        const configMatches = await this.detectByConfigFiles(method, projectPath);
        matches.push(...configMatches);
        methodConfidence = configMatches.length > 0 ? 0.85 : 0;
        break;

      case 'user-explicit':
        // This would be set via user configuration or CLI flags
        const explicitProduct = process.env.OPTIMIZELY_PRODUCT;
        if (explicitProduct) {
          matches.push(`explicit:${explicitProduct}`);
          methodConfidence = 1.0;
        }
        break;
    }

    return {
      method: method.type,
      matches,
      confidence: methodConfidence
    };
  }

  private async detectByFilePatterns(
    method: ProductDetectionMethod, 
    projectPath: string
  ): Promise<string[]> {
    const matches: string[] = [];

    try {
      const files = await this.getFilesRecursively(projectPath, 2); // Max 2 levels deep
      
      for (const pattern of method.patterns) {
        const matchingFiles = files.filter(file => this.matchesPattern(file, pattern.pattern));
        if (matchingFiles.length > 0) {
          matches.push(...matchingFiles.map(f => `file:${f}`));
        }
      }
    } catch (error) {
      this.logger.warn('File pattern detection failed', { error, projectPath });
    }

    return matches;
  }

  private async detectByDirectoryStructure(
    method: ProductDetectionMethod,
    projectPath: string
  ): Promise<string[]> {
    const matches: string[] = [];

    try {
      const directories = await this.getDirectoriesRecursively(projectPath, 3); // Max 3 levels

      for (const pattern of method.patterns) {
        const matchingDirs = directories.filter(dir => this.matchesPattern(dir, pattern.pattern));
        if (matchingDirs.length > 0) {
          matches.push(...matchingDirs.map(d => `dir:${d}`));
        }
      }
    } catch (error) {
      this.logger.warn('Directory structure detection failed', { error, projectPath });
    }

    return matches;
  }

  private async detectByDependencies(
    method: ProductDetectionMethod,
    projectPath: string
  ): Promise<string[]> {
    const matches: string[] = [];

    try {
      // Check package.json for Node.js projects
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
          ...packageJson.peerDependencies
        };

        for (const pattern of method.patterns) {
          const matchingDeps = Object.keys(allDeps).filter(dep => 
            this.matchesPattern(dep, pattern.pattern)
          );
          if (matchingDeps.length > 0) {
            matches.push(...matchingDeps.map(d => `npm:${d}`));
          }
        }
      }

      // Check .csproj files for .NET projects
      const csprojFiles = await this.findFiles(projectPath, '*.csproj', 2);
      for (const csprojFile of csprojFiles) {
        const content = await fs.readFile(csprojFile, 'utf-8');
        for (const pattern of method.patterns) {
          if (content.includes(pattern.pattern)) {
            matches.push(`nuget:${pattern.pattern}`);
          }
        }
      }
    } catch (error) {
      this.logger.warn('Dependency detection failed', { error, projectPath });
    }

    return matches;
  }

  private async detectByConfigFiles(
    method: ProductDetectionMethod,
    projectPath: string
  ): Promise<string[]> {
    const matches: string[] = [];

    try {
      for (const pattern of method.patterns) {
        const configFiles = await this.findFiles(projectPath, pattern.pattern, 3);
        if (configFiles.length > 0) {
          matches.push(...configFiles.map(f => `config:${f}`));
        }
      }
    } catch (error) {
      this.logger.warn('Config file detection failed', { error, projectPath });
    }

    return matches;
  }

  private async detectVersion(projectPath: string, product: OptimizelyProduct): Promise<string | undefined> {
    try {
      switch (product) {
        case 'configured-commerce':
          // Look for InsiteCommerce version in .csproj or config files
          const csprojFiles = await this.findFiles(projectPath, '*.csproj', 2);
          for (const file of csprojFiles) {
            const content = await fs.readFile(file, 'utf-8');
            const versionMatch = content.match(/InsiteCommerce[^>]*Version[^>]*>([^<]+)</i);
            if (versionMatch) {
              return versionMatch[1];
            }
          }
          break;

        case 'cms-paas':
        case 'cms-saas':
          // Look for Episerver/Optimizely CMS version
          const packageJson = path.join(projectPath, 'package.json');
          if (await this.fileExists(packageJson)) {
            const pkg = JSON.parse(await fs.readFile(packageJson, 'utf-8'));
            if (pkg.dependencies?.['@episerver/platform-navigation']) {
              return pkg.dependencies['@episerver/platform-navigation'];
            }
          }
          break;
      }
    } catch (error) {
      this.logger.warn('Version detection failed', { error, product });
    }

    return undefined;
  }

  private async findConfigFiles(projectPath: string, product: OptimizelyProduct): Promise<string[]> {
    const configFiles: string[] = [];

    try {
      const commonConfigs = ['web.config', 'appsettings.json', 'episerver.config'];
      const productSpecificConfigs: Record<OptimizelyProduct, string[]> = {
        'configured-commerce': ['systemsettings.config', 'insite.config'],
        'cms-paas': ['episerver.config', 'web.config'],
        'cms-saas': ['package.json', 'next.config.js'],
        'cmp': ['campaign.config.json'],
        'odp': ['odp.config.json'],
        'experimentation': ['optimizely.config.json'],
        'commerce-connect': ['commerceconnect.config'],
        'search-navigation': ['search.config.json']
      };

      const allConfigs = [...commonConfigs, ...(productSpecificConfigs[product] || [])];
      
      for (const config of allConfigs) {
        const files = await this.findFiles(projectPath, config, 3);
        configFiles.push(...files);
      }
    } catch (error) {
      this.logger.warn('Config file search failed', { error, product });
    }

    return configFiles;
  }

  // Utility methods
  private async getFilesRecursively(dirPath: string, maxDepth: number): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string, depth: number) => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isFile()) {
            files.push(path.relative(dirPath, fullPath));
          } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDir(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Directory access error, skip silently
      }
    };

    await scanDir(dirPath, 0);
    return files;
  }

  private async getDirectoriesRecursively(dirPath: string, maxDepth: number): Promise<string[]> {
    const directories: string[] = [];
    
    const scanDir = async (dir: string, depth: number) => {
      if (depth > maxDepth) return;
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const fullPath = path.join(dir, entry.name);
            directories.push(path.relative(dirPath, fullPath));
            await scanDir(fullPath, depth + 1);
          }
        }
      } catch (error) {
        // Directory access error, skip silently
      }
    };

    await scanDir(dirPath, 0);
    return directories;
  }

  private async findFiles(dirPath: string, pattern: string, maxDepth: number): Promise<string[]> {
    const files = await this.getFilesRecursively(dirPath, maxDepth);
    return files.filter(file => this.matchesPattern(file, pattern));
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private matchesPattern(text: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  }

  /**
   * Get default detection configuration
   */
  static getDefaultConfig(): ProductDetectionConfig {
    return {
      enabled: true,
      fallbackProduct: 'configured-commerce',
      confidence: {
        threshold: 0.6,
        filePatternWeight: 0.8,
        directoryWeight: 0.7,
        dependencyWeight: 0.9,
        configWeight: 0.85
      },
      methods: [
        {
          type: 'package-dependencies',
          weight: 0.9,
          patterns: [
            {
              pattern: '*insite*',
              product: 'configured-commerce',
              confidence: 0.95,
              description: 'Insite Commerce dependency'
            },
            {
              pattern: '*episerver*',
              product: 'cms-paas',
              confidence: 0.9,
              description: 'Episerver CMS dependency'
            },
            {
              pattern: '*optimizely*cms*',
              product: 'cms-paas',
              confidence: 0.9,
              description: 'Optimizely CMS dependency'
            },
            {
              pattern: '*optimizely*experimentation*',
              product: 'experimentation',
              confidence: 0.95,
              description: 'Optimizely Experimentation SDK'
            }
          ]
        },
        {
          type: 'directory-structure',
          weight: 0.7,
          patterns: [
            {
              pattern: 'Extensions',
              product: 'configured-commerce',
              confidence: 0.8,
              description: 'Commerce Extensions directory'
            },
            {
              pattern: 'FrontEnd/modules/blueprints',
              product: 'configured-commerce',
              confidence: 0.9,
              description: 'Commerce blueprint directory'
            },
            {
              pattern: 'modules',
              product: 'cms-paas',
              confidence: 0.6,
              description: 'CMS modules directory'
            }
          ]
        },
        {
          type: 'file-pattern',
          weight: 0.8,
          patterns: [
            {
              pattern: '*.csproj',
              product: 'configured-commerce',
              confidence: 0.5,
              description: '.NET project file'
            },
            {
              pattern: '*Handler.cs',
              product: 'configured-commerce',
              confidence: 0.8,
              description: 'Commerce handler file'
            },
            {
              pattern: '*Pipeline.cs',
              product: 'configured-commerce',
              confidence: 0.8,
              description: 'Commerce pipeline file'
            },
            {
              pattern: '*.tsx',
              product: 'configured-commerce',
              confidence: 0.3,
              description: 'TypeScript React component'
            }
          ]
        },
        {
          type: 'config-files',
          weight: 0.85,
          patterns: [
            {
              pattern: 'systemsettings.config',
              product: 'configured-commerce',
              confidence: 0.95,
              description: 'Commerce system settings'
            },
            {
              pattern: 'episerver.config',
              product: 'cms-paas',
              confidence: 0.9,
              description: 'Episerver configuration'
            }
          ]
        }
      ]
    };
  }
} 