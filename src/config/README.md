# OptiDevDoc Configuration System

## Overview

The OptiDevDoc configuration system has been centralized to provide a single source of truth for all configuration options. This new system replaces the previous approach of having multiple configuration files with overlapping responsibilities.

## Configuration Files

### Main Files

- `unified-config.ts`: The core of the new configuration system, providing a singleton `Config` instance that manages all configuration options.
- `index.ts`: Entry point that exports the unified configuration system and provides backward compatibility with the old configuration files.
- `migration-guide.md`: Detailed guide on how to migrate from the old configuration system to the new one.

### Supporting Files (Legacy)

These files are kept for backward compatibility but should be considered deprecated:

- `constants.ts`: Previously contained hardcoded constants and environment variable access.
- `default.ts`: Previously contained default configuration values.
- `env.ts`: Previously loaded environment variables from `.env` files.
- `config-manager.ts`: Previously provided a configuration manager class.
- `product-aware-config.ts`: Previously contained product-aware configuration.

## Environment Variables

The configuration system loads environment variables from the following locations (in order of precedence):

1. `.env` file in the project root (legacy support)
2. `config/{NODE_ENV}.env` file (e.g., `config/development.env`, `config/production.env`)
3. `config/default.env` (fallback)

## Usage

### Basic Usage

```typescript
import { Config } from './config';

// Get server port
const port = Config.getServerConfig().port;

// Get database configuration
const dbConfig = Config.getDatabaseConfig();

// Get feature flags
const features = Config.getFeatures();
if (features.productDetection) {
  // Product detection is enabled
}
```

### Backward Compatibility

For code that relies on the old configuration structure:

```typescript
import { APP_CONFIG, ENV } from './config';

// Access APP_CONFIG properties (from constants.ts)
console.log(APP_CONFIG.VERSION);

// Access ENV properties (from env.ts)
console.log(ENV.NODE_ENV);
```

## Configuration Methods

The `Config` singleton provides the following methods:

- `getConfig()`: Get the entire configuration object
- `getAppConfig()`: Get application metadata (name, version, etc.)
- `getServerConfig()`: Get server configuration (port, host, etc.)
- `getFeatures()`: Get feature flags
- `getMcpConfig()`: Get MCP configuration
- `getDatabaseConfig()`: Get database configuration
- `getCacheConfig()`: Get cache configuration
- `getLoggingConfig()`: Get logging configuration
- `getRemoteConfig()`: Get remote server configuration
- `getCrawlerConfig()`: Get crawler configuration
- `getRulesConfig()`: Get rules configuration
- `getProductsConfig()`: Get product configuration
- `getSearchConfig()`: Get search configuration
- `getAppConfigConstants()`: Get APP_CONFIG compatible object
- `getEnvConfig()`: Get environment variables
- `getServerConfigObject()`: Get ServerConfig compatible object

## Configuration Structure

The configuration is organized into the following sections:

### App Metadata

```typescript
app: {
  name: string;
  version: string;
  description: string;
  protocolVersion: string;
}
```

### Server Configuration

```typescript
server: {
  port: number;
  host: string;
  nodeEnv: string;
  cors: {
    enabled: boolean;
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}
```

### Feature Flags

```typescript
features: {
  productDetection: boolean;
  enhancedRules: boolean;
  debug: boolean;
  multiProduct: boolean;
  enhanced: boolean;
  cors: boolean;
}
```

### MCP Configuration

```typescript
mcp: {
  mode: string;
  serverMode: string;
  tools: {
    search: string;
    pattern: string;
    bugAnalysis: string;
    rules: string;
    config: string;
  };
}
```

### Database Configuration

```typescript
database: {
  type: string;
  path: string;
  maxConnections: number;
}
```

### Cache Configuration

```typescript
cache: {
  enabled: boolean;
  type: string;
  ttl: number;
  maxSize: number;
}
```

### Logging Configuration

```typescript
logging: {
  level: string;
  file: {
    enabled: boolean;
    path: string;
    maxSize: string;
    maxFiles: number;
  };
  console: {
    enabled: boolean;
    colorize: boolean;
  };
}
```

### Remote Server Configuration

```typescript
remote: {
  server: string;
}
```

### Crawler Configuration

```typescript
crawler: {
  enabled: boolean;
  intervalHours: number;
  maxConcurrency: number;
  sources?: any[];
}
```

### Rules Configuration

```typescript
rules: {
  path: string;
}
```

### Product Configuration

```typescript
products: {
  supported: string[];
}
```

## Benefits of the New System

1. **Single Source of Truth**: All configuration is managed in one place
2. **Type Safety**: Better TypeScript support with proper types
3. **Consistency**: Configuration is loaded in a consistent way
4. **Flexibility**: Easy to add new configuration options
5. **Testability**: Easier to mock configuration for testing

## Migration

See the [Migration Guide](./migration-guide.md) for detailed instructions on how to migrate from the old configuration system to the new one. 