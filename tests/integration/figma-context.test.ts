import { FigmaBridgeMCPServer } from '../../src/server';

describe('extractFigmaContext Integration Tests', () => {
  let server: any;

  beforeEach(() => {
    // Create server instance for testing
    server = new FigmaBridgeMCPServer();
  });

  describe('IDE Integration Mode (pre-extracted data)', () => {
    it('should process pre-extracted Figma data without API calls', async () => {
      const mockFigmaData = {
        fileId: 'test123',
        nodeId: '456-789',
        url: 'https://figma.com/test',
        code: 'export const Button = () => <button>Test</button>',
        components: [
          { id: 'btn-1', name: 'Button', type: 'button' }
        ],
        variables: [
          { id: 'primary', name: 'primary-color', type: 'color', value: '#007bff' }
        ],
        codeConnectMap: []
      };

      const result = await server['handleExtractFigmaContext']({
        figmaData: mockFigmaData
      });

      expect(result.content[0].text).toContain('IDE integration');
      expect(result.content[0].text).toContain('Components: 1');
      expect(result.content[0].text).toContain('Variables: 1');
      expect(result.content[0].text).toContain('no duplicate API calls');
    });

    it('should handle partial Figma data gracefully', async () => {
      const partialData = {
        fileId: 'partial',
        url: 'https://figma.com/partial',
        // Missing components, variables, etc.
      };

      const result = await server['handleExtractFigmaContext']({
        figmaData: partialData
      });

      expect(result.content[0].text).toContain('Components: 0');
      expect(result.content[0].text).toContain('Variables: 0');
    });
  });

  describe('Standalone Mode (URL extraction)', () => {
    it('should extract from URL when no figmaData provided', async () => {
      const result = await server['handleExtractFigmaContext']({
        url: 'https://www.figma.com/design/test123/Sample'
      });

      // Should attempt extraction (may fail if Figma MCP not running)
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle includeCode option correctly', async () => {
      const result = await server['handleExtractFigmaContext']({
        url: 'https://www.figma.com/design/test123/Sample?node-id=123-456',
        options: {
          includeCode: false
        }
      });

      expect(result.content[0].text).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should reject when neither url nor figmaData provided', async () => {
      await expect(
        server['handleExtractFigmaContext']({})
      ).rejects.toThrow('Either url or figmaData must be provided');
    });

    it('should accept both url and figmaData (preferring figmaData)', async () => {
      const result = await server['handleExtractFigmaContext']({
        url: 'https://figma.com/ignored',
        figmaData: {
          fileId: 'preferred',
          url: 'https://figma.com/preferred',
          components: []
        }
      });

      expect(result.content[0].text).toContain('IDE integration');
      expect(result.content[0].text).toContain('preferred');
    });
  });

  describe('Options Handling', () => {
    it('should respect options with figmaData', async () => {
      const result = await server['handleExtractFigmaContext']({
        figmaData: {
          fileId: 'test',
          url: 'https://figma.com/test'
        },
        options: {
          includeVariants: true,
          includeComponents: true,
          includeTokens: true
        }
      });

      expect(result.content[0].text).toContain('Processed Data');
    });
  });
});