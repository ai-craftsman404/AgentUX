import { readFileSync } from 'fs';
import path from 'path';
import { VisionPayload, jsonValidator } from './jsonValidation';
import { logger } from './logger';

const DEFAULT_FIXTURE = 'dashboard';

export const getMockVisionResult = (
  fixtureName: string = DEFAULT_FIXTURE,
): VisionPayload => {
  try {
    const fixturePath = path.resolve(
      __dirname,
      `../../fixtures/vision/${fixtureName}.json`,
    );
    const raw = readFileSync(fixturePath, 'utf8');
    return jsonValidator.parseVisionPayload(raw);
  } catch (error) {
    logger.error('Failed to load mock Vision fixture', error);
    return {
      regions: [],
      attentionGrid: null,
      summary: {
        strengths: [],
        weaknesses: ['Mock fixture unavailable.'],
      },
    };
  }
};

