export type Platform =
  | 'Desktop Web'
  | 'Mobile Web'
  | 'Tablet'
  | 'Native iOS'
  | 'Native Android'
  | 'Desktop App';

export type UIType =
  | 'Dashboard'
  | 'Landing Page'
  | 'Form / Input Flow'
  | 'Settings Panel'
  | 'E-commerce Product / Checkout'
  | 'Marketing Page'
  | 'Component-Level UI'
  | 'Generic Interface';

export type Audience =
  | 'General Public'
  | 'Enterprise Users'
  | 'Accessibility-Focused'
  | 'Mobile-First Users'
  | 'Developer / Technical Users';

export interface AnalysisMetadata {
  platform: Platform;
  uiType: UIType;
  audience: Audience;
  defaultsApplied?: boolean;
}

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RegionCategory =
  | 'spacing_alignment'
  | 'typography'
  | 'color_contrast'
  | 'interaction_targets'
  | 'navigation_ia'
  | 'design_system_drift'
  | 'visual_hierarchy'
  | 'feedback_states';

export interface RegionClassification {
  category: RegionCategory;
  subcategory: string;
}

export interface RegionSeverity {
  level: 'low' | 'medium' | 'high';
  score: number;
}

export type IssueType = 'hard' | 'soft';

export interface RegionFinding {
  bounds: RegionBounds;
  classification: RegionClassification;
  severity: RegionSeverity;
  notes: string[];
  issueType?: IssueType; // Hard: accessibility violations, unreadable text, broken interactions
                         // Soft: style preferences, density suggestions
}

export interface AttentionGridValues {
  width: number;
  height: number;
  values: number[][];
}

export interface AttentionGrid {
  grid: AttentionGridValues;
  source: string;
  normalization: string;
}

export interface AnalysisSummary {
  strengths: string[];
  weaknesses: string[];
}

export interface AgentFindings {
  spacing: string[];
  typography: string[];
  contrast: string[];
  interaction: string[];
  navigation: string[];
  designSystem: string[];
}

export interface AnalysisMetrics {
  regionCoverage: number; // % of image area covered by regions
  categoryCoverage: Record<RegionCategory, boolean>; // Which categories detected
  expectedCategories: RegionCategory[]; // Expected categories for UI type
  missingCategories: RegionCategory[]; // Expected but not detected
}

export interface AnalysisState {
  metadata: AnalysisMetadata | null;
  regions: RegionFinding[];
  attentionGrid: AttentionGrid | null;
  summary: AnalysisSummary | null;
  warnings: string[];
  lastScreenshotUri?: string;
  agentFindings: AgentFindings;
  metrics?: AnalysisMetrics;
}

export const DEFAULT_METADATA: AnalysisMetadata = {
  platform: 'Desktop Web',
  uiType: 'Generic Interface',
  audience: 'General Public',
  defaultsApplied: true,
};

export const emptyAgentFindings = (): AgentFindings => ({
  spacing: [],
  typography: [],
  contrast: [],
  interaction: [],
  navigation: [],
  designSystem: [],
});

