import { AnalysisState } from '../types';
import { AgentFn } from './types';

export const heatmapBuilder: AgentFn = (state: AnalysisState) => {
  if (!state.attentionGrid) {
    return state;
  }

  // Placeholder: attach scaled intensity to regions.
  const regionsWithIntensity = state.regions.map((region, index) => ({
    ...region,
    notes: [
      ...region.notes,
      `Heatmap intensity placeholder ${(index + 1) / state.regions.length || 0}`,
    ],
  }));

  return { ...state, regions: regionsWithIntensity };
};

