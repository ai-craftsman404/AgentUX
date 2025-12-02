# WEBVIEW.md — AgentUX Webview Requirements

## Layout
- **Left column**: screenshot image, bounding-box canvas, heatmap canvas, overlay controls.
- **Right column**: category sections with collapsible groups, issue list, export buttons.
- Maintain responsive behaviour but preserve desktop-first layout; constrain width to avoid stretching.

## Rendering Rules
- Load screenshots via `asWebviewUri()`; never inline large base64 strings.
- Apply a strict CSP (nonce-based scripts, no external CDNs).
- Use vanilla JS/TS (no heavy frameworks).
- Honour VS Code theme variables for colours, typography, borders.
- Provide adjustable heatmap opacity and a toggle to show/hide overlays.

## Interaction
- Hover text ↔ highlight region, and hover region ↔ highlight text.
- Keyboard navigation:
  - Tab order includes category headers and issues.
  - Focused items trigger region highlight and scroll screenshot into view.
- Support pointer and keyboard activation for overlay toggles.
- Provide status messaging for long-running analyses or errors.

## Accessibility
- Ensure sufficient contrast in overlays for both light and dark themes.
- Use `aria-live` regions for analysis errors or completion notices.
- Provide descriptive labels for controls (opacity slider, export buttons, etc.).
- Respect reduced-motion preferences (limit animations).
- Include focus outlines and maintain logical focus order.

## Localisation & Content
- Copy should be short, actionable, and free of jargon unless metadata indicates technical audiences.
- Prepare for future localisation by storing strings centrally (even if only English now).

## Error States
- If analysis fails, show a textual error with retry guidance; keep screenshot/previous results hidden to avoid confusion.
- For missing heatmap data, show a fallback message and disable heatmap controls.
- When JSON validation fails, include the sanitised error in the UI logs panel.

## Visual Enhancements
- Display region bounding boxes with category-specific colours; include a legend.
- Show attention hotspots as semi-transparent heatmap layers with adjustable blur.
- Indicate selection states with thicker outlines and a panel summarising selected regions (supports multi-select, keyboard shortcuts for select-all and clear).

Refer to `docs/TESTING.md` for the accessibility and Playwright coverage expected for the webview.

