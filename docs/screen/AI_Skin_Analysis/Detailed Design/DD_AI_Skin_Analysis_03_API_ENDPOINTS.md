# DD_SKIN_03 — API Endpoints Specification

> **Doc ID:** SKM-DD-SKIN-03 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-09-21

---

## 1. Controller Setup

- **File Path:** `backend/src/modules/buyer/skin-analysis/skin-analysis.controller.ts`
- **Base Route:** `/api/v1/skin-analysis`
- **Guards Applied:**
  - `JwtAuthGuard`: Requires valid JWT Bearer access token
  - `RolesGuard`: Requires `Role.BUYER` (`BR-SKIN-001`)
- **Common Headers:**
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json` (except multipart upload)

---

## 2. API Endpoints Specification

### 2.1 POST `/api/v1/skin-analysis/upload`
Accepts and validates facial image files, generates SAS storage tokens, and stores files in Azure Blob Storage.

- **Authentication:** Required (Buyer)
- **Content-Type:** `multipart/form-data`
- **Request Body (Multipart Form):**
  - `facialImage`: File (Binary buffer, required, max 10MB, formats: `.jpg`, `.jpeg`, `.png`, `.webp`)
  - `consent`: boolean (Form field string `'true'`, required, `BR-SKIN-010`)
- **Success Response:** `201 Created`
  ```json
  {
    "status": 201,
    "message": "Image uploaded and validated successfully.",
    "data": {
      "blobUrl": "https://storage.cosmeticsfinder.com/skin-scans/buyer_123_1724241025.jpg",
      "contentType": "image/jpeg",
      "fileSize": 2458920,
      "width": 1920,
      "height": 1440
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Code `40001`): Unsupported MIME type or invalid magic byte sequence.
  - `400 Bad Request` (Code `40002`): File size exceeds 10MB limit.
  - `400 Bad Request` (Code `40003`): Consent not provided (`consent !== 'true'`).
  - `429 Too Many Requests`: Exceeded 10 uploads/min limit.

---

### 2.2 POST `/api/v1/skin-analysis/analyze`
Dispatches the uploaded image to the AI Diagnostic Gateway, creates analysis records, and initiates inference.

- **Authentication:** Required (Buyer)
- **Request Body:**
  ```json
  {
    "blobUrl": "https://storage.cosmeticsfinder.com/skin-scans/buyer_123_1724241025.jpg"
  }
  ```
- **Rate Limit:** 5 requests per day per user (`BR-SKIN-005`). Resets daily at `00:00:00 UTC`.
- **Success Response:** `202 Accepted` (or `200 OK` on synchronous completion)
  ```json
  {
    "status": 202,
    "message": "Analysis started.",
    "data": {
      "analysisId": "a918f782-9cb3-4817-8a1a-4d693bfb1234",
      "status": "PROCESSING",
      "remainingDailyQuota": 4,
      "estimatedWaitSeconds": 15
    }
  }
  ```
- **Error Responses:**
  - `429 Too Many Requests` (Code `42901`): Daily quota exceeded (5/5 used).
  - `500 Internal Server Error` (Code `50002`): AI service unavailable.

---

### 2.3 GET `/api/v1/skin-analysis/latest`
Retrieves the buyer's most recent completed analysis summary for dashboard widgets (`EL-104`).

- **Authentication:** Required (Buyer)
- **Response:** `200 OK`
  ```json
  {
    "status": 200,
    "data": {
      "analysisId": "a918f782-9cb3-4817-8a1a-4d693bfb1234",
      "analysisDate": "2026-08-21T14:30:25.000Z",
      "healthScore": 85,
      "hydration": 72,
      "skinType": "Combination",
      "skinAge": 28,
      "remainingDailyQuota": 4
    }
  }
  ```
- **Note:** Returns `data: null` with `200 OK` if the user has no completed scans.

---

### 2.4 GET `/api/v1/skin-analysis/:id`
Retrieves comprehensive analysis results, including landmark mesh URLs, condition severities, clinical findings, and linked product recommendations.

- **Authentication:** Required (Buyer)
- **Parameters:** `id` (UUID string in route path)
- **Success Response:** `200 OK`
  ```json
  {
    "status": 200,
    "data": {
      "analysisId": "a918f782-9cb3-4817-8a1a-4d693bfb1234",
      "userId": "u812f821-42cb-42a1-bf8a-129034871234",
      "analysisDate": "2026-08-21T14:30:25.000Z",
      "status": "COMPLETED",
      "skinType": "Combination",
      "skinAge": 28,
      "healthScore": 85,
      "hydration": 72,
      "confidence": 94,
      "facialScanUrl": "https://storage.cosmeticsfinder.com/skin-scans/buyer_123_1724241025.jpg",
      "meshOverlayUrl": "https://storage.cosmeticsfinder.com/skin-scans/mesh_buyer_123_1724241025.png",
      "conditions": [
        {
          "conditionId": "c018a1a2-1111-4444-9999-000000000001",
          "conditionName": "acne",
          "severity": "NONE",
          "severityScore": 5,
          "affectedArea": "None",
          "description": "Minimal bacterial or inflammatory lesions detected."
        },
        {
          "conditionId": "c018a1a2-1111-4444-9999-000000000002",
          "conditionName": "redness",
          "severity": "MILD",
          "severityScore": 25,
          "affectedArea": "Cheeks",
          "description": "Slight vascular dilation observed around central cheek area."
        },
        {
          "conditionId": "c018a1a2-1111-4444-9999-000000000003",
          "conditionName": "texture",
          "severity": "MILD",
          "severityScore": 30,
          "affectedArea": "Forehead",
          "description": "Minor epidermal roughness present on upper forehead."
        },
        {
          "conditionId": "c018a1a2-1111-4444-9999-000000000004",
          "conditionName": "pigmentation",
          "severity": "NONE",
          "severityScore": 8,
          "affectedArea": "None",
          "description": "Even melanin distribution with negligible photo-damage."
        },
        {
          "conditionId": "c018a1a2-1111-4444-9999-000000000005",
          "conditionName": "dryness",
          "severity": "MODERATE",
          "severityScore": 58,
          "affectedArea": "Jawline & Cheeks",
          "description": "Noticeable moisture depletion detected along the lateral jawline."
        },
        {
          "conditionId": "c018a1a2-1111-4444-9999-000000000006",
          "conditionName": "pore_size",
          "severity": "MILD",
          "severityScore": 35,
          "affectedArea": "T-Zone",
          "description": "Slight follicular dilation in the nasal bridge and inner cheek junction."
        }
      ],
      "findings": {
        "primaryConcerns": [
          {
            "findingId": "f101-0001",
            "findingType": "PRIMARY",
            "title": "U-Zone Dehydration",
            "description": "Moisture levels in the cheek and jaw perimeter are significantly below optimum.",
            "affectedArea": "Cheeks and Jawline",
            "severity": "MODERATE"
          }
        ],
        "secondaryConcerns": [
          {
            "findingId": "f101-0002",
            "findingType": "SECONDARY",
            "title": "T-Zone Follicular Dilation",
            "description": "Sebum accumulation has caused mild pore visibility on the nasal crest.",
            "affectedArea": "Nose and Forehead",
            "severity": "MILD"
          }
        ],
        "overallAssessment": "Skin demonstrates strong elasticity and minimal inflammation, with primary needs focused on barrier hydration."
      },
      "recommendations": [
        {
          "recommendationId": "r909-0001",
          "productId": "p100-3344",
          "productType": "Moisturizer",
          "productName": "Ceramide Deep Barrier Cream",
          "reason": "Replenishes lipid barrier to treat moderate cheek dryness.",
          "priority": "HIGH",
          "isHelpful": null
        }
      ]
    }
  }
  ```
- **Error Responses:**
  - `403 Forbidden` (Code `40301`): User does not own this analysis record.
  - `404 Not Found` (Code `40401`): Analysis ID not found.

---

### 2.5 GET `/api/v1/skin-analysis/history`
Queries the chronological analysis records for the authenticated buyer with filtering, sorting, and pagination.

- **Authentication:** Required (Buyer)
- **Query Parameters:**
  - `page`: number (optional, default `1`, min `1`)
  - `pageSize`: number (optional, default `10`, min `1`, max `50`)
  - `dateFrom`: string (ISO 8601 date, optional)
  - `dateTo`: string (ISO 8601 date, optional)
- **Response:** `200 OK`
  ```json
  {
    "status": 200,
    "data": {
      "items": [
        {
          "analysisId": "a918f782-9cb3-4817-8a1a-4d693bfb1234",
          "analysisDate": "2026-08-21T14:30:25.000Z",
          "healthScore": 85,
          "hydration": 72,
          "skinType": "Combination",
          "skinAge": 28,
          "status": "COMPLETED"
        }
      ],
      "meta": {
        "page": 1,
        "pageSize": 10,
        "totalItems": 14,
        "totalPages": 2
      },
      "summary": {
        "totalAnalyses": 14,
        "bestScore": 88,
        "averageHydration": 68,
        "improvementPercentage": 12,
        "firstAnalysisDate": "2026-06-15T09:12:00.000Z",
        "latestAnalysisDate": "2026-08-21T14:30:25.000Z"
      }
    }
  }
  ```

---

### 2.6 GET `/api/v1/skin-analysis/trends`
Provides time-series data for health scores and hydration levels (`EL-117`). Requires at least 2 completed analyses.

- **Authentication:** Required (Buyer)
- **Query Parameters:**
  - `range`: `'30d'` | `'90d'` | `'1y'` | `'all'` (optional, default `'all'`)
- **Response:** `200 OK`
  ```json
  {
    "status": 200,
    "data": {
      "healthScoreTrend": [
        { "date": "2026-07-01", "value": 74, "analysisId": "uuid-1" },
        { "date": "2026-07-20", "value": 79, "analysisId": "uuid-2" },
        { "date": "2026-08-21", "value": 85, "analysisId": "uuid-3" }
      ],
      "hydrationTrend": [
        { "date": "2026-07-01", "value": 55, "analysisId": "uuid-1" },
        { "date": "2026-07-20", "value": 63, "analysisId": "uuid-2" },
        { "date": "2026-08-21", "value": 72, "analysisId": "uuid-3" }
      ],
      "minPointsMet": true
    }
  }
  ```

---

### 2.7 POST `/api/v1/skin-analysis/compare`
Calculates delta statistics between two selected completed scans (`UC-SKIN-011`).

- **Authentication:** Required (Buyer)
- **Request Body:**
  ```json
  {
    "analysisId1": "a918f782-9cb3-4817-8a1a-4d693bfb1234",
    "analysisId2": "b201e651-7ab2-4123-bc12-998877665544"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "status": 200,
    "data": {
      "analysis1": { "id": "a918f782-...", "date": "2026-08-07", "healthScore": 78, "hydration": 61, "skinAge": 30 },
      "analysis2": { "id": "b201e651-...", "date": "2026-08-21", "healthScore": 85, "hydration": 72, "skinAge": 28 },
      "scoreDelta": 7,
      "hydrationDelta": 11,
      "ageDelta": -2,
      "daysBetween": 14,
      "conditionChanges": [
        { "conditionName": "dryness", "from": "MODERATE", "to": "MILD", "direction": "IMPROVED" },
        { "conditionName": "redness", "from": "MILD", "to": "MILD", "direction": "STABLE" }
      ]
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request` (Code `40005`): `analysisId1` and `analysisId2` cannot be identical.
  - `403 Forbidden` (Code `40301`): One or both analyses do not belong to the user.

---

### 2.8 GET `/api/v1/skin-analysis/:id/export`
Generates and streams a downloadable PDF clinical report for a single analysis.

- **Authentication:** Required (Buyer)
- **Response Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="skin-analysis-report-20260821.pdf"`
- **Response Body:** Binary PDF file stream.

---

### 2.9 GET `/api/v1/skin-analysis/export-history`
Generates and streams a comprehensive longitudinal PDF report containing all historical analysis records and trend charts.

- **Authentication:** Required (Buyer)
- **Response Headers:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="skin-analysis-full-history.pdf"`
- **Response Body:** Binary PDF file stream.

---

### 2.10 POST `/api/v1/skin-analysis/recommendations/:id/feedback`
Submits buyer feedback on whether a recommendation was helpful (`BR-SKIN-021`).

- **Authentication:** Required (Buyer)
- **Request Body:**
  ```json
  {
    "isHelpful": true
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "status": 200,
    "message": "Feedback recorded successfully."
  }
  ```
