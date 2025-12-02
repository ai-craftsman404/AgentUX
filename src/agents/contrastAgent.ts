import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { appendFinding } from './helpers';

export const contrastAgent: AgentFn = (state: AnalysisState) => {
  const contrastRegions = state.regions.filter(
    (region) => region.classification.category === 'color_contrast',
  );

  if (contrastRegions.length === 0) {
    return state;
  }

  const averageScore =
    contrastRegions.reduce((sum, region) => sum + region.severity.score, 0) /
    contrastRegions.length;

  let nextState = appendFinding(
    state,
    'contrast',
    `${contrastRegions.length} low-contrast regions detected (avg severity ${(averageScore * 10).toFixed(
      1,
    )}/10). Target WCAG AA (4.5:1) or better for body text.`,
  );

  if (state.metadata?.audience === 'Accessibility-Focused') {
    nextState = appendFinding(
      nextState,
      'contrast',
      'Accessibility-focused audiences expect high-contrast controls. Ensure focus states and disabled buttons also meet contrast guidelines.',
    );
  }

  contrastRegions.slice(0, 3).forEach((region) => {
    nextState = appendFinding(
      nextState,
      'contrast',
      `• ${region.classification.subcategory} flagged ${region.severity.level}.`,
    );
  });

  return nextState;
};

