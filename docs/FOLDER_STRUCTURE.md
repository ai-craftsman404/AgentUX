# FOLDER_STRUCTURE.md — AgentUX Layout

```
agentux/
├── AGENTS.md
├── README.md
├── package.json
├── tsconfig.json
├── extension.ts
├── /docs
│   ├── ARCHITECTURE.md
│   ├── PIPELINE.md
│   ├── SCHEMA.md
│   ├── SCHEMA_VERSIONING.md
│   ├── AGENTS_SPEC.md
│   ├── CONFIGURATION.md
│   ├── SECURITY.md
│   ├── WEBVIEW.md
│   ├── TESTING.md
│   ├── TEST_FIXTURES.md
│   ├── TROUBLESHOOTING.md
│   ├── PROMPTS.md
│   ├── PUBLISHING.md
│   ├── RELEASE_CHECKLIST.md
│   └── CONTRIBUTING.md
├── /agents
│   ├── regionSegmenter.ts
│   ├── categoryClassifier.ts
│   ├── spacingAgent.ts
│   ├── typographyAgent.ts
│   ├── contrastAgent.ts
│   ├── interactionAgent.ts
│   ├── navigationAgent.ts
│   ├── designSystemAgent.ts
│   ├── recommendationAgent.ts
│   └── heatmapBuilder.ts
├── /types
│   ├── analysisState.ts
│   ├── region.ts
│   └── attentionGrid.ts
├── /utils
│   ├── apiKey.ts
│   ├── fetchVision.ts
│   ├── qnaFlow.ts
│   ├── sharedState.ts
│   ├── jsonRepair.ts
│   └── logger.ts
├── /webview
│   ├── index.html
│   ├── main.ts
│   └── styles.css
└── /tests
    ├── fixtures/
    ├── unit/
    ├── integration/
    └── e2e/
```

Adjust file names as the project evolves, but maintain the separation of concerns (agents, utils, webview, docs, tests).

