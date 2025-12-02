import { AnalysisMetadata } from '../types';

export const SYSTEM_PROMPT =
  'You are a UX analysis engine. You must output ONLY valid JSON that matches the schema provided. No markdown, no commentary, no apologies, no ellipses. If you are ever unable to analyse an image, you must still return valid JSON with empty arrays and a weakness explaining the issue.';

function getPlatformGuidance(platform: string): string {
  const guidance: Record<string, string> = {
    'Desktop Web':
      'Expect consistent 16px gutters, mouse-sized interactive targets (≥44px), readable text (≥12px), and desktop-appropriate information density.',
    'Mobile Web':
      'Expect touch targets ≥44px, generous spacing between elements, readable text ≥16px, and mobile-first responsive design patterns.',
    'Tablet':
      'Expect medium-density layouts, touch targets ≥44px, balanced spacing, and tablet-optimized information architecture.',
    'Native iOS':
      'Follow Apple Human Interface Guidelines: expect 44x44pt minimum touch targets, iOS spacing patterns (8pt grid), and iOS-specific UI patterns.',
    'Native Android':
      'Follow Material Design guidelines: expect 48dp minimum touch targets, Material spacing patterns (8dp grid), and Android-specific UI patterns.',
    'Desktop App':
      'Expect app-like behaviors, consistent spacing, clear visual hierarchy, and desktop application UI patterns.',
  };
  return guidance[platform] || 'Apply standard UX principles for this platform.';
}

function getUITypeGuidance(uiType: string): string {
  const guidance: Record<string, string> = {
    Dashboard:
      'Focus on data density, chart readability, information hierarchy, card spacing, and efficient use of screen space. Prioritize clarity of data presentation.',
    'Landing Page':
      'Focus on hero section impact, CTA visibility and placement, visual hierarchy, conversion flow, and marketing effectiveness.',
    'Form / Input Flow':
      'Focus on label clarity, input field spacing, validation feedback, error state visibility, form completion flow, and accessibility of form controls.',
    'Settings Panel':
      'Focus on organization, toggle/control clarity, grouping logic, navigation within settings, and configuration clarity.',
    'E-commerce Product / Checkout':
      'Focus on product image quality, pricing clarity, add-to-cart flow, checkout process, trust signals, and conversion optimization.',
    'Marketing Page':
      'Focus on storytelling flow, visual impact, readability of long-form content, CTA placement, and engagement metrics.',
    'Component-Level UI':
      'Focus on component-specific UX: modal accessibility, card layout, dialog usability, menu navigation, or widget functionality.',
  };
  return guidance[uiType] || 'Apply standard UX principles for this UI type.';
}

function getAudienceGuidance(audience: string): string {
  const guidance: Record<string, string> = {
    'General Public':
      'Prioritize clarity, simplicity, and ease of use. Use moderate severity thresholds. Focus on common usability issues.',
    'Enterprise Users':
      'Tolerate higher information density and complex workflows. Use stricter thresholds for critical business functions. Expect sophisticated users.',
    'Accessibility-Focused':
      'Apply strict contrast requirements (WCAG AA minimum, AAA preferred), larger touch targets (≥48px), clear focus indicators, and comprehensive accessibility checks.',
    'Mobile-First Users':
      'Prioritize mobile usability, small screen optimization, touch interaction quality, and on-the-go usage patterns.',
    'Developer / Technical Users':
      'Tolerate higher density and technical language. Use moderate thresholds but ensure technical accuracy and developer workflow efficiency.',
  };
  return guidance[audience] || 'Apply standard UX principles for this audience.';
}

export const buildVisionPrompt = (metadata: AnalysisMetadata): string => {
  const platformGuidance = getPlatformGuidance(metadata.platform);
  const uiTypeGuidance = getUITypeGuidance(metadata.uiType);
  const audienceGuidance = getAudienceGuidance(metadata.audience);

  return `
Analyze the provided UI screenshot and return strict JSON matching /docs/SCHEMA.md.

IMPORTANT: If this screenshot contains multiple UI pages/screens side-by-side, analyze each page separately. Provide regions for each page, ensuring bounds are relative to the entire image. If pages have different UI types, analyze each according to its specific type.

Context and Expectations:
- Platform: ${metadata.platform}
  ${platformGuidance}
- UI Type: ${metadata.uiType}
  ${uiTypeGuidance}
- Audience: ${metadata.audience}
  ${audienceGuidance}

Apply these expectations when detecting regions, assigning severity, and generating notes. For example:
- If Platform is "Mobile Web" and Audience is "Accessibility-Focused", flag touch targets < 48px as HIGH severity.
- If UI Type is "Form / Input Flow", prioritize spacing_alignment and interaction_targets categories.
- If Audience is "Enterprise Users", tolerate higher density but still flag critical usability issues.

CRITICAL: Detect SPECIFIC UI elements and issues, not generic card/widget boundaries:
- For typography issues: Detect specific text elements (labels, values, headings) that are too small or hard to read. Provide precise bounds for the problematic text, not the entire card.
- For color contrast: Detect specific elements with contrast problems (highlighted text, chart segments, buttons). Provide bounds for the specific element, not the entire widget.
- For spacing: Detect specific spacing problems between elements, not entire card areas.
- Each region must have UNIQUE dimensions - avoid generic placeholder regions with identical sizes.
- Be precise: If a table cell has contrast issues, detect that specific cell, not the entire table.

REQUIREMENT: Category Diversity - Detect issues across MULTIPLE categories:
- Check for spacing_alignment issues (button spacing, element alignment, grid consistency)
- Check for typography issues (font sizes, readability, text hierarchy)
- Check for color_contrast issues (text contrast, background contrast, chart colors)
- Check for interaction_targets issues (button sizes, touch targets, clickable areas)
- Check for navigation_ia issues (menu clarity, information architecture, navigation flow)
- Check for design_system_drift issues (inconsistent components, style variations)
- Provide at least 2-3 different categories. Do not focus on only one category type.

REQUIREMENT: Element-Specific Detection Guidance:
- Buttons: Check size, spacing, contrast, labels, accessibility
- Text: Check size, contrast, hierarchy, alignment, readability
- Forms: Check input sizes, labels, validation states, spacing
- Navigation: Check clarity, hierarchy, accessibility, consistency
- Charts: Check contrast, labels, accessibility, readability
- Cards: Check spacing, alignment, content hierarchy

REQUIREMENT: Minimum Region Count:
- Detect at least 5-10 specific UI issues for complex UIs
- Detect at least 3-5 specific UI issues for simple UIs
- Do not provide generic regions covering entire sections
- Each region should target a specific problematic element

Return:
{
  "regions": [
    {
      "bounds": { "x": int, "y": int, "width": int, "height": int },
      "classification": {
        "category": "spacing_alignment|typography|color_contrast|interaction_targets|navigation_ia|design_system_drift|visual_hierarchy|feedback_states",
        "subcategory": "string"
      },
      "severity": { "level": "low|medium|high", "score": float },
      "notes": ["short actionable notes that identify SPECIFIC elements, e.g., 'ACoS values in row 3 use purple text with low contrast' not 'table has contrast issues'"]
    }
  ],
  "attention_grid": {
    "grid": { "width": int, "height": int, "values": [[float]] },
    "source": "vision",
    "normalization": "minmax"
  },
  "summary": {
    "strengths": ["string"],
    "weaknesses": ["string"]
  }
}

Rules:
- Arrays must be complete. No placeholders or ellipses (...). DO NOT use "..." anywhere in your response.
- Provide at least one note per region that identifies SPECIFIC elements (e.g., "Purple ACoS text in row 2" not "table has issues").
- Bounds must align with the screenshot pixel space and match ACTUAL UI element boundaries.
- Each region must have UNIQUE dimensions - avoid creating multiple regions with identical sizes.
- Detect SPECIFIC issues within elements, not entire cards/widgets unless the entire element is problematic.
- Severity levels should reflect the context (e.g., stricter for Accessibility-Focused audience).
- Avoid generic positive feedback (e.g., "consistent layout") - only flag actual issues.
- CRITICAL: Ensure category diversity - provide regions from at least 2-3 different categories.
- CRITICAL: Ensure minimum region count - detect 5-10 issues for complex UIs, 3-5 for simple UIs.
- If the screenshot cannot be analysed or you are unsure, return the JSON structure above with empty arrays and set summary.weaknesses to ["Unable to analyse screenshot"] instead of writing prose or apologies.
- Never respond with text outside the JSON object.
`;
};

