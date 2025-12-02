import { AnalysisState } from '../types';
import { AgentFn } from './types';

export const recommendationAgent: AgentFn = (state: AnalysisState) => {
  const summary = state.summary ?? { strengths: [], weaknesses: [] };
  const weaknesses = new Set(summary.weaknesses);
  const strengths = new Set(summary.strengths);

  if (state.agentFindings.spacing.length) {
    weaknesses.add(state.agentFindings.spacing[0]);
  }
  if (state.agentFindings.typography.length) {
    weaknesses.add(state.agentFindings.typography[0]);
  }
  if (state.agentFindings.contrast.length) {
    weaknesses.add(state.agentFindings.contrast[0]);
  }
  if (state.agentFindings.interaction.length) {
    weaknesses.add(state.agentFindings.interaction[0]);
  }
  if (state.agentFindings.navigation.length) {
    weaknesses.add(state.agentFindings.navigation[0]);
  }
  if (state.agentFindings.designSystem.length) {
    weaknesses.add(state.agentFindings.designSystem[0]);
  }

  if (state.warnings.length) {
    state.warnings.forEach((warning) => weaknesses.add(warning));
  }

  if (state.regions.length === 0) {
    strengths.add('Vision detected no issues; overall UI appears consistent.');
  }

  return {
    ...state,
    summary: {
      strengths: Array.from(strengths),
      weaknesses: Array.from(weaknesses),
    },
  };
};

