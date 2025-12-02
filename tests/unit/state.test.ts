import { describe, expect, it, beforeEach } from 'vitest';
import {
  ensureMetadata,
  getAnalysisState,
  resetAnalysisState,
  setMetadata,
} from '../../src/utils/state';
import { AnalysisMetadata } from '../../src/types';

describe('analysis state helpers', () => {
  beforeEach(() => {
    resetAnalysisState();
  });

  it('falls back to default metadata when none set', () => {
    const metadata = ensureMetadata();
    expect(metadata.defaultsApplied).toBe(true);
  });

  it('stores custom metadata', () => {
    const custom: AnalysisMetadata = {
      platform: 'Mobile Web',
      uiType: 'Landing Page',
      audience: 'General Public',
    };

    setMetadata(custom);
    const state = getAnalysisState();
    expect(state.metadata).toEqual(custom);
  });
});

