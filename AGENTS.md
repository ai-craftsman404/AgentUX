# AGENTS.md — AgentUX Project Instructions (Cursor IDE)

You are working inside the **AgentUX** VS Code extension project.

AgentUX takes a static screenshot and produces:

- strict JSON region data (Vision)
- normalised UX signals (multi-agent pipeline)
- interactive overlay in a Webview
- category-based UX insights

This document defines how the system behaves, including:

- Q&A context flow (questions + options)
- strict JSON rules
- agent contracts
- error handling
- webview behaviour
- testing and release constraints

---

## 1. Core Workflow

1. User runs **“UX Audit: Analyse Screenshot”** on a PNG/JPG.
2. AgentUX asks a **Q&A context dialog** (see section 2).
3. Screenshot + Q&A metadata → **OpenAI Vision** (strict JSON prompt).
4. Vision response is:
   - checked for ellipses (`...`)
   - repaired if possible
   - validated against schema
5. Multi-agent pipeline runs on validated data.
6. Webview shows:
   - screenshot
   - bounding boxes
   - heatmap
   - category-grouped findings
   - hover-to-highlight linking (region ↔ text)

---

## 2. Q&A Context Flow (Full Details)

Before any analysis, AgentUX asks **three questions**.  
These **must** be answered (or defaulted) and stored in `analysisState.metadata`.

### 2.1 Question 1 — Platform

**User-facing prompt:**

> “Which platform does this UI target?”

**Allowed options:**

- `Desktop Web` – browser-based desktop UI (React app, dashboard, etc.)
- `Mobile Web` – responsive browser UI, touch-first
- `Tablet` – medium-density, touch-based layouts
- `Native iOS` – UIKit/SwiftUI patterns, Apple HIG expectations
- `Native Android` – Material design patterns, Android guidelines
- `Desktop App` – Electron/native desktop app behaviours

**Used by:**

- `spacingAgent` → expected spacing density
- `interactionAgent` → tap-target thresholds (touch vs mouse)
- `typographyAgent` → font size expectations
- `recommendationAgent` → wording of UX suggestions

### 2.2 Question 2 — UI Type

**User-facing prompt:**

> “What kind of UI is this screenshot showing?”

**Allowed options:**

- `Dashboard` – data-heavy cards, charts, tables
- `Landing Page` – marketing hero, CTA focus
- `Form / Input Flow` – login, checkout, multi-step forms
- `Settings Panel` – toggles, preferences, configuration pages
- `E-commerce Product / Checkout` – product, cart, checkout states
- `Marketing Page` – campaign/long-form storytelling
- `Component-Level UI` – isolated widget (modal, card, dialog, etc.)

**Used by:**

- `visual_hierarchy` assumptions
- `navigationAgent` → primary vs secondary actions
- `designSystemAgent` → component reuse expectations
- `recommendationAgent` → contextual framing (“For a dashboard…”)

### 2.3 Question 3 — Audience

**User-facing prompt:**

> “Who is the primary audience for this UI?”

**Allowed options:**

- `General Public` – broad, non-technical users
- `Enterprise Users` – complex workflows, dense tooling
- `Accessibility-Focused` – strict contrast, legibility, focus cues
- `Mobile-First Users` – small screens, on-the-go usage
- `Developer / Technical Users` – tolerant of density, technical jargon

**Used by:**

- `contrastAgent` → stricter for accessibility-focused
- `typographyAgent` → legibility vs density trade-offs
- `spacingAgent` → tolerance for crowding in enterprise contexts
- `recommendationAgent` → severity weighting

### 2.4 Storage in analysisState

Values are persisted on the shared state:

```ts
interface AnalysisMetadata {
  platform: string;
  uiType: string;
  audience: string;
  defaultsApplied?: boolean;
}
```

Example:

```json
{
  "metadata": {
    "platform": "Desktop Web",
    "uiType": "Dashboard",
    "audience": "General Public"
  }
}
```

This metadata must be available to the prompt builder, all agents, and exporters.

### 2.5 Defaults (If User Skips)

If the user cancels or skips the Q&A dialog:

- `platform`: `"Desktop Web"`
- `uiType`: `"Generic Interface"`
- `audience`: `"General Public"`

The pipeline must treat these as explicit defaults and may set `defaultsApplied: true`.

### 2.6 Q&A Error Cases

If `metadata.platform`, `metadata.uiType`, or `metadata.audience` is missing:

- Do **not** call Vision.
- Show “Context missing — please answer the UI context questions.”
- Rerun the Q&A flow before analysis.

---

## 3. Strict JSON Requirements

OpenAI Vision must return strict JSON:

- No ellipses (`"..."`) in arrays.
- No comments.
- No text outside the JSON object.
- `attention_grid.values` must be a complete 2D array.

Validation flow:

1. Check raw text for `"..."`. If found → reject.
2. Attempt to repair with a JSON repair library.
3. Parse JSON.
4. Validate against `/docs/SCHEMA.md`.
5. If validation fails → show warning, abort analysis, avoid placeholder heatmaps.

---

## 4. Screenshot & Privacy Rules

- Screenshots remain local.
- Only sent to OpenAI Vision when the user explicitly runs analysis.
- Never stored, cached, or uploaded elsewhere.
- In the webview:
  - Load via `asWebviewUri()` only.
  - Do not embed large base64 strings inside HTML.

---

## 5. Agent Pipeline (Final, With Contracts)

Agents are pure-ish functions:

```ts
function agent(state: AnalysisState): AnalysisState
```

Execution order:

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

Responsibilities:

- **regionSegmenter** – cleans duplicates, normalises bounds, drops invalid regions.
- **categoryClassifier** – assigns `classification.category` & `subcategory`.
- **spacingAgent** – uses metadata (platform/uiType) to flag crowding/misalignment.
- **typographyAgent** – checks hierarchy & legibility per platform/audience.
- **contrastAgent** – flags low-contrast regions, stricter for accessibility focus.
- **interactionAgent** – validates tap/click targets per platform modality.
- **navigationAgent** – inspects information architecture, action placement.
- **designSystemAgent** – spots component/style drift.
- **recommendationAgent** – aggregates notes, severities, category summaries.
- **heatmapBuilder** – merges regions with attention grid, exposes per-region intensity.

### Parallelisation Guidelines

- `regionSegmenter` and `categoryClassifier` must complete before others.
- After normalisation, `spacing`, `typography`, `contrast`, and `interaction` agents may run in parallel, provided they only append to their own namespaces.
- `navigation` and `designSystem` depend on classification but may run concurrently.
- `recommendationAgent` and `heatmapBuilder` run last, after all upstream agents finish.
- When using parallel execution, merge results deterministically and never overwrite existing data from other agents.

Agents must:

- never delete fields created earlier,
- only add or refine with explicit keys,
- log sanitised errors without crashing the pipeline.

---

## 6. Error Handling

- If parsing or schema validation fails:
  - Abort analysis.
  - Show: “Analysis failed due to invalid model output. Please retry or update AgentUX.”
- If an individual agent fails:
  - Log sanitised error (no screenshot paths or keys).
  - Continue with the remaining pipeline.
  - Webview should gracefully display partial results with warnings.

---

## 7. Webview Behaviour (UX & Accessibility)

- Split layout:
  - Left: screenshot + heatmap + boxes.
  - Right: category findings.
- Hover text ↔ highlight region, and vice versa.
- Keyboard navigation:
  - Tab through categories/issues.
  - Focused items highlight corresponding regions.
- Support VS Code theme variables (light/dark/high contrast).
- Adjustable heatmap opacity.
- On failure, show textual error instead of blank canvas.

---

## 8. Testing Expectations

- **Unit tests** – mocked Vision responses covering multiple metadata combinations; verify per-agent logic.
- **Integration tests** – full pipeline with mocked JSON; ensure `analysisState` integrity.
- **Regression tests** – snapshot comparisons for category summaries and exports.
- **Accessibility** – run axe-core against the rendered webview HTML.
- **Performance** – verify heatmap rendering latency on medium screenshots.
- **Visual/E2E** – Playwright MCP suites for hover interactions, keyboard support, exports, multi-viewport coverage.
- **Manual validation** – occasional real Vision calls once confidence is high.

---

## 9. Release Rules

Before publishing:

- All automated tests green.
- Manual run on:
  - desktop screenshot
  - mobile screenshot
- Verify Q&A flow and strict JSON handling (force an invalid response to confirm errors).
- Package VSIX, install locally, and repeat the smoke tests in the desktop VS Code client.

Rollback strategy: republish the previous VSIX version.

---

## 10. Cursor-Specific Notes

When editing or generating code:

- Honour the Q&A metadata workflow.
- Enforce strict JSON handling steps.
- Wire agents to `analysisState.metadata`.
- Keep the webview minimalist, accessible, and theme aware.
- Do **not** introduce additional providers, heavy libraries, or network calls.

This file is the single source of truth for AgentUX behaviour.

