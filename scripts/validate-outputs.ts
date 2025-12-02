import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { AnalysisState } from '../src/types';

interface ValidationResult {
  filename: string;
  hasRegions: boolean;
  regionCount: number;
  invalidRegions: number;
  duplicateRegions: number;
  regionsWithinBounds: boolean;
  imageDimensions: { width: number; height: number };
  overlayExists: boolean;
  overlaySize: number;
  issues: string[];
}

const validateRegions = (state: AnalysisState, imageWidth: number, imageHeight: number): ValidationResult['issues'] => {
  const issues: string[] = [];
  const seenBounds = new Set<string>();

  state.regions.forEach((region, idx) => {
    const { x, y, width, height } = region.bounds;
    const boundsKey = `${x},${y},${width},${height}`;

    // Check for duplicates
    if (seenBounds.has(boundsKey)) {
      issues.push(`Region ${idx}: Duplicate bounds (${boundsKey})`);
    }
    seenBounds.add(boundsKey);

    // Check bounds validity
    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      issues.push(`Region ${idx}: Invalid bounds (x=${x}, y=${y}, w=${width}, h=${height})`);
    }

    // Check if region is within image bounds
    if (x + width > imageWidth || y + height > imageHeight) {
      issues.push(
        `Region ${idx}: Out of bounds (x=${x}, y=${y}, w=${width}, h=${height}) vs image (${imageWidth}x${imageHeight})`,
      );
    }

    // Check for suspiciously large regions (likely fallback/placeholder)
    const area = width * height;
    const imageArea = imageWidth * imageHeight;
    if (area > imageArea * 0.9) {
      issues.push(`Region ${idx}: Suspiciously large region (${Math.round((area / imageArea) * 100)}% of image)`);
    }

    // Check for suspiciously small regions
    if (area < 100) {
      issues.push(`Region ${idx}: Very small region (${area}px²)`);
    }
  });

  return issues;
};

const analyzeOutput = (imagePath: string, statePath: string, overlayPath: string): ValidationResult => {
  const filename = path.basename(imagePath);
  const result: ValidationResult = {
    filename,
    hasRegions: false,
    regionCount: 0,
    invalidRegions: 0,
    duplicateRegions: 0,
    regionsWithinBounds: true,
    imageDimensions: { width: 0, height: 0 },
    overlayExists: false,
    overlaySize: 0,
    issues: [],
  };

  // Check overlay exists
  if (fs.existsSync(overlayPath)) {
    result.overlayExists = true;
    result.overlaySize = fs.statSync(overlayPath).size;
  } else {
    result.issues.push('Overlay file missing');
  }

  // Load image dimensions
  if (fs.existsSync(imagePath)) {
    const image = PNG.sync.read(fs.readFileSync(imagePath));
    result.imageDimensions = { width: image.width, height: image.height };
  } else {
    result.issues.push('Original image file missing');
    return result;
  }

  // Load and validate state
  if (!fs.existsSync(statePath)) {
    result.issues.push('State JSON file missing');
    return result;
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as AnalysisState;
  result.hasRegions = state.regions.length > 0;
  result.regionCount = state.regions.length;

  // Validate regions
  const validationIssues = validateRegions(state, result.imageDimensions.width, result.imageDimensions.height);
  result.issues.push(...validationIssues);

  result.invalidRegions = validationIssues.filter((issue) => issue.includes('Invalid bounds')).length;
  result.duplicateRegions = validationIssues.filter((issue) => issue.includes('Duplicate')).length;
  result.regionsWithinBounds = !validationIssues.some((issue) => issue.includes('Out of bounds'));

  // Check attention grid
  if (!state.attentionGrid) {
    result.issues.push('Missing attention grid');
  } else if (state.attentionGrid.grid) {
    const { width, height, values } = state.attentionGrid.grid;
    if (width <= 0 || height <= 0) {
      result.issues.push(`Invalid attention grid dimensions (${width}x${height})`);
    }
    if (!values || values.length !== height) {
      result.issues.push(`Attention grid values array length mismatch (expected ${height}, got ${values.length})`);
    }
  }

  // Check summary
  if (!state.summary) {
    result.issues.push('Missing summary');
  } else {
    if (state.summary.weaknesses?.some((w) => w.toLowerCase().includes('unable to analyse'))) {
      result.issues.push('Analysis failed - Vision returned fallback/error state');
    }
  }

  return result;
};

async function main(): Promise<void> {
  const imagesDir = path.resolve(process.cwd(), 'fixtures/images/real');
  const stateDir = path.resolve(process.cwd(), 'artifacts/state');
  const overlayDir = path.resolve(process.cwd(), 'artifacts/tests');

  const imageFiles = fs
    .readdirSync(imagesDir)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .slice(0, 5);

  console.log('='.repeat(80));
  console.log('VALIDATION REPORT: Vision Analysis Outputs');
  console.log('='.repeat(80));
  console.log();

  const results: ValidationResult[] = [];

  for (const file of imageFiles) {
    const imagePath = path.join(imagesDir, file);
    const statePath = path.join(stateDir, `${path.parse(file).name}.json`);
    const overlayPath = path.join(overlayDir, `${path.parse(file).name}-overlay.png`);

    const result = analyzeOutput(imagePath, statePath, overlayPath);
    results.push(result);

    console.log(`📸 ${result.filename}`);
    console.log(`   Image: ${result.imageDimensions.width}x${result.imageDimensions.height}px`);
    console.log(`   Regions: ${result.regionCount} detected`);
    console.log(`   Overlay: ${result.overlayExists ? `✓ ${(result.overlaySize / 1024).toFixed(1)}KB` : '✗ MISSING'}`);

    if (result.issues.length > 0) {
      console.log(`   ⚠️  Issues (${result.issues.length}):`);
      result.issues.forEach((issue) => console.log(`      - ${issue}`));
    } else {
      console.log(`   ✓ No issues detected`);
    }
    console.log();
  }

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  const totalRegions = results.reduce((sum, r) => sum + r.regionCount, 0);
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const successfulAnalyses = results.filter((r) => r.hasRegions && r.issues.length === 0).length;
  const failedAnalyses = results.filter((r) => !r.hasRegions || r.issues.some((i) => i.includes('Unable to analyse'))).length;

  console.log(`Total screenshots analyzed: ${results.length}`);
  console.log(`Total regions detected: ${totalRegions}`);
  console.log(`Successful analyses: ${successfulAnalyses}`);
  console.log(`Failed/fallback analyses: ${failedAnalyses}`);
  console.log(`Total issues found: ${totalIssues}`);
  console.log();

  // Save detailed report
  const reportPath = path.join(overlayDir, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Validation failed:', error);
  process.exit(1);
});

