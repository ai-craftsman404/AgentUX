import { PNG } from 'pngjs';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface NormalizedImage {
  path: string;
  originalWidth: number;
  originalHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  scaleFactor: number;
}

const MAX_WIDTH = 1200;
const TEMP_DIR = path.join(os.tmpdir(), 'agentux-normalized');

/**
 * Normalizes an image to a maximum width while maintaining aspect ratio.
 * Creates a temporary normalized image file.
 */
export async function normalizeImage(
  imagePath: string,
  maxWidth: number = MAX_WIDTH,
): Promise<NormalizedImage> {
  // Ensure temp directory exists
  await fs.mkdir(TEMP_DIR, { recursive: true }).catch(() => {
    // Directory might already exist, ignore error
  });

  // Read original image
  const buffer = await fs.readFile(imagePath);
  const originalImage = PNG.sync.read(buffer);

  const originalWidth = originalImage.width;
  const originalHeight = originalImage.height;

  // Calculate normalized dimensions
  let normalizedWidth = originalWidth;
  let normalizedHeight = originalHeight;
  let scaleFactor = 1.0;

  if (originalWidth > maxWidth) {
    scaleFactor = maxWidth / originalWidth;
    normalizedWidth = maxWidth;
    normalizedHeight = Math.round(originalHeight * scaleFactor);
  }

  // If no scaling needed, return original path info
  if (scaleFactor === 1.0) {
    return {
      path: imagePath,
      originalWidth,
      originalHeight,
      normalizedWidth,
      normalizedHeight,
      scaleFactor,
    };
  }

  // Create normalized image
  const normalizedImage = new PNG({
    width: normalizedWidth,
    height: normalizedHeight,
  });

  // Scale image using nearest-neighbor (simple but fast)
  // For better quality, could use bilinear interpolation
  for (let y = 0; y < normalizedHeight; y += 1) {
    for (let x = 0; x < normalizedWidth; x += 1) {
      const srcX = Math.floor(x / scaleFactor);
      const srcY = Math.floor(y / scaleFactor);
      const srcIdx = (originalWidth * srcY + srcX) << 2;
      const dstIdx = (normalizedWidth * y + x) << 2;

      normalizedImage.data[dstIdx] = originalImage.data[srcIdx];
      normalizedImage.data[dstIdx + 1] = originalImage.data[srcIdx + 1];
      normalizedImage.data[dstIdx + 2] = originalImage.data[srcIdx + 2];
      normalizedImage.data[dstIdx + 3] = originalImage.data[srcIdx + 3];
    }
  }

  // Save normalized image to temp location
  const filename = path.basename(imagePath, path.extname(imagePath));
  const tempPath = path.join(TEMP_DIR, `${filename}-normalized-${Date.now()}.png`);
  const normalizedBuffer = PNG.sync.write(normalizedImage);
  await fs.writeFile(tempPath, normalizedBuffer);

  return {
    path: tempPath,
    originalWidth,
    originalHeight,
    normalizedWidth,
    normalizedHeight,
    scaleFactor,
  };
}

/**
 * Cleans up temporary normalized images.
 * Should be called after analysis is complete.
 */
export async function cleanupNormalizedImage(normalizedPath: string): Promise<void> {
  // Only delete if it's in temp directory
  if (normalizedPath.startsWith(TEMP_DIR)) {
    try {
      await fs.unlink(normalizedPath);
    } catch {
      // File might already be deleted, ignore error
    }
  }
}

/**
 * Scales region bounds from normalized image back to original image coordinates.
 */
export function scaleBoundsToOriginal(
  bounds: { x: number; y: number; width: number; height: number },
  scaleFactor: number,
): { x: number; y: number; width: number; height: number } {
  if (scaleFactor === 1.0) {
    return bounds;
  }

  return {
    x: Math.round(bounds.x / scaleFactor),
    y: Math.round(bounds.y / scaleFactor),
    width: Math.round(bounds.width / scaleFactor),
    height: Math.round(bounds.height / scaleFactor),
  };
}

