# Changelog

All notable changes to the AgentUX VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-12-02

### Fixed
- Fixed missing runtime dependencies (`node-fetch`, `web-streams-polyfill`, `whatwg-url`, and transitive dependencies) causing activation failures
- Fixed screenshot loading in webview for images outside workspace folders by adding proper `localResourceRoots` configuration
- Fixed `fsPath` undefined errors when selecting screenshots from external directories (Desktop, Downloads, Temp, etc.)
- Fixed OpenAI client lazy-loading to prevent activation crashes
- Improved path resolution with robust validation and retry logic for file copying
- Fixed extension icon display in VS Code marketplace

### Changed
- Changed activation events from `onStartupFinished` to command-specific activation for better performance
- Improved error handling with user-friendly messages and proper logging
- Enhanced screenshot persistence with retry logic for Windows file-lock scenarios

### Added
- Added comprehensive dependency bundling to ensure all runtime modules are included
- Added visual and descriptive output documentation in README
- Added keywords to package.json for better marketplace discoverability

## [0.1.0] - 2025-11-29

### Added
- Initial release of AgentUX extension
- OpenAI Vision API integration with strict JSON validation
- Multi-agent UX analysis pipeline (8 categories: spacing, typography, contrast, interaction, navigation, design-system, visual-hierarchy, feedback-states)
- Interactive webview with screenshot overlay, bounding boxes, and attention heatmap
- Category-based descriptive findings with actionable recommendations
- Context capture (platform, UI type, audience) via Q&A dialog
- Secure API key storage using VS Code SecretStorage
- Export functionality (JSON/Markdown/SVG/PNG)
- Command palette integration and context menu support for image files

