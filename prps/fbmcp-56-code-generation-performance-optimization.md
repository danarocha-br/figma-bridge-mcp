# Code Generation Performance Optimization (FBMCP-56)

## Purpose

Optimize Figma code generation performance from 45+ seconds to <10 seconds for 90% of layouts through streaming responses, progressive loading, and intelligent timeout management. Enable reliable layout analysis for complex Figma frames without timeout errors.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal

Implement a performance-optimized version of the `extractFigmaContext` MCP tool that:
- Streams partial results as they become available (variables → components → code)
- Provides real-time progress indicators during long operations
- Implements smart timeout strategies with partial data return
- Maintains backward compatibility with existing integrations
- Reduces code generation timeouts from current 45+ seconds to <10 seconds for 90% of use cases

## Why

- **Business Value**: Enables reliable layout analysis which is core to the Bridge MCP value proposition
- **User Impact**: Eliminates frustrating 45+ second waits and timeout errors in AI coding workflows
- **Integration**: Unlocks complex Figma frame processing for real-world design-to-code scenarios
- **Problems Solved**: 
  - Current timeout errors blocking layout analysis workflows
  - Poor user experience with long operations providing no feedback
  - Loss of partial data when operations timeout
  - Inability to process complex design files effectively

## What

**User-Visible Behavior:**
- `extractFigmaContext` tool returns immediate progress updates
- Partial results available within 2-5 seconds (variables, basic component info)
- Code generation continues in background with streaming updates
- Progress indicators show "Variables extracted (30%) → Components analyzed (60%) → Code generated (100%)"
- Graceful degradation when operations timeout with useful partial data

**Technical Requirements:**
- Streaming MCP response implementation
- Progressive data extraction with priority ordering
- Configurable timeout strategies per data type
- Background operation management
- Real-time progress reporting via MCP content updates

### Success Criteria

- [ ] Code generation completes in <10 seconds for 90% of layouts
- [ ] Users get immediate feedback (variables/components) within 2-5 seconds
- [ ] No timeout errors for standard Figma frames (up to 50 components)
- [ ] Partial results always available even if code generation fails
- [ ] Backward compatibility with existing `extractFigmaContext` API
- [ ] All existing tests pass
- [ ] New streaming features integrate with MCP protocol
- [ ] Code follows TypeScript best practices and project patterns

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Include these in your context window
- file: CLAUDE.md
  why: Project overview, development guidelines, and architecture patterns
  critical: MCP protocol compliance and TypeScript patterns

- file: src/server.ts
  why: Main MCP server implementation and tool handler patterns  
  critical: extractFigmaContext handler (lines 320-541) shows current implementation

- file: src/types/mcp.ts
  why: Zod schemas for MCP tool validation
  critical: FigmaContextSchema pattern for new streaming schema

- file: src/types/figma.ts
  why: Figma client types and error handling patterns
  critical: FigmaClientConfig timeout settings (line 94-99)

- file: src/clients/figma-client.ts
  why: Integration patterns with Figma MCP server
  critical: SSE connection handling, retry logic, and performance bottlenecks

- url: https://modelcontextprotocol.io/docs
  why: MCP specification and protocol details  
  critical: Progress reporting and streaming response patterns

- file: package.json
  why: Available dependencies and scripts
  critical: ESLint, Prettier, Jest configuration
```

### Current Codebase Tree

```bash
figma-bridge-mcp/
├── src/
│   ├── server.ts              # Main MCP server - extractFigmaContext handler
│   ├── index.ts               # Entry point
│   ├── clients/
│   │   └── figma-client.ts    # Figma MCP integration - performance bottleneck
│   ├── config/
│   │   └── figma-config.ts    # Configuration management
│   ├── types/
│   │   ├── mcp.ts             # MCP tool schemas - FigmaContextSchema
│   │   └── figma.ts           # Figma client types - timeout config
│   └── __tests__/             # Jest test files
├── dist/                      # Compiled JavaScript
└── scripts/                   # Development scripts
```

### Desired Codebase Tree

```bash
src/
├── server.ts                         # ADD streaming extractFigmaContext handler
├── types/
│   ├── mcp.ts                        # ADD StreamingFigmaContextSchema
│   └── performance.ts                # NEW: Progress tracking types
├── services/
│   ├── streaming-extractor.ts        # NEW: Core streaming logic
│   └── progress-tracker.ts           # NEW: Progress reporting service
├── clients/
│   └── figma-client.ts              # MODIFY: Add streaming methods
└── __tests__/
    ├── streaming-extractor.test.ts   # NEW: Core logic tests
    └── performance-optimization.test.ts # NEW: Integration tests
```

### Known Gotchas & Performance Issues

```typescript
// CRITICAL: Current performance bottleneck in extractFigmaContext
// Lines 417-438 in server.ts - code generation blocks for 45+ seconds
const codeData = await figmaClient.getCode(/* ... */); // SLOW!

// CRITICAL: MCP SDK requires specific import patterns
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// Note: .js extensions required for ESM

// CRITICAL: Figma MCP uses SSE with HTTP 202 responses
// Current timeout: 120000ms (120 seconds) - too generous
export const DEFAULT_FIGMA_CLIENT_CONFIG: FigmaClientConfig = {
  timeout: 120000, // REDUCE this for better UX
  retryAttempts: 1, // Good - reduces background noise
};

// GOTCHA: Progress updates must follow MCP content format
return {
  content: [{ 
    type: 'text', 
    text: 'Progress: Variables extracted (30%)...' 
  }],
  isError?: boolean
};

// CRITICAL: SSE streaming complexity in figma-client.ts
// Lines 634-700 show complex async SSE handling that needs optimization

// GOTCHA: Jest has issues with MCP SDK - test business logic separately
// Don't test SSE streaming in unit tests - mock the client instead
```

### Performance Analysis of Current Implementation

```typescript
// CURRENT BOTTLENECK ANALYSIS from server.ts handleExtractFigmaContext:

// Fast operations (< 2 seconds):
variables = await figmaClient.getVariableDefinitions(input.url, nodeId);
codeConnectMap = await figmaClient.getCodeConnectMap(input.url, nodeId);

// SLOW operation (45+ seconds for complex frames):
codeData = await figmaClient.getCode(selection, options); // PROBLEM HERE!

// ROOT CAUSE: Sequential execution blocks user feedback
// SOLUTION: Parallel execution + streaming responses
```

## Implementation Blueprint

### Data Models and Schemas

```typescript
// ADD to src/types/mcp.ts - Streaming schema with progress support
export const StreamingFigmaContextSchema = z.object({
  // Same inputs as FigmaContextSchema but with streaming options
  url: z.string().refine(/* same validation */).optional(),
  figmaData: z.union([FigmaDataSchema, z.object({}).strict()]).optional(),
  options: z.object({
    includeVariants: z.boolean().optional(),
    includeComponents: z.boolean().optional(), 
    includeTokens: z.boolean().optional(),
    includeCode: z.boolean().optional(),
    // NEW: Streaming options
    streamingEnabled: z.boolean().default(true),
    progressUpdates: z.boolean().default(true),
    timeoutStrategy: z.enum(['graceful', 'partial', 'fail']).default('graceful'),
    maxWaitTime: z.number().min(5000).max(60000).default(15000), // 15s max wait
  }).optional(),
});

// NEW: src/types/performance.ts - Progress tracking types
export interface ExtractionProgress {
  stage: 'variables' | 'components' | 'code' | 'complete';
  percentage: number;
  message: string;
  duration: number;
  partialData?: {
    variables?: any[];
    components?: any[];
    code?: string;
  };
}

export interface StreamingResponse {
  progress: ExtractionProgress;
  isComplete: boolean;
  error?: string;
}
```

### List of Tasks (in order of completion)

```yaml
Task 1: "Add Streaming Schema and Types"
MODIFY src/types/mcp.ts:
  - ADD StreamingFigmaContextSchema following existing patterns
  - EXPORT type inference for streaming inputs
  - MAINTAIN backward compatibility with FigmaContextSchema

CREATE src/types/performance.ts:
  - DEFINE ExtractionProgress interface
  - DEFINE StreamingResponse interface  
  - FOLLOW existing TypeScript patterns

Task 2: "Implement Core Streaming Logic"
CREATE src/services/streaming-extractor.ts:
  - IMPLEMENT StreamingExtractor class
  - HANDLE parallel execution of variables, components, code
  - PROVIDE progress callbacks for real-time updates
  - IMPLEMENT timeout strategies (graceful, partial, fail)

CREATE src/services/progress-tracker.ts:
  - IMPLEMENT ProgressTracker class
  - TRACK execution stages and timing
  - CALCULATE percentage complete
  - FORMAT user-friendly progress messages

Task 3: "Add Streaming Methods to Figma Client"
MODIFY src/clients/figma-client.ts:
  - ADD getCodeWithProgress method with callback support
  - ADD getVariablesWithProgress method
  - IMPLEMENT timeout configuration per operation type
  - REUSE existing SSE connection logic

Task 4: "Register Streaming MCP Tool"
MODIFY src/server.ts:
  - ADD extractFigmaContextStreaming to tools array in ListToolsRequestSchema
  - FOLLOW existing tool definition pattern for inputSchema
  - MAINTAIN extractFigmaContext for backward compatibility
  - INCLUDE proper progress update documentation

Task 5: "Implement Streaming Tool Handler"
MODIFY src/server.ts:
  - ADD case for extractFigmaContextStreaming in CallToolRequestSchema handler
  - CREATE handleExtractFigmaContextStreaming method
  - IMPLEMENT real-time progress updates via MCP responses
  - HANDLE partial results when operations timeout
  - MAINTAIN existing error handling patterns

Task 6: "Add Comprehensive Tests"
CREATE src/__tests__/streaming-extractor.test.ts:
  - TEST parallel execution logic
  - TEST timeout strategies
  - TEST progress calculations
  - MOCK Figma client responses

CREATE src/__tests__/performance-optimization.test.ts:
  - TEST streaming MCP tool integration
  - TEST progress update format
  - TEST backward compatibility
  - TEST error scenarios
```

### Per Task Implementation Notes

```typescript
// Task 2 Example: Core Streaming Logic
export class StreamingExtractor {
  private progressTracker: ProgressTracker;
  private figmaClient: FigmaClient;

  async extractWithProgress(
    input: StreamingFigmaContextInput,
    onProgress: (progress: ExtractionProgress) => void
  ): Promise<any> {
    this.progressTracker.start();
    
    // Stage 1: Variables (fast - 1-2 seconds)
    onProgress(this.progressTracker.updateStage('variables', 0));
    const variables = await this.figmaClient.getVariablesWithProgress(
      input.url, 
      (pct) => onProgress(this.progressTracker.updateStage('variables', pct))
    );
    
    // Stage 2: Components (medium - 2-5 seconds)  
    onProgress(this.progressTracker.updateStage('components', 0));
    const components = await this.figmaClient.getCodeConnectMapWithProgress(
      input.url,
      (pct) => onProgress(this.progressTracker.updateStage('components', pct))
    );
    
    // Stage 3: Code (slow - 5-45 seconds with timeout)
    onProgress(this.progressTracker.updateStage('code', 0));
    const code = await this.extractCodeWithTimeout(input, onProgress);
    
    onProgress(this.progressTracker.complete());
    return { variables, components, code };
  }

  private async extractCodeWithTimeout(
    input: StreamingFigmaContextInput, 
    onProgress: (progress: ExtractionProgress) => void
  ): Promise<string | null> {
    const timeout = input.options?.maxWaitTime || 15000;
    
    try {
      return await Promise.race([
        this.figmaClient.getCodeWithProgress(input.url, 
          (pct) => onProgress(this.progressTracker.updateStage('code', pct))
        ),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Code generation timeout')), timeout)
        )
      ]);
    } catch (error) {
      if (input.options?.timeoutStrategy === 'graceful') {
        onProgress(this.progressTracker.updateMessage('Code generation timed out - partial results available'));
        return null; // Graceful degradation
      }
      throw error;
    }
  }
}

// Task 5 Example: Streaming Handler Implementation
private async handleExtractFigmaContextStreaming(args: unknown): Promise<any> {
  const input = StreamingFigmaContextSchema.parse(args);
  
  try {
    const extractor = new StreamingExtractor();
    let finalResult: any = null;
    const progressHistory: ExtractionProgress[] = [];
    
    await extractor.extractWithProgress(input, (progress) => {
      progressHistory.push(progress);
      // Note: Real streaming would send progress immediately
      // For now, we'll collect and return final summary
    });
    
    const finalProgress = progressHistory[progressHistory.length - 1];
    
    return {
      content: [{
        type: 'text',
        text: `✅ Figma context extracted with streaming optimization\n\n` +
              `📊 **Performance Summary:**\n` +
              `- Total Time: ${finalProgress.duration}ms\n` +
              `- Variables: ${finalProgress.partialData?.variables?.length || 0}\n` +
              `- Components: ${finalProgress.partialData?.components?.length || 0}\n` +
              `- Code Generated: ${finalProgress.partialData?.code ? 'Yes' : 'Partial'}\n\n` +
              `🚀 **Progress History:**\n` +
              progressHistory.map(p => `${p.stage}: ${p.percentage}% (${p.duration}ms)`).join('\n') +
              `\n\n**Raw Data:** ${JSON.stringify(finalResult, null, 2)}`
      }]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Streaming extraction failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}
```

### Integration Points

```yaml
MCP_PROTOCOL:
  - schema: 'StreamingFigmaContextSchema validates all streaming inputs'
  - responses: 'Progress updates follow content array format'
  - tools: 'Register extractFigmaContextStreaming alongside existing tool'
  - compatibility: 'Maintain extractFigmaContext for backward compatibility'

FIGMA_CLIENT:
  - import: "const { FigmaClient } = await import('./clients/figma-client.js')"
  - methods: 'Add getCodeWithProgress, getVariablesWithProgress methods'
  - timeouts: 'Per-operation timeout configuration instead of global'
  - connection: 'Reuse existing SSE connection logic'

PERFORMANCE:
  - parallelization: 'Execute variables + components concurrently'
  - timeouts: 'Smart timeout per operation type (variables: 5s, components: 10s, code: 15s)'
  - caching: 'Leverage existing cache for repeated operations'
  - monitoring: 'Track performance metrics for optimization'

TYPESCRIPT:
  - imports: 'Use .js extensions for local imports'
  - exports: 'Export streaming types and implementation separately'  
  - errors: 'Extend FigmaClientError for timeout scenarios'
```

## Validation Loop

### Level 1: Syntax & Style

```bash
# Run these FIRST - fix any errors before proceeding
pnpm run typecheck                    # TypeScript compilation
pnpm run lint                         # ESLint with auto-fix
pnpm run format                       # Prettier formatting

# Expected: No errors. If errors, READ carefully and fix.
```

### Level 2: Unit Tests

```typescript
// CREATE src/__tests__/streaming-extractor.test.ts
describe('StreamingExtractor', () => {
  it('should validate streaming schema correctly', () => {
    const validInput = { 
      url: 'https://figma.com/file/123', 
      options: { streamingEnabled: true } 
    };
    const result = StreamingFigmaContextSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should handle parallel extraction', async () => {
    const extractor = new StreamingExtractor();
    const progressUpdates: ExtractionProgress[] = [];
    
    await extractor.extractWithProgress(
      { url: 'test-url' },
      (progress) => progressUpdates.push(progress)
    );
    
    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates[0].stage).toBe('variables');
    expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
  });

  it('should handle timeout gracefully', async () => {
    const extractor = new StreamingExtractor();
    // Mock slow code generation
    jest.spyOn(extractor['figmaClient'], 'getCodeWithProgress')
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 20000)));
    
    const result = await extractor.extractWithProgress(
      { url: 'test-url', options: { maxWaitTime: 1000, timeoutStrategy: 'graceful' } },
      () => {}
    );
    
    expect(result.code).toBeNull(); // Graceful degradation
    expect(result.variables).toBeDefined(); // Partial results available
  });
});
```

```bash
# Run and iterate until passing:
pnpm run test                         # All tests
pnpm run test streaming-extractor     # Specific test file
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: MCP Integration Test

```bash
# Test with MCP Inspector (visual testing)
pnpm run inspector

# Expected: extractFigmaContextStreaming appears in web interface
# Expected: Tool accepts valid inputs with streaming options
# Expected: Progress updates visible in response format
# Expected: Backward compatibility with extractFigmaContext maintained

# Alternative: Command line testing  
pnpm run test:mcp
```

### Level 4: Performance Validation

```bash
# Test performance improvement with real Figma URLs
node -e "
const { FigmaBridgeMCPServer } = require('./dist/server.js');
// Test with complex Figma frame that previously timed out
// Measure: Time to first result < 5 seconds
// Measure: Complete extraction < 15 seconds (vs previous 45+ seconds)
"

# Expected: Dramatic performance improvement
# Expected: No timeout errors for standard frames
# Expected: Partial results always available
```

## Final Validation Checklist

- [ ] All tests pass: `pnpm run test`
- [ ] No TypeScript errors: `pnpm run typecheck`  
- [ ] No linting errors: `pnpm run lint`
- [ ] MCP Inspector shows both tools correctly: `pnpm run inspector`
- [ ] Streaming tool handles progress updates
- [ ] Timeout strategies work as expected (graceful, partial, fail)
- [ ] Backward compatibility maintained with extractFigmaContext
- [ ] Performance improvement measurable (45s → <15s)
- [ ] Code follows existing project patterns
- [ ] Error cases handled gracefully with partial results

---

## Anti-Patterns to Avoid

❌ Don't break backward compatibility with extractFigmaContext tool
❌ Don't ignore timeout scenarios - implement graceful degradation  
❌ Don't block on slow operations - stream partial results immediately
❌ Don't overcomplicate MCP responses - maintain existing content format
❌ Don't test SSE streaming in unit tests - mock client interactions
❌ Don't hardcode timeouts - make them configurable per operation
❌ Don't lose existing error handling patterns - extend them for streaming
❌ Don't ignore progress tracking - users need real-time feedback

## Success Confidence Score: 9/10

This PRP provides comprehensive context for one-pass implementation:
- ✅ Specific Linear issue requirements understood
- ✅ Current performance bottlenecks identified  
- ✅ MCP patterns and existing code thoroughly analyzed
- ✅ Streaming implementation strategy clearly defined
- ✅ Backward compatibility strategy included
- ✅ Comprehensive testing approach outlined
- ✅ Validation gates are executable
- ✅ Integration points well-documented
- ✅ Performance metrics and success criteria defined

**Ready for one-pass implementation with Claude Code.**