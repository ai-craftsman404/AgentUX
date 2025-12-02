# RELEASE_CHECKLIST.md — AgentUX

## 1. Pre-release
- [ ] Update `package.json` version (semver).
- [ ] Update CHANGELOG with highlights and testing summary.
- [ ] Verify schema/doc changes (`docs/SCHEMA.md`, `docs/SCHEMA_VERSIONING.md`, `docs/AGENTS_SPEC.md`).
- [ ] Confirm prompts updated (`docs/PROMPTS.md` + builder).
- [ ] Run full test suite:
  - Static analysis (`npm run lint`, `npm run typecheck`, `npm audit`).
  - Unit tests with coverage.
  - Integration + regression.
  - Playwright MCP E2E/visual/accessibility (desktop/tablet/mobile).
  - Performance checks (heatmap latency).
  - Security scans/fuzzing for JSON repair.
  - Smoke tests using browser (manual verification).
- [ ] Archive artefacts (coverage report, screenshots, logs).

## 2. Build
- [ ] `npm run compile`
- [ ] `vsce package`
- [ ] Ensure `agentux-x.y.z.vsix` is produced alongside SHA hash.

## 3. Smoke Test VSIX
- [ ] Install VSIX in the local VS Code client on this workstation.
- [ ] Run desktop + mobile analyses using fixtures.
- [ ] Toggle light/dark themes.
- [ ] Verify Q&A flow, heatmap controls, region selection, exports.
- [ ] Check keyboard shortcuts (Ctrl+A select all, Escape clear).
- [ ] Confirm no errors in Developer Tools console.

## 4. Publish
- [ ] `vsce login <publisher>`
- [ ] `vsce publish`
- [ ] Verify listing metadata (description, screenshots, icon).

## 5. Post-release
- [ ] Monitor Marketplace dashboard for errors/crash reports.
- [ ] Keep previous VSIX ready for rollback.
- [ ] Announce release notes (internal or public).

## 6. Rollback Plan
- Repackage the previous working version.
- Publish with the prior version number (increment patch if required).
- Communicate to users if a rollback occurs.

