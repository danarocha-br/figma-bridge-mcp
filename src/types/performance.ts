// Performance optimization types for streaming Figma context extraction

/**
 * Progress tracking for extraction stages
 */
export interface ExtractionProgress {
  stage: 'variables' | 'components' | 'code' | 'complete';
  percentage: number;
  message: string;
  duration: number;
  partialData?: {
    variables?: any[];
    components?: any[];
    code?: string;
  };
}

/**
 * Streaming response wrapper for real-time updates
 */
export interface StreamingResponse {
  progress: ExtractionProgress;
  isComplete: boolean;
  error?: string;
}

/**
 * Progress callback function type for streaming operations
 */
export type ProgressCallback = (_progress: ExtractionProgress) => void;

/**
 * Timeout strategy options for handling long-running operations
 */
export type TimeoutStrategy = 'graceful' | 'partial' | 'fail';

/**
 * Performance metrics for tracking extraction efficiency
 */
export interface PerformanceMetrics {
  totalDuration: number;
  variablesDuration: number;
  componentsDuration: number;
  codeDuration: number;
  timeoutOccurred: boolean;
  timeoutStage?: 'variables' | 'components' | 'code';
  cacheHits: number;
  retryAttempts: number;
}

/**
 * Configuration for streaming extraction operations
 */
export interface StreamingConfig {
  streamingEnabled: boolean;
  progressUpdates: boolean;
  timeoutStrategy: TimeoutStrategy;
  maxWaitTime: number;
  variablesTimeout?: number;
  componentsTimeout?: number;
  codeTimeout?: number;
}

/**
 * Stage-specific timeout configuration for different extraction phases
 */
export interface StageTimeouts {
  variables: number;
  components: number;
  code: number;
}

/**
 * Default timeout configuration optimized for performance
 */
export const DEFAULT_STAGE_TIMEOUTS: StageTimeouts = {
  variables: 5000, // 5 seconds - variables are fast
  components: 10000, // 10 seconds - components are medium
  code: 15000, // 15 seconds - code generation is slowest
};

/**
 * Default streaming configuration for optimal UX
 */
export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  streamingEnabled: true,
  progressUpdates: true,
  timeoutStrategy: 'graceful',
  maxWaitTime: 15000,
  variablesTimeout: DEFAULT_STAGE_TIMEOUTS.variables,
  componentsTimeout: DEFAULT_STAGE_TIMEOUTS.components,
  codeTimeout: DEFAULT_STAGE_TIMEOUTS.code,
};

/**
 * Result of a streaming extraction operation
 */
export interface StreamingExtractionResult {
  success: boolean;
  figmaData: {
    fileId: string;
    nodeId?: string;
    url: string;
    code?: string | null;
    components: any[];
    variables: any[];
    codeConnectMap: any[];
  };
  performance: PerformanceMetrics;
  warnings: string[];
  errors: string[];
}
