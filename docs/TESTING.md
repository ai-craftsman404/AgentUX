# TESTING.md — AgentUX DevTestOps Strategy

Testing is non-negotiable. Every change must run the suites below, capture artefacts, and verify outputs. Use mocked Vision responses wherever possible; reserve real API calls for late-stage confidence checks.

## 1. Static Analysis
- `npm run lint` – TypeScript/ESLint.
- `npm audit` – dependency vulnerabilities.
- `npm run typecheck` – TypeScript compiler.
- Custom scripts should fail the pipeline on warnings.

## 2. Unit Tests
- Framework: Jest + ts-jest (or vitest) with React Testing Library for webview fragments.
- Scope:
  - Each agent’s pure logic (spacing, typography, etc.) given mocked metadata combinations.
  - JSON repair & validation utilities.
  - Prompt builder to ensure strict JSON instructions.
- Fixtures: place under `tests/fixtures/vision/*.json` with metadata-specific filenames.
- Command: `npm run test:unit -- --coverage`.
- Coverage target: ≥80% overall, ≥90% for agents and JSON validation modules.

## 3. Integration Tests
- Full pipeline runs using mocked Vision outputs.
- Assert `analysisState` structure, metadata propagation, agent sequencing, and export payloads.
- Include scenarios for:
  - default metadata (user skipped Q&A),
  - accessibility-focused UI,
  - dense enterprise dashboard,
  - mobile-first UIs.
- Command: `npm run test:integration`.

## 4. API / Contract Tests
- Validate that Vision request payloads match the schema and prompt template.
- Ensure exporters honour `/docs/SCHEMA.md` and `/docs/SCHEMA_VERSIONING.md`.
- Use schema snapshots to detect unintended changes.

## 5. Regression Tests
- Snapshot category summaries, export outputs, and heatmap data for a curated fixture set (see `docs/TEST_FIXTURES.md`).
- Automate snapshot verification with Jest or dedicated tooling.

## 6. Functional / UI Tests
- Use browser tools for rapid manual verification during development (hover linking, keyboard navigation, overlay toggles).
- Codify key flows in Playwright MCP suites to ensure determinism:
  - Opening the analysis panel.
  - Selecting regions via click + keyboard.
  - Adjusting heatmap opacity.
  - Exporting JSON/MD/SVG/PNG.

## 7. Accessibility Tests
- Run axe-core (via Playwright or standalone) against the rendered webview HTML in light/dark themes.
- Validate keyboard-only navigation, focus management, ARIA labels, and high-contrast compatibility.

## 8. Visual Regression
- Playwright MCP screenshot comparisons across viewports:
  - 1280×800 desktop.
  - 1024×768 tablet.
  - 390×844 mobile (scaled view).
- Include heatmap opacity variations and selection states.

## 9. Performance / Load Tests
- Measure heatmap render time and overlay interaction latency using PerformanceObserver hooks.
- Ensure average render <16ms per frame on medium screenshots (approx. 1500×900).
- Track memory usage for repeated analyses to guard against leaks.

## 10. Security Tests
- `npm audit` (already covered) plus manual verification that no secrets leak in logs.
- Fuzz Vision response repair to make sure invalid JSON never bypasses validation.
- Simulate malicious inputs (oversized arrays, negative bounds) to confirm safe handling.

## 11. End-to-End (Playwright MCP)
- Automate complete flows:
  1. Launch extension host.
  2. Mock Vision response.
  3. Provide metadata answers.
  4. Verify overlays, exports, keyboard shortcuts.
- Produce video/screenshot evidence for review.
- Clean up processes with Ctrl+C after each run.

## 12. Smoke Tests
- After packaging a VSIX:
  - Install locally in VS Code on this workstation.
  - Run “Analyse Screenshot” with desktop + mobile fixtures.
  - Toggle themes, exports, and selection behaviours.
- Record manual observations in release notes.

## 13. Environment / Configuration Checks
- Confirm commands behave identically on Windows, macOS, Linux (CI matrix).
- Validate SecretStorage flow by clearing keys and re-running Q&A prompts.
- Ensure default metadata is applied when Q&A is skipped.

## 14. Tooling Guidance
- **Browser Tools**: use for exploratory manual testing, verifying UI tweaks, and capturing quick screenshots.
- **Playwright MCP**: use for automated E2E, visual regression, accessibility, and multi-viewport coverage. It should be part of CI and run locally before commits.
- Document test commands in `package.json` scripts so CI can call them uniformly.

## 15. Fixtures & Outliers
- Maintain fixture catalogue in `docs/TEST_FIXTURES.md` (see that file for sources, metadata, expected behaviours).
- Cover at least:
  - Light/dark modes.
  - Dense enterprise dashboards.
  - Minimal landing pages.
  - Accessibility-focused forms.
  - Mobile-first layouts.
  - Screenshots with extremely low contrast or tiny tap targets.

## 16. Real API Validation
- Once all mocked tests pass, run a small curated set of real analyses (desktop + mobile) using the stored API key.
- Capture the raw Vision JSON (sanitised) and confirm it passes schema validation without repairs.
- Record findings for future regression comparison.

