# TEST_FIXTURES.md — Reference Screenshot Set

Use publicly available screenshots or internally approved mockups. Store them under `tests/fixtures/screenshots/` with descriptive names. Capture metadata (platform, UI type, audience) alongside each fixture for deterministic tests.

| Fixture ID | Description | Source / Notes | Metadata | Expected Behaviours |
|------------|-------------|----------------|----------|---------------------|
| `desktop-dashboard-light` | Enterprise analytics dashboard with dense tables and charts. | Example: public SaaS marketing screenshots (ensure licence). | Platform: Desktop Web; UI Type: Dashboard; Audience: Enterprise Users. | Tests spacingAgent tolerance for density, navigationAgent handling of complex IA, Playwright visual regression for light theme. |
| `desktop-dashboard-dark` | Same dashboard in dark mode. | Create via design tool if needed. | Platform: Desktop Web; UI Type: Dashboard; Audience: Developer / Technical Users. | Ensures heatmap contrast on dark backgrounds, accessibility checks for light text. |
| `mobile-landing` | Mobile marketing hero with CTA. | Capture from responsive demo (375×812). | Platform: Mobile Web; UI Type: Landing Page; Audience: General Public. | Exercises tap target sizing, typography scaling, layout responsiveness. |
| `mobile-form-accessibility` | High-contrast form with accessibility cues. | Build mock if necessary. | Platform: Mobile Web; UI Type: Form / Input Flow; Audience: Accessibility-Focused. | Validates contrastAgent strictness, keyboard navigation warnings, error messaging. |
| `tablet-ecommerce` | Tablet product page with carousel. | Public e-commerce sample. | Platform: Tablet; UI Type: E-commerce Product / Checkout; Audience: General Public. | Tests navigationAgent (primary/secondary actions), spacing on tablet density. |
| `component-modal` | Standalone modal/dialog component. | Internal mock. | Platform: Desktop Web; UI Type: Component-Level UI; Audience: General Public. | Covers small bounding boxes, overlay selection, export accuracy for minimal regions. |

## Usage Notes
- Store accompanying metadata JSON (e.g., `desktop-dashboard-light.meta.json`) describing Q&A answers and expected agent highlights.
- Include baseline Vision JSON outputs (mocked) for unit/integration/regression tests.
- When sourcing from the web, ensure licensing permits internal testing use.
- Keep fixtures lightweight (<2 MB) to avoid slowing Playwright runs.

## Test Coverage Mapping
- Each fixture must be referenced in:
  - Unit tests (agent-specific scenarios).
  - Integration/regression snapshots.
  - Playwright MCP E2E scripts (multi-viewport as applicable).
  - Manual smoke tests when packaging releases.

