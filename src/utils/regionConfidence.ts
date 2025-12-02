import { RegionFinding, AttentionGrid } from '../types';
import { getAttentionValueForRegion } from './attentionGridValidation';

export interface RegionConfidenceScore {
  overall: number; // 0-1 score
  factors: {
    noteSpecificity: number; // Detailed notes = higher score
    boundaryPrecision: number; // Tight boundaries = higher score
    attentionGridAlignment: number; // Aligns with attention grid = higher score
    categoryAppropriateness: number; // Category matches visual = higher score (always 1.0 for now)
    uniqueness: number; // Unique dimensions = higher score
  };
}

/**
 * Scores a region's note specificity.
 * Higher score for longer, more detailed notes with specific text mentions.
 */
function scoreNoteSpecificity(region: RegionFinding): number {
  let score = 0;

  if (region.notes.length === 0) {
    return 0;
  }

  // Average note length
  const avgNoteLength = region.notes.reduce((sum, note) => sum + note.length, 0) / region.notes.length;
  if (avgNoteLength > 50) score += 0.3; // Detailed notes
  else if (avgNoteLength > 30) score += 0.2; // Moderate detail
  else if (avgNoteLength > 15) score += 0.1; // Basic notes

  // Specific text mentions (quotes indicate specific elements)
  const hasSpecificText = region.notes.some((note) => note.includes('"') || note.includes("'"));
  if (hasSpecificText) score += 0.2;

  // Element-specific mentions (button, text, chart, etc.)
  const elementKeywords = ['button', 'text', 'label', 'chart', 'icon', 'image', 'input', 'link'];
  const hasElementMentions = region.notes.some((note) =>
    elementKeywords.some((keyword) => note.toLowerCase().includes(keyword)),
  );
  if (hasElementMentions) score += 0.2;

  // Location-specific mentions (top, bottom, left, right, row, column)
  const locationKeywords = ['top', 'bottom', 'left', 'right', 'row', 'column', 'section'];
  const hasLocationMentions = region.notes.some((note) =>
    locationKeywords.some((keyword) => note.toLowerCase().includes(keyword)),
  );
  if (hasLocationMentions) score += 0.1;

  // Avoid generic phrases
  const genericPhrases = ['has issues', 'needs improvement', 'could be better'];
  const hasGenericPhrases = region.notes.some((note) =>
    genericPhrases.some((phrase) => note.toLowerCase().includes(phrase)),
  );
  if (hasGenericPhrases) score -= 0.1;

  return Math.max(0, Math.min(1, score)); // Clamp to 0-1
}

/**
 * Scores a region's boundary precision.
 * Higher score for tighter boundaries (not too large relative to image).
 */
function scoreBoundaryPrecision(
  region: RegionFinding,
  imageWidth: number,
  imageHeight: number,
): number {
  const { width, height } = region.bounds;
  const imageArea = imageWidth * imageHeight;
  const regionArea = width * height;
  const coverageRatio = regionArea / imageArea;

  // Prefer regions that are 1-30% of image area
  if (coverageRatio > 0.9) return 0; // Too large (likely placeholder)
  if (coverageRatio > 0.5) return 0.2; // Large but acceptable
  if (coverageRatio > 0.3) return 0.5; // Medium size
  if (coverageRatio > 0.1) return 0.8; // Good size
  if (coverageRatio > 0.01) return 0.9; // Small, precise
  return 1.0; // Very small, very precise
}

/**
 * Scores a region's attention grid alignment.
 * Higher score for regions in high-attention areas.
 */
function scoreAttentionGridAlignment(
  region: RegionFinding,
  attentionGrid: AttentionGrid | null,
  imageWidth: number,
  imageHeight: number,
): number {
  if (!attentionGrid) {
    return 0.5; // Default to medium if no attention grid
  }

  const attentionValue = getAttentionValueForRegion(region, attentionGrid, imageWidth, imageHeight);
  return attentionValue; // Direct mapping: attention value = score
}

/**
 * Scores a region's uniqueness.
 * Higher score for unique dimensions (not duplicate).
 */
function scoreUniqueness(
  region: RegionFinding,
  allRegions: RegionFinding[],
): number {
  const { width, height } = region.bounds;
  const dimensionKey = `${width}x${height}`;

  // Count how many regions have the same dimensions
  const sameDimensions = allRegions.filter(
    (r) => `${r.bounds.width}x${r.bounds.height}` === dimensionKey,
  ).length;

  if (sameDimensions === 1) return 1.0; // Unique
  if (sameDimensions === 2) return 0.7; // One duplicate
  if (sameDimensions === 3) return 0.4; // Two duplicates
  return 0.1; // Many duplicates (likely placeholder)
}

/**
 * Calculates confidence score for a region.
 */
export function scoreRegionQuality(
  region: RegionFinding,
  allRegions: RegionFinding[],
  attentionGrid: AttentionGrid | null,
  imageWidth: number,
  imageHeight: number,
): RegionConfidenceScore {
  const factors = {
    noteSpecificity: scoreNoteSpecificity(region),
    boundaryPrecision: scoreBoundaryPrecision(region, imageWidth, imageHeight),
    attentionGridAlignment: scoreAttentionGridAlignment(region, attentionGrid, imageWidth, imageHeight),
    categoryAppropriateness: 1.0, // Placeholder - could be enhanced with ML
    uniqueness: scoreUniqueness(region, allRegions),
  };

  // Weighted average
  const overall =
    factors.noteSpecificity * 0.25 +
    factors.boundaryPrecision * 0.25 +
    factors.attentionGridAlignment * 0.25 +
    factors.categoryAppropriateness * 0.1 +
    factors.uniqueness * 0.15;

  return {
    overall: Math.max(0, Math.min(1, overall)), // Clamp to 0-1
    factors,
  };
}

/**
 * Filters regions by confidence threshold.
 */
export function filterRegionsByConfidence(
  regions: RegionFinding[],
  allRegions: RegionFinding[],
  attentionGrid: AttentionGrid | null,
  imageWidth: number,
  imageHeight: number,
  threshold: number = 0.4,
): {
  filteredRegions: RegionFinding[];
  removedCount: number;
  removedReasons: string[];
} {
  const filteredRegions: RegionFinding[] = [];
  const removedReasons: string[] = [];

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const confidence = scoreRegionQuality(region, allRegions, attentionGrid, imageWidth, imageHeight);

    if (confidence.overall >= threshold) {
      filteredRegions.push(region);
    } else {
      removedReasons.push(
        `Region ${i}: Low confidence score (${confidence.overall.toFixed(2)} < ${threshold})`,
      );
    }
  }

  return {
    filteredRegions,
    removedCount: regions.length - filteredRegions.length,
    removedReasons,
  };
}

