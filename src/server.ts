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

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'extractFigmaContext',
            description:
              'Extract design context and specifications from Figma using the official Figma MCP',
            inputSchema: FigmaContextSchema,
          },
          {
            name: 'generateReactCode',
            description:
              'Generate React component code using existing components and design tokens',
            inputSchema: ReactCodeGenerationSchema,
          },
          {
            name: 'mapComponents',
            description:
              'Map Figma components to existing codebase components using AI-powered matching',
            inputSchema: ComponentMappingSchema,
          },
          {
            name: 'validateDesignSystem',
            description: 'Validate generated code against design system rules and guidelines',
            inputSchema: DesignSystemValidationSchema,
          },
          {
            name: 'syncTokens',
            description: 'Synchronize design tokens between Figma and codebase',
            inputSchema: TokenSyncSchema,
          },
          {
            name: 'analyzeCodebase',
            description: 'Analyze project structure and discover React components',
            inputSchema: CodebaseAnalysisSchema,
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

  private setupErrorHandling(): void {
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  // Tool implementation stubs - to be implemented in future phases
  private async handleExtractFigmaContext(args: unknown): Promise<any> {
    const input = FigmaContextSchema.parse(args);

    // TODO: FBMCP-19 - Integrate with official Figma MCP tool
    return {
      content: [
        {
          type: 'text',
          text: `Figma context extraction placeholder for URL: ${input.url}`,
        },
      ],
    };
  }

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
