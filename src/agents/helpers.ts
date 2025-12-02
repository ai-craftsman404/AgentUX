import {
  AnalysisState,
  AgentFindings,
  Platform,
  RegionFinding,
} from '../types';

export type FindingKey = keyof AgentFindings;

export const cloneAgentFindings = (
  findings: AgentFindings,
): AgentFindings => ({
  spacing: [...findings.spacing],
  typography: [...findings.typography],
  contrast: [...findings.contrast],
  interaction: [...findings.interaction],
  navigation: [...findings.navigation],
  designSystem: [...findings.designSystem],
});

export const appendFinding = (
  state: AnalysisState,
  key: FindingKey,
  message: string,
): AnalysisState => {
  const agentFindings = cloneAgentFindings(state.agentFindings);
  agentFindings[key].push(message);
  return { ...state, agentFindings };
};

export const isTouchPlatform = (platform?: Platform): boolean =>
  !!platform &&
  (platform === 'Mobile Web' ||
    platform === 'Tablet' ||
    platform === 'Native iOS' ||
    platform === 'Native Android');

export const tapTargetThreshold = (platform?: Platform): number =>
  isTouchPlatform(platform) ? 44 : 32;

export const formatRegionSummary = (region: RegionFinding): string =>
  `${region.classification.subcategory} (severity: ${region.severity.level})`;

