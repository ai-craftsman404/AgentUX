import { AnalysisState } from '../types';

export interface DescriptiveReport {
  overview: string;
  metadata: {
    platform: string;
    uiType: string;
    audience: string;
  };
  criticalIssues: Array<{
    title: string;
    description: string;
    location: string;
    severity: string;
    recommendation: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    actionableSteps: string[];
  }>;
  summary: {
    totalIssues: number;
    hardIssues: number;
    softIssues: number;
    coverage: string;
  };
}

export function generateDescriptiveReport(state: AnalysisState): DescriptiveReport {
  const metadata = state.metadata || {
    platform: 'Unknown',
    uiType: 'Unknown',
    audience: 'Unknown',
  };

  const hardIssues = state.regions.filter((r) => r.issueType === 'hard');
  const softIssues = state.regions.filter((r) => r.issueType === 'soft');

  // Check if this is an error state (no regions and has error weaknesses)
  const weaknesses = state.summary?.weaknesses || [];
  const hasErrorState = state.regions.length === 0 && weaknesses.some((w) =>
    w.toLowerCase().includes('unable to analyse') ||
    w.toLowerCase().includes('invalid') ||
    w.toLowerCase().includes('failed'),
  );

  // Generate overview
  const agentFindings = state.agentFindings || {
    spacing: [],
    typography: [],
    contrast: [],
    interaction: [],
    navigation: [],
    designSystem: [],
  };
  const categoriesWithFindings = Object.keys(agentFindings).filter(
    (k) => agentFindings[k as keyof typeof agentFindings].length > 0,
  ).length;
  
  const overview = hasErrorState
    ? `This UX analysis attempt encountered an error while examining a ${metadata.uiType} interface designed for ${metadata.platform} targeting ${metadata.audience} users. The analysis could not be completed successfully.`
    : `This UX analysis examined a ${metadata.uiType} interface designed for ${metadata.platform} targeting ${metadata.audience} users. The analysis identified ${state.regions.length} distinct UX issues across ${categoriesWithFindings} categories.`;

  // Generate critical issues (hard issues)
  const criticalIssues = hardIssues.map((region) => {
    const category = region.classification.category.replace(/_/g, ' ');
    const subcategory = region.classification.subcategory;
    const location = `(${region.bounds.x}, ${region.bounds.y}) - ${region.bounds.width}x${region.bounds.height}px`;
    
    let recommendation = '';
    if (region.classification.category === 'color_contrast') {
      recommendation = `Increase contrast ratio to meet WCAG AA standards (4.5:1 minimum). Consider using darker text color or adjusting background. For ${metadata.audience === 'Accessibility-Focused' ? 'accessibility-focused audiences, aim for WCAG AAA (7:1).' : 'better readability.'}`;
    } else if (region.classification.category === 'typography') {
      recommendation = `Increase font size to at least ${metadata.platform.includes('Mobile') ? '16px' : '12px'} for body text. Ensure text is readable without zooming.`;
    } else if (region.classification.category === 'interaction_targets') {
      recommendation = `Increase target size to at least ${metadata.platform.includes('Mobile') || metadata.platform.includes('iOS') || metadata.platform.includes('Android') ? '44px' : '44px'} to prevent accidental clicks and improve usability.`;
    } else {
      recommendation = region.notes[0] || 'Address this issue to improve user experience.';
    }

    return {
      title: `${category}: ${subcategory}`,
      description: region.notes.join(' '),
      location,
      severity: `${region.severity.level} (${(region.severity.score * 100).toFixed(0)}%)`,
      recommendation,
    };
  });

  // Generate recommendations by category
  const recommendations: DescriptiveReport['recommendations'] = [];
  
  const categories = new Set(state.regions.map((r) => r.classification.category));
  categories.forEach((category) => {
    const categoryRegions = state.regions.filter((r) => r.classification.category === category);
    const hardCount = categoryRegions.filter((r) => r.issueType === 'hard').length;
    const priority: 'high' | 'medium' | 'low' = hardCount > 0 ? 'high' : categoryRegions.some((r) => r.severity.level === 'medium') ? 'medium' : 'low';
    
    const actionableSteps: string[] = [];
    if (category === 'color_contrast') {
      actionableSteps.push('Use a contrast checker tool to verify ratios');
      actionableSteps.push('Aim for WCAG AA (4.5:1) minimum, AAA (7:1) for accessibility');
      actionableSteps.push('Test with colorblind simulation tools');
    } else if (category === 'typography') {
      actionableSteps.push('Increase font sizes to meet platform guidelines');
      actionableSteps.push('Ensure sufficient line height (1.5x font size minimum)');
      actionableSteps.push('Test readability at different zoom levels');
    } else if (category === 'interaction_targets') {
      actionableSteps.push('Increase touch target sizes to platform minimums');
      actionableSteps.push('Add padding around interactive elements');
      actionableSteps.push('Ensure adequate spacing between targets');
    } else if (category === 'spacing_alignment') {
      actionableSteps.push('Use consistent spacing scale (e.g., 8px grid)');
      actionableSteps.push('Ensure adequate whitespace between sections');
      actionableSteps.push('Align elements to a consistent grid');
    } else if (category === 'visual_hierarchy') {
      actionableSteps.push('Use size, color, and spacing to establish clear hierarchy');
      actionableSteps.push('Ensure important information stands out');
      actionableSteps.push('Group related elements visually');
    } else if (category === 'navigation_ia') {
      actionableSteps.push('Ensure clear navigation structure');
      actionableSteps.push('Make primary actions easily discoverable');
      actionableSteps.push('Provide clear information architecture');
    } else if (category === 'design_system_drift') {
      actionableSteps.push('Review design system guidelines');
      actionableSteps.push('Ensure consistent component usage');
      actionableSteps.push('Align colors, spacing, and typography with design tokens');
    } else if (category === 'feedback_states') {
      actionableSteps.push('Provide clear feedback for user actions');
      actionableSteps.push('Ensure loading states are visible');
      actionableSteps.push('Make error messages clear and actionable');
    }

    recommendations.push({
      category: category.replace(/_/g, ' '),
      priority,
      description: `${categoryRegions.length} ${category.replace(/_/g, ' ')} issue${categoryRegions.length > 1 ? 's' : ''} detected. ${categoryRegions.map((r) => r.notes[0]).join(' ')}`,
      actionableSteps,
    });
  });

  // Generate summary
  const summary = {
    totalIssues: state.regions.length,
    hardIssues: hardIssues.length,
    softIssues: softIssues.length,
    coverage: state.metrics
      ? `${state.metrics.regionCoverage}% of image area analyzed`
      : 'Not calculated',
  };

  return {
    overview,
    metadata: {
      platform: metadata.platform,
      uiType: metadata.uiType,
      audience: metadata.audience,
    },
    criticalIssues,
    recommendations,
    summary,
  };
}

export function formatReportAsMarkdown(report: DescriptiveReport): string {
  const isErrorState = report.summary.totalIssues === 0 && report.overview.includes('encountered an error');

  if (isErrorState) {
    return `# UX Analysis Report - Error State

## Overview

${report.overview}

## Context

- **Platform**: ${report.metadata.platform}
- **UI Type**: ${report.metadata.uiType}
- **Audience**: ${report.metadata.audience}

## Summary

**Status**: ⚠️ **Analysis Failed**

The analysis could not be completed successfully. No issues were detected because the image could not be analyzed.

---

## Error Information

The analysis encountered an error and could not process the image. This may be due to:

- Image validation failure (size, aspect ratio, or format issues)
- Vision API response parsing error
- Image content that could not be analyzed

---

## Recommendations

1. **Check Image Requirements**: Ensure the image meets minimum requirements:
   - At least 100x100 pixels
   - Aspect ratio no greater than 20:1
   - Valid PNG or JPEG format

2. **Retry Analysis**: Try running the analysis again with the same or a different image

3. **Verify Image Content**: Ensure the image contains clear UI elements and is not corrupted

4. **Check API Configuration**: Verify your OpenAI API key is correctly configured

---

*Report generated by AgentUX*
`;
  }

  return `# UX Analysis Report

## Overview

${report.overview}

## Context

- **Platform**: ${report.metadata.platform}
- **UI Type**: ${report.metadata.uiType}
- **Audience**: ${report.metadata.audience}

## Summary

- **Total Issues**: ${report.summary.totalIssues}
- **Critical Issues (Hard)**: ${report.summary.hardIssues}
- **Suggestions (Soft)**: ${report.summary.softIssues}
- **Coverage**: ${report.summary.coverage}

---

## Critical Issues (Must Fix)

${report.criticalIssues.length > 0 ? report.criticalIssues.map((issue, idx) => `
### ${idx + 1}. ${issue.title}

**Severity**: ${issue.severity}  
**Location**: ${issue.location}  
**Description**: ${issue.description}

**Recommendation**: ${issue.recommendation}
`).join('\n') : 'No critical issues detected.'}

---

## Recommendations by Category

${report.recommendations.length > 0 ? report.recommendations.map((rec) => `
### ${rec.category} (Priority: ${rec.priority.toUpperCase()})

${rec.description}

**Actionable Steps**:
${rec.actionableSteps.map((step) => `- ${step}`).join('\n')}
`).join('\n') : 'No recommendations available.'}

---

## Next Steps

1. **Address Critical Issues First**: Focus on hard issues that affect accessibility and usability
2. **Review Recommendations**: Implement actionable steps for each category
3. **Test Changes**: Verify improvements with users, especially for accessibility-focused audiences
4. **Re-analyze**: Run analysis again after making changes to verify improvements

---

*Report generated by AgentUX*
`;
}

