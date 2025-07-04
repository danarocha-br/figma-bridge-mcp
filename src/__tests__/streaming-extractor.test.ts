import { StreamingExtractor } from '../services/streaming-extractor';
import { FigmaClient } from '../clients/figma-client';
import { StreamingFigmaContextSchema } from '../types/mcp';
import { ExtractionProgress } from '../types/performance';
import { FigmaClientError, FigmaServerUnavailableError } from '../types/figma';

// Mock the FigmaClient
jest.mock('../clients/figma-client');
const MockedFigmaClient = FigmaClient as jest.MockedClass<typeof FigmaClient>;

describe('StreamingExtractor', () => {
  let extractor: StreamingExtractor;
  let mockFigmaClient: jest.Mocked<FigmaClient>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock FigmaClient instance
    mockFigmaClient = new MockedFigmaClient() as jest.Mocked<FigmaClient>;
    
    // Mock static method
    (MockedFigmaClient.parseFigmaUrl as jest.Mock) = jest.fn().mockReturnValue({
      fileId: 'test-file-id',
      nodeId: 'test-node-id',
    });

    // Setup default mock implementations
    mockFigmaClient.testConnection.mockResolvedValue(true);
    mockFigmaClient.getVariableDefinitions.mockResolvedValue({
      variables: [{ id: 'var1', name: 'primary-color', type: 'color', value: '#FF0000' }],
      collections: [],
    });
    mockFigmaClient.getCodeConnectMap.mockResolvedValue({
      mappings: [{ componentId: 'comp1', codeLocation: 'Button.tsx' }],
      coverage: 85,
      unmappedComponents: [],
    });
    mockFigmaClient.getCode.mockResolvedValue({
      code: 'export const TestComponent = () => <div>Test</div>;',
      framework: 'react',
      styling: 'styled-components',
      components: [{ id: 'comp1', name: 'TestComponent', type: 'component' }],
      variables: [],
      assets: { images: [], icons: [] },
    });

    extractor = new StreamingExtractor(mockFigmaClient);
  });

  describe('Schema Validation', () => {
    it('should validate streaming schema correctly with URL', () => {
      const validInput = {
        url: 'https://figma.com/file/123/test',
        options: { streamingEnabled: true, progressUpdates: true },
      };
      const result = StreamingFigmaContextSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate streaming schema with figmaData', () => {
      const validInput = {
        figmaData: {
          fileId: 'test-file-id',
          url: 'https://figma.com/file/123/test',
        },
        options: { timeoutStrategy: 'graceful', maxWaitTime: 10000 },
      };
      const result = StreamingFigmaContextSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid schema without URL or figmaData', () => {
      const invalidInput = {
        options: { streamingEnabled: true },
      };
      const result = StreamingFigmaContextSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should apply default values for streaming options', () => {
      const input = { url: 'https://figma.com/file/123/test' };
      const result = StreamingFigmaContextSchema.parse(input);
      
      expect(result.options?.streamingEnabled).toBe(true);
      expect(result.options?.progressUpdates).toBe(true);
      expect(result.options?.timeoutStrategy).toBe('graceful');
      expect(result.options?.maxWaitTime).toBe(15000);
    });
  });

  describe('Pre-extracted Data Handling', () => {
    it('should use pre-extracted figmaData without API calls', async () => {
      const input = {
        figmaData: {
          fileId: 'test-file-id',
          nodeId: 'test-node-id',
          url: 'https://figma.com/file/123/test',
          code: 'pre-extracted code',
          components: [{ id: 'comp1', name: 'PreExtracted' }],
          variables: [{ id: 'var1', name: 'color' }],
          codeConnectMap: [{ componentId: 'comp1' }],
        },
      };

      const progressUpdates: ExtractionProgress[] = [];
      const result = await extractor.extractWithProgress(input, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(true);
      expect(result.figmaData.code).toBe('pre-extracted code');
      expect(result.figmaData.components).toHaveLength(1);
      expect(mockFigmaClient.testConnection).not.toHaveBeenCalled();
      expect(progressUpdates).toHaveLength(1);
      expect(progressUpdates[0].stage).toBe('complete');
    });
  });

  describe('Parallel Extraction Logic', () => {
    it('should handle parallel extraction of variables and components', async () => {
      const input = { url: 'https://figma.com/file/123/test' };
      const progressUpdates: ExtractionProgress[] = [];

      const result = await extractor.extractWithProgress(input, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(true);
      expect(result.figmaData.variables).toHaveLength(1);
      expect(result.figmaData.codeConnectMap).toHaveLength(1);
      expect(result.figmaData.code).toBeDefined();

      // Should track progress through all stages
      const stages = progressUpdates.map(p => p.stage);
      expect(stages).toContain('variables');
      expect(stages).toContain('components');
      expect(stages).toContain('code');
      expect(stages).toContain('complete');
    });

    it('should continue with partial results when variables fail', async () => {
      mockFigmaClient.getVariableDefinitions.mockRejectedValue(new Error('Variables timeout'));
      
      const input = { url: 'https://figma.com/file/123/test' };
      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true); // Should still succeed with partial data
      expect(result.errors).toContain('Variables extraction: Error: Variables timeout');
      expect(result.figmaData.variables).toHaveLength(0);
      expect(result.figmaData.codeConnectMap).toHaveLength(1); // Components should still work
    });

    it('should continue with partial results when components fail', async () => {
      mockFigmaClient.getCodeConnectMap.mockRejectedValue(new Error('Components timeout'));
      
      const input = { url: 'https://figma.com/file/123/test' };
      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true);
      expect(result.errors).toContain('Components extraction: Error: Components timeout');
      expect(result.figmaData.variables).toHaveLength(1); // Variables should still work
      expect(result.figmaData.codeConnectMap).toHaveLength(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should handle graceful timeout strategy', async () => {
      // Mock slow code generation
      mockFigmaClient.getCode.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          code: 'slow code',
          framework: 'react',
          styling: 'tailwind',
          components: [],
          variables: [],
        }), 20000))
      );

      const input = {
        url: 'https://figma.com/file/123/test',
        options: { 
          streamingEnabled: true,
          progressUpdates: true,
          maxWaitTime: 1000, 
          timeoutStrategy: 'graceful' as const 
        },
      };

      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true); // Graceful degradation
      expect(result.figmaData.code).toBeNull();
      expect(result.warnings).toContain(expect.stringContaining('Code generation timed out'));
      expect(result.figmaData.variables).toHaveLength(1); // Partial results available
    });

    it('should handle partial timeout strategy', async () => {
      mockFigmaClient.getCode.mockRejectedValue(new Error('Code generation timeout'));

      const input = {
        url: 'https://figma.com/file/123/test',
        options: { 
          streamingEnabled: true,
          progressUpdates: true,
          maxWaitTime: 15000,
          timeoutStrategy: 'partial' as const 
        },
      };

      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('timed out'));
    });

    it('should handle fail timeout strategy', async () => {
      mockFigmaClient.getCode.mockRejectedValue(new Error('Code generation timeout'));

      const input = {
        url: 'https://figma.com/file/123/test',
        options: { 
          streamingEnabled: true,
          progressUpdates: true,
          maxWaitTime: 15000,
          timeoutStrategy: 'fail' as const 
        },
      };

      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true); // StreamingExtractor doesn't fail completely
      expect(result.errors).toContain(expect.stringContaining('Code generation timeout'));
    });
  });

  describe('Connection Handling', () => {
    it('should handle server unavailable error', async () => {
      mockFigmaClient.testConnection.mockResolvedValue(false);

      const input = { 
        url: 'https://figma.com/file/123/test',
        options: {
          streamingEnabled: true,
          progressUpdates: true,
          timeoutStrategy: 'graceful' as const,
          maxWaitTime: 15000
        }
      };

      await expect(extractor.extractWithProgress(input, () => {}))
        .rejects.toThrow(FigmaServerUnavailableError);
    });

    it('should handle invalid URL error', async () => {
      (MockedFigmaClient.parseFigmaUrl as jest.Mock).mockImplementation(() => {
        throw new FigmaClientError('Invalid Figma URL format', 'INVALID_URL');
      });

      const input = { 
        url: 'invalid-url',
        options: {
          streamingEnabled: true,
          progressUpdates: true,
          timeoutStrategy: 'graceful' as const,
          maxWaitTime: 15000
        }
      };

      await expect(extractor.extractWithProgress(input, () => {}))
        .rejects.toThrow('Invalid Figma URL format');
    });
  });

  describe('Progress Tracking', () => {
    it('should provide detailed progress updates', async () => {
      const input = { url: 'https://figma.com/file/123/test' };
      const progressUpdates: ExtractionProgress[] = [];

      await extractor.extractWithProgress(input, (progress) => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Should have progress for each stage
      const stages = new Set(progressUpdates.map(p => p.stage));
      expect(stages.has('variables')).toBe(true);
      expect(stages.has('code')).toBe(true);
      expect(stages.has('complete')).toBe(true);

      // Final progress should be complete
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.stage).toBe('complete');
      expect(finalProgress.percentage).toBe(100);
    });

    it('should include timing information in progress', async () => {
      const input = { url: 'https://figma.com/file/123/test' };
      const progressUpdates: ExtractionProgress[] = [];

      await extractor.extractWithProgress(input, (progress) => {
        progressUpdates.push(progress);
      });

      progressUpdates.forEach(progress => {
        expect(progress.duration).toBeGreaterThan(0);
        expect(typeof progress.message).toBe('string');
        expect(progress.percentage).toBeGreaterThanOrEqual(0);
        expect(progress.percentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should collect comprehensive performance metrics', async () => {
      const input = { url: 'https://figma.com/file/123/test' };
      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.performance).toBeDefined();
      expect(result.performance.totalDuration).toBeGreaterThan(0);
      expect(result.performance.variablesDuration).toBeGreaterThanOrEqual(0);
      expect(result.performance.componentsDuration).toBeGreaterThanOrEqual(0);
      expect(result.performance.codeDuration).toBeGreaterThanOrEqual(0);
      expect(typeof result.performance.timeoutOccurred).toBe('boolean');
      expect(typeof result.performance.cacheHits).toBe('number');
      expect(typeof result.performance.retryAttempts).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing URL and figmaData', async () => {
      const input = {} as any;

      await expect(extractor.extractWithProgress(input, () => {}))
        .rejects.toThrow();
    });

    it('should handle null code generation gracefully', async () => {
      mockFigmaClient.getCode.mockResolvedValue({
        code: null as any,
        framework: 'react',
        styling: 'tailwind',
        components: [],
        variables: [],
      });

      const input = { 
        url: 'https://figma.com/file/123/test',
        options: {
          streamingEnabled: true,
          progressUpdates: true,
          timeoutStrategy: 'graceful' as const,
          maxWaitTime: 15000
        }
      };
      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true);
      expect(result.figmaData.code).toBeNull();
      expect(result.warnings).toContain(expect.stringContaining('returned null'));
    });

    it('should skip code generation when includeCode is false', async () => {
      const input = {
        url: 'https://figma.com/file/123/test',
        options: { 
          streamingEnabled: true,
          progressUpdates: true,
          timeoutStrategy: 'graceful' as const,
          maxWaitTime: 15000,
          includeCode: false 
        },
      };

      const progressUpdates: ExtractionProgress[] = [];
      const result = await extractor.extractWithProgress(input, (progress) => {
        progressUpdates.push(progress);
      });

      expect(result.success).toBe(true);
      expect(mockFigmaClient.getCode).not.toHaveBeenCalled();
      
      const codeProgressUpdate = progressUpdates.find(p => p.stage === 'code');
      expect(codeProgressUpdate?.message).toContain('skipped');
    });

    it('should skip code generation when no nodeId is available', async () => {
      (MockedFigmaClient.parseFigmaUrl as jest.Mock).mockReturnValue({
        fileId: 'test-file-id',
        nodeId: undefined,
      });

      const input = { 
        url: 'https://figma.com/file/123/test',
        options: {
          streamingEnabled: true,
          progressUpdates: true,
          timeoutStrategy: 'graceful' as const,
          maxWaitTime: 15000
        }
      };
      const result = await extractor.extractWithProgress(input, () => {});

      expect(result.success).toBe(true);
      expect(mockFigmaClient.getCode).not.toHaveBeenCalled();
      expect(result.figmaData.nodeId).toBeUndefined();
    });
  });
});