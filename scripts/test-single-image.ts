import path from 'path';
import { promises as fs } from 'fs';
import { config } from 'dotenv';
import { VisionClient } from '../src/utils/visionClient';
import { AnalysisMetadata } from '../src/types';
import { getImageDimensions } from '../src/utils/imageValidation';
import { calculateCoverageMetrics } from '../src/utils/coverageMetrics';

config();
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

const apiKey = process.env.OPENAI_API_KEY;
const TEST_IMAGE = path.resolve(
  process.cwd(),
  'fixtures/images/real/Screenshot 2025-11-29 163352.png',
);

async function main(): Promise<void> {
  if (!apiKey) {
    console.error(
      'OPENAI_API_KEY is not set. Add it to VS Code SecretStorage or .env.test.',
    );
    process.exit(1);
  }

  const metadata: AnalysisMetadata = {
    platform: 'Desktop Web',
    uiType: 'Dashboard',
    audience: 'Enterprise Users',
  };

  console.log('='.repeat(80));
  console.log('Testing Single Image Analysis');
  console.log('='.repeat(80));
  console.log(`Image: ${TEST_IMAGE}`);
  console.log(`Metadata: ${metadata.platform} / ${metadata.uiType} / ${metadata.audience}`);
  console.log();

  try {
    // Check if image exists
    await fs.access(TEST_IMAGE);
    const imageDims = await getImageDimensions(TEST_IMAGE);
    console.log(`Image dimensions: ${imageDims.width}x${imageDims.height}px`);
    console.log();

    // Run analysis
    const client = new VisionClient({ apiKey, model: 'gpt-4o' });
    console.log('Running Vision API analysis...');
    const payload = await client.analyse(TEST_IMAGE, metadata);

    console.log('✅ Analysis completed');
    console.log();

    // Display results
    console.log('Results:');
    console.log(`  Regions detected: ${payload.regions.length}`);
    console.log(`  Attention grid: ${payload.attentionGrid ? `${payload.attentionGrid.grid.width}x${payload.attentionGrid.grid.height}` : 'null'}`);
    console.log(`  Summary strengths: ${payload.summary?.strengths.length ?? 0}`);
    console.log(`  Summary weaknesses: ${payload.summary?.weaknesses.length ?? 0}`);
    console.log();

    // Show region breakdown
    if (payload.regions.length > 0) {
      console.log('Region breakdown:');
      const categoryCounts = new Map<string, number>();
      const hardSoftCounts = { hard: 0, soft: 0 };
      
      payload.regions.forEach((region) => {
        const cat = region.classification.category;
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
        if (region.issueType === 'hard') hardSoftCounts.hard++;
        else if (region.issueType === 'soft') hardSoftCounts.soft++;
      });

      console.log('  By category:');
      categoryCounts.forEach((count, cat) => {
        console.log(`    ${cat}: ${count}`);
      });
      console.log();
      console.log('  By issue type:');
      console.log(`    Hard: ${hardSoftCounts.hard}`);
      console.log(`    Soft: ${hardSoftCounts.soft}`);
      console.log();
    }

    // Calculate coverage metrics
    const metrics = calculateCoverageMetrics(
      {
        metadata,
        regions: payload.regions,
        attentionGrid: payload.attentionGrid,
        summary: payload.summary,
        warnings: [],
        agentFindings: {
          spacing: [],
          typography: [],
          contrast: [],
          interaction: [],
          navigation: [],
          designSystem: [],
        },
      },
      imageDims.width,
      imageDims.height,
    );

    console.log('Coverage Metrics:');
    console.log(`  Region coverage: ${metrics.regionCoverage}%`);
    console.log(`  Expected categories: ${metrics.expectedCategories.join(', ')}`);
    console.log(`  Missing categories: ${metrics.missingCategories.length > 0 ? metrics.missingCategories.join(', ') : 'None'}`);
    console.log();

    // Show top regions
    if (payload.regions.length > 0) {
      console.log('Top 5 regions (by severity):');
      const sortedRegions = [...payload.regions].sort(
        (a, b) => b.severity.score - a.severity.score,
      );
      sortedRegions.slice(0, 5).forEach((region, idx) => {
        console.log(`  ${idx + 1}. ${region.classification.category}/${region.classification.subcategory}`);
        console.log(`     Severity: ${region.severity.level} (${region.severity.score.toFixed(2)})`);
        console.log(`     Type: ${region.issueType || 'unclassified'}`);
        console.log(`     Bounds: (${region.bounds.x}, ${region.bounds.y}) ${region.bounds.width}x${region.bounds.height}`);
        console.log(`     Notes: ${region.notes[0] || 'N/A'}`);
        console.log();
      });
    }

    // Save results
    const stateDir = path.resolve(process.cwd(), 'artifacts/state');
    await fs.mkdir(stateDir, { recursive: true });
    const outputPath = path.join(stateDir, 'Screenshot 2025-11-29 163352.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(
        {
          metadata,
          regions: payload.regions,
          attentionGrid: payload.attentionGrid,
          summary: payload.summary,
          metrics,
        },
        null,
        2,
      ),
    );
    console.log(`📄 Results saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }
    process.exit(1);
  }
}

main();

