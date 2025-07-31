/**
 * Configuration System Index
 * 
 * This file serves as the main entry point for the configuration system.
 */

// Export the configuration system
export { default as Config } from './config';

// Export configuration types
export type { ServerConfig, DeepPartial } from '../types/index';

// Export configuration constants
export { OptimizelyProduct } from '../types/index';

// Default export is the configuration system
import { Config } from './config';
export default Config; 