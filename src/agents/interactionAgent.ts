import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { appendFinding, tapTargetThreshold, isTouchPlatform } from './helpers';

export const interactionAgent: AgentFn = (state: AnalysisState) => {
  const interactionRegions = state.regions.filter(
    (region) => region.classification.category === 'interaction_targets',
  );

  if (interactionRegions.length === 0) {
    return state;
  }

  const threshold = tapTargetThreshold(state.metadata?.platform);
  const belowThreshold = interactionRegions.filter(
    (region) =>
      region.bounds.width < threshold || region.bounds.height < threshold,
  );

  let nextState = state;

  if (belowThreshold.length) {
    nextState = appendFinding(
      nextState,
      'interaction',
      `${belowThreshold.length} interactive targets fall below the ${threshold}px ${
        isTouchPlatform(state.metadata?.platform) ? 'touch' : 'pointer'
      } threshold. Increase padding or spacing to prevent misses.`,
    );
  }

  const crowdedTargets = interactionRegions.filter(
    (region) => region.bounds.height < threshold && region.severity.level !== 'high',
  );

  if (crowdedTargets.length && state.metadata?.platform === 'Desktop Web') {
    nextState = appendFinding(
      nextState,
      'interaction',
      'Primary CTAs on desktop feel cramped; align them to an 8px grid and isolate destructive actions.',
    );
  }

  return nextState;
};

