# PROMPTS.md — Vision Prompt Templates (Strict JSON)

## 1. System Prompt
```
You are a UX analysis engine. Output ONLY valid JSON.
No comments, explanations, prose, markdown, or ellipses (...).
Arrays must contain full values, never truncated.
```

## 2. Vision Prompt Template
```
Analyze this UI screenshot and return:
{
  "regions": [
    {
      "bounds": { "x": int, "y": int, "width": int, "height": int },
      "classification": {
        "category": "...",
        "subcategory": "..."
      },
      "severity": {
        "level": "low|medium|high",
        "score": float
      },
      "notes": ["short actionable notes"]
    }
  ],
  "attention_grid": {
    "grid": {
      "width": int,
      "height": int,
      "values": [[float, float], ...]
    },
    "source": "vision",
    "normalization": "minmax"
  },
  "summary": {
    "strengths": ["..."],
    "weaknesses": ["..."]
  }
}

Rules:
- NO ellipses (...).
- NO truncated arrays.
- Provide full numeric arrays and strings only.
- No extra fields.
```

Metadata (platform, UI type, audience) is appended to the prompt as plain text context. Keep it concise and structured so Vision can reflect the expected density/interaction model.

## 3. Validation Checklist
After receiving the response:
1. Reject output containing `"..."`.
2. Attempt JSON repair if safe; abort if repair fails.
3. Parse JSON.
4. Validate against `/docs/SCHEMA.md`.
5. If invalid → show user warning and stop the pipeline.

Keep this file and the prompt builder in `/utils` in sync whenever the schema evolves.

