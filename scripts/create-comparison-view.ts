import * as path from 'path';
import { promises as fs } from 'fs';
import { PNG } from 'pngjs';

/**
 * Creates side-by-side comparison image: Source | Overlay
 * Useful for visual verification of region accuracy
 */

interface ComparisonConfig {
  sourceImagePath: string;
  overlayImagePath: string;
  outputPath: string;
  labelSource?: string;
  labelOverlay?: string;
}

async function createComparisonImage(config: ComparisonConfig): Promise<void> {
  const { sourceImagePath, overlayImagePath, outputPath, labelSource = 'Source', labelOverlay = 'Overlay' } = config;

  // Read both images
  const sourceBuffer = await fs.readFile(sourceImagePath);
  const overlayBuffer = await fs.readFile(overlayImagePath);
  
  const sourceImage = PNG.sync.read(sourceBuffer);
  const overlayImage = PNG.sync.read(overlayBuffer);

  // Verify dimensions match
  if (sourceImage.width !== overlayImage.width || sourceImage.height !== overlayImage.height) {
    throw new Error(
      `Image dimensions don't match: Source ${sourceImage.width}x${sourceImage.height} vs Overlay ${overlayImage.width}x${overlayImage.height}`,
    );
  }

  const width = sourceImage.width;
  const height = sourceImage.height;
  const padding = 20;
  const labelHeight = 30;
  const totalWidth = width * 2 + padding * 3;
  const totalHeight = height + padding * 2 + labelHeight;

  // Create comparison image
  const comparison = new PNG({ width: totalWidth, height: totalHeight });

  // Fill background
  for (let y = 0; y < totalHeight; y += 1) {
    for (let x = 0; x < totalWidth; x += 1) {
      const idx = (totalWidth * y + x) << 2;
      comparison.data[idx] = 240; // Light gray background
      comparison.data[idx + 1] = 240;
      comparison.data[idx + 2] = 240;
      comparison.data[idx + 3] = 255;
    }
  }

  // Copy source image (left)
  const sourceX = padding;
  const sourceY = padding + labelHeight;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcIdx = (width * y + x) << 2;
      const dstIdx = (totalWidth * (sourceY + y) + (sourceX + x)) << 2;
      comparison.data[dstIdx] = sourceImage.data[srcIdx];
      comparison.data[dstIdx + 1] = sourceImage.data[srcIdx + 1];
      comparison.data[dstIdx + 2] = sourceImage.data[srcIdx + 2];
      comparison.data[dstIdx + 3] = sourceImage.data[srcIdx + 3];
    }
  }

  // Copy overlay image (right)
  const overlayX = width + padding * 2;
  const overlayY = padding + labelHeight;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const srcIdx = (width * y + x) << 2;
      const dstIdx = (totalWidth * (overlayY + y) + (overlayX + x)) << 2;
      comparison.data[dstIdx] = overlayImage.data[srcIdx];
      comparison.data[dstIdx + 1] = overlayImage.data[srcIdx + 1];
      comparison.data[dstIdx + 2] = overlayImage.data[srcIdx + 2];
      comparison.data[dstIdx + 3] = overlayImage.data[srcIdx + 3];
    }
  }

  // Draw labels (simple text rendering - just draw rectangles with text area)
  // For now, we'll leave labels as visual markers in the padding area
  // Full text rendering would require a font library

  // Write output
  const outputBuffer = PNG.sync.write(comparison);
  await fs.writeFile(outputPath, outputBuffer);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: ts-node create-comparison-view.ts <source-image> <overlay-image> <output-path> [label-source] [label-overlay]');
    process.exit(1);
  }

  const sourceImagePath = path.resolve(args[0]);
  const overlayImagePath = path.resolve(args[1]);
  const outputPath = path.resolve(args[2]);
  const labelSource = args[3] || 'Source';
  const labelOverlay = args[4] || 'Overlay';

  try {
    await createComparisonImage({
      sourceImagePath,
      overlayImagePath,
      outputPath,
      labelSource,
      labelOverlay,
    });
    console.log(`✅ Comparison image created: ${outputPath}`);
  } catch (error) {
    console.error('Failed to create comparison image:', error);
    process.exit(1);
  }
}

main();

