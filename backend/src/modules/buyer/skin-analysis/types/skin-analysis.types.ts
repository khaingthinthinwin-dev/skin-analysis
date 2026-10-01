import {
  AnalysisStatus,
  ConditionName,
  ConditionSeverity,
  FindingType,
  RecommendationPriority,
  SkinType,
} from './skin-analysis.enums';

export interface ConditionDto {
  conditionId: string;
  conditionName: ConditionName;
  severity: ConditionSeverity;
  severityScore: number;
  affectedArea: string;
  description: string;
}

export interface FindingDto {
  findingId: string;
  findingType: FindingType;
  title: string;
  description: string;
  affectedArea: string;
  severity: ConditionSeverity;
}

export interface FindingsDto {
  primaryConcerns: FindingDto[];
  secondaryConcerns: FindingDto[];
  overallAssessment: string;
}

export interface RecommendationDto {
  recommendationId: string;
  productId: string;
  productType: string;
  productName: string;
  reason: string;
  priority: RecommendationPriority;
  isHelpful: boolean | null;
}

export interface AnalysisResultDto {
  analysisId: string;
  userId: string;
  analysisDate: string;
  status: AnalysisStatus;
  skinType: SkinType;
  skinAge: number;
  healthScore: number;
  hydration: number;
  confidence: number;
  facialScanUrl: string;
  meshOverlayUrl: string;
  conditions: ConditionDto[];
  findings: FindingsDto;
  recommendations: RecommendationDto[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadImageResponseDto {
  blobUrl: string;
  contentType: string;
  fileSize: number;
  width: number;
  height: number;
}

export interface StartAnalysisResponseDto {
  analysisId: string;
  status: AnalysisStatus;
  remainingDailyQuota: number;
  estimatedWaitSeconds: number;
}

export interface LatestAnalysisDto {
  analysisId: string;
  analysisDate: string;
  healthScore: number;
  hydration: number;
  skinType: SkinType;
  skinAge: number;
  remainingDailyQuota: number;
}

export interface AnalysisHistoryItemDto {
  analysisId: string;
  analysisDate: string;
  healthScore: number;
  hydration: number;
  skinType: SkinType;
  skinAge: number;
  status: AnalysisStatus;
}

export interface HistorySummaryMetricsDto {
  totalAnalyses: number;
  bestScore: number;
  averageHydration: number;
  improvementPercentage: number;
  firstAnalysisDate: string | null;
  latestAnalysisDate: string | null;
}

export interface AnalysisHistoryResponseDto {
  items: AnalysisHistoryItemDto[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: HistorySummaryMetricsDto;
}

export interface TrendPointDto {
  date: string;
  value: number;
  analysisId: string;
}

export interface TrendsResponseDto {
  healthScoreTrend: TrendPointDto[];
  hydrationTrend: TrendPointDto[];
  minPointsMet: boolean;
}

export interface ConditionChangeDto {
  conditionName: ConditionName;
  from: ConditionSeverity;
  to: ConditionSeverity;
  direction: 'IMPROVED' | 'REGRESSED' | 'STABLE';
}

export interface ComparisonResultDto {
  analysis1: {
    id: string;
    date: string;
    healthScore: number;
    hydration: number;
    skinAge: number;
  };
  analysis2: {
    id: string;
    date: string;
    healthScore: number;
    hydration: number;
    skinAge: number;
  };
  scoreDelta: number;
  hydrationDelta: number;
  ageDelta: number;
  daysBetween: number;
  conditionChanges: ConditionChangeDto[];
}
