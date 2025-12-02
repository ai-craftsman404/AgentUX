import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const width = 960;
const height = 600;
const outputPath = path.resolve(
  process.cwd(),
  'fixtures/images/sample-dashboard.png',
);

const colors = {
  background: [242, 244, 247],
  header: [58, 68, 98],
  sidebar: [32, 41, 68],
  card: [255, 255, 255],
  accent: [90, 110, 250],
  subtle: [210, 215, 230],
};

const png = new PNG({ width, height });

const setPixel = (x: number, y: number, [r, g, b]: number[], a = 255) => {
  const idx = (width * y + x) << 2;
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
};

const fillRect = (
  startX: number,
  startY: number,
  w: number,
  h: number,
  color: number[],
) => {
  for (let y = startY; y < startY + h; y += 1) {
    for (let x = startX; x < startX + w; x += 1) {
      setPixel(x, y, color);
    }
  }
};

const drawLayout = (): void => {
  fillRect(0, 0, width, height, colors.background);
  fillRect(0, 0, width, 80, colors.header);
  fillRect(0, 80, 200, height - 80, colors.sidebar);

  const cardWidth = 220;
  const cardHeight = 130;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const x = 220 + col * (cardWidth + 20);
      const y = 120 + row * (cardHeight + 20);
      fillRect(x, y, cardWidth, cardHeight, colors.card);
      fillRect(x + 16, y + 16, 80, 12, colors.accent);
      fillRect(x + 16, y + 40, cardWidth - 32, 12, colors.subtle);
      fillRect(x + 16, y + 60, cardWidth - 32, 12, colors.subtle);
    }
  }

  fillRect(220, 360, width - 260, 180, colors.card);
  fillRect(240, 380, width - 300, 20, colors.accent);
  fillRect(240, 420, width - 300, 12, colors.subtle);
  fillRect(240, 440, width - 300, 12, colors.subtle);
  fillRect(240, 460, width - 300, 12, colors.subtle);
};

drawLayout();

png.pack().pipe(fs.createWriteStream(outputPath)).on('finish', () => {
  console.log(`Sample dashboard image generated at ${outputPath}`);
});

