import { RegionFinding, AttentionGrid } from '../types';

/**
 * Gets the attention value for a specific region from the attention grid.
 * Returns the average attention value across the grid cells that overlap with the region.
 */
export function getAttentionValueForRegion(
  region: RegionFinding,
  attentionGrid: AttentionGrid | null,
  imageWidth: number,
  imageHeight: number,
): number {
  if (!attentionGrid || !attentionGrid.grid) {
    return 0.5; // Default to medium if no attention grid
  }

  const { x, y, width, height } = region.bounds;
  const grid = attentionGrid.grid;

  // Calculate grid cell dimensions
  const cellWidth = imageWidth / grid.width;
  const cellHeight = imageHeight / grid.height;

  // Find grid cells that overlap with the region
  const startCol = Math.floor(x / cellWidth);
  const endCol = Math.ceil((x + width) / cellWidth);
  const startRow = Math.floor(y / cellHeight);
  const endRow = Math.ceil((y + height) / cellHeight);

  // Clamp to grid bounds
  const clampedStartCol = Math.max(0, Math.min(startCol, grid.width - 1));
  const clampedEndCol = Math.max(0, Math.min(endCol, grid.width));
  const clampedStartRow = Math.max(0, Math.min(startRow, grid.height - 1));
  const clampedEndRow = Math.max(0, Math.min(endRow, grid.height));

  // Calculate average attention value for overlapping cells
  let totalAttention = 0;
  let cellCount = 0;

  for (let row = clampedStartRow; row < clampedEndRow; row++) {
    if (row >= grid.values.length) continue;
    const rowValues = grid.values[row];
    if (!rowValues) continue;

    for (let col = clampedStartCol; col < clampedEndCol; col++) {
      if (col >= rowValues.length) continue;
      totalAttention += rowValues[col] || 0;
      cellCount++;
    }
  }

  return cellCount > 0 ? totalAttention / cellCount : 0;
}

/**
 * Validates regions against the attention grid.
 * Filters out regions that are in low-attention areas (likely false positives).
 */
export function validateRegionsWithAttentionGrid(
  regions: RegionFinding[],
  attentionGrid: AttentionGrid | null,
  imageWidth: number,
  imageHeight: number,
  threshold: number = 0.3,
): {
  validatedRegions: RegionFinding[];
  filteredCount: number;
  filteredReasons: string[];
} {
  if (!attentionGrid) {
    // No attention grid available, return all regions
    return {
      validatedRegions: regions,
      filteredCount: 0,
      filteredReasons: [],
    };
  }

  const validatedRegions: RegionFinding[] = [];
  const filteredReasons: string[] = [];

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const attentionValue = getAttentionValueForRegion(
      region,
      attentionGrid,
      imageWidth,
      imageHeight,
    );

    if (attentionValue >= threshold) {
      validatedRegions.push(region);
    } else {
      filteredReasons.push(
        `Region ${i}: Low attention grid value (${attentionValue.toFixed(2)} < ${threshold})`,
      );
    }
  }

  return {
    validatedRegions,
    filteredCount: regions.length - validatedRegions.length,
    filteredReasons,
  };
}

