# Create PRP

## Feature file: $ARGUMENTS

Generate a complete PRP for Figma Bridge MCP feature implementation with thorough research. Ensure context is passed to the AI agent to enable self-validation and iterative refinement. Read the feature task in Linear first to understand what needs to be created, how the examples provided help, and any other considerations.

## Research processes

1. **MCP Codebase Analysis**

- Search for similar MCP tools/patterns in `src/server.ts`
- Identify Zod schemas to reference in `src/types/mcp.ts`
- Note existing MCP tool registration patterns
- Check TypeScript patterns and error handling in `src/clients/figma-client.ts`
- Review test patterns in `src/__tests__/ for validation` approach
- Examine existing tool handlers for response formatting

2. **MCP Protocol Research**

- Review MCP specification at https://modelcontextprotocol.io/docs
- Check MCP SDK documentation for tool patterns
- Search for MCP implementation examples online
- Research JSON-RPC 2.0 patterns and best practices
- Look for Figma MCP integration examples

3. **External Research**

- Search for similar features/patterns online
- Library documentation (include specific URLs)
- Implementation examples (GitHub/StackOverflow/blogs)
- Figma API patterns and SSE handling
- TypeScript best practices for MCP tools

3. **User Clarification** (if needed)

- Specific MCP tool patterns to mirror and where to find them?
- Figma integration requirements and existing client usage?
- Testing strategy for MCP protocol vs business logic?

## PRP Generation

Using prps/templates/prp-base.md as template:

### Critical Context to Include and pass to the AI agent as part of the PRP

- **Project Documentation**:
  `CLAUDE.md` - Project overview and development guidelines
  `README.md` - Project vision and architecture overview
  `package.json` - Available dependencies and scripts

- **MCP Implementation Patterns**:
  `src/server.ts` - Tool registration and handler patterns
  `src/types/mcp.ts` - Zod schema validation patterns
  `src/types/figma.ts` - Figma client types and error classes

- **Code Examples**: Real snippets from existing tools like `extractFigmaContext`

-**Gotchas**:

- MCP SDK ESM import requirements (.js extensions)
- Figma MCP SSE connection patterns
- Jest compatibility issues with MCP SDK
- TypeScript strict mode requirements

-**Patterns**:

- Error handling with try/catch and MCP response format
- Zod schema validation before execution
- Dynamic imports for business logic
- Response formatting with content arrays

### Implementation Blueprint

- Start with Zod schema definition following existing patterns
- Reference `src/server.ts` for tool registration approach
- Include MCP-compliant error handling strategy
- List tasks to be completed to fulfill the PRP in the order they should be completed:
  1.  Define types and schemas
  2.  Register MCP tool
  3.  Implement tool handler
  4.  Add business logic
  5.  Create comprehensive tests

### Validation Gates (Must be Executable for TypeScript/MCP)

```bash
# Level 1: TypeScript & Style
pnpm run typecheck                    # TypeScript compilation
pnpm run lint                         # ESLint with auto-fix
pnpm run format                       # Prettier formatting

# Level 2: Unit Tests
pnpm run test                         # Jest test suite
pnpm run test [feature-name]          # Specific feature tests

# Level 3: MCP Integration
pnpm run inspector                    # Visual MCP testing
pnpm run test:mcp                     # Command line MCP testing

# Level 4: Build Verification
pnpm run build                        # Ensure clean build

```

**_ CRITICAL AFTER YOU ARE DONE RESEARCHING AND EXPLORING THE CODEBASE BEFORE YOU START WRITING THE PRP _**

**_ ULTRATHINK ABOUT THE PRP AND PLAN YOUR APPROACH THEN START WRITING THE PRP _**

Consider:

- How does this tool fit into the existing MCP architecture?
- What Figma client patterns should be reused?
- How will the tool integrate with AI coding workflows?
- What validation is needed for MCP protocol compliance?
- How can the feature be tested independently of the MCP protocol?

## Output

Save as: `prps/{feature-name}.md`

## Quality Checklist

- [ ] All necessary MCP context included
- [ ] Validation gates are executable by AI agent
- [ ] References existing TypeScript/MCP patterns
- [ ] Clear MCP tool implementation path
- [ ] Figma client integration documented
- [ ] Error handling follows project patterns
- [ ] Zod schema validation included
- [ ] Testing strategy separates business logic from MCP protocol
- [ ] TypeScript strict mode compliance
- [ ] MCP response format compliance

Score the PRP on a scale of 1-10 (confidence level to succeed in one-pass implementation using Claude Code for MCP development)

## Success Criteria for Figma Bridge MCP PRPs

A successful PRP should enable:

- One-pass implementation of a working MCP tool
- Integration with existing Figma client patterns
- Proper MCP protocol compliance
- TypeScript compilation without errors
- All tests passing including MCP integration tests
- Tool appearing correctly in MCP Inspector
- Seamless integration with AI coding workflows

**Remember**: The goal is one-pass implementation success through comprehensive MCP context and existing project patterns.
