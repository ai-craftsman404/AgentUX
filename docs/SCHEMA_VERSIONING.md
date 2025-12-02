# SCHEMA_VERSIONING.md — AgentUX Schema Evolution Rules

## 1. Versioning Scheme
- Use `vMajor.Minor.Patch` (e.g., `v1.0.0`, `v1.1.0`).
- Major: breaking changes.
- Minor: backward-compatible additions.
- Patch: bug fixes / clarifications.

## 2. Compatible Changes (Minor)
Allowed:
- Adding optional fields.
- Adding new categories/subcategories.
- Extending metadata with optional values.

Not allowed without major bump:
- Removing fields.
- Renaming fields.
- Changing required types or array structures.

## 3. Breaking Changes (Major)
Requires major version increment when:
- Renaming/removing existing fields.
- Changing required field types.
- Altering severity schema.
- Modifying array shapes (e.g., heatmap grid layout).

## 4. Migration Steps
Whenever schema changes:
1. Update `/docs/SCHEMA.md`.
2. Update prompt templates (`docs/PROMPTS.md`) and prompt builder code.
3. Modify agents/utilities to handle new fields or defaults.
4. Add migration logic in `sharedState.ts` if persisted data is affected.
5. Update regression tests and fixtures.
6. Document changes in the changelog/release notes.

## 5. Vision Prompt Sync
- Schema changes must be reflected immediately in prompts to ensure the model outputs the expected structure.
- Describe new fields clearly in the prompt template.

## 6. Release Policy
- Schema updates trigger version bumps in `package.json`.
- Communicate breaking changes in release notes.
- Run the full regression suite against all schema versions still supported (where feasible).

