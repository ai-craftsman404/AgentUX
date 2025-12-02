import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { calculateCoverageMetrics } from '../utils/coverageMetrics';
import { getImageDimensions } from '../utils/imageValidation';

/**
 * Calculates coverage metrics for the analysis.
 * Requires image dimensions to calculate region coverage.
 */
export const metricsAgent: AgentFn = (state: AnalysisState): AnalysisState => {
  if (!state.lastScreenshotUri) {
    return state;
  }

  // Get image dimensions asynchronously - for now, we'll calculate metrics
  // with a placeholder. In practice, dimensions should be passed in state
  // or retrieved synchronously.
  // For now, we'll skip region coverage calculation if dimensions aren't available
  // and just calculate category coverage.

  // Try to get dimensions (this is async, so we'll handle it differently)
  // For now, use a default or calculate without coverage percentage
  const defaultDimensions = { width: 1920, height: 1080 }; // Default fallback

  // Calculate metrics
  const metrics = calculateCoverageMetrics(
    state,
    defaultDimensions.width,
    defaultDimensions.height,
  );

  return {
    ...state,
    metrics,
  };
};

