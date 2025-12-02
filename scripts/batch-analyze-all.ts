import * as path from 'path';
import { promises as fs } from 'fs';
import { config } from 'dotenv';
import { VisionClient } from '../src/utils/visionClient';
import { getImageDimensions } from '../src/utils/imageValidation';
import { generateOverlayImage } from '../src/utils/overlayGenerator';
import { generateDescriptiveReport, formatReportAsMarkdown } from '../src/utils/reportGenerator';
import { analyzeOutputQuality, formatAnalysisReport } from './analyze-output-quality';
import { performVisualAccuracyCheck, formatVisualAccuracyReport } from './visual-accuracy-check';
import type { AnalysisMetadata } from '../src/types';
import { emptyAgentFindings } from '../src/types';

config();

const DEFAULT_METADATA: AnalysisMetadata = {
  platform: 'Desktop Web',
  uiType: 'Dashboard',
  audience: 'General Public',
};

interface BatchResult {
  imageName: string;
  sourcePath: string;
  success: boolean;
  analysisStatePath?: string;
  overlayPath?: string;
  reportPath?: string;
  qualityReportPath?: string;
  visualAccuracyPath?: string;
  errors: string[];
  warnings: string[];
}

async function analyzeImage(
  imagePath: string,
  outputDir: string,
  apiKey: string,
): Promise<BatchResult> {
  const imageName = path.basename(imagePath, path.extname(imagePath));
  const result: BatchResult = {
    imageName,
    sourcePath: imagePath,
    success: false,
    errors: [],
    warnings: [],
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📸 Analyzing: ${imageName}`);
  console.log('='.repeat(80));

  try {
    // Step 1: Run Vision analysis
    console.log('\n1️⃣ Running Vision API analysis...');
    const visionClient = new VisionClient({ apiKey, model: 'gpt-4o' });
    const visionResult = await visionClient.analyse(imagePath, DEFAULT_METADATA);

    // Get image dimensions
    const imageDims = await getImageDimensions(imagePath);
    console.log(`   ✓ Image dimensions: ${imageDims.width}x${imageDims.height}`);
    console.log(`   ✓ Regions detected: ${visionResult.regions.length}`);

    // Save analysis state
    const analysisStatePath = path.join(outputDir, 'state', `${imageName}.json`);
    await fs.mkdir(path.dirname(analysisStatePath), { recursive: true });
    await fs.writeFile(
      analysisStatePath,
      JSON.stringify(
        {
          metadata: DEFAULT_METADATA,
          regions: visionResult.regions,
          attentionGrid: visionResult.attentionGrid,
          summary: visionResult.summary,
          lastScreenshotUri: imagePath,
          warnings: [],
        },
        null,
        2,
      ),
    );
    result.analysisStatePath = analysisStatePath;
    console.log(`   ✓ Analysis state saved: ${analysisStatePath}`);

    // Step 2: Generate overlay
    console.log('\n2️⃣ Generating overlay image...');
    const overlayPath = path.join(outputDir, `${imageName}-overlay.png`);
    const analysisState = {
      metadata: DEFAULT_METADATA,
      regions: visionResult.regions,
      attentionGrid: visionResult.attentionGrid,
      summary: visionResult.summary,
      lastScreenshotUri: imagePath,
      warnings: [],
      agentFindings: emptyAgentFindings(),
    };
    await generateOverlayImage(imagePath, analysisState, overlayPath);
    result.overlayPath = overlayPath;
    console.log(`   ✓ Overlay saved: ${overlayPath}`);

    // Step 3: Generate descriptive report
    console.log('\n3️⃣ Generating markdown report...');
    const report = generateDescriptiveReport(analysisState);
    const reportPath = path.join(outputDir, `REPORT_${imageName}.md`);
    await fs.writeFile(reportPath, formatReportAsMarkdown(report));
    result.reportPath = reportPath;
    console.log(`   ✓ Report saved: ${reportPath}`);

    // Step 4: Quality analysis
    console.log('\n4️⃣ Running quality analysis...');
    try {
      const qualityAnalysis = await analyzeOutputQuality(
        imagePath,
        analysisStatePath,
        overlayPath,
      );
      const qualityReport = formatAnalysisReport(qualityAnalysis);
      const qualityReportPath = path.join(outputDir, `QUALITY_${imageName}.md`);
      await fs.writeFile(qualityReportPath, qualityReport);
      result.qualityReportPath = qualityReportPath;
      console.log(`   ✓ Quality analysis saved: ${qualityReportPath}`);
    } catch (error) {
      result.warnings.push(`Quality analysis failed: ${error}`);
      console.log(`   ⚠ Quality analysis failed: ${error}`);
    }

    // Step 5: Visual accuracy check
    console.log('\n5️⃣ Running visual accuracy check...');
    try {
      const visualCheck = await performVisualAccuracyCheck(
        imagePath,
        overlayPath,
        analysisStatePath,
      );
      const visualReport = formatVisualAccuracyReport(visualCheck);
      const visualAccuracyPath = path.join(outputDir, `VISUAL_${imageName}.md`);
      await fs.writeFile(visualAccuracyPath, visualReport);
      result.visualAccuracyPath = visualAccuracyPath;
      console.log(`   ✓ Visual accuracy check saved: ${visualAccuracyPath}`);
    } catch (error) {
      result.warnings.push(`Visual accuracy check failed: ${error}`);
      console.log(`   ⚠ Visual accuracy check failed: ${error}`);
    }

    result.success = true;
    console.log(`\n✅ Analysis complete for ${imageName}`);
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.error(`\n❌ Analysis failed for ${imageName}:`, error);
  }

  return result;
}

async function main(): Promise<void> {
  const imageDir = path.resolve('fixtures/images/real');
  const outputDir = path.resolve('artifacts/tests');

  // Get API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  // Ensure output directories exist
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(path.join(outputDir, 'state'), { recursive: true });

  // Find all images
  const files = await fs.readdir(imageDir);
  const imageFiles = files.filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
  const imagePaths = imageFiles.map((f) => path.join(imageDir, f));

  console.log(`\n📸 Found ${imagePaths.length} image(s) to analyze`);
  console.log(`📁 Source directory: ${imageDir}`);
  console.log(`📁 Output directory: ${outputDir}\n`);

  const results: BatchResult[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    console.log(`\n[${i + 1}/${imagePaths.length}] Processing: ${path.basename(imagePath)}`);
    const result = await analyzeImage(imagePath, outputDir, apiKey);
    results.push(result);

    // Small delay between API calls to avoid rate limits
    if (i < imagePaths.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next image...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Generate summary report
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 Generating Summary Report');
  console.log('='.repeat(80));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  const summary = `# Batch Analysis Summary

**Generated**: ${new Date().toISOString()}

## Overview

- **Total Images**: ${results.length}
- **✅ Successful**: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)
- **❌ Failed**: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)

---

## Results by Image

${results
  .map(
    (r) => `### ${r.imageName}

**Status**: ${r.success ? '✅ SUCCESS' : '❌ FAILED'}

- **Source**: \`${r.sourcePath}\`
- **Analysis State**: ${r.analysisStatePath ? `\`${r.analysisStatePath}\`` : 'N/A'}
- **Overlay**: ${r.overlayPath ? `\`${r.overlayPath}\`` : 'N/A'}
- **Report**: ${r.reportPath ? `\`${r.reportPath}\`` : 'N/A'}
- **Quality Analysis**: ${r.qualityReportPath ? `\`${r.qualityReportPath}\`` : 'N/A'}
- **Visual Accuracy**: ${r.visualAccuracyPath ? `\`${r.visualAccuracyPath}\`` : 'N/A'}

${r.errors.length > 0 ? `**Errors**:\n${r.errors.map((e) => `- ${e}`).join('\n')}` : ''}
${r.warnings.length > 0 ? `**Warnings**:\n${r.warnings.map((w) => `- ${w}`).join('\n')}` : ''}
`,
  )
  .join('\n')}

---

## Overall Assessment

${successful === results.length ? '✅ All analyses completed successfully' : `⚠️ ${failed} analysis(ies) failed`}

---

*Generated by AgentUX Batch Analyzer*
`;

  const summaryPath = path.join(outputDir, 'BATCH_ANALYSIS_SUMMARY.md');
  await fs.writeFile(summaryPath, summary);

  // Generate assessment view for visual verification
  console.log(`\n${'='.repeat(80)}`);
  console.log('📋 Generating Assessment View');
  console.log('='.repeat(80));
  try {
    const { generateAssessmentView } = await import('./generate-test-assessment-view');
    await generateAssessmentView(outputDir);
  } catch (error) {
    console.warn(`⚠️  Failed to generate assessment view: ${error}`);
  }

  console.log(`\n✅ Summary saved to: ${summaryPath}`);
  console.log(`\n📊 Results: ${successful}/${results.length} successful`);
  if (failed > 0) {
    console.log(`\n❌ Failed images:`);
    results.filter((r) => !r.success).forEach((r) => {
      console.log(`   - ${r.imageName}: ${r.errors.join(', ')}`);
    });
  }
  
  console.log(`\n💡 Next step: Open artifacts/tests/TEST_ASSESSMENT_VIEW.html in a browser`);
  console.log(`   to visually verify that overlays accurately represent source images`);
  console.log(`\n   Or run: npx ts-node scripts/open-assessment-view.ts`);
  console.log(`   Or start local server: cd artifacts/tests && python -m http.server 8000`);
  console.log(`   Then navigate to: http://localhost:8000/TEST_ASSESSMENT_VIEW.html`);
}

main().catch(console.error);

