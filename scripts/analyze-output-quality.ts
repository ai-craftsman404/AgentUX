import * as path from 'path';
import { promises as fs } from 'fs';
import { AnalysisState } from '../src/types';
import { PNG } from 'pngjs';

interface OutputAnalysis {
  imageName: string;
  sourceImage: {
    path: string;
    dimensions: { width: number; height: number };
    fileSize: number;
  };
  analysisState: {
    path: string;
    regions: number;
    hasAttentionGrid: boolean;
    hasSummary: boolean;
    errorState: boolean;
  };
  overlayImage?: {
    path: string;
    exists: boolean;
    dimensions?: { width: number; height: number };
  };
  accuracyMetrics: {
    regionPlacement: {
      totalRegions: number;
      regionsWithValidBounds: number;
      regionsOutOfBounds: number;
      regionsWithZeroSize: number;
      averageRegionSize: number;
      regionSizeVariance: number;
    };
    regionQuality: {
      uniqueDimensions: number;
      duplicateDimensions: number;
      suspiciousUniformRegions: boolean;
      regionsWithNotes: number;
      averageNoteLength: number;
    };
    classification: {
      hardIssues: number;
      softIssues: number;
      categoriesDetected: Set<string>;
      severityDistribution: { high: number; medium: number; low: number };
    };
    coverage: {
      regionCoveragePercent: number;
      expectedCategories: number;
      detectedCategories: number;
      missingCategories: string[];
    };
  };
  issues: string[];
  warnings: string[];
  success: boolean;
}

async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  try {
    const buffer = await fs.readFile(imagePath);
    const image = PNG.sync.read(buffer);
    return { width: image.width, height: image.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

export async function analyzeOutputQuality(
  sourceImagePath: string,
  statePath: string,
  overlayPath?: string,
): Promise<OutputAnalysis> {
  const imageName = path.basename(sourceImagePath, path.extname(sourceImagePath));
  const sourceStats = await fs.stat(sourceImagePath);
  const sourceDims = await getImageDimensions(sourceImagePath);

  // Load analysis state
  const stateJson = await fs.readFile(statePath, 'utf8');
  const state = JSON.parse(stateJson) as AnalysisState;

  // Check overlay
  let overlayInfo: OutputAnalysis['overlayImage'] = {
    path: overlayPath || '',
    exists: false,
  };
  if (overlayPath) {
    try {
      await fs.access(overlayPath);
      overlayInfo.exists = true;
      overlayInfo.dimensions = await getImageDimensions(overlayPath);
    } catch {
      // Overlay doesn't exist
    }
  }

  const issues: string[] = [];
  const warnings: string[] = [];

  // Analyze region placement
  const regionsWithValidBounds = state.regions.filter(
    (r) =>
      r.bounds.x >= 0 &&
      r.bounds.y >= 0 &&
      r.bounds.width > 0 &&
      r.bounds.height > 0 &&
      r.bounds.x + r.bounds.width <= sourceDims.width &&
      r.bounds.y + r.bounds.height <= sourceDims.height,
  ).length;

  const regionsOutOfBounds = state.regions.filter(
    (r) =>
      r.bounds.x < 0 ||
      r.bounds.y < 0 ||
      r.bounds.width <= 0 ||
      r.bounds.height <= 0 ||
      r.bounds.x + r.bounds.width > sourceDims.width ||
      r.bounds.y + r.bounds.height > sourceDims.height,
  ).length;

  const regionsWithZeroSize = state.regions.filter(
    (r) => r.bounds.width === 0 || r.bounds.height === 0,
  ).length;

  const regionSizes = state.regions.map((r) => r.bounds.width * r.bounds.height);
  const averageRegionSize =
    regionSizes.length > 0 ? regionSizes.reduce((a, b) => a + b, 0) / regionSizes.length : 0;
  const regionSizeVariance =
    regionSizes.length > 0
      ? regionSizes.reduce((sum, size) => sum + Math.pow(size - averageRegionSize, 2), 0) /
        regionSizes.length
      : 0;

  // Analyze region quality
  const regionDimensions = state.regions.map(
    (r) => `${r.bounds.width}x${r.bounds.height}`,
  );
  const uniqueDimensions = new Set(regionDimensions).size;
  const duplicateDimensions = regionDimensions.length - uniqueDimensions;

  // Check for suspicious uniform regions (more than 2 regions with same size)
  const dimensionCounts = new Map<string, number>();
  regionDimensions.forEach((dim) => {
    dimensionCounts.set(dim, (dimensionCounts.get(dim) || 0) + 1);
  });
  const suspiciousUniformRegions = Array.from(dimensionCounts.values()).some(
    (count) => count > 2,
  );

  const regionsWithNotes = state.regions.filter((r) => r.notes && r.notes.length > 0).length;
  const allNotes = state.regions.flatMap((r) => r.notes);
  const averageNoteLength =
    allNotes.length > 0
      ? allNotes.reduce((sum, note) => sum + note.length, 0) / allNotes.length
      : 0;

  // Analyze classification
  const hardIssues = state.regions.filter((r) => r.issueType === 'hard').length;
  const softIssues = state.regions.filter((r) => r.issueType === 'soft').length;
  const categoriesDetected = new Set(state.regions.map((r) => r.classification.category));
  const severityDistribution = {
    high: state.regions.filter((r) => r.severity.level === 'high').length,
    medium: state.regions.filter((r) => r.severity.level === 'medium').length,
    low: state.regions.filter((r) => r.severity.level === 'low').length,
  };

  // Analyze coverage
  const totalImageArea = sourceDims.width * sourceDims.height;
  const coveredArea = state.regions.reduce(
    (sum, r) => sum + r.bounds.width * r.bounds.height,
    0,
  );
  const regionCoveragePercent =
    totalImageArea > 0 ? (coveredArea / totalImageArea) * 100 : 0;

  const expectedCategories = state.metrics?.expectedCategories || [];
  const detectedCategories = categoriesDetected.size;
  const missingCategories = expectedCategories.filter((cat) => !categoriesDetected.has(cat));

  // Check for error state
  const weaknesses = state.summary?.weaknesses || [];
  const errorState =
    state.regions.length === 0 &&
    weaknesses.some(
      (w) =>
        w.toLowerCase().includes('unable to analyse') ||
        w.toLowerCase().includes('invalid') ||
        w.toLowerCase().includes('failed'),
    );

  // Generate issues and warnings
  if (regionsOutOfBounds > 0) {
    issues.push(`${regionsOutOfBounds} region(s) have out-of-bounds coordinates`);
  }
  if (regionsWithZeroSize > 0) {
    issues.push(`${regionsWithZeroSize} region(s) have zero width or height`);
  }
  if (suspiciousUniformRegions) {
    warnings.push('Multiple regions have identical dimensions (may indicate generic placeholders)');
  }
  if (duplicateDimensions > state.regions.length * 0.5) {
    warnings.push(
      `High number of duplicate region dimensions (${duplicateDimensions}/${state.regions.length})`,
    );
  }
  if (regionsWithNotes < state.regions.length) {
    warnings.push(`${state.regions.length - regionsWithNotes} region(s) missing notes`);
  }
  if (averageNoteLength < 20) {
    warnings.push(`Average note length is very short (${averageNoteLength.toFixed(1)} chars)`);
  }
  if (regionCoveragePercent > 50) {
    warnings.push(`Very high region coverage (${regionCoveragePercent.toFixed(1)}%) - may indicate generic regions`);
  }
  if (regionCoveragePercent < 1 && state.regions.length > 0) {
    warnings.push(`Very low region coverage (${regionCoveragePercent.toFixed(2)}%)`);
  }
  if (errorState) {
    issues.push('Analysis failed - error state detected');
  }
  if (!state.attentionGrid || (state.attentionGrid.grid.width === 0 && state.attentionGrid.grid.height === 0)) {
    warnings.push('Attention grid is missing or empty');
  }
  if (missingCategories.length > 0 && !errorState) {
    warnings.push(`Missing expected categories: ${missingCategories.join(', ')}`);
  }

  const success = !errorState && issues.length === 0 && regionsWithValidBounds === state.regions.length;

  return {
    imageName,
    sourceImage: {
      path: sourceImagePath,
      dimensions: sourceDims,
      fileSize: sourceStats.size,
    },
    analysisState: {
      path: statePath,
      regions: state.regions.length,
      hasAttentionGrid: !!state.attentionGrid && state.attentionGrid.grid.width > 0,
      hasSummary: !!state.summary,
      errorState,
    },
    overlayImage: overlayInfo,
    accuracyMetrics: {
      regionPlacement: {
        totalRegions: state.regions.length,
        regionsWithValidBounds,
        regionsOutOfBounds,
        regionsWithZeroSize,
        averageRegionSize,
        regionSizeVariance,
      },
      regionQuality: {
        uniqueDimensions,
        duplicateDimensions,
        suspiciousUniformRegions,
        regionsWithNotes,
        averageNoteLength,
      },
      classification: {
        hardIssues,
        softIssues,
        categoriesDetected,
        severityDistribution,
      },
      coverage: {
        regionCoveragePercent,
        expectedCategories: expectedCategories.length,
        detectedCategories,
        missingCategories,
      },
    },
    issues,
    warnings,
    success,
  };
}

export function formatAnalysisReport(analysis: OutputAnalysis): string {
  const statusIcon = analysis.success ? '✅' : '❌';
  const errorIcon = analysis.analysisState.errorState ? '⚠️' : '';

  return `# Output Quality Analysis: ${analysis.imageName}

**Status**: ${statusIcon} ${analysis.success ? 'SUCCESS' : 'ISSUES DETECTED'} ${errorIcon}

---

## Source Image

- **Path**: ${analysis.sourceImage.path}
- **Dimensions**: ${analysis.sourceImage.dimensions.width}x${analysis.sourceImage.dimensions.height}px
- **File Size**: ${(analysis.sourceImage.fileSize / 1024).toFixed(2)}KB

---

## Analysis State

- **Regions Detected**: ${analysis.analysisState.regions}
- **Has Attention Grid**: ${analysis.analysisState.hasAttentionGrid ? 'Yes' : 'No'}
- **Has Summary**: ${analysis.analysisState.hasSummary ? 'Yes' : 'No'}
- **Error State**: ${analysis.analysisState.errorState ? '⚠️ YES' : 'No'}

---

## Overlay Image

- **Path**: ${analysis.overlayImage?.path || 'Not generated'}
- **Exists**: ${analysis.overlayImage?.exists ? 'Yes' : 'No'}
${analysis.overlayImage?.dimensions ? `- **Dimensions**: ${analysis.overlayImage.dimensions.width}x${analysis.overlayImage.dimensions.height}px` : ''}

---

## Accuracy Metrics

### Region Placement

- **Total Regions**: ${analysis.accuracyMetrics.regionPlacement.totalRegions}
- **Valid Bounds**: ${analysis.accuracyMetrics.regionPlacement.regionsWithValidBounds}
- **Out of Bounds**: ${analysis.accuracyMetrics.regionPlacement.regionsOutOfBounds}
- **Zero Size**: ${analysis.accuracyMetrics.regionPlacement.regionsWithZeroSize}
- **Average Size**: ${analysis.accuracyMetrics.regionPlacement.averageRegionSize.toFixed(0)}px²
- **Size Variance**: ${analysis.accuracyMetrics.regionPlacement.regionSizeVariance.toFixed(0)}

### Region Quality

- **Unique Dimensions**: ${analysis.accuracyMetrics.regionQuality.uniqueDimensions}
- **Duplicate Dimensions**: ${analysis.accuracyMetrics.regionQuality.duplicateDimensions}
- **Suspicious Uniform Regions**: ${analysis.accuracyMetrics.regionQuality.suspiciousUniformRegions ? '⚠️ YES' : 'No'}
- **Regions With Notes**: ${analysis.accuracyMetrics.regionQuality.regionsWithNotes}/${analysis.analysisState.regions}
- **Average Note Length**: ${analysis.accuracyMetrics.regionQuality.averageNoteLength.toFixed(1)} chars

### Classification

- **Hard Issues**: ${analysis.accuracyMetrics.classification.hardIssues}
- **Soft Issues**: ${analysis.accuracyMetrics.classification.softIssues}
- **Categories Detected**: ${Array.from(analysis.accuracyMetrics.classification.categoriesDetected).join(', ') || 'None'}
- **Severity Distribution**:
  - High: ${analysis.accuracyMetrics.classification.severityDistribution.high}
  - Medium: ${analysis.accuracyMetrics.classification.severityDistribution.medium}
  - Low: ${analysis.accuracyMetrics.classification.severityDistribution.low}

### Coverage

- **Region Coverage**: ${analysis.accuracyMetrics.coverage.regionCoveragePercent.toFixed(2)}%
- **Expected Categories**: ${analysis.accuracyMetrics.coverage.expectedCategories}
- **Detected Categories**: ${analysis.accuracyMetrics.coverage.detectedCategories}
- **Missing Categories**: ${analysis.accuracyMetrics.coverage.missingCategories.length > 0 ? analysis.accuracyMetrics.coverage.missingCategories.join(', ') : 'None'}

---

## Issues

${analysis.issues.length > 0 ? analysis.issues.map((issue) => `- ❌ ${issue}`).join('\n') : '- None'}

---

## Warnings

${analysis.warnings.length > 0 ? analysis.warnings.map((warning) => `- ⚠️ ${warning}`).join('\n') : '- None'}

---

## Overall Assessment

${analysis.success ? '✅ Analysis completed successfully with no critical issues.' : '❌ Analysis has issues that need attention.'}

${analysis.analysisState.errorState ? '\n⚠️ **ERROR STATE**: Analysis failed - check error report for details.' : ''}

${analysis.accuracyMetrics.regionPlacement.regionsOutOfBounds > 0 ? '\n❌ **CRITICAL**: Regions have out-of-bounds coordinates.' : ''}

${analysis.accuracyMetrics.regionQuality.suspiciousUniformRegions ? '\n⚠️ **WARNING**: Suspicious uniform regions detected - may indicate generic placeholders.' : ''}

---

*Analysis generated by AgentUX Quality Analyzer*
`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: ts-node analyze-output-quality.ts <source-image> <state-json> [overlay-image]');
    process.exit(1);
  }

  const sourceImagePath = path.resolve(args[0]);
  const statePath = path.resolve(args[1]);
  const overlayPath = args[2] ? path.resolve(args[2]) : undefined;

  try {
    const analysis = await analyzeOutputQuality(sourceImagePath, statePath, overlayPath);
    const report = formatAnalysisReport(analysis);

    console.log(report);

    // Save report
    const reportPath = path.resolve(
      process.cwd(),
      `artifacts/tests/QUALITY_ANALYSIS_${analysis.imageName}.md`,
    );
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Quality analysis report saved: ${reportPath}`);
  } catch (error) {
    console.error('Analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

