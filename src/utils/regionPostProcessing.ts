import { RegionFinding, RegionCategory } from '../types';

export interface RegionPostProcessingResult {
  filteredRegions: RegionFinding[];
  removedCount: number;
  reasons: string[];
}

/**
 * Calculates Intersection over Union (IoU) for two bounding boxes.
 */
function calculateIoU(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number },
): number {
  const intersection = {
    x: Math.max(box1.x, box2.x),
    y: Math.max(box1.y, box2.y),
    width:
      Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x),
    height:
      Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y),
  };

  if (intersection.width <= 0 || intersection.height <= 0) {
    return 0;
  }

  const intersectionArea = intersection.width * intersection.height;
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const unionArea = box1Area + box2Area - intersectionArea;

  return intersectionArea / unionArea;
}

/**
 * Merges two regions into one.
 */
function mergeRegions(region1: RegionFinding, region2: RegionFinding): RegionFinding {
  const bounds1 = region1.bounds;
  const bounds2 = region2.bounds;

  // Merge bounds (union)
  const mergedBounds = {
    x: Math.min(bounds1.x, bounds2.x),
    y: Math.min(bounds1.y, bounds2.y),
    width: Math.max(bounds1.x + bounds1.width, bounds2.x + bounds2.width) - Math.min(bounds1.x, bounds2.x),
    height: Math.max(bounds1.y + bounds1.height, bounds2.y + bounds2.height) - Math.min(bounds1.y, bounds2.y),
  };

  // Keep highest severity
  const severity1 = region1.severity.score;
  const severity2 = region2.severity.score;
  const highestSeverity = severity1 >= severity2 ? region1.severity : region2.severity;

  // Combine categories if different (keep primary, note secondary)
  let category = region1.classification.category;
  let subcategory = region1.classification.subcategory;
  if (region1.classification.category !== region2.classification.category) {
    // Keep the category with higher severity, but note both
    if (severity2 > severity1) {
      category = region2.classification.category;
      subcategory = region2.classification.subcategory;
    }
    subcategory = `${subcategory} (also ${region2.classification.subcategory})`;
  }

  // Combine notes
  const combinedNotes = [
    ...region1.notes,
    ...region2.notes.filter((note) => !region1.notes.includes(note)),
  ];

  return {
    bounds: mergedBounds,
    classification: {
      category,
      subcategory,
    },
    severity: highestSeverity,
    notes: combinedNotes,
  };
}

/**
 * Merges overlapping regions based on IoU threshold.
 */
export function mergeOverlappingRegions(
  regions: RegionFinding[],
  iouThreshold: number = 0.5,
): RegionFinding[] {
  if (regions.length <= 1) {
    return regions;
  }

  const merged: RegionFinding[] = [];
  const used = new Set<number>();

  for (let i = 0; i < regions.length; i += 1) {
    if (used.has(i)) {
      continue;
    }

    let currentRegion = regions[i];
    let mergedAny = false;

    // Check for overlaps with remaining regions
    for (let j = i + 1; j < regions.length; j += 1) {
      if (used.has(j)) {
        continue;
      }

      const iou = calculateIoU(currentRegion.bounds, regions[j].bounds);
      if (iou > iouThreshold) {
        currentRegion = mergeRegions(currentRegion, regions[j]);
        used.add(j);
        mergedAny = true;
      }
    }

    merged.push(currentRegion);
    if (mergedAny) {
      used.add(i);
    }
  }

  return merged;
}

/**
 * Post-processes regions to filter out duplicates, invalid bounds, and suspicious regions.
 * Also merges overlapping regions and caps the total number.
 */
export function postProcessRegions(
  regions: RegionFinding[],
  imageWidth: number,
  imageHeight: number,
  maxRegions: number = 25,
): RegionPostProcessingResult {
  const result: RegionPostProcessingResult = {
    filteredRegions: [],
    removedCount: 0,
    reasons: [],
  };

  const seenBounds = new Set<string>();
  const imageArea = imageWidth * imageHeight;
  const SUSPICIOUS_AREA_THRESHOLD = 0.9; // 90% of image
  const MIN_AREA = 100; // Minimum region area in pixels²

  // Step 1: Filter invalid regions
  const validRegions: RegionFinding[] = [];
  for (let i = 0; i < regions.length; i += 1) {
    const region = regions[i];
    const { x, y, width, height } = region.bounds;

    // Check for invalid bounds
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      result.removedCount += 1;
      result.reasons.push(`Region ${i}: Invalid bounds (x=${x}, y=${y}, w=${width}, h=${height})`);
      continue;
    }

    // Check if region is within image bounds
    if (x + width > imageWidth || y + height > imageHeight) {
      result.removedCount += 1;
      result.reasons.push(
        `Region ${i}: Out of bounds (x=${x}, y=${y}, w=${width}, h=${height}) vs image (${imageWidth}x${imageHeight})`,
      );
      continue;
    }

    // Check for duplicates
    const boundsKey = `${x},${y},${width},${height}`;
    if (seenBounds.has(boundsKey)) {
      result.removedCount += 1;
      result.reasons.push(`Region ${i}: Duplicate bounds (${boundsKey})`);
      continue;
    }
    seenBounds.add(boundsKey);

    // Check area
    const area = width * height;

    // Filter suspiciously large regions (likely fallback/placeholder)
    if (area > imageArea * SUSPICIOUS_AREA_THRESHOLD) {
      result.removedCount += 1;
      result.reasons.push(
        `Region ${i}: Suspiciously large region (${Math.round((area / imageArea) * 100)}% of image)`,
      );
      continue;
    }

    // Filter very small regions (likely noise)
    if (area < MIN_AREA) {
      result.removedCount += 1;
      result.reasons.push(`Region ${i}: Very small region (${area}px², minimum ${MIN_AREA}px²)`);
      continue;
    }

    // Region passed all checks
    validRegions.push(region);
  }

  // Step 2: Merge overlapping regions
  const mergedRegions = mergeOverlappingRegions(validRegions);
  const mergeCount = validRegions.length - mergedRegions.length;
  if (mergeCount > 0) {
    result.removedCount += mergeCount;
    result.reasons.push(`Merged ${mergeCount} overlapping regions`);
  }

  // Step 3: Detect and flag suspicious uniform regions (generic placeholders)
  const regionSizes = mergedRegions.map((r) => `${r.bounds.width}x${r.bounds.height}`);
  const sizeCounts = new Map<string, number>();
  regionSizes.forEach((size) => {
    sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
  });

  // Flag if more than 2 regions have identical dimensions (suspicious)
  const suspiciousSizes: string[] = [];
  sizeCounts.forEach((count, size) => {
    if (count > 2) {
      suspiciousSizes.push(size);
      result.reasons.push(
        `Warning: ${count} regions have identical dimensions (${size}) - may be generic placeholders`,
      );
    }
  });

  // Step 4: Cap regions by severity (keep top N)
  const sortedRegions = [...mergedRegions].sort(
    (a, b) => b.severity.score - a.severity.score,
  );
  const cappedRegions = sortedRegions.slice(0, maxRegions);
  const capCount = mergedRegions.length - cappedRegions.length;
  if (capCount > 0) {
    result.removedCount += capCount;
    result.reasons.push(`Capped regions to top ${maxRegions} by severity (removed ${capCount} lower-priority regions)`);
  }

  result.filteredRegions = cappedRegions;
  return result;
}

/**
 * Checks if regions appear to be placeholder/generic data.
 * Returns true if regions show suspicious patterns.
 */
export function areRegionsPlaceholder(
  regions: RegionFinding[],
  imageWidth: number,
  imageHeight: number,
): boolean {
  if (regions.length === 0) {
    return false;
  }

  // Check if all regions are clustered in top-left corner
  const topLeftThreshold = Math.min(imageWidth, imageHeight) * 0.3;
  const allInTopLeft = regions.every(
    (r) => r.bounds.x < topLeftThreshold && r.bounds.y < topLeftThreshold,
  );

  if (allInTopLeft && regions.length >= 3) {
    return true;
  }

  // Check if all regions are duplicates (same bounds)
  const boundsSet = new Set(
    regions.map((r) => `${r.bounds.x},${r.bounds.y},${r.bounds.width},${r.bounds.height}`),
  );
  if (boundsSet.size === 1 && regions.length > 1) {
    return true;
  }

  return false;
}

