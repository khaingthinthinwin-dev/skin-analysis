# DD_SKIN_06 — Test Specification

> **Doc ID:** SKM-DD-SKIN-06 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-09-21

---

## 1. Overview

This document specifies the comprehensive test plan and verification matrix for the AI Skin Analysis module, covering Backend Unit Tests, Controller Integration Tests, Frontend Component Tests, and End-to-End (E2E) verification workflows.

---

## 2. Backend Unit Tests (`backend/src/modules/buyer/skin-analysis/tests/`)

### 2.1 `skin-analysis.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `AzureBlobService`, `AiGatewayService`, `PdfReportService`.

| Test Suite | Test Scenario | Expected Outcome |
|------------|---------------|------------------|
| **uploadImage** | Valid JPG file with `consent: true` | Uploads to Azure Blob with SSE-256, returns blob SAS URL. |
| **uploadImage** | Missing consent (`consent: false`) | Throws `BadRequestException` (400, Code `40003`). |
| **uploadImage** | File size exceeds 10MB | Throws `BadRequestException` (400, Code `40002`). |
| **uploadImage** | Invalid file format (e.g., `.gif` or text file) | Throws `BadRequestException` (400, Code `40001`). |
| **uploadImage** | Resolution below 640x480 | Ingests successfully, logs low-resolution warning (`BR-SKIN-004`). |
| **startAnalysis** | User within daily quota (< 5 scans today) | Atomically increments Redis quota, dispatches to AI gateway, returns `analysisId`. |
| **startAnalysis** | User exceeded daily quota (5/5 scans used) | Throws `TooManyRequestsException` (429, Code `42901`). |
| **startAnalysis** | AI Gateway timeout (> 30s) | Updates record to `FAILED`, decrements daily counter, throws 500 (Code `50002`). |
| **startAnalysis** | AI Gateway returns unreadable face | Updates record to `FAILED`, decrements daily counter, throws 500 (Code `50003`). |
| **getAnalysisById** | Cache hit in Redis | Returns cached analysis immediately without querying PostgreSQL. |
| **getAnalysisById** | Cache miss, record found in DB | Populates Redis cache with 300s TTL, returns `AnalysisResultDto`. |
| **getAnalysisById** | User attempts to access another buyer's scan | Throws `ForbiddenException` (403, Code `40301`, `BR-SKIN-006`). |
| **getAnalysisById** | Analysis ID does not exist | Throws `NotFoundException` (404, Code `40401`). |
| **getAnalysisHistory** | Buyer with multiple analyses | Returns items ordered by `analysis_date DESC` (`BR-SKIN-011`). |
| **getAnalysisHistory** | Summary KPI calculations | Correctly calculates `totalAnalyses`, `bestScore`, `averageHydration`, and `improvementPercentage`. |
| **getTrends** | User has < 2 completed analyses | Returns `minPointsMet: false` with empty trend arrays (`BR-SKIN-013`). |
| **getTrends** | User has ≥ 2 completed analyses | Returns ordered time-series arrays for health score and hydration. |
| **compareAnalyses** | Comparing identical analysis IDs | Throws `BadRequestException` (400, Code `40005`). |
| **compareAnalyses** | Comparing two distinct valid scans | Computes score, hydration, and age deltas; maps condition severity shift directions. |
| **updateFeedback** | Valid recommendation owned by buyer | Upserts vote into `skin_analysis_feedback`. |
| **updateFeedback** | Recommendation belonging to another user | Throws `ForbiddenException` (403, Code `40301`). |

---

### 2.2 `skin-analysis.controller.spec.ts`

| Test Suite | Test Scenario | Expected Outcome |
|------------|---------------|------------------|
| **Guards** | Unauthenticated request (no JWT token) | Returns `401 Unauthorized`. |
| **Guards** | Authenticated as `merchant` or `admin` | Returns `403 Forbidden` (`BR-SKIN-001`). |
| **Validation** | Malformed UUID in route parameter | Returns `400 Bad Request` (Code `40004`). |
| **Export** | Valid single report export request | Returns `200 OK` with `Content-Type: application/pdf`. |

---

## 3. Frontend Component Tests (`frontend/src/features/buyer/skin-analysis/`)

| Component | Test Scenario | Expected Outcome |
|-----------|---------------|------------------|
| `ImageUploadZone` | User drops valid JPG image | Previews image, enables consent checkbox. |
| `ImageUploadZone` | User drops invalid file type (.pdf) | Shows inline error message `BR-SKIN-002`. |
| `CaptureGuidelinesModal` | User opens guidelines | Renders lighting, positioning, and glasses removal tips. |
| `AIFacialAnalysisCard` | Renders with completed analysis result | Displays health score (0-100), hydration %, skin type, and age. |
| `MeshOverlayViewer` | Toggles landmark mesh visibility | Renders canvas overlay on top of original facial scan (`EL-109`). |
| `ConditionSeveritySection` | Renders 6 skin conditions | Correctly applies severity badge colors (Green/Yellow/Orange/Red). |
| `AnalysisComparisonModal` | Displays baseline vs current scan | Shows positive score deltas in green, negative deltas in red. |
| `TrendVisualizationChart` | Less than 2 data points | Displays fallback placeholder "At least 2 analyses required to view trends". |
| `ProductRecommendationCard` | User clicks "Helpful" button | Toggles button state, invokes `useRecommendationFeedback` mutation. |

---

## 4. End-to-End (E2E) Test Scenarios (Playwright)

### E2E-SKIN-01: Full Scan & Diagnostic Lifecycle
1. Log in as a registered Buyer.
2. Navigate to `/skin-analysis`.
3. Verify that `AnalysisSummaryCard` and `CameraCapturePanel` are visible.
4. Upload valid sample portrait file `test-face.jpg`.
5. Select the consent checkbox (`EL-105`).
6. Click "Start AI Scan" (`EL-107`).
7. Verify progress bar (`EL-124`) animates during processing.
8. Assert transition to `AnalysisResultView` within 30 seconds.
9. Verify facial mesh overlay (`EL-109`), score gauge (85/100), hydration (72%), and 6 condition cards are visible.
10. Click "Export PDF" (`EL-122`) and verify browser receives downloaded `.pdf` file.

### E2E-SKIN-02: Daily Limit Enforcement
1. Simulate a buyer who has completed 5 scans on the current UTC date.
2. Attempt to trigger a 6th analysis.
3. Assert that API returns HTTP 429 (`42901`).
4. Assert that UI renders error toast: "Daily analysis limit reached (5 per day). Please try again tomorrow."

### E2E-SKIN-03: Longitudinal Tracking & Side-by-Side Comparison
1. Navigate to `/skin-analysis/history`.
2. Verify history table lists at least 2 historical scans.
3. Verify trend line chart renders health score and hydration data points.
4. Select two distinct analysis rows and click "Compare" (`EL-127`).
5. Verify modal opens with side-by-side comparison table, displaying score deltas and condition shifts.

---

## 5. Traceability Matrix

| Requirement ID | Business Rule | Use Case | Test Case ID | Test Type |
|----------------|---------------|----------|--------------|-----------|
| B-SKIN-001 | BR-SKIN-002, BR-SKIN-003 | UC-SKIN-001 | `skin.service.spec: uploadImage` | Unit |
| B-SKIN-002 | BR-SKIN-002 | UC-SKIN-001 | `ImageUploadZone.spec: invalid file` | Component |
| B-SKIN-003 | BR-SKIN-012 | UC-SKIN-002 | `AIFacialAnalysisCard.spec: render` | Component |
| B-SKIN-004 | BR-SKIN-016 | UC-SKIN-002 | `ConditionSeveritySection.spec` | Component |
| B-SKIN-005 | BR-SKIN-017 | UC-SKIN-002 | `E2E-SKIN-01` | E2E |
| B-SKIN-006 | BR-SKIN-011 | UC-SKIN-003 | `skin.service.spec: getAnalysisHistory` | Unit |
| B-SKIN-007 | BR-SKIN-006 | UC-SKIN-003 | `skin.service.spec: getAnalysisById ownership` | Unit |
| B-SKIN-008 | BR-SKIN-014 | UC-SKIN-004 | `skin.controller.spec: export report` | Integration |
| B-SKIN-012 | BR-SKIN-013 | UC-SKIN-006 | `TrendVisualizationChart.spec: fallback` | Component |
| B-SKIN-014 | BR-SKIN-020 | UC-SKIN-011 | `E2E-SKIN-03: comparison` | E2E |
| B-SKIN-015 | BR-SKIN-021 | UC-SKIN-009 | `ProductRecommendationCard.spec: feedback` | Component |
