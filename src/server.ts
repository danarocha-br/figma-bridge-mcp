import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// Import our tool schemas
import {
  FigmaContextSchema,
  ReactCodeGenerationSchema,
  ComponentMappingSchema,
  DesignSystemValidationSchema,
  TokenSyncSchema,
  CodebaseAnalysisSchema,
} from './types/mcp.js';

class FigmaBridgeMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'figma-bridge-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * Setup request handlers for each tool.
   *
   * @private
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'extractFigmaContext',
            description:
              'Extract design context and specifications from Figma using the official Figma MCP',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  format: 'uri',
                  description: 'Figma file or frame URL',
                },
                options: {
                  type: 'object',
                  properties: {
                    includeVariants: { type: 'boolean', description: 'Include component variants' },
                    includeComponents: { type: 'boolean', description: 'Include component data' },
                    includeTokens: { type: 'boolean', description: 'Include design tokens' },
                    includeCode: {
                      type: 'boolean',
                      description: 'Include code generation for layout analysis (may timeout for complex frames)',
                      default: true,
                    },
                  },
                  additionalProperties: false,
                },
              },
              required: ['url'],
              additionalProperties: false,
            },
          },
          {
            name: 'generateReactCode',
            description:
              'Generate React component code using existing components and design tokens',
            inputSchema: {
              type: 'object',
              properties: {
                figmaData: {
                  type: 'object',
                  description: 'Extracted Figma design data',
                },
                preferences: {
                  type: 'object',
                  properties: {
                    typescript: { type: 'boolean', default: true },
                    styling: {
                      type: 'string',
                      enum: ['styled-components', 'tailwind', 'css-modules', 'emotion'],
                      default: 'styled-components',
                    },
                    framework: {
                      type: 'string',
                      enum: ['react', 'nextjs'],
                      default: 'react',
                    },
                  },
                  additionalProperties: false,
                },
              },
              required: ['figmaData', 'preferences'],
              additionalProperties: false,
            },
          },
          {
            name: 'mapComponents',
            description:
              'Map Figma components to existing codebase components using AI-powered matching',
            inputSchema: {
              type: 'object',
              properties: {
                figmaComponents: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Figma component data',
                },
                codeComponents: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Discovered code components',
                },
                threshold: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  default: 0.85,
                  description: 'Similarity threshold for matching',
                },
              },
              required: ['figmaComponents', 'codeComponents'],
              additionalProperties: false,
            },
          },
          {
            name: 'validateDesignSystem',
            description: 'Validate generated code against design system rules and guidelines',
            inputSchema: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Generated code to validate',
                },
                rules: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['token-usage', 'accessibility', 'performance', 'naming-conventions'],
                  },
                  description: 'Validation rules to apply',
                },
              },
              required: ['code', 'rules'],
              additionalProperties: false,
            },
          },
          {
            name: 'syncTokens',
            description: 'Synchronize design tokens between Figma and codebase',
            inputSchema: {
              type: 'object',
              properties: {
                figmaTokens: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Design tokens from Figma',
                },
                codeTokens: {
                  type: 'array',
                  items: { type: 'object' },
                  description: 'Design tokens from codebase',
                },
                strategy: {
                  type: 'string',
                  enum: ['merge', 'replace', 'validate'],
                  default: 'merge',
                  description: 'Synchronization strategy',
                },
              },
              required: ['figmaTokens', 'codeTokens'],
              additionalProperties: false,
            },
          },
          {
            name: 'analyzeCodebase',
            description: 'Analyze project structure and discover React components',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Path to analyze (e.g., ./src)',
                },
                framework: {
                  type: 'string',
                  enum: ['react', 'vue', 'angular', 'svelte'],
                  default: 'react',
                  description: 'Framework to analyze',
                },
                include: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File patterns to include',
                },
                exclude: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File patterns to exclude',
                },
              },
              required: ['path'],
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'extractFigmaContext':
            return await this.handleExtractFigmaContext(args);
          case 'generateReactCode':
            return await this.handleGenerateReactCode(args);
          case 'mapComponents':
            return await this.handleMapComponents(args);
          case 'validateDesignSystem':
            return await this.handleValidateDesignSystem(args);
          case 'syncTokens':
            return await this.handleSyncTokens(args);
          case 'analyzeCodebase':
            return await this.handleAnalyzeCodebase(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Sets up global error handling for the server.
   *
   * This method listens for common process events and applies custom
   * error handling logic. Specifically, it closes the server gracefully
   * on a SIGINT (interrupt) signal, logs unhandled promise rejections
   * while ignoring those related to timeouts, and logs uncaught exceptions
   * before exiting the process.
   */

  private setupErrorHandling(): void {
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
      // Don't log Figma timeout errors as they're handled by retry logic
      if (reason instanceof Error && reason.message.includes('timeout')) {
        return; // Ignore timeout rejections from retry logic
      }
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  /**
   * Handles the extraction of design context and specifications from a Figma URL.
   *
   * This function parses the input arguments using the `FigmaContextSchema`, connects to the
   * Figma MCP server via the `FigmaClient`, and extracts various design data such as
   * components, variables, and code connections from the provided Figma URL. It also handles
   * connection testing, error management, and logging of extraction times.
   *
   * @param args - The input arguments containing the Figma URL and extraction options.
   * @returns A promise that resolves with extracted design data or error information.
   *          The result includes data such as components, variables, code mappings, and any
   *          errors encountered during the extraction process.
   */

  private async handleExtractFigmaContext(args: unknown): Promise<any> {
    const input = FigmaContextSchema.parse(args);

    try {
      // Import the FigmaClient dynamically to avoid circular dependencies
      const { FigmaClient } = await import('./clients/figma-client.js');
      const figmaClient = new FigmaClient();

      // Test connection first
      const isConnected = await figmaClient.testConnection();
      if (!isConnected) {
        return {
          content: [
            {
              type: 'text',
              text: `⚠️ Figma MCP server is not available. Please ensure Figma desktop app is running.\n\nFallback: Using URL ${input.url} for basic extraction.`,
            },
          ],
        };
      }

      // Parse Figma URL
      const { fileId, nodeId } = FigmaClient.parseFigmaUrl(input.url);

      // Extract data from Figma MCP with timing
      console.error(`🔍 Starting Figma data extraction for ${input.url}`);
      const startTime = Date.now();

      let codeData = null;
      let codeError = null;
      let variables = null;
      let variablesError = null;
      let codeConnectMap = null;
      let codeConnectError = null;

      // Include code generation by default (align with layout analysis goals)
      const shouldIncludeCode = input.options?.includeCode !== false; // Default to true
      if (shouldIncludeCode && nodeId) {
        console.error('🔍 Extracting code...');
        const codeStart = Date.now();
        try {
          codeData = await figmaClient.getCode(
            {
              url: input.url,
              nodeId,
            },
            {
              framework: 'react',
              styling: 'styled-components',
              typescript: true,
              includeImages: input.options?.includeVariants ?? true,
              includeVariables: input.options?.includeTokens ?? true,
            }
          );
          console.error(`✅ Code extraction completed in ${Date.now() - codeStart}ms`);
        } catch (err) {
          codeError = err instanceof Error ? err.message : String(err);
          console.error(`❌ Code extraction failed after ${Date.now() - codeStart}ms:`, codeError);
        }
      } else if (!shouldIncludeCode) {
        console.error('⏭️  Skipping code extraction (includeCode: false)');
      } else {
        console.error('⏭️  Skipping code extraction (no nodeId)');
      }

      console.error('🔍 Extracting variables...');
      const variablesStart = Date.now();
      try {
        variables = await figmaClient.getVariableDefinitions(input.url, nodeId);
        console.error(`✅ Variables extraction completed in ${Date.now() - variablesStart}ms`);
      } catch (err) {
        variablesError = err instanceof Error ? err.message : String(err);
        console.error(
          `❌ Variables extraction failed after ${Date.now() - variablesStart}ms:`,
          variablesError
        );
      }

      console.error('🔍 Extracting code connect map...');
      const codeConnectStart = Date.now();
      try {
        codeConnectMap = await figmaClient.getCodeConnectMap(input.url, nodeId);
        console.error(`✅ Code connect extraction completed in ${Date.now() - codeConnectStart}ms`);
      } catch (err) {
        codeConnectError = err instanceof Error ? err.message : String(err);
        console.error(
          `❌ Code connect extraction failed after ${Date.now() - codeConnectStart}ms:`,
          codeConnectError
        );
      }

      console.error(`🎉 Total extraction time: ${Date.now() - startTime}ms`);

      // Check for timeout errors and add helpful warnings
      const hasTimeoutError = codeError && (codeError.includes('timeout') || codeError.includes('timed out'));
      const timeoutWarning = hasTimeoutError && shouldIncludeCode 
        ? [`💡 **Tip:** Code generation timed out. Try with {"includeCode": false} for faster variable extraction only.`]
        : [];

      const result = {
        success: true,
        figmaData: {
          fileId,
          nodeId,
          url: input.url,
          code: codeData?.code || null,
          components: codeData?.components || [],
          variables: variables?.variables || [],
          codeConnectMap: codeConnectMap?.mappings || [],
        },
        errors: [
          ...(codeError ? [`Code extraction: ${codeError}`] : []),
          ...(variablesError ? [`Variables: ${variablesError}`] : []),
          ...(codeConnectError ? [`Code Connect: ${codeConnectError}`] : []),
        ],
        warnings: timeoutWarning,
      };

      return {
        content: [
          {
            type: 'text',
            text:
              `✅ Figma context extracted successfully from ${input.url}\n\n` +
              `📊 **Extracted Data:**\n` +
              `- Components: ${result.figmaData.components.length}\n` +
              `- Variables: ${result.figmaData.variables.length}\n` +
              `- Code Mappings: ${result.figmaData.codeConnectMap.length}\n` +
              `- Generated Code: ${result.figmaData.code ? 'Yes' : 'No'}\n\n` +
              (result.errors.length > 0 ? `⚠️ **Errors:** ${result.errors.join(', ')}\n\n` : '') +
              (result.warnings.length > 0 ? `${result.warnings.join('\n')}\n\n` : '') +
              `**Raw Data:** ${JSON.stringify(result.figmaData, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to extract Figma context: ${errorMessage}\n\nURL: ${input.url}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Handle the `generateReactCode` request from Figma.
   * @param args The input arguments from Figma, expected to be an object with the following properties:
   *   - `figmaData`: The data about the Figma selection, as returned by `extractFigmaContext`.
   *   - `preferences`: An object with the following properties:
   *     - `framework`: The React framework to target (e.g. "react", "nextjs").
   *     - `styling`: The styling approach to use (e.g. "styled-components", "emotion", "css-modules").
   *     - `typescript`: Whether to generate TypeScript code (boolean).
   * @returns An object with the following properties:
   *   - `content`: An array of objects, each with the following properties:
   *     - `type`: The type of content (e.g. "text", "image").
   *     - `text`: The code generated by the engine.
   *   - `isError`: A boolean indicating whether the response was an error or not.
   */
  private async handleGenerateReactCode(args: unknown): Promise<any> {
    const input = ReactCodeGenerationSchema.parse(args);

    // TODO: FBMCP-25 - Implement React code generation engine
    return {
      content: [
        {
          type: 'text',
          text: `React code generation placeholder with preferences: ${JSON.stringify(input.preferences)}`,
        },
      ],
    };
  }

  private async handleMapComponents(args: unknown): Promise<any> {
    const input = ComponentMappingSchema.parse(args);

    // TODO: FBMCP-23 - Implement AI-powered component mapping
    return {
      content: [
        {
          type: 'text',
          text: `Component mapping placeholder with threshold: ${input.threshold}`,
        },
      ],
    };
  }

  private async handleValidateDesignSystem(args: unknown): Promise<any> {
    const input = DesignSystemValidationSchema.parse(args);

    // TODO: FBMCP-27 - Implement design system validation
    return {
      content: [
        {
          type: 'text',
          text: `Design system validation placeholder for rules: ${input.rules.join(', ')}`,
        },
      ],
    };
  }

  private async handleSyncTokens(args: unknown): Promise<any> {
    const input = TokenSyncSchema.parse(args);

    // TODO: FBMCP-24 - Implement design token synchronization
    return {
      content: [
        {
          type: 'text',
          text: `Token synchronization placeholder with strategy: ${input.strategy}`,
        },
      ],
    };
  }

  private async handleAnalyzeCodebase(args: unknown): Promise<any> {
    const input = CodebaseAnalysisSchema.parse(args);

    // TODO: FBMCP-20 - Implement codebase scanning and component discovery
    return {
      content: [
        {
          type: 'text',
          text: `Codebase analysis placeholder for path: ${input.path} (${input.framework})`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma Bridge MCP Server started successfully');
  }
}

export { FigmaBridgeMCPServer };
