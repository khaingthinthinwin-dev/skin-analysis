export enum AnalysisStatus {
  UPLOADING = 'UPLOADING',
  VALIDATING = 'VALIDATING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ConditionSeverity {
  NONE = 'NONE',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum ConditionName {
  ACNE = 'acne',
  REDNESS = 'redness',
  TEXTURE = 'texture',
  PIGMENTATION = 'pigmentation',
  DRYNESS = 'dryness',
  PORE_SIZE = 'pore_size',
}

export enum FindingType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
}

export enum RecommendationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum SkinType {
  COMBINATION = 'Combination',
  OILY = 'Oily',
  DRY = 'Dry',
  NORMAL = 'Normal',
  SENSITIVE = 'Sensitive',
}

export const ERROR_CODE = {
  INVALID_IMAGE_FORMAT: '40001',
  FILE_SIZE_EXCEEDED: '40002',
  CONSENT_MISSING: '40003',
  INVALID_ID: '40004',
  IDENTICAL_IDS: '40005',
  FORBIDDEN: '40301',
  NOT_FOUND: '40401',
  DAILY_QUOTA_EXCEEDED: '42901',
  AI_SERVICE_UNAVAILABLE: '50002',
} as const;
