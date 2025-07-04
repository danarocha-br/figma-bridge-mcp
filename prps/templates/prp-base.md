## Purpose

Template optimized for AI agents to implement features in the Figma Bridge MCP TypeScript project with sufficient context and self-validation capabilities to achieve working code through iterative refinement.

## Core Principles

1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal

[What needs to be built - be specific about the end state and desires]

## Why

- [Business value and user impact]
- [Integration with existing features and MCP tools]
- [Problems this solves and for whom]

## What

[User-visible behavior and technical requirements]

### Success Criteria

- [ ] [Specific measurable outcomes]
- [ ] [All existing tests pass]
- [ ] [New feature integrates with MCP protocol]
- [ ] [Code follows TypeScript best practices]

## All Needed Context

### Documentation & References (list all context needed to implement the feature)

```yaml
# MUST READ - Include these in your context window
- file: CLAUDE.md
  why: Project overview, development guidelines, and architecture patterns
  critical: MCP protocol compliance and TypeScript patterns

- file: src/server.ts
  why: Main MCP server implementation and tool handler patterns
  critical: How to add new MCP tools and error handling

- file: src/types/mcp.ts
  why: Zod schemas for MCP tool validation
  critical: Schema patterns and validation approach

- file: src/types/figma.ts
  why: Figma client types and error handling patterns
  critical: Error class hierarchy and response types

- file: src/clients/figma-client.ts
  why: Integration patterns with Figma MCP server
  critical: SSE connection handling and retry logic

- url: https://modelcontextprotocol.io/docs
  why: MCP specification and protocol details
  critical: Tool registration and JSON-RPC patterns

- file: package.json
  why: Available dependencies and scripts
  critical: ESLint, Prettier, Jest configuration
```

### Current Codebase tree (run `tree` in the root of the project) to get an overview of the codebase

```bash
figma-bridge-mcp/
├── src/
│   ├── server.ts              # Main MCP server
│   ├── index.ts               # Entry point
│   ├── clients/
│   │   └── figma-client.ts    # Figma MCP integration
│   ├── config/
│   │   └── figma-config.ts    # Configuration management
│   └── types/
│       ├── mcp.ts             # MCP tool schemas
│       └── figma.ts           # Figma client types
├── src/__tests__/             # Jest test files
├── dist/                      # Compiled JavaScript
└── scripts/                   # Development scripts

```

### Desired Codebase tree with files to be added and responsibility of file

```bash
# Example structure for new feature
src/
├── [new-file-path]            # [Responsibility description]
├── types/
│   └── [new-types].ts         # [Type definitions for feature]
└── __tests__/
    └── [new-feature].test.ts  # [Test coverage]

```

### Known Gotchas of our codebase & Library Quirks

```typescript
// CRITICAL: MCP SDK requires specific import patterns
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// Note: .js extensions required for ESM

// CRITICAL: Zod validation must happen before tool execution
const input = YourSchema.parse(args);

// CRITICAL: MCP tools must return specific response format
return {
  content: [{ type: 'text', text: 'response' }],
  isError?: boolean
};

// GOTCHA: Figma MCP uses SSE with HTTP 202 responses
// Don't expect immediate JSON responses

// GOTCHA: Jest has issues with MCP SDK - use minimal imports in tests
// Prefer testing business logic separately from MCP protocol

// CRITICAL: All errors must be handled gracefully in MCP context
try {
  // implementation
} catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}
```

## Implementation Blueprint

Data Models and Schemas
Create type-safe interfaces and Zod schemas for validation.

```typescript
// Define Zod schemas in src/types/mcp.ts
export const NewFeatureSchema = z.object({
  requiredParam: z.string(),
  optionalParam: z.boolean().optional(),
});

export type NewFeatureInput = z.infer<typeof NewFeatureSchema>;

// Define response types in appropriate type file
export interface NewFeatureResponse {
  success: boolean;
  data: any;
  metadata?: Record<string, any>;
}
```

### List of Tasks (in order of completion)

```yaml
Task 1: "Add Zod Schema for New Feature"
MODIFY src/types/mcp.ts:
  - ADD new schema following existing patterns
  - EXPORT type inference
  - FOLLOW existing naming conventions

Task 2: "Register MCP Tool"
MODIFY src/server.ts:
  - FIND setupToolHandlers method
  - ADD new tool to tools array in ListToolsRequestSchema handler
  - FOLLOW existing tool definition pattern
  - INCLUDE proper JSON schema for inputSchema

Task 3: "Implement Tool Handler"
MODIFY src/server.ts:
  - ADD case for new tool in CallToolRequestSchema handler
  - CREATE private handler method following existing patterns
  - IMPLEMENT error handling with try/catch
  - RETURN proper MCP response format

Task 4: "Add Business Logic Implementation"
CREATE src/[feature-directory]/[implementation].ts:
  - IMPLEMENT core feature logic
  - FOLLOW existing error handling patterns
  - USE TypeScript strict mode
  - EXPORT functions for testing

Task 5: "Add Comprehensive Tests"
CREATE src/__tests__/[feature].test.ts:
  - TEST schema validation (valid/invalid inputs)
  - TEST business logic separately from MCP protocol
  - MOCK external dependencies
  - ACHIEVE >80% code coverage
```

### Per Task Implementation Notes

```typescript
// Task 2 Example: Tool Registration Pattern
{
  name: 'newFeatureTool',
  description: 'Brief description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      requiredParam: { type: 'string', description: 'Purpose of param' },
      optionalParam: { type: 'boolean', description: 'Purpose of param' }
    },
    required: ['requiredParam'],
    additionalProperties: false
  }
}

// Task 3 Example: Handler Implementation Pattern
private async handleNewFeature(args: unknown): Promise<any> {
  const input = NewFeatureSchema.parse(args);

  try {
    // Import implementation dynamically if needed
    const { implementNewFeature } = await import('./path/to/implementation.js');

    const result = await implementNewFeature(input);

    return {
      content: [{
        type: 'text',
        text: `✅ Feature completed: ${JSON.stringify(result, null, 2)}`
      }]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `❌ Feature failed: ${errorMessage}`
      }],
      isError: true
    };
  }
}
```

### Integration Points

```yaml
MCP_PROTOCOL:
  - schema: 'All inputs validated with Zod schemas'
  - responses: 'Follow content array format with text/error fields'
  - tools: 'Register in ListToolsRequestSchema handler'

FIGMA_CLIENT:
  - import: "const { FigmaClient } = await import('./clients/figma-client.js')"
  - connection: 'Always test connection before operations'
  - errors: 'Handle FigmaClientError, FigmaServerUnavailableError'

TYPESCRIPT:
  - imports: 'Use .js extensions for local imports'
  - exports: 'Export types and implementation separately'
  - errors: 'Extend existing error classes when appropriate'
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
// CREATE src/__tests__/new-feature.test.ts
describe('NewFeature', () => {
  it('should validate schema correctly', () => {
    const validInput = { requiredParam: 'test' };
    const result = NewFeatureSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid schema', () => {
    const invalidInput = {};
    const result = NewFeatureSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should handle business logic correctly', async () => {
    // Test implementation without MCP protocol overhead
    const result = await implementNewFeature({ requiredParam: 'test' });
    expect(result).toBeDefined();
  });
});
```

```bash
# Run and iterate until passing:
pnpm run test                         # All tests
pnpm run test new-feature            # Specific test file
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: MCP Integration Test

```bash
# Test with MCP Inspector (visual testing)
pnpm run inspector

# Expected: Tool appears in web interface
# Expected: Tool accepts valid inputs and returns proper responses
# Expected: Tool rejects invalid inputs with clear error messages

# Alternative: Command line testing
pnpm run test:mcp
```

### Level 4: End-to-End Validation

```bash
# Start server and test manually
pnpm run build && pnpm run start

# Test with real MCP client or Claude Code integration
# Expected: Tool integrates seamlessly with AI coding workflow
```

## Final validation Checklist

- [ ] All tests pass: `pnpm run test`
- [ ] No TypeScript errors: `pnpm run typecheck`
- [ ] No linting errors: `pnpm run lint`
- [ ] MCP Inspector shows tool correctly: `pnpm run inspector`
- [ ] Tool handles valid inputs correctly
- [ ] Tool rejects invalid inputs with clear errors
- [ ] Error cases handled gracefully
- [ ] Code follows existing project patterns
- [ ] Documentation updated if needed

---

## Anti-Patterns to Avoid

❌ Don't ignore TypeScript errors - fix them properly
❌ Don't skip Zod validation - it's required for MCP tools
❌ Don't create new error handling patterns - use existing ones
❌ Don't test MCP protocol in unit tests - test business logic only
❌ Don't use sync operations where async is expected
❌ Don't hardcode values that should be configurable
❌ Don't ignore ESLint/Prettier rules - follow project style
❌ Don't create circular imports - structure dependencies properly
