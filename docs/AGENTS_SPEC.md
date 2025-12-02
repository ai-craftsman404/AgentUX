# AGENTS_SPEC.md — Detailed Agent Contracts

Each agent conforms to:
```ts
type Agent = (state: AnalysisState) => AnalysisState;
```
Agents read from and append to `analysisState`. They must never delete fields they did not create.

## 1. regionSegmenter
- **Input**: raw Vision regions + screenshot dimensions.
- **Output**: `state.regions` with deduplicated entries, normalised bounds (integers, clamped to image), and validation flags.
- **Validation**: drop regions with invalid sizes; log warnings with counts.
- **Failure**: continue with surviving regions; never throw.

## 2. categoryClassifier
- **Input**: normalised regions, Vision classification hints.
- **Output**: `classification.category` and `classification.subcategory`.
- **Defaults**: `category="visual_hierarchy"` when unknown, severity low.
- **Dependency**: must run before spacing/typography/etc.

## 3. spacingAgent
- **Inputs**: `metadata.platform`, `metadata.uiType`, classified regions.
- **Output**: `state.spacing.findings` with crowding, misalignment, gutter spacing notes.
- **Side Effects**: may adjust region severity scores.

## 4. typographyAgent
- **Inputs**: platform + audience expectations, region text metadata (if available).
- **Output**: hierarchy issues, legibility warnings, font-scale recommendations.
- **Notes**: emphasise accessibility-focused audiences with higher severity.

## 5. contrastAgent
- **Inputs**: region colours, background sampling, audience.
- **Output**: low-contrast findings, WCAG-inspired severity.
- **Fallback**: if colour sampling unavailable, flag as “contrast_unknown” with info-level severity.

## 6. interactionAgent
- **Inputs**: platform (touch vs mouse), region classification (buttons, links, controls).
- **Output**: tap target sizing, spacing between actions, missing affordances.
- **Shortcut Handling**: note when keyboard cues or focus states seem absent.

## 7. navigationAgent
- **Inputs**: uiType, layout heuristics.
- **Output**: primary vs secondary action placement, IA clarity, breadcrumb/state cues.
- **Parallel**: can run alongside designSystem after classification completes.

## 8. designSystemAgent
- **Inputs**: colours, typography tokens, component patterns.
- **Output**: drift reports (mismatched button styles, inconsistent spacing units, etc.).
- **Notes**: highlight when inconsistent with metadata expectations (e.g., Material vs HIG).

## 9. recommendationAgent
- **Inputs**: aggregated findings from all previous agents.
- **Output**: category summaries, prioritised recommendations, severity rollups, export-ready structures.
- **Behaviour**: deduplicate overlapping notes; ensure wording references metadata context.

## 10. heatmapBuilder
- **Inputs**: final region list, Vision attention grid.
- **Output**: per-region intensity, interpolated heatmap for webview, metadata for exports.
- **Validation**: confirm grid dimensions align with schema; if not, log error and disable heatmap.

## Failure Handling
- Any agent encountering an error must log a sanitised message and return the unchanged state.
- Avoid throwing; propagate issues via `state.warnings`.
- When running agents in parallel, ensure shared sub-objects are merged immutably to prevent race conditions.

