import { verifyOverlayMatchesJSON } from '../src/utils/overlayBoxDetection';
import { promises as fs } from 'fs';
import * as path from 'path';

async function main() {
  const statePath = path.resolve('artifacts/tests/state/Screenshot 2025-12-01 135428.json');
  const overlayPath = path.resolve('artifacts/tests/Screenshot 2025-12-01 135428-overlay.png');

  const state = JSON.parse(await fs.readFile(statePath, 'utf-8'));
  const result = await verifyOverlayMatchesJSON(overlayPath, state.regions);

  console.log('\n📊 Overlay Detection Test Results:\n');
  console.log(`Detected boxes: ${result.detectedBoxCount}`);
  console.log(`JSON regions: ${result.jsonRegionCount}`);
  console.log(`Match: ${result.match ? '✅ YES' : '❌ NO'}\n`);

  if (result.issues.length > 0) {
    console.log('Issues found:');
    result.issues.forEach((issue) => console.log(`  - ${issue}`));
  } else {
    console.log('✅ No issues - all regions detected!');
  }
}

main().catch(console.error);

