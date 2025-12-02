import * as path from 'path';
import { promises as fs } from 'fs';
import { AnalysisState } from '../src/types';
import { PNG } from 'pngjs';

/**
 * Visual accuracy checker - compares overlay regions with source image
 * to verify regions align with actual UI elements.
 */

interface VisualAccuracyCheck {
  imageName: string;
  sourceImagePath: string;
  overlayImagePath: string;
  statePath: string;
  visualVerification: {
    overlayExists: boolean;
    overlayMatchesSource: boolean;
    overlayDimensions: { width: number; height: number };
    sourceDimensions: { width: number; height: number };
  };
  regionAlignment: Array<{
    regionIndex: number;
    bounds: { x: number; y: number; width: number; height: number };
    category: string;
    note: string;
    visualAssessment: 'aligned' | 'misaligned' | 'uncertain' | 'needs_review';
    assessmentReason: string;
  }>;
  overallAccuracy: {
    alignedRegions: number;
    misalignedRegions: number;
    uncertainRegions: number;
    needsReviewRegions: number;
    accuracyPercentage: number;
  };
  recommendations: string[];
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

export async function performVisualAccuracyCheck(
  sourceImagePath: string,
  overlayImagePath: string,
  statePath: string,
): Promise<VisualAccuracyCheck> {
  const imageName = path.basename(sourceImagePath, path.extname(sourceImagePath));

  // Load state
  const stateJson = await fs.readFile(statePath, 'utf8');
  const state = JSON.parse(stateJson) as AnalysisState;

  // Check overlay exists
  let overlayExists = false;
  let overlayDims = { width: 0, height: 0 };
  try {
    await fs.access(overlayImagePath);
    overlayExists = true;
    overlayDims = await getImageDimensions(overlayImagePath);
  } catch {
    // Overlay doesn't exist
  }

  // Get source dimensions
  const sourceDims = await getImageDimensions(sourceImagePath);
  const overlayMatchesSource = overlayDims.width === sourceDims.width && overlayDims.height === sourceDims.height;

  // Analyze each region
  const regionAlignment: VisualAccuracyCheck['regionAlignment'] = state.regions.map((region, idx) => {
    const { x, y, width, height } = region.bounds;
    
    // Basic validation checks
    const isOutOfBounds = x < 0 || y < 0 || x + width > sourceDims.width || y + height > sourceDims.height;
    const isZeroSize = width === 0 || height === 0;
    const isVerySmall = width * height < 100; // Less than 100px²
    const isVeryLarge = width * height > sourceDims.width * sourceDims.height * 0.5; // More than 50% of image
    
    let visualAssessment: VisualAccuracyCheck['regionAlignment'][0]['visualAssessment'] = 'uncertain';
    let assessmentReason = '';

    if (isOutOfBounds) {
      visualAssessment = 'misaligned';
      assessmentReason = 'Region coordinates are out of image bounds';
    } else if (isZeroSize) {
      visualAssessment = 'misaligned';
      assessmentReason = 'Region has zero width or height';
    } else if (isVerySmall) {
      visualAssessment = 'needs_review';
      assessmentReason = 'Region is very small (<100px²) - may be accurate for small UI elements';
    } else if (isVeryLarge) {
      visualAssessment = 'needs_review';
      assessmentReason = 'Region covers >50% of image - may be too generic';
    } else {
      // For now, mark as uncertain - requires manual visual review
      visualAssessment = 'uncertain';
      assessmentReason = 'Requires manual visual verification against source image';
    }

    return {
      regionIndex: idx,
      bounds: { x, y, width, height },
      category: region.classification.category,
      note: region.notes[0] || 'No note',
      visualAssessment,
      assessmentReason,
    };
  });

  // Calculate overall accuracy
  const alignedRegions = regionAlignment.filter((r) => r.visualAssessment === 'aligned').length;
  const misalignedRegions = regionAlignment.filter((r) => r.visualAssessment === 'misaligned').length;
  const uncertainRegions = regionAlignment.filter((r) => r.visualAssessment === 'uncertain').length;
  const needsReviewRegions = regionAlignment.filter((r) => r.visualAssessment === 'needs_review').length;
  
  const totalRegions = regionAlignment.length;
  const accuracyPercentage = totalRegions > 0 
    ? ((alignedRegions / totalRegions) * 100) 
    : 0;

  // Generate recommendations
  const recommendations: string[] = [];
  if (misalignedRegions > 0) {
    recommendations.push(`Fix ${misalignedRegions} misaligned region(s) with out-of-bounds coordinates`);
  }
  if (needsReviewRegions > 0) {
    recommendations.push(`Review ${needsReviewRegions} region(s) that may be too small or too large`);
  }
  if (uncertainRegions > 0) {
    recommendations.push(`Manually verify ${uncertainRegions} region(s) against source image`);
  }
  if (!overlayExists) {
    recommendations.push('Generate overlay image for visual verification');
  }
  if (!overlayMatchesSource && overlayExists) {
    recommendations.push('Overlay dimensions do not match source image - check image processing');
  }

  return {
    imageName,
    sourceImagePath,
    overlayImagePath,
    statePath,
    visualVerification: {
      overlayExists,
      overlayMatchesSource,
      overlayDimensions: overlayDims,
      sourceDimensions: sourceDims,
    },
    regionAlignment,
    overallAccuracy: {
      alignedRegions,
      misalignedRegions,
      uncertainRegions,
      needsReviewRegions,
      accuracyPercentage,
    },
    recommendations,
  };
}

export function formatVisualAccuracyReport(check: VisualAccuracyCheck): string {
  return `# Visual Accuracy Check: ${check.imageName}

## Visual Verification

- **Overlay Exists**: ${check.visualVerification.overlayExists ? '✅ Yes' : '❌ No'}
- **Overlay Matches Source**: ${check.visualVerification.overlayMatchesSource ? '✅ Yes' : '❌ No'}
- **Source Dimensions**: ${check.visualVerification.sourceDimensions.width}x${check.visualVerification.sourceDimensions.height}px
- **Overlay Dimensions**: ${check.visualVerification.overlayDimensions.width}x${check.visualVerification.overlayDimensions.height}px

---

## Overall Accuracy

- **Total Regions**: ${check.regionAlignment.length}
- **Aligned**: ${check.overallAccuracy.alignedRegions}
- **Misaligned**: ${check.overallAccuracy.misalignedRegions}
- **Uncertain**: ${check.overallAccuracy.uncertainRegions}
- **Needs Review**: ${check.overallAccuracy.needsReviewRegions}
- **Accuracy**: ${check.overallAccuracy.accuracyPercentage.toFixed(1)}%

---

## Region-by-Region Assessment

${check.regionAlignment.map((region) => `
### Region ${region.regionIndex + 1}: ${region.category}

- **Bounds**: (${region.bounds.x}, ${region.bounds.y}) ${region.bounds.width}x${region.bounds.height}px
- **Note**: ${region.note}
- **Assessment**: ${region.visualAssessment === 'aligned' ? '✅ Aligned' : region.visualAssessment === 'misaligned' ? '❌ Misaligned' : region.visualAssessment === 'needs_review' ? '⚠️ Needs Review' : '❓ Uncertain'}
- **Reason**: ${region.assessmentReason}
`).join('\n')}

---

## Recommendations

${check.recommendations.length > 0 ? check.recommendations.map((rec) => `- ${rec}`).join('\n') : '- No specific recommendations'}

---

## Next Steps

1. **Review Overlay Image**: Open \`${check.overlayImagePath}\` and visually verify regions align with UI elements
2. **Check Misaligned Regions**: Fix regions with out-of-bounds coordinates
3. **Review Uncertain Regions**: Manually verify regions marked as uncertain
4. **Update Assessment**: Mark regions as 'aligned' or 'misaligned' after visual review

---

*Visual accuracy check generated by AgentUX*
`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: ts-node visual-accuracy-check.ts <source-image> <overlay-image> <state-json>');
    process.exit(1);
  }

  const sourceImagePath = path.resolve(args[0]);
  const overlayImagePath = path.resolve(args[1]);
  const statePath = path.resolve(args[2]);

  try {
    const check = await performVisualAccuracyCheck(sourceImagePath, overlayImagePath, statePath);
    const report = formatVisualAccuracyReport(check);

    console.log(report);

    // Save report
    const reportPath = path.resolve(
      process.cwd(),
      `artifacts/tests/VISUAL_ACCURACY_${check.imageName}.md`,
    );
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, report);
    console.log(`\n📄 Visual accuracy report saved: ${reportPath}`);
  } catch (error) {
    console.error('Visual accuracy check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

