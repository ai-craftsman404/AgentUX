import { z } from 'zod';
import { RegionCategory } from '../types';

const regionCategoryEnum = z.enum([
  'spacing_alignment',
  'typography',
  'color_contrast',
  'interaction_targets',
  'navigation_ia',
  'design_system_drift',
  'visual_hierarchy',
  'feedback_states',
] as [RegionCategory, ...RegionCategory[]]);

const boundsSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const severitySchema = z.object({
  level: z.enum(['low', 'medium', 'high']),
  score: z.number().min(0).max(1),
});

const regionSchema = z.object({
  bounds: boundsSchema,
  classification: z.object({
    category: regionCategoryEnum,
    subcategory: z.string().min(1),
  }),
  severity: severitySchema,
  notes: z.array(z.string().min(1)),
});

const gridValuesSchema = z
  .array(z.array(z.number().finite()))
  .superRefine((values, ctx) => {
    // Allow empty array for "no analysis" state (width=0, height=0)
    if (values.length === 0) {
      return;
    }
    const rowLength = values[0]?.length;
    if (!rowLength) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'attention_grid.values must be a 2D array with consistent lengths',
      });
      return;
    }
    for (const row of values) {
      if (row.length !== rowLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'attention_grid.values rows must have equal length',
        });
        return;
      }
    }
  });

const attentionGridSchema = z.object({
  grid: z.object({
    // Allow 0 dimensions as valid "no analysis possible" state
    width: z.number().int().min(0),
    height: z.number().int().min(0),
    values: gridValuesSchema,
  }).superRefine((grid, ctx) => {
    // If dimensions are > 0, values must match
    if (grid.width > 0 && grid.height > 0) {
      if (grid.values.length !== grid.height) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `attention_grid.values length (${grid.values.length}) must match height (${grid.height})`,
          path: ['values'],
        });
      }
      if (grid.values.length > 0 && grid.values[0]?.length !== grid.width) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `attention_grid.values row length (${grid.values[0]?.length}) must match width (${grid.width})`,
          path: ['values'],
        });
      }
    }
    // If dimensions are 0, values should be empty
    if (grid.width === 0 || grid.height === 0) {
      if (grid.values.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'attention_grid.values must be empty when width or height is 0',
          path: ['values'],
        });
      }
    }
  }),
  source: z.string().min(1),
  normalization: z.string().min(1),
});

const summarySchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const visionResponseSchema = z.object({
  regions: z.array(regionSchema),
  attention_grid: attentionGridSchema,
  summary: summarySchema,
});

export type VisionResponse = z.infer<typeof visionResponseSchema>;

