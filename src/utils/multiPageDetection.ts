import { PNG } from 'pngjs';
import { promises as fs } from 'fs';

export interface MultiPageDetectionResult {
  isMultiPage: boolean;
  confidence: 'high' | 'medium' | 'low';
  estimatedPageCount: number;
  pageBoundaries: Array<{ x: number; width: number }>;
  reasons: string[];
  recommendation: 'split' | 'proceed_with_warning' | 'proceed';
}

/**
 * Detects if an image contains multiple UI pages/screens side-by-side.
 * Uses heuristics like aspect ratio, vertical dividers, and consistent spacing.
 */
export async function detectMultiPageScreenshot(
  imagePath: string,
): Promise<MultiPageDetectionResult> {
  const result: MultiPageDetectionResult = {
    isMultiPage: false,
    confidence: 'low',
    estimatedPageCount: 1,
    pageBoundaries: [],
    reasons: [],
    recommendation: 'proceed',
  };

  try {
    const buffer = await fs.readFile(imagePath);
    const image = PNG.sync.read(buffer);

    const width = image.width;
    const height = image.height;
    const aspectRatio = width / height;

    // Heuristic 1: Aspect ratio check
    // Mobile screens are typically portrait (width < height)
    // Multiple mobile screens side-by-side would be very wide
    const isVeryWide = aspectRatio > 2.5; // 3 mobile screens ≈ 3:1 ratio
    const isExtremelyWide = aspectRatio > 3.5;

    if (isExtremelyWide) {
      result.isMultiPage = true;
      result.confidence = 'high';
      result.reasons.push(`Extremely wide aspect ratio (${aspectRatio.toFixed(2)}:1) suggests multiple pages`);
      result.estimatedPageCount = Math.round(aspectRatio);
      result.recommendation = 'split';
    } else if (isVeryWide) {
      result.isMultiPage = true;
      result.confidence = 'medium';
      result.reasons.push(`Wide aspect ratio (${aspectRatio.toFixed(2)}:1) may indicate multiple pages`);
      result.estimatedPageCount = Math.round(aspectRatio);
      result.recommendation = 'proceed_with_warning';
    }

    // Heuristic 2: Detect vertical dividers (consistent vertical lines/spacing)
    // Sample middle rows to look for vertical dividers
    const sampleRows = [
      Math.floor(height * 0.25),
      Math.floor(height * 0.5),
      Math.floor(height * 0.75),
    ];

    const dividerCandidates: number[] = [];
    const dividerThreshold = 0.3; // Minimum width of divider relative to image width

    for (const row of sampleRows) {
      if (row >= height) continue;

      // Look for vertical lines (consistent color changes)
      let consecutiveSimilar = 0;
      let lastR = 0;
      let lastG = 0;
      let lastB = 0;

      for (let x = 0; x < width; x += 1) {
        const idx = (width * row + x) << 2;
        const r = image.data[idx];
        const g = image.data[idx + 1];
        const b = image.data[idx + 2];

        // Check if this pixel is similar to previous
        const colorDiff = Math.abs(r - lastR) + Math.abs(g - lastG) + Math.abs(b - lastB);
        if (colorDiff < 10) {
          consecutiveSimilar += 1;
        } else {
          if (consecutiveSimilar > width * dividerThreshold) {
            // Potential divider found
            const dividerX = x - consecutiveSimilar / 2;
            if (!dividerCandidates.some((c) => Math.abs(c - dividerX) < width * 0.1)) {
              dividerCandidates.push(dividerX);
            }
          }
          consecutiveSimilar = 1;
        }

        lastR = r;
        lastG = g;
        lastB = b;
      }
    }

    // If we found consistent dividers, likely multi-page
    if (dividerCandidates.length >= 2) {
      result.isMultiPage = true;
      if (result.confidence === 'low') {
        result.confidence = 'medium';
      }
      result.reasons.push(`Detected ${dividerCandidates.length} potential vertical dividers`);
      result.estimatedPageCount = dividerCandidates.length + 1;
      result.pageBoundaries = dividerCandidates.map((x) => ({ x, width: 0 }));
      
      if (result.recommendation === 'proceed') {
        result.recommendation = 'proceed_with_warning';
      }
    }

    // Heuristic 3: Check for repeated UI patterns (mobile frames)
    // Mobile screens typically have consistent widths
    // If image width is divisible by a common mobile width (~375px), likely multi-page
    const commonMobileWidths = [375, 390, 414, 428]; // Common mobile screen widths
    for (const mobileWidth of commonMobileWidths) {
      const pageCount = Math.round(width / mobileWidth);
      if (pageCount >= 2 && pageCount <= 5 && Math.abs(width - mobileWidth * pageCount) < mobileWidth * 0.1) {
        result.isMultiPage = true;
        if (result.confidence === 'low') {
          result.confidence = 'medium';
        }
        result.reasons.push(`Image width (${width}px) suggests ${pageCount} mobile screens (${mobileWidth}px each)`);
        result.estimatedPageCount = pageCount;
        
        if (result.recommendation === 'proceed') {
          result.recommendation = 'proceed_with_warning';
        }
        break;
      }
    }

    // Set final recommendation based on confidence
    if (result.isMultiPage) {
      if (result.confidence === 'high') {
        result.recommendation = 'split';
      } else if (result.confidence === 'medium') {
        result.recommendation = 'proceed_with_warning';
      }
    }

    return result;
  } catch (error) {
    // If detection fails, assume single page
    return result;
  }
}

