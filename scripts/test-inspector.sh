#!/bin/bash

# Figma Bridge MCP - Visual Testing Script
# This script starts the MCP Inspector for visual testing

echo "🚀 Starting Figma Bridge MCP Inspector..."
echo

# Build the project first
echo "📦 Building project..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build successful!"
echo

# Start the inspector
echo "🔍 Starting MCP Inspector..."
echo "⏳ This will open a web interface for visual testing..."
echo

# Store the command to run
INSPECTOR_CMD="npx @modelcontextprotocol/inspector node dist/index.js"

echo "🔗 The inspector will be available at: http://localhost:6274"
echo "📋 You can test all 6 MCP tools:"
echo "   • extractFigmaContext"
echo "   • generateReactCode"
echo "   • mapComponents"
echo "   • validateDesignSystem"
echo "   • syncTokens"
echo "   • analyzeCodebase"
echo
echo "💡 Pro tip: Try testing extractFigmaContext with:"
echo "   URL: https://www.figma.com/file/test123/Sample-File"
echo "   Options: {\"includeVariants\": true}"
echo
echo "🛑 Press Ctrl+C to stop the inspector"
echo "───────────────────────────────────────────────────────"
echo

# Run the inspector
exec $INSPECTOR_CMD