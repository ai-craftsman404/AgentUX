import { promises as fs } from 'fs';
import { PNG } from 'pngjs';

export interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Detects red bounding boxes in an overlay image.
 * Looks for red pixels (RGB: 255, 0, 0) and groups them into boxes.
 */
export async function detectBoundingBoxesInOverlay(
  overlayPath: string,
): Promise<DetectedBox[]> {
  try {
    const buffer = await fs.readFile(overlayPath);
    const image = PNG.sync.read(buffer);

    // Find red pixels (RGB values close to 255, 0, 0)
    const redPixels = new Set<string>();

    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        const idx = (image.width * y + x) << 2;
        const r = image.data[idx];
        const g = image.data[idx + 1];
        const b = image.data[idx + 2];

        // Check if pixel is red (within tolerance for anti-aliasing)
        if (r > 200 && g < 50 && b < 50) {
          redPixels.add(`${x},${y}`);
        }
      }
    }

    if (redPixels.size === 0) {
      return [];
    }

    // Group red pixels into bounding boxes
    // Simple approach: find contiguous regions
    const boxes: DetectedBox[] = [];
    const visited = new Set<string>();

    for (const pixelKey of redPixels) {
      if (visited.has(pixelKey)) continue;

      const [px, py] = pixelKey.split(',').map(Number);
      const region = findContiguousRegion(px, py, redPixels, visited);

      if (region.length > 0) {
        const bounds = calculateBounds(region);
        // Only add boxes that are likely actual bounding boxes (not noise)
        // Bounding boxes should have reasonable size (at least 5x5 to catch thin boxes)
        // Very thin boxes (e.g., height=10) are valid and should be detected
        if (bounds.width >= 5 && bounds.height >= 5) {
          boxes.push(bounds);
        }
      }
    }

    // Merge overlapping boxes (likely same box detected multiple times)
    // Use lower IoU threshold (0.3) to avoid merging separate boxes that are close together
    return mergeOverlappingBoxes(boxes, 0.3);
  } catch (error) {
    return [];
  }
}

/**
 * Finds all pixels in a contiguous region starting from (x, y).
 */
function findContiguousRegion(
  startX: number,
  startY: number,
  redPixels: Set<string>,
  visited: Set<string>,
): Array<{ x: number; y: number }> {
  const region: Array<{ x: number; y: number }> = [];
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    const key = `${x},${y}`;

    if (visited.has(key) || !redPixels.has(key)) {
      continue;
    }

    visited.add(key);
    region.push({ x, y });

    // Check 4-connected neighbors
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(neighborKey) && redPixels.has(neighborKey)) {
        queue.push(neighbor);
      }
    }
  }

  return region;
}

/**
 * Calculates bounding box for a set of pixels.
 */
function calculateBounds(pixels: Array<{ x: number; y: number }>): DetectedBox {
  if (pixels.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = pixels.map((p) => p.x);
  const ys = pixels.map((p) => p.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Merges overlapping boxes (IoU > threshold).
 */
function mergeOverlappingBoxes(boxes: DetectedBox[], iouThreshold: number = 0.5): DetectedBox[] {
  if (boxes.length <= 1) {
    return boxes;
  }

  const merged: DetectedBox[] = [];
  const used = new Set<number>();

  for (let i = 0; i < boxes.length; i++) {
    if (used.has(i)) continue;

    let currentBox = boxes[i];
    let mergedAny = false;

    for (let j = i + 1; j < boxes.length; j++) {
      if (used.has(j)) continue;

      const iou = calculateIoU(currentBox, boxes[j]);
      if (iou > iouThreshold) {
        // Merge boxes
        currentBox = {
          x: Math.min(currentBox.x, boxes[j].x),
          y: Math.min(currentBox.y, boxes[j].y),
          width:
            Math.max(currentBox.x + currentBox.width, boxes[j].x + boxes[j].width) -
            Math.min(currentBox.x, boxes[j].x),
          height:
            Math.max(currentBox.y + currentBox.height, boxes[j].y + boxes[j].height) -
            Math.min(currentBox.y, boxes[j].y),
        };
        used.add(j);
        mergedAny = true;
      }
    }

    merged.push(currentBox);
    if (mergedAny) {
      used.add(i);
    }
  }

  return merged;
}

/**
 * Calculates Intersection over Union for two boxes.
 */
function calculateIoU(box1: DetectedBox, box2: DetectedBox): number {
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
 * Verifies that overlay contains all regions from JSON state.
 */
export async function verifyOverlayMatchesJSON(
  overlayPath: string,
  jsonRegions: Array<{ bounds: { x: number; y: number; width: number; height: number } }>,
  tolerance: number = 5,
): Promise<{
  match: boolean;
  issues: string[];
  detectedBoxCount: number;
  jsonRegionCount: number;
}> {
  const detectedBoxes = await detectBoundingBoxesInOverlay(overlayPath);
  const issues: string[] = [];

  // Check count match
  if (detectedBoxes.length !== jsonRegions.length) {
    issues.push(
      `Region count mismatch: JSON has ${jsonRegions.length} regions, overlay has ${detectedBoxes.length} boxes`,
    );
  }

  // Check each JSON region exists in overlay (within tolerance)
  for (let i = 0; i < jsonRegions.length; i++) {
    const jsonRegion = jsonRegions[i];
    const found = detectedBoxes.some(
      (box) =>
        Math.abs(box.x - jsonRegion.bounds.x) <= tolerance &&
        Math.abs(box.y - jsonRegion.bounds.y) <= tolerance &&
        Math.abs(box.width - jsonRegion.bounds.width) <= tolerance &&
        Math.abs(box.height - jsonRegion.bounds.height) <= tolerance,
    );

    if (!found) {
      issues.push(
        `Region ${i} missing from overlay: (${jsonRegion.bounds.x}, ${jsonRegion.bounds.y}) ${jsonRegion.bounds.width}x${jsonRegion.bounds.height}`,
      );
    }
  }

  return {
    match: issues.length === 0,
    issues,
    detectedBoxCount: detectedBoxes.length,
    jsonRegionCount: jsonRegions.length,
  };
}

