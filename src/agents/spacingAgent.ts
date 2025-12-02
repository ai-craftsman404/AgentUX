import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { appendFinding } from './helpers';

export const spacingAgent: AgentFn = (state: AnalysisState) => {
  if (!state.metadata) {
    return state;
  }

  const spacingRegions = state.regions.filter(
    (region) => region.classification.category === 'spacing_alignment',
  );

  let nextState = state;

  if (spacingRegions.length === 0) {
    if (state.regions.length > 12) {
      nextState = appendFinding(
        nextState,
        'spacing',
        'Dense layout detected but Vision returned no spacing findings — consider re-running analysis with higher resolution.',
      );
    }
    return nextState;
  }

  const severityScore =
    spacingRegions.reduce((sum, region) => sum + region.severity.score, 0) /
    spacingRegions.length;

  const density =
    spacingRegions.length > 0
      ? Math.round((spacingRegions.length / state.regions.length) * 100)
      : 0;

  const platformNote =
    state.metadata.platform === 'Desktop Web'
      ? 'Desktop web layouts are expected to maintain consistent 16px gutters.'
      : 'Touch-first layouts require generous spacing to avoid accidental taps.';

  nextState = appendFinding(
    nextState,
    'spacing',
    `${spacingRegions.length} spacing/alignment issues detected (${density}% of regions). Avg severity ${(severityScore * 10).toFixed(
      1,
    )}/10. ${platformNote}`,
  );

  spacingRegions.slice(0, 3).forEach((region) => {
    nextState = appendFinding(
      nextState,
      'spacing',
      `• ${region.classification.subcategory} near (${region.bounds.x}, ${region.bounds.y}) — ${region.severity.level} impact.`,
    );
  });

  return nextState;
};

