import * as path from 'path';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Opens the assessment view HTML file in the default browser.
 * This allows visual verification of overlay images against source images.
 */

async function openAssessmentView(testDir: string = 'artifacts/tests'): Promise<void> {
  const testDirPath = path.resolve(testDir);
  const htmlPath = path.join(testDirPath, 'TEST_ASSESSMENT_VIEW.html');

  // Check if file exists
  try {
    await fs.access(htmlPath);
  } catch {
    console.error(`❌ Assessment view not found: ${htmlPath}`);
    console.log(`💡 Run batch analysis first: npx ts-node scripts/batch-analyze-all.ts`);
    process.exit(1);
  }

  // Get absolute path for file:// URL
  const absolutePath = path.resolve(htmlPath);
  const fileUrl = `file:///${absolutePath.replace(/\\/g, '/')}`;

  console.log(`📋 Opening assessment view...`);
  console.log(`   File: ${htmlPath}`);
  console.log(`   URL: ${fileUrl}`);

  // Open in default browser (cross-platform)
  const platform = process.platform;
  let command: string;

  if (platform === 'win32') {
    // Windows
    command = `start "" "${fileUrl}"`;
  } else if (platform === 'darwin') {
    // macOS
    command = `open "${fileUrl}"`;
  } else {
    // Linux
    command = `xdg-open "${fileUrl}"`;
  }

  try {
    await execAsync(command);
    console.log(`✅ Assessment view opened in browser`);
    console.log(`\n💡 Use the assessment checklist to verify:`);
    console.log(`   ✅ Output is valid`);
    console.log(`   🎯 Output is representative (boxes align with elements)`);
    console.log(`   📋 Analysis is complete`);
    console.log(`   ✨ Classification is accurate`);
  } catch (error) {
    console.error(`❌ Failed to open browser: ${error}`);
    console.log(`\n💡 Manually open: ${fileUrl}`);
  }
}

if (require.main === module) {
  openAssessmentView().catch(console.error);
}

export { openAssessmentView };

