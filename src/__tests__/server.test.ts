// Basic smoke tests for MCP schemas
import { FigmaContextSchema, ReactCodeGenerationSchema } from '../types/mcp';

describe('MCP Foundation', () => {
  it('should validate Figma context schema correctly', () => {
    const validInput = {
      url: 'https://figma.com/file/test',
      options: { includeVariants: true }
    };
    
    const result = FigmaContextSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate React code generation schema', () => {
    const validInput = {
      figmaData: { test: 'data' },
      preferences: { typescript: true, styling: 'styled-components' }
    };
    
    const result = ReactCodeGenerationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL in Figma context', () => {
    const invalidInput = {
      url: 'not-a-url'
    };
    
    const result = FigmaContextSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});
