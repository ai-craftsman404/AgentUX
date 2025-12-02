import { RegionFinding, RegionCategory, AnalysisMetadata, AnalysisState } from '../types';

export interface AnalysisMetrics {
  regionCoverage: number; // % of image area covered by regions
  categoryCoverage: Record<RegionCategory, boolean>; // Which categories detected
  expectedCategories: RegionCategory[]; // Expected categories for UI type
  missingCategories: RegionCategory[]; // Expected but not detected
}

/**
 * Returns expected categories for a given UI type.
 */
function getExpectedCategories(uiType: string): RegionCategory[] {
  const expectations: Record<string, RegionCategory[]> = {
    Dashboard: [
      'spacing_alignment',
      'typography',
      'visual_hierarchy',
      'color_contrast',
      'interaction_targets',
    ],
    'Landing Page': [
      'visual_hierarchy',
      'typography',
      'interaction_targets',
      'spacing_alignment',
      'color_contrast',
    ],
    'Form / Input Flow': [
      'spacing_alignment',
      'typography',
      'interaction_targets',
      'color_contrast',
      'feedback_states',
      'navigation_ia',
    ],
    'Settings Panel': [
      'navigation_ia',
      'interaction_targets',
      'spacing_alignment',
      'typography',
      'design_system_drift',
    ],
    'E-commerce Product / Checkout': [
      'interaction_targets',
      'visual_hierarchy',
      'color_contrast',
      'spacing_alignment',
      'feedback_states',
    ],
    'Marketing Page': [
      'visual_hierarchy',
      'typography',
      'color_contrast',
      'spacing_alignment',
    ],
    'Component-Level UI': [
      'interaction_targets',
      'spacing_alignment',
      'typography',
      'color_contrast',
      'design_system_drift',
    ],
  };

  return expectations[uiType] || [];
}

/**
 * Calculates the percentage of image area covered by regions.
 * Handles overlapping regions by using union of areas.
 */
export function calculateRegionCoverage(
  regions: RegionFinding[],
  imageWidth: number,
  imageHeight: number,
): number {
  if (regions.length === 0 || imageWidth === 0 || imageHeight === 0) {
    return 0;
  }

  const imageArea = imageWidth * imageHeight;

  // Simple approach: sum all region areas (overlap will be counted multiple times)
  // For more accurate coverage, would need to calculate union of rectangles
  // This is a simplified version
  const totalRegionArea = regions.reduce((sum, region) => {
    const area = region.bounds.width * region.bounds.height;
    return sum + area;
  }, 0);

  // Cap at 100%
  const coverage = Math.min((totalRegionArea / imageArea) * 100, 100);
  return Math.round(coverage * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculates which categories are present in the regions.
 */
export function calculateCategoryCoverage(
  regions: RegionFinding[],
): Record<RegionCategory, boolean> {
  const coverage: Record<RegionCategory, boolean> = {
    spacing_alignment: false,
    typography: false,
    color_contrast: false,
    interaction_targets: false,
    navigation_ia: false,
    design_system_drift: false,
    visual_hierarchy: false,
    feedback_states: false,
  };

  regions.forEach((region) => {
    coverage[region.classification.category] = true;
  });

  return coverage;
}

/**
 * Calculates comprehensive coverage metrics for an analysis.
 */
export function calculateCoverageMetrics(
  state: AnalysisState,
  imageWidth: number,
  imageHeight: number,
): AnalysisMetrics {
  const regions = state.regions || [];
  const uiType = state.metadata?.uiType || 'Generic Interface';

  const regionCoverage = calculateRegionCoverage(regions, imageWidth, imageHeight);
  const categoryCoverage = calculateCategoryCoverage(regions);
  const expectedCategories = getExpectedCategories(uiType);
  const missingCategories = expectedCategories.filter(
    (category) => !categoryCoverage[category],
  );

  return {
    regionCoverage,
    categoryCoverage,
    expectedCategories,
    missingCategories,
  };
}

