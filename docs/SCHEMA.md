# SCHEMA.md — Strict JSON Schema (AgentUX)

## Region
```json
{
  "bounds": { "x": 0, "y": 0, "width": 0, "height": 0 },
  "classification": {
    "category": "spacing_alignment|typography|color_contrast|interaction_targets|navigation_ia|design_system_drift|visual_hierarchy|feedback_states",
    "subcategory": "string"
  },
  "severity": { "level": "low|medium|high", "score": 0.0 },
  "notes": ["string"]
}
```

## Attention Grid
```json
{
  "grid": {
    "width": 28,
    "height": 16,
    "values": [[0.1, 0.2], [0.5, 0.7]]
  },
  "source": "vision",
  "normalization": "minmax"
}
```

## Summary
```json
{
  "strengths": ["string"],
  "weaknesses": ["string"]
}
```

## Validation Rules
- Reject any response containing ellipses (`"..."`).
- Attempt repair with `jsonrepair` if helpful, but never guess missing segments.
- After parsing, validate field names, types, and array completeness.
- `notes`, `strengths`, and `weaknesses` must be arrays of strings (no prose outside JSON).
- `bounds.width`/`bounds.height` must be positive integers within the screenshot dimensions.
- `attention_grid.values` must be a fully populated 2D array sized `height × width`.

See `docs/SCHEMA_VERSIONING.md` for version bump rules and upgrade requirements.

