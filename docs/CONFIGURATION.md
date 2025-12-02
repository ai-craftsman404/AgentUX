# CONFIGURATION.md — AgentUX Configuration & Secrets

## 1. API Keys
- Stored via **VS Code SecretStorage**, never `.env`.
- Keys are never written to disk or logs.
- Access keys only when running analysis.
- Command: `UX Audit: Set OpenAI API Key`.

## 2. Screenshot Privacy
- Screenshots stay local.
- Only sent to OpenAI Vision during explicit analysis.
- Never cached or uploaded elsewhere.
- Removed from memory after analysis (unless user exports).

## 3. Consent Model
- User must manually trigger “Analyse Screenshot”.
- No background or automatic capture.

## 4. Data Retention
- No persistent storage of screenshots or Vision outputs.
- Exports occur only when initiated by the user.
- Temporary analysis state is cleared between sessions.

## 5. Configuration Values
- Stored in `analysisState.metadata`:
  - `platform`
  - `uiType`
  - `audience`
  - `defaultsApplied` (optional flag when Q&A skipped)
- Defaults:
  - `Desktop Web`, `Generic Interface`, `General Public`.

## 6. Logging
- Sanitised only; no API keys, screenshot paths, extracted text, or raw Vision JSON.
- Include metadata pointers and agent names for troubleshooting.

## 7. Environment Parity
- Extension must run identically in:
  - Local VS Code
  - Remote SSH
  - WSL
  - Codespaces
- Avoid platform-specific paths; rely on VS Code APIs.

