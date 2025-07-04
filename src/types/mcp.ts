import { z } from 'zod';

// Figma data schema for pre-extracted data from official Figma MCP
export const FigmaDataSchema = z.object({
  fileId: z.string(),
  nodeId: z.string().optional(),
  url: z.string(),
  code: z.string().nullable().optional(),
  components: z.array(z.any()).optional().default([]),
  variables: z.array(z.any()).optional().default([]),
  codeConnectMap: z.array(z.any()).optional().default([]),
  assets: z
    .object({
      images: z.array(z.any()).optional(),
      icons: z.array(z.any()).optional(),
    })
    .optional(),
});

// MCP Tool schemas for validation - supports both URL extraction and pre-extracted data
export const FigmaContextSchema = z
  .object({
    // Option 1: Provide URL for standalone extraction (fallback)
    url: z
      .string()
      .refine(
        (url) => {
          try {
            new URL(url);
            return url.includes('figma.com');
          } catch {
            return false;
          }
        },
        { message: 'Must be a valid Figma URL' }
      )
      .optional(),

    // Option 2: Provide pre-extracted Figma data (preferred for IDE integration)
    // Handle both undefined and empty objects from MCP Inspector
    figmaData: z
      .union([
        FigmaDataSchema,
        z.object({}).strict(), // Empty object from MCP Inspector
      ])
      .optional(),

    options: z
      .object({
        includeVariants: z.boolean().optional(),
        includeComponents: z.boolean().optional(),
        includeTokens: z.boolean().optional(),
        includeCode: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Check for valid figmaData (not empty object) or URL
      const hasValidFigmaData =
        data.figmaData && typeof data.figmaData === 'object' && 'fileId' in data.figmaData;
      return data.url || hasValidFigmaData;
    },
    { message: 'Either url or valid figmaData must be provided' }
  );

export const ReactCodeGenerationSchema = z.object({
  figmaData: z.any(), // Will be refined as we develop the Figma integration
  preferences: z.object({
    typescript: z.boolean().default(true),
    styling: z
      .enum(['styled-components', 'tailwind', 'css-modules', 'emotion'])
      .default('styled-components'),
    framework: z.enum(['react', 'nextjs']).default('react'),
  }),
});

export const ComponentMappingSchema = z.object({
  figmaComponents: z.array(z.any()),
  codeComponents: z.array(z.any()),
  threshold: z.number().min(0).max(1).default(0.85),
});

export const DesignSystemValidationSchema = z.object({
  code: z.string(),
  rules: z.array(z.enum(['token-usage', 'accessibility', 'performance', 'naming-conventions'])),
});

export const TokenSyncSchema = z.object({
  figmaTokens: z.array(z.any()),
  codeTokens: z.array(z.any()),
  strategy: z.enum(['merge', 'replace', 'validate']).default('merge'),
});

export const CodebaseAnalysisSchema = z.object({
  path: z.string(),
  framework: z.enum(['react', 'vue', 'angular', 'svelte']).default('react'),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
});

// Type exports
export type FigmaContextInput = z.infer<typeof FigmaContextSchema>;
export type ReactCodeGenerationInput = z.infer<typeof ReactCodeGenerationSchema>;
export type ComponentMappingInput = z.infer<typeof ComponentMappingSchema>;
export type DesignSystemValidationInput = z.infer<typeof DesignSystemValidationSchema>;
export type TokenSyncInput = z.infer<typeof TokenSyncSchema>;
export type CodebaseAnalysisInput = z.infer<typeof CodebaseAnalysisSchema>;

// Streaming Figma Context Schema for performance optimization
export const StreamingFigmaContextSchema = z
  .object({
    // Option 1: Provide URL for standalone extraction (fallback)
    url: z
      .string()
      .refine(
        (url) => {
          try {
            new URL(url);
            return url.includes('figma.com');
          } catch {
            return false;
          }
        },
        { message: 'Must be a valid Figma URL' }
      )
      .optional(),

    // Option 2: Provide pre-extracted Figma data (preferred for IDE integration)
    figmaData: z
      .union([
        FigmaDataSchema,
        z.object({}).strict(), // Empty object from MCP Inspector
      ])
      .optional(),

    options: z
      .object({
        includeVariants: z.boolean().optional(),
        includeComponents: z.boolean().optional(),
        includeTokens: z.boolean().optional(),
        includeCode: z.boolean().optional(),
        // NEW: Streaming options for performance optimization
        streamingEnabled: z.boolean().default(true),
        progressUpdates: z.boolean().default(true),
        timeoutStrategy: z.enum(['graceful', 'partial', 'fail']).default('graceful'),
        maxWaitTime: z.number().min(5000).max(60000).default(15000), // 15s max wait
      })
      .optional(),
  })
  .refine(
    (data) => {
      // Check for valid figmaData (not empty object) or URL
      const hasValidFigmaData =
        data.figmaData && typeof data.figmaData === 'object' && 'fileId' in data.figmaData;
      return data.url || hasValidFigmaData;
    },
    { message: 'Either url or valid figmaData must be provided' }
  );

export type StreamingFigmaContextInput = z.infer<typeof StreamingFigmaContextSchema>;

// MCP Tool result types
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ComponentInfo {
  name: string;
  path: string;
  props?: Record<string, any>;
  variants?: string[];
  category?: string;
  description?: string;
}

export interface DesignToken {
  name: string;
  value: string | number;
  type: 'color' | 'spacing' | 'typography' | 'border' | 'shadow' | 'size';
  category?: string;
  description?: string;
}
