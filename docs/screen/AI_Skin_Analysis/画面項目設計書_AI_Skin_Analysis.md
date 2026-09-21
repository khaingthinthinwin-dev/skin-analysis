# Screen Items Specification (画面項目設計書) — AI Skin Analysis Portal

**Document ID:** SKM-SIS-SCR-002  
**Target Screen:** AI Skin Analysis Portal (AI肌分析ポータル)  
**Subsystem:** Skin Analysis — Image Upload, AI Processing & Historical Tracking  
**Function ID:** FN-SKIN-001  
**Version:** 1.0  
**Created:** 2026-09-18  
**Last Updated:** 2026-09-18  
**Author:** Senior System Engineer  
**Review Status:** Draft (ドラフト)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-09-18 | Senior System Engineer | Initial release. Screen items specification for AI Skin Analysis Portal covering image upload, AI analysis result display, condition severity, clinical findings, analysis history, trend visualization, report export, analysis comparison, and recommendation feedback. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | docs/core-work/REQUIREMENT_SPEC.md | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | docs/core-work/DATABASE_SPEC.md | Table structures, constraints. |
| 3 | SKM-DEV-001 | Development Rules | docs/core-work/DEVELOPMENT_RULES.md | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-SKIN-001 | Functional Specification AI Skin Analysis | docs/screen/AI_Skin_Analysis/機能設計書_AI_Skin_Analysis.md | Use cases, state transitions, business rules, error handling, DB schema. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The AI Skin Analysis Portal is the core skin health feature within the Cosmetics Finder platform. It enables authenticated Buyers to upload facial images, receive AI-powered skin condition analysis, review current skin health metrics (health score, hydration, skin type, skin age), and track historical analysis results over time. The portal is exclusive to the Buyer role.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated Buyers |
| **Required Authentication** | JWT Bearer Token |
| **Data Scope** | Own analysis history and skin metrics only |
| **Access Control** | Buyer role only — Merchant and Admin roles denied access |

### 2.3 Core Functions (主要機能)
1. Image Upload & Validation — Accept facial images (JPG, PNG, WebP, max 10MB) with capture guidelines.
2. AI Analysis Processing — Orchestrate AI processing with real-time progress indicator.
3. Result Visualization — Display analysis results: scores, facial mesh overlay, condition severity badges.
4. Clinical Findings — Present primary and secondary concerns with descriptions.
5. Analysis History — Chronological history table with sorting, pagination, and per-row export.
6. Trend Charts — Health score and hydration trend visualizations (requires >= 2 analyses).
7. Summary Metrics — Total analyses, best score, average hydration, improvement percentage.
8. Report Export — PDF export for single analysis and full history.
9. Analysis Comparison — Side-by-side comparison of two analyses with score deltas.
10. Recommendation Feedback — Helpful / Not Helpful feedback on product recommendations.
11. Internationalization — Full i18n support for EN, JA, MY.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure & Wireframes (全体画面構成・ワイヤーフレーム)

#### Default / Portal Dashboard State (初期・ダッシュボード表示)
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                BROWSER VIEWPORT                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [A] CAMERA CAPTURE & UPLOAD PANEL                                           │ │
│ │                                                                             │ │
│ │  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │ │
│ │  │      [btnUploadPhoto]           │  │      [btnTakePhoto]             │  │ │
│ │  │      📁 Upload Photo            │  │      📷 Take Photo              │  │ │
│ │  │   (File picker for image)       │  │   (Camera capture)             │  │ │
│ │  └─────────────────────────────────┘  └─────────────────────────────────┘  │ │
│ │                                                                             │ │
│ │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ [A2] AI SKIN ANALYSIS SCAN                                          │   │ │
│ │  │                                                                     │   │ │
│ │  │  [imgPreviewThumbnail]    AI Analysis Ready                        │   │ │
│ │  │  (Preview when selected)  Upload or take a photo to start scan     │   │ │
│ │  │                                                                     │   │ │
│ │  │  [x] [chkConsent] I consent to AI facial analysis processing       │   │ │
│ │  │                                                                     │   │ │
│ │  │              [Start AI Scan]                                        │   │ │
│ │  └─────────────────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [B] ANALYSIS SUMMARY CARD (Latest Scan Overview)                            │ │
│ │  ┌──────────────┐  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │ Health Score │  │ Hydration: 72% | Skin Type: Combination | Age: 28    │ │ │
│ │  │     85       │  │ Last Analyzed: 2026-08-21 14:30                      │ │ │
│ │  └──────────────┘  └──────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [H] SUMMARY METRICS BAR                                                     │ │
│ │ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐ │ │
│ │ │Total Scans: 12│ │Best Score: 88 │ │Avg Hydr: 71%  │ │Improvement: +15%  │ │ │
│ │ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [I] ANALYSIS HISTORY TABLE                       [Compare] [Export History] │ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [ ] Date        | Score | Hydration | Skin Age | Actions                │ │ │
│ │ │ ─── ─────────── | ───── | ───────── | ──────── | ────────────────────── │ │ │
│ │ │ [ ] 2026-08-21  |  85   |    72%    |    28    | [View] [PDF]           │ │ │
│ │ │ [ ] 2026-08-14  |  82   |    68%    |    28    | [View] [PDF]           │ │ │
│ │ │ [ ] 2026-08-07  |  78   |    65%    |    29    | [View] [PDF]           │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │  << Previous  [1] 2 3  Next >>                                              │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [J] TREND VISUALIZATION                                                     │ │
│ │  ┌───────────────────────────────────┐ ┌───────────────────────────────────┐│ │
│ │  │ Health Score Trend (Line Chart)   │ │ Hydration Level Trend (Line Chart)││ │
│ │  │ 100┌──────/──\                    │ │ 100┌───────/───\                  ││ │
│ │  │    │     /    \                   │ │    │      /     \                 ││ │
│ │  │   0└───────────────────────────── │ │   0└───────────────────────────── ││ │
│ │  └───────────────────────────────────┘ └───────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Image Upload Modal / Capture Guidelines Panel State ([C] 表示状態)
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [C] CAPTURE GUIDELINES & UPLOAD PANEL                               [X]     │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ 📷 Capture Guidelines:                                                      │ │
│ │  1. Ensure even, natural lighting (avoid harsh backlighting or shadows)     │ │
│ │  2. Keep face centered and upright within camera frame                      │ │
│ │  3. Remove glasses, hats, heavy makeup, and hair accessories                │ │
│ │  4. Maintain neutral facial expression, look straight into lens             │ │
│ │  5. Minimum image resolution: 640x480px (JPG, PNG, WebP up to 10MB)         │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [uplFacialImage] Drag & Drop Facial Photo Here or [Browse Files]        │ │ │
│ │ │ [imgPreviewThumbnail] (Thumbnail preview displayed when selected)      │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │ [x] [chkConsent] I consent to AI facial analysis processing for skin health │ │
│ │                                                                             │ │
│ │                       [Cancel]   [Start Analysis]                           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Processing State Panel ([K] AI解析処理中状態)
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [K] AI PROCESSING IN PROGRESS...                                            │ │
│ │                                                                             │ │
│ │           [ Animated Spinner / AI Scanning Graphic ]                        │ │
│ │                                                                             │ │
│ │  [=========================>                    ] 65%                       │ │
│ │  Status: Analyzing facial conditions (pores, texture, redness)...           │ │
│ │  Step 2 of 3: AI Diagnostic Neural Inference                                │ │
│ │                                                                             │ │
│ │  * Please do not close or refresh this browser window.                      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Completed Analysis Result View ([D], [E], [F], [G] 詳細結果表示状態)
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [D] AI FACIAL ANALYSIS RESULT                    [Export PDF] [New Scan]    │ │
│ │ ┌───────────────────────────┐ ┌───────────────────────────────────────────┐ │ │
│ │ │ [imgMeshOverlay]          │ │ Health Score: [ 85 / 100 ]                │ │ │
│ │ │                           │ │ Hydration:    [ 72% ]                     │ │ │
│ │ │ Facial Image with AI      │ │ Skin Type:    [ Combination ]             │ │ │
│ │ │ Landmark & Mesh Overlay   │ │ Skin Age:     [ 28 yrs ]                  │ │ │
│ │ │ (Acne, Redness, Texture)  │ │ Confidence:   [ 94% ]                     │ │ │
│ │ └───────────────────────────┘ └───────────────────────────────────────────┘ │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ [E] CONDITION SEVERITY BREAKDOWN                                            │ │
│ │  [Acne: MILD]   [Redness: NONE]   [Texture: MODERATE]   [Pores: MILD]       │ │
│ │  [Pigmentation: NONE]             [Dryness: MILD]                           │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ [F] CLINICAL FINDINGS & CONCERNS                                            │ │
│ │  • Primary: Moderate texture irregularity across T-zone                     │ │
│ │  • Secondary: Mild dehydration detected along cheek perimeter               │ │
│ │  • Overall Assessment: Skin barrier is healthy with mild congestion.        │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ [G] PERSONALIZED PRODUCT RECOMMENDATIONS                                    │ │
│ │  ┌────────────────────────────────────────────────────────────────────────┐ │ │
│ │  │ CeraVe Hydrating Facial Cleanser [High Priority]                       │ │ │
│ │  │ Reason: Gentle ceramide hydration to restore T-zone balance            │ │ │
│ │  │ Feedback: [👍 Helpful] [👎 Not Helpful]                                │ │ │
│ │  └────────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Analysis Comparison Modal View ([L], [M], [N] 2件の比較表示状態)
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [L/M/N] ANALYSIS COMPARISON (2026-08-14 vs 2026-08-21)               [Back] │ │
│ ├──────────────────────────────────────┬──────────────────────────────────────┤ │
│ │ BASELINE SCAN: 2026-08-14            │ CURRENT SCAN: 2026-08-21             │ │
│ │ Health Score: 78                     │ Health Score: 85 (▲ +7 Improved!)    │ │
│ │ Hydration:    65%                    │ Hydration:    72% (▲ +7% Improved!)  │ │
│ │ Skin Age:     29                     │ Skin Age:     28 (▼ -1 yr Younger)   │ │
│ ├──────────────────────────────────────┴──────────────────────────────────────┤ │
│ │ CONDITION DELTA SUMMARY:                                                    │ │
│ │  • Acne:         MODERATE ───► MILD     (Improved ✅)                        │ │
│ │  • Redness:      MILD     ───► NONE     (Resolved ✅)                        │ │
│ │  • Texture:      MODERATE ───► MODERATE (Unchanged ─)                       │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Page Structure Sections (構成セクション一覧)
- [A] CAMERA CAPTURE & UPLOAD PANEL — Upload Photo Button + Take Photo Button + AI Scan Section
- [A1] UPLOAD PHOTO BUTTON — File picker for facial image upload
- [A2] AI SKIN ANALYSIS SCAN — Preview + Consent + Start Analysis Button
- [A3] TAKE PHOTO BUTTON — Camera capture functionality
- [B] ANALYSIS SUMMARY CARD — Latest Health Score, Hydration, Skin Type, Skin Age
- [C] CAPTURE GUIDELINES PANEL (conditional) — Guidelines + File Upload + Consent + Submit
- [D] AI FACIAL ANALYSIS CARD (conditional) — Mesh Overlay, Scores, Skin Type, Skin Age
- [E] CONDITION SEVERITY SECTION (conditional) — Acne, Redness, Texture, Pigmentation, Dryness, Pore Size
- [F] CLINICAL FINDINGS SECTION (conditional) — Primary Concerns, Secondary Concerns
- [G] RECOMMENDATIONS SECTION (conditional) — Product Recommendations + Feedback Buttons
- [H] SUMMARY METRICS BAR — Total Analyses, Best Score, Avg Hydration, Improvement %
- [I] ANALYSIS HISTORY SECTION — History Table + Export Full History Button
- [J] TREND VISUALIZATION SECTION — Health Score Chart, Hydration Chart
- [K] PROCESSING STATE PANEL (conditional) — Progress Bar, Status Text, Steps
- [L/M] COMPARISON PANELS (conditional) — Side-by-side analysis panels
- [N] DELTA SUMMARY ROW (conditional) — Score Delta, Hydration Delta

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Single-column layout, stacked cards, full-width buttons |
| Tablet (md:) | 768px | Two-column metric cards, collapsible history table |
| Desktop (lg:) | 1024px | Three-column metric row, side-by-side charts |
| Wide (xl:) | 1280px | Full layout with comparison panel side-by-side |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Camera Capture & Upload Panel (カメラキャプチャ＆アップロードパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | pnlCameraCapture | Camera Capture & Upload Panel | Panel / Card | — | — | Always displayed as primary section. | — | — | Main entry point for skin analysis. Contains upload, camera, and scan sections. |
| 2 | btnUploadPhoto | Upload Photo Button | Button default | — | — | Visible. Text: "Upload Photo". Icon: Upload. | — | — | Opens file picker for JPG, PNG, WebP images. Triggers uplFacialImage file input. i18n: skin.upload.photo. |
| 3 | btnTakePhoto | Take Photo Button | Button outline | — | — | Visible. Text: "Take Photo". Icon: Camera. | — | — | Opens device camera for real-time capture. Only available on devices with camera. i18n: skin.upload.takePhoto. |
| 4 | uplFacialImage | Facial Image Upload | File Input file | File (Binary) | Conditional | Empty. Hidden behind btnUploadPhoto. | Accepted MIME: image/jpeg, image/png, image/webp. Max size: 10MB (10,485,760 bytes). | skin_analyses.facial_scan_url (stored in Azure Blob Storage) | Validates format (BR-SKIN-002) and size (BR-SKIN-003). |
| 5 | pnlCameraView | Camera Viewfinder Panel | Panel / Video | — | — | Hidden. Shown when btnTakePhoto clicked. | — | — | Real-time camera preview with capture button. |
| 6 | videoCameraPreview | Camera Preview Video | Video element | — | — | Live camera feed displayed. | — | navigator.mediaDevices.getUserMedia | Shows front-facing camera by default. |
| 7 | btnCapturePhoto | Capture Photo Button | Button default | — | — | Visible. Text: "Capture". Icon: CircleDot. | — | — | Captures current frame from camera. Stops camera stream. |
| 8 | btnRetakePhoto | Retake Photo Button | Button outline | — | — | Hidden. Shown after photo captured. Text: "Retake". | — | — | Restarts camera preview for new capture. |
| 9 | imgPreviewThumbnail | Image Preview Thumbnail | Image img | — | — | Hidden until file selected or photo captured. | Max display size: 240x240px | — | Client-side object URL preview. Shows captured or uploaded image. |
| 10 | lblFileName | Selected File Name | Static Label | String(255) | — | Hidden until file selected. Shows filename. | — | — | Displayed below preview thumbnail. |
| 11 | btnRemoveFile | Remove Selected File | Icon Button Danger | — | — | Visible only when file is selected. Trash icon. | — | — | Clears image selection. Reverts to initial state. |

### 4.1.1 Section [A2]: AI Skin Analysis Scan (AI肌分析スキャン)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 12 | pnlAIScan | AI Skin Analysis Scan Panel | Panel / Card | — | — | Always displayed below upload/camera buttons. | — | — | Contains preview, consent, and start analysis. |
| 13 | lblScanTitle | AI Scan Title | Static Label h3 | String | — | Text: "AI Skin Analysis Scan" | — | Hardcoded UI text | i18n: skin.scan.title. |
| 14 | lblScanSubtitle | AI Scan Subtitle | Static Label p | String | — | Text: "Upload or take a photo to start scan" | — | Hardcoded UI text | Shown when no image selected. i18n: skin.scan.subtitle. |
| 15 | chkConsent | Analysis Consent Checkbox | Checkbox | Boolean | Mandatory | Unchecked by default. | Must be true to proceed. | — | Label: "I consent to AI analysis of my image". Required per BR-SKIN-010. i18n: skin.upload.consent. |
| 16 | btnStartAnalysis | Start AI Scan Button | Button submit default | — | — | Visible. Text: "Start AI Scan". Disabled until file selected AND consent checked. | — | — | Full width. Loading: Spinner + "Analyzing...". Disabled when loading. i18n: skin.upload.startScan. |
| 17 | alrtUploadError | Upload Validation Error Alert | Alert destructive | String | Conditional | Hidden. Shown on validation or upload error. | — | API error / client validation error | Dismissible. Error codes: 40001, 40002, 40003, 50001. |

### 4.2 Section [B]: Analysis Summary Card (分析サマリーカード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | crdSummary | Analysis Summary Card | Card | — | — | Shown if latestAnalysis exists; empty state if none. | — | skin_analyses (latest record for user) | Displays most recent completed analysis overview. |
| 5 | lblSummaryHealthScore | Latest Health Score | Static Label | Integer | — | Displays latest health_score. Default: — if none. | 0-100 | skin_analyses.health_score | i18n: skin.result.healthScore. Color-coded ring indicator. |
| 6 | lblSummaryHydration | Latest Hydration | Static Label | Integer (%) | — | Displays latest hydration. Default: — if none. | 0-100 | skin_analyses.hydration | i18n: skin.result.hydration. Displayed as percentage. |
| 7 | lblSummarySkinType | Latest Skin Type | Static Label | String(50) | — | Displays latest skin_type. Default: — if none. | — | skin_analyses.skin_type | i18n: skin.result.skinType. |
| 8 | lblSummarySkinAge | Latest Skin Age | Static Label | Integer | — | Displays latest skin_age. Default: — if none. | — | skin_analyses.skin_age | i18n: skin.result.skinAge. Displayed in years. |
| 9 | lblSummaryDate | Latest Analysis Date | Static Label | ISO 8601 DateTime | — | Displays analysis_date of latest analysis. | — | skin_analyses.analysis_date | Formatted as locale date string. |
| 10 | statEmptySummary | Empty State No Analysis | Static Label + Icon | String | — | Shown when no analysis exists. Text: "No analysis yet. Start your first scan!" | — | — | Shows prompt to click "New Scan". Icon: ScanFace. |

### 4.3 Section [C]: Capture Guidelines Panel (撮影ガイドラインパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 11 | pnlCaptureGuidelines | Capture Guidelines Panel | Panel / Card | — | — | Hidden by default. Shown when user clicks btnNewScan. | — | — | Dismissed on cancel or after successful upload. |
| 12 | lblGuidelinesTitle | Guidelines Title | Static Label h2 | String | — | Text: "Capture Guidelines" | — | Hardcoded UI text | i18n: skin.upload.guidelines. |
| 13 | lstGuidelinesItems | Capture Guidelines List | Ordered List | — | — | Always visible when panel open. | — | Hardcoded UI text | Items: Good lighting, Face centered, No accessories, Neutral expression, 640x480px minimum. |
| 14 | lblUploadTitle | Upload Section Title | Static Label | String | — | Text: "Upload Facial Image" | — | Hardcoded UI text | i18n: skin.upload.title. |
| 14A | bdgDailyQuota | Daily Analysis Quota Badge | Badge | String | — | Displays remaining scans: "Scans remaining today: X / 5" | Resets 00:00:00 UTC | Derived from API remainingDailyQuota | i18n: skin.upload.remainingQuota. Amber if <=1, Emerald if >=2. |
| 14B | tabUploadMode | Upload Mode Toggle | Tabs / Segmented Control | Enum | — | Default: "file" | Options: file ("Upload Photo"), camera ("Take Photo") | — | Toggles between file dropzone and live camera viewfinder. |
| 14C | btnTakePhoto | Open Camera Button | Button outline | — | — | Visible when camera tab active. Text: "Start Camera" | Requires camera permission | — | Requests navigator.mediaDevices.getUserMedia stream. |
| 14D | camViewfinder | Live Camera Viewfinder | Video video | VideoStream | Conditional | Hidden by default. Shown when camera stream active. | 640x480px min resolution | — | Live webcam/front-camera viewfinder with facial alignment oval overlay. |
| 14E | btnCaptureFrame | Capture Photo Button | Button default | — | Conditional | Visible when camera stream active. Text: "Capture Photo" | — | — | Captures video frame to canvas, creates Blob, and sets uplFacialImage. |
| 14F | btnRetakeFrame | Retake Photo Button | Button outline | — | Conditional | Visible after photo captured from camera. Text: "Retake" | — | — | Clears captured frame, restarts live camera stream. |
| 15 | uplFacialImage | Facial Image Upload | File Input file | File (Binary) | Mandatory | Empty. Placeholder: "Drag & drop or click to upload" | Accepted MIME: image/jpeg, image/png, image/webp. Max size: 10MB (10,485,760 bytes). | skin_analyses.facial_scan_url (stored in Azure Blob Storage) | Drag & drop zone + file picker button. Validates format (BR-SKIN-002) and size (BR-SKIN-003). |
| 16 | lblFilePreviewName | Selected File Name | Static Label | String(255) | — | Hidden until file selected. Shows filename after selection. | — | — | Displayed below upload zone. |
| 17 | btnRemoveFile | Remove Selected File | Icon Button Danger | — | — | Visible only when file is selected. Trash icon. | — | — | Clears uplFacialImage selection. Reverts to upload zone. |
| 18 | imgPreviewThumbnail | Image Preview Thumbnail | Image img | — | — | Hidden until file selected. Shows thumbnail of selected image. | Max display size: 120x120px | — | Client-side object URL preview. Not stored until submission. |
| 19 | chkConsent | Analysis Consent Checkbox | Checkbox | Boolean | Mandatory | Unchecked by default. | Must be true to proceed. | — | Label: "I consent to AI analysis of my image". Required per BR-SKIN-010. i18n: skin.upload.consent. |
| 20 | btnStartAnalysis | Start Analysis Button | Button submit default | — | — | Visible. Text: "Start Analysis". Disabled until file selected AND consent checked. | — | — | Full width. Loading: Spinner + "Analyzing...". Disabled when loading. i18n: skin.upload.button. |
| 21 | btnCancelUpload | Cancel Upload Button | Button outline | — | — | Visible. Text: "Cancel". | — | — | Dismisses pnlCaptureGuidelines and resets upload state. |
| 22 | alrtUploadError | Upload Validation Error Alert | Alert destructive | String | Conditional | Hidden. Shown on validation or upload error. | — | API error / client validation error | Dismissible. Error codes: 40001, 40002, 40003, 50001. |
| 23 | alrtUploadSuccess | Upload Success Alert | Alert success | String | Conditional | Hidden. Shown on successful upload. Text: "Image uploaded successfully." | — | — | Auto-dismiss after 3 seconds. |

### 4.4 Section [D]: AI Facial Analysis Card (AI顔分析カード)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 24 | crdAnalysisResult | AI Facial Analysis Card | Card | — | — | Hidden until analysis COMPLETED. | — | skin_analyses | Displays full analysis result. Read-only (BR-SKIN-007). |
| 25 | imgMeshOverlay | Facial Mesh Overlay Image | Image img | URL | — | Placeholder image while loading. | — | skin_analyses.mesh_overlay_url | Alt text: "AI facial mesh overlay". i18n key for alt: skin.result.meshAlt. Shows placeholder if URL is null. |
| 26 | lblResultHealthScore | Health Score Display | Static Label | Integer | — | Displays health_score as integer 0-100. | 0-100 | skin_analyses.health_score | i18n: skin.result.healthScore. Large display number with color ring. |
| 27 | lblResultHydration | Hydration Display | Static Label | Integer (%) | — | Displays hydration as percentage. | 0-100% | skin_analyses.hydration | i18n: skin.result.hydration. Shown as "72%". |
| 28 | lblResultSkinType | Skin Type Display | Static Label | String(50) | — | Displays skin_type value. | — | skin_analyses.skin_type | i18n: skin.result.skinType. Values: Oily, Dry, Combination, Normal. |
| 29 | lblResultSkinAge | Skin Age Display | Static Label | Integer | — | Displays skin_age in years. | — | skin_analyses.skin_age | i18n: skin.result.skinAge. |
| 30 | lblResultConfidence | AI Confidence Display | Static Label | Integer (%) | — | Displays confidence as percentage. | 0-100% | skin_analyses.confidence | i18n: skin.result.confidence. |
| 31 | lblResultDate | Analysis Date Display | Static Label | ISO 8601 DateTime | — | Displays analysis_date. | — | skin_analyses.analysis_date | Formatted as locale date string. |
| 32 | btnExportSingleReport | Export Single Report Button | Button outline | — | — | Visible when analysis COMPLETED. Text: "Export Report". | — | skin_analyses.id | Triggers PDF generation for current analysis (OP-SKIN-007). Icon: Download. i18n: skin.history.export. |
| 33 | btnCompare | Compare Analyses Button | Button outline | — | — | Visible when >= 2 analyses exist. Text: "Compare". | — | skin_analyses.id | Opens analysis comparison flow (OP-SKIN-009). Icon: GitCompare. i18n: skin.compare.button. |
| 34 | btnNewScanFromResult | New Scan Button in result | Button default | — | — | Visible. Text: "New Scan". | — | — | Reopens Capture Guidelines Panel. Same as btnNewScan in header. |

### 4.5 Section [E]: Condition Severity Section (肌状態重症度セクション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 35 | sctConditions | Condition Severity Section | Section | — | — | Hidden until analysis COMPLETED. | — | skin_analysis_conditions | Displays all detected conditions. |
| 36 | lblConditionsTitle | Conditions Section Title | Static Label h3 | String | — | Text: "Skin Conditions" | — | Hardcoded UI text | i18n: skin.condition.title. |
| 37 | bdgAcne | Acne Severity Badge | Badge | Enum | — | Shown if condition exists. | Values: NONE, MILD, MODERATE, SEVERE | skin_analysis_conditions WHERE condition_name = 'acne' | Color: NONE=Green, MILD=Yellow, MODERATE=Orange, SEVERE=Red. i18n: skin.condition.acne. |
| 38 | bdgRedness | Redness Severity Badge | Badge | Enum | — | Shown if condition exists. | Values: NONE, MILD, MODERATE, SEVERE | skin_analysis_conditions WHERE condition_name = 'redness' | Same color mapping as bdgAcne. i18n: skin.condition.redness. |
| 39 | bdgTexture | Texture Severity Badge | Badge | Enum | — | Shown if condition exists. | Values: NONE, MILD, MODERATE, SEVERE | skin_analysis_conditions WHERE condition_name = 'texture' | i18n: skin.condition.texture. |
| 40 | bdgPigmentation | Pigmentation Severity Badge | Badge | Enum | — | Shown if condition exists. | Values: NONE, MILD, MODERATE, SEVERE | skin_analysis_conditions WHERE condition_name = 'pigmentation' | i18n: skin.condition.pigmentation. |
| 41 | bdgDryness | Dryness Severity Badge | Badge | Enum | — | Shown if condition exists. | Values: NONE, MILD, MODERATE, SEVERE | skin_analysis_conditions WHERE condition_name = 'dryness' | i18n: skin.condition.dryness. |
| 42 | bdgPoreSize | Pore Size Severity Badge | Badge | Enum | — | Shown if condition exists. | Values: NONE, MILD, MODERATE, SEVERE | skin_analysis_conditions WHERE condition_name = 'pore_size' | i18n: skin.condition.poreSize. |
| 43 | lblConditionDetail | Condition Detail Text | Static Label | String (Text) | — | Shown on badge hover/expand. Displays description and affected_area. | — | skin_analysis_conditions.description, skin_analysis_conditions.affected_area | Tooltip or expandable row below badge. |

### 4.6 Section [F]: Clinical Findings Section (臨床所見セクション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 44 | sctFindings | Clinical Findings Section | Section | — | — | Hidden until analysis COMPLETED. | — | skin_analysis_findings | Displays primary and secondary concerns. |
| 45 | lblFindingsTitle | Findings Section Title | Static Label h3 | String | — | Text: "Clinical Findings" | — | Hardcoded UI text | i18n: skin.findings.title. |
| 46 | lstPrimaryConcerns | Primary Concerns List | List ul | Array FindingDTO | — | Displayed when primary findings exist. Empty state shown if none. | — | skin_analysis_findings WHERE finding_type = 'PRIMARY' | Each item shows title, description, affected_area, severity badge. i18n: skin.findings.primary. |
| 47 | lstSecondaryConcerns | Secondary Concerns List | List ul | Array FindingDTO | — | Displayed when secondary findings exist. Empty state shown if none. | — | skin_analysis_findings WHERE finding_type = 'SECONDARY' | i18n: skin.findings.secondary. |
| 48 | lblOverallAssessment | Overall Assessment Text | Static Label p | String (Text) | — | Displayed below concerns. | — | skin_analysis_findings.overall_assessment | i18n: skin.findings.overall. Italicized. |

### 4.7 Section [G]: Recommendations Section (レコメンデーションセクション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 49 | sctRecommendations | Recommendations Section | Section | — | — | Hidden until analysis COMPLETED and recommendations exist. | — | skin_analysis_recommendations | Shown only when recommendations are present. Feature-flag: feature.skin.recommendations. |
| 50 | lblRecommendationsTitle | Recommendations Title | Static Label h3 | String | — | Text: "Product Recommendations" | — | Hardcoded UI text | i18n: skin.recommendations.title. |
| 51 | crdRecommendationItem | Recommendation Item Card | Card (repeating) | — | — | One per recommendation. Displays product_type, product_name, reason, priority badge. | — | skin_analysis_recommendations | Priority badge color: HIGH=Red, MEDIUM=Yellow, LOW=Green. i18n: skin.recommendations.priority. |
| 52 | bdgPriority | Priority Badge | Badge | Enum | — | Shown on each recommendation. | Values: HIGH, MEDIUM, LOW | skin_analysis_recommendations.priority | i18n: skin.recommendations.priority.HIGH/MEDIUM/LOW. |
| 52A | lnkViewProduct | View Product Link | Link / Button sm default | URL | — | Visible on each recommendation. Text: "View Product". Icon: ExternalLink. | — | skin_analysis_recommendations.product_id | Navigates to /products/:id. i18n: skin.recommendations.viewProduct. Per BR-SKIN-022. |
| 53 | btnHelpful | Helpful Feedback Button | Button outline sm | — | — | Visible on each recommendation. Text: "Helpful". Icon: ThumbsUp. | — | skin_analysis_feedback.is_helpful (true) | Toggles active state when clicked. Calls OP-SKIN-010. i18n: skin.recommendations.helpful. |
| 54 | btnNotHelpful | Not Helpful Feedback Button | Button outline sm | — | — | Visible on each recommendation. Text: "Not Helpful". Icon: ThumbsDown. | — | skin_analysis_feedback.is_helpful (false) | Toggles active state when clicked. Calls OP-SKIN-010. i18n: skin.recommendations.notHelpful. |
| 55 | lblFeedbackConfirmation | Feedback Confirmation Text | Static Label | String | Conditional | Hidden. Shown after feedback submitted. Text: "Thank you for your feedback!" | — | — | Replaces feedback buttons momentarily after submission. Auto-dismiss after 3s. |

### 4.8 Section [H]: Summary Metrics Bar (サマリーメトリクスバー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 56 | crdMetricTotal | Total Analyses Metric | Metric Card | Integer | — | Displays total count. Default: "0" if no history. | — | COUNT of skin_analyses WHERE user_id = current user AND status = 'COMPLETED' | i18n: skin.metrics.total. Icon: Activity. |
| 57 | crdMetricBest | Best Health Score Metric | Metric Card | Integer | — | Displays MAX health score. Default: "N/A" if no history. | 0-100 | MAX of skin_analyses.health_score for user | i18n: skin.metrics.best. Icon: TrendingUp. |
| 58 | crdMetricAvgHydration | Average Hydration Metric | Metric Card | Integer (%) | — | Displays AVG hydration as percentage. Default: "N/A" if no history. | 0-100% | AVG of skin_analyses.hydration for user | i18n: skin.metrics.avgHydration. Icon: Droplets. |
| 59 | crdMetricImprovement | Improvement Percentage Metric | Metric Card | Integer (%) | — | Displays improvement % from first to latest analysis. Default: "0%" if < 2 analyses. | — | Computed: (latest_health_score - first_health_score) / first_health_score x 100 | i18n: skin.metrics.improvement. Green if positive, red if negative. Icon: ArrowUpCircle / ArrowDownCircle. |

### 4.9 Section [I]: Analysis History Section (分析履歴セクション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 60 | sctHistory | Analysis History Section | Section | — | — | Always visible. | — | skin_analyses | Displayed regardless of analysis status (shows empty state if none). |
| 61 | lblHistoryTitle | History Section Title | Static Label h3 | String | — | Text: "Analysis History" | — | Hardcoded UI text | i18n: skin.history.title. |
| 61A | dtpDateFrom | Start Date Filter | DatePicker | ISO Date | Optional | Empty / 30 days ago default | Date format: YYYY-MM-DD. Must be <= dtpDateTo | Query param: dateFrom | Filter history records by start date. |
| 61B | dtpDateTo | End Date Filter | DatePicker | ISO Date | Optional | Empty / Today default | Date format: YYYY-MM-DD. Must be >= dtpDateFrom | Query param: dateTo | Filter history records by end date. |
| 61C | btnFilterHistory | Apply Filter Button | Button sm default | — | — | Visible. Text: "Filter" | — | — | Triggers GET /api/v1/skin-analysis/history with date range query parameters. |
| 61D | btnResetFilter | Reset Filter Button | Button sm ghost | — | — | Visible when date filters applied. Text: "Reset" | — | — | Clears date filters and reloads full history. |
| 62 | tblHistoryRecords | History Records Table | Table table | Array AnalysisDTO | — | Populated from API. Sorted by analysis_date DESC (BR-SKIN-011). | — | skin_analyses WHERE user_id = current user AND status = 'COMPLETED' | Columns: Date, Health Score, Hydration, Skin Age, Actions. Paginated (10 per page). |
| 63 | colAnalysisDate | Analysis Date Column | Table Column | ISO 8601 DateTime | — | Displayed as locale date string. | — | skin_analyses.analysis_date | Sortable descending by default. |
| 64 | colHealthScore | Health Score Column | Table Column | Integer | — | Displayed as integer 0-100. | 0-100 | skin_analyses.health_score | Color-coded: >=80=Green, 60-79=Yellow, <60=Red. i18n: skin.result.healthScore. |
| 65 | colHydration | Hydration Column | Table Column | Integer (%) | — | Displayed as percentage. | 0-100% | skin_analyses.hydration | Displayed as "72%". i18n: skin.result.hydration. |
| 66 | colSkinAge | Skin Age Column | Table Column | Integer | — | Displayed in years. | — | skin_analyses.skin_age | i18n: skin.result.skinAge. |
| 67 | colActions | Row Actions Column | Table Column | — | — | Contains per-row action buttons. | — | — | Contains: btnRowExport, btnRowView, btnRowSelectCompare. |
| 68 | btnRowView | View Analysis Button row | Icon Button | — | — | Visible on each history row. Icon: Eye. Tooltip: "View Details". | — | skin_analyses.id | Navigates to analysis detail / expands result card. |
| 69 | btnRowExport | Export Row PDF Button | Icon Button | — | — | Visible on each history row. Icon: Download. Tooltip: "Export PDF". | — | skin_analyses.id | Triggers single-analysis PDF export (OP-SKIN-007). |
| 70 | chkRowSelectCompare | Select for Comparison Checkbox | Checkbox | Boolean | — | Unchecked by default. Appears when btnCompareMode active. | Max 2 rows selected at a time. | — | Used to select analyses for comparison. Error shown if user tries to select >2. |
| 71 | pgnHistoryPagination | History Pagination Controls | Pagination | Integer | — | Shows page 1 by default. Hidden if <= 10 records. | Page: >= 1. PageSize: 10. | — | "Previous" / "Next" buttons. Page number indicator. |
| 72 | btnExportFullHistory | Export Full History Button | Button outline | — | — | Visible. Text: "Export Full History". Disabled if no analyses exist. | — | — | Triggers full-history PDF export (OP-SKIN-008). Icon: FileDown. i18n: skin.history.exportAll. |
| 73 | btnCompareMode | Activate Compare Mode Button | Button ghost | — | — | Visible when >= 2 analyses exist. Text: "Compare Analyses". | — | — | Activates row-selection checkboxes for comparison. i18n: skin.compare.select. Feature-flag: feature.skin.compare. |
| 74 | btnStartComparison | Start Comparison Button | Button default | — | — | Hidden until 2 rows selected. Text: "Compare Selected". | — | — | Triggers comparison view (OP-SKIN-009). Disabled unless exactly 2 analyses selected. |
| 75 | statEmptyHistory | Empty History State | Static Label + Icon | String | — | Shown when no completed analyses exist. Text: "No analysis history. Start your first scan!" | — | — | Icon: History. Button: "Start Scan" linking to btnNewScan. |

### 4.10 Section [J]: Trend Visualization Section (トレンド可視化セクション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 76 | sctTrends | Trend Visualization Section | Section | — | — | Always visible. Shows placeholder if < 2 analyses. | — | skin_analyses | Feature-flag: feature.skin.trends. |
| 77 | lblTrendsTitle | Trends Section Title | Static Label h3 | String | — | Text: "Trend Visualization" | — | Hardcoded UI text | i18n: skin.trend.title. |
| 78 | chrtHealthScoreTrend | Health Score Trend Chart | Chart (Line) | TrendDTO | — | Rendered when >= 2 analyses exist (BR-SKIN-013). | — | skin_analyses.health_score ordered by analysis_date ASC | X-axis: date, Y-axis: score (0-100). Tooltip on hover. i18n: skin.trend.healthScore. ARIA table alternative. |
| 79 | chrtHydrationTrend | Hydration Trend Chart | Chart (Line) | TrendDTO | — | Rendered when >= 2 analyses exist (BR-SKIN-013). | — | skin_analyses.hydration ordered by analysis_date ASC | X-axis: date, Y-axis: percentage (0-100%). Tooltip on hover. i18n: skin.trend.hydration. ARIA table alternative. |
| 80 | statTrendPlaceholder | Trend Placeholder | Static Label + Icon | String | — | Shown when < 2 analyses exist. Text: "Complete at least 2 analyses to see your trends." | — | — | Icon: LineChart. i18n: skin.trend.placeholder. |

### 4.11 Section [K]: Processing State Panel (処理中パネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 81 | pnlProcessing | AI Processing Panel | Panel / Card | — | — | Hidden by default. Shown during PROCESSING state (OP-SKIN-003). | — | — | Replaces Capture Guidelines Panel during processing. |
| 82 | prgProcessingBar | Processing Progress Bar | Progress Bar (animated) | Integer (%) | — | Animated indeterminate progress. | — | skin_analyses.status | Loops animation until COMPLETED or FAILED. i18n: skin.processing.title. |
| 83 | lblProcessingStatus | Processing Status Text | Static Label | String | — | Text: "Analyzing your skin..." | — | — | Cycles through descriptive steps. i18n: skin.processing.steps. |
| 84 | alrtProcessingError | Processing Error Alert | Alert destructive | String | Conditional | Hidden. Shown on FAILED state. | — | API error response | Shows retry button. Error codes: 50002, 50003. i18n keys for messages. |

### 4.12 Section [L/M/N]: Analysis Comparison View (分析比較ビュー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 85 | pnlCompare | Analysis Comparison View | Panel / Modal | — | — | Hidden. Shown after two analyses selected and btnStartComparison clicked. | — | — | Feature-flag: feature.skin.compare. |
| 86 | lblCompareTitle | Comparison Title | Static Label h2 | String | — | Text: "Analysis Comparison" | — | Hardcoded UI text | i18n: skin.compare.title. |
| 87 | lblCompareAnalysis1Date | Analysis 1 Date | Static Label | ISO 8601 DateTime | — | Displays date of first selected analysis. | — | skin_analyses.analysis_date | i18n: skin.compare.analysis1. |
| 88 | lblCompareAnalysis2Date | Analysis 2 Date | Static Label | ISO 8601 DateTime | — | Displays date of second selected analysis. | — | skin_analyses.analysis_date | i18n: skin.compare.analysis2. |
| 89 | tblCompareScores | Score Comparison Table | Table | ComparisonDTO | — | Populated from comparison API response. | — | Derived from two skin_analyses records | Rows: Health Score, Hydration, Skin Age. Columns: Analysis 1, Analysis 2, Delta. |
| 90 | lblScoreDelta | Health Score Delta | Static Label | Integer | — | Displays scoreDelta. | — | Computed: analysis2.health_score - analysis1.health_score | Green if positive (improvement), red if negative (regression). Arrow indicator. i18n: skin.compare.delta. |
| 91 | lblHydrationDelta | Hydration Delta | Static Label | Integer (%) | — | Displays hydrationDelta. | — | Computed: analysis2.hydration - analysis1.hydration | Same color logic as lblScoreDelta. |
| 92 | tblCompareConditions | Condition Changes Table | Table | Array ConditionChangeDTO | — | Populated from comparison response. | — | Derived from skin_analysis_conditions for both analyses | Shows condition name, old severity, new severity, change indicator. |
| 93 | btnCloseComparison | Close Comparison Button | Button outline | — | — | Visible. Text: "Back to History". | — | — | Dismisses comparison view. Returns to history section. |

### 4.13 Global Notification Items (グローバル通知項目)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 94 | alrtAnalysisComplete | Analysis Completed Toast | Toast success | String | Conditional | Hidden. Shown on EV-SKIN-001. Text: "Analysis complete! View your results." | — | WebSocket / polling event | Auto-dismiss after 5 seconds. Clickable to scroll to results. i18n: skin.notification.complete. |
| 95 | alrtAnalysisFailed | Analysis Failed Toast | Toast destructive | String | Conditional | Hidden. Shown on EV-SKIN-002. Text: "Analysis failed. Please try again." | — | WebSocket / polling event | Shows retry button. Auto-dismiss after 10 seconds. i18n: skin.notification.failed. |
| 96 | alrtDailyLimit | Daily Limit Warning Toast | Toast warning | String | Conditional | Hidden. Shown when user hits 5/day limit (error 42901). Text: "Daily analysis limit reached. Try again tomorrow." | — | API error response | Persists until dismissed. i18n: skin.notification.dailyLimit. |
| 97 | alrtExportReady | Export Ready Toast | Toast success | String | Conditional | Hidden. Shown when PDF export ready (EV-SKIN-004). | — | API response | Persists until dismissed. Includes "Download PDF" action button. |
| 98 | alrtGeneralError | General Error Alert | Alert destructive | String | Conditional | Hidden. Shown on unexpected errors. | — | API error response | Dismissible. i18n: skin.error.general. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 New Scan Button Trigger (`btnNewScan` / `btnNewScanFromResult` onClick)
- **Trigger:** User clicks "New Scan" button in Page Header [A] or Result Card [D].
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify user authentication token (JWT) is valid in localStorage. Verify user role is `buyer` (BR-SKIN-001).
  2. **Check Daily Limit State:** If cached daily scan count ≥ 5, immediately display warning toast `alrtDailyLimit` (42901) and abort.
  3. **UI Transition:** Display Capture Guidelines Panel `pnlCaptureGuidelines` [C] with slide-down / modal overlay animation.
  4. **State Reset:** Reset upload zone `uplFacialImage`, preview thumbnail `imgPreviewThumbnail`, and consent checkbox `chkConsent` to unchecked. Set focus to upload area.
- **Exception Handling:**
  - Token expired / missing: Redirect to `/login` with return query parameter `?redirect=/skin-analysis`.
  - Non-buyer role: Display 403 Forbidden page (BR-SKIN-001).

---

### 5.2 Facial Image Upload Selection / Drag & Drop (`uplFacialImage` onChange / onDrop)
- **Trigger:** User selects a file via file browser dialog or drops an image file into the drag & drop container.
- **Processing Logic:**
  1. **Client-Side Pre-Check:**
     - **File Format Check (BR-SKIN-002):** Validate MIME type against allowed list (`image/jpeg`, `image/png`, `image/webp`). File extension must match `.jpg`, `.jpeg`, `.png`, or `.webp`.
     - **File Size Check (BR-SKIN-003):** Validate `file.size <= 10,485,760` bytes (10MB).
     - **Dimension Validation (BR-SKIN-004):** Read image header via client-side `Image()` object. If dimensions < 640x480px, display non-blocking warning notification: *"Image resolution is low. For best results, use 640x480px or higher."*
  2. **Preview Generation:** Generate a client-side Blob Object URL via `URL.createObjectURL(file)` and assign to `imgPreviewThumbnail` [C].
  3. **UI State Update:**
     - Display filename and file size in `lblFilePreviewName`.
     - Display remove button `btnRemoveFile`.
     - Evaluate `btnStartAnalysis` enablement (enabled only if file is valid AND `chkConsent` is checked).
- **Exception Handling:**
  - Format invalid: Abort selection, clear input, display inline error `VAL-SKIN-001` (40001): *"Invalid image format. Please upload a JPG, PNG, or WebP file."*
  - Size > 10MB: Abort selection, clear input, display inline error `VAL-SKIN-002` (40002): *"File size exceeds 10MB limit. Please upload a smaller image."*

---

### 5.3 Remove Selected Image File (`btnRemoveFile` onClick)
- **Trigger:** User clicks the trash icon button on the selected file preview.
- **Processing Logic:**
  1. Revoke the created Object URL to prevent memory leaks (`URL.revokeObjectURL`).
  2. Clear selected file state and reset `uplFacialImage` input value to `null`.
  3. Hide `imgPreviewThumbnail`, `lblFilePreviewName`, and `btnRemoveFile`.
  4. Restore initial drop zone state with placeholder text.
  5. Disable `btnStartAnalysis`.
- **Exception Handling:** None applicable.

---

### 5.4 Analysis Consent Checkbox Toggle (`chkConsent` onChange)
- **Trigger:** User checks or unchecks the consent checkbox.
- **Processing Logic:**
  1. Update component consent state to `checked` (boolean).
  2. Re-evaluate `btnStartAnalysis` enablement:
     - `isEnabled = (selectedFile !== null && isFileValid === true && isConsentChecked === true)`.
  3. If unchecked after being checked, disable `btnStartAnalysis`.
- **Exception Handling:** If user attempts submission without consent, highlight checkbox in red and display `VAL-SKIN-003` (40003).

---

### 5.5 Cancel Upload (`btnCancelUpload` onClick)
- **Trigger:** User clicks "Cancel" button or close icon [X] in Capture Guidelines Panel.
- **Processing Logic:**
  1. Revoke any pending Object URL.
  2. Reset file input and consent state.
  3. Hide `pnlCaptureGuidelines` with dismiss animation.
  4. Return focus to `btnNewScan`.
- **Exception Handling:** None applicable.

---

### 5.6 Start Analysis Submit (`btnStartAnalysis` onClick)
- **Trigger:** User clicks "Start Analysis" button.
- **Processing Logic:**
  1. **Client-Side Pre-Check:** Verify file is attached and `chkConsent` is true.
  2. **Transition to Processing UI:**
     - Dismiss `pnlCaptureGuidelines`.
     - Display Processing State Panel `pnlProcessing` [K] with animated progress bar `prgProcessingBar`.
     - Set initial status text: *"Uploading facial image to secure storage..."*.
  3. **Backend Step 1 — Upload Image (OP-SKIN-002):**
     - Dispatch `POST /api/v1/skin-analysis/upload` as `multipart/form-data` containing `facialImage` and `consent=true`.
     - Server validates format, size, uploads to Azure Blob Storage `skin-scans`, and returns `blobUrl`.
  4. **Backend Step 2 — Orchestrate AI Analysis (OP-SKIN-003):**
     - Update progress bar to 40%. Status text: *"AI deep learning inference in progress..."*.
     - Dispatch `POST /api/v1/skin-analysis/analyze` with `{ blobUrl }`.
     - Server checks daily limit (BR-SKIN-005: max 5/day), invokes AI computer vision service, computes health score (0-100), hydration (0-100%), skin age, condition severities, and clinical findings.
     - Server writes records to `skin_analyses`, `skin_analysis_conditions`, and `skin_analysis_findings`.
  5. **Post-Execution UI Transition (OP-SKIN-004):**
     - Progress bar reaches 100%.
     - Hide `pnlProcessing`.
     - Render AI Facial Analysis Card [D], Condition Severity Section [E], Clinical Findings [F], and Recommendations [G].
     - Refresh Summary Metrics Bar [H] and Analysis History Table [I].
     - Trigger success toast `alrtAnalysisComplete`: *"Analysis complete! View your results."*
     - Smooth scroll viewport to Result Card [D].
- **Exception Handling:**
  - `42901`: Daily limit reached. Hide processing, display `alrtDailyLimit` toast.
  - `40001` / `40002` / `40003`: Validation error. Reopen upload panel and show inline error.
  - `50001`: Upload failed. Show `alrtUploadError` with retry option.
  - `50002`: AI service unavailable / timed out (>30s). Show retry button.
  - `50003`: Image analysis failed (face not detected / image blurry). Prompt user to upload clearer photo.

---

### 5.7 View Analysis Detail from History (`btnRowView` onClick)
- **Trigger:** User clicks view icon (Eye) on a specific history row.
- **Processing Logic:**
  1. Retrieve `analysisId` from target row.
  2. If data is in client memory / React Query cache, render immediately. Otherwise dispatch `GET /api/v1/skin-analysis/${analysisId}`.
  3. Populate and display AI Facial Analysis Card [D], Mesh Overlay [EL-109], Condition Badges [E], and Findings [F].
  4. Scroll page smoothly to top of Result Card.
- **Exception Handling:**
  - `40401`: Record not found. Display error alert: *"Analysis record not found."*
  - `40301`: Forbidden. User cannot view other users' scans (BR-SKIN-006). Display access denied alert.

---

### 5.8 Export Single Analysis Report PDF (`btnExportSingleReport` / `btnRowExport` onClick)
- **Trigger:** User clicks "Export Report" in Result Card or download icon on a history row.
- **Processing Logic:**
  1. Display button loading spinner and text *"Generating PDF..."*. Disable button.
  2. Dispatch `GET /api/v1/skin-analysis/${analysisId}/export?format=pdf` with `responseType: 'blob'`.
  3. Server generates structured medical-grade PDF report containing scores, condition table, clinical findings, and overlay photo.
  4. Receive PDF binary blob in browser, generate temporary Object URL, and trigger automatic download with filename: `Skin_Analysis_Report_${analysisDate}_${analysisId.substring(0,8)}.pdf`.
  5. Show notification toast `alrtExportReady`: *"PDF report downloaded successfully."*
  6. Restore button to normal state.
- **Exception Handling:**
  - `50004`: PDF generation error. Restore button, show destructive toast: *"PDF generation failed. Please try again."*

---

### 5.9 Export Full History Report PDF (`btnExportFullHistory` onClick)
- **Trigger:** User clicks "Export Full History" button in History Section [I].
- **Processing Logic:**
  1. Verify at least 1 analysis exists. If none, button remains disabled.
  2. Show loading spinner on button.
  3. Dispatch `GET /api/v1/skin-analysis/export-history?format=pdf`.
  4. Receive aggregated PDF containing longitudinal summary, metrics, trend overview, and chronological scan details.
  5. Trigger download: `Skin_Analysis_Full_History_${userId}_${currentDate}.pdf`.
  6. Display success toast.
- **Exception Handling:**
  - `50004`: Display error toast. Restore button.

---

### 5.10 Analysis Comparison Mode Activation & Selection (`btnCompareMode` / `chkRowSelectCompare` onClick)
- **Trigger:** User clicks "Compare Analyses" button `btnCompareMode` in History Section.
- **Processing Logic:**
  1. Toggle `isCompareMode` state to `true`.
  2. Show checkboxes `chkRowSelectCompare` on each history row.
  3. Show persistent floating comparison action bar containing:
     - Selection counter text: *"Selected: X of 2 analyses"*
     - "Compare Selected" button `btnStartComparison` (disabled until count == 2)
     - "Cancel Compare" button
  4. **Row Selection Checkbox Click:**
     - If row is checked and selected count < 2: add `analysisId` to selected array.
     - If row is checked and selected count == 2: prevent check, display warning toast: *"You can only compare 2 analyses at a time."*
     - If row is unchecked: remove `analysisId` from selected array.
     - Update `btnStartComparison` enabled state (`count === 2`).
- **Exception Handling:** None applicable.

---

### 5.11 Start Analysis Comparison (`btnStartComparison` onClick)
- **Trigger:** User clicks "Compare Selected" button when exactly 2 analyses are selected.
- **Processing Logic:**
  1. **Pre-Check:** Ensure `analysisId1 !== analysisId2` (BR-SKIN-020, rule 8.1 #12).
  2. **API Dispatch:** Dispatch `POST /api/v1/skin-analysis/compare` with body `{ analysisId1, analysisId2 }`.
  3. **Receive & Render Comparison View [L/M/N]:**
     - Display Comparison Modal/Panel `pnlCompare`.
     - Display Baseline (earlier scan) vs Follow-up (later scan) side-by-side.
     - Compute and display score delta `lblScoreDelta` (`health_score2 - health_score1`) with color coding (positive = Emerald, negative = Rose).
     - Compute and display hydration delta `lblHydrationDelta` (`hydration2 - hydration1`).
     - Render condition severity comparison table `tblCompareConditions` showing severity progression (e.g. MODERATE ──► MILD).
- **Exception Handling:**
  - `40005`: Display error: *"Comparison requires two different analysis IDs."*

---

### 5.12 Close Comparison View (`btnCloseComparison` onClick)
- **Trigger:** User clicks "Back to History" button or modal close button.
- **Processing Logic:**
  1. Dismiss `pnlCompare` modal overlay.
  2. Maintain or clear row selections based on user preference.
  3. Return focus to History Section.
- **Exception Handling:** None applicable.

---

### 5.13 Product Recommendation Feedback Submit (`btnHelpful` / `btnNotHelpful` onClick)
- **Trigger:** User clicks "Helpful" (ThumbsUp) or "Not Helpful" (ThumbsDown) button on a product recommendation card.
- **Processing Logic:**
  1. Extract `recommendationId` and set `isHelpful = true` (if ThumbsUp) or `false` (if ThumbsDown).
  2. **Optimistic UI Update:** Highlight selected button with primary background, set opposite button to ghost style.
  3. **Backend Dispatch:** Dispatch `POST /api/v1/skin-analysis/feedback` with `{ recommendationId, isHelpful }` (OP-SKIN-010, BR-SKIN-021).
  4. Server performs upsert on `skin_analysis_feedback` table (`UNIQUE(recommendation_id, user_id)`).
  5. Show brief confirmation label `lblFeedbackConfirmation`: *"Thank you for your feedback!"* (auto-fades after 3s).
- **Exception Handling:**
  - Network error: Revert optimistic button state and display non-blocking error toast.

---

### 5.14 History Table Pagination (`pgnHistoryPagination` onPageChange)
- **Trigger:** User clicks page number, "Next", or "Previous" buttons.
- **Processing Logic:**
  1. Update current page parameter (default pageSize: 10).
  2. Dispatch `GET /api/v1/skin-analysis/history?page=${page}&pageSize=10`.
  3. Show subtle skeleton loading animation on table rows.
  4. Replace table rows with newly fetched records.
  5. Update active page indicator. Scroll to top of table.
- **Exception Handling:** Server error: Show error alert and keep previous page content.

---

### 5.15 Trend Chart Data Hover / Interaction (`chrtHealthScoreTrend` / `chrtHydrationTrend`)
- **Trigger:** User hovers cursor over data points on trend line chart.
- **Processing Logic:**
  1. Identify hovered data point index and corresponding analysis date.
  2. Render interactive glassmorphism tooltip showing:
     - Exact analysis date & time
     - Score value (e.g. *"Health Score: 85/100"*, *"Hydration: 72%"*)
     - Primary skin condition on that date
  3. Highlighting: Enlarge active SVG node on canvas.
- **Exception Handling:** None applicable.

---

### 5.16 Condition Badge Tooltip / Expansion (`bdgAcne`, `bdgRedness`, etc. onHover / onClick)
- **Trigger:** User hovers over or taps any condition severity badge in Section [E].
- **Processing Logic:**
  1. Display popup tooltip `lblConditionDetail` containing:
     - Detailed condition description (e.g. *"Mild inflammatory papules detected on forehead and chin"*).
     - Affected facial zones (e.g. *"T-zone, Cheeks"*).
     - Severity score indicator (0-100 scale).
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-SKIN-001** | `uplFacialImage` | File MIME type not in `image/jpeg`, `image/png`, `image/webp` (BR-SKIN-002) | Red border on upload dropzone. Text below field. | "Invalid image format. Please upload a JPG, PNG, or WebP file." | "無効な画像形式です。JPG、PNG、またはWebPファイルをアップロードしてください。" |
| **VAL-SKIN-002** | `uplFacialImage` | File size exceeds 10,485,760 bytes (10MB) (BR-SKIN-003) | Red border on dropzone. Text below field. | "File size exceeds 10MB limit. Please upload a smaller image." | "ファイルサイズが10MBの制限を超えています。より小さい画像をアップロードしてください。" |
| **VAL-SKIN-003** | `chkConsent` | Consent checkbox is unchecked upon clicking "Start Analysis" (BR-SKIN-010) | Red outline on checkbox. Text below checkbox. | "Upload consent is required. Please accept the terms." | "アップロードの同意が必要です。規約に同意してください。" |
| **VAL-SKIN-004** | `uplFacialImage` | Image resolution < 640x480px (BR-SKIN-004) | Yellow warning banner in upload preview. | "Image resolution is low. For best results, use 640x480px or higher." | "画像の解像度が低いです。最適な分析のためには640x480px以上を推奨します。" |
| **VAL-SKIN-005** | `analysisId` | Parameter is not a valid UUID v4 format | 404 Not Found Page / Error Banner | "Invalid analysis ID format." | "無効な分析ID形式です。" |
| **VAL-SKIN-006** | `chkRowSelectCompare` | `analysisId1 === analysisId2` or invalid pair | Inline alert in comparison modal | "Comparison requires two different analysis IDs." | "比較には異なる2つの分析IDを選択する必要があります。" |
| **VAL-SKIN-007** | `chkRowSelectCompare` | User attempts to select more than 2 items | Warning toast notification | "You can only select up to 2 analyses for comparison." | "比較用に選択できる分析は最大2件までです。" |
| **AUTH-SKIN-001** | Global | User role is not `buyer` or token missing (BR-SKIN-001) | Full screen 403 Forbidden page | "You do not have permission to access the AI Skin Analysis Portal." | "AI肌分析ポータルへのアクセス権限がありません。" |
| **AUTH-SKIN-002** | Global | User attempts to access another user's analysis (BR-SKIN-006) | Error alert banner | "You do not have permission to access this analysis." | "この分析結果にアクセスする権限がありません。" |
| **RATE-SKIN-001** | `btnStartAnalysis` | User exceeds daily limit of 5 analyses (BR-SKIN-005) (API 42901) | Warning toast (persistent) | "Daily analysis limit reached (5 per day). Please try again tomorrow." | "1日の分析制限（5回）に達過しました。明日再度お試しください。" |
| **DATA-SKIN-001** | Global | Analysis ID does not exist in database (API 40401) | 404 Page or modal alert | "Analysis record not found." | "分析レコードが見つかりませんでした。" |
| **DATA-SKIN-002** | `tblHistoryRecords` | No completed analysis records found for user (API 40402) | Empty state card with scan prompt | "No analysis history found for this user." | "分析履歴が見つかりませんでした。" |
| **SYS-SKIN-001** | `uplFacialImage` | Blob storage upload failed (API 50001) | Error toast with retry button | "Upload failed. Please try again." | "アップロードに失敗しました。もう一度お試しください。" |
| **SYS-SKIN-002** | `pnlProcessing` | AI analysis service timeout or 5xx error (API 50002) | Error alert with retry button | "AI service unavailable. Please try again later." | "AI分析サービスを利用できません。しばらくしてから再試行してください。" |
| **SYS-SKIN-003** | `pnlProcessing` | Face detection failure or blurry image (API 50003) | Destructive alert prompting new photo | "Analysis failed. The image may be unclear or face not detected." | "分析に失敗しました。画像が不鮮明であるか、顔が検出されませんでした。" |
| **SYS-SKIN-004** | `btnExportSingleReport` | PDF generation service failure (API 50004) | Error toast notification | "PDF generation failed. Please try again." | "PDFレポートの作成に失敗しました。もう一度お試しください。" |
| **SYS-SKIN-005** | Global | Failed to fetch analysis results or history (API 50005) | Error banner with reload button | "Failed to load analysis results. Please refresh the page." | "分析結果の読み込みに失敗しました。ページを再読み込みしてください。" |
| **NET-ERR** | Global | Network disconnect / offline | Floating destructive banner | "Network error. Please check your internet connection." | "ネットワークエラー。インターネット接続を確認してください。" |

---

## 7. Database Field Mapping (データベースフィールドマッピング)

### 7.1 Analysis Portal & Result Display → `skin_analyses`

| Form / UI Element ID | Logical Field Name | API Field Name | Database Column | Table Name | Data Type & Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | Analysis ID | `id` | `id` | `skin_analyses` | UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| — | User ID | `userId` | `user_id` | `skin_analyses` | UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `lblSummaryDate` / `lblResultDate` / `colAnalysisDate` | Analysis Date | `analysisDate` | `analysis_date` | `skin_analyses` | TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `prgProcessingBar` | Status | `status` | `status` | `skin_analyses` | VARCHAR(20) CHECK (status IN ('UPLOADING','VALIDATING','PROCESSING','COMPLETED','FAILED','CANCELLED')) |
| `lblSummarySkinType` / `lblResultSkinType` | Skin Type | `skinType` | `skin_type` | `skin_analyses` | VARCHAR(50) (Oily, Dry, Combination, Normal) |
| `lblSummarySkinAge` / `lblResultSkinAge` / `colSkinAge` | Skin Age | `skinAge` | `skin_age` | `skin_analyses` | INTEGER CHECK (skin_age >= 0 AND skin_age <= 150) |
| `lblSummaryHealthScore` / `lblResultHealthScore` / `colHealthScore` | Health Score | `healthScore` | `health_score` | `skin_analyses` | INTEGER CHECK (health_score >= 0 AND health_score <= 100) |
| `lblSummaryHydration` / `lblResultHydration` / `colHydration` | Hydration | `hydration` | `hydration` | `skin_analyses` | INTEGER CHECK (hydration >= 0 AND hydration <= 100) |
| `lblResultConfidence` | AI Confidence | `confidence` | `confidence` | `skin_analyses` | INTEGER CHECK (confidence >= 0 AND confidence <= 100) |
| `uplFacialImage` | Facial Image URL | `facialScanUrl` | `facial_scan_url` | `skin_analyses` | VARCHAR(500) NOT NULL (Azure Blob Storage URL) |
| `imgMeshOverlay` | Mesh Overlay URL | `meshOverlayUrl` | `mesh_overlay_url` | `skin_analyses` | VARCHAR(500) NULL (Azure Blob Storage URL) |
| — | Raw AI Inference | `aiRawResponse` | `ai_raw_response` | `skin_analyses` | JSONB NULL |

### 7.2 Condition Severity → `skin_analysis_conditions`

| Form / UI Element ID | Logical Field Name | API Field Name | Database Column | Table Name | Data Type & Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | Condition Record ID | `id` | `id` | `skin_analysis_conditions` | UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| — | Analysis FK | `analysisId` | `analysis_id` | `skin_analysis_conditions` | UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE |
| `bdgAcne` ... `bdgPoreSize` | Condition Name | `conditionName` | `condition_name` | `skin_analysis_conditions` | VARCHAR(50) CHECK (condition_name IN ('acne','redness','texture','pigmentation','dryness','pore_size')) |
| `bdgAcne` ... `bdgPoreSize` | Severity Level | `severity` | `severity` | `skin_analysis_conditions` | VARCHAR(10) CHECK (severity IN ('NONE','MILD','MODERATE','SEVERE')) |
| `lblConditionDetail` | Severity Score | `severityScore` | `severity_score` | `skin_analysis_conditions` | INTEGER CHECK (severity_score >= 0 AND severity_score <= 100) |
| `lblConditionDetail` | Affected Area | `affectedArea` | `affected_area` | `skin_analysis_conditions` | VARCHAR(100) |
| `lblConditionDetail` | Clinical Description | `description` | `description` | `skin_analysis_conditions` | TEXT |

### 7.3 Clinical Findings → `skin_analysis_findings`

| Form / UI Element ID | Logical Field Name | API Field Name | Database Column | Table Name | Data Type & Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | Finding Record ID | `id` | `id` | `skin_analysis_findings` | UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| — | Analysis FK | `analysisId` | `analysis_id` | `skin_analysis_findings` | UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE |
| `lstPrimaryConcerns` / `lstSecondaryConcerns` | Finding Type | `findingType` | `finding_type` | `skin_analysis_findings` | VARCHAR(10) CHECK (finding_type IN ('PRIMARY','SECONDARY')) |
| `lstPrimaryConcerns` | Finding Title | `title` | `title` | `skin_analysis_findings` | VARCHAR(200) NOT NULL |
| `lstPrimaryConcerns` | Description | `description` | `description` | `skin_analysis_findings` | TEXT NOT NULL |
| `lstPrimaryConcerns` | Affected Area | `affectedArea` | `affected_area` | `skin_analysis_findings` | VARCHAR(100) |
| `lstPrimaryConcerns` | Severity | `severity` | `severity` | `skin_analysis_findings` | VARCHAR(10) CHECK (severity IN ('NONE','MILD','MODERATE','SEVERE')) |

### 7.4 Recommendations & Feedback → `skin_analysis_recommendations` & `skin_analysis_feedback`

| Form / UI Element ID | Logical Field Name | API Field Name | Database Column | Table Name | Data Type & Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | Recommendation ID | `id` | `id` | `skin_analysis_recommendations` | UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| — | Analysis FK | `analysisId` | `analysis_id` | `skin_analysis_recommendations` | UUID NOT NULL REFERENCES skin_analyses(id) ON DELETE CASCADE |
| `crdRecommendationItem` | Product Category | `productType` | `product_type` | `skin_analysis_recommendations` | VARCHAR(100) NOT NULL |
| `crdRecommendationItem` | Product Name | `productName` | `product_name` | `skin_analysis_recommendations` | VARCHAR(200) NOT NULL |
| `crdRecommendationItem` | Reason for Matching | `reason` | `reason` | `skin_analysis_recommendations` | TEXT NOT NULL |
| `bdgPriority` | Priority Tier | `priority` | `priority` | `skin_analysis_recommendations` | VARCHAR(10) CHECK (priority IN ('HIGH','MEDIUM','LOW')) |
| `btnHelpful` / `btnNotHelpful` | User Helpful Flag | `isHelpful` | `is_helpful` | `skin_analysis_feedback` | BOOLEAN NOT NULL |
| — | Feedback User FK | `userId` | `user_id` | `skin_analysis_feedback` | UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Image Upload Success (`POST /api/v1/skin-analysis/upload`)

```json
{
  "status": 200,
  "data": {
    "blobUrl": "https://cosmeticsstorage.blob.core.windows.net/skin-scans/c3b0f7e1-8a9d_1724241000.webp",
    "fileSize": 2458920,
    "contentType": "image/webp",
    "dimensions": {
      "width": 1280,
      "height": 960
    }
  },
  "message": "Image uploaded successfully."
}
```

### 8.2 Start AI Analysis Success (`POST /api/v1/skin-analysis/analyze`)

```json
{
  "status": 201,
  "data": {
    "id": "e4a2c1b0-9d8e-4f70-8a9b-2c3d4e5f6a7b",
    "userId": "f4c5a1b2-3d6e-4f70-8a9b-1c2d3e4f5a6b",
    "analysisDate": "2026-08-21T14:30:00.000Z",
    "status": "COMPLETED",
    "skinType": "Combination",
    "skinAge": 28,
    "healthScore": 85,
    "hydration": 72,
    "confidence": 94,
    "facialScanUrl": "https://cosmeticsstorage.blob.core.windows.net/skin-scans/c3b0f7e1-8a9d_1724241000.webp",
    "meshOverlayUrl": "https://cosmeticsstorage.blob.core.windows.net/skin-scans/c3b0f7e1-8a9d_1724241000_mesh.png",
    "conditions": [
      {
        "conditionName": "acne",
        "severity": "MILD",
        "severityScore": 25,
        "affectedArea": "Forehead, Chin",
        "description": "Scattered mild comedones detected on forehead and chin."
      },
      {
        "conditionName": "redness",
        "severity": "NONE",
        "severityScore": 8,
        "affectedArea": null,
        "description": "Minimal vascular erythema detected."
      },
      {
        "conditionName": "texture",
        "severity": "MODERATE",
        "severityScore": 54,
        "affectedArea": "T-zone",
        "description": "Mild skin surface irregularities along the nose and central cheeks."
      },
      {
        "conditionName": "pigmentation",
        "severity": "NONE",
        "severityScore": 12,
        "affectedArea": null,
        "description": "Even skin tone with no prominent hyperpigmentation spots."
      },
      {
        "conditionName": "dryness",
        "severity": "MILD",
        "severityScore": 28,
        "affectedArea": "Cheeks",
        "description": "Slight barrier dehydration detected on outer cheek planes."
      },
      {
        "conditionName": "pore_size",
        "severity": "MILD",
        "severityScore": 32,
        "affectedArea": "Nose, Central Cheeks",
        "description": "Slightly enlarged pores visible in the central facial zone."
      }
    ],
    "findings": [
      {
        "findingType": "PRIMARY",
        "title": "T-Zone Texture Irregularity",
        "description": "Moderate surface unevenness observed across the nasal bridge and forehead.",
        "affectedArea": "T-zone",
        "severity": "MODERATE"
      },
      {
        "findingType": "SECONDARY",
        "title": "Localized Cheek Dehydration",
        "description": "Transepidermal water loss indicated by fine dehydration lines on lateral cheeks.",
        "affectedArea": "Cheeks",
        "severity": "MILD"
      }
    ],
    "recommendations": [
      {
        "id": "7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e",
        "productType": "Cleanser",
        "productName": "Gentle Clarifying Foaming Gel",
        "reason": "Balances T-zone sebum production while preserving moisture barrier integrity.",
        "priority": "HIGH"
      },
      {
        "id": "8c9d0e1f-2a3b-4c5d-6e7f-8a9b0c1d2e3f",
        "productType": "Moisturizer",
        "productName": "Ceramide Multi-Depth Hydrating Cream",
        "reason": "Restores hydration in dry cheek areas with three essential skin-identical ceramides.",
        "priority": "MEDIUM"
      }
    ]
  }
}
```

### 8.3 Get Analysis History (`GET /api/v1/skin-analysis/history?page=1&pageSize=10`)

```json
{
  "status": 200,
  "data": {
    "items": [
      {
        "id": "e4a2c1b0-9d8e-4f70-8a9b-2c3d4e5f6a7b",
        "analysisDate": "2026-08-21T14:30:00.000Z",
        "healthScore": 85,
        "hydration": 72,
        "skinType": "Combination",
        "skinAge": 28,
        "status": "COMPLETED"
      },
      {
        "id": "d3b1a09f-8c7d-3e6f-798a-1b2c3d4e5f6a",
        "analysisDate": "2026-08-14T10:15:00.000Z",
        "healthScore": 82,
        "hydration": 68,
        "skinType": "Combination",
        "skinAge": 28,
        "status": "COMPLETED"
      },
      {
        "id": "c2a09f8e-7b6c-2d5e-6879-0a1b2c3d4e5f",
        "analysisDate": "2026-08-07T09:40:00.000Z",
        "healthScore": 78,
        "hydration": 65,
        "skinType": "Combination",
        "skinAge": 29,
        "status": "COMPLETED"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalItems": 3,
      "totalPages": 1
    },
    "metrics": {
      "totalAnalyses": 3,
      "bestScore": 85,
      "avgHydration": 68,
      "improvementPercentage": 9
    }
  }
}
```

### 8.4 Analysis Comparison Response (`POST /api/v1/skin-analysis/compare`)

```json
{
  "status": 200,
  "data": {
    "baseline": {
      "id": "c2a09f8e-7b6c-2d5e-6879-0a1b2c3d4e5f",
      "analysisDate": "2026-08-07T09:40:00.000Z",
      "healthScore": 78,
      "hydration": 65,
      "skinAge": 29,
      "skinType": "Combination"
    },
    "current": {
      "id": "e4a2c1b0-9d8e-4f70-8a9b-2c3d4e5f6a7b",
      "analysisDate": "2026-08-21T14:30:00.000Z",
      "healthScore": 85,
      "hydration": 72,
      "skinAge": 28,
      "skinType": "Combination"
    },
    "deltas": {
      "scoreDelta": 7,
      "hydrationDelta": 7,
      "skinAgeDelta": -1,
      "overallProgression": "IMPROVED"
    },
    "conditionComparison": [
      {
        "conditionName": "acne",
        "baselineSeverity": "MODERATE",
        "currentSeverity": "MILD",
        "status": "IMPROVED"
      },
      {
        "conditionName": "texture",
        "baselineSeverity": "MODERATE",
        "currentSeverity": "MODERATE",
        "status": "UNCHANGED"
      },
      {
        "conditionName": "dryness",
        "baselineSeverity": "MODERATE",
        "currentSeverity": "MILD",
        "status": "IMPROVED"
      }
    ]
  }
}
```

### 8.5 Error Response Example (Daily Limit Exceeded — 429)

```json
{
  "statusCode": 429,
  "error": "TOO_MANY_REQUESTS",
  "errorCode": "42901",
  "message": "Daily analysis limit reached (5 per day). Please try again tomorrow.",
  "timestamp": "2026-08-21T16:00:00.000Z",
  "path": "/api/v1/skin-analysis/analyze"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) Reference

| i18n Key | English Translation String |
| :--- | :--- |
| `skin.page.title` | "AI Skin Analysis" |
| `skin.page.breadcrumb` | "Home > AI Skin Analysis" |
| `skin.upload.newScan` | "New Scan" |
| `skin.upload.photo` | "Upload Photo" |
| `skin.upload.takePhoto` | "Take Photo" |
| `skin.upload.capture` | "Capture" |
| `skin.upload.retake` | "Retake" |
| `skin.scan.title` | "AI Skin Analysis Scan" |
| `skin.scan.subtitle` | "Upload or take a photo to start scan" |
| `skin.scan.start` | "Start AI Scan" |
| `skin.upload.guidelines` | "Capture Guidelines" |
| `skin.upload.title` | "Upload Facial Image" |
| `skin.upload.remainingQuota` | "Scans remaining today: {{count}} / 5" |
| `skin.upload.takePhoto` | "Take Photo" |
| `skin.upload.capture` | "Capture Photo" |
| `skin.upload.retake` | "Retake Photo" |
| `skin.recommendations.viewProduct` | "View Product" |
| `skin.history.dateFrom` | "Start Date" |
| `skin.history.dateTo` | "End Date" |
| `skin.history.filter` | "Filter" |
| `skin.history.resetFilter` | "Reset" |
| `skin.upload.dropzone` | "Drag & drop or click to upload" |
| `skin.upload.consent` | "I consent to AI analysis of my facial image for skin condition assessment." |
| `skin.upload.button` | "Start Analysis" |
| `skin.upload.analyzing` | "Analyzing..." |
| `skin.upload.cancel` | "Cancel" |
| `skin.processing.title` | "Analyzing your skin..." |
| `skin.processing.step1` | "Validating facial features and lighting quality..." |
| `skin.processing.step2` | "Executing deep neural diagnostic models..." |
| `skin.processing.step3` | "Generating personalized clinical skin profile..." |
| `skin.result.title` | "AI Facial Analysis Results" |
| `skin.result.healthScore` | "Skin Health Score" |
| `skin.result.hydration` | "Hydration Level" |
| `skin.result.skinType` | "Skin Type" |
| `skin.result.skinAge` | "Estimated Skin Age" |
| `skin.result.confidence` | "AI Confidence" |
| `skin.result.meshAlt` | "AI facial landmark and condition mesh overlay" |
| `skin.condition.title` | "Skin Conditions & Severity" |
| `skin.condition.acne` | "Acne & Blemishes" |
| `skin.condition.redness` | "Redness & Erythema" |
| `skin.condition.texture` | "Skin Texture" |
| `skin.condition.pigmentation` | "Pigmentation" |
| `skin.condition.dryness` | "Dryness / Dehydration" |
| `skin.condition.poreSize` | "Pore Visibility" |
| `skin.severity.NONE` | "Normal / Clear" |
| `skin.severity.MILD` | "Mild" |
| `skin.severity.MODERATE` | "Moderate" |
| `skin.severity.SEVERE` | "Severe" |
| `skin.findings.title` | "Clinical Diagnostic Findings" |
| `skin.findings.primary` | "Primary Skin Concerns" |
| `skin.findings.secondary` | "Secondary Observations" |
| `skin.findings.overall` | "Overall Clinical Assessment" |
| `skin.recommendations.title` | "Tailored Product Recommendations" |
| `skin.recommendations.priority` | "Priority" |
| `skin.recommendations.helpful` | "Helpful" |
| `skin.recommendations.notHelpful` | "Not Helpful" |
| `skin.recommendations.thankYou` | "Thank you for your feedback!" |
| `skin.metrics.total` | "Total Analyses" |
| `skin.metrics.best` | "Best Health Score" |
| `skin.metrics.avgHydration` | "Average Hydration" |
| `skin.metrics.improvement` | "Overall Improvement" |
| `skin.history.title` | "Analysis History" |
| `skin.history.date` | "Date" |
| `skin.history.actions` | "Actions" |
| `skin.history.view` | "View Details" |
| `skin.history.export` | "Export PDF" |
| `skin.history.exportAll` | "Export Full History" |
| `skin.history.empty` | "No analysis history yet. Start your first scan!" |
| `skin.trend.title` | "Skin Health Longitudinal Trends" |
| `skin.trend.healthScore` | "Health Score Trend" |
| `skin.trend.hydration` | "Hydration Trend (%)" |
| `skin.trend.placeholder` | "Complete at least 2 analyses to unlock longitudinal trend tracking." |
| `skin.compare.button` | "Compare Analyses" |
| `skin.compare.title` | "Side-by-Side Analysis Comparison" |
| `skin.compare.baseline` | "Baseline Scan" |
| `skin.compare.current` | "Current Scan" |
| `skin.compare.delta` | "Score Delta" |
| `skin.compare.selectPrompt` | "Select 2 scans from the history table to compare." |
| `skin.notification.complete` | "Analysis complete! View your results." |
| `skin.notification.failed` | "Analysis failed. Please try again." |
| `skin.notification.dailyLimit` | "Daily analysis limit reached (5 per day). Try again tomorrow." |
| `skin.notification.exportReady` | "PDF report downloaded successfully." |

### 9.2 Japanese (ja) Reference

| i18n Key | Japanese Translation String |
| :--- | :--- |
| `skin.page.title` | "AI肌分析" |
| `skin.page.breadcrumb` | "ホーム > AI肌分析" |
| `skin.upload.newScan` | "新規スキャン" |
| `skin.upload.photo` | "写真をアップロード" |
| `skin.upload.takePhoto` | "写真を撮る" |
| `skin.upload.capture` | "撮影" |
| `skin.upload.retake` | "撮り直す" |
| `skin.scan.title` | "AI肌分析スキャン" |
| `skin.scan.subtitle` | "写真をアップロードまたは撮影してスキャンを開始" |
| `skin.scan.start` | "AIスキャンを開始" |
| `skin.upload.guidelines` | "撮影ガイドライン" |
| `skin.upload.title` | "顔画像のアップロード" |
| `skin.upload.remainingQuota` | "本日の残りスキャン可能回数: {{count}} / 5回" |
| `skin.upload.takePhoto` | "カメラで撮影" |
| `skin.upload.capture` | "写真を撮影" |
| `skin.upload.retake` | "再撮影" |
| `skin.recommendations.viewProduct` | "商品を見る" |
| `skin.history.dateFrom` | "開始日" |
| `skin.history.dateTo` | "終了日" |
| `skin.history.filter` | "絞り込み" |
| `skin.history.resetFilter` | "リセット" |
| `skin.upload.dropzone` | "ドラッグ＆ドロップまたはクリックしてアップロード" |
| `skin.upload.consent` | "肌状態の評価を目的としたAI画像分析に同意します。" |
| `skin.upload.button` | "分析を開始" |
| `skin.upload.analyzing` | "分析中..." |
| `skin.upload.cancel` | "キャンセル" |
| `skin.processing.title` | "肌を分析しています..." |
| `skin.processing.step1` | "顔の特徴と照明環境を検証中..." |
| `skin.processing.step2` | "深層学習診断モデルによる画像解析中..." |
| `skin.processing.step3` | "パーソナライズされた診断プロファイルを生成中..." |
| `skin.result.title` | "AI顔分析結果" |
| `skin.result.healthScore` | "肌健康スコア" |
| `skin.result.hydration` | "水分レベル" |
| `skin.result.skinType` | "肌タイプ" |
| `skin.result.skinAge` | "推定肌年齢" |
| `skin.result.confidence` | "AI信頼度" |
| `skin.result.meshAlt` | "AIランドマークおよび肌状態メッシュオーバーレイ" |
| `skin.condition.title` | "肌の状態と重症度" |
| `skin.condition.acne` | "ニキビ・吹き出物" |
| `skin.condition.redness` | "赤み・紅斑" |
| `skin.condition.texture` | "キメ・テクスチャー" |
| `skin.condition.pigmentation` | "色素沈着・シミ" |
| `skin.condition.dryness` | "乾燥・水分不足" |
| `skin.condition.poreSize` | "毛穴の目立ち" |
| `skin.severity.NONE` | "正常・良好" |
| `skin.severity.MILD` | "軽度" |
| `skin.severity.MODERATE` | "中等度" |
| `skin.severity.SEVERE` | "重度" |
| `skin.findings.title` | "臨床診断所見" |
| `skin.findings.primary` | "主要な肌の課題" |
| `skin.findings.secondary` | "二次的観察所見" |
| `skin.findings.overall` | "総合診断評価" |
| `skin.recommendations.title` | "おすすめスキンケア商品" |
| `skin.recommendations.priority` | "優先度" |
| `skin.recommendations.helpful` | "役に立った" |
| `skin.recommendations.notHelpful` | "役に立たなかった" |
| `skin.recommendations.thankYou` | "フィードバックありがとうございます！" |
| `skin.metrics.total` | "総分析回数" |
| `skin.metrics.best` | "最高健康スコア" |
| `skin.metrics.avgHydration` | "平均水分レベル" |
| `skin.metrics.improvement` | "総合改善率" |
| `skin.history.title` | "分析履歴" |
| `skin.history.date` | "分析日時" |
| `skin.history.actions` | "操作" |
| `skin.history.view` | "詳細表示" |
| `skin.history.export` | "PDF出力" |
| `skin.history.exportAll` | "全履歴PDF出力" |
| `skin.history.empty` | "分析履歴がありません。最初のスキャンを開始しましょう！" |
| `skin.trend.title` | "肌健康の推移トレンド" |
| `skin.trend.healthScore` | "健康スコア推移" |
| `skin.trend.hydration` | "水分レベル推移 (%)" |
| `skin.trend.placeholder` | "推移グラフを表示するには2回以上の分析を完了してください。" |
| `skin.compare.button` | "分析結果を比較" |
| `skin.compare.title` | "分析結果の比較" |
| `skin.compare.baseline` | "基準スキャン" |
| `skin.compare.current` | "最新スキャン" |
| `skin.compare.delta` | "スコア差分" |
| `skin.compare.selectPrompt` | "履歴一覧から比較する2件のレコードを選択してください。" |
| `skin.notification.complete` | "分析が完了しました！結果をご確認ください。" |
| `skin.notification.failed` | "分析に失敗しました。もう一度お試しください。" |
| `skin.notification.dailyLimit` | "1日の分析制限（5回）に達しました。明日再度お試しください。" |
| `skin.notification.exportReady` | "PDFレポートが正常にダウンロードされました。" |

### 9.3 Myanmar (my) Reference

| i18n Key | Myanmar Translation String |
| :--- | :--- |
| `skin.page.title` | "AI အသားအရေ စစ်ဆေးမှု" |
| `skin.page.breadcrumb` | "ပင်မစာမျက်နှာ > AI အသားအရေ စစ်ဆေးမှု" |
| `skin.upload.newScan` | "စစ်ဆေးမှုအသစ်" |
| `skin.upload.photo` | "ဓာတ်ပုံတင်ရန်" |
| `skin.upload.takePhoto` | "ဓာတ်ပုံရိုက်ရန်" |
| `skin.upload.capture` | "ရိုက်ကူးရန်" |
| `skin.upload.retake` | "ပြန်လည်ရိုက်ကူးရန်" |
| `skin.scan.title` | "AI အသားအရေ စစ်ဆေးမှု" |
| `skin.scan.subtitle` | "ဓာတ်ပုံတင်ပါ သို့မဟုတ် ရိုက်ပါ စစ်ဆေးမှုစတင်ရန်" |
| `skin.scan.start` | "AI စစ်ဆေးမှု စတင်ရန်" |
| `skin.upload.guidelines` | "ဓာတ်ပုံရိုက်ကူးရန် လမ်းညွှန်ချက်များ" |
| `skin.upload.title` | "မျက်နှာဓာတ်ပုံ တင်ရန်" |
| `skin.upload.dropzone` | "ဖိုင်ဆွဲထည့်ပါ သို့မဟုတ် ဖိုင်ရွေးချယ်ပါ" |
| `skin.upload.consent` | "အသားအရေစစ်ဆေးရန်အတွက် AI စနစ်ဖြင့် မျက်နှာဓာတ်ပုံအား အသုံးပြုရန် သဘောတူပါသည်။" |
| `skin.upload.button` | "စစ်ဆေးမှု စတင်ရန်" |
| `skin.upload.analyzing` | "စစ်ဆေးနေပါသည်..." |
| `skin.upload.cancel` | "ပယ်ဖျက်မည်" |
| `skin.processing.title` | "သင်၏ အသားအရေကို စစ်ဆေးနေပါသည်..." |
| `skin.result.title` | "AI မျက်နှာ စစ်ဆေးမှု ရလဒ်" |
| `skin.result.healthScore` | "အသားအရေ ကျန်းမာရေးရမှတ်" |
| `skin.result.hydration` | "ရေဓာတ်ပမာဏ" |
| `skin.result.skinType` | "အသားအရေ အမျိုးအစား" |
| `skin.result.skinAge` | "ခန့်မှန်း အသားအရေ အသက်" |
| `skin.condition.title` | "အသားအရေ အခြေအနေများ" |
| `skin.history.title` | "စစ်ဆေးမှု မှတ်တမ်း" |
| `skin.history.export` | "PDF ထုတ်ယူရန်" |
| `skin.history.exportAll` | "မှတ်တမ်းအားလုံး PDF ထုတ်ယူရန်" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 SkinAnalysisLayout Component
- **Location:** `frontend/src/features/skin-analysis/components/SkinAnalysisLayout.tsx`
- **Purpose:** Responsive container for the entire Skin Analysis portal. Wraps breadcrumbs, headers, and grid layout.

### 10.2 FacialMeshViewer Component
- **Location:** `frontend/src/features/skin-analysis/components/FacialMeshViewer.tsx`
- **Purpose:** Renders the buyer's facial photograph alongside an interactive SVG/canvas layer displaying AI landmarks, condition heatmaps (redness, acne, texture), and zone boundaries. Supports pinch-to-zoom and pan.

### 10.3 ConditionSeverityBadge Component
- **Location:** `frontend/src/features/skin-analysis/components/ConditionSeverityBadge.tsx`
- **Purpose:** Standardized colored pill/badge reflecting condition severity:
  - `NONE`: Emerald (`bg-emerald-50 text-emerald-700 border-emerald-200`)
  - `MILD`: Amber (`bg-amber-50 text-amber-700 border-amber-200`)
  - `MODERATE`: Orange (`bg-orange-50 text-orange-700 border-orange-200`)
  - `SEVERE`: Rose (`bg-rose-50 text-rose-700 border-rose-200`)

### 10.4 HistoryDataTable & SummaryMetricsCard Components
- **Location:** `frontend/src/features/skin-analysis/components/HistoryDataTable.tsx` & `SummaryMetricsCard.tsx`
- **Purpose:** Displays paginated history table with responsive stacking on mobile, row-level action popovers, and animated summary KPI cards.

### 10.5 TrendLineChart Component
- **Location:** `frontend/src/features/skin-analysis/components/TrendLineChart.tsx`
- **Purpose:** Accessible SVG/Recharts line chart displaying longitudinal progress for Health Score and Hydration. Fully supports dark mode and responsive resizing.

### 10.6 ComparisonModal Component
- **Location:** `frontend/src/features/skin-analysis/components/ComparisonModal.tsx`
- **Purpose:** Side-by-side comparison modal with automatic calculation of delta scores, condition improvement indicators, and date differences.

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Luxury Cosmetics Design System:**
  - Primary: Deep Amethyst / Royal Purple (`#7C3AED`, `hsl(262, 83%, 58%)`)
  - Accent: Vibrant Rose / Magenta (`#EC4899`, `hsl(330, 81%, 60%)`)
  - Secondary: Soft Lavender (`#F3E8FF`, `hsl(270, 100%, 96%)`)
  - Background: Neutral White / Deep Slate Dark Mode (`#0F172A`)
  - Glassmorphism: Cards utilize `backdrop-blur-md bg-card/80 border border-border/50` for a high-end luxury aesthetic.
- **Accessibility (WCAG 2.1 AA Compliance):**
  - All interactive elements must maintain a minimum 4.5:1 text-to-background contrast ratio.
  - Interactive buttons and inputs have minimum 44x44px touch targets on touch viewports.
  - Mesh overlay image contains comprehensive `alt` text. Charts have corresponding hidden screen reader data tables (`sr-only`).
  - All modals trap keyboard focus and dismiss via `Escape` key.
- **Performance & Caching:**
  - AI analysis results are cached in Redis with a 300-second (5 min) TTL (BR-SKIN-018).
  - Client state utilizes React Query with a 5-minute `staleTime` to eliminate unnecessary redundant network roundtrips.
  - Full-resolution uploaded images are automatically compressed client-side before upload if exceeding display boundaries.
- **Security & Privacy (Medical / Regulatory Compliance):**
  - Facial scans are stored strictly in Azure Blob Storage with Server-Side Encryption (SSE) (BR-SKIN-008).
  - Images are retained for a maximum of 90 days before automated background lifecycle cleanup (BR-SKIN-009).
  - Raw images are strictly private: signed URLs with short 15-minute expirations are generated on demand.
  - Explicit user consent checkbox (`chkConsent`) is enforced before any image transmission (BR-SKIN-010).
  - Prominent non-diagnostic disclaimer: *"This AI skin analysis is provided for cosmetic recommendation and wellness tracking purposes only, and does not constitute formal medical diagnosis."*

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Image Upload & Validation Tests
- [ ] Accepts valid JPG, PNG, and WebP images below 10MB.
- [ ] Rejects unsupported MIME types (e.g. GIF, SVG, BMP, PDF) with error `40001`.
- [ ] Rejects files larger than 10MB (10,485,760 bytes) with error `40002`.
- [ ] Displays warning banner when image resolution is lower than 640x480px.
- [ ] Enforces mandatory consent checkbox (`chkConsent`) prior to submission.
- [ ] Thumbnail preview renders accurately upon file selection.
- [ ] Remove file button (`btnRemoveFile`) clears the selection, revokes Blob URL, and restores dropzone.
- [ ] Drag-and-drop file upload behaves identically to file picker selection.

### 12.2 AI Analysis Processing Tests
- [ ] Shows animated processing panel `pnlProcessing` immediately upon submission.
- [ ] Cycles through descriptive progress steps (uploading, neural inference, profile generation).
- [ ] Completes analysis and smoothly transitions to Completed Result View [D].
- [ ] Handles AI service timeout (>30s) gracefully with retry button (error `50002`).
- [ ] Handles unreadable or face-not-detected images with error `50003`.
- [ ] Enforces 5 scans per user per day limit (error `42901`).

### 12.3 Results & Mesh Overlay Tests
- [ ] Health score displays as integer between 0 and 100 with correct color ring.
- [ ] Hydration percentage displays accurately between 0% and 100%.
- [ ] Skin type (Oily, Dry, Combination, Normal) displays correctly.
- [ ] Estimated skin age displays as integer years.
- [ ] Mesh overlay image renders properly over the facial photo.
- [ ] Fallback image renders if mesh overlay URL is null or fails to load.

### 12.4 Skin Conditions & Findings Tests
- [ ] All 6 skin conditions (acne, redness, texture, pigmentation, dryness, pore_size) render with appropriate severity badges.
- [ ] Severity badge colors conform to rules: NONE=Green, MILD=Yellow, MODERATE=Orange, SEVERE=Red.
- [ ] Badge hover/click displays detailed tooltip with affected area and description.
- [ ] Primary and secondary clinical findings render title, description, and severity tags.

### 12.5 History Table & Pagination Tests
- [ ] History records are strictly sorted by `analysis_date` descending (newest first).
- [ ] Pagination controls paginate at 10 records per page.
- [ ] Empty state prompt renders when no analysis records exist.
- [ ] "View Details" row button populates and scrolls to the selected analysis.
- [ ] Summary metrics (total count, best score, average hydration, improvement %) compute accurately.

### 12.6 Trend Charts & Metrics Tests
- [ ] Trend charts render only when user has ≥ 2 completed analyses (BR-SKIN-013).
- [ ] Displays helpful placeholder banner when user has fewer than 2 analyses.
- [ ] Health score line chart displays date on X-axis and score (0-100) on Y-axis.
- [ ] Hydration line chart displays date on X-axis and percentage (0-100%) on Y-axis.
- [ ] Interactive hover tooltip shows exact date and values.

### 12.7 PDF Report Export Tests
- [ ] "Export Report" button generates single-analysis PDF containing scores, conditions, and findings.
- [ ] "Export Full History" generates multi-page longitudinal progress PDF report.
- [ ] Browser automatically triggers file download with descriptive timestamped filename.
- [ ] Handles PDF generation failure with error `50004` and error toast.

### 12.8 Analysis Comparison Tests
- [ ] "Compare Analyses" button activates row selection mode.
- [ ] Enforces maximum of 2 selections with warning toast if 3rd item clicked.
- [ ] "Compare Selected" button is disabled until exactly 2 rows are selected.
- [ ] Comparison modal displays baseline vs follow-up scans side-by-side.
- [ ] Score and hydration deltas calculate accurately with colored arrows (Emerald for improvement, Rose for regression).
- [ ] Condition severity delta table displays status progression (e.g. MODERATE -> MILD).

### 12.9 Recommendation Feedback Tests
- [ ] Product recommendations display product category, title, reasoning, and priority badge.
- [ ] Clicking "Helpful" or "Not Helpful" triggers feedback API call (OP-SKIN-010).
- [ ] Optimistic UI state toggles active button styling immediately.
- [ ] Confirmation toast appears after submission.

### 12.10 Permissions, Rate Limiting & i18n Tests
- [ ] Buyer role can successfully access all portal features.
- [ ] Merchant and Admin roles are blocked with 403 Forbidden page (BR-SKIN-001).
- [ ] User can only see their own historical data (BR-SKIN-006).
- [ ] Language switching across EN, JA, and MY translates all UI labels, badges, alerts, and tooltips.
- [ ] All inputs and buttons are accessible via keyboard navigation (Tab, Enter, Space).

---

*End of Screen Items Specification (AI Skin Analysis Portal)*
