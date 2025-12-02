import { promises as fs } from 'fs';
import type { OpenAI as OpenAIType } from 'openai';
import { AnalysisMetadata } from '../types';
import { logger } from './logger';
import { buildVisionPrompt, SYSTEM_PROMPT } from './prompt';
import {
  VisionPayload,
  safeParseVisionPayload,
  validateRawResponse,
  hasEllipses,
} from './jsonValidation';
import { validateImage } from './imageValidation';
import {
  postProcessRegions,
  areRegionsPlaceholder,
} from './regionPostProcessing';
import { getImageDimensions } from './imageValidation';
import {
  validateRegionsWithAttentionGrid,
} from './attentionGridValidation';
import {
  filterRegionsByConfidence,
} from './regionConfidence';
import {
  normalizeImage,
  cleanupNormalizedImage,
  scaleBoundsToOriginal,
} from './imageNormalization';
import { classifyRegions } from './issueClassification';

export interface VisionClientOptions {
  apiKey: string;
  model: string;
}

export class VisionClient {
  private client: OpenAIType | null = null;
  private clientPromise: Promise<OpenAIType> | null = null;

  constructor(private readonly options: VisionClientOptions) {
    // Client will be lazily loaded on first use
  }

  /**
   * Lazy-load OpenAI client (VS Code extension host requirement)
   * This prevents activation failures if dependencies are missing
   */
  private async getClient(): Promise<OpenAIType> {
    if (this.client) {
      return this.client;
    }

    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = (async (): Promise<OpenAIType> => {
      try {
        // Use dynamic import for lazy loading (VS Code extension host compatible)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const OpenAIModule = require('openai');
        const OpenAI = OpenAIModule.OpenAI || OpenAIModule.default || OpenAIModule;
        
        const client = new OpenAI({ apiKey: this.options.apiKey });
        this.client = client;
        this.clientPromise = null; // Clear promise after success
        return client;
      } catch (error) {
        this.clientPromise = null; // Clear promise on error so we can retry
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load OpenAI client: ${errorMsg}`);
      }
    })();

    return this.clientPromise;
  }

  private async encodeImage(screenshotPath: string): Promise<string> {
    const buffer = await fs.readFile(screenshotPath);
    return buffer.toString('base64');
  }

  /**
   * Delay helper for retry logic
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build enhanced prompt for retry attempts
   */
  private buildRetryPrompt(basePrompt: string, attempt: number): string {
    return `${basePrompt}

CRITICAL RETRY INSTRUCTION (Attempt ${attempt}):
- DO NOT use ellipses ("...") anywhere in your response.
- Provide COMPLETE JSON with all arrays fully populated.
- Ensure all regions have complete bounds, classifications, and notes.
- If you cannot complete the analysis, return empty arrays with a weakness explaining why.`;
  }

  /**
   * Make a single Vision API call with validation
   */
  private async makeVisionCall(
    imageBase64: string,
    prompt: string,
    isRetry: boolean = false,
  ): Promise<string> {
    const client = await this.getClient();
    const systemPrompt = isRetry
      ? `${SYSTEM_PROMPT}\n\nCRITICAL: This is a retry attempt. DO NOT use ellipses. Provide complete JSON.`
      : SYSTEM_PROMPT;

    const completion = await client.chat.completions.create({
      model: this.options.model,
      temperature: isRetry ? 0.1 : 0, // Slightly higher temperature on retry
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt } as any,
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            } as any,
          ],
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (typeof rawContent !== 'string') {
      throw new Error('Unexpected Vision response structure.');
    }

    return rawContent;
  }

  async analyse(
    screenshotPath: string,
    metadata: AnalysisMetadata,
    maxRetries: number = 3,
  ): Promise<VisionPayload> {
    logger.info(
      `Vision request queued for ${metadata.platform} / ${metadata.uiType}`,
    );

    // Pre-validate image
    const validation = await validateImage(screenshotPath);
    if (!validation.valid) {
      const issues = validation.issues.join(' ');
      logger.warn(`Image validation failed for ${screenshotPath}: ${issues}`);
      throw new Error(
        `Image validation failed: ${issues}. Please use an image that is at least 100x100px with an aspect ratio no greater than 20:1.`,
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        logger.warn(`Image validation warning for ${screenshotPath}: ${warning}`);
      });
    }

    // Log multi-page detection if found
    if (validation.multiPageDetection?.isMultiPage) {
      logger.warn(
        `Multi-page screenshot detected: ${validation.multiPageDetection.estimatedPageCount} pages (confidence: ${validation.multiPageDetection.confidence})`,
      );
    }

    // Normalize image before Vision API call
    const normalized = await normalizeImage(screenshotPath);
    let imageToAnalyze = normalized.path;
    let normalizedUsed = normalized.scaleFactor !== 1.0;

    if (normalizedUsed) {
      logger.info(
        `Normalized image from ${normalized.originalWidth}x${normalized.originalHeight} to ${normalized.normalizedWidth}x${normalized.normalizedHeight} (scale: ${normalized.scaleFactor.toFixed(2)})`,
      );
    }

    const imageBase64 = await this.encodeImage(imageToAnalyze);
    let basePrompt = buildVisionPrompt(metadata);

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isRetry = attempt > 1;
        const prompt = isRetry
          ? this.buildRetryPrompt(basePrompt, attempt)
          : basePrompt;

        logger.info(
          `Vision API call attempt ${attempt}/${maxRetries}${isRetry ? ' (retry)' : ''}`,
        );

        const rawContent = await this.makeVisionCall(
          imageBase64,
          prompt,
          isRetry,
        );

        // Pre-validate response before parsing
        const validation = validateRawResponse(rawContent);
        if (!validation.valid) {
          if (attempt < maxRetries) {
            logger.warn(
              `Response validation failed on attempt ${attempt}: ${validation.reason}. Retrying...`,
            );
            await this.delay(1000 * Math.pow(2, attempt - 1)); // Exponential backoff
            continue;
          } else {
            throw new Error(
              `Response validation failed after ${maxRetries} attempts: ${validation.reason}`,
            );
          }
        }

        // Check for ellipses even after validation (double-check)
        if (hasEllipses(rawContent)) {
          if (attempt < maxRetries) {
            logger.warn(
              `Response contains ellipses on attempt ${attempt}. Retrying...`,
            );
            await this.delay(1000 * Math.pow(2, attempt - 1));
            continue;
          } else {
            throw new Error(
              `Response contains ellipses after ${maxRetries} attempts`,
            );
          }
        }

        // Parse with image path for better error messages
        let payload = safeParseVisionPayload(rawContent, screenshotPath);

        if (attempt > 1) {
          logger.info(`Successfully parsed response on attempt ${attempt}`);
        }

        // Scale region bounds back to original image coordinates if normalization was used
        if (normalizedUsed) {
          payload.regions = payload.regions.map((region) => ({
            ...region,
            bounds: scaleBoundsToOriginal(region.bounds, normalized.scaleFactor),
          }));
          logger.info(
            `Scaled ${payload.regions.length} region bounds back to original image coordinates`,
          );
        }

        // Clean up normalized image
        if (normalizedUsed) {
          await cleanupNormalizedImage(normalized.path).catch(() => {
            // Ignore cleanup errors
          });
        }

        // Post-process regions (use original dimensions)
        const imageDims = await getImageDimensions(screenshotPath);
        let processingResult = postProcessRegions(
          payload.regions,
          imageDims.width,
          imageDims.height,
        );

        if (processingResult.removedCount > 0) {
          logger.warn(
            `Removed ${processingResult.removedCount} invalid/suspicious regions from ${screenshotPath}`,
          );
          processingResult.reasons.forEach((reason) => {
            logger.warn(`  - ${reason}`);
          });
        }

        // Validate regions against attention grid
        // Skip validation for very small grids (< 5x5) as they're too coarse for accurate mapping
        let validatedRegions = processingResult.filteredRegions;
        if (payload.attentionGrid) {
          const grid = payload.attentionGrid.grid;
          const gridSize = grid.width * grid.height;
          
          // Skip attention grid validation for grids smaller than 5x5 (too coarse)
          if (gridSize < 25) {
            logger.info(
              `Skipping attention grid validation: grid too small (${grid.width}x${grid.height}) for accurate mapping`,
            );
          } else {
            // Calculate adaptive threshold based on attention grid distribution
            const allAttentionValues: number[] = [];
            if (grid.values) {
              grid.values.forEach((row) => {
                row.forEach((value) => allAttentionValues.push(value));
              });
            }
            const sortedValues = allAttentionValues.sort((a, b) => a - b);
            const percentile25 = sortedValues[Math.floor(sortedValues.length * 0.25)] || 0;
            const adaptiveThreshold = Math.max(0.1, Math.min(0.2, percentile25)); // Clamp between 0.1-0.2
            
            const attentionValidation = validateRegionsWithAttentionGrid(
              processingResult.filteredRegions,
              payload.attentionGrid,
              imageDims.width,
              imageDims.height,
              adaptiveThreshold, // Adaptive threshold based on image
            );

            if (attentionValidation.filteredCount > 0) {
              logger.info(
                `Filtered ${attentionValidation.filteredCount} regions with low attention grid alignment (threshold: ${adaptiveThreshold.toFixed(2)})`,
              );
              attentionValidation.filteredReasons.forEach((reason) => {
                logger.info(`  - ${reason}`);
              });
            }

            validatedRegions = attentionValidation.validatedRegions;
          }
        }

        // Filter regions by confidence score
        // Use very low threshold or disable for now to avoid over-filtering valid regions
        // TODO: Improve confidence scoring to better distinguish valid vs invalid regions
        const confidenceFilter = filterRegionsByConfidence(
          validatedRegions,
          validatedRegions, // Use validated regions for uniqueness calculation
          payload.attentionGrid,
          imageDims.width,
          imageDims.height,
          0.2, // Very low threshold: keep regions with confidence >= 0.2 (reduced from 0.3)
        );

        if (confidenceFilter.removedCount > 0) {
          logger.info(
            `Filtered ${confidenceFilter.removedCount} regions with low confidence scores`,
          );
          confidenceFilter.removedReasons.forEach((reason) => {
            logger.info(`  - ${reason}`);
          });
        }

        // Check if remaining regions appear to be placeholders
        if (
          confidenceFilter.filteredRegions.length > 0 &&
          areRegionsPlaceholder(
            confidenceFilter.filteredRegions,
            imageDims.width,
            imageDims.height,
          )
        ) {
          logger.warn(
            `Regions for ${screenshotPath} appear to be placeholder/generic data. Analysis quality may be reduced.`,
          );
          if (payload.summary) {
            payload.summary.weaknesses.push(
              'Detected regions appear to be generic placeholders. The analysis may not accurately reflect the actual UI elements.',
            );
          }
        }

        // Update payload with filtered regions
        payload.regions = confidenceFilter.filteredRegions;

        // Classify regions as hard/soft
        payload.regions = classifyRegions(payload.regions, metadata);

        return payload;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt < maxRetries) {
          const delayMs = 1000 * Math.pow(2, attempt - 1); // Exponential backoff
          logger.warn(
            `Vision API call failed on attempt ${attempt}: ${errorMessage}. Retrying in ${delayMs}ms...`,
          );
          await this.delay(delayMs);
          continue;
        } else {
          logger.error(
            `Vision API call failed after ${maxRetries} attempts: ${errorMessage}`,
          );
          throw lastError;
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Vision API call failed after all retries');
  }
}

