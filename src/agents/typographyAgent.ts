import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { appendFinding } from './helpers';

export const typographyAgent: AgentFn = (state: AnalysisState) => {
  if (!state.metadata) {
    return state;
  }

  const typographyRegions = state.regions.filter(
    (region) => region.classification.category === 'typography',
  );

  let nextState = state;

  if (typographyRegions.length === 0) {
    if (state.metadata.audience === 'Accessibility-Focused') {
      nextState = appendFinding(
        nextState,
        'typography',
        'Accessibility-focused audiences expect explicit typography findings; none detected — double-check headline and body sizes manually.',
      );
    }
    return nextState;
  }

  const hierarchyIssues = typographyRegions.filter((region) =>
    region.classification.subcategory.includes('hierarchy'),
  );

  const legibilityIssues = typographyRegions.filter((region) =>
    region.classification.subcategory.includes('legibility'),
  );

  if (hierarchyIssues.length) {
    nextState = appendFinding(
      nextState,
      'typography',
      `${hierarchyIssues.length} hierarchy inconsistencies were flagged. Ensure heading levels follow a predictable scale.`,
    );
  }

  if (legibilityIssues.length || state.metadata.audience === 'Accessibility-Focused') {
    const note =
      legibilityIssues.length > 0
        ? `${legibilityIssues.length} legibility issues reported.`
        : 'Accessibility-focused audiences benefit from larger minimum font sizes.';
    nextState = appendFinding(
      nextState,
      'typography',
      `${note} Target ≥16px body copy and ≥24px primary headings.`,
    );
  }

  typographyRegions.slice(0, 2).forEach((region) => {
    nextState = appendFinding(
      nextState,
      'typography',
      `• ${region.classification.subcategory} rated ${region.severity.level}.`,
    );
  });

  return nextState;
};

