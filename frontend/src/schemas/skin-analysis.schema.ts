import { z } from 'zod'

// ─── Upload ──────────────────────────────────────────────────────────────
export const uploadImageSchema = z.object({
  consent: z.boolean().refine((v) => v === true, {
    message: 'Consent is required before uploading facial images.',
  }),
})

export type UploadImageParams = z.infer<typeof uploadImageSchema>

export const uploadImageResponseSchema = z.object({
  blobUrl: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  width: z.number(),
  height: z.number(),
})

export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>

// ─── Analyze ─────────────────────────────────────────────────────────────
export const startAnalysisSchema = z.object({
  blobUrl: z.string().min(1, 'blobUrl is required'),
})

export type StartAnalysisParams = z.infer<typeof startAnalysisSchema>

export const startAnalysisResponseSchema = z.object({
  analysisId: z.string().uuid(),
  status: z.enum(['UPLOADING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  remainingDailyQuota: z.number(),
  estimatedWaitSeconds: z.number(),
})

export type StartAnalysisResponse = z.infer<typeof startAnalysisResponseSchema>

// ─── Latest ──────────────────────────────────────────────────────────────
export const latestAnalysisSchema = z.object({
  analysisId: z.string().uuid(),
  analysisDate: z.string().datetime(),
  healthScore: z.number(),
  hydration: z.number(),
  skinType: z.enum(['Combination', 'Oily', 'Dry', 'Normal', 'Sensitive']),
  skinAge: z.number(),
  remainingDailyQuota: z.number(),
})

export type LatestAnalysisResponse = z.infer<typeof latestAnalysisSchema>

// ─── Conditions & Findings ───────────────────────────────────────────────
export const conditionSchema = z.object({
  conditionId: z.string().uuid(),
  conditionName: z.enum(['acne', 'redness', 'texture', 'pigmentation', 'dryness', 'pore_size']),
  severity: z.enum(['NONE', 'MILD', 'MODERATE', 'SEVERE']),
  severityScore: z.number(),
  affectedArea: z.string(),
  description: z.string(),
})

export type ConditionDto = z.infer<typeof conditionSchema>

export const findingSchema = z.object({
  findingId: z.string().uuid(),
  findingType: z.enum(['PRIMARY', 'SECONDARY']),
  title: z.string(),
  description: z.string(),
  affectedArea: z.string(),
  severity: z.enum(['NONE', 'MILD', 'MODERATE', 'SEVERE']),
})

export type FindingDto = z.infer<typeof findingSchema>

// ─── Recommendations ─────────────────────────────────────────────────────
export const recommendationSchema = z.object({
  recommendationId: z.string().uuid(),
  productId: z.string().uuid(),
  productType: z.string(),
  productName: z.string(),
  reason: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  isHelpful: z.boolean().nullable(),
})

export type RecommendationDto = z.infer<typeof recommendationSchema>

// ─── Full Analysis Result ────────────────────────────────────────────────
export const findingsSchema = z.object({
  primaryConcerns: z.array(findingSchema),
  secondaryConcerns: z.array(findingSchema),
  overallAssessment: z.string(),
})

export type FindingsDto = z.infer<typeof findingsSchema>

export const analysisResultSchema = z.object({
  analysisId: z.string().uuid(),
  userId: z.string().uuid(),
  analysisDate: z.string().datetime(),
  status: z.enum(['UPLOADING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  skinType: z.enum(['Combination', 'Oily', 'Dry', 'Normal', 'Sensitive']),
  skinAge: z.number(),
  healthScore: z.number(),
  hydration: z.number(),
  confidence: z.number(),
  facialScanUrl: z.string(),
  meshOverlayUrl: z.string(),
  conditions: z.array(conditionSchema),
  findings: findingsSchema,
  recommendations: z.array(recommendationSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AnalysisResultResponse = z.infer<typeof analysisResultSchema>

// ─── History ─────────────────────────────────────────────────────────────
export const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

export type HistoryQueryParams = z.infer<typeof historyQuerySchema>

export const historyItemSchema = z.object({
  analysisId: z.string().uuid(),
  analysisDate: z.string().datetime(),
  healthScore: z.number(),
  hydration: z.number(),
  skinType: z.enum(['Combination', 'Oily', 'Dry', 'Normal', 'Sensitive']),
  skinAge: z.number(),
  status: z.enum(['UPLOADING', 'VALIDATING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
})

export const summarySchema = z.object({
  totalAnalyses: z.number(),
  bestScore: z.number(),
  averageHydration: z.number(),
  improvementPercentage: z.number(),
  firstAnalysisDate: z.string().nullable(),
  latestAnalysisDate: z.string().nullable(),
})

export type SummaryDto = z.infer<typeof summarySchema>

export const historyResponseSchema = z.object({
  items: z.array(historyItemSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
  summary: summarySchema,
})

export type HistoryResponse = z.infer<typeof historyResponseSchema>

// ─── Trends ──────────────────────────────────────────────────────────────
export const trendsQuerySchema = z.object({
  range: z.enum(['30d', '90d', '1y', 'all']).optional().default('all'),
})

export type TrendsQueryParams = z.infer<typeof trendsQuerySchema>

export const trendPointSchema = z.object({
  date: z.string(),
  value: z.number(),
  analysisId: z.string().uuid(),
})

export const trendsResponseSchema = z.object({
  healthScoreTrend: z.array(trendPointSchema),
  hydrationTrend: z.array(trendPointSchema),
  minPointsMet: z.boolean(),
})

export type TrendsResponse = z.infer<typeof trendsResponseSchema>

// ─── Compare ─────────────────────────────────────────────────────────────
export const compareAnalysesSchema = z.object({
  analysisId1: z.string().uuid(),
  analysisId2: z.string().uuid(),
})

export type CompareAnalysesParams = z.infer<typeof compareAnalysesSchema>

export const conditionChangeSchema = z.object({
  conditionName: z.enum(['acne', 'redness', 'texture', 'pigmentation', 'dryness', 'pore_size']),
  from: z.enum(['NONE', 'MILD', 'MODERATE', 'SEVERE']),
  to: z.enum(['NONE', 'MILD', 'MODERATE', 'SEVERE']),
  direction: z.enum(['IMPROVED', 'STABLE', 'REGRESSED']),
})

export type ConditionChangeDto = z.infer<typeof conditionChangeSchema>

export const comparisonResultSchema = z.object({
  analysis1: z.object({
    id: z.string().uuid(),
    date: z.string(),
    healthScore: z.number(),
    hydration: z.number(),
    skinAge: z.number(),
  }),
  analysis2: z.object({
    id: z.string().uuid(),
    date: z.string(),
    healthScore: z.number(),
    hydration: z.number(),
    skinAge: z.number(),
  }),
  scoreDelta: z.number(),
  hydrationDelta: z.number(),
  ageDelta: z.number(),
  daysBetween: z.number(),
  conditionChanges: z.array(conditionChangeSchema),
})

export type ComparisonResult = z.infer<typeof comparisonResultSchema>

// ─── Feedback ────────────────────────────────────────────────────────────
export const feedbackSchema = z.object({
  isHelpful: z.boolean(),
})

export type FeedbackParams = z.infer<typeof feedbackSchema>

export const feedbackResponseSchema = z.object({
  message: z.string(),
})

export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>

// ─── Export ──────────────────────────────────────────────────────────────
export const exportQuerySchema = z.object({
  format: z.enum(['pdf']).optional().default('pdf'),
})

export type ExportParams = z.infer<typeof exportQuerySchema>

// ─── Error Response ──────────────────────────────────────────────────────
export const errorResponseSchema = z.object({
  errorCode: z.string(),
  message: z.string(),
  statusCode: z.number().optional(),
})

export type ErrorResponse = z.infer<typeof errorResponseSchema>

// ─── Helper to unwrap API responses ─────────────────────────────────────
// Backend returns: { data: <ResponseDto> } — we unwrap to the inner type.
// For streaming endpoints (export), we handle separately.