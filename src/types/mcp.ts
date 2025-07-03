import { z } from 'zod';

// MCP Tool schemas for validation
export const FigmaContextSchema = z.object({
  url: z.string().url(),
  options: z
    .object({
      includeVariants: z.boolean().optional(),
      includeComponents: z.boolean().optional(),
      includeTokens: z.boolean().optional(),
    })
    .optional(),
});

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
