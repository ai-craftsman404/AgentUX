import { jsonrepair } from 'jsonrepair';
import {
  AnalysisState,
  AttentionGrid,
  RegionFinding,
  AnalysisSummary,
} from '../types';
import { logger } from './logger';
import { visionResponseSchema } from './schema';

export type VisionPayload = Pick<
  AnalysisState,
  'regions' | 'attentionGrid' | 'summary'
>;

class JsonValidator {
  /**
   * Check if raw response contains ellipses (incomplete data)
   */
  hasEllipses(raw: string): boolean {
    // Check for common ellipses patterns
    return (
      raw.includes('"...') ||
      raw.includes('...') ||
      raw.includes('"..."') ||
      raw.includes('"..."') ||
      raw.includes('...]') ||
      raw.includes('...}')
    );
  }

  /**
   * Validate raw response before parsing
   */
  validateRawResponse(raw: string): { valid: boolean; reason?: string } {
    if (!raw || raw.trim().length === 0) {
      return { valid: false, reason: 'Empty response from Vision API' };
    }

    if (this.hasEllipses(raw)) {
      return {
        valid: false,
        reason: 'Response contains ellipses (incomplete data)',
      };
    }

    // Check for basic JSON structure indicators
    if (!raw.includes('{') || !raw.includes('}')) {
      return { valid: false, reason: 'Response does not appear to be JSON' };
    }

    return { valid: true };
  }

  repair(raw: string): string {
    if (raw.includes('...')) {
      throw new Error('Invalid Vision output: contains ellipses.');
    }

    try {
      return jsonrepair(raw);
    } catch (error) {
      logger.error('jsonrepair failed', error);
      throw error;
    }
  }

  parseVisionPayload(raw: string): VisionPayload {
    const repaired = this.repair(raw);
    const parsed = JSON.parse(repaired);
    const validated = visionResponseSchema.parse(parsed);

    const regions: RegionFinding[] = validated.regions.map((region) => ({
      bounds: {
        x: region.bounds.x,
        y: region.bounds.y,
        width: region.bounds.width,
        height: region.bounds.height,
      },
      classification: {
        category: region.classification.category,
        subcategory: region.classification.subcategory,
      },
      severity: {
        level: region.severity.level,
        score: region.severity.score,
      },
      notes: region.notes,
    }));

    // Handle "no analysis" state (width=0, height=0)
    const attentionGrid: AttentionGrid | null =
      validated.attention_grid.grid.width === 0 || validated.attention_grid.grid.height === 0
        ? null
        : {
            grid: {
              width: validated.attention_grid.grid.width,
              height: validated.attention_grid.grid.height,
              values: validated.attention_grid.grid.values,
            },
            source: validated.attention_grid.source,
            normalization: validated.attention_grid.normalization,
          };

    const summary: AnalysisSummary = {
      strengths: validated.summary?.strengths ?? [],
      weaknesses: validated.summary?.weaknesses ?? [],
    };

    return { regions, attentionGrid, summary };
  }

  fallbackPayload(reason?: string): VisionPayload {
    const defaultReason =
      'Unable to analyse screenshot due to invalid model output. The Vision API response could not be parsed or validated.';
    return {
      regions: [],
      attentionGrid: null,
      summary: {
        strengths: [],
        weaknesses: [reason ?? defaultReason],
      },
    };
  }

  /**
   * Creates a payload for "no analysis possible" state when Vision returns width=0, height=0.
   * This is a valid state indicating Vision API couldn't analyze the image.
   */
  noAnalysisPayload(imageIssue?: string): VisionPayload {
    const reason = imageIssue
      ? `Unable to analyse screenshot: ${imageIssue}`
      : 'Unable to analyse screenshot. The image may be too small, have an extreme aspect ratio, or lack sufficient visual content for analysis.';
    return {
      regions: [],
      attentionGrid: null,
      summary: {
        strengths: [],
        weaknesses: [reason],
      },
    };
  }
}

export const jsonValidator = new JsonValidator();

/**
 * Validate raw response before parsing
 */
export function validateRawResponse(raw: string): {
  valid: boolean;
  reason?: string;
} {
  if (!raw || raw.trim().length === 0) {
    return { valid: false, reason: 'Empty response from Vision API' };
  }

  if (hasEllipses(raw)) {
    return {
      valid: false,
      reason: 'Response contains ellipses (incomplete data)',
    };
  }

  // Check for basic JSON structure indicators
  if (!raw.includes('{') || !raw.includes('}')) {
    return { valid: false, reason: 'Response does not appear to be JSON' };
  }

  return { valid: true };
}

/**
 * Check if raw response contains ellipses (incomplete data)
 */
export function hasEllipses(raw: string): boolean {
  // Check for common ellipses patterns
  return (
    raw.includes('"...') ||
    raw.includes('...') ||
    raw.includes('"..."') ||
    raw.includes('...]') ||
    raw.includes('...}')
  );
}

export const safeParseVisionPayload = (
  raw: string,
  imagePath?: string,
): VisionPayload => {
  try {
    const payload = jsonValidator.parseVisionPayload(raw);

    // Check if Vision returned "no analysis" state (width=0, height=0)
    if (payload.attentionGrid === null || (payload.attentionGrid.grid.width === 0 && payload.attentionGrid.grid.height === 0)) {
      logger.warn(
        `Vision API returned "no analysis" state (width=0, height=0)${imagePath ? ` for ${imagePath}` : ''}`,
      );
      // Check if summary already indicates the issue
      if (payload.summary) {
        const hasAnalysisIssue = payload.summary.weaknesses.some((w) =>
          w.toLowerCase().includes('unable to analyse'),
        );
        if (!hasAnalysisIssue) {
          payload.summary.weaknesses.push(
            'Vision API could not generate an attention grid. The image may be too small, have an extreme aspect ratio, or lack sufficient visual content.',
          );
        }
      }
      return payload;
    }

    return payload;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    logger.error(
      `Vision payload parsing failed${imagePath ? ` for ${imagePath}` : ''}. Error: ${errorMessage}`,
      error,
    );

    // Provide more specific error message based on error type
    let reason = 'Unable to analyse screenshot due to invalid model output.';
    if (errorMessage.includes('ellipses')) {
      reason =
        'Vision API response contained incomplete data (ellipses). Please retry the analysis.';
    } else if (errorMessage.includes('ZodError') || errorMessage.includes('validation')) {
      reason =
        'Vision API response did not match the expected schema. The model output may be malformed.';
    } else if (errorMessage.includes('JSON')) {
      reason =
        'Vision API response was not valid JSON. The model output may be corrupted.';
    }

    return jsonValidator.fallbackPayload(reason);
  }
};

