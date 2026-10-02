# DD_SKIN_02 — Frontend Page Specification

> **Doc ID:** SKM-DD-SKIN-02 | **Version:** 2.1 | **Status:** Released  
> **Last Updated:** 2026-09-21

---

## 1. Overview

The **AI Skin Analysis Frontend** consists of an integrated portal experience designed for authenticated Buyers. It provides live camera capture and file upload, real-time AI processing feedback, comprehensive diagnostic result visualization (including 3D-style facial mesh overlay, health score gauges, condition badges, and clinical findings), historical tracking with longitudinal trend charts, side-by-side comparison, and one-click PDF clinical report exports.

- **Primary Page File:** `frontend/src/pages/buyer/SkinAnalysisPage.tsx`
- **History & Trends Page File:** `frontend/src/pages/buyer/SkinAnalysisHistoryPage.tsx`
- **Routes:**
  - `/skin-analysis` — Main portal (Upload, Latest Scan Overview, Diagnostic Result View)
  - `/skin-analysis/:id` — Specific historical analysis deep-link
  - `/skin-analysis/history` — Chronological history records & trend charts
  - `/skin-analysis/compare` — Side-by-side scan comparison view
- **Role Guard:** `BuyerRoute` (`role === 'buyer'`)
- **Shared Layout:** `DashboardLayout.tsx`

---

## 2. Layout Structure & Wireframes

### 2.1 Main Portal Layout (Default / Ready State)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Breadcrumbs: Home > Buyer Dashboard > AI Skin Analysis                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ AI Skin Analysis Portal                                                         │
│ Get AI-powered insights into your skin health, hydration, and tailored regimen.  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [A] CAMERA CAPTURE & UPLOAD PANEL (EL-106)                                  │ │
│ │                                                                             │ │
│ │  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐  │ │
│ │  │      [btnUploadPhoto]           │  │      [btnTakePhoto]             │  │ │
│ │  │      📁 Upload Photo            │  │      📷 Take Photo              │  │ │
│ │  │   (File picker for image)       │  │   (Live camera capture)         │  │ │
│ │  └─────────────────────────────────┘  └─────────────────────────────────┘  │ │
│ │                                                                             │ │
│ │  ┌─────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ [A2] AI SKIN ANALYSIS SCAN                                          │   │ │
│ │  │                                                                     │   │ │
│ │  │  [imgPreviewThumbnail]    AI Analysis Ready                        │   │ │
│ │  │  (Preview when selected)  Upload or take a photo to start scan     │   │ │
│ │  │                                                                     │   │ │
│ │  │  [x] [chkConsent] I consent to AI facial analysis processing        │   │ │
│ │  │      (EL-105 / BR-SKIN-010)                                         │   │ │
│ │  │                                                                     │   │ │
│ │  │              [ Start AI Scan ] (EL-107, Primary Button)             │   │ │
│ │  └─────────────────────────────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ [B] ANALYSIS SUMMARY CARD (Latest Scan Overview) (EL-104)                   │ │
│ │  ┌──────────────┐  ┌──────────────────────────────────────────────────────┐ │ │
│ │  │ Health Score │  │ Hydration: 72% | Skin Type: Combination | Age: 28    │ │ │
│ │  │     85       │  │ Last Analyzed: 2026-08-21 14:30                      │ │ │
│ │  └──────────────┘  └──────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Quick Links: [ View History (EL-115) ]  [ View Trends (EL-117) ]           │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Diagnostic Results Display Layout (`COMPLETED` State)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Analysis Results — 2026-08-21 14:30:25              [ Export PDF (EL-122) ] │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                             │ │
│ │  ┌───────────────────────────────┐  ┌────────────────────────────────────┐  │ │
│ │  │ [EL-109] FACIAL MESH OVERLAY  │  │ [EL-108] KEY METRICS               │  │ │
│ │  │                               │  │                                    │  │ │
│ │  │   ┌───────────────────────┐   │  │  Health Score: 85/100 (Excellent)  │  │ │
│ │  │   │     Facial Scan       │   │  │  Hydration:    72%                 │  │ │
│ │  │   │    + Landmark Mesh    │   │  │  Skin Type:    Combination         │  │ │
│ │  │   │    (Wireframe Grid)   │   │  │  Skin Age:     28 years            │  │ │
│ │  │   └───────────────────────┘   │  │  Confidence:   94%                 │  │ │
│ │  └───────────────────────────────┘  └────────────────────────────────────┘  │ │
│ │                                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [EL-110] CONDITION SEVERITY BREAKDOWN (BR-SKIN-016)                     │ │ │
│ │ │                                                                         │ │ │
│ │ │  • Acne:         [NONE] (Green)        • Redness:      [MILD] (Yellow)  │ │ │
│ │ │  • Texture:      [MILD] (Yellow)       • Pigmentation: [NONE] (Green)  │ │ │
│ │ │  • Dryness:      [MODERATE] (Orange)   • Pore Size:    [MILD] (Yellow)  │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [EL-112] CLINICAL FINDINGS (BR-SKIN-017)                                │ │ │
│ │ │                                                                         │ │ │
│ │ │  Primary Concerns (EL-113):                                             │ │ │
│ │ │  1. Dehydration in U-Zone (Cheeks and Jawline)                          │ │ │
│ │ │                                                                         │ │ │
│ │ │  Secondary Concerns (EL-114):                                           │ │ │
│ │ │  1. Mild Pore Enlargement in T-Zone (Forehead and Nose)                 │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [EL-128] RECOMMENDED PRODUCTS (BR-SKIN-022)                             │ │ │
│ │ │                                                                         │ │ │
│ │ │  ┌───────────────────────────┐     ┌───────────────────────────┐        │ │ │
│ │ │  │ Hydrating Ceramide Cream  │     │ Gentle BHA Pore Clarifier │        │ │ │
│ │ │  │ High Priority • Match: 95%│     │ Medium Priority           │        │ │ │
│ │ │  │ [View Product] [👍] [👎]  │     │ [View Product] [👍] [👎]  │        │ │ │
│ │ │  └───────────────────────────┘     └───────────────────────────┘        │ │ │
│ │ └─────────────────────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Side-by-Side Comparison Layout (`UC-SKIN-011`)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Comparison: Baseline Scan vs. Current Scan (14 days elapsed)                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Metric               Scan A (2026-08-07)     Scan B (2026-08-21)     Delta      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Health Score         78/100                  85/100                  +7  ▲ (Grn)│
│ Hydration            61%                     72%                     +11%▲ (Grn)│
│ Skin Age             30 yrs                  28 yrs                  -2  ▼ (Grn)│
│ Dryness Severity     MODERATE                MILD                    Improved   │
│ Redness Severity     MILD                    MILD                    Unchanged  │
│ Pore Size            MODERATE                MILD                    Improved   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Architecture Tree

```text
frontend/src/
├── pages/
│   └── buyer/
│       ├── SkinAnalysisPage.tsx              # Portal container & active view switcher
│       └── SkinAnalysisHistoryPage.tsx       # Historical records, trends, & comparison
└── features/
    └── buyer/
        └── skin-analysis/
            ├── components/
            │   ├── CameraCaptureModal.tsx        # Live WebRTC stream & photo snapshot
            │   ├── CaptureGuidelinesPanel.tsx    # Optimal lighting & posture instructions (EL-106)
            │   ├── ImageUploadZone.tsx           # Drag-drop file input + format checks (EL-105)
            │   ├── ProcessingProgressCard.tsx    # Animated progress bar & polling status (EL-124)
            │   ├── AnalysisSummaryCard.tsx       # Latest health score & skin metrics (EL-104)
            │   ├── AIFacialAnalysisCard.tsx      # Results container with metric gauges (EL-108)
            │   ├── MeshOverlayViewer.tsx         # Image viewport with canvas landmark mesh (EL-109)
            │   ├── ConditionSeverityBadge.tsx    # Color-coded badge (EL-111)
            │   ├── ConditionSeveritySection.tsx  # 6-condition breakdown cards (EL-110)
            │   ├── ClinicalFindingsSection.tsx   # Primary/secondary diagnostic concerns (EL-112)
            │   ├── ProductRecommendationCard.tsx # Linked catalog item card + feedback (EL-128)
            │   ├── AnalysisHistoryTable.tsx      # Paginated scan table with export buttons (EL-116)
            │   ├── SummaryMetricsRow.tsx         # 4 summary KPI cards (EL-118 ~ EL-121)
            │   ├── TrendVisualizationChart.tsx   # Recharts dual-axis line charts (EL-117)
            │   ├── AnalysisComparisonModal.tsx   # Side-by-side delta inspection (EL-127)
            │   └── ExportReportButton.tsx        # Single/full PDF stream triggers (EL-122, EL-123)
            ├── hooks/
            │   ├── useSkinAnalysis.ts            # Active scan mutations & single analysis fetch
            │   ├── useAnalysisHistory.ts         # Paginated historical queries
            │   ├── useAnalysisTrends.ts          # Aggregate time-series metrics
            │   ├── useCompareAnalyses.ts         # Multi-scan comparative computation
            │   ├── useRecommendationFeedback.ts # Feedback submission mutation
            │   └── useExportReport.ts            # Blob download stream handling
            ├── services/
            │   └── skin-analysis.service.ts      # Axios API consumer
            └── types/
                └── skin-analysis.types.ts        # TypeScript models & Zod schemas
```

---

## 4. UI Element Catalog

| Element ID | Element Name | Type | Bound Data / Action | Validation / Business Rule |
|------------|--------------|------|---------------------|----------------------------|
| `EL-101` | Header Title | Heading | Static text | `skin.page.title` |
| `EL-102` | Breadcrumb | Navigation | Route stack | Next.js / React Router navigation |
| `EL-103` | "New Scan" Button | Button | Toggles `EL-106` | Buyer auth verified |
| `EL-104` | Analysis Summary Card | Card | `latestAnalysis` | Displays latest health score, hydration, age, skin type |
| `EL-105` | File Input / Photo Upload | File Input | `file` (JPG, PNG, WebP) | Max 10MB (`BR-SKIN-002`, `BR-SKIN-003`) |
| `EL-106` | Capture Guidelines Panel | Accordion / Modal | Static guidance | Instructions for lighting, glasses removal, neutral expression |
| `EL-107` | "Start Analysis" Button | Button | Triggers AI pipeline | Requires `consent == true` (`BR-SKIN-010`) |
| `EL-108` | AI Facial Analysis Card | Card | `AnalysisResultDto` | Core results container |
| `EL-109` | Facial Mesh Overlay Image | Canvas / Image | `meshOverlayUrl` | Landmark mesh superimposed over facial scan (`BR-SKIN-015`) |
| `EL-110` | Condition Severity Section | Grid / Container | `conditions[]` | Group of 6 skin condition indicators (`BR-SKIN-016`) |
| `EL-111` | Severity Badges | Badge | `severity` | Colors: NONE(Green), MILD(Yellow), MODERATE(Orange), SEVERE(Red) |
| `EL-112` | Clinical Findings Section | Container | `findings` | Clinical narrative diagnosis (`BR-SKIN-017`) |
| `EL-113` | Primary Concerns List | List | `primaryConcerns[]` | Critical conditions requiring immediate attention |
| `EL-114` | Secondary Concerns List | List | `secondaryConcerns[]` | Minor or preventive skin observations |
| `EL-115` | Analysis History Section | Section | `historyRecords[]` | Container for chronological records table |
| `EL-116` | History Records Table | Table | `AnalysisHistoryResponseDto` | Sort: `analysis_date DESC` (`BR-SKIN-011`) |
| `EL-117` | Trend Visualization Charts | Recharts / Chart | `TrendDataDto` | Health & hydration line charts; requires ≥2 records (`BR-SKIN-013`) |
| `EL-118` | Total Analyses Card | Metric Card | `totalAnalyses` | Integer count |
| `EL-119` | Best Health Score Card | Metric Card | `bestScore` | Integer (0-100) |
| `EL-120` | Average Hydration Card | Metric Card | `averageHydration` | Percentage (0-100%) |
| `EL-121` | Improvement Metric Card | Metric Card | `improvementPercentage` | Signed percentage comparing first scan to latest |
| `EL-122` | "Export Single Report" Button | Button | `GET /:id/export` | Downloads individual scan PDF (`BR-SKIN-014`) |
| `EL-123` | "Export Full History" Button | Button | `GET /export-history` | Downloads complete history PDF (`BR-SKIN-014`) |
| `EL-124` | Progress Indicator | Progress Bar | `processingStatus` | 0-100% simulated/polled progress (`≤ 30s` timeout) |
| `EL-125` | Validation / Error Alert | Alert Banner | `errorMessage` | Inline and toast error presentations |
| `EL-126` | Success Notification | Toast Alert | `successMessage` | Temporary confirmation toast (dismisses after 5s) |
| `EL-127` | "Compare Analyses" Button | Button | Opens `ComparisonModal` | Triggers side-by-side comparison (`BR-SKIN-020`) |
| `EL-128` | Recommendation Feedback Buttons | Button Group | `isHelpful: boolean` | Submits 👍 / 👎 rating (`BR-SKIN-021`) |

---

## 5. State Management & Hooks Specification

### 5.1 `useSkinAnalysis` Hook
Manages the active scan lifecycle, image uploading, and real-time polling:
```typescript
interface UseSkinAnalysisReturn {
  uploadImage: (file: File, consent: boolean) => Promise<UploadResultDto>;
  startAnalysis: (blobUrl: string) => Promise<AnalysisResultDto>;
  isUploading: boolean;
  isAnalyzing: boolean;
  activeAnalysis: AnalysisResultDto | null;
  error: Error | null;
  remainingQuota: number;
}
```

### 5.2 `useAnalysisHistory` Hook
Fetches paginated analysis records using `@tanstack/react-query`:
```typescript
interface UseAnalysisHistoryParams {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}

// Query key: ['skin-analysis', 'history', params]
// Stale time: 2 minutes
```

### 5.3 `useAnalysisTrends` Hook
Queries aggregated time-series data for chart rendering:
```typescript
// Query key: ['skin-analysis', 'trends']
// Stale time: 5 minutes
// Auto-disables if history query returns < 2 records
```

---

## 6. Internationalization (i18n) Key Definitions

| Key | English (EN) | Japanese (JA) | Myanmar (MY) |
|-----|--------------|---------------|--------------|
| `skin.page.title` | AI Skin Analysis | AI肌分析 | AI အသားအရေ စစ်ဆေးမှု |
| `skin.page.subtitle` | Diagnostic assessment & personalized skin tracking | AI肌診断およびパーソナライズ履歴追跡 | AI ဖြင့် အသားအရေစစ်ဆေးမှုနှင့် မှတ်တမ်း |
| `skin.upload.title` | Upload Facial Image | 顔写真をアップロード | မျက်နှာဓာတ်ပုံ တင်ရန် |
| `skin.upload.guidelines` | Capture Guidelines | 撮影ガイドライン | ဓာတ်ပုံရိုက်ကူးမှု လမ်းညွှန်ချက်များ |
| `skin.upload.consent` | I consent to AI facial analysis processing | AIによる顔画像診断に同意します | AI မျက်နှာစစ်ဆေးမှုကို သဘောတူပါသည် |
| `skin.upload.button` | Start AI Scan | AI分析を開始 | စစ်ဆေးမှု စတင်ရန် |
| `skin.result.title` | Analysis Results | 分析結果 | စစ်ဆေးမှု ရလဒ်များ |
| `skin.result.healthScore` | Health Score | 健康スコア | ကျန်းမာရေး အဆင့်သတ်မှတ်ချက် |
| `skin.result.hydration` | Hydration | 保湿レベル | ရေဓာတ် ပမာဏ |
| `skin.result.skinType` | Skin Type | 肌タイプ | အသားအရေ အမျိုးအစား |
| `skin.result.skinAge` | Skin Age | 肌年齢 | အသားအရေ အသက် |
| `skin.result.confidence` | Confidence | 診断信頼度 | တိကျသေချာမှု ရာခိုင်နှုန်း |
| `skin.condition.acne` | Acne & Blemishes | ニキビ・吹き出物 | ဝက်ခြံ |
| `skin.condition.redness` | Facial Redness | 赤み | မျက်နှာနီမြန်းခြင်း |
| `skin.condition.texture` | Skin Texture | 肌キメ | အသားအရေ ကြမ်းတမ်းမှု |
| `skin.condition.pigmentation` | Pigmentation & Spots | 色素沈着・シミ | အမည်းစက်နှင့် အမဲကွက် |
| `skin.condition.dryness` | Dryness | 乾燥度 | ခြောက်သွေ့မှု |
| `skin.condition.pore_size` | Pore Size | 毛穴の開き | ချွေးပေါက် အရွယ်အစား |
| `skin.history.title` | Analysis History | 分析履歴 | စစ်ဆေးမှု မှတ်တမ်း |
| `skin.history.export` | Export Report | レポートをダウンロード | အစီရင်ခံစာ ထုတ်ယူရန် |
| `skin.history.exportAll` | Export Full History | 全履歴をダウンロード | မှတ်တမ်း အပြည့်အစုံ ထုတ်ယူရန် |
| `skin.trend.title` | Trend Visualization | トレンド可視化 | ပြောင်းလဲမှု ပြဇယား |
| `skin.metrics.total` | Total Analyses | 総分析回数 | စုစုပေါင်း စစ်ဆေးမှု အကြိမ်ရေ |
| `skin.metrics.best` | Best Score | 最高スコア | အကောင်းဆုံး အမှတ် |
| `skin.metrics.avgHydration` | Average Hydration | 平均保湿レベル | ပျမ်းမျှ ရေဓာတ် |
| `skin.metrics.improvement` | Improvement | 改善率 | တိုးတက်မှု ရာခိုင်နှုန်း |
| `skin.compare.title` | Analysis Comparison | 分析比較 | စစ်ဆေးမှု ရလဒ်များ နှိုင်းယှဉ်ချက် |
| `skin.feedback.helpful` | Helpful | 役に立った | အသုံးဝင်ပါသည် |
| `skin.feedback.notHelpful` | Not Helpful | 役に立たなかった | အသုံးမဝင်ပါ |
