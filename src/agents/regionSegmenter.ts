import { AnalysisState, RegionFinding } from '../types';
import { AgentFn } from './types';

const normaliseRegion = (region: RegionFinding): RegionFinding => {
  const bounds = {
    ...region.bounds,
    width: Math.max(0, Math.round(region.bounds.width)),
    height: Math.max(0, Math.round(region.bounds.height)),
    x: Math.max(0, Math.round(region.bounds.x)),
    y: Math.max(0, Math.round(region.bounds.y)),
  };

  return { ...region, bounds };
};

export const regionSegmenter: AgentFn = (state: AnalysisState) => {
  const deduped = new Map<string, RegionFinding>();

  state.regions.forEach((region) => {
    const key = `${region.bounds.x}-${region.bounds.y}-${region.bounds.width}-${region.bounds.height}`;
    if (!deduped.has(key)) {
      deduped.set(key, normaliseRegion(region));
    }
  });

  return {
    ...state,
    regions: Array.from(deduped.values()),
  };
};

