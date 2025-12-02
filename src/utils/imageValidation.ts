import { PNG } from 'pngjs';
import { promises as fs } from 'fs';
import { detectMultiPageScreenshot, MultiPageDetectionResult } from './multiPageDetection';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationResult {
  valid: boolean;
  dimensions: ImageDimensions;
  aspectRatio: number;
  pixelArea: number;
  issues: string[];
  warnings: string[];
  multiPageDetection?: MultiPageDetectionResult;
}

const MIN_DIMENSION = 100; // Minimum width or height in pixels
const MIN_PIXEL_AREA = 10000; // Minimum total pixels (100x100)
const MAX_ASPECT_RATIO = 20; // Maximum width:height or height:width ratio

/**
 * Validates an image file before Vision API analysis.
 * Checks dimensions, aspect ratio, and pixel area.
 */
export async function validateImage(imagePath: string): Promise<ImageValidationResult> {
  const result: ImageValidationResult = {
    valid: true,
    dimensions: { width: 0, height: 0 },
    aspectRatio: 0,
    pixelArea: 0,
    issues: [],
    warnings: [],
  };

  try {
    // Read and parse image
    const buffer = await fs.readFile(imagePath);
    const image = PNG.sync.read(buffer);

    result.dimensions = { width: image.width, height: image.height };
    result.pixelArea = image.width * image.height;
    result.aspectRatio = Math.max(image.width / image.height, image.height / image.width);

    // Check minimum dimensions
    if (image.width < MIN_DIMENSION || image.height < MIN_DIMENSION) {
      result.valid = false;
      result.issues.push(
        `Image dimensions (${image.width}x${image.height}px) are too small. Minimum required: ${MIN_DIMENSION}x${MIN_DIMENSION}px`,
      );
    }

    // Check minimum pixel area
    if (result.pixelArea < MIN_PIXEL_AREA) {
      result.valid = false;
      result.issues.push(
        `Image pixel area (${result.pixelArea.toLocaleString()}px²) is too small. Minimum required: ${MIN_PIXEL_AREA.toLocaleString()}px²`,
      );
    }

    // Check aspect ratio
    if (result.aspectRatio > MAX_ASPECT_RATIO) {
      result.valid = false;
      result.issues.push(
        `Image aspect ratio (${result.aspectRatio.toFixed(1)}:1) is too extreme. Maximum allowed: ${MAX_ASPECT_RATIO}:1`,
      );
    }

    // Warnings for borderline cases
    if (image.width < 200 || image.height < 200) {
      result.warnings.push(
        'Image dimensions are small. Analysis quality may be reduced.',
      );
    }

    if (result.aspectRatio > 10) {
      result.warnings.push(
        'Image has an unusual aspect ratio. Some UI elements may not be detected accurately.',
      );
    }

    if (result.pixelArea < 50000) {
      result.warnings.push(
        'Image has low pixel density. Analysis may miss fine details.',
      );
    }

    // Detect multi-page screenshots
    try {
      const multiPageResult = await detectMultiPageScreenshot(imagePath);
      result.multiPageDetection = multiPageResult;

      if (multiPageResult.isMultiPage) {
        if (multiPageResult.recommendation === 'split') {
          result.warnings.push(
            `⚠️ MULTI-PAGE DETECTED: This image appears to contain ${multiPageResult.estimatedPageCount} separate UI pages. For best accuracy, please split into individual page screenshots.`,
          );
        } else if (multiPageResult.recommendation === 'proceed_with_warning') {
          result.warnings.push(
            `⚠️ MULTI-PAGE POSSIBLE: This image may contain ${multiPageResult.estimatedPageCount} separate UI pages. Analysis may mix contexts across pages. Consider splitting for better accuracy.`,
          );
        }
      }
    } catch {
      // Multi-page detection failed, continue without it
    }
  } catch (error) {
    result.valid = false;
    result.issues.push(
      `Failed to read image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return result;
}

/**
 * Gets image dimensions without full validation.
 * Useful for quick checks.
 */
export async function getImageDimensions(imagePath: string): Promise<ImageDimensions> {
  try {
    const buffer = await fs.readFile(imagePath);
    const image = PNG.sync.read(buffer);
    return { width: image.width, height: image.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

