import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { appendFinding } from './helpers';

export const navigationAgent: AgentFn = (state: AnalysisState) => {
  const navigationRegions = state.regions.filter(
    (region) => region.classification.category === 'navigation_ia',
  );

  let nextState = state;

  if (state.metadata?.uiType === 'Dashboard' && navigationRegions.length < 3) {
    nextState = appendFinding(
      nextState,
      'navigation',
      'Dashboards typically require clear entry points into each module; consider adding section headers or tabs.',
    );
  }

  if (
    state.metadata?.uiType === 'Form / Input Flow' &&
    navigationRegions.some((region) =>
      region.classification.subcategory.includes('primary_action_missing'),
    )
  ) {
    nextState = appendFinding(
      nextState,
      'navigation',
      'Form flow missing clear primary action; ensure progress/submit buttons remain visible at all times.',
    );
  }

  navigationRegions.slice(0, 2).forEach((region) => {
    nextState = appendFinding(
      nextState,
      'navigation',
      `• ${region.classification.subcategory} rated ${region.severity.level}.`,
    );
  });

  return nextState;
};

