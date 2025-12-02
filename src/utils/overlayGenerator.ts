import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { PNG } from 'pngjs';
import { AnalysisState, RegionFinding } from '../types';

export async function generateOverlayImage(
  screenshotPath: string,
  state: AnalysisState,
  outputPath: string,
): Promise<void> {
  // Read base image
  const imageBuffer = await fs.readFile(screenshotPath);
  const baseImage = PNG.sync.read(imageBuffer);

  // Draw bounding boxes
  state.regions.forEach((region) => {
    drawBoundingBox(baseImage, region, [255, 0, 0]); // Red boxes
  });

  // Write output
  const outputBuffer = PNG.sync.write(baseImage);
  await fs.writeFile(outputPath, outputBuffer);
}

function drawBoundingBox(
  png: PNG,
  region: RegionFinding,
  color: [number, number, number],
): void {
  const { x, y, width, height } = region.bounds;
  
  // Draw top and bottom edges
  for (let i = x; i < x + width; i += 1) {
    setPixel(png, i, y, color);
    setPixel(png, i, y + height - 1, color);
  }
  
  // Draw left and right edges
  for (let j = y; j < y + height; j += 1) {
    setPixel(png, x, j, color);
    setPixel(png, x + width - 1, j, color);
  }
}

function setPixel(png: PNG, x: number, y: number, [r, g, b]: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = 255;
}

