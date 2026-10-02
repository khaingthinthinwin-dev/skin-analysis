// TypeScript interfaces mirroring the backend DTOs for component use
// These are used for props, state, and component typing.

export type AnalysisStatus =
  | 'UPLOADING'
  | 'VALIDATING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type ConditionName =
  | 'acne'
  | 'redness'
  | 'texture'
  | 'pigmentation'
  | 'dryness'
  | 'pore_size'

export type ConditionSeverity = 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE'

export type FindingType = 'PRIMARY' | 'SECONDARY'

export type RecommendationPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type SkinType = 'Combination' | 'Oily' | 'Dry' | 'Normal' | 'Sensitive'

export type Direction = 'IMPROVED' | 'STABLE' | 'REGRESSED'

// ─── Upload ──────────────────────────────────────────────────────────────
export interface UploadImageResponse {
  blobUrl: string
  contentType: string
  fileSize: number
  width: number
  height: number
}

// ─── Analyze ─────────────────────────────────────────────────────────────
export interface StartAnalysisResponse {
  analysisId: string
  status: AnalysisStatus
  remainingDailyQuota: number
  estimatedWaitSeconds: number
}

// ─── Latest ──────────────────────────────────────────────────────────────
export interface LatestAnalysisResponse {
  analysisId: string
  analysisDate: string
  healthScore: number
  hydration: number
  skinType: SkinType
  skinAge: number
  remainingDailyQuota: number
}

// ─── Conditions & Findings ───────────────────────────────────────────────
export interface ConditionDto {
  conditionId: string
  conditionName: ConditionName
  severity: ConditionSeverity
  severityScore: number
  affectedArea: string
  description: string
}

export interface FindingDto {
  findingId: string
  findingType: FindingType
  title: string
  description: string
  affectedArea: string
  severity: ConditionSeverity
}

// ─── Recommendations ─────────────────────────────────────────────────────
export interface RecommendationDto {
  recommendationId: string
  productId: string
  productType: string
  productName: string
  reason: string
  priority: RecommendationPriority
  isHelpful: boolean | null
}

// ─── Full Analysis Result ────────────────────────────────────────────────
export interface FindingsDto {
  primaryConcerns: FindingDto[]
  secondaryConcerns: FindingDto[]
  overallAssessment: string
}

export interface AnalysisResultResponse {
  analysisId: string
  userId: string
  analysisDate: string
  status: AnalysisStatus
  skinType: SkinType
  skinAge: number
  healthScore: number
  hydration: number
  confidence: number
  facialScanUrl: string
  conditions: ConditionDto[]
  findings: FindingsDto
  recommendations: RecommendationDto[]
  createdAt: string
  updatedAt: string
}

// ─── History ─────────────────────────────────────────────────────────────
export interface HistoryItemDto {
  analysisId: string
  analysisDate: string
  healthScore: number
  hydration: number
  skinType: SkinType
  skinAge: number
  status: AnalysisStatus
}

export interface SummaryDto {
  totalAnalyses: number
  bestScore: number
  averageHydration: number
  improvementPercentage: number
  firstAnalysisDate: string | null
  latestAnalysisDate: string | null
}

export interface HistoryResponse {
  items: HistoryItemDto[]
  meta: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  summary: SummaryDto
}

// ─── Trends ──────────────────────────────────────────────────────────────
export interface TrendPointDto {
  date: string
  value: number
  analysisId: string
}

export interface TrendsResponse {
  healthScoreTrend: TrendPointDto[]
  hydrationTrend: TrendPointDto[]
  minPointsMet: boolean
}

// ─── Compare ─────────────────────────────────────────────────────────────
export interface ConditionChangeDto {
  conditionName: ConditionName
  from: ConditionSeverity
  to: ConditionSeverity
  direction: 'IMPROVED' | 'STABLE' | 'REGRESSED'
}

export interface ComparisonResult {
  analysis1: {
    id: string
    date: string
    healthScore: number
    hydration: number
    skinAge: number
  }
  analysis2: {
    id: string
    date: string
    healthScore: number
    hydration: number
    skinAge: number
  }
  scoreDelta: number
  hydrationDelta: number
  ageDelta: number
  daysBetween: number
  conditionChanges: ConditionChangeDto[]
}

// ─── Feedback ────────────────────────────────────────────────────────────
export interface FeedbackResponse {
  message: string
}

// ─── UI Helpers ──────────────────────────────────────────────────────────
export type SeverityColorMap = Record<
  ConditionSeverity,
  {
    bg: string
    text: string
    border: string
    label: string
  }
>

export const SEVERITY_COLORS = {
  NONE: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    label: 'None',
  },
  MILD: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-800 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
    label: 'Mild',
  },
  MODERATE: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    label: 'Moderate',
  },
  SEVERE: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-800 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    label: 'Severe',
  },
}

export const CONDITION_LABELS: Record<ConditionName, string> = {
  acne: 'Acne & Blemishes',
  redness: 'Facial Redness',
  texture: 'Skin Texture',
  pigmentation: 'Pigmentation & Spots',
  dryness: 'Dryness',
  pore_size: 'Pore Size',
}

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  Combination: 'Combination',
  Oily: 'Oily',
  Dry: 'Dry',
  Normal: 'Normal',
  Sensitive: 'Sensitive',
}

export const PRIORITY_COLORS: Record<RecommendationPriority, string> = {
  HIGH: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
  MEDIUM: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  LOW: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
}

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  PRIMARY: 'Primary Concerns',
  SECONDARY: 'Secondary Concerns',
}

// ─── Error ───────────────────────────────────────────────────────────────
export interface ApiError {
  errorCode: string
  message: string
  statusCode?: number
}