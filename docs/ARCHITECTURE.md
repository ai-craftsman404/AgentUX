# ARCHITECTURE.md — AgentUX

AgentUX is a VS Code extension that produces UX audits from static UI screenshots.

## Components
1. **Extension Host (TypeScript)** – commands, Q&A flow, Vision calls, pipeline orchestration.
2. **OpenAI Vision API** – returns strict JSON describing regions, attention grid, and summary.
3. **Multi-agent UX pipeline (`/agents`)** – normalises, classifies, and enriches Vision output.
4. **Webview (`/webview`)** – renders screenshot, heatmap, bounding boxes, and findings list.

## Data Flow
1. User invokes “UX Audit: Analyse Screenshot”.
2. Extension:
   - prompts for platform, UI type, audience (with defaults & validation).
   - reads the OpenAI API key from SecretStorage when needed.
   - builds the strict JSON Vision prompt with screenshot + metadata.
3. Vision responds → strict JSON verification (ellipsis rejection, repair, schema validation).
4. Multi-agent pipeline runs (see `docs/PIPELINE.md` and `docs/AGENTS_SPEC.md`), potentially in parallel after normalisation.
5. `analysisState` drives:
   - webview overlays/heatmap
   - exports (JSON/Markdown/SVG/PNG)
   - logging (sanitised)

## Directories
- `/agents`: regionSegmenter, categoryClassifier, spacingAgent, typographyAgent, contrastAgent, interactionAgent, navigationAgent, designSystemAgent, recommendationAgent, heatmapBuilder.
- `/types`: shared TypeScript definitions for state, regions, attention grid, metadata.
- `/utils`: helper logic (prompt builder, Vision client, Q&A dialog, JSON repair, logging).
- `/webview`: HTML/JS/CSS assets, message handlers, overlay rendering code.
- `/docs`: architecture, pipeline, schema, configuration, testing, security, troubleshooting, release guidance.

Each agent reads/writes the shared `analysisState` while respecting the contracts and parallel execution guidelines described in `AGENTS.md`.

