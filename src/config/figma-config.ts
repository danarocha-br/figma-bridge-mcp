import { z } from 'zod';

export const FigmaConfigSchema = z.object({
  // MCP Server configuration
  mcpServer: z.object({
    url: z.string().url().default('http://127.0.0.1:3845/sse'),
    timeout: z.number().min(1000).max(60000).default(30000),
    retryAttempts: z.number().min(0).max(10).default(3),
  }),

  // Caching configuration
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().min(60000).max(3600000).default(300000), // 5 minutes default
    maxSize: z.number().min(10).max(1000).default(100),
  }),

  // Authentication configuration
  auth: z.object({
    // Note: Figma MCP server handles auth through desktop app
    requireDesktopApp: z.boolean().default(true),
    validateConnection: z.boolean().default(true),
  }),

  // Default generation preferences
  defaults: z.object({
    framework: z.enum(['react', 'vue', 'angular', 'html']).default('react'),
    styling: z
      .enum(['tailwind', 'css-modules', 'styled-components', 'emotion'])
      .default('styled-components'),
    typescript: z.boolean().default(true),
    includeImages: z.boolean().default(true),
    includeVariables: z.boolean().default(true),
  }),
});

export type FigmaConfig = z.infer<typeof FigmaConfigSchema>;

export const DEFAULT_FIGMA_CONFIG: FigmaConfig = {
  mcpServer: {
    url: 'http://127.0.0.1:3845/sse',
    timeout: 30000,
    retryAttempts: 3,
  },
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100,
  },
  auth: {
    requireDesktopApp: true,
    validateConnection: true,
  },
  defaults: {
    framework: 'react',
    styling: 'styled-components',
    typescript: true,
    includeImages: true,
    includeVariables: true,
  },
};

/**
 * Load Figma configuration from environment variables or use defaults
 */
export function loadFigmaConfig(overrides?: Partial<FigmaConfig>): FigmaConfig {
  const config = {
    ...DEFAULT_FIGMA_CONFIG,
    ...overrides,
  };

  // Override with environment variables if available
  if (process.env.FIGMA_MCP_SERVER_URL) {
    config.mcpServer.url = process.env.FIGMA_MCP_SERVER_URL;
  }

  if (process.env.FIGMA_MCP_TIMEOUT) {
    config.mcpServer.timeout = parseInt(process.env.FIGMA_MCP_TIMEOUT, 10);
  }

  if (process.env.FIGMA_CACHE_TTL) {
    config.cache.ttl = parseInt(process.env.FIGMA_CACHE_TTL, 10);
  }

  return FigmaConfigSchema.parse(config);
}

/**
 * Validate Figma configuration
 */
export function validateFigmaConfig(config: unknown): FigmaConfig {
  return FigmaConfigSchema.parse(config);
}

/**
 * Get authentication status for Figma integration
 */
export interface FigmaAuthStatus {
  isAuthenticated: boolean;
  method: 'desktop-app' | 'api-token' | 'none';
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
}

export function getAuthStatus(): FigmaAuthStatus {
  // For now, authentication is handled through Figma desktop app
  // Future versions could support API tokens

  return {
    isAuthenticated: true, // Will be verified at runtime
    method: 'desktop-app',
    status: 'connected', // Will be tested during connection
    message: 'Authentication handled by Figma desktop app',
  };
}
