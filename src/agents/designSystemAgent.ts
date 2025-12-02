import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { appendFinding } from './helpers';

export const designSystemAgent: AgentFn = (state: AnalysisState) => {
  const dsRegions = state.regions.filter(
    (region) => region.classification.category === 'design_system_drift',
  );

  if (dsRegions.length === 0) {
    return state;
  }

  let nextState = appendFinding(
    state,
    'designSystem',
    `${dsRegions.length} components deviate from the expected design system tokens. Align colours, radii, and iconography.`,
  );

  dsRegions.slice(0, 3).forEach((region) => {
    nextState = appendFinding(
      nextState,
      'designSystem',
      `• ${region.classification.subcategory} (${region.severity.level}) near (${region.bounds.x}, ${region.bounds.y}).`,
    );
  });

  return nextState;
};

