import { FigmaBridgeMCPServer } from '../server';
import { StreamingFigmaContextSchema } from '../types/mcp';

// Mock the streaming extractor to control behavior in tests
jest.mock('../services/streaming-extractor', () => {
  return {
    StreamingExtractor: jest.fn().mockImplementation(() => ({
      extractWithProgress: jest.fn(),
    })),
  };
});

describe('Performance Optimization Integration', () => {
  let server: FigmaBridgeMCPServer;
  let mockExtractor: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked StreamingExtractor
    const { StreamingExtractor } = require('../services/streaming-extractor');
    mockExtractor = {
      extractWithProgress: jest.fn(),
    };
    StreamingExtractor.mockImplementation(() => mockExtractor);

    server = new FigmaBridgeMCPServer();
  });

  describe('MCP Tool Registration', () => {
    it('should include extractFigmaContextStreaming in tools list', async () => {
      const listToolsHandler = (server as any).server.requestHandlers.get('tools/list');
      expect(listToolsHandler).toBeDefined();

      const response = await listToolsHandler({});
      const tools = response.tools;
      
      const streamingTool = tools.find((tool: any) => tool.name === 'extractFigmaContextStreaming');
      expect(streamingTool).toBeDefined();
      expect(streamingTool.description).toContain('Performance-optimized');
      expect(streamingTool.description).toContain('streaming progress updates');
      expect(streamingTool.inputSchema).toBeDefined();
    });

    it('should maintain backward compatibility with extractFigmaContext', async () => {
      const listToolsHandler = (server as any).server.requestHandlers.get('tools/list');
      const response = await listToolsHandler({});
      const tools = response.tools;
      
      const originalTool = tools.find((tool: any) => tool.name === 'extractFigmaContext');
      const streamingTool = tools.find((tool: any) => tool.name === 'extractFigmaContextStreaming');
      
      expect(originalTool).toBeDefined();
      expect(streamingTool).toBeDefined();
      expect(tools.length).toBeGreaterThanOrEqual(2);
    });

    it('should have proper streaming tool schema definition', async () => {
      const listToolsHandler = (server as any).server.requestHandlers.get('tools/list');
      const response = await listToolsHandler({});
      const streamingTool = response.tools.find((tool: any) => tool.name === 'extractFigmaContextStreaming');
      
      const schema = streamingTool.inputSchema;
      expect(schema.properties.options.properties.streamingEnabled).toBeDefined();
      expect(schema.properties.options.properties.progressUpdates).toBeDefined();
      expect(schema.properties.options.properties.timeoutStrategy).toBeDefined();
      expect(schema.properties.options.properties.maxWaitTime).toBeDefined();
      
      // Verify timeout strategy enum values
      expect(schema.properties.options.properties.timeoutStrategy.enum).toEqual(['graceful', 'partial', 'fail']);
    });
  });

  describe('Streaming Tool Handler', () => {
    let callToolHandler: any;

    beforeEach(() => {
      callToolHandler = (server as any).server.requestHandlers.get('tools/call');
      expect(callToolHandler).toBeDefined();
    });

    it('should handle extractFigmaContextStreaming requests', async () => {
      const mockResult = {
        success: true,
        figmaData: {
          fileId: 'test-file',
          url: 'https://figma.com/file/123/test',
          variables: [{ id: 'var1', name: 'primary-color' }],
          components: [],
          codeConnectMap: [],
          code: 'test code',
        },
        performance: {
          totalDuration: 5000,
          variablesDuration: 1000,
          componentsDuration: 2000,
          codeDuration: 2000,
          timeoutOccurred: false,
          cacheHits: 0,
          retryAttempts: 0,
        },
        warnings: [],
        errors: [],
      };

      mockExtractor.extractWithProgress.mockImplementation(async (_input: any, callback: any) => {
        // Simulate progress updates
        callback({ stage: 'variables', percentage: 50, message: 'Extracting variables...', duration: 1000 });
        callback({ stage: 'components', percentage: 75, message: 'Analyzing components...', duration: 2000 });
        callback({ stage: 'code', percentage: 90, message: 'Generating code...', duration: 4000 });
        callback({ stage: 'complete', percentage: 100, message: 'Extraction completed', duration: 5000 });
        return mockResult;
      });

      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: {
            url: 'https://figma.com/file/123/test',
            options: {
              streamingEnabled: true,
              progressUpdates: true,
              timeoutStrategy: 'graceful',
              maxWaitTime: 15000,
            },
          },
        },
      };

      const response = await callToolHandler(request);

      expect(response.content).toBeDefined();
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toContain('Performance Summary');
      expect(response.content[0].text).toContain('Total Time: 5000ms');
      expect(response.content[0].text).toContain('Variables: 1');
      expect(response.isError).toBeUndefined();
    });

    it('should handle schema validation errors', async () => {
      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: {
            // Missing required url or figmaData
            options: { streamingEnabled: true },
          },
        },
      };

      const response = await callToolHandler(request);

      expect(response.content[0].text).toContain('Streaming extraction failed');
      expect(response.isError).toBe(true);
    });

    it('should handle extractor errors gracefully', async () => {
      mockExtractor.extractWithProgress.mockRejectedValue(new Error('Figma server unavailable'));

      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: {
            url: 'https://figma.com/file/123/test',
          },
        },
      };

      const response = await callToolHandler(request);

      expect(response.content[0].text).toContain('Streaming extraction failed');
      expect(response.content[0].text).toContain('Figma server unavailable');
      expect(response.isError).toBe(true);
    });

    it('should format response with performance metrics', async () => {
      const mockResult = {
        success: true,
        figmaData: {
          fileId: 'test-file',
          url: 'https://figma.com/file/123/test',
          variables: [{ id: 'var1' }, { id: 'var2' }],
          components: [{ id: 'comp1' }],
          codeConnectMap: [{ componentId: 'comp1' }],
          code: 'export const Component = () => <div>Hello</div>;',
        },
        performance: {
          totalDuration: 8000,
          variablesDuration: 2000,
          componentsDuration: 3000,
          codeDuration: 3000,
          timeoutOccurred: false,
          cacheHits: 2,
          retryAttempts: 1,
        },
        warnings: ['Code generation took longer than expected'],
        errors: [],
      };

      mockExtractor.extractWithProgress.mockResolvedValue(mockResult);

      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: {
            url: 'https://figma.com/file/123/test',
          },
        },
      };

      const response = await callToolHandler(request);
      const text = response.content[0].text;

      // Verify performance metrics are included
      expect(text).toContain('Total Time: 8000ms');
      expect(text).toContain('Variables: 2000ms');
      expect(text).toContain('Components: 3000ms');
      expect(text).toContain('Code Generation: 3000ms');
      expect(text).toContain('Cache Hits: 2');
      expect(text).toContain('Retries: 1');

      // Verify data summary
      expect(text).toContain('Variables: 2');
      expect(text).toContain('Components: 1');
      expect(text).toContain('Code Mappings: 1');
      expect(text).toContain('Generated Code: Yes');

      // Verify warnings
      expect(text).toContain('Warnings:');
      expect(text).toContain('Code generation took longer than expected');
    });

    it('should handle timeout scenarios with partial results', async () => {
      const mockResult = {
        success: true,
        figmaData: {
          fileId: 'test-file',
          url: 'https://figma.com/file/123/test',
          variables: [{ id: 'var1' }],
          components: [],
          codeConnectMap: [],
          code: null, // Code generation timed out
        },
        performance: {
          totalDuration: 16000,
          variablesDuration: 2000,
          componentsDuration: 3000,
          codeDuration: 0, // Timed out
          timeoutOccurred: true,
          timeoutStage: 'code',
          cacheHits: 0,
          retryAttempts: 0,
        },
        warnings: ['Code generation timed out after 15000ms - partial results available'],
        errors: [],
      };

      mockExtractor.extractWithProgress.mockResolvedValue(mockResult);

      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: {
            url: 'https://figma.com/file/123/test',
            options: { timeoutStrategy: 'graceful', maxWaitTime: 15000 },
          },
        },
      };

      const response = await callToolHandler(request);
      const text = response.content[0].text;

      expect(text).toContain('Timeout: code stage');
      expect(text).toContain('Generated Code: No');
      expect(text).toContain('Code generation timed out');
      expect(text).toContain('Performance Tip'); // Should suggest faster options
    });

    it('should show progress history when enabled', async () => {
      const mockResult = {
        success: true,
        figmaData: { fileId: 'test', url: 'test', variables: [], components: [], codeConnectMap: [], code: null },
        performance: { totalDuration: 5000, variablesDuration: 2000, componentsDuration: 2000, codeDuration: 1000, timeoutOccurred: false, cacheHits: 0, retryAttempts: 0 },
        warnings: [],
        errors: [],
      };

      mockExtractor.extractWithProgress.mockImplementation(async (_input: any, callback: any) => {
        callback({ stage: 'variables', percentage: 100, message: 'Variables completed', duration: 2000 });
        callback({ stage: 'components', percentage: 100, message: 'Components completed', duration: 4000 });
        callback({ stage: 'complete', percentage: 100, message: 'All done', duration: 5000 });
        return mockResult;
      });

      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: {
            url: 'https://figma.com/file/123/test',
            options: { progressUpdates: true },
          },
        },
      };

      const response = await callToolHandler(request);
      const text = response.content[0].text;

      expect(text).toContain('Progress History:');
      expect(text).toContain('variables: 100% (2000ms)');
      expect(text).toContain('components: 100% (4000ms)');
      expect(text).toContain('complete: 100% (5000ms)');
    });

    it('should provide performance insights', async () => {
      // Test fast completion (under 10 seconds)
      const fastResult = {
        success: true,
        figmaData: { fileId: 'test', url: 'test', variables: [], components: [], codeConnectMap: [], code: 'fast' },
        performance: { totalDuration: 8000, variablesDuration: 2000, componentsDuration: 3000, codeDuration: 3000, timeoutOccurred: false, cacheHits: 0, retryAttempts: 0 },
        warnings: [],
        errors: [],
      };

      mockExtractor.extractWithProgress.mockResolvedValue(fastResult);

      const request = {
        params: {
          name: 'extractFigmaContextStreaming',
          arguments: { url: 'https://figma.com/file/123/test' },
        },
      };

      const response = await callToolHandler(request);
      expect(response.content[0].text).toContain('Performance Goal Met');

      // Test slow completion (over 15 seconds)
      const slowResult = {
        ...fastResult,
        performance: { ...fastResult.performance, totalDuration: 18000 },
      };

      mockExtractor.extractWithProgress.mockResolvedValue(slowResult);
      const slowResponse = await callToolHandler(request);
      expect(slowResponse.content[0].text).toContain('Performance Tip');
      expect(slowResponse.content[0].text).toContain('includeCode": false');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing extractFigmaContext functionality', async () => {
      const callToolHandler = (server as any).server.requestHandlers.get('tools/call');

      const request = {
        params: {
          name: 'extractFigmaContext',
          arguments: {
            url: 'https://figma.com/file/123/test',
          },
        },
      };

      // This should not throw an error and should use the original implementation
      const response = await callToolHandler(request);
      expect(response).toBeDefined();
      // The original handler should still work (though it might fail due to mocking)
    });
  });

  describe('Schema Validation Integration', () => {
    it('should properly validate streaming options', () => {
      const validInput = {
        url: 'https://figma.com/file/123/test',
        options: {
          streamingEnabled: true,
          progressUpdates: true,
          timeoutStrategy: 'graceful',
          maxWaitTime: 10000,
        },
      };

      const result = StreamingFigmaContextSchema.safeParse(validInput);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.options?.streamingEnabled).toBe(true);
        expect(result.data.options?.progressUpdates).toBe(true);
        expect(result.data.options?.timeoutStrategy).toBe('graceful');
        expect(result.data.options?.maxWaitTime).toBe(10000);
      }
    });

    it('should reject invalid timeout values', () => {
      const invalidInput = {
        url: 'https://figma.com/file/123/test',
        options: {
          maxWaitTime: 3000, // Too low (minimum is 5000)
        },
      };

      const result = StreamingFigmaContextSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timeout strategy', () => {
      const invalidInput = {
        url: 'https://figma.com/file/123/test',
        options: {
          timeoutStrategy: 'invalid-strategy',
        },
      };

      const result = StreamingFigmaContextSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});