# CONTRIBUTING.md — AgentUX

## 1. Workflow
1. Create a feature branch: `git checkout -b feat/<short-description>`.
2. Implement changes, keeping code modular and DRY.
3. Update relevant docs in `/docs` (especially when touching schema, pipeline, or webview).
4. Run the full DevTestOps suite (see `docs/TESTING.md`).
5. Open a PR with:
   - Summary of changes.
   - Tests run (include links to artefacts/screenshots).
   - Checklist confirming docs and schema updates.

## 2. Commit Conventions
- Use present tense, concise messages.
- Reference issues when applicable.
- Example: `feat: add heatmap opacity control`.

## 3. Code Style
- TypeScript throughout extension/agents; vanilla JS/TS in webview.
- Prefer pure functions; limit mutation to `analysisState`.
- Follow British English in comments/docs.
- No external UI frameworks in the webview.

## 4. Testing Requirements
- Refer to `docs/TESTING.md` for the exhaustive matrix.
- Browser tools are for exploratory/manual checks; Playwright MCP provides automated E2E/visual/accessibility coverage.
- Capture artefacts (screenshots, logs, coverage reports) for review.

## 5. Schema & Pipeline Changes
- Update `/docs/SCHEMA.md`, `/docs/SCHEMA_VERSIONING.md`, `/docs/PIPELINE.md`, and `/docs/AGENTS_SPEC.md`.
- Add migration logic where required.
- Note changes in the changelog before release.

## 6. Release Readiness
- Follow `docs/RELEASE_CHECKLIST.md`.
- Package a VSIX, install in the local VS Code client, and re-run smoke tests.
- Ensure version bumps and documentation updates are part of the same PR where feasible.

## 7. Communication
- Document significant architectural decisions (consider lightweight ADRs if needed).
- When in doubt about strict JSON handling, metadata usage, or testing scope, consult `AGENTS.md` first.

