# Screen Items Specification (画面項目設計書) — Matching & Recommendation

**Document ID:** SKM-SIS-MATCH-001  
**Target Screen:** Recommendations Page (おすすめ商品ページ)  
**Subsystem:** Buyer Module — Smart Product Matching & Personalized Recommendation  
**Function ID:** FN-MATCH-001  
**Version:** 1.1  
**Created:** 2026-09-01  
**Last Updated:** 2026-09-02  
**Author:** Senior System Engineer  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-09-01 | Senior System Engineer | Initial release. Screen items specification for Recommendations page covering personalized recommendations, matching filters, recommendation history, and cross-screen ad panel. |
| 1.1 | 2026-09-02 | Senior System Engineer | Added missing DB field mappings to §7.1: `slug`, `compare_at_price`, `avgRating`, `reviewCount`. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields, and rules. |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures, constraints, and data types. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses. |
| 4 | SKM-FDS-MATCH-001 | Functional Specification — Matching & Recommendation | `docs/screen/Matching_And_Recommendation/機能設計書_Matching_And_Recommendation.md` | Use cases, state transitions, business rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Recommendations page is the personalized product discovery entry point in the Cosmetics Finder platform. It displays skincare product recommendations derived from the buyer's AI skin analysis results, with multi-dimensional matching filters (skin type, ingredients, price range). When no valid AI analysis exists, it shows generic featured/top-rated products with a prompt to run AI analysis. The page also displays recommendation history and a cross-screen sponsored ad panel.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | Authenticated Buyers (with or without AI analysis results) |
| **Required Authentication** | JWT Bearer Token (`buyer` role or higher) for `/buyer/recommendations` page |
| **Data Scope** | Own latest AI analysis result (when available); global active product catalog for generic results |
| **Access Control** | Protected route — Auth Route Guard; guests redirected to `/login` |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Personalized Recommendations** — Ranked product list based on AI skin analysis (skin type + concerns).
2. **Matching Score Display** — 0–100 match score badge on each recommendation card.
3. **Multi-Dimensional Filters** — Skin type, ingredients, and price range.
4. **Analysis-Result Conditional Display** — AI-based recommendations when analysis exists; generic with prompt when not.
5. **Recommendation History** — Past recommendation sessions from AI analysis results.
6. **Cross-Screen Ad Panel** — Reusable Slide-Down Panel (D0) carousel with sponsored ads.
7. **Responsive Design** — 4-column grid (desktop) / 2-column (tablet) / 1-column (mobile) with filter sidebar/drawer.
8. **Internationalization** — Full i18n support for EN, JA, MY (3 languages).

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Recommendations Page — AI Analysis State (`source = "ai"`)
```text
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                           │  │
│  │  [A1] Page Title: "Recommended for You"                    │  │
│  │  [A2] Source Badge: "🧬 AI Analysis" (emerald green)       │  │
│  │  [A3] Source Subtitle: "Based on your AI analysis · {N}"   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [D0] AD SLIDE-DOWN PANEL (carousel)                       │  │
│  │  Up to 5 sponsored ad slides, 5s auto-rotate               │  │
│  │  Disclosure: "Sponsored products are paid placements..."    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │              │  │                                          │  │
│  │  [B] FILTERS │  │  [C] RECOMMENDATION GRID                 │  │
│  │  PANEL       │  │  4 columns desktop / 2 tablet / 1 mobile │  │
│  │              │  │                                          │  │
│  │  [B1] Skin   │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │  │
│  │  Type (pre-  │  │  │Card 1│ │Card 2│ │Card 3│ │Card 4│   │  │
│  │  selected)   │  │  │92%   │ │87%   │ │85%   │ │80%   │   │  │
│  │              │  │  │match │ │match │ │match │ │match │   │  │
│  │  [B2] Price  │  │  └──────┘ └──────┘ └──────┘ └──────┘   │  │
│  │  Range       │  │                                          │  │
│  │              │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │  │
│  │  [B3]        │  │  │Card 5│ │Card 6│ │Card 7│ │Card 8│   │  │
│  │  Ingredients │  │  └──────┘ └──────┘ └──────┘ └──────┘   │  │
│  │              │  │                                          │  │
│  │  [B4] Reset  │  │  [C5] PAGINATION (desktop)               │  │
│  │  Filters     │  │  [C6] LOAD MORE (mobile)                 │  │
│  │              │  │                                          │  │
│  │              │  │                                          │  │
│  │              │  │                                          │  │
│  │              │  │                                          │  │
│  └──────────────┘  └──────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [E] RECOMMENDATION HISTORY SECTION                        │  │
│  │  [E1] Heading: "📋 Previously Recommended"                 │  │
│  │  [E2] Session Groups (accordion by date)                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [F] ERROR / EMPTY STATE (conditional)                     │  │
│  │  [F1] Error Banner with retry                              │  │
│  │  [F2] Empty State with "Reset Filters"                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Recommendations Page — Generic State (`source = "generic"`)
```text
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                           │  │
│  │  [A1] Page Title: "Recommended for You"                    │  │
│  │  [A2] Source Badge: "⬡ General Picks" (amber)              │  │
│  │  [A3] Source Subtitle: "Showing featured products · ..."   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A4] PROFILE PROMPT BANNER (full-width, prominent)        │  │
│  │  Left: AI face scan illustration                           │  │
│  │  Center: "Get Personalized Recommendations" + description  │  │
│  │  Right: CTA "✦ Start Skin Analysis →"                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [D0] AD SLIDE-DOWN PANEL (carousel)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │  [B] FILTERS │  │  [C] RECOMMENDATION GRID                 │  │
│  │  PANEL       │  │  Cards with category badges              │  │
│  │  (all        │  │  (Featured / Top Rated / Best Seller)    │  │
│  │  unchecked)  │  │  NO match score shown                    │  │
│  └──────────────┘  └──────────────────────────────────────────┘  │
│                                                                  │
│  [E] HISTORY SECTION (shown when history exists)                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Recommendations Page — Stale Analysis State (`source = "ai"`, analysis > 24h old)
```text
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER VIEWPORT                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A] PAGE HEADER                                           │  │
│  │  [A1] Page Title: "Recommended for You"                    │  │
│  │  [A2] Source Badge: "🧬 AI Analysis" (emerald green)       │  │
│  │  [A3] Source Subtitle: "Based on your AI analysis · {N}"   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [A4] RETAKE PROMPT BANNER (subtle compact)                │  │
│  │  "💡 Want Fresh Results?"                                   │  │
│  │  "Retake your skin analysis for updated recommendations"   │  │
│  │  Right: CTA "Retake Analysis →"                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [D0] AD SLIDE-DOWN PANEL (carousel)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │  [B] FILTERS │  │  [C] RECOMMENDATION GRID                 │  │
│  │  PANEL       │  │  4 columns desktop / 2 tablet / 1 mobile │  │
│  │              │  │                                          │  │
│  │  [B1] Skin   │  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │  │
│  │  Type (pre-  │  │  │Card 1│ │Card 2│ │Card 3│ │Card 4│   │  │
│  │  selected)   │  │  │92%   │ │87%   │ │85%   │ │80%   │   │  │
│  │              │  │  │match │ │match │ │match │ │match │   │  │
│  │  [B2] Price  │  │  └──────┘ └──────┘ └──────┘ └──────┘   │  │
│  │  Range       │  │                                          │  │
│  │              │  │  [C5] PAGINATION (desktop)               │  │
│  └──────────────┘  └──────────────────────────────────────────┘  │
│                                                                  │
│  [E] HISTORY SECTION (shown when history exists)                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Filters as drawer (hamburger trigger), stacked grid (1 column), Load More button |
| Tablet (`md:`) | 768px | Filters sidebar (narrower), grid (2 columns) |
| Desktop (`lg:`) | 1024px | Filters sidebar + results grid (4 columns), pagination controls |
| Wide (`xl:`) | 1280px | Same as desktop with enhanced spacing |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header (ページヘッダー)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblPageTitle` | Page Title | Heading (`<h1>`) | String | — | Visible. Text: "Recommended for You" / "あなたへのおすすめ" | — | Hardcoded UI text | Shown for both `source = "ai"` and `source = "generic"`. i18n key: `matching.title`. |
| 2 | `lblSourceBadge` | Source Badge | Badge / Pill | Enum | — | Conditional. If `source = "ai"`: "🧬 AI Analysis" (emerald green). If `source = "generic"`: "⬡ General Picks" (amber). | — | `response.source` | Tailwind: `bg-emerald-100 text-emerald-800` (ai) or `bg-amber-100 text-amber-800` (generic). i18n key: `matching.source`. |
| 3 | `lblSourceSubtitle` | Source Subtitle | Text (`<p>`) | String | — | If `source = "ai"`: "Based on your AI analysis · {skinType} · {N} results". If `source = "generic"`: "Showing featured products · No skin analysis found". | — | `response.source`, `response.meta.total` | i18n key: `matching.subtitle`. Dynamic interpolation. |
| 4 | `lnkStartAnalysis` | Start Skin Analysis CTA | Link / Button (`<Link>`) | String | Conditional | **3 states:** (a) `source = "generic"`: Visible. Text: "✦ Start Skin Analysis →". Rose-gold styling. (b) `source = "ai"` AND analysis > 24h old: Visible. Text: "Retake Analysis →". Subtle styling. (c) `source = "ai"` AND analysis ≤ 24h old: Hidden. | — | — | Navigates to `/buyer/skin-analysis`. Part of Profile Prompt Banner (A4). i18n key: `matching.profilePrompt.cta` or `matching.profilePrompt.retake.cta`. |
| 5 | `lblProfilePromptHeading` | Profile Prompt Heading | Heading (`<h3>`) | String | Conditional | **3 states:** (a) `source = "generic"`: "Get Personalized Recommendations". (b) `source = "ai"` AND analysis > 24h old: "Want Fresh Results?". (c) `source = "ai"` AND analysis ≤ 24h old: Hidden. | — | Hardcoded UI text | Part of Profile Prompt Banner (A4). i18n key: `matching.profilePrompt.heading` or `matching.profilePrompt.retake.heading`. |
| 6 | `lblProfilePromptBody` | Profile Prompt Body | Text (`<p>`) | String | Conditional | **3 states:** (a) `source = "generic"`: "Run an AI skin analysis to receive products matched to your skin type and concerns". (b) `source = "ai"` AND analysis > 24h old: "Retake your skin analysis for updated recommendations". (c) `source = "ai"` AND analysis ≤ 24h old: Hidden. | — | Hardcoded UI text | Part of Profile Prompt Banner (A4). i18n key: `matching.profilePrompt.body` or `matching.profilePrompt.retake.body`. |
| 7 | `imgProfilePromptIllustration` | Profile Prompt Illustration | Image (`<img>`) | URL | Conditional | **3 states:** (a) `source = "generic"`: Visible. AI face scan illustration. (b) `source = "ai"` AND analysis > 24h old: Hidden (subtle banner has no illustration). (c) `source = "ai"` AND analysis ≤ 24h old: Hidden. | — | Static asset | Part of Profile Prompt Banner (A4). Alt text: "AI Skin Analysis Illustration". |

### 4.2 Section [B]: Filters Panel (フィルターパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 8 | `lblFiltersTitle` | Filters Title | Heading (`<h3>`) | String | — | Visible. Text: "Filters" / "フィルター". | — | Hardcoded UI text | i18n key: `matching.filtersTitle`. |
| 9 | `chkSkinType` | Skin Type Filter | Checkbox Group | Array of Enum | — | If `source = "ai"`: pre-selected from analysis result. If `source = "generic"`: all unchecked. | Valid enum values: `oily`, `dry`, `combination`, `normal`, `sensitive` | `skin_analysis.skin_type` (ai) / URL query param `skinTypes` | Uses `hasSome` semantics on `products.skin_types` array (BR-MATCH-016). i18n key: `matching.filters.skinType`. |
| 10 | `txtMinPrice` | Minimum Price Input | Input (`number`) | Number | — | Empty. Placeholder: "Min" | ≥ 0. Decimal precision: 2. | URL query param `minPrice` | `price >= minPrice` (BR-MATCH-018). i18n key: `matching.filters.minPrice`. |
| 11 | `txtMaxPrice` | Maximum Price Input | Input (`number`) | Number | — | Empty. Placeholder: "Max" | ≥ 0. Must be ≥ `txtMinPrice` if both set. Decimal precision: 2. | URL query param `maxPrice` | `price <= maxPrice` (BR-MATCH-018). i18n key: `matching.filters.maxPrice`. |
| 13 | `chkIngredients` | Ingredients Filter | Checkbox Group | Array of String | — | All unchecked. | Valid ingredient strings | URL query param `ingredients` | Uses `hasSome` semantics on `products.ingredients` array (BR-MATCH-017). i18n key: `matching.filters.ingredients`. |
| 14 | `selSortField` | Sort Field Select | Select / Dropdown | Enum | — | Default: `matchScore` for `source = "ai"`; no user-selected sort for `source = "generic"`. | Options: `matchScore`, `price`, `createdAt`; generic results use the backend default `is_featured desc`, then `avg_rating desc`. | URL query param `sort` | Sort allowlist follows BR-MATCH-025. i18n key: `matching.sort.field`. |
| 15 | `selSortOrder` | Sort Direction Select | Select / Dropdown | Enum | — | Default: `desc`. | Options: `asc`, `desc`. | URL query param `order` | Sort direction allowlist follows BR-MATCH-025. i18n key: `matching.sort.order`. |
| 16 | `btnResetFilters` | Reset Filters Button | Button (`button`, `outline`) | — | — | Visible. Text: "Reset Filters" / "フィルターをリセット" | — | — | Resets all filter params to defaults, resets `page` to 1 (BR-MATCH-020). i18n key: `matching.filters.reset`. |
| 17 | `btnApplyFilters` | Apply Filters Button | Button (`submit`, `default`) | — | — | Visible (mobile only). Text: "Apply Filters" | — | — | Triggers fetch with current filter params. Disabled during loading. i18n key: `matching.filters.apply`. |

### 4.3 Section [C]: Recommendation Grid (おすすめグリッド)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 18 | `grdRecommendations` | Recommendation Grid | Grid / Responsive Container | — | — | Skeleton shimmer during loading. Populated on success. | 4 columns (desktop ≥1024px), 2 columns (tablet), 1 column (mobile) | `response.data` | Renders `RecommendationCard` components. i18n key: N/A (layout container). |
| 19 | `cardRecommendation` | Recommendation Card | Card (`<Card>`) | — | — | Each card contains: product image, name, price, skin type tags, match score/category badge. | — | `response.data[i]` | Click navigates to `/buyer/products/:id`. i18n key: N/A (composite component). Sponsored products are not inserted into this grid. |
| 20 | `lblMatchScore` | Match Score Badge | Badge / Pill | Integer (0–100) | Conditional | Shown only when `source = "ai"`. Text: "92% match". Green→teal gradient. | 0–100 integer | `data[i].matchScore` | i18n key: `matching.card.matchScore` (interpolated: `{score}% match`). |
| 21 | `lblCategoryBadge` | Category Status Badge | Badge / Pill | Enum | Conditional | Shown only when `source = "generic"`. Values: "⭐ Featured" (amber), "🏆 Top Rated" (teal), "🔥 Best Seller" (orange), "✨ New" (purple). | Based on product flags: `is_featured`, `avg_rating`, `review_count`, `createdAt` | `data[i].is_featured`, `data[i].avg_rating` | i18n key: `matching.card.category.{type}`. |
| 22 | `imgProduct` | Product Image | Image (`<img>`) | URL | — | Product primary image. Aspect ratio 1:1. | — | `data[i].images[0]` | Lazy loading. Alt text: `{productName}`. |
| 23 | `lblProductName` | Product Name | Text (`<span>`) | String(255) | — | Product display name. Truncated to 2 lines. | — | `data[i].name` | i18n key: N/A (dynamic data). |
| 24 | `lblProductSlug` | Product Slug | Text (hidden) | String(255) | — | URL slug for navigation. Used as href on card click. | — | `data[i].slug` | N/A (internal; navigates to `/buyer/products/:slug`). |
| 25 | `lblProductPrice` | Product Price | Text (`<span>`) | Decimal String | — | Formatted price string. | Serialized as string (BR-MATCH-028). | `data[i].price` | Display: `¥{price}` or `${price}` based on locale. |
| 26 | `lblCompareAtPrice` | Compare-At Price | Text (`<span>`) | Decimal String | Conditional | Shown when `compare_at_price` is set. Strikethrough styling. | Serialized as string (BR-MATCH-028). | `data[i].compare_at_price` | Display: `¥{price}` or `${price}` with `line-through` styling. |
| 27 | `lblAvgRating` | Average Rating | Text (`<span>`) | Decimal String | — | Star rating display (e.g., "★ 4.70"). | DECIMAL(3,2) | `data[i].avgRating` | Used for category badge logic (Featured/Top Rated). |
| 28 | `lblReviewCount` | Review Count | Text (`<span>`) | Integer | — | Number of reviews (e.g., "(128)"). | INTEGER | `data[i].reviewCount` | Used for category badge logic (Best Seller threshold). |
| 29 | `lblSkinTypeTags` | Skin Type Tags | Tag Group | Array of Enum | — | Compatible skin types displayed as small tags below product name. | — | `data[i].skinTypes` | Functional specification mapping: `EL-20`. i18n key: `matching.card.skinType.{type}`. |
| 30 | `lblOutOfStock` | Out of Stock Indicator | Badge | Boolean | Conditional | Shown when `isInStock = false`. Text: "Out of Stock". | — | `data[i].isInStock` | i18n key: `matching.card.outOfStock`. |

### 4.4 Section [C5/C6]: Pagination (ページネーション)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 31 | `pagPagination` | Pagination Controls | Pagination | — | Conditional | Desktop only. Previous/next arrows + page numbers. | Page ≥ 1. Max page from `response.meta.totalPages`. | `response.meta` | i18n key: `matching.pagination`. |
| 32 | `btnLoadMore` | Load More Button | Button (`button`, `outline`) | — | Conditional | Mobile only. Infinite-scroll trigger. Rose-gold ghost button. Text: "Load More" / "もっと見る" | — | — | i18n key: `matching.loadMore`. |

### 4.5 Section [E]: Recommendation History (おすすめ履歴)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 33 | `lblHistoryTitle` | History Section Heading | Heading (`<h2>`) | String | Conditional | Visible when the buyer has past completed analysis sessions, regardless of `source`. Text: "📋 Previously Recommended" | — | Hardcoded UI text | History is independent of the current recommendation source. i18n key: `matching.historyTitle`. |
| 34 | `accHistorySessions` | History Session Accordion | Accordion Group | — | Conditional | Rows grouped by analysis date (e.g. "Aug 20, 2026 — Oily Skin Analysis"). | — | `response.data` from `GET /api/v1/recommendations/history` | Expanded row shows mini-cards. Collapsed row shows date header + chevron. i18n key: N/A (dynamic data). |
| 35 | `cardHistoryProduct` | History Product Mini-Card | Card (compact) | — | Conditional | Shows: product image + name + match score + price. | — | `history.products[i]` | Click navigates to `/buyer/products/:id`. i18n key: N/A (composite). |
| 36 | `emptyHistory` | History Empty State | EmptyState | — | Conditional | Text: "No recommendation history yet". Shown when the buyer has no completed analysis sessions, regardless of the current `source`. | — | — | i18n key: `matching.historyEmpty`. |

### 4.6 Section [D0]: Cross-Screen Ad Slide-Down Panel (広告スライドダウンパネル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 37 | `pnlAdSlideDown` | Ad Slide-Down Panel | Carousel | — | Conditional | Horizontal glass-morphism carousel. Up to 5 ad slides. Shown for both `source = "ai"` and `source = "generic"`. | — | `GET /api/v1/ads/panel?placement=category_banner` (recommendation panel uses the existing category-banner placement) | i18n key: N/A (composite). |
| 38 | `imgAdBanner` | Ad Slide Image | Image (`<img>`) | URL | — | Left side of each slide. Aspect ratio 16:9. | — | `ads[i].imageUrl` | Lazy loading. |
| 39 | `lblAdTitle` | Ad Slide Title | Text (`<h4>`) | String | — | Center of each slide. | — | `ads[i].title` | i18n key: N/A (dynamic data). |
| 40 | `lblAdDescription` | Ad Slide Description | Text (`<p>`) | String | — | Center of each slide, below title. May be null. | — | `ads[i].description` | i18n key: N/A (dynamic data). |
| 41 | `btnAdCta` | Ad CTA Button | Button (`button`, `default`) | — | — | Right side of each slide. Text: "Shop Now" / "View Product" / "Add to Cart". | Hidden or disabled when `ads[i].linkUrl` is null. | `ads[i].ctaText` | Navigates to `ads[i].linkUrl` when present. i18n key: N/A (dynamic). |
| 42 | `btnAdPrev` | Ad Previous Arrow | Icon Button | — | — | Left arrow. Overrides auto-slide. | — | — | i18n key: N/A. |
| 43 | `btnAdNext` | Ad Next Arrow | Icon Button | — | — | Right arrow. Overrides auto-slide. | — | — | i18n key: N/A. |
| 44 | `dotAdIndicators` | Ad Dot Indicators | Dot Group | Integer | — | Current position indicator. Filled dot = active slide. | — | — | i18n key: N/A. |
| 45 | `lblAdDisclosure` | Ad Disclosure Footer | Text (`<p>`) | String | — | Always visible below panel. Italic. Text: "Sponsored products are paid placements from merchants" / "スポンサー商品はマーチャントによる有料掲載です" | — | Static disclosure text | BR-MATCH-053. i18n key: `matching.adPanel.disclosure`. |

### 4.7 Section [F]: Error & Empty States (エラー・空状態)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 46 | `alertError` | Error Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown on API errors (400/401/429/500). Contains error message + retry button. | — | API error response message | i18n key: `matching.errors.serverError`. |
| 47 | `btnRetry` | Retry Button | Button (`button`, `outline`) | — | Conditional | Inside `alertError`. Text: "Retry" / "再試行" | — | — | Refetches last failed query. i18n key: `matching.errors.retry`. |
| 48 | `emptyResults` | Empty Results State | EmptyState | — | Conditional | Shown when query returns `total = 0`. Text: "No matching products" + Reset Filters button. | — | `response.meta.total = 0` | i18n key: `matching.empty`. |
| 49 | `btnResetFiltersEmpty` | Reset Filters (Empty State) | Button (`button`, `outline`) | — | Conditional | Inside `emptyResults`. Text: "Reset Filters" | — | — | Resets all filters to defaults. i18n key: `matching.empty.resetFilters`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Page Load — Source Determination
- **Trigger:** Buyer navigates to `/buyer/recommendations`.
- **Processing Logic:**
  1. **Auth Check:** Verify JWT token and `buyer` role. If invalid → redirect to `/login`.
  2. **Analysis Check:** Call backend to determine whether the latest completed AI analysis is no more than 24 hours old.
  3. **Source Assignment:** `source = "ai"` when the latest analysis is valid; otherwise `source = "generic"` (including stale analyses).
  4. **API Call:** `GET /api/v1/recommendations/personalized` with default params.
  5. **Cache Check:** Backend checks Redis cache. HIT → return cached (≤200ms). MISS → query DB, compute scores, seed Redis.
  6. **Render:** Display recommendation cards based on source, show the profile prompt for generic results, and show history independently when completed sessions exist.
- **Exception Handling:**
  - `401` (UNAUTHORIZED): Redirect to `/login`.
  - `403` (FORBIDDEN): Redirect to `/unauthorized`.
  - `500` (INTERNAL_SERVER_ERROR): Show `alertError` with retry button.
  - Network error: Show `alertError` with "Network error" message.

### 5.2 Filter Change — Skin Type (`chkSkinType` onChange)
- **Trigger:** Buyer checks/unchecks a skin type checkbox.
- **Processing Logic:**
  1. Update URL query param `skinTypes` (comma-separated values).
  2. Reset `page` to 1 (BR-MATCH-020).
  3. Trigger refetch: `GET /api/v1/recommendations/personalized?skinTypes=...`.
  4. Backend applies `hasSome` filter on `products.skin_types` (BR-MATCH-016).
  5. Update grid with new results.
- **Exception Handling:** Same as page load error handling.

### 5.3 Filter Change — Price Range (`txtMinPrice` / `txtMaxPrice` onChange)
- **Trigger:** Buyer changes min or max price input.
- **Processing Logic:**
  1. Validate: both ≥ 0. If `minPrice > maxPrice`, show inline error.
  2. Update URL query params `minPrice` / `maxPrice`.
  3. Reset `page` to 1.
  4. Trigger refetch with updated params.
- **Exception Handling:**
  - `VAL-MATCH-003` / `VAL-MATCH-004`: Inline error "Minimum/Maximum price must be 0 or more".

### 5.4 Filter Change — Ingredients (`chkIngredients` onChange)
- **Trigger:** Buyer checks/unchecks an ingredient checkbox.
- **Processing Logic:**
  1. Update URL query param `ingredients` (comma-separated).
  2. Reset `page` to 1.
  3. Trigger refetch.
  4. Backend applies `hasSome` on `products.ingredients` (BR-MATCH-017).
- **Exception Handling:**
  - `VAL-MATCH-002`: "Invalid ingredients".

### 5.5 Reset Filters (`btnResetFilters` onClick / `btnResetFiltersEmpty` onClick)
- **Trigger:** Buyer clicks "Reset Filters" button.
- **Processing Logic:**
  1. Clear all filter URL params (`skinTypes`, `ingredients`, `minPrice`, `maxPrice`).
  2. Reset `page` to 1.
  3. Reset sort to default (`matchScore desc` for ai; `is_featured desc`, then `avg_rating desc` for generic).
  4. Trigger refetch with default params.
- **Exception Handling:** None applicable.

### 5.6 Sort Change
- **Trigger:** Buyer changes sort dropdown.
- **Processing Logic:**
  1. Update URL query params `sort` and `order`.
  2. Reset `page` to 1.
  3. Trigger refetch.
  4. Backend sorts by selected field (BR-MATCH-025).
- **Exception Handling:**
  - `VAL-MATCH-006`: "Invalid sort field".

### 5.7 Pagination — Page Change (`pagPagination` onPageChange)
- **Trigger:** Buyer clicks a page number or previous/next arrow.
- **Processing Logic:**
  1. Update URL query param `page`.
  2. Trigger refetch with `keepPreviousData` (TanStack Query).
  3. Scroll to top of grid.
- **Exception Handling:** None applicable.

### 5.8 Load More — Mobile (`btnLoadMore` onClick)
- **Trigger:** Buyer clicks "Load More" button on mobile.
- **Processing Logic:**
  1. Increment `page` by 1.
  2. Trigger refetch with `keepPreviousData`.
  3. Append new results to existing grid.
- **Exception Handling:** None applicable.

### 5.9 Recommendation Card Click (`cardRecommendation` onClick)
- **Trigger:** Buyer clicks a recommendation card (image or name).
- **Processing Logic:**
  1. Navigate to `/buyer/products/:id`.
- **Exception Handling:** None applicable (navigation only).

### 5.10 History Session Expand/Collapse (`accHistorySessions` onToggle)
- **Trigger:** Buyer clicks a history session accordion row.
- **Processing Logic:**
  1. Toggle expanded/collapsed state.
  2. Expanded: Show compact product mini-cards (image + name + score + price).
  3. Collapsed: Show only date header + chevron.
- **Exception Handling:** None applicable.

### 5.11 Ad Panel — Auto-Slide
- **Trigger:** Page load (panel visible).
- **Processing Logic:**
  1. Start 5-second auto-slide timer (BR-MATCH-048).
  2. Auto-slide pauses on hover (desktop) or touch (mobile).
  3. Manual left/right arrows override auto-slide.
  4. Dot indicators update on slide change.
- **Exception Handling:** None applicable.

### 5.12 Ad Panel — Impression Tracking
- **Trigger:** Panel becomes visible (IntersectionObserver threshold ≥ 50%).
- **Processing Logic:**
  1. Fire-and-forget `POST /api/v1/ads/track/impression` with visible ad IDs.
  2. Record impression event via ad tracking service.
- **Exception Handling:** Silent (no user-facing error).

### 5.13 Ad Panel — CTA Click (`btnAdCta` onClick)
- **Trigger:** Buyer clicks "Shop Now" / "View Product" CTA on ad slide.
- **Processing Logic:**
  1. Fire-and-forget `POST /api/v1/ads/track/click` with `adId`.
  2. Navigate to `ad.linkUrl`.
- **Exception Handling:** None applicable.

### 5.14 Start Skin Analysis CTA (`lnkStartAnalysis` onClick)
- **Trigger:** Buyer clicks "Start Skin Analysis →" in Profile Prompt Banner.
- **Processing Logic:**
  1. Navigate to `/buyer/skin-analysis`.
- **Exception Handling:** None applicable.

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Filter Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) | Default Error Message Text (MY) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-MATCH-001** | `chkSkinType` | Invalid skin type enum value | Inline text below filter group | "Invalid skin type" | "無効な肌タイプです" | "အသားအရောင်အမျိုးအစား မမှန်ကန်ပါ" |
| **VAL-MATCH-002** | `chkIngredients` | Invalid ingredients format | Inline text below filter group | "Invalid ingredients" | "無効な成分です" | "ပါဝင်ပစ္စည်း မမှန်ကန်ပါ" |
| **VAL-MATCH-003** | `txtMinPrice` | Price < 0 | Red border. Text below field. | "Minimum price must be 0 or more" | "最低価格は0以上である必要があります" | "အနည်းဆုံးစျေးနှုန်းသည် 0 သို့မဟုတ် ပိုများရမည်" |
| **VAL-MATCH-004** | `txtMaxPrice` | Price < 0 or minPrice > maxPrice | Red border. Text below field. | "Maximum price must be 0 or more" | "最高価格は0以上である必要があります" | "အများဆုံးစျေးနှုန်းသည် 0 သို့မဟုတ် ပိုများရမည်" |
| **VAL-MATCH-006** | Sort dropdown | Invalid sort field | Inline text | "Invalid sort field" | "無効な並び順項目です" | "စီစဉ်တန်းတူညီမှု အကွက် မမှန်ကန်ပါ" |
| **VAL-MATCH-007** | Sort dropdown | Invalid sort direction | Inline text | "Invalid sort direction" | "無効な並び順です" | "စီစဉ်တန်းတူညီမှု ဦးတည်ရာ မမှန်ကန်ပါ" |
| **VAL-MATCH-008** | `pagPagination` | Page < 1 | Inline text | "Page must be at least 1" | "ページは1以上である必要があります" | "စာမျက်နှာသည် အနည်းဆုံး 1 ဖြစ်ရမည်" |
| **VAL-MATCH-009** | `pagPagination` | Limit < 1 or > 50 | Inline text | "Limit must be between 1 and 50" | "件数は1〜50の間である必要があります" | "ကန့်သတ်ချက်သည် 1 နှင့် 50 ကြားတွင် ရှိရမည်" |

### 6.2 API Error Responses

| Error Code | HTTP Status | Scenario | UI/UX Display | Default Error Message Text (EN) | Default Error Message Text (JA) | Default Error Message Text (MY) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MATCH_001** | `400` | Validation failures (invalid params) | Inline validation hint + top banner | "Invalid request parameters" | "リクエストパラメータが無効です" | "တောင်းဆိုမှု ပါရာမီတာ မမှန်ကန်ပါ" |
| **MATCH_002** | `401` | Missing/invalid token | Redirect to `/login` | "Please log in to continue" | "ログインしてください" | "ဆက်လက်ဆောင်ရွက်ရန် ကျေးဇူးပြု၍ လော့ဂ်အင်ဝင်ပါ" |
| **MATCH_003** | `403` | Non-buyer role | Redirect to `/unauthorized` | "You do not have access to this page" | "このページにアクセスする権限がありません" | "ဤစာမျက်နှာသို့ ဝင်ရောက်ခွင့် မရှိပါ" |
| **MATCH_004** | `404` | Similar product not found | Empty state / hide section | "Product not found" | "商品が見つかりません" | "ထုတ်ကုန် ရှာမတွေ့ပါ" |
| **MATCH_005** | `429` | Rate limit exceeded | "Too many requests. Please wait" + countdown | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" | "တောင်းဆိုမှုများ အရမ်းများပါသည်။ {seconds} စက္ကန့် စောင့်ဆိုင်းပါ" |
| **MATCH_006** | `500` | Server error | Error banner + retry button | "Something went wrong" | "問題が発生しました" | "အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်" |
| **NET_ERR** | — | Network error | Error banner | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" | "ကွန်ရက် အမှား။ ကျေးဇူးပြု၍ ချိတ်ဆက်မှုကို စစ်ဆေးပါ" |

---

## 7. Database Field Mapping (データベースフィールドマッピング)

### 7.1 Recommendation Card → Database

| UI Item | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `cardRecommendation` | `data[i].id` | `id` | `products` | UUID |
| `lblProductName` | `data[i].name` | `name` | `products` | VARCHAR(255) |
| `imgProduct` | `data[i].images[0]` | `images` | `products` | TEXT[] |
| `lblProductPrice` | `data[i].price` | `price` | `products` | DECIMAL(10,2) |
| `lblMatchScore` | `data[i].matchScore` | Computed (in-memory scoring) | — | INTEGER (0–100) |
| `lblSkinTypeTags` | `data[i].skinTypes` | `skin_types` | `products` | TEXT[] |
| `lblOutOfStock` | `data[i].isInStock` | `stock_quantity` | `products` | INTEGER (derived) |
| `lblCategoryBadge` | `data[i].is_featured` | `is_featured` | `products` | BOOLEAN |

### 7.2 Filters → Database

| Filter Param | API Query Param | Database Column | Table | Query Operator |
| :--- | :--- | :--- | :--- | :--- |
| `chkSkinType` | `skinTypes` | `skin_types` | `products` | `hasSome` (Prisma) |
| `txtMinPrice` | `minPrice` | `price` | `products` | `>=` |
| `txtMaxPrice` | `maxPrice` | `price` | `products` | `<=` |
| `chkIngredients` | `ingredients` | `ingredients` | `products` | `hasSome` (Prisma) |

### 7.3 Ad Panel → Database

| UI Item | API Response Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `imgAdBanner` | `ads[i].imageUrl` | `image_url` | `advertisements` | TEXT |
| `lblAdTitle` | `ads[i].title` | `title` | `advertisements` | VARCHAR(255) |
| `lblAdDescription` | `ads[i].description` | `content` | `advertisements` | TEXT (nullable) |
| `btnAdCta` | `ads[i].linkUrl` | `link_url` | `advertisements` | TEXT (nullable) |
| `lblAdDisclosure` | `ads[i].shopName` | `name` | `shops` | VARCHAR(255) |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Personalized Recommendations — Success Response

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "name": "Vitamin C Brightening Serum",
      "slug": "vitamin-c-brightening-serum",
      "price": "4980",
      "compare_at_price": "6980",
      "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
      "skinTypes": ["oily", "combination"],
      "avgRating": "4.70",
      "reviewCount": 128,
      "isFeatured": true,
      "isInStock": true,
      "matchScore": 92
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  },
  "source": "ai"
}
```

### 8.2 Generic Recommendations — Success Response

```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "name": "Hydrating Moisturizer",
      "slug": "hydrating-moisturizer",
      "price": "3200",
      "compare_at_price": null,
      "images": ["https://cdn.example.com/products/moisturizer-1.webp"],
      "skinTypes": ["dry", "normal"],
      "avgRating": "4.50",
      "reviewCount": 89,
      "isFeatured": true,
      "isInStock": true,
      "matchScore": null
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 230,
    "totalPages": 12
  },
  "source": "generic"
}
```

### 8.3 Ad Panel — Success Response

```json
{
  "data": [
    {
      "adId": "adv_abc456",
      "title": "Vitamin C Brightening Serum",
      "description": "Dermatologist-recommended for dull skin",
      "imageUrl": "https://cdn.example.com/ads/vitamin-c-banner.webp",
      "linkUrl": "/buyer/products/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "ctaText": "Shop Now",
      "priorityAmount": "8.00",
      "shopName": "GlowLab"
    }
  ],
  "placement": "category_banner",
  "meta": {
    "total": 5,
    "maxAds": 5
  }
}
```

### 8.4 Recommendation History — Success Response

```json
{
  "data": [
    {
      "sessionId": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "sessionDate": "2026-08-20T14:30:00.000Z",
      "skinTypesUsed": ["oily", "combination"],
      "products": [
        {
          "id": "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80",
          "name": "Vitamin C Brightening Serum",
          "slug": "vitamin-c-brightening-serum",
          "price": "4980",
          "images": ["https://cdn.example.com/products/vitamin-c-1.webp"],
          "matchScore": 92
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### 8.5 Error Response

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 50"],
  "error": "Bad Request",
  "timestamp": "2026-08-28T12:00:00.000Z",
  "path": "/api/v1/recommendations/personalized"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Recommendations Page

| Key | Value |
| :--- | :--- |
| `matching.title` | "Recommended for You" |
| `matching.source.ai` | "AI Analysis" |
| `matching.source.generic` | "General Picks" |
| `matching.subtitle.ai` | "Based on your AI analysis · {skinType} · {count} results" |
| `matching.subtitle.generic` | "Showing featured products · No skin analysis found" |
| `matching.profilePrompt.heading` | "Get Personalized Recommendations" |
| `matching.profilePrompt.body` | "Run an AI skin analysis to receive products matched to your skin type and concerns" |
| `matching.profilePrompt.cta` | "Start Skin Analysis →" |
| `matching.profilePrompt.retake.heading` | "Want Fresh Results?" |
| `matching.profilePrompt.retake.body` | "Retake your skin analysis for updated recommendations" |
| `matching.profilePrompt.retake.cta` | "Retake Analysis →" |
| `matching.filtersTitle` | "Filters" |
| `matching.filters.skinType` | "Skin Type" |
| `matching.filters.minPrice` | "Min Price" |
| `matching.filters.maxPrice` | "Max Price" |
| `matching.filters.ingredients` | "Ingredients" |
| `matching.filters.reset` | "Reset Filters" |
| `matching.filters.apply` | "Apply Filters" |
| `matching.card.matchScore` | "{score}% match" |
| `matching.card.category.featured` | "Featured" |
| `matching.card.category.topRated` | "Top Rated" |
| `matching.card.category.bestSeller` | "Best Seller" |
| `matching.card.category.new` | "New" |
| `matching.card.outOfStock` | "Out of Stock" |
| `matching.pagination.previous` | "Previous" |
| `matching.pagination.next` | "Next" |
| `matching.loadMore` | "Load More" |
| `matching.historyTitle` | "Previously Recommended" |
| `matching.historyEmpty` | "No recommendation history yet" |
| `matching.empty` | "No matching products" |
| `matching.empty.resetFilters` | "Reset Filters" |
| `matching.errors.serverError` | "Something went wrong" |
| `matching.errors.retry` | "Retry" |
| `matching.errors.network` | "Network error. Please check your connection" |
| `matching.sort.field` | "Sort by" |
| `matching.sort.order` | "Sort direction" |
| `matching.adPanel.disclosure` | "Sponsored products are paid placements from merchants" |

### 9.2 Japanese (ja) — Recommendations Page

| Key | Value |
| :--- | :--- |
| `matching.title` | "あなたへのおすすめ" |
| `matching.source.ai` | "AI分析" |
| `matching.source.generic` | "おすすめピック" |
| `matching.subtitle.ai` | "AI分析に基づく · {skinType} · {count}件の結果" |
| `matching.subtitle.generic` | "おすすめ商品を表示中 · スキン分析が見つかりません" |
| `matching.profilePrompt.heading` | "パーソナライズされたおすすめを受け取る" |
| `matching.profilePrompt.body` | "AI肌分析を実行して、あなたの肌タイプや悩みに合った商品を受け取りましょう" |
| `matching.profilePrompt.cta` | "肌分析を開始 →" |
| `matching.profilePrompt.retake.heading` | "最新の結果を確認しますか？" |
| `matching.profilePrompt.retake.body` | "肌分析をやり直して、最新のおすすめを受け取りましょう" |
| `matching.profilePrompt.retake.cta` | "肌分析をやり直す →" |
| `matching.filtersTitle` | "フィルター" |
| `matching.filters.skinType` | "肌タイプ" |
| `matching.filters.minPrice` | "最低価格" |
| `matching.filters.maxPrice` | "最高価格" |
| `matching.filters.ingredients` | "成分" |
| `matching.filters.reset` | "フィルターをリセット" |
| `matching.filters.apply` | "フィルターを適用" |
| `matching.card.matchScore` | "{score}%一致" |
| `matching.card.category.featured` | "おすすめ" |
| `matching.card.category.topRated` | "高評価" |
| `matching.card.category.bestSeller` | "ベストセラー" |
| `matching.card.category.new` | "新着" |
| `matching.card.outOfStock` | "在庫切れ" |
| `matching.pagination.previous` | "前へ" |
| `matching.pagination.next` | "次へ" |
| `matching.loadMore` | "もっと見る" |
| `matching.historyTitle` | "これまでのおすすめ" |
| `matching.historyEmpty` | "おすすめ履歴はまだありません" |
| `matching.empty` | "一致する商品がありません" |
| `matching.empty.resetFilters` | "フィルターをリセット" |
| `matching.errors.serverError` | "問題が発生しました" |
| `matching.errors.retry` | "再試行" |
| `matching.errors.network` | "ネットワークエラー。接続を確認してください" |
| `matching.sort.field` | "並び順" |
| `matching.sort.order` | "並び方向" |
| `matching.adPanel.disclosure` | "スポンサー商品はマーチャントによる有料掲載です" |

### 9.3 Myanmar/Burmese (my) — Recommendations Page

| Key | Value |
| :--- | :--- |
| `matching.title` | "သင့်အတွက် အကြံပြုထားသည်" |
| `matching.source.ai` | "AI ခွဲခမ်းစိတ်ဖြာချက်" |
| `matching.source.generic` | "ယေဘုယျရွေးချယ်မှု" |
| `matching.subtitle.ai` | "သင့် AI ခွဲခမ်းစိတ်ဖြာချက်ပေါ် မူတည်၍ · {skinType} · {count} ရလဒ်" |
| `matching.subtitle.generic` | "ရွေးချယ်ထားသည့် ထုတ်ကုန်များ ပြသနေသည် · အသားအရေ ခွဲခမ်းစိတ်ဖြာချက် ရှာမတွေ့ပါ" |
| `matching.profilePrompt.heading` | "ကိုယ်ပိုင်လုပ်ဆောင်ချက် အကြံပြုချက်များ ရယူပါ" |
| `matching.profilePrompt.body` | "သင့်အသားအရေအမျိုးအစားနှင့် ပြဿနာများနှင့် ကိုက်ညီသည့် ထုတ်ကုန်များ ရရှိရန် AI အသားအရေ ခွဲခမ်းစိတ်ဖြာချက်ကို ဆောင်ရွက်ပါ" |
| `matching.profilePrompt.cta` | "အသားအရေ ခွဲခမ်းစိတ်ဖြာချက် စတင်ပါ →" |
| `matching.profilePrompt.retake.heading` | "နောက်ဆုံးရလဒ်များ ရလိုပါသလား?" |
| `matching.profilePrompt.retake.body` | "အသားအရေ ခွဲခမ်းစိတ်ဖြာချက်ကို ပြန်လည်ဆောင်ရွက်ပြီး နောက်ဆုံးအကြံပြုချက်များ ရရှိပါ" |
| `matching.profilePrompt.retake.cta` | "အသားအရေ ခွဲခမ်းစိတ်ဖြာချက် ပြန်လည်ဆောင်ရွက်ပါ →" |
| `matching.filtersTitle` | "ဇကာ" |
| `matching.filters.skinType` | "အသားအရေအမျိုးအစား" |
| `matching.filters.minPrice` | "အနည်းဆုံးစျေးနှုန်း" |
| `matching.filters.maxPrice` | "အများဆုံးစျေးနှုန်း" |
| `matching.filters.ingredients` | "ပါဝင်ပစ္စည်းများ" |
| `matching.filters.reset` | "ဇကာ ပြန်လည်သတ်မှတ်ပါ" |
| `matching.filters.apply` | "ဇကာ အသုံးပြုပါ" |
| `matching.card.matchScore` | "{score}% ကိုက်ညီမှု" |
| `matching.card.category.featured` | "ရွေးချယ်ထားသည်" |
| `matching.card.category.topRated` | "အမြင့်ဆုံး အဆင့်သတ်မှတ်ချက်" |
| `matching.card.category.bestSeller` | "အရောင်းရဆုံး" |
| `matching.card.category.new` | "အသစ်" |
| `matching.card.outOfStock` | "စတော့ကုန်သွားပြီ" |
| `matching.pagination.previous` | "အရင်" |
| `matching.pagination.next` | "နောက်တစ်ခု" |
| `matching.loadMore` | "နောက်ထပ် ဖွင့်ပါ" |
| `matching.historyTitle` | "ယခင် အကြံပြုထားသည်" |
| `matching.historyEmpty` | "အကြံပြုချက် မှတ်တမ်း မရှိသေးပါ" |
| `matching.empty` | "ကိုက်ညီသည့် ထုတ်ကုန် မရှိပါ" |
| `matching.empty.resetFilters` | "ဇကာ ပြန်လည်သတ်မှတ်ပါ" |
| `matching.errors.serverError` | "အမှားတစ်ခု ဖြစ်ပွားခဲ့သည်" |
| `matching.errors.retry` | "ထပ်ကြိုးစားပါ" |
| `matching.errors.network` | "ကွန်ရက် အမှား။ ကျေးဇူးပြု၍ ချိတ်ဆက်မှုကို စစ်ဆေးပါ" |
| `matching.sort.field` | "စီရန်" |
| `matching.sort.order` | "စီမည့် ဦးတည်ချက်" |
| `matching.adPanel.disclosure` | "ပံ့ပိုးထားသော ထုတ်ကုန်များသည် ကုန်သည်များမှ ပေးချေထားသော နေရာချထားမှုများ ဖြစ်သည်" |

---

## 10. Shared Components (共有コンポーネント)

### 10.1 RecommendationCard Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/recommendations/components/RecommendationCard.tsx` |
| **Purpose** | Individual product card in the recommendation grid |

**Props Interface:**
```typescript
interface RecommendationCardProps {
  id: string;
  name: string;
  slug: string;
  price: string;
  images: string[];
  skinTypes: string[];
  matchScore: number | null;
  isFeatured: boolean;
  isInStock: boolean;
  source: 'ai' | 'generic';
  onClick: () => void;
}
```

### 10.2 AdSlidePanel Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/AdSlidePanel.tsx` |
| **Purpose** | Reusable cross-screen sponsored ad carousel |

**Props Interface:**
```typescript
interface AdSlidePanelProps {
  placement: string;
  maxSlides?: number; // default 5
  autoSlideMs?: number; // default 5000
}
```

### 10.3 FiltersPanel Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/recommendations/components/FiltersPanel.tsx` |
| **Purpose** | Desktop sidebar / mobile drawer filter controls |

### 10.4 SkeletonRecommendationGrid Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/recommendations/components/SkeletonRecommendationGrid.tsx` |
| **Purpose** | Loading skeleton shimmer for recommendation grid |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender). Rose-gold CTA buttons.
- **Responsive Grid:** 4 columns (desktop ≥1024px) → 2 columns (tablet) → 1 column (mobile <768px).
- **Filters:** Desktop = sidebar (always visible). Mobile = drawer (hamburger trigger, slide-in from left).
- **Accessibility:** Every control must be keyboard navigable. ARIA labels required. Error messages must be announced via `role="alert"`. Ad panel must have `aria-roledescription="carousel"`.
- **Performance:** Skeleton shimmer grid during fetch (shadcn `Skeleton`). Match score computation ≤50ms. Cache hit response ≤200ms. Page load ≤2 seconds (NFR-001).
- **Security:** All user input sanitized (XSS). Prisma parameterized queries only. JWT required for personalized endpoints. No `console.log` in production.
- **Design Tokens:** Match score badge uses gradient `bg-gradient-to-r from-emerald-500 to-teal-500`. Category badges: Featured `bg-amber-100 text-amber-800`, Top Rated `bg-teal-100 text-teal-800`, Best Seller `bg-orange-100 text-orange-800`, New `bg-purple-100 text-purple-800`.
- **Caching:** Personalized results cached in Redis (TTL 5min). Cache key: `cache:recommendations:user:{userId}:{hashOfQuery}`. Invalidation on new AI analysis.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Page Load & Source Determination

- [ ] Authenticated buyer with AI analysis → `source = "ai"`, green badge, match scores shown
- [ ] Authenticated buyer without a valid analysis, including stale analysis → `source = "generic"`, amber badge, profile prompt shown
- [ ] Unauthenticated visitor → redirected to `/login`
- [ ] Non-buyer role → redirected to `/unauthorized`
- [ ] Page loads within 2 seconds (NFR-001)
- [ ] Skeleton shimmer grid shown during loading

### 12.2 Filter Controls

- [ ] Skin type checkboxes pre-selected from analysis (`source = "ai"`)
- [ ] Skin type checkboxes all unchecked (`source = "generic"`)
- [ ] Skin type filter triggers refetch with correct `hasSome` query
- [ ] Min price input validates ≥ 0
- [ ] Max price input validates ≥ 0
- [ ] Min price > max price shows inline error
- [ ] Rating dropdown options: Any, 1+, 2+, 3+, 4+, 4.5+
- [ ] Ingredients filter triggers refetch with correct `hasSome` query
- [ ] Sort field options: Match Score, Price, Rating, Created At
- [ ] Sort direction options: Ascending, Descending
- [ ] Reset Filters clears all params and resets page to 1
- [ ] Any filter or sort change resets `page` to 1

### 12.3 Recommendation Grid

- [ ] 4-column grid on desktop (≥1024px)
- [ ] 2-column grid on tablet (768px–1023px)
- [ ] 1-column grid on mobile (<768px)
- [ ] Match score badge shown only for `source = "ai"`
- [ ] Category badge shown only for `source = "generic"`
- [ ] Product name truncated to 2 lines
- [ ] Price displayed as formatted string
- [ ] Out of stock indicator shown when applicable
- [ ] Card click navigates to `/buyer/products/:id`

### 12.4 Pagination & Load More

- [ ] Desktop: pagination controls visible with page numbers
- [ ] Mobile: "Load More" button visible
- [ ] Page change triggers refetch
- [ ] Load More appends results to existing grid
- [ ] Skeleton shown during page change

### 12.5 Recommendation History

- [ ] History section visible for either source when completed analysis history exists
- [ ] Stale analysis remains available in recommendation history while current source is `generic`
- [ ] Sessions grouped by analysis date
- [ ] Accordion expand/collapse works
- [ ] Expanded row shows mini-cards with image + name + score + price
- [ ] History empty state shown when no past sessions

### 12.6 Ad Panel (D0)

- [ ] Panel visible for both `source = "ai"` and `source = "generic"`
- [ ] Maximum 5 ad slides displayed
- [ ] Auto-slide every 5 seconds
- [ ] Auto-slide pauses on hover (desktop)
- [ ] Auto-slide pauses on touch (mobile)
- [ ] Manual left/right arrows work
- [ ] Dot indicators update correctly
- [ ] Disclosure footer always visible
- [ ] CTA button navigates to product page
- [ ] Impression tracking fires when panel visible (≥50%)
- [ ] Click tracking fires on CTA click

### 12.7 Error Handling

- [ ] 400 error → inline validation hint + top banner
- [ ] 401 error → redirect to `/login`
- [ ] 403 error → redirect to `/unauthorized`
- [ ] 404 error → empty state
- [ ] 429 error → "Too many requests" + retry countdown
- [ ] 500 error → error banner with retry button
- [ ] Network error → "Network error" banner
- [ ] Retry button refetches last failed query

### 12.8 Responsive Design

- [ ] Desktop (≥1024px): sidebar filters + 4-column grid
- [ ] Tablet (768px–1023px): narrower sidebar + 2–3 column grid
- [ ] Mobile (<768px): drawer filters + 1–2 column grid
- [ ] All controls keyboard navigable
- [ ] ARIA labels present on interactive elements

### 12.9 i18n

- [ ] All EN keys render correctly
- [ ] All JA keys render correctly
- [ ] All MY keys render correctly
- [ ] Language toggle switches all labels (EN → JA → MY → EN)
- [ ] Dynamic interpolation (score, skinType, count) works in all 3 languages

---

*End of Screen Items Specification (Matching & Recommendation)*
