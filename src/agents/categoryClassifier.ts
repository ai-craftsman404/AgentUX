import { AnalysisState, RegionCategory } from '../types';
import { AgentFn } from './types';

const fallbackCategory: RegionCategory = 'visual_hierarchy';

export const categoryClassifier: AgentFn = (state: AnalysisState) => {
  const classified = state.regions.map((region) => {
    if (region.classification.category) {
      return region;
    }

    return {
      ...region,
      classification: {
        category: fallbackCategory,
        subcategory: 'unspecified',
      },
      severity: region.severity ?? {
        level: 'low',
        score: 0.1,
      },
    };
  });

  return { ...state, regions: classified };
};

