import { RegionFinding, AnalysisMetadata, RegionCategory } from '../types';

/**
 * Classifies an issue as 'hard' (must fix) or 'soft' (nice to have).
 * Hard errors are accessibility violations, unreadable text, broken interactions.
 * Soft suggestions are style preferences, density suggestions.
 */
export function classifyIssueType(
  region: RegionFinding,
  metadata: AnalysisMetadata | null,
): 'hard' | 'soft' {
  const { category, subcategory } = region.classification;
  const { level, score } = region.severity;
  const platform = metadata?.platform;
  const audience = metadata?.audience;

  // Hard errors: High severity issues
  if (level === 'high' && score > 0.7) {
    return 'hard';
  }

  // Hard errors: Accessibility violations
  if (category === 'color_contrast') {
    // High severity contrast issues are always hard
    if (level === 'high') {
      return 'hard';
    }
    // For accessibility-focused audience, even medium contrast issues are hard
    if (audience === 'Accessibility-Focused' && level !== 'low') {
      return 'hard';
    }
    // Low contrast with high score is hard
    if (score > 0.6) {
      return 'hard';
    }
  }

  // Hard errors: Typography - unreadable text
  if (category === 'typography') {
    // Check if subcategory indicates unreadable text
    const unreadableKeywords = ['font_size', 'readability', 'legibility', 'too_small'];
    if (unreadableKeywords.some((keyword) => subcategory.toLowerCase().includes(keyword))) {
      // For mobile, text < 16px is hard; for desktop, text < 12px is hard
      if (platform === 'Mobile Web' || platform === 'Native iOS' || platform === 'Native Android') {
        if (level !== 'low' || score > 0.5) {
          return 'hard';
        }
      } else if (level === 'high' || (level === 'medium' && score > 0.5)) {
        return 'hard';
      }
    }
  }

  // Hard errors: Interaction targets too small
  if (category === 'interaction_targets') {
    // Touch platforms require ≥44px targets
    const touchPlatforms = ['Mobile Web', 'Native iOS', 'Native Android', 'Tablet'];
    if (touchPlatforms.includes(platform || '')) {
      // Small touch targets are hard errors
      if (level !== 'low' || score > 0.4) {
        return 'hard';
      }
    }
    // Desktop targets < 44px with high severity are hard
    if (level === 'high' || (level === 'medium' && score > 0.6)) {
      return 'hard';
    }
  }

  // Hard errors: Navigation issues - missing primary actions, broken navigation
  if (category === 'navigation_ia') {
    const criticalKeywords = ['missing', 'broken', 'unclear', 'hidden', 'primary'];
    if (criticalKeywords.some((keyword) => subcategory.toLowerCase().includes(keyword))) {
      if (level !== 'low' || score > 0.5) {
        return 'hard';
      }
    }
    // High severity navigation issues are hard
    if (level === 'high') {
      return 'hard';
    }
  }

  // Hard errors: Feedback states - missing critical feedback
  if (category === 'feedback_states') {
    const criticalKeywords = ['error', 'validation', 'required', 'missing'];
    if (criticalKeywords.some((keyword) => subcategory.toLowerCase().includes(keyword))) {
      if (level !== 'low') {
        return 'hard';
      }
    }
  }

  // Soft suggestions: Everything else
  // Spacing/alignment preferences
  if (category === 'spacing_alignment') {
    return 'soft';
  }

  // Design system drift (style inconsistencies)
  if (category === 'design_system_drift') {
    return 'soft';
  }

  // Visual hierarchy preferences
  if (category === 'visual_hierarchy') {
    // Only high severity visual hierarchy issues might be hard
    if (level === 'high' && score > 0.7) {
      return 'hard';
    }
    return 'soft';
  }

  // Low severity issues are generally soft
  if (level === 'low' && score < 0.4) {
    return 'soft';
  }

  // Medium severity issues default to soft unless they match hard criteria above
  return 'soft';
}

/**
 * Classifies all regions in a list.
 */
export function classifyRegions(
  regions: RegionFinding[],
  metadata: AnalysisMetadata | null,
): RegionFinding[] {
  return regions.map((region) => ({
    ...region,
    issueType: classifyIssueType(region, metadata),
  }));
}

