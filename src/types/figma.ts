import { z } from 'zod';

// Figma MCP Server types based on official documentation
export const FigmaSelectionSchema = z.object({
  url: z.string(),
  nodeId: z.string().optional(),
  type: z.enum(['frame', 'component', 'instance', 'group']).optional(),
});

export const FigmaCodeGenerationOptionsSchema = z.object({
  framework: z.enum(['react', 'vue', 'angular', 'html']).default('react'),
  styling: z.enum(['tailwind', 'css-modules', 'styled-components', 'emotion']).default('tailwind'),
  typescript: z.boolean().default(true),
  includeImages: z.boolean().default(true),
  includeVariables: z.boolean().default(true),
});

export const FigmaVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['color', 'float', 'string', 'boolean']),
  value: z.any(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const FigmaComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  properties: z.record(z.any()).optional(),
  variants: z.array(z.any()).optional(),
});

export const FigmaCodeConnectMapSchema = z.object({
  componentId: z.string(),
  codeLocation: z.string().optional(),
  props: z.record(z.any()).optional(),
  examples: z.array(z.string()).optional(),
});

// Type exports first
export type FigmaSelection = z.infer<typeof FigmaSelectionSchema>;
export type FigmaCodeGenerationOptions = z.infer<typeof FigmaCodeGenerationOptionsSchema>;
export type FigmaVariable = z.infer<typeof FigmaVariableSchema>;
export type FigmaComponent = z.infer<typeof FigmaComponentSchema>;
export type FigmaCodeConnectMap = z.infer<typeof FigmaCodeConnectMapSchema>;

// Figma MCP Server response types
export interface FigmaGetCodeResponse {
  code: string;
  framework: string;
  styling: string;
  components: FigmaComponent[];
  variables: FigmaVariable[];
  assets?: {
    images: Array<{ url: string; name: string; id: string }>;
    icons: Array<{ url: string; name: string; id: string }>;
  };
}

export interface FigmaGetVariableDefsResponse {
  variables: FigmaVariable[];
  collections: Array<{
    id: string;
    name: string;
    variables: FigmaVariable[];
  }>;
}

export interface FigmaGetCodeConnectMapResponse {
  mappings: FigmaCodeConnectMap[];
  coverage: number;
  unmappedComponents: FigmaComponent[];
}

export interface FigmaGetImageResponse {
  url: string;
  format: 'png' | 'jpg' | 'svg';
  scale: number;
}

// Client configuration
export interface FigmaClientConfig {
  serverUrl: string;
  timeout: number;
  retryAttempts: number;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export const DEFAULT_FIGMA_CLIENT_CONFIG: FigmaClientConfig = {
  serverUrl: 'http://127.0.0.1:3845',
  timeout: 120000, // 120 seconds for complex frames
  retryAttempts: 1, // Reduce retries to avoid background noise
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
};

// Error types
export class FigmaClientError extends Error {
  constructor(
    message: string,
    // eslint-disable-next-line no-unused-vars
    public code: string,
    // eslint-disable-next-line no-unused-vars
    public statusCode?: number
  ) {
    super(message);
    this.name = 'FigmaClientError';
  }
}

export class FigmaServerUnavailableError extends FigmaClientError {
  constructor() {
    super(
      'Figma MCP server is not available. Please ensure Figma desktop app is running.',
      'SERVER_UNAVAILABLE',
      503
    );
  }
}

export class FigmaAuthenticationError extends FigmaClientError {
  constructor() {
    super('Authentication failed. Please check your Figma permissions.', 'AUTH_FAILED', 401);
  }
}
