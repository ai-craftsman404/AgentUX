# SECURITY.md — AgentUX Security Guidelines

## 1. API Key Protection
- Store keys via VS Code SecretStorage only.
- Never log, persist, or transmit keys outside the Vision request.
- Do not embed keys in URLs, filenames, or telemetry.

## 2. Screenshot Handling
- Screenshots remain on the user’s machine.
- Only uploaded to OpenAI Vision when analysis is requested.
- Delete any temporary copies after processing.
- No telemetry or analytics derived from screenshots.

## 3. Logging Redaction
- Logs must omit:
  - API keys.
  - Screenshot paths or filenames.
  - Extracted text.
  - Raw Vision responses.
- Logs may include:
  - Sanitised error codes.
  - Agent names and statuses.
  - Metadata categories (platform/uiType/audience) if helpful.

## 4. Error Handling for Potential Leaks
- If Vision reports invalid/compromised credentials:
  - Show: “API key may be invalid or exposed—please rotate and reset the key.”
  - Prompt user to rerun the `Set API Key` command.

## 5. Security Boundaries
- Enforce strong CSP in the webview (nonce-based scripts, no eval).
- Prohibit external CDNs or fonts; bundle assets locally.
- Load screenshots via `asWebviewUri()`.

## 6. Dependency Hygiene
- Keep dependencies minimal and audited (`npm audit`).
- Pin versions where feasible to avoid supply-chain surprises.
- Review new packages for licence compatibility and footprint.

## 7. User Data Policy
- No tracking, telemetry, or analytics.
- No personal data collection.
- Operate entirely within the user’s VS Code session.

