# Accuracy Improvement Plan

## Priority Order (Confirmed)

1. **Strict JSON + Q&A Integration** (fixes 80% of current problems)
2. **Region Normalization + Merge Rules**
3. **Region Cap (≤25)**
4. **Hard vs Soft Classification**
5. **Simple Coverage Metrics**
6. **Precision/Recall** (after labeled data)

---

## 1. Strict JSON + Q&A Integration Enhancement

### Current State
- ✅ Strict JSON validation already implemented
- ✅ Q&A metadata included in prompt
- ⚠️ Q&A context could be more explicit/actionable

### Implementation Plan

#### 1.1 Enhance Q&A Context in Vision Prompt

**File**: `src/utils/prompt.ts`

**Changes**:
- Add explicit platform-specific instructions
- Add UI type-specific expectations
- Add audience-specific severity thresholds

**Example Enhancement**:
```typescript
export const buildVisionPrompt = (metadata: AnalysisMetadata): string => {
  const platformGuidance = getPlatformGuidance(metadata.platform);
  const uiTypeGuidance = getUITypeGuidance(metadata.uiType);
  const audienceGuidance = getAudienceGuidance(metadata.audience);
  
  return `
Analyze the provided UI screenshot and return strict JSON matching /docs/SCHEMA.md.

Context:
- Platform: ${metadata.platform}
  ${platformGuidance}
- UI Type: ${metadata.uiType}
  ${uiTypeGuidance}
- Audience: ${metadata.audience}
  ${audienceGuidance}

[... rest of prompt ...]
`;
};
```

**Helper Functions Needed**:
- `getPlatformGuidance(platform)`: Returns specific instructions
  - Desktop Web: "Expect consistent 16px gutters, mouse-sized targets (≥44px)"
  - Mobile Web: "Expect touch targets ≥44px, generous spacing, readable text ≥16px"
  - Native iOS: "Follow Apple HIG patterns, expect 44x44pt touch targets"
  - Native Android: "Follow Material Design, expect 48dp touch targets"
  
- `getUITypeGuidance(uiType)`: Returns UI-specific expectations
  - Dashboard: "Focus on data density, chart readability, information hierarchy"
  - Landing Page: "Focus on hero section, CTAs, visual hierarchy, conversion flow"
  - Form: "Focus on label clarity, input spacing, validation feedback, error states"
  
- `getAudienceGuidance(audience)`: Returns audience-specific thresholds
  - Enterprise Users: "Tolerate higher density, expect complex workflows"
  - Accessibility-Focused: "Strict contrast requirements (WCAG AA minimum), larger touch targets"
  - General Public: "Prioritize clarity and simplicity over density"

**Expected Impact**: More accurate region detection and severity scoring from Vision API

---

## 2. Region Normalization + Merge Rules

### Current State
- ✅ Image validation exists
- ✅ Duplicate region removal exists
- ❌ No normalization before Vision call
- ❌ No overlap merging

### Implementation Plan

#### 2.1 Screenshot Normalization

**File**: `src/utils/imageNormalization.ts` (new)

**Function**: `normalizeImage(imagePath: string, maxWidth: number = 1200): Promise<string>`

**Logic**:
1. Read image
2. If width > maxWidth, scale down maintaining aspect ratio
3. Save normalized image to temp location
4. Return temp path

**Integration**: Call before Vision API in `src/utils/visionClient.ts`

**Considerations**:
- Use `sharp` or `pngjs` for resizing
- Maintain aspect ratio
- Preserve original for overlay rendering
- Clean up temp files after analysis

#### 2.2 Overlapping Region Merging

**File**: `src/utils/regionPostProcessing.ts` (enhance existing)

**New Function**: `mergeOverlappingRegions(regions: RegionFinding[], iouThreshold: number = 0.5): RegionFinding[]`

**Logic**:
1. Calculate IoU (Intersection over Union) for all region pairs
2. If IoU > threshold:
   - If same category: Merge bounds (union), keep highest severity
   - If different categories: Merge bounds, combine categories (or keep primary)
3. Return merged regions

**IoU Calculation**:
```typescript
function calculateIoU(box1: Bounds, box2: Bounds): number {
  const intersection = {
    x: Math.max(box1.x, box2.x),
    y: Math.max(box1.y, box2.y),
    width: Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x),
    height: Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y),
  };
  
  if (intersection.width <= 0 || intersection.height <= 0) return 0;
  
  const intersectionArea = intersection.width * intersection.height;
  const unionArea = (box1.width * box1.height) + (box2.width * box2.height) - intersectionArea;
  
  return intersectionArea / unionArea;
}
```

**Merge Strategy**:
- Same category: Merge bounds (union), keep highest severity, combine notes
- Different categories: Option A) Keep both categories, Option B) Keep primary category
- Recommendation: Option A (preserve category information)

**Integration**: Add to `postProcessRegions()` function after duplicate removal

**Expected Impact**: Cleaner region set, fewer redundant findings

---

## 3. Region Cap (≤25)

### Current State
- ❌ No region limit

### Implementation Plan

**File**: `src/utils/regionPostProcessing.ts` (enhance existing)

**Function**: `capRegions(regions: RegionFinding[], maxRegions: number = 25): RegionFinding[]`

**Logic**:
1. Sort regions by severity score (descending)
2. Keep top `maxRegions`
3. Return capped list

**Integration**: Add to `postProcessRegions()` as final step

**Considerations**:
- Sort by `severity.score` (not `severity.level`)
- Log how many regions were filtered
- Make `maxRegions` configurable (default 25)

**Expected Impact**: Focus on most important issues, reduce noise

---

## 4. Hard vs Soft Classification

### Current State
- ❌ No distinction between hard errors and soft suggestions

### Implementation Plan

#### 4.1 Add Classification to Types

**File**: `src/types/analysis.ts`

**Add to `RegionFinding`**:
```typescript
interface RegionFinding {
  // ... existing fields ...
  issueType?: 'hard' | 'soft'; // Hard: accessibility violations, unreadable text
                                // Soft: style preferences, density suggestions
}
```

#### 4.2 Classification Rules

**File**: `src/utils/issueClassification.ts` (new)

**Function**: `classifyIssueType(region: RegionFinding, metadata: AnalysisMetadata): 'hard' | 'soft'`

**Rules**:

**Hard Errors** (must fix):
- `color_contrast`: Severity high OR audience is Accessibility-Focused
- `typography`: Font size < 12px (desktop) or < 16px (mobile)
- `interaction_targets`: Target < 44px on touch platforms
- `navigation_ia`: Missing primary actions, broken navigation
- Any issue with severity.high AND score > 0.7

**Soft Suggestions** (nice to have):
- `spacing_alignment`: Density preferences, alignment nitpicks
- `design_system_drift`: Style inconsistencies
- `visual_hierarchy`: Layout preferences
- Low severity issues (score < 0.4)

#### 4.3 Update Agents

**Files**: All agent files

**Changes**: Each agent should classify findings as hard/soft when appending

**Example**:
```typescript
const issueType = classifyIssueType(region, state.metadata);
appendFinding(state, 'contrast', message, issueType);
```

#### 4.4 Update UI

**File**: `src/webview/template.ts`

**Changes**:
- Separate "Critical Issues" (hard) from "Suggestions" (soft)
- Visual distinction (red vs yellow, icons, etc.)
- Sort hard issues first

**Expected Impact**: Users see critical issues first, better perceived accuracy

---

## 5. Simple Coverage Metrics

### Current State
- ❌ No coverage tracking

### Implementation Plan

#### 5.1 Add Metrics to Analysis State

**File**: `src/types/analysis.ts`

**Add to `AnalysisState`**:
```typescript
interface AnalysisMetrics {
  regionCoverage: number; // % of image area covered by regions
  categoryCoverage: Record<RegionCategory, boolean>; // Which categories detected
  uiTypeCoverage: string[]; // Expected categories for UI type
}

interface AnalysisState {
  // ... existing fields ...
  metrics?: AnalysisMetrics;
}
```

#### 5.2 Calculate Metrics

**File**: `src/utils/coverageMetrics.ts` (new)

**Functions**:
- `calculateRegionCoverage(regions: RegionFinding[], imageWidth: number, imageHeight: number): number`
  - Calculate total area covered by regions (with overlap handling)
  - Return as percentage of image area

- `calculateCategoryCoverage(regions: RegionFinding[]): Record<RegionCategory, boolean>`
  - Check which categories are present
  - Return boolean map

- `getExpectedCategories(uiType: string): RegionCategory[]`
  - Return expected categories for UI type
  - Example: Form → ['spacing_alignment', 'typography', 'interaction_targets', 'color_contrast']

#### 5.3 Integration

**File**: `src/agents/pipeline.ts` or new `metricsAgent.ts`

**Add metrics calculation after region processing**

**Expected Impact**: Visibility into what's being analyzed, identify gaps

---

## 6. Precision/Recall (After Labeled Data)

### Current State
- ❌ No metrics infrastructure

### Implementation Plan (Future)

**Requirements**:
- Labeled test set (20+ screenshots with ground truth)
- Ground truth format: JSON with labeled regions and expected findings

**Infrastructure**:
- `tests/metrics/` directory
- `scripts/calculate-metrics.ts` - Compare agent output to ground truth
- Track TP, FP, FN per agent
- Calculate precision/recall per agent

**Deferred**: Implement after labeled data is available

---

## Implementation Order

1. **Week 1**: Enhance Q&A prompt (1.1)
2. **Week 1**: Add region normalization (2.1)
3. **Week 1**: Add overlap merging (2.2)
4. **Week 1**: Add region cap (3)
5. **Week 2**: Add hard/soft classification (4)
6. **Week 2**: Add coverage metrics (5)
7. **Future**: Precision/recall when labeled data available (6)

---

## Success Criteria

- **Q&A Enhancement**: Vision API returns more contextually appropriate regions
- **Normalization**: Consistent Vision API behavior across image sizes
- **Merging**: 20-30% reduction in duplicate/overlapping regions
- **Region Cap**: Focus on top 25 issues, reduce noise
- **Hard/Soft**: Users can quickly identify critical issues
- **Coverage**: Visibility into analysis completeness

---

## Testing Strategy

1. **Before/After Comparison**: Run same screenshots before/after each change
2. **Manual Review**: Review region quality improvements
3. **Metrics Tracking**: Monitor coverage metrics over time
4. **User Feedback**: Collect feedback on hard/soft classification usefulness

