import path from 'path';
import { promises as fs } from 'fs';
import { AnalysisState } from '../src/types';

const OVERLAY_PATH = path.resolve(
  process.cwd(),
  'artifacts/tests/Screenshot 2025-11-29 163352-overlay.png',
);
const STATE_PATH = path.resolve(
  process.cwd(),
  'artifacts/state/Screenshot 2025-11-29 163352.json',
);

async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('Analysis Output Review');
  console.log('='.repeat(80));
  console.log();

  // Check if files exist
  try {
    await fs.access(OVERLAY_PATH);
    console.log(`✅ Overlay image: ${OVERLAY_PATH}`);
  } catch {
    console.log(`❌ Overlay image not found: ${OVERLAY_PATH}`);
    return;
  }

  try {
    await fs.access(STATE_PATH);
    console.log(`✅ Analysis state: ${STATE_PATH}`);
  } catch {
    console.log(`❌ Analysis state not found: ${STATE_PATH}`);
    return;
  }

  // Load analysis state
  const state = JSON.parse(await fs.readFile(STATE_PATH, 'utf8')) as AnalysisState;

  console.log();
  console.log('Analysis Summary:');
  console.log(`  Image: Screenshot 2025-11-29 163352.png`);
  console.log(`  Platform: ${state.metadata?.platform}`);
  console.log(`  UI Type: ${state.metadata?.uiType}`);
  console.log(`  Audience: ${state.metadata?.audience}`);
  console.log();

  console.log(`Regions Detected: ${state.regions.length}`);
  console.log();

  if (state.regions.length > 0) {
    console.log('Region Details:');
    state.regions.forEach((region, idx) => {
      console.log(`\n  Region ${idx + 1}:`);
      console.log(`    Category: ${region.classification.category} / ${region.classification.subcategory}`);
      console.log(`    Severity: ${region.severity.level} (score: ${region.severity.score.toFixed(2)})`);
      console.log(`    Issue Type: ${region.issueType || 'unclassified'}`);
      console.log(`    Bounds: (${region.bounds.x}, ${region.bounds.y}) ${region.bounds.width}x${region.bounds.height}px`);
      console.log(`    Area: ${(region.bounds.width * region.bounds.height).toLocaleString()}px²`);
      console.log(`    Notes: ${region.notes.join('; ')}`);
    });
  }

  console.log();
  console.log('Coverage Metrics:');
  if (state.metrics) {
    console.log(`  Region Coverage: ${state.metrics.regionCoverage}%`);
    console.log(`  Expected Categories: ${state.metrics.expectedCategories.join(', ')}`);
    console.log(`  Missing Categories: ${state.metrics.missingCategories.length > 0 ? state.metrics.missingCategories.join(', ') : 'None'}`);
    console.log();
    console.log('  Category Coverage:');
    Object.entries(state.metrics.categoryCoverage).forEach(([cat, covered]) => {
      console.log(`    ${cat}: ${covered ? '✓' : '✗'}`);
    });
  }

  console.log();
  console.log('Attention Grid:');
  if (state.attentionGrid) {
    console.log(`  Dimensions: ${state.attentionGrid.grid.width}x${state.attentionGrid.grid.height}`);
    console.log(`  Sample values:`);
    state.attentionGrid.grid.values.slice(0, 2).forEach((row, idx) => {
      console.log(`    Row ${idx}: [${row.map(v => v.toFixed(2)).join(', ')}]`);
    });
  }

  console.log();
  console.log('Summary:');
  if (state.summary) {
    console.log(`  Strengths: ${state.summary.strengths.length}`);
    state.summary.strengths.forEach((s) => console.log(`    - ${s}`));
    console.log(`  Weaknesses: ${state.summary.weaknesses.length}`);
    state.summary.weaknesses.forEach((w) => console.log(`    - ${w}`));
  }

  console.log();
  console.log('='.repeat(80));
  console.log(`📸 Overlay image saved at: ${OVERLAY_PATH}`);
  console.log('Open this file to visually review the detected regions.');
  console.log('='.repeat(80));
}

main().catch(console.error);

