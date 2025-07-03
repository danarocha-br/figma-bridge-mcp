#!/usr/bin/env node

import { FigmaBridgeMCPServer } from './server.js';

async function main(): Promise<void> {
  try {
    const server = new FigmaBridgeMCPServer();
    await server.run();
  } catch (error) {
    console.error('Failed to start Figma Bridge MCP Server:', error);
    process.exit(1);
  }
}

// Handle module execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error in main:', error);
    process.exit(1);
  });
}
