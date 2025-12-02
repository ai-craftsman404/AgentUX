import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { jsonValidator } from '../../src/utils/jsonValidation';

const fixturePath = path.resolve(
  __dirname,
  '../../fixtures/vision/dashboard.json',
);

describe('jsonValidator', () => {
  it('parses fixture payload', () => {
    const raw = readFileSync(fixturePath, 'utf8');
    const payload = jsonValidator.parseVisionPayload(raw);
    expect(payload.regions.length).toBeGreaterThan(0);
    expect(payload.attentionGrid.grid.width).toBe(2);
    expect(payload.summary.strengths).toContain(
      'Hero typography hierarchy is clear.',
    );
  });
});

