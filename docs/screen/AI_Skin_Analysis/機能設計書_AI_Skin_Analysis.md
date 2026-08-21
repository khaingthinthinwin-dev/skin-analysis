# Functional Specification (機能設計書) — AI Skin Analysis Portal

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-SKIN-001 |
| **Target Screen** | AI Skin Analysis Portal (AI肌分析ポータル) |
| **Subsystem** | Skin Analysis — Image Upload, AI Processing & Historical Tracking |
| **Function ID** | FN-SKIN-001 |
| **Version** | 2.0 |
| **Created** | 2026-08-21 |
| **Last Updated** | 2026-08-21 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-21 | Software Architect | Initial functional specification for AI Skin Analysis Portal covering image upload, AI analysis processing, result display, history tracking, and report export. |
| 2.0 | 2026-08-21 | Software Architect | Complete rewrite aligned with reference format. Added sections: DDL (16), Prisma Schema (17), Acceptance Criteria (18), i18n keys, comparison, recommendations, feedback, caching strategy, security considerations. |

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Use Cases and Business Workflow](#2-use-cases-and-business-workflow)
3. [State Transition Specification](#3-state-transition-specification)
4. [Business Rules](#4-business-rules)
5. [Screen Specifications](#5-screen-specifications)
6. [Functional Operation Specification](#6-functional-operation-specification)
7. [Input / Output Specification](#7-input--output-specification)
8. [Input Validation Rules](#8-input-validation-rules)
9. [Error Handling Specification](#9-error-handling-specification)
10. [Permission and Access Control](#10-permission-and-access-control)
11. [Real-Time Notification Behavior](#11-real-time-notification-behavior)
12. [Screen Transition Specification](#12-screen-transition-specification)
13. [Non-Functional Considerations](#13-non-functional-considerations)
14. [Configurable Items (External Definitions)](#14-configurable-items-external-definitions)
15. [Cross-Reference Traceability Matrix](#15-cross-reference-traceability-matrix)
16. [Database Schema (DDL)](#16-database-schema-ddl)
17. [Prisma Schema Definition](#17-prisma-schema-definition)
18. [Acceptance Criteria](#18-acceptance-criteria)

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen serves as the core skin analysis feature within the Cosmetics Finder platform. The AI Skin Analysis Portal enables buyers to upload facial images, receive AI-powered skin condition analysis, review current skin health metrics, and track historical analysis results over time.

This subsystem provides a comprehensive skin health assessment platform that combines computer vision, AI diagnostic capabilities, and longitudinal health tracking. It is responsible for image capture guidance, secure image upload, AI processing orchestration, result visualization, and historical trend analysis.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Image Upload & Validation** — Accepting facial images (JPG, PNG, WebP) with size and format validation, providing capture guidelines for optimal results.
2. **AI Analysis Processing** — Orchestrating AI facial analysis including skin type detection, age estimation, health scoring, hydration assessment, and condition severity evaluation.
3. **Result Visualization** — Displaying analysis results with facial mesh overlays, diagnostic information, confidence scores, and severity indicators.
4. **Clinical Findings Display** — Presenting primary and secondary concerns with detailed finding descriptions.
5. **Analysis History Management** — Maintaining chronological analysis records with sorting, filtering, and comparison capabilities.
6. **Trend Visualization** — Rendering health score and hydration trends over time with chart visualizations.
7. **Report Export** — Generating PDF reports for individual analyses or complete analysis history.
8. **Metrics Aggregation** — Computing summary statistics including total analyses, best score, average hydration, and improvement percentage.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Authenticated Buyer |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own analysis history and skin metrics only |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer Actor            │      │     Facial Image Upload             │
│ (Uploads Facial Image)   ├─────►│  Validates format/size              │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │ Sends to AI
                                                 ▼
                                       ┌────────────────────────┐
                                       │  AI Analysis Service   │
                                       │  (Skin Analysis API)   │
                                       └──────────┬─────────────┘
                                                  │ Returns Results
                                                  ▼
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Analysis Results       │      │     skin_analyses Table             │
│ (Display & History)      ├─────┤  Stores analysis records            │
└──────────────────────────┘      └──────────────┬────────────────────┘
                                                 │ Reads History
                                                 ▼
                                       ┌────────────────────────┐
                                       │  Trend Visualization   │
                                       │  (Charts & Metrics)    │
                                       └────────────────────────┘

┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Export Report          │      │     PDF Generation Service          │
│ (PDF Export)             ├─────►│  Generates downloadable reports     │
└──────────────────────────┘      └─────────────────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `facialImage` | File Upload | Facial image in JPG, PNG, or WebP format (max 10MB) |
| `analysisId` | URL Parameter | Analysis ID for viewing specific analysis detail |
| `dateRange` | Query Parameter | Date range filter for history view |
| `exportFormat` | User Selection | Export format selection (PDF) |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `analysisResult` | Analysis DTO | Complete analysis results with scores and conditions |
| `facialScanUrl` | URL | Path to uploaded facial scan image |
| `meshOverlayUrl` | URL | Path to AI-generated facial mesh overlay image |
| `analysisHistory` | Array\<AnalysisDTO\> | List of historical analysis records |
| `trendData` | Trend DTO | Health score and hydration trend data points |
| `summaryMetrics` | Metrics DTO | Aggregated historical metrics |
| `pdfReport` | File (PDF) | Generated PDF report for download |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`skin_analyses`, `skin_analysis_conditions`), constraints. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-SKIN-001 | Upload Facial Image | User is authenticated as Buyer. | Image uploaded, validated, and stored. AI analysis initiated. | Buyer |
| UC-SKIN-002 | View Analysis Results | Analysis processing is complete. | Analysis results displayed with scores, conditions, and mesh overlay. | Buyer |
| UC-SKIN-003 | View Analysis History | User has at least one completed analysis. | Analysis history list displayed sorted by latest date. | Buyer |
| UC-SKIN-004 | Export Single Analysis Report | User is viewing a specific analysis. | PDF report generated and downloaded for the selected analysis. | Buyer |
| UC-SKIN-005 | Export Full Analysis History | User has analysis history records. | PDF report generated containing all analysis records. | Buyer |
| UC-SKIN-006 | View Trend Visualization | User has 2+ analysis records. | Health score and hydration trend charts displayed. | Buyer |
| UC-SKIN-007 | Initiate New Scan | User is on analysis portal. | Capture guidelines panel displayed, ready for new image upload. | Buyer |

### 2.2 Primary Business Workflow

```
                        ┌──────────────────┐
                        │  Buyer Arrives   │
                        │  (Authenticated) │
                        └────────┬─────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │  AI Skin Analysis Portal    │
                   │  Display                     │
                   └──────────┬──────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
    ┌─────────────┐  ┌──────────────┐   ┌──────────────────┐
    │ New Scan    │  │ View History │   │ View Trends      │
    │ (UC-SKIN-07)│  │ (UC-SKIN-03) │   │ (UC-SKIN-06)     │
    └──────┬──────┘  └──────┬───────┘   └──────────────────┘
           │                │
           ▼                │
    ┌─────────────────┐     │
    │ Capture         │     │
    │ Guidelines      │     │
    │ Panel           │     │
    └──────┬──────────┘     │
           │                │
           ▼                │
    ┌─────────────────┐     │
    │ Upload Facial   │     │
    │ Image           │     │
    │ (UC-SKIN-01)    │     │
    └──────┬──────────┘     │
           │                │
           ▼                │
    ┌─────────────────┐     │
    │ Image           │     │
    │ Validation      │     │
    └─────┬─────┬─────┘     │
          │     │           │
    ┌─────┘     └─────┐     │
    ▼                 ▼     │
┌────────┐      ┌────────┐  │
│ PASS   │      │ FAIL   │  │
└────┬───┘      └────┬───┘  │
     │               │      │
     ▼               ▼      │
┌──────────┐   ┌─────────┐  │
│ AI       │   │ Display │  │
│ Processing│  │ Error   │  │
│ (Async)  │   └─────────┘  │
└────┬─────┘                │
     │                      │
     ▼                      │
┌──────────┐                │
│ Store    │                │
│ Results  │                │
└────┬─────┘                │
     │                      │
     ▼                      ▼
┌────────────────────────────────┐
│  Display Analysis Results      │
│  (UC-SKIN-02)                  │
│  - Scores                      │
│  - Conditions                  │
│  - Mesh Overlay                │
│  - Clinical Findings           │
└──────────────┬─────────────────┘
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
  ┌────────┐ ┌────────┐ ┌────────┐
  │ Export │ │ View   │ │ New    │
  │ Report │ │ History│ │ Scan   │
  │ (004)  │ │ (003)  │ │ (007)  │
  └────────┘ └────────┘ └────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Buyer navigates to AI Skin Analysis Portal | — | Portal Loaded | System |
| 2 | Buyer clicks "New Scan" button | — | Capture Guidelines Displayed | System |
| 3 | Buyer uploads facial image | — | Image Uploaded | Buyer |
| 4 | System validates image format and size | — | Validation Complete | System |
| 5 | System sends image to AI Analysis Service | — | Processing Initiated | System |
| 6 | AI processes image and returns results | Processing | Results Ready | AI Service |
| 7 | System stores analysis results in database | — | Results Stored | System |
| 8 | System displays analysis results | — | Results Displayed | System |
| 9 | Buyer reviews results and scores | — | — | Buyer |
| 10 | Buyer can export report or view history | — | — | Buyer |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-SKIN-001 | Buyer can upload facial images for AI analysis |
| B-SKIN-002 | System validates image format (JPG, PNG, WebP) and size (max 10MB) |
| B-SKIN-003 | AI analysis provides skin type, skin age, health score, hydration score |
| B-SKIN-004 | Analysis results include condition severity for acne, redness, texture, pigmentation, dryness, pore size |
| B-SKIN-005 | Clinical findings include primary and secondary concerns |
| B-SKIN-006 | Analysis history sorted by latest date descending |
| B-SKIN-007 | Users can view only their own analysis history |
| B-SKIN-008 | Export Report generates PDF for single analysis |
| B-SKIN-009 | Export Full History exports all analysis records as PDF |
| B-SKIN-010 | Health score displayed on 0-100 scale |
| B-SKIN-011 | Hydration score displayed as percentage |
| B-SKIN-012 | Trend visualization shows health and hydration trends over time |

---

## 3. State Transition Specification

### 3.1 Analysis States

| State | Description | Can View | Can Export |
|-------|-------------|:--------:|:----------:|
| `UPLOADING` | Image is being uploaded | ✗ | ✗ |
| `VALIDATING` | Image format/size validation in progress | ✗ | ✗ |
| `PROCESSING` | AI analysis in progress | ✗ | ✗ |
| `COMPLETED` | Analysis completed successfully | ✓ | ✓ |
| `FAILED` | AI analysis failed | ✗ | ✗ |
| `CANCELLED` | User cancelled the upload | ✗ | ✗ |

### 3.2 Image Validation States

| State | Description | Can Proceed | Action Required |
|-------|-------------|:-----------:|-----------------|
| `PENDING` | Image not yet selected | ✗ | Select image |
| `SELECTED` | Image selected, awaiting validation | ✗ | Validate format/size |
| `VALID` | Image passes all validations | ✓ | Submit for analysis |
| `INVALID_FORMAT` | Image format not supported | ✗ | Select different format |
| `INVALID_SIZE` | Image exceeds 10MB limit | ✗ | Select smaller image |
| `VALIDATION_ERROR` | Multiple validation failures | ✗ | Review and re-select |

### 3.3 Analysis State Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-SKIN-01 | `UPLOADING` | `VALIDATING` | Image upload complete | Upload successful |
| TR-SKIN-02 | `VALIDATING` | `PROCESSING` | Validation passed | Format valid, size ≤10MB |
| TR-SKIN-03 | `VALIDATING` | `INVALID_FORMAT` | Format validation failed | Unsupported file type |
| TR-SKIN-04 | `VALIDATING` | `INVALID_SIZE` | Size validation failed | File > 10MB |
| TR-SKIN-05 | `PROCESSING` | `COMPLETED` | AI processing successful | Results received |
| TR-SKIN-06 | `PROCESSING` | `FAILED` | AI processing error | Service unavailable or error |
| TR-SKIN-07 | `UPLOADING` | `CANCELLED` | User cancels upload | — |

---

## 4. Business Rules

### 4.1 Business Rule Catalog

| BR-ID | Rule Category | Rule Description | Validation Target | Required / Optional |
|-------|---------------|------------------|-------------------|---------------------|
| BR-SKIN-001 | Access Control | Only authenticated Buyers may upload facial images and view analysis results. | System | Required |
| BR-SKIN-002 | Image Format | Accepted image formats: JPG, JPEG, PNG, WebP. | File | Required |
| BR-SKIN-003 | Image Size | Maximum image file size: 10MB (10,485,760 bytes). | File | Required |
| BR-SKIN-004 | Image Resolution | Minimum recommended resolution: 640ÁE80px. Maximum recommended: 4096ÁE096px. | File | Required |
| BR-SKIN-005 | Analysis Limit | Maximum 5 analyses per buyer per day. | Account | Required |
| BR-SKIN-006 | History Scope | Buyers may only view their own analysis history. Cannot access other users' analysis data. | Access | Required |
| BR-SKIN-007 | Result Display | Analysis results are read-only once processing is complete. Buyers cannot modify analysis scores or conditions. | Display | Required |
| BR-SKIN-008 | Image Storage | Uploaded facial images stored in Azure Blob Storage with server-side encryption (SSE). | Storage | Required |
| BR-SKIN-009 | Image Retention | Raw facial images are retained for 90 days, then permanently deleted. Analysis metadata retained indefinitely. | Retention | Required |
| BR-SKIN-010 | Consent Required | Buyer must provide explicit consent before image upload. | Upload | Required |
| BR-SKIN-011 | History Sort | Analysis history displayed in descending order by analysis date (newest first). | Display | Required |
| BR-SKIN-012 | Score Scale | Health score displayed as integer 0 E00. Hydration score displayed as percentage 0 E00%. | Display | Required |
| BR-SKIN-013 | Trend Display | Trend charts require minimum 2 data points. If fewer than 2 analyses exist, display placeholder message. | Display | Required |
| BR-SKIN-014 | Export Format | PDF export available for single analysis and full history reports. | Export | Required |
| BR-SKIN-015 | Mesh Overlay | Facial mesh overlay image generated by AI and displayed alongside analysis results. | Display | Required |
| BR-SKIN-016 | Condition Severity | Severity levels: NONE, MILD, MODERATE, SEVERE. Displayed as text labels with color coding. | Display | Required |
| BR-SKIN-017 | Clinical Findings | Primary and secondary concerns displayed with descriptions and affected area indicators. | Display | Required |
| BR-SKIN-018 | Caching Strategy | Analysis results cached in Redis with TTL of 5 minutes (`skin:analysis:{id}`). | Cache | Required |
| BR-SKIN-019 | i18n Support | All user-facing text supports EN, JA, and MY languages. | Display | Required |

### 4.2 Validation Outcome Values

| BR-ID | Validation Target | Condition | On Success | On Failure | Error Code |
|-------|-------------------|-----------|------------|------------|------------|
| BR-SKIN-002 | Image Format | MIME type is `image/jpeg`, `image/png`, or `image/webp` | Accept image | Reject with error message | 40001 |
| BR-SKIN-003 | Image Size | File size ≤ 10,485,760 bytes | Accept image | Reject with error message | 40002 |
| BR-SKIN-004 | Image Resolution | Width ≥ 640px AND Height ≥ 480px | Accept image | Accept with warning |  E|
| BR-SKIN-005 | Analysis Limit | Daily count < 5 | Allow analysis | Reject with error message | 42901 |
| BR-SKIN-006 | Access Scope | User ID matches analysis owner | Allow access | Deny access | 40301 |
| BR-SKIN-010 | Consent | Consent flag is true | Allow upload | Reject with message | 40003 |
| BR-SKIN-013 | Trend Display | Analysis count ≥ 2 | Show charts | Show placeholder |  E|

### 4.3 Optional vs Required Validation Rules

| BR-ID | Validation Type | Rule | Error Code |
|-------|-----------------|------|------------|
| BR-SKIN-002 | Required | Image MIME type must be JPG, JPEG, PNG, or WebP. | 40001 |
| BR-SKIN-003 | Required | File size must be ≤ 10MB (10,485,760 bytes). | 40002 |
| BR-SKIN-004 | Required | Resolution ≥ 640ÁE80px. (Warning if below 640ÁE80.) |  E|
| BR-SKIN-005 | Required | Daily analysis count must be < 5. | 42901 |
| BR-SKIN-010 | Required | Consent must be `true` before upload. | 40003 |


---

## 5. Screen Specifications

### 5.1 Screen Layout Overview

The AI Skin Analysis Portal screen consists of the following major areas:

1. **Header Area**  EPortal title, navigation breadcrumbs, and action buttons.
2. **Analysis Summary Card**  ELatest analysis health score and hydration summary.
3. **Capture Guidelines Panel**  EImage capture instructions and upload button.
4. **AI Facial Analysis Card**  EDetailed analysis results with mesh overlay.
5. **Condition Severity Section**  ESkin condition indicators with severity levels.
6. **Clinical Findings Section**  EPrimary and secondary concerns with descriptions.
7. **Analysis History Section**  EHistorical analysis records table.
8. **Trend Visualization**  EHealth score and hydration trend charts.
9. **Export Controls**  EPDF export buttons for single and bulk reports.

### 5.2 Screen Element Catalog

| Element ID | Element Type | Description | Bound Data | Validation | On Success | On Failure |
|------------|--------------|-------------|------------|------------|------------|------------|
| EL-101 | Header | Portal title display |  E|  E| Display title |  E|
| EL-102 | Breadcrumb | Navigation path |  E|  E| Show path |  E|
| EL-103 | Button | "New Scan" primary action button |  E|  E| Show capture guidelines panel |  E|
| EL-104 | Card | Analysis Summary Card | `latestAnalysis` |  E| Display scores | Show empty state |
| EL-105 | File Input | Facial image upload field | `facialImage` | BR-SKIN-002, BR-SKIN-003 | Validate image | Show error |
| EL-106 | Panel | Capture Guidelines Panel |  E|  E| Show guidelines |  E|
| EL-107 | Button | "Start Analysis" submit button | `facialImage` | BR-SKIN-010 | Initiate analysis | Show error |
| EL-108 | Card | AI Facial Analysis Card | `analysisResult` |  E| Display results | Show error |
| EL-109 | Image | Facial mesh overlay display | `meshOverlayUrl` |  E| Display overlay | Show placeholder |
| EL-110 | Section | Condition Severity Section | `conditions` |  E| Display conditions | Show empty |
| EL-111 | Badge | Individual condition severity badge | `severity` |  E| Show color-coded badge |  E|
| EL-112 | Section | Clinical Findings Section | `findings` |  E| Display findings | Show empty |
| EL-113 | List | Primary concerns list | `primaryConcerns` |  E| Show concerns | Show none |
| EL-114 | List | Secondary concerns list | `secondaryConcerns` |  E| Show concerns | Show none |
| EL-115 | Section | Analysis History Section | `analysisHistory` |  E| Display history table | Show empty state |
| EL-116 | Table | History records table | `historyRecords` | BR-SKIN-011 | Sort by latest | Show no records |
| EL-117 | Chart | Trend visualization chart | `trendData` | BR-SKIN-013 | Render chart | Show placeholder |
| EL-118 | Metric Card | Total analyses count | `totalAnalyses` |  E| Display count | Show 0 |
| EL-119 | Metric Card | Best health score | `bestScore` |  E| Display score | Show N/A |
| EL-120 | Metric Card | Average hydration | `avgHydration` |  E| Display percentage | Show N/A |
| EL-121 | Metric Card | Improvement percentage | `improvement` |  E| Display percentage | Show 0% |
| EL-122 | Button | "Export Single Report" button | `analysisId` |  E| Generate PDF | Show error |
| EL-123 | Button | "Export Full History" button | `historyRecords` |  E| Generate PDF | Show error |
| EL-124 | Progress Bar | AI processing indicator | `processingStatus` |  E| Show progress | Show error |
| EL-125 | Alert | Validation error alert | `errorMessage` |  E| Show error |  E|
| EL-126 | Alert | Success notification | `successMessage` |  E| Show success |  E|


---

## 6. Functional Operation Specification

### 6.1 Operation Catalog

| Operation ID | Operation Name | Description | Target Screen Element | Precondition | Postcondition |
|--------------|----------------|-------------|----------------------|--------------|---------------|
| OP-SKIN-001 | New Scan | Initiates a new skin analysis by displaying capture guidelines and upload panel. | EL-103, EL-106 | User authenticated as Buyer | Capture guidelines panel visible |
| OP-SKIN-002 | Upload Image | Validates and uploads the selected facial image file. | EL-105, EL-107 | Image selected by user | Image stored, validation result displayed |
| OP-SKIN-003 | Start Analysis | Sends uploaded image to AI service for processing. | EL-107 | Image uploaded and validated | Processing state displayed |
| OP-SKIN-004 | View Results | Displays completed analysis results with scores and findings. | EL-108, EL-110, EL-112 | Analysis state is COMPLETED | Results displayed |
| OP-SKIN-005 | View History | Displays chronological list of past analysis records. | EL-115, EL-116 | At least one completed analysis | History table populated |
| OP-SKIN-006 | View Trends | Displays health score and hydration trend charts. | EL-117 | At least 2 completed analyses | Charts rendered |
| OP-SKIN-007 | Export Single Report | Generates and downloads PDF for a specific analysis. | EL-122 | Viewing specific analysis result | PDF file downloaded |
| OP-SKIN-008 | Export Full History | Generates and downloads PDF containing all analysis records. | EL-123 | At least one completed analysis | PDF file downloaded |

### 6.2 Operation Detail  EUpload Image (OP-SKIN-002)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-002 |
| **Operation Name** | Upload Image |
| **Description** | Validates file format (JPG, PNG, WebP) and size (max 10MB). Stores validated image in Azure Blob Storage. |
| **Trigger Event** | User selects file via EL-105 (File Input) |
| **Precondition** | User is authenticated as Buyer |
| **Input Data** | `facialImage` (File) |
| **Output Data** | `uploadResult` (UploadResultDTO) |
| **Associated Business Rules** | BR-SKIN-002, BR-SKIN-003, BR-SKIN-004, BR-SKIN-010 |

**Processing Steps:**

1. Verify user authentication via JWT Bearer Token.
2. Validate file MIME type is `image/jpeg`, `image/png`, or `image/webp` (BR-SKIN-002).
3. Validate file size is ≤ 10,485,760 bytes (BR-SKIN-003).
4. Validate image resolution ≥ 640ÁE80px (BR-SKIN-004).
5. Generate unique file name: `{userId}_{timestamp}.{extension}`.
6. Upload image to Azure Blob Storage container `skin-scans` with SSE encryption.
7. Set blob metadata: `userId`, `uploadDate`, `contentType`.
8. Return `uploadResult` with `blobUrl`, `fileSize`, `contentType`.
9. Display success notification (EL-126).

**Error Scenarios:**

| Error Code | Error Message | Resolution |
|------------|---------------|------------|
| 40001 | Invalid image format. Please upload a JPG, PNG, or WebP file. | User must re-select image with correct format. |
| 40002 | File size exceeds 10MB limit. Please upload a smaller image. | User must compress or select smaller image. |
| 40003 | Upload consent is required. Please accept the terms. | User must check consent checkbox before uploading. |
| 50001 | Upload failed. Please try again. | Retry upload operation. |

### 6.3 Operation Detail  EStart Analysis (OP-SKIN-003)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-003 |
| **Operation Name** | Start Analysis |
| **Description** | Sends uploaded image to AI Analysis Service for skin condition assessment. |
| **Trigger Event** | User clicks "Start Analysis" button (EL-107) |
| **Precondition** | Image uploaded and validated |
| **Input Data** | `blobUrl` (String), `userId` (String) |
| **Output Data** | `analysisResult` (AnalysisDTO) |
| **Associated Business Rules** | BR-SKIN-005, BR-SKIN-015, BR-SKIN-018 |

**Processing Steps:**

1. Check daily analysis limit for user (BR-SKIN-005). Reject if count ≥ 5.
2. Display processing indicator (EL-124).
3. Send POST request to AI Analysis Service API with `blobUrl`.
4. Await AI service response (timeout: 30 seconds).
5. Parse AI response into `AnalysisDTO` structure.
6. Generate `meshOverlayUrl` from AI response (BR-SKIN-015).
7. Store analysis results in `skin_analyses` table.
8. Store condition details in `skin_analysis_conditions` table.
9. Cache results in Redis with 5-minute TTL (BR-SKIN-018).
10. Increment daily analysis counter.
11. Transition state to COMPLETED.
12. Display results via OP-SKIN-004.

**Error Scenarios:**

| Error Code | Error Message | Resolution |
|------------|---------------|------------|
| 42901 | Daily analysis limit reached (5 per day). Please try again tomorrow. | Wait until next day to perform new analysis. |
| 50002 | AI service unavailable. Please try again later. | Retry analysis operation. |
| 50003 | Analysis failed. The image may be unclear. | Upload a clearer image and retry. |

### 6.4 Operation Detail  EView Results (OP-SKIN-004)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-004 |
| **Operation Name** | View Results |
| **Description** | Displays completed analysis results including scores, conditions, mesh overlay, and clinical findings. |
| **Trigger Event** | Analysis processing completes OR user navigates to specific analysis |
| **Precondition** | Analysis state is COMPLETED |
| **Input Data** | `analysisId` (String) |
| **Output Data** | Displayed on screen |
| **Associated Business Rules** | BR-SKIN-007, BR-SKIN-012, BR-SKIN-015, BR-SKIN-016, BR-SKIN-017 |

**Processing Steps:**

1. Retrieve analysis results from cache or database.
2. Display AI Facial Analysis Card (EL-108) with:
   - Skin Type (e.g., "Combination")
   - Skin Age (e.g., "28")
   - Health Score as integer 0-100 (BR-SKIN-012)
   - Hydration as percentage 0-100% (BR-SKIN-012)
   - Confidence percentage
3. Display Facial Mesh Overlay (EL-109) from `meshOverlayUrl`.
4. Display Condition Severity Section (EL-110) with color-coded badges:
   - NONE: Green
   - MILD: Yellow
   - MODERATE: Orange
   - SEVERE: Red
5. Display Clinical Findings (EL-112) with primary and secondary concerns.
6. All results are read-only (BR-SKIN-007).

### 6.5 Operation Detail  EView History (OP-SKIN-005)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-005 |
| **Operation Name** | View History |
| **Description** | Displays chronological list of past analysis records sorted by latest date. |
| **Trigger Event** | User clicks "View History" or navigates to history section |
| **Precondition** | At least one completed analysis exists |
| **Input Data** | `userId` (String) |
| **Output Data** | `analysisHistory` (Array\<AnalysisDTO\>) |
| **Associated Business Rules** | BR-SKIN-006, BR-SKIN-011 |

**Processing Steps:**

1. Query `skin_analyses` table where `user_id` = current user (BR-SKIN-006).
2. Order results by `analysis_date` DESC (BR-SKIN-011).
3. Display History Records Table (EL-116) with columns:
   - Analysis Date
   - Health Score (0-100)
   - Hydration (%)
   - Skin Age
   - Actions (Export button per row)
4. Display History Metrics:
   - Total Analyses Count (EL-118)
   - Best Health Score (EL-119)
   - Average Hydration (EL-120)
   - Improvement Percentage (EL-121)

### 6.6 Operation Detail  EView Trends (OP-SKIN-006)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-006 |
| **Operation Name** | View Trends |
| **Description** | Displays health score and hydration trend charts over time. |
| **Trigger Event** | User clicks "View Trends" or navigates to trend section |
| **Precondition** | At least 2 completed analyses exist |
| **Input Data** | `userId` (String) |
| **Output Data** | `trendData` (TrendDTO) |
| **Associated Business Rules** | BR-SKIN-013 |

**Processing Steps:**

1. Check if user has ≥ 2 completed analyses (BR-SKIN-013).
2. If fewer than 2, display placeholder message.
3. Query `skin_analyses` table for all user analyses ordered by date.
4. Extract health score and hydration data points.
5. Render Health Score Trend Chart (EL-117) with x-axis as date, y-axis as score.
6. Render Hydration Trend Chart (EL-117) with x-axis as date, y-axis as percentage.
7. Support tooltip on hover showing exact values and dates.

### 6.7 Operation Detail  EExport Single Report (OP-SKIN-007)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-007 |
| **Operation Name** | Export Single Report |
| **Description** | Generates and downloads PDF report for a specific analysis. |
| **Trigger Event** | User clicks "Export" button on specific analysis row |
| **Precondition** | Viewing specific analysis with COMPLETED state |
| **Input Data** | `analysisId` (String) |
| **Output Data** | PDF file download |
| **Associated Business Rules** | BR-SKIN-014 |

**Processing Steps:**

1. Retrieve analysis data by `analysisId`.
2. Generate PDF report with:
   - Analysis date and metadata
   - Skin type, skin age, health score, hydration
   - Condition severity table
   - Clinical findings (primary/secondary concerns)
   - Mesh overlay image
3. Return PDF as download stream.
4. Log export event in audit trail.

### 6.8 Operation Detail  EExport Full History (OP-SKIN-008)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-008 |
| **Operation Name** | Export Full History |
| **Description** | Generates and downloads PDF report containing all analysis records. |
| **Trigger Event** | User clicks "Export Full History" button |
| **Precondition** | At least one completed analysis exists |
| **Input Data** | `userId` (String) |
| **Output Data** | PDF file download |
| **Associated Business Rules** | BR-SKIN-014 |

**Processing Steps:**

1. Query all analysis records for current user ordered by date DESC.
2. Generate PDF report with:
   - Report header with user and date range
   - Summary metrics (total, best score, average hydration)
   - Each analysis record as a section with scores, conditions, findings
   - Trend chart summary
3. Return PDF as download stream.
4. Log export event in audit trail.

### 6.9 Operation Detail  ECompare Analyses (OP-SKIN-009)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-009 |
| **Operation Name** | Compare Analyses |
| **Description** | Allows side-by-side comparison of two analysis results. |
| **Trigger Event** | User selects two analyses for comparison |
| **Precondition** | At least 2 completed analyses exist |
| **Input Data** | `analysisId1`, `analysisId2` (String) |
| **Output Data** | Comparison display with delta values |
| **Associated Business Rules** | BR-SKIN-020 |

**Processing Steps:**

1. Retrieve both analysis records by IDs.
2. Verify both belong to current user.
3. Display comparison table with:
   - Side-by-side scores (health, hydration)
   - Score deltas with improvement/regression indicators
   - Condition severity comparison
   - Date difference
4. Highlight improvements in green, regressions in red.

### 6.10 Operation Detail  EUpdate Recommendation Feedback (OP-SKIN-010)

| Attribute | Value |
|-----------|-------|
| **Operation ID** | OP-SKIN-010 |
| **Operation Name** | Update Recommendation Feedback |
| **Description** | Allows user to mark product recommendations as helpful or not helpful. |
| **Trigger Event** | User clicks helpful/not helpful on recommendation |
| **Precondition** | Analysis results with recommendations displayed |
| **Input Data** | `recommendationId`, `isHelpful` (Boolean) |
| **Output Data** | Updated feedback record |
| **Associated Business Rules** | BR-SKIN-021 |

**Processing Steps:**

1. Verify user owns the analysis associated with recommendation.
2. Insert or update feedback record in `skin_analysis_feedback` table.
3. Update recommendation helpfulness statistics.
4. Display confirmation toast.


---

## 7. Input / Output Specification

### 7.1 Input Specifications

#### 7.1.1 Image Upload Input

| Input Field | Data Type | Required | Validation | Default Value | Description |
|-------------|-----------|----------|------------|---------------|-------------|
| `facialImage` | File | Yes | BR-SKIN-002, BR-SKIN-003 |  E| Facial image file (JPG, PNG, WebP, max 10MB) |
| `consent` | Boolean | Yes | BR-SKIN-010 | `false` | User consent for image processing |

#### 7.1.2 Analysis Query Input

| Input Field | Data Type | Required | Validation | Default Value | Description |
|-------------|-----------|----------|------------|---------------|-------------|
| `analysisId` | String (UUID) | Conditional | Valid UUID format |  E| Specific analysis ID to retrieve |
| `dateFrom` | ISO 8601 Date | No | Valid date, ≤ dateTo | 30 days ago | Start date for history filter |
| `dateTo` | ISO 8601 Date | No | Valid date, ≥ dateFrom | Today | End date for history filter |
| `page` | Integer | No | ≥ 1 | 1 | Page number for pagination |
| `pageSize` | Integer | No | 1-50 | 10 | Records per page |

#### 7.1.3 Export Input

| Input Field | Data Type | Required | Validation | Default Value | Description |
|-------------|-----------|----------|------------|---------------|-------------|
| `analysisId` | String (UUID) | Conditional | Valid UUID format |  E| Analysis ID for single export |
| `exportFormat` | Enum | Yes | One of: `pdf` | `pdf` | Export format |

#### 7.1.4 Comparison Input

| Input Field | Data Type | Required | Validation | Default Value | Description |
|-------------|-----------|----------|------------|---------------|-------------|
| `analysisId1` | String (UUID) | Yes | Valid UUID format |  E| First analysis ID for comparison |
| `analysisId2` | String (UUID) | Yes | Valid UUID format, ≠ analysisId1 |  E| Second analysis ID for comparison |

### 7.2 Output Specifications

#### 7.2.1 Analysis Result DTO

| Output Field | Data Type | Unit | Description |
|--------------|-----------|------|-------------|
| `analysisId` | String (UUID) |  E| Unique analysis identifier |
| `userId` | String (UUID) |  E| Owner user identifier |
| `analysisDate` | ISO 8601 DateTime |  E| Analysis completion timestamp |
| `skinType` | String |  E| Detected skin type (e.g., "Combination", "Oily", "Dry", "Normal") |
| `skinAge` | Integer | years | Estimated skin age |
| `healthScore` | Integer | 0-100 | Overall skin health score |
| `hydration` | Integer | % | Skin hydration percentage |
| `confidence` | Integer | % | AI confidence level |
| `facialScanUrl` | String (URL) |  E| URL to uploaded facial scan image |
| `meshOverlayUrl` | String (URL) |  E| URL to AI-generated mesh overlay image |
| `conditions` | Array\<ConditionDTO\> |  E| Array of detected skin conditions |
| `findings` | FindingsDTO |  E| Clinical findings with concerns |
| `recommendations` | Array\<RecommendationDTO\> |  E| Product recommendations (optional) |
| `createdAt` | ISO 8601 DateTime |  E| Record creation timestamp |
| `updatedAt` | ISO 8601 DateTime |  E| Record last update timestamp |

#### 7.2.2 Condition DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `conditionId` | String (UUID) | Unique condition identifier |
| `conditionName` | String | Condition name (acne, redness, texture, pigmentation, dryness, pore_size) |
| `severity` | Enum | Severity level: NONE, MILD, MODERATE, SEVERE |
| `severityScore` | Integer | Numeric severity score (0-100) |
| `affectedArea` | String | Description of affected area |
| `description` | String | Detailed description of the condition |

#### 7.2.3 Findings DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `primaryConcerns` | Array\<FindingDTO\> | Array of primary skin concerns |
| `secondaryConcerns` | Array\<FindingDTO\> | Array of secondary skin concerns |
| `overallAssessment` | String | Overall assessment summary |

#### 7.2.4 Finding DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `findingId` | String (UUID) | Unique finding identifier |
| `findingType` | Enum | Type: PRIMARY or SECONDARY |
| `title` | String | Short title of the finding |
| `description` | String | Detailed description |
| `affectedArea` | String | Specific facial area affected |
| `severity` | Enum | Severity level: NONE, MILD, MODERATE, SEVERE |

#### 7.2.5 History Metrics DTO

| Output Field | Data Type | Unit | Description |
|--------------|-----------|------|-------------|
| `totalAnalyses` | Integer |  E| Total number of completed analyses |
| `bestScore` | Integer | 0-100 | Highest health score achieved |
| `averageHydration` | Integer | % | Average hydration across all analyses |
| `improvementPercentage` | Integer | % | Improvement from first to latest analysis |
| `firstAnalysisDate` | ISO 8601 Date |  E| Date of first analysis |
| `latestAnalysisDate` | ISO 8601 Date |  E| Date of most recent analysis |

#### 7.2.6 Trend Data DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `healthScoreTrend` | Array\<TrendPointDTO\> | Array of health score data points |
| `hydrationTrend` | Array\<TrendPointDTO\> | Array of hydration data points |
| `dateRange` | DateRangeDTO | Date range covered by trend data |

#### 7.2.7 Trend Point DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `date` | ISO 8601 Date | Data point date |
| `value` | Integer | Score or percentage value |
| `analysisId` | String (UUID) | Associated analysis ID |

#### 7.2.8 Recommendation DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `recommendationId` | String (UUID) | Unique recommendation identifier |
| `productType` | String | Recommended product type (e.g., "Moisturizer", "Sunscreen") |
| `productName` | String | Specific product name |
| `reason` | String | Reason for recommendation |
| `priority` | Enum | Priority: HIGH, MEDIUM, LOW |
| `isHelpful` | Boolean | User feedback on recommendation (null if not yet rated) |

#### 7.2.9 Comparison DTO

| Output Field | Data Type | Description |
|--------------|-----------|-------------|
| `analysis1` | AnalysisDTO | First analysis results |
| `analysis2` | AnalysisDTO | Second analysis results |
| `scoreDelta` | Integer | Health score difference (analysis2 - analysis1) |
| `hydrationDelta` | Integer | Hydration difference |
| `ageDelta` | Integer | Skin age difference |
| `conditionChanges` | Array\<ConditionChangeDTO\> | Changes in condition severities |
| `dateRangeDays` | Integer | Number of days between analyses |


---

## 8. Input Validation Rules

### 8.1 Validation Summary

| No. | Field Name | Required | Validation Rule | Error Message | Reference Business Rules |
|-----|------------|:--------:|-----------------|---------------|------------------------|
| 1 | `facialImage` | Yes | File MIME type must be image/jpeg, image/png, or image/webp | "Invalid image format. Please upload a JPG, PNG, or WebP file." | BR-SKIN-002 |
| 2 | `facialImage` | Yes | File size must be ≤ 10,485,760 bytes (10MB) | "File size exceeds 10MB limit. Please upload a smaller image." | BR-SKIN-003 |
| 3 | `facialImage` | Yes | Image resolution ≥ 640ÁE80px (warning if below) | "Image resolution is low. For best results, use 640ÁE80px or higher." | BR-SKIN-004 |
| 4 | `consent` | Yes | Must be `true` to proceed with upload | "Upload consent is required. Please accept the terms." | BR-SKIN-010 |
| 5 | `analysisId` | Conditional | Valid UUID v4 format | "Invalid analysis ID format." |  E|
| 6 | `dateFrom` | No | Valid ISO 8601 date, ≤ dateTo | "Start date must be before or equal to end date." |  E|
| 7 | `dateTo` | No | Valid ISO 8601 date, ≥ dateFrom | "End date must be after or equal to start date." |  E|
| 8 | `page` | No | Integer ≥ 1 | "Page number must be at least 1." |  E|
| 9 | `pageSize` | No | Integer between 1 and 50 | "Page size must be between 1 and 50." |  E|
| 10 | `exportFormat` | Yes | Must be one of: pdf | "Export format not supported." | BR-SKIN-014 |
| 11 | `analysisId1` | Yes | Valid UUID v4 format | "Invalid first analysis ID format." |  E|
| 12 | `analysisId2` | Yes | Valid UUID v4 format, ≠ analysisId1 | "Invalid second analysis ID or IDs must be different." |  E|

### 8.2 Frontend Validation Rules

| No. | Field Name | Validation Timing | Validation Logic | Error Display |
|-----|------------|-------------------|------------------|---------------|
| 1 | `facialImage` (format) | On file select | Check file extension and MIME type against allowed list | Inline error below upload field |
| 2 | `facialImage` (size) | On file select | Compare file.size to 10485760 | Inline error below upload field |
| 3 | `facialImage` (resolution) | After file load | Use canvas to read image dimensions | Warning message (non-blocking) |
| 4 | `consent` | On submit | Check consent checkbox state | Inline error below consent checkbox |
| 5 | `analysisId` | On navigation | Validate UUID format with regex | Redirect to 404 page |
| 6 | `dateFrom` / `dateTo` | On filter apply | Validate date range logic | Inline error below date picker |

### 8.3 Backend Validation Rules

| No. | Field Name | Validation Location | Validation Logic | Error Response |
|-----|------------|---------------------|------------------|----------------|
| 1 | `facialImage` (format) | API Gateway / Upload Service | Verify Content-Type header matches allowed MIME types | 400 Bad Request, error code 40001 |
| 2 | `facialImage` (size) | API Gateway / Upload Service | Verify Content-Length ≤ 10485760 | 400 Bad Request, error code 40002 |
| 3 | `userId` (ownership) | Analysis Service | Verify JWT sub matches analysis user_id | 403 Forbidden, error code 40301 |
| 4 | `analysisId` (existence) | Analysis Service | Verify analysis record exists in database | 404 Not Found, error code 40401 |
| 5 | Daily limit | Analysis Service | Check daily analysis count < 5 | 429 Too Many Requests, error code 42901 |

### 8.4 Image Format Validation Flow

| Step | Validation Check | Pass Action | Fail Action |
|------|------------------|-------------|-------------|
| 1 | Check file extension (.jpg, .jpeg, .png, .webp) | Proceed to step 2 | Reject with error 40001 |
| 2 | Read file header bytes for magic number validation | Proceed to step 3 | Reject with error 40001 |
| 3 | Validate MIME type from Content-Type header | Proceed to step 4 | Reject with error 40001 |
| 4 | Check file size ≤ 10MB | Proceed to step 5 | Reject with error 40002 |
| 5 | Load image and verify dimensions ≥ 640ÁE80 | Accept with warning if below | Proceed to upload |

### 8.5 Validation Error Response Format

```json
{
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Image validation failed",
  "details": [
    {
      "field": "facialImage",
      "code": 40001,
      "message": "Invalid image format. Please upload a JPG, PNG, or WebP file."
    }
  ],
  "timestamp": "2026-08-21T10:30:00Z",
  "path": "/api/v1/skin-analysis/upload"
}
```


---

## 9. Error Handling Specification

### 9.1 Error Response Format

All errors follow the standard API error response format per development rules:

```json
{
  "status": 400,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": [
    {
      "field": "fieldName",
      "code": 40001,
      "message": "Field-specific error message"
    }
  ],
  "timestamp": "2026-08-21T10:30:00Z",
  "path": "/api/v1/skin-analysis/..."
}
```

### 9.2 Error Catalog

| Error Code | HTTP Status | Error Type | Error Message | Resolution |
|------------|-------------|------------|---------------|------------|
| 40001 | 400 | VALIDATION_ERROR | Invalid image format. Please upload a JPG, PNG, or WebP file. | User must re-select image with correct format. |
| 40002 | 400 | VALIDATION_ERROR | File size exceeds 10MB limit. Please upload a smaller image. | User must compress or select smaller image. |
| 40003 | 400 | VALIDATION_ERROR | Upload consent is required. Please accept the terms. | User must check consent checkbox before uploading. |
| 40004 | 400 | VALIDATION_ERROR | Invalid analysis ID format. | User must provide valid UUID. |
| 40005 | 400 | VALIDATION_ERROR | Comparison requires two different analysis IDs. | User must select two different analyses. |
| 40301 | 403 | AUTHORIZATION_ERROR | You do not have permission to access this analysis. | User can only access own analysis records. |
| 40401 | 404 | NOT_FOUND | Analysis record not found. | Verify analysis ID is correct. |
| 40402 | 404 | NOT_FOUND | No analysis history found for this user. | User must complete at least one analysis. |
| 42901 | 429 | RATE_LIMIT | Daily analysis limit reached (5 per day). Please try again tomorrow. | Wait until next day to perform new analysis. |
| 50001 | 500 | INTERNAL_ERROR | Upload failed. Please try again. | Retry upload operation. |
| 50002 | 500 | INTERNAL_ERROR | AI service unavailable. Please try again later. | Retry analysis operation. |
| 50003 | 500 | INTERNAL_ERROR | Analysis failed. The image may be unclear. | Upload a clearer image and retry. |
| 50004 | 500 | INTERNAL_ERROR | PDF generation failed. Please try again. | Retry export operation. |
| 50005 | 500 | INTERNAL_ERROR | Failed to load analysis results. Please refresh the page. | Refresh page to retry. |

### 9.3 UI Error Display Behavior

| Error Code | UI Element | Display Type | Auto-Dismiss | Retry Available |
|------------|------------|--------------|:------------:|:---------------:|
| 40001 | Alert (EL-125) | Inline error below upload field | No | Yes (re-upload) |
| 40002 | Alert (EL-125) | Inline error below upload field | No | Yes (re-upload) |
| 40003 | Alert (EL-125) | Inline error below consent checkbox | No | Yes (check consent) |
| 40004 | Full page | 404 page | No | No |
| 40301 | Full page | 403 Forbidden page | No | No |
| 40401 | Full page | 404 page | No | No |
| 42901 | Alert (EL-125) | Toast notification | No | No (wait until tomorrow) |
| 50001 | Alert (EL-125) | Toast notification with retry button | No | Yes |
| 50002 | Alert (EL-125) | Toast notification with retry button | No | Yes |
| 50003 | Alert (EL-125) | Toast notification with retry button | No | Yes (re-upload) |
| 50004 | Alert (EL-125) | Toast notification with retry button | No | Yes |
| 50005 | Alert (EL-125) | Full page error with refresh button | No | Yes (refresh) |

### 9.4 Retry Strategy

| Error Code | Retry Count | Retry Delay | Backoff Strategy |
|------------|:-----------:|-------------|------------------|
| 50001 | 3 | 2 seconds | Exponential (2s, 4s, 8s) |
| 50002 | 3 | 5 seconds | Exponential (5s, 10s, 20s) |
| 50003 | 1 | Immediate | No backoff (user action required) |
| 50004 | 2 | 3 seconds | Linear (3s, 6s) |

### 9.5 Caching Error Handling

| Scenario | Behavior |
|----------|----------|
| Redis cache miss | Fall back to database query |
| Redis cache connection failure | Fall back to database query, log warning |
| Redis cache write failure | Log warning, continue with database data |
| Cache stale data | Serve stale data with background refresh |

### 9.6 AI Service Error Handling

| Scenario | Behavior |
|----------|----------|
| AI service timeout (>30s) | Return error 50002, log timeout event |
| AI service 5xx error | Return error 50002, retry once after 2s |
| AI service 4xx error | Return error 50003, log request details |
| AI service response invalid | Return error 50003, log parsing error |
| AI service unavailable | Return error 50002, check health endpoint |

### 9.7 Database Error Handling

| Scenario | Behavior |
|----------|----------|
| Connection timeout | Retry up to 3 times with exponential backoff |
| Query timeout | Return error 50005 after 10 seconds |
| Constraint violation | Return error 40004 or 40301 as appropriate |
| Deadlock detected | Retry transaction once |
| Table not found | Return error 50005, log schema error |


---

## 10. Permission and Access Control

### 10.1 Access Control Matrix

| Role | View Results | Upload Image | View History | Export Report | View Trends | Compare Analyses |
|------|:------------:|:------------:|:------------:|:-------------:|:-----------:|:----------------:|
| Buyer | ✁E| ✁E| ✁E(own only) | ✁E| ✁E| ✁E(own only) |
| Seller | ✁E| ✁E| ✁E| ✁E| ✁E| ✁E|
| Admin | ✁E| ✁E| ✁E| ✁E| ✁E| ✁E|

### 10.2 Authentication Requirements

| Attribute | Value |
|-----------|-------|
| Authentication Method | JWT Bearer Token |
| Token Location | Authorization Header |
| Token Expiry | Per auth service configuration |
| Refresh Required | No (token refresh handled at gateway) |

### 10.3 Authorization Rules

| Resource | Action | Rule | Error Code |
|----------|--------|------|------------|
| `skin_analyses` | READ | `user_id` must match JWT `sub` claim | 40301 |
| `skin_analyses` | CREATE | Must be authenticated as Buyer | 40301 |
| `skin_analyses` | EXPORT | `user_id` must match JWT `sub` claim | 40301 |
| `skin_analysis_conditions` | READ | Must own parent `skin_analyses` record | 40301 |
| `skin_analysis_recommendations` | READ | Must own parent `skin_analyses` record | 40301 |
| `skin_analysis_feedback` | CREATE/UPDATE | Must own parent `skin_analyses` record | 40301 |

### 10.4 Data Isolation

| Scope | Rule |
|-------|------|
| Analysis Records | Users can only view records where `user_id` matches their authenticated user ID. |
| Image Files | Azure Blob Storage SAS tokens scoped to user's own container. |
| Recommendations | Only accessible through parent analysis record ownership check. |
| Feedback | Only accessible through parent analysis record ownership check. |

### 10.5 Rate Limiting

| Operation | Rate Limit | Window | Scope |
|-----------|:----------:|--------|-------|
| Image Upload | 10 requests | 1 minute | Per user |
| Analysis Start | 5 requests | 1 day | Per user |
| Export PDF | 20 requests | 1 hour | Per user |
| View History | 60 requests | 1 minute | Per user |
| Compare Analyses | 30 requests | 1 minute | Per user |

### 10.6 Security Considerations

| Consideration | Implementation |
|---------------|----------------|
| CSRF Protection | CSRF token validated on all mutation endpoints |
| XSS Prevention | All user-rendered content sanitized; image URLs validated |
| File Upload Security | File type validated by magic bytes, not just extension; virus scan before storage |
| Image Storage Security | SSE encryption at rest; SAS tokens for time-limited access |
| API Security | Rate limiting, request size limits, timeout enforcement |
| Data Residency | All image data stored in configured Azure region |


---

## 11. Real-Time Notification Behavior

### 11.1 Notification Events

| Event ID | Event Name | Trigger | Notification Type | Recipient |
|----------|------------|---------|-------------------|-----------|
| EV-SKIN-001 | Analysis Completed | AI processing finishes successfully | Toast + Push | Analysis Owner |
| EV-SKIN-002 | Analysis Failed | AI processing encounters error | Toast | Analysis Owner |
| EV-SKIN-003 | Upload Complete | Image successfully uploaded | Toast | Upload User |
| EV-SKIN-004 | Export Ready | PDF export generated successfully | Download | Export User |
| EV-SKIN-005 | Daily Limit Reached | User attempts 6th analysis in a day | Toast | Analysis Owner |

### 11.2 Notification Display Specifications

| Event ID | Display Duration | Severity | Dismissible | Action on Click |
|----------|:----------------:|----------|:-----------:|-----------------|
| EV-SKIN-001 | 5 seconds | Success | Yes | Navigate to results |
| EV-SKIN-002 | 10 seconds | Error | Yes | Show retry option |
| EV-SKIN-003 | 3 seconds | Success | Yes |  E|
| EV-SKIN-004 | Until dismissed | Success | Yes | Download PDF |
| EV-SKIN-005 | Until dismissed | Warning | Yes |  E|

### 11.3 WebSocket Events (Future Consideration)

| Event | Direction | Payload | Use Case |
|-------|-----------|---------|----------|
| `analysis.progress` | Server ↁEClient | `{analysisId, status, progress}` | Real-time processing updates |
| `analysis.complete` | Server ↁEClient | `{analysisId, resultSummary}` | Instant result notification |
| `analysis.failed` | Server ↁEClient | `{analysisId, errorCode}` | Error notification |

---

## 12. Screen Transition Specification

### 12.1 Screen Transition Catalog

| Transition ID | Origin Screen | Target Screen | Trigger | Guard Conditions |
|---------------|---------------|---------------|---------|------------------|
| TS-SKIN-01 | AI Skin Analysis Portal | Capture Guidelines Panel | Click "New Scan" (EL-103) | User authenticated |
| TS-SKIN-02 | Capture Guidelines Panel | Image Upload Form | Click "Upload Image" |  E|
| TS-SKIN-03 | Image Upload Form | Processing State | Click "Start Analysis" (EL-107) | Image validated, consent given |
| TS-SKIN-04 | Processing State | Analysis Results | AI processing complete | State = COMPLETED |
| TS-SKIN-05 | Processing State | Error Display | AI processing failed | State = FAILED |
| TS-SKIN-06 | Analysis Results | Analysis History | Click "View History" |  E|
| TS-SKIN-07 | Analysis Results | Trend Visualization | Click "View Trends" | ≥ 2 analyses |
| TS-SKIN-08 | Analysis Results | PDF Download | Click "Export Report" (EL-122) | Analysis = COMPLETED |
| TS-SKIN-09 | Analysis History | Analysis Results | Click specific analysis row | Analysis exists |
| TS-SKIN-10 | Analysis History | PDF Download | Click "Export Full History" (EL-123) | ≥ 1 analysis |
| TS-SKIN-11 | Any Screen | 404 Error Page | Invalid analysisId in URL |  E|
| TS-SKIN-12 | Any Screen | 403 Forbidden Page | Unauthorized access attempt |  E|
| TS-SKIN-13 | Error Display | Image Upload Form | Click "Try Again" |  E|
| TS-SKIN-14 | Analysis Results | Capture Guidelines Panel | Click "New Scan" |  E|

### 12.2 Navigation Flow Diagram

```text
┌──────────────────────────────────────────────────────────────────────━E━E                       AI Skin Analysis Portal                       ━E└──────────┬───────────────────────────────────────────────────────────━E           ━E           ├─► [New Scan] ──► Capture Guidelines ──► Upload Form
           ━E                                          ━E           ━E                                          ▼
           ━E                                    Processing State
           ━E                                     ━E         ━E           ━E                                  (OK)       (FAIL)
           ━E                                     ━E         ━E           ━E                                     ▼          ▼
           ━E                              Analysis    Error Display
           ━E                              Results       ━E           ━E                   ┌─────────────┤          └─► Upload Form
           ━E                   ━E            ━E           ━E                   ▼             ▼
           ━E             [View History]  [View Trends]
           ━E                   ━E            ━E           ━E                   ▼             ▼
           ━E             History Table   Trend Charts
           ━E             ━E       ━E           ━E        (Click Row) (Export)
           ━E             ━E       ━E           ━E             ▼        ▼
           ━E          Results   PDF Download
           ━E           ├─► [Export Report] ──► PDF Download
           ━E           └─► [Export Full History] ──► PDF Download
```

### 12.3 Back Navigation Behavior

| Current Screen | Back Action | Destination |
|----------------|-------------|-------------|
| Capture Guidelines Panel | Browser back / Cancel | AI Skin Analysis Portal |
| Processing State | Browser back (blocked) |  E(Processing cannot be cancelled) |
| Analysis Results | Browser back | AI Skin Analysis Portal |
| Analysis History | Browser back | Analysis Results |
| Trend Visualization | Browser back | AI Skin Analysis Portal |
| Error Display | Browser back / Try Again | Image Upload Form |


---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Image Upload Response Time | ≤ 3 seconds | Time from upload initiation to server response |
| AI Analysis Processing Time | ≤ 30 seconds | Time from analysis start to result display |
| Analysis Results Load Time | ≤ 2 seconds | Time from navigation to results display |
| History List Load Time | ≤ 2 seconds | Time from navigation to history table render |
| Trend Chart Render Time | ≤ 3 seconds | Time from navigation to chart display |
| PDF Export Generation Time | ≤ 10 seconds | Time from export click to download ready |
| Page Initial Load Time | ≤ 4 seconds | Time from navigation to interactive page |

### 13.2 Caching Strategy

| Cache Target | Cache Layer | TTL | Invalidation Trigger |
|--------------|-------------|-----|----------------------|
| Analysis Results | Redis | 5 minutes | New analysis completed |
| History List | Redis | 2 minutes | New analysis completed |
| Trend Data | Redis | 5 minutes | New analysis completed |
| Summary Metrics | Redis | 5 minutes | New analysis completed |
| User Image URLs | Redis | 15 minutes | Image re-uploaded |

### 13.3 Scalability Considerations

| Aspect | Consideration |
|--------|---------------|
| Concurrent Users | Design for 100 concurrent analysis sessions |
| Image Storage | Azure Blob Storage with auto-scaling |
| Database | Azure Database for PostgreSQL with read replicas |
| AI Processing | Async queue-based processing to handle load spikes |
| CDN | Azure CDN for static assets and cached images |

### 13.4 Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Image Encryption | SSE encryption at rest in Azure Blob Storage |
| API Authentication | JWT Bearer Token validation at API Gateway |
| CORS Policy | Whitelist configured origins only |
| Input Sanitization | All user inputs validated and sanitized |
| File Type Validation | Magic byte validation, not just extension |
| Rate Limiting | Per-user rate limits on all endpoints |
| Audit Logging | All data access and mutations logged |

### 13.5 Accessibility Considerations

| Aspect | Requirement |
|--------|-------------|
| Color Contrast | All text meets WCAG 2.1 AA contrast ratios |
| Keyboard Navigation | All interactive elements keyboard accessible |
| Screen Reader | Alt text for mesh overlay images; ARIA labels on charts |
| Error Announcements | Error messages announced via ARIA live regions |
| Focus Management | Focus moves to error alerts on validation failure |
| Chart Alternatives | Tabular data alternative available for trend charts |

### 13.6 Internationalization (i18n)

| Language Code | Language | Status |
|---------------|----------|--------|
| `en` | English | Primary |
| `ja` | Japanese | Supported |
| `my` | Malay | Supported |

**i18n Keys for AI Skin Analysis:**

| Key | EN | JA | MY |
|-----|----|----|-----|
| `skin.page.title` | AI Skin Analysis | AI肌�E极E| Analisis Kulit AI |
| `skin.upload.title` | Upload Facial Image | 面部画像をアチE�EローチE| Muat Naik Gambar Muka |
| `skin.upload.guidelines` | Capture Guidelines | 撮影ガイドライン | Panduan Pengambilan |
| `skin.upload.consent` | I consent to AI analysis of my image | AI画像�E析に同意しまぁE| Saya bersetuju untuk analisis AI gambar saya |
| `skin.upload.button` | Start Analysis | 刁E��開姁E| Mulakan Analisis |
| `skin.result.title` | Analysis Results | 刁E��結果 | Keputusan Analisis |
| `skin.result.healthScore` | Health Score | 健康スコア | Skor Kesihatan |
| `skin.result.hydration` | Hydration | 保湿玁E| Penghidratan |
| `skin.result.skinType` | Skin Type | 肌タイチE| Jenis Kulit |
| `skin.result.skinAge` | Skin Age | 肌年齢 | Umur Kulit |
| `skin.result.confidence` | Confidence | 信頼度 | Keyakinan |
| `skin.history.title` | Analysis History | 刁E��履歴 | Sejarah Analisis |
| `skin.history.export` | Export Report | レポ�Eト�E劁E| Eksport Laporan |
| `skin.history.exportAll` | Export Full History | 全履歴出劁E| Eksport Sejarah Penuh |
| `skin.trend.title` | Trend Visualization | トレンド可視化 | Visualisasi Trend |
| `skin.metrics.total` | Total Analyses | 総�E析数 | Jumlah Analisis |
| `skin.metrics.best` | Best Score | 最高スコア | Skor Terbaik |
| `skin.metrics.avgHydration` | Average Hydration | 平坁E��湿玁E| Purata Penghidratan |
| `skin.metrics.improvement` | Improvement | 改喁E�� | Peningkatan |
| `skin.condition.severity.NONE` | None | なぁE| Tiada |
| `skin.condition.severity.MILD` | Mild | 軽度 | Ringan |
| `skin.condition.severity.MODERATE` | Moderate | 中度 | Sederhana |
| `skin.condition.severity.SEVERE` | Severe | 重度 | Teruk |


---

## 14. Configurable Items (External Definitions)

### 14.1 Configuration Parameters

| Config ID | Parameter Name | Description | Default Value | Environment Variable |
|-----------|----------------|-------------|---------------|---------------------|
| CFG-SKIN-001 | Max Image Size | Maximum allowed file size in bytes | 10485760 | `SKIN_MAX_IMAGE_SIZE` |
| CFG-SKIN-002 | Allowed Image Types | Comma-separated list of allowed MIME types | `image/jpeg,image/png,image/webp` | `SKIN_ALLOWED_IMAGE_TYPES` |
| CFG-SKIN-003 | AI Service URL | Base URL for AI Analysis Service |  E| `AI_SERVICE_URL` |
| CFG-SKIN-004 | AI Service Timeout | Timeout in milliseconds for AI service calls | 30000 | `AI_SERVICE_TIMEOUT_MS` |
| CFG-SKIN-005 | Blob Storage Container | Azure Blob Storage container name | `skin-scans` | `SKIN_BLOB_CONTAINER` |
| CFG-SKIN-006 | Cache TTL | Redis cache TTL in seconds | 300 | `SKIN_CACHE_TTL_SECONDS` |
| CFG-SKIN-007 | Daily Analysis Limit | Maximum analyses per user per day | 5 | `SKIN_DAILY_LIMIT` |
| CFG-SKIN-008 | Image Retention Days | Days to retain raw images before deletion | 90 | `SKIN_IMAGE_RETENTION_DAYS` |
| CFG-SKIN-009 | PDF Export Enabled | Enable PDF export functionality | true | `SKIN_PDF_EXPORT_ENABLED` |
| CFG-SKIN-010 | Trend Min Data Points | Minimum data points for trend chart display | 2 | `SKIN_TREND_MIN_POINTS` |

### 14.2 External Service Dependencies

| Service | Purpose | API Version | Timeout | Retry Policy |
|---------|---------|:-----------:|---------|--------------|
| AI Analysis Service | Skin condition analysis from facial images | v1 | 30s | 3 retries, exponential backoff |
| Azure Blob Storage | Image file storage | 2021-04-10 | 10s | 2 retries, linear backoff |
| Azure Cache for Redis | Result caching |  E| 5s | 1 retry, immediate |
| PDF Generation Service | Report generation | v1 | 10s | 2 retries, linear backoff |

### 14.3 Feature Flags

| Flag Name | Description | Default | Rollout Strategy |
|-----------|-------------|:-------:|------------------|
| `feature.skin.trends` | Enable trend visualization charts | true | Full rollout |
| `feature.skin.compare` | Enable analysis comparison feature | true | Full rollout |
| `feature.skin.recommendations` | Enable product recommendations | true | Full rollout |
| `feature.skin.pdfExport` | Enable PDF export functionality | true | Full rollout |
| `feature.skin.websocket` | Enable WebSocket real-time updates | false | Gradual rollout |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements to Screen Elements Traceability

| Requirement ID | Requirement Summary | Screen Element IDs | Business Rule IDs | Error Code |
|----------------|---------------------|--------------------|--------------------|------------|
| B-SKIN-001 | Upload facial images for AI analysis | EL-105, EL-106, EL-107 | BR-SKIN-002, BR-SKIN-003, BR-SKIN-004, BR-SKIN-010 | 40001, 40002, 40003 |
| B-SKIN-002 | Validate image format and size | EL-105 | BR-SKIN-002, BR-SKIN-003 | 40001, 40002 |
| B-SKIN-003 | AI analysis provides skin type, age, scores | EL-108 | BR-SKIN-012 |  E|
| B-SKIN-004 | Condition severity display | EL-110, EL-111 | BR-SKIN-016 |  E|
| B-SKIN-005 | Clinical findings display | EL-112, EL-113, EL-114 | BR-SKIN-017 |  E|
| B-SKIN-006 | Analysis history sorted by latest | EL-116 | BR-SKIN-011 |  E|
| B-SKIN-007 | Own history only access |  E| BR-SKIN-006 | 40301 |
| B-SKIN-008 | Export single analysis PDF | EL-122 | BR-SKIN-014 | 50004 |
| B-SKIN-009 | Export full history PDF | EL-123 | BR-SKIN-014 | 50004 |
| B-SKIN-010 | Health score 0-100 scale | EL-108 | BR-SKIN-012 |  E|
| B-SKIN-011 | Hydration as percentage | EL-108 | BR-SKIN-012 |  E|
| B-SKIN-012 | Trend visualization over time | EL-117 | BR-SKIN-013 |  E|
| B-SKIN-013 | Mesh overlay display | EL-109 | BR-SKIN-015 |  E|
| B-SKIN-014 | Analysis comparison | EL-127 | BR-SKIN-020 | 40005 |
| B-SKIN-015 | Recommendation feedback | EL-128 | BR-SKIN-021 |  E|
| B-SKIN-016 | Summary metrics display | EL-118, EL-119, EL-120, EL-121 |  E|  E|
| B-SKIN-017 | Processing indicator | EL-124 |  E|  E|

### 15.2 Business Rules to Operations Traceability

| Business Rule ID | Rule Description | Associated Operations |
|------------------|------------------|----------------------|
| BR-SKIN-001 | Buyer-only access control | OP-SKIN-001 through OP-SKIN-010 |
| BR-SKIN-002 | Image format validation | OP-SKIN-002 |
| BR-SKIN-003 | Image size validation | OP-SKIN-002 |
| BR-SKIN-004 | Image resolution validation | OP-SKIN-002 |
| BR-SKIN-005 | Daily analysis limit | OP-SKIN-003 |
| BR-SKIN-006 | History scope isolation | OP-SKIN-005, OP-SKIN-006, OP-SKIN-008, OP-SKIN-009 |
| BR-SKIN-007 | Read-only results | OP-SKIN-004 |
| BR-SKIN-008 | Azure Blob Storage for images | OP-SKIN-002 |
| BR-SKIN-009 | Image retention policy | System (background job) |
| BR-SKIN-010 | Consent required | OP-SKIN-002 |
| BR-SKIN-011 | History sort order | OP-SKIN-005 |
| BR-SKIN-012 | Score display scale | OP-SKIN-004 |
| BR-SKIN-013 | Trend minimum data points | OP-SKIN-006 |
| BR-SKIN-014 | PDF export availability | OP-SKIN-007, OP-SKIN-008 |
| BR-SKIN-015 | Mesh overlay generation | OP-SKIN-003, OP-SKIN-004 |
| BR-SKIN-016 | Condition severity levels | OP-SKIN-004 |
| BR-SKIN-017 | Clinical findings display | OP-SKIN-004 |
| BR-SKIN-018 | Redis caching strategy | OP-SKIN-004, OP-SKIN-005, OP-SKIN-006 |
| BR-SKIN-019 | i18n support | All operations |
| BR-SKIN-020 | Analysis comparison | OP-SKIN-009 |
| BR-SKIN-021 | Recommendation feedback | OP-SKIN-010 |

### 15.3 Screen Elements to Operations Traceability

| Screen Element ID | Element Type | Bound Operations |
|-------------------|--------------|------------------|
| EL-101 | Header |  E|
| EL-102 | Breadcrumb |  E|
| EL-103 | Button "New Scan" | OP-SKIN-001 |
| EL-104 | Card Summary | OP-SKIN-004 (latest) |
| EL-105 | File Input | OP-SKIN-002 |
| EL-106 | Panel Guidelines | OP-SKIN-001 |
| EL-107 | Button "Start Analysis" | OP-SKIN-003 |
| EL-108 | Card Results | OP-SKIN-004 |
| EL-109 | Image Mesh | OP-SKIN-004 |
| EL-110 | Section Conditions | OP-SKIN-004 |
| EL-111 | Badge Severity | OP-SKIN-004 |
| EL-112 | Section Findings | OP-SKIN-004 |
| EL-113 | List Primary | OP-SKIN-004 |
| EL-114 | List Secondary | OP-SKIN-004 |
| EL-115 | Section History | OP-SKIN-005 |
| EL-116 | Table History | OP-SKIN-005 |
| EL-117 | Chart Trends | OP-SKIN-006 |
| EL-118 | Metric Total | OP-SKIN-005 |
| EL-119 | Metric Best | OP-SKIN-005 |
| EL-120 | Metric Avg | OP-SKIN-005 |
| EL-121 | Metric Improvement | OP-SKIN-005 |
| EL-122 | Button Export Single | OP-SKIN-007 |
| EL-123 | Button Export All | OP-SKIN-008 |
| EL-124 | Progress Bar | OP-SKIN-003 |
| EL-125 | Alert Error | Error handling |
| EL-126 | Alert Success | Success notification |
| EL-127 | Button Compare | OP-SKIN-009 |
| EL-128 | Button Feedback | OP-SKIN-010 |

---

## 16. Database Schema (DDL)

### 16.1 skin_analyses Table

```sql
CREATE TABLE skin_analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'PROCESSING'
                    CHECK (status IN ('UPLOADING','VALIDATING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
    skin_type       VARCHAR(50),
    skin_age        INTEGER CHECK (skin_age >= 0 AND skin_age <= 150),
    health_score    INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    hydration       INTEGER CHECK (hydration >= 0 AND hydration <= 100),
    confidence      INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    facial_scan_url VARCHAR(500) NOT NULL,
    mesh_overlay_url VARCHAR(500),
    ai_raw_response JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skin_analyses_user_id ON skin_analyses(user_id);
CREATE INDEX idx_skin_analyses_analysis_date ON skin_analyses(analysis_date DESC);
CREATE INDEX idx_skin_analyses_user_date ON skin_analyses(user_id, analysis_date DESC);
```

### 16.2 skin_analysis_conditions Table

```sql
CREATE TABLE skin_analysis_conditions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id     UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE,
    condition_name  VARCHAR(50) NOT NULL
                    CHECK (condition_name IN ('acne','redness','texture','pigmentation','dryness','pore_size')),
    severity        VARCHAR(10) NOT NULL DEFAULT 'NONE'
                    CHECK (severity IN ('NONE','MILD','MODERATE','SEVERE')),
    severity_score  INTEGER CHECK (severity_score >= 0 AND severity_score <= 100),
    affected_area   VARCHAR(100),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skin_analysis_conditions_analysis_id ON skin_analysis_conditions(analysis_id);
CREATE UNIQUE INDEX idx_skin_analysis_conditions_unique ON skin_analysis_conditions(analysis_id, condition_name);
```

### 16.3 skin_analysis_findings Table

```sql
CREATE TABLE skin_analysis_findings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id     UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE,
    finding_type    VARCHAR(10) NOT NULL CHECK (finding_type IN ('PRIMARY','SECONDARY')),
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    affected_area   VARCHAR(100),
    severity        VARCHAR(10) NOT NULL DEFAULT 'NONE'
                    CHECK (severity IN ('NONE','MILD','MODERATE','SEVERE')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skin_analysis_findings_analysis_id ON skin_analysis_findings(analysis_id);
```

### 16.4 skin_analysis_recommendations Table

```sql
CREATE TABLE skin_analysis_recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id     UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE,
    product_type    VARCHAR(100) NOT NULL,
    product_name    VARCHAR(200) NOT NULL,
    reason          TEXT NOT NULL,
    priority        VARCHAR(10) NOT NULL DEFAULT 'MEDIUM'
                    CHECK (priority IN ('HIGH','MEDIUM','LOW')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skin_analysis_recommendations_analysis_id ON skin_analysis_recommendations(analysis_id);
```

### 16.5 skin_analysis_feedback Table

```sql
CREATE TABLE skin_analysis_feedback (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES skin_analysis_recommendations(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful        BOOLEAN NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(recommendation_id, user_id)
);

CREATE INDEX idx_skin_analysis_feedback_user_id ON skin_analysis_feedback(user_id);
```

---

## 17. Prisma Schema Definition

```prisma
model SkinAnalysis {
  id              String                  @id @default(uuid()) @db.Uuid
  userId          String                  @map("user_id") @db.Uuid
  analysisDate    DateTime                @default(now()) @map("analysis_date")
  status          String                  @default("PROCESSING")
  skinType        String?                 @map("skin_type")
  skinAge         Int?                    @map("skin_age")
  healthScore     Int?                    @map("health_score")
  hydration       Int?
  confidence      Int?
  facialScanUrl   String                  @map("facial_scan_url")
  meshOverlayUrl  String?                 @map("mesh_overlay_url")
  aiRawResponse   Json?                   @map("ai_raw_response")
  createdAt       DateTime                @default(now()) @map("created_at")
  updatedAt       DateTime                @default(now()) @map("updated_at")

  user            User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  conditions      SkinAnalysisCondition[]
  findings        SkinAnalysisFinding[]
  recommendations SkinAnalysisRecommendation[]

  @@index([userId])
  @@index([analysisDate(sort: Desc)])
  @@index([userId, analysisDate(sort: Desc)])
  @@map("skin_analyses")
}

model SkinAnalysisCondition {
  id             String       @id @default(uuid()) @db.Uuid
  analysisId     String       @map("analysis_id") @db.Uuid
  conditionName  String       @map("condition_name")
  severity       String       @default("NONE")
  severityScore  Int?         @map("severity_score")
  affectedArea   String?      @map("affected_area")
  description    String?
  createdAt      DateTime     @default(now()) @map("created_at")

  analysis       SkinAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@unique([analysisId, conditionName])
  @@index([analysisId])
  @@map("skin_analysis_conditions")
}

model SkinAnalysisFinding {
  id             String       @id @default(uuid()) @db.Uuid
  analysisId     String       @map("analysis_id") @db.Uuid
  findingType    String       @map("finding_type")
  title          String
  description    String
  affectedArea   String?      @map("affected_area")
  severity       String       @default("NONE")
  createdAt      DateTime     @default(now()) @map("created_at")

  analysis       SkinAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)

  @@index([analysisId])
  @@map("skin_analysis_findings")
}

model SkinAnalysisRecommendation {
  id             String                 @id @default(uuid()) @db.Uuid
  analysisId     String                 @map("analysis_id") @db.Uuid
  productType    String                 @map("product_type")
  productName    String                 @map("product_name")
  reason         String
  priority       String                 @default("MEDIUM")
  createdAt      DateTime               @default(now()) @map("created_at")

  analysis       SkinAnalysis           @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  feedback       SkinAnalysisFeedback[]

  @@index([analysisId])
  @@map("skin_analysis_recommendations")
}

model SkinAnalysisFeedback {
  id               String                   @id @default(uuid()) @db.Uuid
  recommendationId String                   @map("recommendation_id") @db.Uuid
  userId           String                   @map("user_id") @db.Uuid
  isHelpful        Boolean                  @map("is_helpful")
  createdAt        DateTime                 @default(now()) @map("created_at")
  updatedAt        DateTime                 @default(now()) @map("updated_at")

  recommendation   SkinAnalysisRecommendation @relation(fields: [recommendationId], references: [id], onDelete: Cascade)
  user             User                     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([recommendationId, userId])
  @@index([userId])
  @@map("skin_analysis_feedback")
}
```

---

## 18. Acceptance Criteria

### 18.1 Image Upload (UC-SKIN-001)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-001 | Valid JPG upload | User is authenticated Buyer | User selects valid JPG file ≤ 10MB | Image uploaded successfully, capture guidelines hidden |
| AC-002 | Valid PNG upload | User is authenticated Buyer | User selects valid PNG file ≤ 10MB | Image uploaded successfully |
| AC-003 | Valid WebP upload | User is authenticated Buyer | User selects valid WebP file ≤ 10MB | Image uploaded successfully |
| AC-004 | Invalid format rejection | User is authenticated Buyer | User selects GIF file | Error 40001 displayed, upload rejected |
| AC-005 | Oversized file rejection | User is authenticated Buyer | User selects 15MB JPG | Error 40002 displayed, upload rejected |
| AC-006 | Consent required | User is authenticated Buyer | User clicks Start Analysis without consent | Error 40003 displayed, analysis blocked |
| AC-007 | Daily limit reached | User has 5 analyses today | User attempts 6th analysis | Error 42901 displayed, analysis blocked |

### 18.2 Analysis Results (UC-SKIN-002)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-008 | Display health score | Analysis completed with score 85 | User views results | Health score shows "85" (integer, 0-100) |
| AC-009 | Display hydration | Analysis completed with hydration 72% | User views results | Hydration shows "72%" (percentage) |
| AC-010 | Display skin type | Analysis completed with type "Combination" | User views results | Skin type shows "Combination" |
| AC-011 | Display conditions | Analysis completed with acne=MILD | User views conditions | Acne badge shows "MILD" with yellow color |
| AC-012 | Display mesh overlay | Analysis completed with mesh URL | User views results | Mesh overlay image displayed |
| AC-013 | Display findings | Analysis completed with primary concern | User views findings | Primary concern listed with description |
| AC-014 | Results read-only | Analysis completed | User views results | No edit/modify buttons visible |

### 18.3 Analysis History (UC-SKIN-003)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-015 | History sorted by latest | User has 3 analyses on different dates | User views history | Most recent analysis appears first |
| AC-016 | Own history only | User is authenticated | User queries history | Only own analysis records returned |
| AC-017 | Empty history state | User has no analyses | User views history | Empty state message displayed |
| AC-018 | Pagination works | User has 25 analyses | User navigates page 2 | 10 records displayed on page 2 |

### 18.4 Export (UC-SKIN-004, UC-SKIN-005)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-019 | Export single PDF | Viewing completed analysis | User clicks Export Report | PDF downloads with analysis details |
| AC-020 | Export full history | User has 3+ analyses | User clicks Export Full History | PDF downloads with all records |
| AC-021 | Export failure handling | PDF service unavailable | User clicks Export | Error 50004 displayed with retry option |

### 18.5 Trend Visualization (UC-SKIN-006)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-022 | Chart renders with data | User has 3 analyses | User views trends | Health score chart rendered with 3 data points |
| AC-023 | Placeholder for insufficient data | User has 1 analysis | User views trends | Placeholder message displayed |
| AC-024 | Hydration chart | User has 2+ analyses | User views trends | Hydration trend chart rendered |

### 18.6 Comparison (UC-SKIN-011)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-025 | Compare two analyses | User has 2+ analyses | User selects two analyses for comparison | Side-by-side comparison displayed |
| AC-026 | Score delta shown | Analysis 1 score=80, Analysis 2 score=85 | Comparison displayed | Delta shows "+5" with green indicator |
| AC-027 | Same user validation | User selects own analysis and another user's | System checks ownership | Error 40301 displayed |

### 18.7 Recommendations (UC-SKIN-008, UC-SKIN-009, UC-SKIN-010)

| AC-ID | Scenario | Given | When | Then |
|-------|----------|-------|------|------|
| AC-028 | Recommendations displayed | Analysis completed with recommendations | User views results | Product recommendations listed with priority |
| AC-029 | Feedback submitted | User views recommendation | User clicks "Helpful" | Feedback recorded, confirmation shown |
| AC-030 | Feedback updated | User previously rated recommendation | User changes rating | Feedback updated, statistics refreshed |

