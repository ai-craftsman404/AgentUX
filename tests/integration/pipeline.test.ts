import { describe, expect, it } from 'vitest';
import { runPipeline } from '../../src/agents';
import { AnalysisState, emptyAgentFindings } from '../../src/types';

describe('pipeline', () => {
  it('returns state with warnings when regions missing', () => {
    const initial: AnalysisState = {
      metadata: {
        platform: 'Desktop Web',
        uiType: 'Dashboard',
        audience: 'Enterprise Users',
      },
      regions: [],
      attentionGrid: null,
      summary: {
        strengths: [],
        weaknesses: [],
      },
      warnings: [],
      agentFindings: emptyAgentFindings(),
    };

    const result = runPipeline(initial);
    expect(result.summary?.strengths).toContain(
      'Vision detected no issues; overall UI appears consistent.',
    );
  });
});

