# AgentUX — VS Code Extension for Screenshot UX Audits

AgentUX reviews static UI screenshots with OpenAI Vision, a strict JSON pipeline, and an interactive VS Code webview. It surfaces spacing, typography, contrast, navigation, interaction, and design-system insights backed by attention heatmaps and region overlays.

## Two Distinct Output Formats

AgentUX provides **two complementary analysis outputs** to help you understand and act on UX findings:

### 1. Visual Output
An interactive webview panel displaying:
- **Screenshot overlay** with bounding boxes highlighting detected issues
- **Attention heatmap** showing visual focus areas (adjustable opacity)
- **Interactive region selection** (click regions or use Ctrl+A to select all, Escape to clear)
- **Hover-to-highlight** linking between region boxes and findings list
- **Keyboard navigation** support for accessibility

### 2. Descriptive Output
Category-based findings organized across **8 UX categories**:

- **Spacing & Alignment** — Crowding, misalignment, inconsistent gutters, grid violations
- **Typography** — Font size issues, readability problems, hierarchy concerns, legibility warnings
- **Color & Contrast** — Low-contrast regions, WCAG compliance issues, accessibility violations
- **Interaction Targets** — Button/touch target sizing, spacing between actions, missing affordances
- **Navigation & Information Architecture** — Menu clarity, navigation flow, structure issues
- **Design System Drift** — Inconsistent components, style variations, token misalignment
- **Visual Hierarchy** — Element prominence, information prioritization, grouping issues
- **Feedback States** — Loading states, error messages, user action feedback

Each finding includes:
- **Severity level** (low/medium/high) with numeric scores
- **Actionable notes** identifying specific UI elements
- **Issue type** classification (hard: accessibility violations; soft: style preferences)
- **Category-specific recommendations** for remediation

## Features
- OpenAI Vision analysis with enforced strict-JSON responses (repaired and validated).
- Three-question context capture (platform, UI type, audience) saved to `analysisState.metadata`.
- Multi-agent pipeline (region segmentation → classification → spacing/typography/contrast/interaction/navigation/design-system → recommendations → heatmap).
- Interactive webview with screenshot, bounding boxes, heatmap, hover-linked findings, keyboard navigation, and theme-aware styling.
- Descriptive category-based findings with actionable recommendations.
- Exports (JSON/Markdown/SVG/PNG) for sharing findings.
- Secure storage of API keys via VS Code SecretStorage.

## Requirements
- VS Code 1.90+
- Node.js 18+
- OpenAI API key with Vision access (only needed for real-run testing; mocked responses are used during development).

## Commands
- `UX Audit: Analyse Screenshot`
- `UX Audit: Set OpenAI API Key`
- `UX Audit: Configure Context`
- `UX Audit: Re-run Last Analysis`
- `UX Audit: Export Results`
- `UX Audit: Open UX Panel`

## Development Workflow
1. `npm install`
2. `npm run watch`
3. Press `F5` in VS Code to start the extension host.
4. Use mocked fixtures for most tests; reserve real API keys for late-stage validation.
5. Run the documented test suites (see `docs/TESTING.md`).

## Documentation Map
- `AGENTS.md` – root rules and contracts.
- `docs/ARCHITECTURE.md` – high-level flow.
- `docs/PIPELINE.md` & `docs/AGENTS_SPEC.md` – agent order and contracts.
- `docs/SCHEMA.md` & `docs/SCHEMA_VERSIONING.md` – strict JSON schema and evolution.
- `docs/WEBVIEW.md` – UI behaviour, accessibility, overlay requirements.
- `docs/TESTING.md` & `docs/TEST_FIXTURES.md` – DevTestOps matrix, sample fixtures, Cursor vs Playwright MCP usage.
- `docs/CONFIGURATION.md` & `docs/SECURITY.md` – secrets, privacy, retention policies.
- `docs/TROUBLESHOOTING.md` – operational playbooks.
- `docs/RELEASE_CHECKLIST.md` – packaging and smoke tests.
- `docs/PROMPTS.md`, `docs/PUBLISHING.md`, `docs/FOLDER_STRUCTURE.md`, `docs/CONTRIBUTING.md`.

## Release
Follow `docs/RELEASE_CHECKLIST.md`, package with `vsce`, and smoke-test the VSIX in the local VS Code client on this workstation before publishing. Use versioned tags and keep CHANGELOG entries up to date.

