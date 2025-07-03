# CLAUDE.md

This file provides guidance to Claude Code when working on the Figma Bridge MCP project.

## Project Overview

The Figma Bridge MCP is an intelligent orchestrator that bridges Figma designs to production code through context aggregation and automated code generation. It acts as a Model
Context Protocol (MCP) server that integrates with AI coding tools (Cursor, Windsurf, Claude Code) to generate accurate, component-based React code from Figma designs while
maintaining design system consistency.

## Core Product Vision

**Primary Goal**: Bridge Figma designs to production code using existing design system components
**Core Problem**: Designers create in Figma, developers implement in code, but there's a disconnect between design tokens, components, and actual implementation
**Solution**: MCP Bridge that orchestrates context from Figma MCP + design system docs + codebase analysis to generate accurate, component-based code

## Key Workflow

1. Developer shares Figma frame URL in AI coding tool
2. Official Figma MCP extracts design specifications
3. Our Bridge MCP is called with Figma extraction information
4. Bridge MCP provides comprehensive context (design system docs, code components, tokens, architecture)
5. Generate scaffolded React code using existing components and proper design tokens
6. Developer reviews and refines the generated code

## Development Phases

### Phase 1: Foundation & Core Infrastructure (FBMCP-18 to FBMCP-22, FBMCP-46 to FBMCP-49)

- Set up TypeScript MCP server with proper tooling and protocol compliance
- Integrate with official Figma MCP tool (IMPORTANT: we use official Figma MCP, not direct API)
- Implement basic React component discovery and cataloging
- Build Figma context extraction layer
- Support all MCP transport protocols (stdio, WebSockets, SSE, UNIX sockets)
- Create intelligent project architecture detection
- Build interactive setup wizard with guided configuration

### Phase 2: Context Aggregation & Mapping (FBMCP-23, FBMCP-24, FBMCP-26, FBMCP-29-33)

- Implement AI-powered semantic component matching with 85%+ accuracy
- Build design token synchronization across styling approaches (styled-components, Tailwind, CSS-in-JS)
- Parse documentation from Storybook, Notion, Markdown, Supernova, and custom URLs
- Create multi-source context aggregation engine
- Implement learning system that improves with feedback

### Phase 3: Code Generation & Validation (FBMCP-25, FBMCP-27, FBMCP-28, FBMCP-34)

- Build React code generation engine using existing components (NOT creating new ones)
- Implement design system validation and quality assurance
- Create comprehensive MCP tools interface
- Integrate brand context and guidelines

### Phase 4: Advanced Features (FBMCP-35-37)

- Implement performance optimization with sub-second response times
- Build telemetry and analytics system
- Add enterprise security and authentication features

### Phase 5: Production Readiness (FBMCP-38-40, FBMCP-50)

- Create comprehensive testing suite (>90% coverage)
- Build documentation and onboarding system
- Implement progressive feature introduction and learning
- Prepare for production deployment

## Critical Technical Requirements

### MCP Protocol Compliance

- Follow MCP 2025-03-26 specification exactly
- Implement JSON-RPC 2.0 with stateful connections
- Support all required MCP primitives: Tools, Resources, Prompts
- Ensure security compliance with user consent and data protection
- Use zod for schema validation

### Core MCP Tools to Implement

```typescript
// FBMCP-28: These are the exact tools our MCP must expose
- extractFigmaContext(url, options): Extract design data from Figma MCP
- generateReactCode(figmaData, preferences): Generate React components
- validateDesignSystem(code, rules): Validate design consistency
- mapComponents(figmaComponents, codeComponents): Map design to code
- syncTokens(figmaTokens, codeTokens): Synchronize design tokens
- analyzeCodebase(path, framework): Analyze project structure

Framework Priority

- React First: Prioritize React support as specified
- Detect and support styled-components, Tailwind CSS, CSS-in-JS, CSS modules
- Future: Vue, Angular, Svelte support

Documentation Sources

- Storybook (CSF format, MDX, component documentation)
- Notion (via Notion API integration)
- Markdown/MDX (with front matter metadata)
- Supernova (via API integration)
- Custom URLs (web scraping with authentication support)

Key Design Principles

1. Use Existing Components: Generated code must use existing codebase components, NOT create new ones
2. Design System Consistency: Maintain 1:1 design-to-code mapping with proper tokens
3. Minimize Context Switching: Provide unified context without tool switching
4. Respect User Agency: Always require user consent for data access and tool execution
5. Performance First: Sub-second response times for cached data, <2s for fresh data

Code Generation Standards

Generated Code Must:

- Compile without errors and follow existing project conventions
- Use existing React components from the codebase
- Apply correct design tokens and styling approaches
- Generate proper TypeScript interfaces and props
- Include semantic HTML with accessibility attributes
- Handle responsive design with appropriate breakpoints
- Pass existing linting and type checking rules

Example Generated Code Structure:

import { Button, Card, Typography } from '@/components/ui';
import { tokens } from '@/design-system/tokens';

interface FeatureCardProps {
  title: string;
  description: string;
  onAction: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  onAction
}) => {
  return (
    <Card spacing={tokens.spacing.md}>
      <Typography variant="h3" color={tokens.colors.text.primary}>
        {title}
      </Typography>
      <Typography variant="body" color={tokens.colors.text.secondary}>
        {description}
      </Typography>
      <Button variant="primary" onClick={onAction}>
        Learn More
      </Button>
    </Card>
  );
};

Security & Compliance

- Implement OAuth 2.1 for API authentication
- Secure credential storage with encryption
- User consent flows for all data access
- Audit logging for compliance
- GDPR-compliant data handling

Success Metrics

- 80% reduction in design-to-code implementation time
- 95% component mapping accuracy
- Generated code passes existing project linting/testing without modification
- Sub-second response times for cached operations
- Seamless integration with Cursor, Windsurf, Claude Code

Development Guidelines

When Working on This Project:

1. Always check Linear issues first: Reference specific FBMCP-XX issue numbers
2. Follow MCP specification: Ensure all implementations are protocol-compliant
3. Test with real projects: Use actual React codebases for validation
4. Security first: Implement proper authentication and user consent
5. Performance matters: Optimize for speed and memory usage
6. Document everything: Code should be self-documenting with clear interfaces

Testing Strategy:

- Unit tests for all core modules (Jest)
- Integration tests for MCP protocol compliance
- End-to-end tests with real Figma files and codebases
- Performance tests for response time requirements
- Security tests for authentication and data protection

Integration with AI Coding Tools

The MCP server will be configured in AI tools like:
// Claude Desktop config example
{
  "mcpServers": {
    "figma-bridge": {
      "command": "node",
      "args": ["path/to/figma-bridge-mcp/dist/index.js"]
    }
  }
}

Important Notes

- Use Official Figma MCP: Never implement direct Figma API calls - always use official Figma MCP
- Component Reuse: Focus on discovering and reusing existing components, not creating new ones
- Token Translation: Understand the project's styling system to translate Figma variables correctly
- Architecture Aware: Detect and respect existing project patterns and conventions
- Progressive Enhancement: Start simple, add complexity gradually based on user needs

Reference Implementation

See Linear project "Figma Bridge MCP" for complete task breakdown and specifications. Each issue contains detailed acceptance criteria and technical requirements.
```
