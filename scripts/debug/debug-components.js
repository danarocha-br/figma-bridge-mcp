#!/usr/bin/env node

/**
 * Debug component detection for the specific URL
 * Investigate why components aren't being found
 */

import { FigmaBridgeMCPServer } from '../../dist/server.js';

const server = new FigmaBridgeMCPServer();

// The URL with missing components
const debugUrl = 'https://www.figma.com/design/5h7RH37bjkXERjpF5dhtFX/Compasso?node-id=1311-9692&t=yYSTaSy5g7qI4B5A-11';

// Comparison URLs for testing
const testUrls = [
  {
    name: 'Working Component URL',
    url: 'https://www.figma.com/design/5h7RH37bjkXERjpF5dhtFX/Compasso?node-id=1298-1382&t=yYSTaSy5g7qI4B5A-11',
    expectedComponents: 'Should have components'
  },
  {
    name: 'Problematic URL', 
    url: debugUrl,
    expectedComponents: 'Missing components - investigate why'
  }
];

async function debugComponentDetection() {
  console.log('🔍 DEBUGGING COMPONENT DETECTION');
  console.log('   Investigating why components are missing\n');

  for (const test of testUrls) {
    console.log(`📋 Testing: ${test.name}`);
    console.log(`   URL: ${test.url.substring(0, 80)}...`);
    console.log(`   Expected: ${test.expectedComponents}`);

    try {
      // Test with detailed logging
      const start = Date.now();
      const result = await server['handleExtractFigmaContext']({
        url: test.url,
        options: {
          includeCode: true,
          includeVariants: true,
          includeTokens: true,
          includeComponents: true
        }
      });
      const duration = Date.now() - start;

      const response = result.content[0].text;
      
      // Extract detailed information
      const variableMatch = response.match(/Variables: (\d+)/);
      const componentMatch = response.match(/Components: (\d+)/);
      const codeMappingMatch = response.match(/Code Mappings: (\d+)/);
      const hasCode = response.includes('Generated Code: Yes');

      console.log(`   ✅ Extraction completed in ${duration}ms`);
      console.log(`   📊 Results:`);
      console.log(`      Variables: ${variableMatch?.[1] || '0'}`);
      console.log(`      Components: ${componentMatch?.[1] || '0'}`);
      console.log(`      Code Mappings: ${codeMappingMatch?.[1] || '0'}`);
      console.log(`      Generated Code: ${hasCode ? 'Yes' : 'No'}`);

      // Look for error messages about components
      if (response.includes('Code Connect')) {
        console.log(`   🔗 Code Connect extraction attempted`);
      }

      if (response.includes('error') || response.includes('failed')) {
        console.log(`   ⚠️  Potential errors in response`);
      }

      // Extract raw data to investigate
      const rawDataMatch = response.match(/\*\*Raw Data:\*\* (.*)/s);
      if (rawDataMatch) {
        try {
          const rawData = JSON.parse(rawDataMatch[1]);
          console.log(`   🔍 Raw Data Analysis:`);
          console.log(`      fileId: ${rawData.fileId}`);
          console.log(`      nodeId: ${rawData.nodeId}`);
          console.log(`      components array length: ${rawData.components?.length || 0}`);
          console.log(`      variables array length: ${rawData.variables?.length || 0}`);
          console.log(`      codeConnectMap array length: ${rawData.codeConnectMap?.length || 0}`);
          
          if (rawData.components && rawData.components.length > 0) {
            console.log(`   🧩 Component details:`);
            rawData.components.slice(0, 3).forEach((comp, i) => {
              console.log(`      ${i + 1}. ${comp.name || comp.id || 'Unknown'} (${comp.type || 'no type'})`);
            });
          }

          if (rawData.codeConnectMap && rawData.codeConnectMap.length > 0) {
            console.log(`   🔗 Code mappings found:`);
            rawData.codeConnectMap.slice(0, 3).forEach((mapping, i) => {
              console.log(`      ${i + 1}. ${mapping.componentId || mapping.name || 'Unknown mapping'}`);
            });
          }
        } catch (e) {
          console.log(`   ❌ Could not parse raw data: ${e.message}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
    }

    console.log(''); // Empty line
  }

  // Test different strategies for component detection
  console.log('🎯 TESTING DIFFERENT COMPONENT EXTRACTION STRATEGIES');
  
  const strategies = [
    {
      name: 'Variables + Components Only',
      options: { includeCode: false, includeComponents: true, includeVariants: true }
    },
    {
      name: 'Code Generation Focus',
      options: { includeCode: true, includeComponents: true, includeVariants: false }
    },
    {
      name: 'Full Extraction',
      options: { includeCode: true, includeComponents: true, includeVariants: true, includeTokens: true }
    }
  ];

  for (const strategy of strategies) {
    console.log(`📋 Strategy: ${strategy.name}`);
    
    try {
      const result = await server['handleExtractFigmaContext']({
        url: debugUrl,
        options: strategy.options
      });

      const response = result.content[0].text;
      const componentMatch = response.match(/Components: (\d+)/);
      const codeMappingMatch = response.match(/Code Mappings: (\d+)/);
      
      console.log(`   🧩 Components: ${componentMatch?.[1] || '0'}`);
      console.log(`   🔗 Code Mappings: ${codeMappingMatch?.[1] || '0'}`);
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  console.log('\n🔍 ANALYSIS QUESTIONS:');
  console.log('   1. Is this Figma node a frame without actual components?');
  console.log('   2. Are components nested too deeply for detection?');
  console.log('   3. Is the Code Connect map empty for this specific design?');
  console.log('   4. Does this node represent a page layout rather than components?');
  console.log('   5. Are the components using a different naming/structure pattern?');

  console.log('\n💡 NEXT STEPS:');
  console.log('   - Check the actual Figma file structure at this node-id');
  console.log('   - Compare with working component URLs');
  console.log('   - Investigate if this is layout-level vs component-level content');
  console.log('   - Consider different component detection strategies');
}

debugComponentDetection().catch(console.error);