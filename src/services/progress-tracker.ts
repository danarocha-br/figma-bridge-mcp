import { ExtractionProgress, PerformanceMetrics } from '../types/performance.js';

/**
 * ProgressTracker handles timing, progress calculation, and performance metrics
 * for streaming Figma context extraction operations
 */
export class ProgressTracker {
  private startTime: number = 0;
  private stageStartTimes: Map<string, number> = new Map();
  private stageDurations: Map<string, number> = new Map();
  private currentStage: string = '';
  private timeoutOccurred: boolean = false;
  private timeoutStage: string | undefined;
  private cacheHits: number = 0;
  private retryAttempts: number = 0;

  /**
   * Start tracking a new extraction operation
   */
  start(): void {
    this.startTime = Date.now();
    this.stageStartTimes.clear();
    this.stageDurations.clear();
    this.currentStage = '';
    this.timeoutOccurred = false;
    this.timeoutStage = undefined;
    this.cacheHits = 0;
    this.retryAttempts = 0;
  }

  /**
   * Update progress for a specific stage
   *
   * @param stage Current extraction stage
   * @param percentage Completion percentage (0-100)
   * @param message User-friendly progress message
   * @returns ExtractionProgress object for callbacks
   */
  updateStage(stage: string, percentage: number, message?: string): ExtractionProgress {
    const now = Date.now();

    // Track stage transitions
    if (stage !== this.currentStage) {
      if (this.currentStage && !this.stageDurations.has(this.currentStage)) {
        // Complete previous stage
        const previousStart = this.stageStartTimes.get(this.currentStage) || now;
        this.stageDurations.set(this.currentStage, now - previousStart);
      }

      this.currentStage = stage;
      this.stageStartTimes.set(stage, now);
    }

    // Complete current stage if at 100%
    if (percentage === 100 && !this.stageDurations.has(stage)) {
      const stageStart = this.stageStartTimes.get(stage) || now;
      this.stageDurations.set(stage, now - stageStart);
    }

    return {
      stage: stage as any,
      percentage: Math.max(0, Math.min(100, percentage)),
      message: message || this.getDefaultMessage(stage, percentage),
      duration: now - this.startTime,
      partialData: this.collectPartialData(),
    };
  }

  /**
   * Update progress message for current stage
   */
  updateMessage(message: string): ExtractionProgress {
    const currentPercentage = this.getCurrentStagePercentage();
    return this.updateStage(this.currentStage, currentPercentage, message);
  }

  /**
   * Get current stage completion percentage
   */
  private getCurrentStagePercentage(): number {
    if (this.stageDurations.has(this.currentStage)) {
      return 100;
    }

    const stageStart = this.stageStartTimes.get(this.currentStage);
    if (!stageStart) return 0;

    const elapsed = Date.now() - stageStart;
    // Estimate progress based on typical stage durations
    const estimatedDuration = this.getEstimatedStageDuration(this.currentStage);
    return Math.min(90, (elapsed / estimatedDuration) * 100);
  }

  /**
   * Get estimated duration for each stage
   */
  private getEstimatedStageDuration(stage: string): number {
    switch (stage) {
      case 'variables':
        return 5000; // 5 seconds
      case 'components':
        return 10000; // 10 seconds
      case 'code':
        return 15000; // 15 seconds
      case 'complete':
        return 0;
      default:
        return 5000;
    }
  }

  /**
   * Get default message for stage and percentage
   */
  private getDefaultMessage(stage: string, percentage: number): string {
    if (percentage === 100) {
      switch (stage) {
        case 'variables':
          return 'Variables extraction completed';
        case 'components':
          return 'Components analysis completed';
        case 'code':
          return 'Code generation completed';
        case 'complete':
          return 'Extraction completed successfully';
        default:
          return `${stage} completed`;
      }
    }

    switch (stage) {
      case 'variables':
        return `Extracting design variables... (${percentage}%)`;
      case 'components':
        return `Analyzing components... (${percentage}%)`;
      case 'code':
        return `Generating React code... (${percentage}%)`;
      case 'complete':
        return 'Finalizing extraction...';
      default:
        return `Processing ${stage}... (${percentage}%)`;
    }
  }

  /**
   * Collect partial data for progress updates
   * Note: In real implementation, this would contain actual extracted data
   */
  private collectPartialData(): { variables?: any[]; components?: any[]; code?: string } {
    // This is a placeholder - in the real implementation,
    // the StreamingExtractor would pass actual data here
    return {
      variables: [],
      components: [],
    };
  }

  /**
   * Record timeout occurrence
   */
  recordTimeout(stage: string): void {
    this.timeoutOccurred = true;
    this.timeoutStage = stage;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record retry attempt
   */
  recordRetryAttempt(): void {
    this.retryAttempts++;
  }

  /**
   * Get start time for timeout calculations
   */
  getStartTime(): number {
    return this.startTime;
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();

    return {
      totalDuration: now - this.startTime,
      variablesDuration: this.stageDurations.get('variables') || 0,
      componentsDuration: this.stageDurations.get('components') || 0,
      codeDuration: this.stageDurations.get('code') || 0,
      timeoutOccurred: this.timeoutOccurred,
      timeoutStage: this.timeoutStage as any,
      cacheHits: this.cacheHits,
      retryAttempts: this.retryAttempts,
    };
  }

  /**
   * Get detailed timing breakdown for debugging
   */
  getTimingBreakdown(): Record<string, number> {
    return Object.fromEntries(this.stageDurations.entries());
  }

  /**
   * Calculate overall efficiency score (0-100)
   */
  getEfficiencyScore(): number {
    const metrics = this.getPerformanceMetrics();
    const totalTime = metrics.totalDuration;

    // Penalty factors
    let score = 100;

    // Time penalty (target: under 15 seconds)
    if (totalTime > 15000) {
      score -= Math.min(30, (totalTime - 15000) / 1000); // -1 point per second over 15s
    }

    // Timeout penalty
    if (metrics.timeoutOccurred) {
      score -= 20;
    }

    // Retry penalty
    score -= metrics.retryAttempts * 5;

    // Cache bonus
    score += metrics.cacheHits * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate performance summary for logging
   */
  getPerformanceSummary(): string {
    const metrics = this.getPerformanceMetrics();
    const efficiency = this.getEfficiencyScore();

    return [
      `Total: ${metrics.totalDuration}ms`,
      `Variables: ${metrics.variablesDuration}ms`,
      `Components: ${metrics.componentsDuration}ms`,
      `Code: ${metrics.codeDuration}ms`,
      `Efficiency: ${efficiency}/100`,
      metrics.timeoutOccurred ? `Timeout in ${metrics.timeoutStage}` : '',
      metrics.cacheHits > 0 ? `Cache hits: ${metrics.cacheHits}` : '',
      metrics.retryAttempts > 0 ? `Retries: ${metrics.retryAttempts}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }
}
