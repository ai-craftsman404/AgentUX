import {
  AnalysisMetadata,
  AnalysisState,
  DEFAULT_METADATA,
  emptyAgentFindings,
} from '../types';

const createDefaultState = (): AnalysisState => ({
  metadata: null,
  regions: [],
  attentionGrid: null,
  summary: null,
  warnings: [],
  agentFindings: emptyAgentFindings(),
});

let analysisState: AnalysisState = createDefaultState();

export const getAnalysisState = (): AnalysisState => analysisState;

export const resetAnalysisState = (): void => {
  analysisState = createDefaultState();
};

export const setMetadata = (metadata: AnalysisMetadata): void => {
  analysisState = { ...analysisState, metadata };
};

export const ensureMetadata = (): AnalysisMetadata => {
  if (!analysisState.metadata) {
    analysisState = { ...analysisState, metadata: DEFAULT_METADATA };
  }
  return analysisState.metadata!;
};

export const updateAnalysisState = (partial: Partial<AnalysisState>): void => {
  const mergedFindings = partial.agentFindings
    ? {
        spacing: partial.agentFindings.spacing ?? analysisState.agentFindings.spacing,
        typography:
          partial.agentFindings.typography ?? analysisState.agentFindings.typography,
        contrast:
          partial.agentFindings.contrast ?? analysisState.agentFindings.contrast,
        interaction:
          partial.agentFindings.interaction ??
          analysisState.agentFindings.interaction,
        navigation:
          partial.agentFindings.navigation ?? analysisState.agentFindings.navigation,
        designSystem:
          partial.agentFindings.designSystem ??
          analysisState.agentFindings.designSystem,
      }
    : analysisState.agentFindings;

  analysisState = {
    ...analysisState,
    ...partial,
    agentFindings: mergedFindings,
  };
};

