# Execute Figma Bridge MCP PRP

Implement a feature using the PRP file following MCP development patterns.

## PRP File: $ARGUMENTS

## Execution Process

1. **Load PRP Context**
   - Read the specified PRP file thoroughly
   - Understand all MCP tool requirements and context
   - Review referenced files (`CLAUDE.md`, `src/server.ts`, `src/types/mcp.ts`, etc.)
   - Follow all instructions in the PRP and extend research if needed
   - Ensure you have all needed context for MCP tool implementation
   - Do more web searches for MCP patterns and TypeScript best practices as needed
   - Verify understanding of Figma client integration patterns

2. **ULTRATHINK - MCP Implementation Strategy**
   - Think hard before executing the plan. Create a comprehensive implementation strategy addressing all MCP requirements.
   - Break down complex MCP tool tasks into smaller, manageable steps using your todos tools.
   - Use the TodoWrite tool to create and track your MCP implementation plan.
   - Identify MCP tool patterns from existing code (like `extractFigmaContext`) to follow.
   - Plan Zod schema structure and validation approach.
   - Design error handling strategy using existing `FigmaClientError` patterns.
   - Consider MCP protocol compliance and response formatting.

3. **Execute MCP Implementation Plan**
   - Implement Zod schemas in `src/types/mcp.ts` following existing patterns
   - Register MCP tool in `src/server.ts` with proper inputSchema
   - Implement tool handler following existing error handling patterns
   - Add business logic with proper TypeScript types
   - Create comprehensive tests separating business logic from MCP protocol
   - Follow TypeScript strict mode and ESM import requirements

4. **Validate MCP Implementation**
   - Run Level 1 validation:
     ```bash
     pnpm run typecheck    # TypeScript compilation
     pnpm run lint         # ESLint with auto-fix
     pnpm run format       # Prettier formatting
     ```
   - Run Level 2 validation:
     ```bash
     pnpm run test         # Jest test suite
     pnpm run test [feature-name]  # Specific tests
     ```
   - Run Level 3 validation:
     ```bash
     pnpm run inspector    # Visual MCP testing
     pnpm run test:mcp     # Command line MCP testing
     ```
   - Run Level 4 validation:
     ```bash
     pnpm run build       # Clean build verification
     ```
   - Fix any failures using error patterns in PRP
   - Re-run until all validation levels pass

5. **MCP Integration Testing**
   - Test tool registration appears correctly in MCP Inspector
   - Verify tool accepts valid inputs and returns proper MCP responses
   - Confirm tool rejects invalid inputs with clear error messages
   - Test integration with Figma client if applicable
   - Validate error handling follows project patterns
   - Ensure response format follows MCP content array structure

6. **Complete Implementation**
   - Ensure all PRP checklist items are completed
   - Run final validation suite (all levels 1-4)
   - Test end-to-end MCP tool functionality
   - Verify TypeScript compilation is clean
   - Confirm all tests pass including MCP integration
   - Report completion status with validation results
   - Read the PRP again to ensure complete implementation

7. **Reference the PRP Throughout**
   - Always reference the PRP when uncertain about requirements
   - Follow the exact task order specified in the PRP
   - Use the validation loops as specified
   - Apply the gotchas and anti-patterns guidance
   - Maintain context density as specified in the PRP

## MCP-Specific Execution Notes

### Critical Implementation Patterns

- **Schema First**: Always start with Zod schema definition
- **Error Handling**: Use try/catch with MCP response format
- **Dynamic Imports**: Import business logic dynamically to avoid circular dependencies
- **Response Format**: Always return `{ content: [{ type: 'text', text: '...' }] }`
- **Validation**: Validate inputs with Zod before execution

### Common MCP Gotchas to Watch For

- ESM imports require `.js` extensions for local files
- MCP SDK has Jest compatibility issues - test business logic separately
- Figma MCP uses SSE with HTTP 202 responses
- All tool inputs must be validated with Zod schemas
- Error responses must include `isError: true` flag

### Validation Command Reference

```bash
# Quick validation during development
pnpm run typecheck && pnpm run lint

# Full test suite
pnpm run test:all

# MCP integration testing
pnpm run inspector  # Visual testing at http://localhost:6274
pnpm run test:mcp   # Command line testing

# Final build verification
pnpm run build && pnpm run start
```

## Success Criteria

Implementation is complete when:

- [ ] All TypeScript compilation passes without errors
- [ ] All ESLint rules pass
- [ ] All Jest tests pass (>80% coverage)
- [ ] MCP tool appears correctly in Inspector
- [ ] Tool handles valid/invalid inputs properly
- [ ] Error handling follows project patterns
- [ ] Integration with Figma client works (if applicable)
- [ ] Response format follows MCP specification
- [ ] All PRP requirements are fully implemented

Note: If validation fails at any level, use error patterns specified in the PRP to fix and retry. The goal is complete MCP tool implementation that integrates seamlessly with the existing Figma Bridge architecture.
