import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { AnalysisState, RegionFinding } from '../src/types';

interface RenderConfig {
  imagePath: string;
  statePath: string;
  outputPath: string;
}

const drawBoundingBoxes = (
  png: PNG,
  regions: RegionFinding[],
  color: [number, number, number],
) => {
  regions.forEach((region) => {
    const { x, y, width, height } = region.bounds;
    for (let i = x; i < x + width; i += 1) {
      setPixel(png, i, y, color);
      setPixel(png, i, y + height - 1, color);
    }
    for (let j = y; j < y + height; j += 1) {
      setPixel(png, x, j, color);
      setPixel(png, x + width - 1, j, color);
    }
  });
};

const setPixel = (png: PNG, x: number, y: number, [r, g, b]: number[]) => {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = 255;
};

const renderOverlay = async (config: RenderConfig): Promise<void> => {
  const { imagePath, statePath, outputPath } = config;
  const baseImage = PNG.sync.read(fs.readFileSync(imagePath));
  const state = JSON.parse(
    fs.readFileSync(statePath, 'utf8'),
  ) as AnalysisState;

  drawBoundingBoxes(baseImage, state.regions, [255, 0, 0]);

  fs.writeFileSync(outputPath, PNG.sync.write(baseImage));
  console.log(`Overlay written to ${outputPath}`);
};

const imagesDir = path.resolve(
  process.argv[2] ?? path.join('fixtures', 'images', 'batch'),
);
const artifactsDir = path.resolve(
  process.argv[3] ?? path.join('artifacts', 'tests'),
);
const stateDir = path.resolve(process.cwd(), 'artifacts/state');
if (!fs.existsSync(stateDir)) {
  fs.mkdirSync(stateDir, { recursive: true });
}
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

const files = fs
  .readdirSync(imagesDir)
  .filter((file) => file.endsWith('.png'))
  .slice(0, 5);

files.forEach((file, index) => {
  const imagePath = path.join(imagesDir, file);
  const statePath = path.join(stateDir, `${path.parse(file).name}.json`);
  if (!fs.existsSync(statePath)) {
    console.warn(`Missing analysis state for ${file}. Skipping.`);
    return;
  }
  const outputPath = path.join(
    artifactsDir,
    `${path.parse(file).name}-overlay.png`,
  );
  renderOverlay({ imagePath, statePath, outputPath }).catch((error) => {
    console.error(`Failed to render ${file}:`, error);
  });
});

