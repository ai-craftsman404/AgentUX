# TROUBLESHOOTING.md — AgentUX

## 1. Vision API Returns Invalid JSON
- **Symptoms**: parsing errors, empty regions, pixelated heatmap.
- **Actions**:
  - Inspect raw response for ellipses (`"..."`).
  - Run through `jsonrepair`.
  - Validate against `/docs/SCHEMA.md`.
  - If still invalid, show error and retry analysis.

## 2. API Key Invalid
- **Message**: “API key invalid or unauthorized”.
- **Fix**:
  - Run `UX Audit: Set OpenAI API Key`.
  - Verify key has Vision access.
  - Consider regenerating the key if leaked.

## 3. Webview Not Rendering
- **Checks**:
  - Ensure CSP allows bundled scripts (nonce in `script` tags).
  - Confirm screenshot URI uses `asWebviewUri()`.
  - Validate canvas sizes and that the webview receives analysis state via `postMessage`.

## 4. No Regions Detected
- **Causes**: small screenshot, Vision misclassification, missing metadata.
- **Fix**:
  - Rerun Q&A dialog to ensure metadata present.
  - Try higher-resolution screenshot.
  - Review prompt template for clarity.

## 5. Analysis Incomplete
- **Signs**: missing categories, partial export.
- **Fix**:
  - Check schema/agent warnings in logs.
  - Ensure `analysisState.metadata` is populated.
  - Re-run integration tests with the problematic fixture.

## 6. Rate Limits / Quota
- **Messages**: “Rate limit reached”, “Quota exceeded”.
- **Fix**:
  - Wait before retrying.
  - Batch tests using mocked responses.
  - Use real API only for final verification.

## 7. Pipeline Breakdown
- **Symptoms**: agent errors, missing heatmap.
- **Fix**:
  - Enable verbose logging for the failing agent.
  - Inspect `state.warnings`.
  - Verify parallel execution merges results correctly.

## 8. Packaging Issues
- **Symptoms**: VSIX install failure, missing assets.
- **Fix**:
  - Run `npm run compile` and ensure `dist/` exists.
  - Confirm `vsce package` includes `webview` assets and docs.
  - Double-check `package.json` `files` whitelist.

