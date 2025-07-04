import { FigmaClient } from '../clients/figma-client.js';
import {
  ProgressCallback,
  StreamingExtractionResult,
  DEFAULT_STAGE_TIMEOUTS,
} from '../types/performance.js';
import { StreamingFigmaContextInput } from '../types/mcp.js';
import { FigmaServerUnavailableError } from '../types/figma.js';
import { ProgressTracker } from './progress-tracker.js';

/**
 * StreamingExtractor handles performance-optimized Figma context extraction
 * with parallel execution, progress tracking, and intelligent timeout management
 */
export class StreamingExtractor {
  private progressTracker: ProgressTracker;
  private figmaClient: FigmaClient;

  constructor(figmaClient?: FigmaClient) {
    this.figmaClient = figmaClient || new FigmaClient();
    this.progressTracker = new ProgressTracker();
  }

  /**
   * Extract Figma context with streaming progress updates and parallel execution
   *
   * @param input Streaming extraction configuration
   * @param onProgress Real-time progress callback
   * @returns Complete extraction result with performance metrics
   */
  async extractWithProgress(
    input: StreamingFigmaContextInput,
    onProgress: ProgressCallback
  ): Promise<StreamingExtractionResult> {
    this.progressTracker.start();

    const warnings: string[] = [];
    const errors: string[] = [];
    let finalResult: any = {
      fileId: '',
      nodeId: undefined,
      url: input.url || '',
      code: null,
      components: [],
      variables: [],
      codeConnectMap: [],
    };

    try {
      // Check if pre-extracted Figma data was provided (preferred for IDE integration)
      const hasValidFigmaData =
        input.figmaData && typeof input.figmaData === 'object' && 'fileId' in input.figmaData;

      if (hasValidFigmaData) {
        // Use pre-extracted data - no API calls needed
        onProgress(this.progressTracker.updateStage('complete', 100, 'Using pre-extracted data'));

        const figmaData = input.figmaData as any;
        finalResult = {
          fileId: figmaData.fileId,
          nodeId: figmaData.nodeId,
          url: figmaData.url,
          code: figmaData.code || null,
          components: figmaData.components || [],
          variables: figmaData.variables || [],
          codeConnectMap: figmaData.codeConnectMap || [],
        };

        return this.buildSuccessResult(finalResult, warnings, errors);
      }

      // Fallback: Extract from URL
      if (!input.url) {
        throw new Error('Either figmaData or url must be provided');
      }

      // Test connection first
      const isConnected = await this.figmaClient.testConnection();
      if (!isConnected) {
        throw new FigmaServerUnavailableError();
      }

      // Parse Figma URL
      const { fileId, nodeId } = FigmaClient.parseFigmaUrl(input.url);
      finalResult.fileId = fileId;
      finalResult.nodeId = nodeId;
      finalResult.url = input.url;

      // Execute extraction stages in parallel where possible
      await this.executeExtractionStages(input, onProgress, finalResult, warnings, errors);

      return this.buildSuccessResult(finalResult, warnings, errors);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      onProgress(
        this.progressTracker.updateStage('complete', 0, `Extraction failed: ${errorMessage}`)
      );

      return this.buildErrorResult(finalResult, warnings, errors);
    }
  }

  /**
   * Execute extraction stages with bulletproof progressive fallback strategy
   * Guarantees SOME useful data extraction regardless of complexity
   */
  private async executeExtractionStages(
    input: StreamingFigmaContextInput,
    onProgress: ProgressCallback,
    result: any,
    warnings: string[],
    errors: string[]
  ): Promise<void> {
    // BULLETPROOF PROGRESSIVE EXTRACTION STRATEGY
    // This guarantees SOME useful data extraction regardless of complexity
    
    const { url } = input;
    const nodeId = result.nodeId;
    const isComplexLayout = this.detectComplexLayout(input.url);
    
    // Progressive extraction with multiple fallback levels
    await this.executeProgressiveFallbackExtraction(input, url!, nodeId, onProgress, result, warnings, errors, isComplexLayout);

    onProgress(this.progressTracker.updateStage('complete', 100, 'Extraction completed'));
  }

  /**
   * BULLETPROOF PROGRESSIVE FALLBACK EXTRACTION
   * 
   * This method implements a comprehensive fallback strategy that GUARANTEES
   * useful data extraction from ANY Figma layout, no matter how complex.
   * 
   * Strategy Levels:
   * 1. OPTIMAL: Full extraction (variables + components + code)
   * 2. BALANCED: Essential data (variables + components, skip code)  
   * 3. MINIMAL: Core data (variables only, basic file info)
   * 4. EMERGENCY: Fallback file info (file ID, URL, basic metadata)
   */
  private async executeProgressiveFallbackExtraction(
    input: StreamingFigmaContextInput,
    url: string,
    nodeId: string | undefined,
    onProgress: ProgressCallback,
    result: any,
    warnings: string[],
    errors: string[],
    isComplexLayout: boolean
  ): Promise<void> {
    const timeouts = this.getStageTimeouts(input);
    const shouldIncludeCode = input.options?.includeCode !== false;

    // LEVEL 1: Try optimal extraction (all data)
    if (await this.tryOptimalExtraction(input, url, nodeId, onProgress, result, warnings, errors, timeouts, shouldIncludeCode, isComplexLayout)) {
      return; // Success!
    }

    // LEVEL 2: Try balanced extraction (skip code, get variables + components)
    warnings.push('Falling back to essential data extraction (variables + components only)');
    if (await this.tryBalancedExtraction(input, url, nodeId, onProgress, result, warnings, errors)) {
      return; // Success!
    }

    // LEVEL 3: Try minimal extraction (variables only)
    warnings.push('Falling back to minimal extraction (variables only)');
    if (await this.tryMinimalExtraction(input, url, nodeId, onProgress, result, warnings, errors)) {
      return; // Success!
    }

    // LEVEL 4: Emergency fallback - guarantee SOME data
    warnings.push('Using emergency fallback - providing basic file information');
    this.executeEmergencyFallback(input, url, nodeId, onProgress, result, warnings);
  }

  /**
   * LEVEL 1: Optimal extraction - attempt full data extraction
   */
  private async tryOptimalExtraction(
    input: StreamingFigmaContextInput,
    url: string,
    nodeId: string | undefined,
    onProgress: ProgressCallback,
    result: any,
    warnings: string[],
    errors: string[],
    timeouts: any,
    shouldIncludeCode: boolean,
    isComplexLayout: boolean
  ): Promise<boolean> {
    try {
      // Phase 1: Variables (most reliable)
      onProgress(this.progressTracker.updateStage('variables', 0, 'Extracting design variables...'));
      
      const variablesResult = await this.safeExtractVariables(url, nodeId, timeouts.variables);
      if (variablesResult.success) {
        result.variables = variablesResult.data?.variables || [];
        onProgress(this.progressTracker.updateStage('variables', 100, `Variables: ${result.variables.length} found`));
      } else {
        return false; // Variables failed, try next level
      }

      // Phase 2: Components (moderately reliable)
      onProgress(this.progressTracker.updateStage('components', 0, 'Analyzing components...'));
      
      const componentsResult = await this.safeExtractComponents(url, nodeId, timeouts.components);
      if (componentsResult.success) {
        result.codeConnectMap = componentsResult.data?.mappings || [];
        onProgress(this.progressTracker.updateStage('components', 100, `Components: ${result.codeConnectMap.length} mappings`));
      } else {
        warnings.push('Component mapping failed, but variables are available');
      }

      // Phase 3: Code generation (least reliable, optional)
      if (shouldIncludeCode && nodeId) {
        if (isComplexLayout) {
          onProgress(this.progressTracker.updateStage('code', 0, 'Complex layout - attempting code generation with aggressive timeout'));
          warnings.push('Complex layout detected. Code generation may timeout gracefully.');
        } else {
          onProgress(this.progressTracker.updateStage('code', 0, 'Generating React code...'));
        }

        const codeResult = await this.safeExtractCode(input, url, nodeId, timeouts.code, onProgress);
        if (codeResult.success) {
          result.code = codeResult.data?.code || null;
          result.components = codeResult.data?.components || [];
          onProgress(this.progressTracker.updateStage('code', 100, 'Code generation completed'));
        } else {
          warnings.push('Code generation timed out - design data still fully available');
          onProgress(this.progressTracker.updateStage('code', 50, 'Code generation timed out gracefully'));
        }
      } else {
        onProgress(this.progressTracker.updateStage('code', 100, 'Code generation skipped'));
      }

      return true; // Success - we got variables at minimum
    } catch (error) {
      errors.push(`Optimal extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * LEVEL 2: Balanced extraction - variables + components only
   */
  private async tryBalancedExtraction(
    _input: StreamingFigmaContextInput,
    url: string,
    nodeId: string | undefined,
    onProgress: ProgressCallback,
    result: any,
    _warnings: string[],
    errors: string[]
  ): Promise<boolean> {
    try {
      // Use shorter, more aggressive timeouts
      const fastTimeouts = { variables: 3000, components: 5000 };

      // Variables only
      onProgress(this.progressTracker.updateStage('variables', 0, 'Fast variables extraction...'));
      const variablesResult = await this.safeExtractVariables(url, nodeId, fastTimeouts.variables);
      
      if (variablesResult.success) {
        result.variables = variablesResult.data?.variables || [];
        onProgress(this.progressTracker.updateStage('variables', 100, `Variables: ${result.variables.length} found`));

        // Try components with aggressive timeout
        onProgress(this.progressTracker.updateStage('components', 0, 'Fast components extraction...'));
        const componentsResult = await this.safeExtractComponents(url, nodeId, fastTimeouts.components);
        
        if (componentsResult.success) {
          result.codeConnectMap = componentsResult.data?.mappings || [];
          onProgress(this.progressTracker.updateStage('components', 100, `Components: ${result.codeConnectMap.length} mappings`));
        }

        onProgress(this.progressTracker.updateStage('code', 100, 'Code generation skipped for performance'));
        return true;
      }
    } catch (error) {
      errors.push(`Balanced extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }

  /**
   * LEVEL 3: Minimal extraction - variables only
   */
  private async tryMinimalExtraction(
    _input: StreamingFigmaContextInput,
    url: string,
    nodeId: string | undefined,
    onProgress: ProgressCallback,
    result: any,
    _warnings: string[],
    errors: string[]
  ): Promise<boolean> {
    try {
      // Ultra-fast variables extraction only
      onProgress(this.progressTracker.updateStage('variables', 0, 'Minimal variables extraction...'));
      
      const variablesResult = await this.safeExtractVariables(url, nodeId, 2000); // 2 second timeout
      
      if (variablesResult.success) {
        result.variables = variablesResult.data?.variables || [];
        onProgress(this.progressTracker.updateStage('variables', 100, `Variables: ${result.variables.length} found`));
        onProgress(this.progressTracker.updateStage('components', 100, 'Components skipped for performance'));
        onProgress(this.progressTracker.updateStage('code', 100, 'Code generation skipped for performance'));
        return true;
      }
    } catch (error) {
      errors.push(`Minimal extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return false;
  }

  /**
   * LEVEL 4: Emergency fallback - basic file info (ALWAYS succeeds)
   */
  private executeEmergencyFallback(
    _input: StreamingFigmaContextInput,
    url: string,
    nodeId: string | undefined,
    onProgress: ProgressCallback,
    result: any,
    warnings: string[]
  ): void {
    // Parse what we can from the URL itself
    const urlData = FigmaClient.parseFigmaUrl(url);
    
    result.variables = [];
    result.components = [];
    result.codeConnectMap = [];
    result.code = null;

    // Create basic file metadata
    const basicMetadata = {
      extractionMethod: 'emergency_fallback',
      figmaFileId: urlData.fileId,
      figmaNodeId: nodeId || urlData.nodeId,
      extractedAt: new Date().toISOString(),
      complexityDetected: this.detectComplexLayout(url),
      recommendedApproach: 'Consider using IDE integration with Figma MCP for better results'
    };

    warnings.push('Emergency fallback active - Figma MCP server may be overloaded or design is extremely complex');
    warnings.push('Basic file information extracted from URL');
    warnings.push('For better results: 1) Try smaller frame selections, 2) Use IDE integration, 3) Retry later');

    // Store metadata in result for debugging
    result.metadata = basicMetadata;

    onProgress(this.progressTracker.updateStage('variables', 100, 'Emergency fallback: Basic info extracted'));
    onProgress(this.progressTracker.updateStage('components', 100, 'Emergency fallback: File metadata available'));
    onProgress(this.progressTracker.updateStage('code', 100, 'Emergency fallback: URL data parsed'));
  }

  /**
   * Safe variables extraction with timeout and error handling
   */
  private async safeExtractVariables(url: string, nodeId: string | undefined, timeout: number): Promise<{success: boolean, data?: any}> {
    try {
      const result = await Promise.race([
        this.figmaClient.getVariableDefinitions(url, nodeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Variables timeout after ${timeout}ms`)), timeout))
      ]);
      return { success: true, data: result };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Safe components extraction with timeout and error handling  
   */
  private async safeExtractComponents(url: string, nodeId: string | undefined, timeout: number): Promise<{success: boolean, data?: any}> {
    try {
      const result = await Promise.race([
        this.figmaClient.getCodeConnectMap(url, nodeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Components timeout after ${timeout}ms`)), timeout))
      ]);
      return { success: true, data: result };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Safe code extraction with timeout and error handling
   */
  private async safeExtractCode(
    input: StreamingFigmaContextInput,
    url: string,
    nodeId: string,
    timeout: number,
    _onProgress: ProgressCallback
  ): Promise<{success: boolean, data?: any}> {
    try {
      const selection = { url, nodeId };
      const options = {
        framework: 'react' as const,
        styling: 'styled-components' as const,
        typescript: true,
        includeImages: input.options?.includeVariants ?? true,
        includeVariables: input.options?.includeTokens ?? true,
      };

      const result = await Promise.race([
        this.figmaClient.getCode(selection, options),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Code timeout after ${timeout}ms`)), timeout))
      ]);
      return { success: true, data: result };
    } catch (error) {
      return { success: false };
    }
  }


  /**
   * Get stage-specific timeouts from input options with complexity detection
   */
  private getStageTimeouts(input: StreamingFigmaContextInput) {
    const maxWaitTime = input.options?.maxWaitTime || 15000;
    
    // Detect complex layouts from node-id patterns
    const isComplexLayout = this.detectComplexLayout(input.url);
    
    if (isComplexLayout) {
      // For complex layouts, use more aggressive timeouts
      return {
        variables: Math.min(3000, maxWaitTime * 0.2), // Reduce to 3s max
        components: Math.min(5000, maxWaitTime * 0.3), // Reduce to 5s max  
        code: Math.min(8000, maxWaitTime * 0.5), // Reduce to 8s max for complex frames
      };
    }

    return {
      variables: Math.min(DEFAULT_STAGE_TIMEOUTS.variables, maxWaitTime * 0.3),
      components: Math.min(DEFAULT_STAGE_TIMEOUTS.components, maxWaitTime * 0.6),
      code: Math.min(DEFAULT_STAGE_TIMEOUTS.code, maxWaitTime),
    };
  }
  
  /**
   * Detect if this is likely a complex layout based on URL patterns
   */
  private detectComplexLayout(url?: string): boolean {
    if (!url) return false;
    
    // Complex layouts often have node IDs with multiple hyphens or high numbers
    const nodeIdMatch = url.match(/node-id=([^&]+)/);
    if (nodeIdMatch) {
      const nodeId = nodeIdMatch[1];
      
      // Check for patterns indicating complex layouts:
      // - High numbers (4+ digits suggest complex nested structures)
      // - Multiple hyphen-separated parts
      // - Specific ranges that tend to be complex layouts
      const hasHighNumbers = /\d{4,}/.test(nodeId);
      const hasMultipleParts = (nodeId.match(/-/g) || []).length >= 2;
      const isInComplexRange = /^(13\d\d|1[4-9]\d\d|[2-9]\d\d\d)/.test(nodeId);
      
      return hasHighNumbers || hasMultipleParts || isInComplexRange;
    }
    
    return false;
  }


  /**
   * Build successful extraction result
   */
  private buildSuccessResult(
    figmaData: any,
    warnings: string[],
    errors: string[]
  ): StreamingExtractionResult {
    return {
      success: true,
      figmaData,
      performance: this.progressTracker.getPerformanceMetrics(),
      warnings,
      errors,
    };
  }

  /**
   * Build error extraction result with partial data
   */
  private buildErrorResult(
    figmaData: any,
    warnings: string[],
    errors: string[]
  ): StreamingExtractionResult {
    return {
      success: false,
      figmaData,
      performance: this.progressTracker.getPerformanceMetrics(),
      warnings,
      errors,
    };
  }
}
