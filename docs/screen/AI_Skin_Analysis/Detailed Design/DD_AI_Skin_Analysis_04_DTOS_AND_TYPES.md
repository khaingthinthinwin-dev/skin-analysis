# DD_SKIN_04 — DTOs and Types Specification

> **Doc ID:** SKM-DD-SKIN-04 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-09-21

---

## 1. Overview

This document defines all Data Transfer Objects (DTOs), TypeScript interfaces, and validation schemas used across the AI Skin Analysis module. Backend endpoints leverage `class-validator` and `class-transformer` for strict runtime parameter enforcement, while frontend components employ `zod` for client-side type-safe form validations and API contract checks.

- **Backend DTO Location:** `backend/src/modules/buyer/skin-analysis/dto/`
- **Frontend Schemas Location:** `frontend/src/features/buyer/skin-analysis/schemas/skin-analysis.schema.ts`

---

## 2. Enums and Constants

```typescript
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
```

---

## 3. Backend Request DTOs

### 3.1 `UploadImageDto`
Handles metadata accompanying the multipart upload:
```typescript
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadImageDto {
  @IsNotEmpty({ message: 'Consent is required before uploading facial images.' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'Consent must be a valid boolean.' })
  consent: boolean;
}
```

### 3.2 `StartAnalysisDto`
Dispatches the uploaded image URL to the AI gateway:
```typescript
import { IsUrl, IsNotEmpty } from 'class-validator';

export class StartAnalysisDto {
  @IsNotEmpty({ message: 'blobUrl is required' })
  @IsUrl({}, { message: 'blobUrl must be a valid storage URL' })
  blobUrl: string;
}
```

### 3.3 `HistoryQueryDto`
Validates query parameters for the history list:
```typescript
import { IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be an ISO 8601 date string' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be an ISO 8601 date string' })
  dateTo?: string;
}
```

### 3.4 `CompareAnalysesDto`
Validates IDs for side-by-side comparison:
```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';

export class CompareAnalysesDto {
  @IsNotEmpty({ message: 'analysisId1 is required' })
  @IsUUID('4', { message: 'analysisId1 must be a valid UUID v4' })
  analysisId1: string;

  @IsNotEmpty({ message: 'analysisId2 is required' })
  @IsUUID('4', { message: 'analysisId2 must be a valid UUID v4' })
  analysisId2: string;
}
```

### 3.5 `RecommendationFeedbackDto`
Validates recommendation helpfulness votes:
```typescript
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class RecommendationFeedbackDto {
  @IsNotEmpty()
  @IsBoolean()
  isHelpful: boolean;
}
```

---

## 4. Backend Response Models & Interfaces

### 4.1 `AnalysisResultDto`
```typescript
export interface ConditionDto {
  conditionId: string;
  conditionName: ConditionName;
  severity: ConditionSeverity;
  severityScore: number; // 0 - 100
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
  healthScore: number; // 0 - 100
  hydration: number;   // 0 - 100%
  confidence: number;  // 0 - 100%
  facialScanUrl: string;
  meshOverlayUrl: string;
  conditions: ConditionDto[];
  findings: FindingsDto;
  recommendations: RecommendationDto[];
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 `HistorySummaryMetricsDto`
```typescript
export interface HistorySummaryMetricsDto {
  totalAnalyses: number;
  bestScore: number;
  averageHydration: number;
  improvementPercentage: number;
  firstAnalysisDate: string | null;
  latestAnalysisDate: string | null;
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
```

### 4.3 `ComparisonResultDto`
```typescript
export interface ConditionChangeDto {
  conditionName: ConditionName;
  from: ConditionSeverity;
  to: ConditionSeverity;
  direction: 'IMPROVED' | 'REGRESSED' | 'STABLE';
}

export interface ComparisonResultDto {
  analysis1: AnalysisHistoryItemDto;
  analysis2: AnalysisHistoryItemDto;
  scoreDelta: number;
  hydrationDelta: number;
  ageDelta: number;
  daysBetween: number;
  conditionChanges: ConditionChangeDto[];
}
```

---

## 5. Frontend Zod Validation Schemas

```typescript
import { z } from 'zod';

export const uploadConsentSchema = z.object({
  consent: z.literal(true, {
    errorMap: () => ({ message: 'You must consent to AI facial analysis to proceed.' }),
  }),
  imageFile: z
    .custom<File>((f) => f instanceof File, 'An image file is required.')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be 10MB or less.')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPG, PNG, and WebP formats are supported.'
    ),
});

export const compareAnalysesSchema = z
  .object({
    analysisId1: z.string().uuid(),
    analysisId2: z.string().uuid(),
  })
  .refine((data) => data.analysisId1 !== data.analysisId2, {
    message: 'Please select two different analyses to compare.',
    path: ['analysisId2'],
  });

export const recommendationFeedbackSchema = z.object({
  isHelpful: z.boolean(),
});
```
