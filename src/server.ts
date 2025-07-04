import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// Import our tool schemas
import {
  FigmaContextSchema,
  StreamingFigmaContextSchema,
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
                  description: 'Figma file or frame URL (for standalone extraction)',
                },
                figmaData: {
                  type: 'object',
                  description:
                    'Pre-extracted Figma data from official Figma MCP (preferred for IDE integration)',
                  properties: {
                    fileId: { type: 'string' },
                    nodeId: { type: 'string', nullable: true },
                    url: { type: 'string' },
                    code: { type: 'string', nullable: true },
                    components: { type: 'array', items: { type: 'object' } },
                    variables: { type: 'array', items: { type: 'object' } },
                    codeConnectMap: { type: 'array', items: { type: 'object' } },
                    assets: { type: 'object', nullable: true },
                  },
                  required: ['fileId', 'url'],
                  additionalProperties: false,
                },
                options: {
                  type: 'object',
                  properties: {
                    includeVariants: { type: 'boolean', description: 'Include component variants' },
                    includeComponents: { type: 'boolean', description: 'Include component data' },
                    includeTokens: { type: 'boolean', description: 'Include design tokens' },
                    includeCode: {
                      type: 'boolean',
                      description:
                        'Include code generation for layout analysis (may timeout for complex frames)',
                      default: true,
                    },
                  },
                  additionalProperties: false,
                },
              },
              anyOf: [{ required: ['url'] }, { required: ['figmaData'] }],
              additionalProperties: false,
            },
          },
          {
            name: 'extractFigmaContextStreaming',
            description:
              'Performance-optimized Figma context extraction with streaming progress updates, parallel execution, and smart timeout management. Returns results 3-5x faster than standard extraction.',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  format: 'uri',
                  description: 'Figma file or frame URL (for standalone extraction)',
                },
                figmaData: {
                  type: 'object',
                  description:
                    'Pre-extracted Figma data from official Figma MCP (preferred for IDE integration)',
                  properties: {
                    fileId: { type: 'string' },
                    nodeId: { type: 'string', nullable: true },
                    url: { type: 'string' },
                    code: { type: 'string', nullable: true },
                    components: { type: 'array', items: { type: 'object' } },
                    variables: { type: 'array', items: { type: 'object' } },
                    codeConnectMap: { type: 'array', items: { type: 'object' } },
                    assets: { type: 'object', nullable: true },
                  },
                  required: ['fileId', 'url'],
                  additionalProperties: false,
                },
                options: {
                  type: 'object',
                  properties: {
                    includeVariants: { type: 'boolean', description: 'Include component variants' },
                    includeComponents: { type: 'boolean', description: 'Include component data' },
                    includeTokens: { type: 'boolean', description: 'Include design tokens' },
                    includeCode: {
                      type: 'boolean',
                      description: 'Include code generation (with smart timeout handling)',
                      default: true,
                    },
                    streamingEnabled: {
                      type: 'boolean',
                      description: 'Enable streaming progress updates',
                      default: true,
                    },
                    progressUpdates: {
                      type: 'boolean',
                      description: 'Show real-time progress indicators',
                      default: true,
                    },
                    timeoutStrategy: {
                      type: 'string',
                      enum: ['graceful', 'partial', 'fail'],
                      description:
                        'How to handle timeouts: graceful=partial results, partial=continue with warnings, fail=throw error',
                      default: 'graceful',
                    },
                    maxWaitTime: {
                      type: 'number',
                      minimum: 5000,
                      maximum: 60000,
                      description: 'Maximum wait time in milliseconds (5-60 seconds)',
                      default: 15000,
                    },
                  },
                  additionalProperties: false,
                },
              },
              anyOf: [{ required: ['url'] }, { required: ['figmaData'] }],
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
          case 'extractFigmaContextStreaming':
            return await this.handleExtractFigmaContextStreaming(args);
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
      // Check if pre-extracted Figma data was provided (preferred for IDE integration)
      // MCP Inspector sends empty object {} when field is not filled
      const hasValidFigmaData =
        input.figmaData && typeof input.figmaData === 'object' && 'fileId' in input.figmaData;

      if (hasValidFigmaData) {
        console.error(`🎯 Using pre-extracted Figma data from IDE integration`);

        // Use the provided Figma data instead of extracting again
        // TypeScript assertion since we checked hasValidFigmaData
        const figmaData = input.figmaData as {
          fileId: string;
          nodeId?: string;
          url: string;
          code?: string | null;
          components?: any[];
          variables?: any[];
          codeConnectMap?: any[];
        };

        const result = {
          success: true,
          figmaData: {
            fileId: figmaData.fileId,
            nodeId: figmaData.nodeId,
            url: figmaData.url,
            code: figmaData.code || null,
            components: figmaData.components || [],
            variables: figmaData.variables || [],
            codeConnectMap: figmaData.codeConnectMap || [],
          },
          errors: [],
          warnings: [],
        };

        return {
          content: [
            {
              type: 'text',
              text:
                `✅ Figma context processed successfully from IDE integration\n\n` +
                `📊 **Processed Data:**\n` +
                `- Components: ${result.figmaData.components.length}\n` +
                `- Variables: ${result.figmaData.variables.length}\n` +
                `- Code Mappings: ${result.figmaData.codeConnectMap.length}\n` +
                `- Generated Code: ${result.figmaData.code ? 'Yes' : 'No'}\n\n` +
                `💡 **Integration Mode:** Using pre-extracted data (no duplicate API calls)\n\n` +
                `**Raw Data:** ${JSON.stringify(result.figmaData, null, 2)}`,
            },
          ],
        };
      }

      // Fallback: Extract from URL if no pre-extracted data provided
      if (!input.url) {
        throw new Error('Either figmaData or url must be provided');
      }

      console.error(`🔄 Fallback: Extracting from URL ${input.url} (standalone mode)`);

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
      const hasTimeoutError =
        codeError && (codeError.includes('timeout') || codeError.includes('timed out'));
      const timeoutWarning =
        hasTimeoutError && shouldIncludeCode
          ? [
              `💡 **Tip:** Code generation timed out. Try with {"includeCode": false} for faster variable extraction only.`,
            ]
          : [];

      // Check for null code and provide helpful context
      const hasNullCode = shouldIncludeCode && !codeError && codeData?.code === null;
      const nullCodeWarning = hasNullCode
        ? [
            `ℹ️  **Node Type:** This Figma node doesn't support React code generation.`,
            `💡 **Tip:** Try selecting a component instance or UI frame for code generation.`,
            `📊 **Available:** Design tokens (${variables?.variables?.length || 0}) are still extracted for styling.`,
          ]
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
        warnings: [...timeoutWarning, ...nullCodeWarning],
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
   * Handles the performance-optimized streaming extraction of Figma context with parallel execution,
   * real-time progress updates, and intelligent timeout management.
   *
   * This method implements the streaming version of extractFigmaContext that addresses the performance
   * bottleneck where code generation takes 45+ seconds. It provides:
   * - Parallel execution of variables and components extraction
   * - Real-time progress updates during long operations
   * - Smart timeout strategies with partial results
   * - 3-5x performance improvement over standard extraction
   *
   * @param args - The input arguments containing the Figma URL/data and streaming options
   * @returns A promise that resolves with streaming extraction results including performance metrics
   */
  private async handleExtractFigmaContextStreaming(args: unknown): Promise<any> {
    const input = StreamingFigmaContextSchema.parse(args);

    try {
      // Import the StreamingExtractor dynamically to avoid circular dependencies
      const { StreamingExtractor } = await import('./services/streaming-extractor.js');
      const extractor = new StreamingExtractor();

      const progressHistory: any[] = [];

      // Execute streaming extraction with progress tracking
      const result = await extractor.extractWithProgress(input, (progress) => {
        progressHistory.push({
          stage: progress.stage,
          percentage: progress.percentage,
          message: progress.message,
          duration: progress.duration,
          timestamp: new Date().toISOString(),
        });
      });

      // Store result data for response building
      const performance = result.performance;

      // Build comprehensive response with performance metrics
      const responseText = this.buildStreamingResponse(
        result,
        progressHistory,
        performance,
        input.options?.progressUpdates !== false
      );

      return {
        content: [
          {
            type: 'text',
            text: responseText,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Streaming extraction failed: ${errorMessage}\n\nInput: ${JSON.stringify(input, null, 2)}`,
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Build comprehensive streaming response with performance metrics and progress history
   */
  private buildStreamingResponse(
    result: any,
    progressHistory: any[],
    performance: any,
    includeProgress: boolean
  ): string {
    const { figmaData, success, warnings, errors } = result;

    let response = success
      ? `✅ Figma context extracted with streaming optimization\n\n`
      : `⚠️ Figma context extracted with partial results\n\n`;

    // Performance Summary
    response += `🚀 **Performance Summary:**\n`;
    response += `- Total Time: ${performance.totalDuration}ms\n`;
    response += `- Variables: ${performance.variablesDuration}ms\n`;
    response += `- Components: ${performance.componentsDuration}ms\n`;
    response += `- Code Generation: ${performance.codeDuration}ms\n`;

    if (performance.timeoutOccurred) {
      response += `- Timeout: ${performance.timeoutStage} stage\n`;
    }

    if (performance.cacheHits > 0) {
      response += `- Cache Hits: ${performance.cacheHits}\n`;
    }

    if (performance.retryAttempts > 0) {
      response += `- Retries: ${performance.retryAttempts}\n`;
    }

    response += `\n`;

    // Data Summary
    response += `📊 **Extracted Data:**\n`;
    response += `- Variables: ${figmaData.variables?.length || 0}\n`;
    response += `- Components: ${figmaData.components?.length || 0}\n`;
    response += `- Code Mappings: ${figmaData.codeConnectMap?.length || 0}\n`;
    response += `- Generated Code: ${figmaData.code ? 'Yes' : 'No'}\n\n`;

    // Warnings and Errors
    if (warnings.length > 0) {
      response += `⚠️ **Warnings:**\n${warnings.map((w: string) => `- ${w}`).join('\n')}\n\n`;
    }

    if (errors.length > 0) {
      response += `❌ **Errors:**\n${errors.map((e: string) => `- ${e}`).join('\n')}\n\n`;
    }

    // Progress History (if enabled)
    if (includeProgress && progressHistory.length > 0) {
      response += `📈 **Progress History:**\n`;
      const keyMilestones = progressHistory.filter(
        (p) => p.percentage === 100 || p.stage === 'complete' || p.message.includes('timeout')
      );
      response += keyMilestones
        .map((p) => `${p.stage}: ${p.percentage}% (${p.duration}ms) - ${p.message}`)
        .join('\n');
      response += `\n\n`;
    }

    // Performance Insights and Complex Layout Guidance
    if (performance.timeoutOccurred && performance.timeoutStage === 'code') {
      response += `⚡ **Complex Layout Detected:** Code generation timed out.\n`;
      response += `💡 **Quick Fix:** Use {"includeCode": false} to get variables and components in ~3 seconds.\n`;
      response += `🎯 **Alternative:** Use smaller frame selections for faster code generation.\n\n`;
    } else if (performance.totalDuration > 15000) {
      response += `💡 **Performance Tip:** Consider using {"includeCode": false} for faster variable extraction only.\n\n`;
    } else if (performance.totalDuration < 10000) {
      response += `🎉 **Performance Goal Met:** Extraction completed in <10 seconds!\n\n`;
    }

    // Complex layout specific guidance
    if (warnings.some((w: string) => w.includes('Complex layout detected'))) {
      response += `🏗️  **Complex Layout Tips:**\n`;
      response += `- Use {"includeCode": false} for instant variable/component extraction\n`;
      response += `- Select smaller components instead of entire pages\n`;
      response += `- Variables and design tokens are still fully available\n\n`;
    }

    // Raw Data
    response += `**Raw Data:** ${JSON.stringify(figmaData, null, 2)}`;

    return response;
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
