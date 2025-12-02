import { AnalysisState } from '../types';
import { AgentFn } from './types';
import { regionSegmenter } from './regionSegmenter';
import { categoryClassifier } from './categoryClassifier';
import { spacingAgent } from './spacingAgent';
import { typographyAgent } from './typographyAgent';
import { contrastAgent } from './contrastAgent';
import { interactionAgent } from './interactionAgent';
import { navigationAgent } from './navigationAgent';
import { designSystemAgent } from './designSystemAgent';
import { recommendationAgent } from './recommendationAgent';
import { heatmapBuilder } from './heatmapBuilder';

const sequentialAgents: AgentFn[] = [
  regionSegmenter,
  categoryClassifier,
];

const parallelStageAgents: AgentFn[] = [
  spacingAgent,
  typographyAgent,
  contrastAgent,
  interactionAgent,
];

const navigationStageAgents: AgentFn[] = [navigationAgent, designSystemAgent];

const finalAgents: AgentFn[] = [recommendationAgent, heatmapBuilder];

const runSequential = (state: AnalysisState, agents: AgentFn[]): AnalysisState =>
  agents.reduce((current, agent) => {
    try {
      return agent(current);
    } catch {
      return {
        ...current,
        warnings: [
          ...current.warnings,
          `Agent failure: ${agent.name}; continuing with previous state.`,
        ],
      };
    }
  }, state);

const runParallel = (state: AnalysisState, agents: AgentFn[]): AnalysisState => {
  const states = agents.map((agent) => {
    try {
      return agent(state);
    } catch {
      return {
        ...state,
        warnings: [
          ...state.warnings,
          `Agent failure: ${agent.name}; continuing with previous state.`,
        ],
      };
    }
  });

  return states.reduce((acc, next) => {
    const mergedFindings = {
      spacing: [...acc.agentFindings.spacing, ...next.agentFindings.spacing],
      typography: [
        ...acc.agentFindings.typography,
        ...next.agentFindings.typography,
      ],
      contrast: [...acc.agentFindings.contrast, ...next.agentFindings.contrast],
      interaction: [
        ...acc.agentFindings.interaction,
        ...next.agentFindings.interaction,
      ],
      navigation: [
        ...acc.agentFindings.navigation,
        ...next.agentFindings.navigation,
      ],
      designSystem: [
        ...acc.agentFindings.designSystem,
        ...next.agentFindings.designSystem,
      ],
    };

    return {
      ...acc,
      warnings: Array.from(new Set([...acc.warnings, ...next.warnings])),
      regions: next.regions.length ? next.regions : acc.regions,
      summary: next.summary ?? acc.summary,
      attentionGrid: next.attentionGrid ?? acc.attentionGrid,
      agentFindings: mergedFindings,
    };
  }, state);
};

export const runPipeline = (state: AnalysisState): AnalysisState => {
  let current = runSequential(state, sequentialAgents);
  current = runParallel(current, parallelStageAgents);
  current = runParallel(current, navigationStageAgents);
  current = runSequential(current, finalAgents);
  return current;
};

