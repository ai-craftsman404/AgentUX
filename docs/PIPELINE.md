# PIPELINE.md — Multi-Agent UX Pipeline

## Order of Agents
1. `regionSegmenter`
2. `categoryClassifier`
3. `spacingAgent`
4. `typographyAgent`
5. `contrastAgent`
6. `interactionAgent`
7. `navigationAgent`
8. `designSystemAgent`
9. `recommendationAgent`
10. `heatmapBuilder`

## Responsibilities
- **regionSegmenter** – deduplicates regions, normalises bounds, ensures they fit the screenshot, drops invalid data.
- **categoryClassifier** – sets `classification.category` and `subcategory` values using Vision hints + heuristics.
- **spacingAgent** – checks padding, gutters, and alignment using `metadata.platform` and `metadata.uiType`.
- **typographyAgent** – evaluates hierarchy, legibility, and scaling based on platform and audience expectations.
- **contrastAgent** – flags low-contrast regions, especially strict for `Accessibility-Focused` audiences.
- **interactionAgent** – inspects tap/click targets, state feedback, and affordances per platform modality.
- **navigationAgent** – looks at information architecture, placement of primary/secondary actions relative to `metadata.uiType`.
- **designSystemAgent** – detects inconsistent components, colours, or iconography.
- **recommendationAgent** – aggregates notes, severity, categories, exports structured findings.
- **heatmapBuilder** – merges regions with the Vision attention grid to expose per-region intensity.

## Parallel Execution
- `regionSegmenter` → `categoryClassifier` must run sequentially.
- After classification, `spacing`, `typography`, `contrast`, and `interaction` agents may run concurrently as long as they only write to their designated namespaces.
- `navigation` and `designSystem` depend on classification but can run alongside the spacing/typography group.
- `recommendation` waits for all upstream agents; `heatmapBuilder` runs last to ensure final bounds and attention grid integrity.
- When merging parallel results, prefer immutable updates and deterministic ordering to avoid race conditions.

## Failure Handling
- An agent failure must log a sanitised error, leave prior data intact, and allow the pipeline to continue.
- Agents never delete fields created upstream; they may only add or refine.
- If the Vision payload is invalid, fail fast before running agents (see `AGENTS.md` and `docs/SCHEMA.md`).

