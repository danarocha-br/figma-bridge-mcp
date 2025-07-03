#!/bin/bash

# Test script for Figma Bridge MCP Server
# Run with: chmod +x test-mcp-tools.sh && ./test-mcp-tools.sh

echo "🚀 Testing Figma Bridge MCP Server..."
echo

# Start server in background
node dist/index.js &
SERVER_PID=$!

# Give server time to start
sleep 2

echo "📋 1. Testing tool listing..."
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | nc localhost 3000 2>/dev/null || {
  echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
}
echo

echo "🎯 2. Testing extractFigmaContext with valid URL..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"extractFigmaContext","arguments":{"url":"https://www.figma.com/file/test123/Sample-File","options":{"includeVariants":true}}},"id":2}' | node dist/index.js
echo

echo "❌ 3. Testing extractFigmaContext with invalid URL..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"extractFigmaContext","arguments":{"url":"not-a-url"}},"id":3}' | node dist/index.js
echo

echo "🧪 4. Testing analyzeCodebase tool..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"analyzeCodebase","arguments":{"path":"./src","framework":"react"}},"id":4}' | node dist/index.js
echo

echo "🎨 5. Testing generateReactCode tool..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generateReactCode","arguments":{"figmaData":{"components":[]},"preferences":{"typescript":true,"styling":"styled-components"}}},"id":5}' | node dist/index.js
echo

# Clean up
kill $SERVER_PID 2>/dev/null

echo "✅ Testing complete!"
echo
echo "🔗 For visual testing, use MCP Inspector:"
echo "   npx @modelcontextprotocol/inspector node dist/index.js"
echo "   Then open: http://localhost:6274"