#!/usr/bin/env node

/**
 * Direct test for the specific problematic URL
 * https://www.figma.com/design/5h7RH37bjkXERjpF5dhtFX/Compasso?node-id=1311-9692&t=yYSTaSy5g7qI4B5A-11
 */

import { FigmaBridgeMCPServer } from '../../dist/server.js';

const server = new FigmaBridgeMCPServer();

// The EXACT URL that was causing timeouts
const problemUrl = 'https://www.figma.com/design/5h7RH37bjkXERjpF5dhtFX/Compasso?node-id=1311-9692&t=yYSTaSy5g7qI4B5A-11';

async function testSpecificUrl() {
  console.log('🎯 TESTING EXACT PROBLEMATIC URL');
  console.log('URL:', problemUrl);
  console.log('');

  // Test 1: Standard extraction (original tool)
  console.log('1️⃣  Testing with extractFigmaContext (original tool)...');
  try {
    const start1 = Date.now();
    const result1 = await server['handleExtractFigmaContext']({
      url: problemUrl,
      options: {
        includeCode: true,
        includeVariants: true,
        includeTokens: true
      }
    });
    const duration1 = Date.now() - start1;
    
    console.log(`   ✅ Duration: ${duration1}ms`);
    if (result1.content[0].text.includes('timeout')) {
      console.log(`   ⚠️  Timeout occurred but handled gracefully`);
    } else {
      console.log(`   🎉 Completed without timeout`);
    }
    
    // Extract data counts
    const variableMatch = result1.content[0].text.match(/Variables: (\d+)/);
    const componentMatch = result1.content[0].text.match(/Components: (\d+)/);
    console.log(`   📊 Variables: ${variableMatch?.[1] || 'N/A'}`);
    console.log(`   📊 Components: ${componentMatch?.[1] || 'N/A'}`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }

  console.log('');

  // Test 2: New bulletproof streaming extraction
  console.log('2️⃣  Testing with extractFigmaContextStreaming (bulletproof)...');
  try {
    const start2 = Date.now();
    const result2 = await server['handleExtractFigmaContextStreaming']({
      url: problemUrl,
      options: {
        streamingEnabled: true,
        progressUpdates: true,
        timeoutStrategy: 'graceful',
        maxWaitTime: 15000,
        includeCode: true,
        includeVariants: true,
        includeTokens: true
      }
    });
    const duration2 = Date.now() - start2;
    
    console.log(`   ✅ Duration: ${duration2}ms`);
    
    const response = result2.content[0].text;
    
    // Check which extraction level was used
    if (response.includes('Complex layout detected')) {
      console.log(`   🏗️  Complex layout handling activated`);
    }
    
    if (response.includes('emergency fallback')) {
      console.log(`   🆘 Emergency fallback used`);
    } else if (response.includes('Falling back to minimal')) {
      console.log(`   📦 Minimal extraction used`);
    } else if (response.includes('Falling back to essential')) {
      console.log(`   ⚖️  Balanced extraction used`);
    } else {
      console.log(`   🎯 Optimal extraction succeeded`);
    }
    
    // Extract performance data
    const totalTimeMatch = response.match(/Total Time: (\d+)ms/);
    const variablesTimeMatch = response.match(/Variables: (\d+)ms/);
    const codeTimeMatch = response.match(/Code Generation: (\d+)ms/);
    
    if (totalTimeMatch) {
      console.log(`   ⏱️  Performance Breakdown:`);
      console.log(`      Total: ${totalTimeMatch[1]}ms`);
      console.log(`      Variables: ${variablesTimeMatch?.[1] || 'N/A'}ms`);
      console.log(`      Code: ${codeTimeMatch?.[1] || 'N/A'}ms`);
    }
    
    // Extract data counts
    const variableMatch = response.match(/Variables: (\d+)/);
    const componentMatch = response.match(/Components: (\d+)/);
    const hasCode = response.includes('Generated Code: Yes');
    
    console.log(`   📊 Data Extracted:`);
    console.log(`      Variables: ${variableMatch?.[1] || '0'}`);
    console.log(`      Components: ${componentMatch?.[1] || '0'}`);
    console.log(`      Code: ${hasCode ? 'Yes' : 'No'}`);
    
    // Check for warnings and guidance
    if (response.includes('Complex Layout Tips')) {
      console.log(`   💡 User guidance provided for complex layouts`);
    }
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }

  console.log('');

  // Test 3: Fast mode (variables only)
  console.log('3️⃣  Testing fast mode (variables only)...');
  try {
    const start3 = Date.now();
    const result3 = await server['handleExtractFigmaContextStreaming']({
      url: problemUrl,
      options: {
        streamingEnabled: true,
        progressUpdates: false,
        timeoutStrategy: 'graceful',
        maxWaitTime: 8000,
        includeCode: false,  // Skip code for speed
        includeVariants: true,
        includeTokens: true
      }
    });
    const duration3 = Date.now() - start3;
    
    console.log(`   ✅ Duration: ${duration3}ms`);
    
    const response = result3.content[0].text;
    const variableMatch = response.match(/Variables: (\d+)/);
    
    console.log(`   🎨 Variables extracted: ${variableMatch?.[1] || '0'}`);
    console.log(`   ⚡ Speed comparison: ${duration3 < 3000 ? 'FAST' : 'NORMAL'} (${duration3}ms)`);
    
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
  }

  console.log('');
  console.log('🎯 SPECIFIC URL TEST RESULTS:');
  console.log('   The bulletproof system should handle this URL successfully');
  console.log('   Even if code generation times out, variables and components should be extracted');
  console.log('   Multiple fallback levels ensure SOME useful data is always returned');
}

testSpecificUrl().catch(console.error);