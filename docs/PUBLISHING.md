# PUBLISHING.md — VS Code Marketplace Release

## 1. Install vsce
```bash
npm install -g vsce
```

## 2. Prepare `package.json`
- `name`: `agentux`
- `displayName`: `AgentUX`
- `publisher`: `<your_publisher_id>`
- `version`: semantic version (see `docs/RELEASE_CHECKLIST.md`)
- `icon`: `assets/icon.png` (must exist; provide manually)
- Activation events:
  - `onCommand:agentux.analyzeScreenshot`
  - `onCommand:agentux.setApiKey`
  - Others as needed.

## 3. Build
```bash
npm install
npm run compile
```

## 4. Package
```bash
vsce package
```
Outputs `agentux-x.y.z.vsix`.

## 5. Test Locally
1. VS Code → Extensions → “Install from VSIX…”.
2. Run through the smoke test checklist (desktop + mobile fixtures, light/dark themes, exports, Q&A flow).

## 6. Publish
1. Create VS Code Marketplace publisher if not already registered.
2. Generate a PAT with “Marketplace: Manage” scope.
3. Login via `vsce login <publisher>`.
4. Publish: `vsce publish`.

## 7. Required Assets
- `assets/icon.png` (128×128).
- Marketplace screenshots (showing webview, heatmap, overlays).
- Optional: banner image.

## 8. Versioning
- Follow semver:
  - Patch (`0.0.x`) – bug fixes.
  - Minor (`0.x.0`) – new features/backward-compatible changes.
  - Major (`x.0.0`) – breaking changes (see `docs/SCHEMA_VERSIONING.md`).
- Update README + changelog for user-visible changes.

## 9. Rollback Strategy
- If a release fails, republish the previous VSIX version and mark the problematic release as deprecated in the Marketplace listing.

