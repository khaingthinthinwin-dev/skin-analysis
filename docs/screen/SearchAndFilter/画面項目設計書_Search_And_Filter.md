# Screen Items Specification (画面項目設計書) — Search & Filter

**Document ID:** SKM-SIS-SCR-002  
**Target Screen:** Search & Filter Page (検索・フィルタページ)  
**Subsystem:** All Roles — Product Search, Filtering, Sorting & Pagination  
**Function ID:** FN-SEARCH-001  
**Version:** 2.6  
**Created:** 2026-08-07  
**Last Updated:** 2026-08-25  
**Author:** Senior System Engineer  
**Review Status:** Approved (承認済み)  
**Classification:** Internal — Engineering Division

---

## 1. Document Control (ドキュメント管理)

### 1.1 Document Revision History

| Version | Date | Author | Description of Changes |
| :--- | :--- | :--- | :--- |
| 1.0 | 2026-08-10 | Senior System Engineer | Initial release. Screen items specification for the Search & Filter page covering keyword search, category browsing, multi-dimensional filtering, sorting, pagination, active filter chips, and responsive filter drawer. Aligned with SKM-FDS-SEARCH-001 and PRWM-SIS-SCR-001 format. |
| 1.1 | 2026-08-14 | Senior System Engineer | Added Grid/List view toggle specification: screen items `tglViewMode` / `btnGridMode` / `btnListMode` (Sec 4.4), behavior (Sec 5.14), i18n keys (Sec 9), shared ViewToggle component (Sec 10.7), UI/UX & accessibility notes (Sec 11), and test checklist (Sec 12.6). View mode defaults to Grid, persists to localStorage, and leaves URL-based search/filter/sort/pagination state unchanged. |
| 2.0 | 2026-08-14 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v1.5 and DATABASE_SPEC v2.0: updated ID format from CUID to UUID, corrected DB mapping types to UUID. |
| 2.1 | 2026-08-17 | Senior System Engineer | Further alignment with SignUp_Login (画面項目設計書 SKM-SIS-SCR-001) format and naming conventions. Enhanced section organization, improved consistency across all table formats, and ensured all Item Definitions follow standardized component type and data type conventions per DEVELOPMENT_RULES v2.0. |
| 2.2 | 2026-08-18 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v1.10, DATABASE_SPEC v2.2, and DEVELOPMENT_RULES v2.1. Updated subsystem from "Buyer Module" to "All Roles". Added sponsored advertisement display (Sec 4.4 item39, Sec 5.15, Sec 8.5). Added 401/403 error codes for guest/merchant/admin shopping restrictions (Sec 6.2). Added guest alert modal behavior (Sec 11). Added Myanmar (MY) i18n translations (Sec 9.3). Fixed CUID→UUID in validation messages. |
| 2.3 | 2026-08-21 | Senior System Engineer | Aligned with REQUIREMENT_SPEC v2.10 / DATABASE_SPEC v2.4 / DEVELOPMENT_RULES v2.1: stale cross-references updated (Rule 4.6.4 → REQUIREMENT_SPEC §5.3 Advertisement Display Rules), related document versions refreshed, and merchant approval gating (`merchants.license_status`, DBS §3.2) reflected in visibility notes. |
| 2.4 | 2026-08-24 | Senior System Engineer | Redesigned the Sponsored Advertisement (`slotAdTop`) presentation: slide-down UI panel above the product grid with animated slide-down entrance; advertisement description text now rendered together with title, image/banner, and CTA; responsive desktop (horizontal) / mobile (stacked) slide layouts. Added slide sub-item definitions (Sec 4.4 items 40–46), updated layout diagrams (Sec 3.1), breakpoints (Sec 3.2), behavior (Sec 5.15), API response note (Sec 8.5), i18n keys (Sec 9), shared component (Sec 10.8), UI/UX & accessibility notes (Sec 11), and test checklist (Sec 12.7). 5-second auto-slide, maximum 5 ads, API, approval, schedule, and tier-priority rules unchanged. |
| 2.5 | 2026-08-24 | Senior System Engineer | Relocated the Sponsored Advertisement slide-down panel (`slotAdTop`, [D0]–[D0d]) out of [D] Results Area: the panel now renders horizontally centered between [A] Page Header / Title and [B] Search Bar, spanning the full container width, with [B] Search Bar immediately below it. Updated layout diagrams (Sec 3.1), responsive breakpoints (Sec 3.2), item definition sections (ad panel moved to new Sec 4.2; former Secs 4.2–4.5 renumbered to 4.3–4.6), behavior (Sec 5.15), shared component (Sec 10.8), UI/UX & accessibility notes (Sec 11), and test checklist (Sec 12.7). Slide-down animation, 5-second auto-slide, maximum 5 ads, API, approval, schedule, and tier-priority rules unchanged. |
| 2.6 | 2026-08-25 | Senior System Engineer | Reorganized page layout flow to **A → Advertisement → B+C → D**: Search Bar ([B]) and Filters Panel ([C]) now render in the same row/section instead of [B] being above and [C] being a sidebar alongside [D]. On desktop, [B] and [C] are side-by-side with [D] Results Area below. On mobile, [B] and [C] trigger are in the same row with [D] below. Updated layout diagrams (Sec 3.1), responsive breakpoints (Sec 3.2), ad panel position description (Sec 4.2), Search Bar notes (Sec 4.3), Filters Panel notes (Sec 4.4), ad slide-down behavior target (Sec 5.15), SponsoredAdSlider component description (Sec 10.8), UI/UX & accessibility notes (Sec 11), and test checklist (Sec 12.7). All existing functionality, styling, and ad rules unchanged. |

### 1.2 Related Documents

| No. | Document ID | Document Name | File Path | Remarks |
| :-- | :--- | :--- | :--- | :--- |
| 1 | SKM-REQ-001 | Requirements Definition (要件定義書) v2.10 | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Permission matrix (§2.2), merchant approval states (§2.4), business rules (§7.2, §7.6), acceptance criteria (§8). |
| 2 | SKM-DBS-001 | Database Design Specification (データベース設計書) v2.4 | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `categories`, `merchants`, `shops`, `advertisements`, `ad_fee_settings`), constraints, data types. |
| 3 | SKM-DEV-001 | Development Rules (開発ルール) v2.1 | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules, design tokens, error responses, naming conventions. |
| 4 | SKM-FDS-SEARCH-001 | Functional Specification (機能設計書) v2.3 — Search & Filter | `docs/screen/SearchAndFilter/機能設計書  _Search_And_Filter.md` | Use cases, state transitions, business rules, error handling. |

---

## 2. Screen Overview & Purpose (画面概要・目的)

### 2.1 Purpose (目的)
The Search & Filter page serves as the discovery and exploration entry point within the Cosmetics Finder platform. It enables all users (Visitor, Buyer, Merchant, Admin) to locate skincare products via keyword search, hierarchical category navigation, and multi-dimensional filtering (skin type, ingredients, price range, review rating). Results are sortable, paginated, and rendered in configurable Grid or List layouts. All search, filter, sort, and pagination state is persisted in URL query parameters as the authoritative state source, ensuring result sets remain shareable, bookmarkable, and navigation-compatible.

### 2.2 Target Users & Roles (対象ユーザーと権限)

| Attribute | Value |
| :--- | :--- |
| **Primary Actors** | All roles — Visitor (unauthenticated), Buyer (authenticated), Merchant (authenticated), Admin (authenticated) |
| **Required Authentication** | None for search/browse/filter/sort/paginate (public endpoints). Shopping actions (add to cart/wishlist) require authentication. |
| **Data Scope** | Global product catalog (active, approved products from approved merchant shops) |
| **Access Control** | Public routes — no authentication guards applied for search/filter/sort/paginate. Shopping actions restricted: Buyer ✓, Guest → alert modal (no auto-close) → `/login?redirect=<path>`, Merchant/Admin → 403 `SHOPPING_NOT_ALLOWED`. Rate limiting enforced on public search endpoint. |

### 2.3 Core Functions & Basic Design Principles (主要機能・基本設計方針)
1. **Keyword Search** — Partial (case-insensitive) matching across product name, short description, tags, and ingredients fields.
2. **Category Browsing** — Hierarchical category tree navigation with single-select filtering; includes all descendant categories in results.
3. **Multi-Dimensional Filtering** — Simultaneous filtering by skin type (multi-select), ingredients (multi-select), price range (min/max bounds), and minimum review rating (1–5 stars).
4. **Sorting** — Results sortable by newest-first, price (low-to-high or high-to-low), or highest rating.
5. **Pagination** — Paged results with configurable page size (10, 20, or 50 items per page; default 20; max 100).
6. **URL-State Navigation** — All search/filter/sort/page state encoded in URL query parameters as single source of truth (BR-SEARCH-003); supports browser back/forward and URL sharing.
7. **Performance Caching** — Repeat queries and category tree served from Redis cache (product list TTL 2 min, category tree TTL 30 min).
8. **Responsive Design** — Desktop: fixed filters sidebar + multi-column product grid. Mobile: bottom-sheet filter drawer + single-column product display.
9. **View Mode Toggle** — Switch result layout between responsive Grid (1–4 columns, adaptive) and mobile-optimized List (single-column stacked rows). Selection persists to `localStorage`, defaults to Grid, and does not affect URL state or trigger refetch.
10. **Sponsored Advertisements** — Render approved advertisement images/banners from Merchant-purchased Advertisement Packages in the Search Results Top placement via `GET /api/v1/ads?placement=search_top` with 5-min Redis TTL. Eligible ads (max 5) display in a slide-down panel horizontally centered between the page header ([A]) and the search bar + filters row ([B]+[C]), spanning the full container width with the search bar + filters rendered immediately below — animated slide-down entrance, each slide showing title, description, image/banner, and CTA together, with a responsive horizontal layout on desktop and stacked layout on mobile — auto-sliding every 5 seconds without blocking product results.

---

## 3. Screen Layout (画面レイアウト構成)

### 3.1 Overall Page Structure (全体画面構成)

#### Desktop Layout (≥ 1024px)
```text
┌──────────────────────────────────────────────────────────────────────┐
│                           BROWSER VIEWPORT                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│               ┌─────────────────────────────────────┐                │
│               │      [A] PAGE HEADER / TITLE        │                │
│               │   Logo + System Name                │                │
│               │   "Cosmetics Finder"                │                │
│               │   [A1] Page Title: "Search Products"│                │
│               └─────────────────────────────────────┘                │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │           [D0] SPONSORED AD SLIDE-DOWN PANEL (cond.)             │ │
│ │                (slides down on ad load, centered)                │ │
│ │          ┌─────────────┬──────────────────────────┐              │ │
│ │          │ [D0a]       │ [D0b] Ad Title           │              │ │
│ │          │ Image /     │ [D0c] Description        │              │ │
│ │          │ Banner      │ [D0d] CTA Button         │              │ │
│ │          └─────────────┴──────────────────────────┘              │ │
│ │      (full container width, horizontally centered between        │ │
│ │       [A] and [B+C]; horizontal slide, 5s auto-slide, max 5)    │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────┐  ┌──────────────────────────────────┐  │
│ │  [B] SEARCH BAR          │  │  [C] FILTERS PANEL               │  │
│ │  [B1] Keyword Input      │  │  [C1] Categories                 │  │
│ │  [B2] Search  [B3] Clear │  │  [C2] Skin Type  [C3] Ingredients│  │
│ │                          │  │  [C4] Price Range  [C5] Rating    │  │
│ └──────────────────────────┘  │  [C6] Apply Filters              │  │
│                                │  [C7] Reset Filters              │  │
│                                └──────────────────────────────────┘  │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │  [D] RESULTS AREA                                                 │ │
│ │  [D1] Results Count  [D2] Sort Select  [D2a] View Toggle        │ │
│ │  [D3] Active Filter Chips                                        │ │
│ │  [D4] Product Grid / List                                        │ │
│ │  [D5] Pagination + Page Size                                     │ │
│ │  (cond.) Loading Skeleton / Empty State / Error Banner            │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│               ┌─────────────────────────────────────┐                │
│               │   [E] FOOTER CONTROLS               │                │
│               │   [Language] [Theme]                │                │
│               └─────────────────────────────────────┘                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Mobile Layout (< 768px)
```text
┌───────────────────────────────────────────────────────┐
│                    BROWSER VIEWPORT                   │
├───────────────────────────────────────────────────────┤
│   [A] PAGE HEADER (Logo + System Name)                │
│   [A1] Page Title: "Search Products"                  │
│   [D0] SPONSORED AD SLIDE-DOWN PANEL (cond.)          │
│      ┌──────────────────────────────────────┐         │
│      │ [D0a] Image/Banner (full-width)      │         │
│      │ [D0b] Title                          │         │
│      │ [D0c] Description (2-line clamp)     │         │
│      │ [D0d] CTA Button (full-width)        │         │
│      └──────────────────────────────────────┘         │
│      (stacked, full container width, horizontally     │
│       centered between [A] and [B+C], 5s auto-slide,  │
│       max 5 ads)                                      │
│   ┌──────────────────────────┐┌──────────────┐        │
│   │ [B] SEARCH BAR           ││[C] FILTERS   │        │
│   │ [B1] Input [B2] [B3]     ││  TRIGGER     │        │
│   └──────────────────────────┘└──────────────┘        │
│   [D1] Results Count  [D2] Sort Select                │
│   [D2a] View Toggle (Grid/List)                       │
│   [D3] Active Filter Chips Row                        │
│   [D4] PRODUCT GRID (1–2 cols) / LIST (stacked rows)  │
│   [D5] Pagination   [D6] Page Size Select             │
│   [E] FOOTER CONTROLS ([Language] [Theme])            │
│                                                       │
│   [C] FILTER DRAWER (cond., bottom sheet / overlay)   │
│      [C1] Categories  [C2] Skin Type  [C3] Ingredients│
│      [C4] Price Range  [C5] Rating                    │
│      [C6] Apply Filters  [C7] Reset Filters           │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 3.2 Responsive Layout Breakpoints (レスポンシブ対応)

| Breakpoint | Min Width | Layout Behavior |
| :--- | :--- | :--- |
| Mobile (default) | 0px | Search bar ([B]) and filter trigger button ([C]) in the same row. Filters open as a bottom-sheet/overlay drawer. Grid view: 1–2 columns; List view: stacked rows. Grid/List view toggle in results toolbar (persists to localStorage). Filter chips row above results. Sponsored ad slide-down panel (`slotAdTop`) renders between the page header and the search bar + filters row, spanning the full container width, stacked: full-width 16:9 image on top; title, description, and full-width CTA below. Results area ([D]) below the search + filters row. |
| Tablet (`md:`) | 768px | Search bar ([B]) and filters panel ([C]) in the same row — search bar left, compact filters right. Results grid with 2–3 columns. Grid/List view toggle in results toolbar. Sponsored ad slide-down panel switches to horizontal layout (image left, text block right), spanning the full container width, horizontally centered between the page header and the search + filters row. |
| Desktop (`lg:`) | 1024px | Search bar ([B]) and filters panel ([C]) side-by-side in the same row — search bar left, full filters sidebar right. Results area ([D]) below the search + filters row with 4-column grid. Grid/List view toggle in results toolbar. Sponsored ad slide-down panel renders horizontal (image left, text block right), spanning the full container width (not confined to the results area), horizontally centered between the page header and the search + filters row. |
| Wide (`xl:`) | 1280px | Same as `lg:` with enhanced spacing. Search bar + filters in the same row, results below with 4-column grid. Sponsored ad slide-down panel identical to `lg:` (full container width, centered between page header and search + filters row) with enhanced spacing. |

---

## 4. Item Definitions (画面項目定義)

### 4.1 Section [A]: Page Header & Page Title (ページヘッダー・ページタイトル)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | `lblLogo` | Logo Icon | Icon (`Sparkles`) | — | — | Visible; always displayed. | — | Hardcoded UI element | Lucide `Sparkles` icon. Tailwind: `h-5 w-5 text-primary`. |
| 2 | `lblSystemName` | System Name | Static Label (`<span>`) | String | — | Visible; always displayed. Text: "Cosmetics Finder" | — | Hardcoded UI text | Tailwind: `font-bold text-lg`. |
| 3 | `lblPageTitle` | Page Title | Heading (`<h1>`) | String | Mandatory | Visible. Text: "Search Products" | — | i18n key `search.title` | Screen reader landmark. Switches to "商品検索" in JA. |

### 4.2 Section [D0]: Sponsored Ad Slide-Down Panel (スポンサー広告スライドダウンパネル)

Rendered horizontally centered between Section [A] (Page Header / Title) and the [B]+[C] (Search Bar + Filters) row across the full container width; the [B] Search Bar + [C] Filters Panel row renders immediately below this panel.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 39 | `slotAdTop` | Sponsored Ad Slot — Search Results Top (Slide-Down Panel) | Slide-down panel (`div`, animated expand/collapse) | — | Conditional | Hidden until ad response arrives. On first eligible ad: panel slides down into view directly below [A] Page Header / Title and above the [B]+[C] (Search Bar + Filters) row — horizontally centered across the full container width (translateY −100% → 0 with height expand, 300ms ease-out, once per mount), pushing the search bar + filters row and product results down smoothly. | Maximum 5 ads; auto-slide every 5 seconds (BR-SEARCH-026). | `GET /api/v1/ads?placement=search_top` (5-min Redis TTL, `cache:ads:search-top`) | Displays the Merchant's approved advertisement records from purchased Advertisement Packages whose placement includes Search Results Top. Applies package placement and tier priority rules (Premium > Standard > Basic, round-robin within a tier). Only approved, active, in-schedule ads are eligible (REQUIREMENT_SPEC §5.3). On ad fetch error or no eligible ads: hidden — no slide-down occurs (graceful degradation). `prefers-reduced-motion: reduce` skips the entrance animation (instant appear; rotation rules unchanged). Visually distinct from organic results via `badgeSponsored`. |
| 40 | `trackAdSlides` | Ad Slide Track *(sub-item of `slotAdTop`)* | Slider track (`div`, vertical) | — | Conditional | Renders when `slotAdTop` is expanded. | Vertical slide-down transition between slides (500ms ease-in-out); advance interval 5s (unchanged). | `data[]` from `GET /api/v1/ads?placement=search_top` | Auto-advancement pauses on hover or while keyboard focus is inside `slotAdTop`; resumes on pointer leave / blur (WCAG 2.2.2). Loops after the last slide. |
| 41 | `cardAdSlide` | Ad Slide Card *(sub-item of `slotAdTop`)* | Card (flex container) | — | Per ad (≤ 5) | One card per eligible ad. Card spans the full container width, centered within `slotAdTop`. | Desktop/tablet (≥ 768px): horizontal — image left (w-80), text block right. Mobile (< 768px): stacked — image top, content below. | `data[]` ad object | Responsive re-layout is CSS-only (Tailwind breakpoints); no refetch and no rotation reset on breakpoint change. Whole card clickable (BR-SEARCH-029). |
| 42 | `imgAdBanner` | Ad Image / Banner *(sub-item of `slotAdTop`)* | Image (`<img>`) | VARCHAR(500) URL | Mandatory (per ad) | Rendered per slide. | Desktop: fixed 320×120, `object-cover`. Mobile: full-width 16:9, `object-cover`. Lazy-loaded. | `advertisements.image_url` → `imageUrl` | `alt` built from i18n template `search.sponsored.adAlt` with the ad title. |
| 43 | `lblAdTitle` | Ad Title *(sub-item of `slotAdTop`)* | Heading (`<h3>`) | VARCHAR(255) | Mandatory (per ad) | Rendered per slide. | Single-line truncation (`truncate`). | `advertisements.title` → `title` | Displayed together with `imgAdBanner`, `txtAdDescription`, and `btnAdCta` inside the same `cardAdSlide`. |
| 44 | `txtAdDescription` | Ad Description *(sub-item of `slotAdTop`)* | Paragraph (`<p>`) | TEXT | Optional | Rendered per slide when present. | Clamped to 2 lines (`line-clamp-2`) on all breakpoints. | `advertisements.description` → `description` | Displayed with title, image/banner, and CTA. Hidden when null/empty without breaking layout. |
| 45 | `btnAdCta` | Ad CTA Button *(sub-item of `slotAdTop`)* | Button/Link (`primary`) | VARCHAR(100) label / VARCHAR(500) URL | Mandatory (per ad) | Rendered per slide. | Desktop: inline, right-aligned. Mobile: full-width. Keyboard-focusable link with visible primary focus ring. | `advertisements.cta_text` / `cta_url` → `ctaText` / `ctaUrl` | Navigates to the ad target (BR-SEARCH-029); fires `ad.click` analytics event with `ad_id` and `placement`. |
| 46 | `badgeSponsored` | Sponsored Badge *(sub-item of `slotAdTop`)* | Badge (`span`) | — | Mandatory (per slide) | Visible on every slide. | Text: i18n key `search.sponsored.label`; uppercase, amber background + dark text. | Hardcoded UI element | Distinguishes ads from organic results (REQUIREMENT_SPEC §5.3). |

### 4.3 Section [B]: Search Bar (検索バー)

On desktop/tablet, rendered side-by-side with Section [C] (Filters Panel) in the same row. On mobile, rendered alongside the filter trigger button in the same row, below the ad panel and above the results area.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 4 | `txtSearch` | Keyword Input | Input (`search`) | String(255) | No | Empty. Placeholder: "Search by name, description, or ingredient..." | MaxLength: 255. Partial case-insensitive match. | `products.name`, `products.short_description`, `products.tags`, `products.ingredients` (query param `q`) | 300ms debounce before firing query (BR-SEARCH-004). URL param `q`. AutoFocus on direct `/search` route. |
| 5 | `btnSearch` | Search Button | Button (`submit`, `primary`) | — | Mandatory | Visible. Search icon. Text: "Search" | — | — | Submits keyword immediately, bypassing debounce (ST-DEB-003). Loading: spinner. |
| 6 | `btnClearSearch` | Clear Search | Button (`ghost`/icon) | — | — | Hidden when `q` is empty. Visible when keyword present. | — | — | Clears `q` param and refetches default catalog (ST-DEB-003). |

### 4.4 Section [C]: Filters Panel (フィルタパネル)

On desktop/tablet, rendered side-by-side with Section [B] (Search Bar) in the same row. On mobile, accessible via a trigger button alongside the search bar in the same row, opening as a bottom-sheet/overlay drawer.

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 7 | `pnlFilters` | Filters Panel | Aside (sidebar / drawer) | — | Mandatory | Desktop: visible sidebar. Mobile: hidden drawer. | — | — | Container for all filter groups. Title: i18n key `search.filtersTitle`. |
| 8 | `btnMobileFilter` | Mobile Filter Trigger | Button (`icon`, outline) | — | Conditional | Hidden on desktop. Visible on mobile in the same row as the search bar. Text: "Filters" with icon. | — | — | Opens `pnlFilters` as drawer on mobile (EL-28). |
| 9 | `grpCategories` | Category Group | Accordion | — | No | Collapsed by default. | — | — | Nested category checkboxes (tree) from `GET /api/v1/categories`. |
| 10 | `chkCategory` | Category Checkbox | Checkbox | — | No | Unchecked by default. | — | `categories.id` (query param `categoryId`) | Selecting a category includes all descendant categories (BR-SEARCH-010). Single select. |
| 11 | `grpSkinType` | Skin Type Group | Accordion | — | No | Collapsed by default. | — | — | Filter group with 5 skin type options. |
| 12 | `chkSkinType` | Skin Type Checkbox | Checkbox | — | No | Unchecked by default. | Options: dry, oily, combination, sensitive, normal | `products.skin_types` (query param `skinTypes`) | Multi-select; backend uses `hasEvery` semantics (BR-SEARCH-006). |
| 13 | `grpIngredients` | Ingredients Group | Accordion | — | No | Collapsed by default. | — | — | Filter group with ingredient options. |
| 14 | `chkIngredient` | Ingredient Checkbox | Checkbox | — | No | Unchecked by default. | — | `products.ingredients` (query param `ingredients`) | Multi-select; backend uses `hasSome` semantics (BR-SEARCH-007). |
| 15 | `grpPriceRange` | Price Range Group | Accordion | — | No | Collapsed by default. | — | — | Min/max price bound inputs. |
| 16 | `txtMinPrice` | Min Price Input | Input (`number`) | NUMERIC(10,2) | No | Empty. Placeholder: "Min price" | Must be ≥ 0. Decimal. | `products.price` (query param `minPrice`) | Validation: `VAL-SEARCH-005`. Must be ≤ `txtMaxPrice`. |
| 17 | `txtMaxPrice` | Max Price Input | Input (`number`) | NUMERIC(10,2) | No | Empty. Placeholder: "Max price" | Must be ≥ 0. Decimal. | `products.price` (query param `maxPrice`) | Validation: `VAL-SEARCH-006`. Must be ≥ `txtMinPrice`. |
| 18 | `grpRating` | Rating Group | Accordion | — | No | Collapsed by default. | — | — | Minimum rating selector group. |
| 19 | `rdoRating` | Rating Selector | Star Radio Group | Enum | No | Unchecked by default. | Values: 1–5. | `products.avg_rating` (query param `rating`) | Renders 1–5 star minimum rating in Beauty Pink. Filters `avg_rating >= rating` (BR-SEARCH-009). |
| 20 | `btnApplyFilters` | Apply Filters Button | Button (`primary`) | — | Mandatory | Visible. Text: "Apply Filters" | — | — | Applies current selections, resets `page` to 1 (BR-SEARCH-011). |
| 21 | `btnResetFilters` | Reset Filters Button | Button (`outline`) | — | No | Visible. Text: "Reset Filters" | — | — | Clears all filters, keeps keyword `q` intact. Resets `page` to 1. |

### 4.5 Section [D]: Results Area (結果エリア)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 22 | `lblResultsCount` | Results Count | Text | String | Mandatory | Visible. Text: "{total} products for '{q}'" (or default count) | — | `meta.total` | i18n key `search.resultsCount`. Updates on every query. |
| 23 | `selSort` | Sort Select | Select | Enum | No | Default: `createdAt desc` (Newest) | Options: newest, price asc, price desc, rating | `products.price`, `products.avg_rating`, `products.created_at` (params `sort`, `order`) | Sort allowlist (BR-SEARCH-015). Change resets `page` to 1. |
| 24 | `tglViewMode` | View Mode Toggle | Toggle Group (segmented control) | Enum (`grid` / `list`) | No | Default: `grid` (Grid view). | — | — | Two segments: Grid and List. Persists to `localStorage` key `search.viewMode`; falls back to `grid` when absent or invalid. Local UI state only — never written to URL query params (search/filter/sort/page unchanged). |
| 25 | `btnGridMode` | Grid View Button | Button (segment, icon + text) | Enum (`grid`) | No | Active when `tglViewMode = grid`. | — | — | Grid icon + i18n label. `aria-pressed="true"` when active. Selects responsive grid layout for `gridProducts`. |
| 26 | `btnListMode` | List View Button | Button (segment, icon + text) | Enum (`list`) | No | Active when `tglViewMode = list`. | — | — | List icon + i18n label. `aria-pressed="true"` when active. Selects mobile-friendly stacked list layout. |
| 27 | `chipsActiveFilters` | Active Filter Chips Row | Chips Row | — | Conditional | Hidden when no filters applied. | — | — | Renders one chip per active filter value (BR-SEARCH-019). Above results on desktop; above results inside drawer header on mobile (BR-SEARCH-024). |
| 28 | `chipFilter` | Active Filter Chip | Tag Chip | String | — | Visible per active filter. | — | URL params `categoryId`, `skinTypes`, `ingredients`, `minPrice`, `maxPrice`, `rating` | Human-readable label (e.g., "Skin Type: Dry", "$10–$50", "Rating: 4★+"). Close (×) icon removes single value (BR-SEARCH-021, BR-SEARCH-022). |
| 29 | `btnClearAllFilters` | Clear All Filters | Button (`ghost`/link) | — | Conditional | Visible only when ≥ 1 chip present. Text: "Clear all" | — | — | Removes all filters at once, keeps keyword `q` (BR-SEARCH-023). |
| 30 | `gridProducts` | Product Grid / List | Grid (Grid view) / List (List view) | — | Mandatory | Visible. Grid view: responsive grid. List view: stacked single-column rows. | — | `data` (Product Summary DTO array) | Grid view: 1–2 cols (mobile), 2–3 (tablet), 4 (desktop). List view: full-width rows (thumbnail left, details right), no horizontal scroll. Layout driven by `tglViewMode`; switching does not refetch. |
| 31 | `cardProduct` | Product Card | Card | — | Mandatory | One card per product. | — | `data[]` product summary | Grid view: vertical card. List view: horizontal row layout. Reused `ProductCard` component. Click navigates to `/products/:slug`. Out-of-stock flagged `isInStock: false` (BR-SEARCH-014). |
| 32 | `sklLoading` | Loading Skeleton | Skeleton | — | Conditional | Shown during fetch. Hidden otherwise. | — | — | Shimmer placeholders (lavender) matching current view mode: grid blocks in Grid view, row skeletons in List view. |
| 33 | `pnlEmpty` | Empty State | EmptyState | — | Conditional | Shown when query returns `total = 0`. | — | `meta.total === 0` | "No products found" + description + `btnResetFilters`. i18n keys `search.empty.*`. |
| 34 | `alertError` | Error Banner | Alert (`destructive`) | String | Conditional | Hidden by default. Shown on API/network error. | — | API error response | Tailwind: `border-destructive/50 text-destructive`. Dismissible. Includes Retry button. |
| 35 | `pgnPagination` | Pagination | Pagination | — | No | Visible when `totalPages > 1`. | `page` ≥ 1, `limit` 1–100 | `meta.page`, `meta.totalPages` | Previous/next + page numbers. First/last page boundaries disable buttons (Sec 3.3). |
| 36 | `selPageSize` | Page Size Select | Select | Enum | No | Default: 20 | Options: 10 / 20 / 50 / 100 | Query param `limit` | Changing page size resets `page` to 1. |

### 4.6 Section [E]: Footer Controls (フッターコントロール)

| No. | Item ID | Item Name (Logical) | Component Type | Data Type & Max Length | Required | Initial State / Default Value | Input Constraints / Formats | Data Source / DB Mapping | Remarks / Business Rules |
| :---: | :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| 37 | `btnLanguageToggle` | Language Toggle | Toggle Group | Enum | — | Default: Browser language or "en" | Options: EN, JA, MY | — | Switches all i18n keys. Persists to localStorage. |
| 38 | `btnThemeToggle` | Theme Toggle | Icon Button | Enum | — | Default: System preference | Options: light, dark, system | — | Cycles light → dark → system. Uses `next-themes`. |

---

## 5. Item Behaviors & Event Specifications (各項目における挙動・イベント仕様)

### 5.1 Keyword Input (`txtSearch` onInput / onKeyDown)
- **Trigger:** User types in the search input.
- **Processing Logic:**
  1. **Debounce:** Issue the query only after 300ms of typing inactivity (ST-DEB-001). Each keystroke resets the timer (ST-DEB-002).
  2. **URL Update:** Update `q` query param via `setSearchParams`.
  3. **Refetch:** TanStack Query refetches `GET /api/v1/products` with the new key.
  4. **State Transition:** `IDLE` → `LOADING` occurs when the debounced query fires (ST-DEB-005).
  5. **Supersede:** If a previous request is still in-flight, it is cancelled/ignored; only the latest state renders (ST-DEB-004).
  6. **Enter Key:** Pressing Enter fires the query immediately (bypasses debounce).
- **Exception Handling:** Invalid/missing params are caught by `searchParamsSchema` (Zod); invalid values dropped or surfaced via `alertError`.

### 5.2 Search Button (`btnSearch` onClick)
- **Trigger:** User clicks the Search button.
- **Processing Logic:**
  1. Submit the current `txtSearch` value immediately without waiting for the debounce timer (ST-DEB-003).
  2. Update `q` param and refetch.
- **Exception Handling:** Keyword > 255 chars rejected with `VAL-SEARCH-001`.

### 5.3 Clear Search (`btnClearSearch` onClick)
- **Trigger:** User clicks the Clear Search button.
- **Processing Logic:**
  1. Clear `q` param from the URL.
  2. Reset `txtSearch` to empty.
  3. Refetch default catalog (sorted by `createdAt desc`).
- **Exception Handling:** None applicable.

### 5.4 Category Checkbox Change (`chkCategory` onChange)
- **Trigger:** User checks/unchecks a category in the nested tree.
- **Processing Logic:**
  1. Set/clear `categoryId` param.
  2. Reset `page` to 1 (BR-SEARCH-011).
  3. Refetch — backend includes all descendant categories (BR-SEARCH-010).
- **Exception Handling:** Invalid UUID rejected with `VAL-SEARCH-002` / `VAL-SEARCH-013`.

### 5.5 Apply Filters (`btnApplyFilters` onClick)
- **Trigger:** User clicks "Apply Filters" button (or mobile drawer Apply).
- **Processing Logic:**
  1. Collect changed filters (skinTypes, ingredients, minPrice, maxPrice, rating, categoryId).
  2. Validate numeric fields (min ≥ 0, max ≥ 0, min ≤ max).
  3. Merge into current params with `page: 1` (BR-SEARCH-011).
  4. `setSearchParams(toQueryString(...))`.
  5. TanStack Query refetches; grid shows skeleton during fetch.
  6. On mobile: close the filters drawer.
- **Exception Handling:** Invalid values shown inline per-field (see Sec 6.1). On invalid, no query is fired.

### 5.6 Reset Filters (`btnResetFilters` onClick)
- **Trigger:** User clicks "Reset Filters" button (panel, empty state, or mobile drawer).
- **Processing Logic:**
  1. Remove all filter params (`categoryId`, `skinTypes`, `ingredients`, `minPrice`, `maxPrice`, `rating`).
  2. Keep keyword `q` intact.
  3. Reset `page` to 1 (BR-SEARCH-011).
  4. Refetch default result set (BR-SEARCH-023).
- **Exception Handling:** None applicable.

### 5.7 Sort Change (`selSort` onChange)
- **Trigger:** User selects a new sort option.
- **Processing Logic:**
  1. Map option → `sort` + `order` params (`price/asc`, `price/desc`, `rating/desc`, `createdAt/desc`).
  2. Reset `page` to 1.
  3. Refetch via TanStack Query; re-render grid in new order.
- **Exception Handling:** Non-allowlisted values rejected (BR-SEARCH-015, `VAL-SEARCH-009`/`VAL-SEARCH-010`).

### 5.8 Pagination & Page Size (`pgnPagination` / `selPageSize` onClick / onChange)
- **Trigger:** User clicks page number, previous/next, or changes page size.
- **Processing Logic:**
  1. **Page change:** Update `page` param; refetch with `keepPreviousData`.
  2. **Page size change:** Update `limit` param and reset `page` to 1.
  3. Render new page of results.
  4. Clamp `page > totalPages` to last page or show empty state (Sec 3.3).
  5. Boundary handling: Previous disabled on first page; Next disabled on last page.
- **Exception Handling:** `page < 1` or `limit > 100` rejected (`VAL-SEARCH-011`, `VAL-SEARCH-012`).

### 5.9 Active Filter Chip Removal (`chipFilter` × onClick)
- **Trigger:** User clicks the close (×) icon on a filter chip.
- **Processing Logic:**
  1. Remove that single filter value from URL params.
  2. Reset `page` to 1 (BR-SEARCH-022).
  3. Refetch.
- **Exception Handling:** None applicable.

### 5.10 Clear All Filters (`btnClearAllFilters` onClick)
- **Trigger:** User clicks "Clear all" on the chips row.
- **Processing Logic:**
  1. Remove all active filters at once (BR-SEARCH-023).
  2. Keep keyword `q` intact.
  3. Reset `page` to 1; refetch default result set.
- **Exception Handling:** None applicable.

### 5.11 Mobile Filter Drawer (`btnMobileFilter` onClick)
- **Trigger:** User clicks the filter trigger button in the search + filters row on mobile.
- **Processing Logic:**
  1. Open `pnlFilters` as a bottom-sheet/overlay drawer.
  2. Focus trap + `aria-modal` applied.
  3. "Apply Filters" applies and closes the drawer.
  4. Close (X) button dismisses without applying pending changes.
- **Exception Handling:** None applicable.

### 5.12 Language Toggle (`btnLanguageToggle` onClick)
- **Trigger:** User clicks language toggle button.
- **Processing Logic:**
  1. Cycle through languages: EN → JA → MY → EN.
  2. Update `i18next` language via `i18n.changeLanguage()`.
  3. Persist preference to `localStorage`.
  4. Re-render all translated labels.
- **Exception Handling:** None applicable.

### 5.13 Theme Toggle (`btnThemeToggle` onClick)
- **Trigger:** User clicks theme toggle button.
- **Processing Logic:**
  1. Cycle through themes: light → dark → system.
  2. Update `next-themes` theme via `setTheme()`.
  3. Persist preference to `localStorage`.
- **Exception Handling:** None applicable.

### 5.14 View Mode Toggle (`tglViewMode` / `btnGridMode` / `btnListMode` onClick)
- **Trigger:** User clicks the "Grid" or "List" segment button in the results toolbar.
- **Processing Logic:**
  1. Set `tglViewMode` to the clicked value (`grid` or `list`).
  2. Re-render `gridProducts` / `cardProduct` / `sklLoading` in the selected layout using the already-fetched `data` — no API refetch is triggered.
  3. Leave all URL query params untouched (`q`, `categoryId`, `skinTypes`, `ingredients`, `minPrice`, `maxPrice`, `rating`, `sort`, `order`, `page`, `limit`). Search, filters, sorting, and pagination state remain unchanged; page position is not reset.
  4. Persist the selection to `localStorage` key `search.viewMode`. On page load, restore the stored value; if absent or invalid, fall back to `grid` (Grid view).
- **Exception Handling:** None applicable (local UI state only). Invalid stored value silently falls back to `grid`.

### 5.15 Sponsored Advertisement Display (`slotAdTop` on mount)
- **Trigger:** Component mounts (Search & Filter page loaded).
- **Processing Logic:**
  1. **Fetch ad slot:** `GET /api/v1/ads?placement=search_top` — parallel to product results fetch, does not block or defer product loading.
  2. **Filter:** Select approved advertisement records from Merchant-purchased Advertisement Packages for the Search Results Top placement. Keep only approved, active ads whose schedule covers the current time.
  3. **Prioritize:** Apply package placement and tier priority rules (Premium > Standard > Basic), with round-robin rotation within each tier, then limit the slider to a maximum of 5 ads.
  4. **Cache:** Cache the resulting ad list in Redis with key `cache:ads:search-top`, TTL 5 minutes (BR-SEARCH-028).
  5. **Slide-down entrance:** If eligible ads exist, `slotAdTop` slides down into view directly between the page header ([A]) and the search bar + filters row ([B]+[C]) — horizontally centered across the full container width — height expands from 0 while the panel translates from −100% to 0 (300ms ease-out, once per mount), smoothly pushing the search bar + filters row and product grid down. With `prefers-reduced-motion: reduce`, the panel appears instantly without animation.
  6. **Render slide content:** Each slide renders the ad's image/banner (`imgAdBanner`), title (`lblAdTitle`), description (`txtAdDescription`, hidden when absent), and CTA (`btnAdCta`) together in one `cardAdSlide`, plus the "Sponsored Ad" badge (`badgeSponsored`) on every slide (REQUIREMENT_SPEC §5.3). Description clamped to 2 lines; title truncated to 1 line.
  7. **Auto-slide:** Advance to the next ad every 5 seconds using a vertical slide-down transition (current slide exits upward, next enters from the top, 500ms). Maximum 5 slides; loops back to the first after the last.
  8. **Responsive layout:** Desktop/tablet (≥ 768px): horizontal slide — image left (320×120, object-cover), text block right, inline CTA. Mobile (< 768px): stacked slide — full-width 16:9 image, title, description, full-width CTA below. On all breakpoints the panel spans the full container width and stays horizontally centered between [A] and the [B]+[C] row. Layout switching is CSS-only (breakpoints); no refetch and no rotation reset occurs when crossing breakpoints.
  9. **Pause on interaction:** Auto-advancement pauses while the pointer hovers over, or keyboard focus is within, `slotAdTop`; it resumes on pointer leave / blur (WCAG 2.2.2). The 5-second interval itself is unchanged.
  10. **Error handling:** On ad fetch error or empty response, hide `slotAdTop` entirely — no slide-down entrance runs (graceful degradation; ad failure never blocks product results).
  11. **Click tracking:** CTA click triggers `ad.click` analytics event with `ad_id` and `placement`.
- **Exception Handling:** None (ad slot failure is non-critical; page functions normally without ads).

---

## 6. Validation & Error Message Mapping (バリデーション及びエラーメッセージマッピング)

### 6.1 Search Query Validation Errors

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VAL-SEARCH-001** | `txtSearch` (`q`) | Keyword exceeds 255 characters | Red border. Text below field. | "Keyword must be 255 characters or fewer" | "キーワードは255文字以内である必要があります" |
| **VAL-SEARCH-002** | `chkCategory` (`categoryId`) | Invalid category ID format (UUID) | Red border. Text below field. | "Invalid category ID" | "無効なカテゴリIDです" |
| **VAL-SEARCH-013** | `chkCategory` (`categoryId`) | Invalid UUID format | Red border. Text below field. | "Invalid UUID format" | "無効なUUID形式です" |
| **VAL-SEARCH-003** | `chkSkinType` (`skinTypes`) | Invalid skin type enum value | Red border. Text below field. | "Invalid skin type" | "無効な肌タイプです" |
| **VAL-SEARCH-004** | `chkIngredient` (`ingredients`) | Ingredients is not an array of strings | Red border. Text below field. | "Invalid ingredients" | "無効な成分です" |
| **VAL-SEARCH-005** | `txtMinPrice` | Min price is less than 0 | Red border. Text below field. | "Minimum price must be 0 or more" | "最低価格は0以上である必要があります" |
| **VAL-SEARCH-006** | `txtMaxPrice` | Max price is less than 0 | Red border. Text below field. | "Maximum price must be 0 or more" | "最高価格は0以上である必要があります" |
| **VAL-SEARCH-007** | `txtMinPrice` / `txtMaxPrice` | Min price exceeds max price | Red border on both fields. Text below fields. | "Minimum price cannot exceed maximum price" | "最低価格は最高価格以下である必要があります" |
| **VAL-SEARCH-008** | `rdoRating` (`rating`) | Rating is outside 1–5 | Red border. Text below field. | "Rating must be between 1 and 5" | "評価は1〜5の間である必要があります" |
| **VAL-SEARCH-009** | `selSort` (`sort`) | Sort field not in allowlist | Red border. Text below field. | "Invalid sort field" | "無効な並び順項目です" |
| **VAL-SEARCH-010** | `selSort` (`order`) | Sort direction not asc/desc | Red border. Text below field. | "Invalid sort direction" | "無効な並び順です" |
| **VAL-SEARCH-011** | `pgnPagination` (`page`) | Page is less than 1 | Red border. Text below field. | "Page must be at least 1" | "ページは1以上である必要があります" |
| **VAL-SEARCH-012** | `selPageSize` (`limit`) | Limit is outside 1–100 | Red border. Text below field. | "Limit must be between 1 and 100" | "件数は1〜100の間である必要があります" |
| **VAL-SEARCH-014** | `alertError` (401) | Guest attempts shopping action without authentication | Alert modal (no auto-close) → redirect to `/login?redirect=<path>` | "Please log in to continue" | "ログインしてください" |
| **VAL-SEARCH-015** | `alertError` (403) | Merchant/Admin attempts shopping action | Alert banner (destructive, no auto-close) | "Shopping features are only available to buyers" | "買い物機能はバイヤーのみ利用できます" |

### 6.2 Search API Error Responses

| Error Code | Target Field | Condition / Evaluation Logic | UI/UX Display Presentation Style | Default Error Message Text (EN) | Default Error Message Text (JA) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BAD_REQUEST** (400) | `alertError` | Validation failures (invalid query params) | Inline validation hint + top banner | "Invalid search parameters" | "無効な検索条件です" |
| **UNAUTHORIZED** (401) | `alertError` | Guest attempts shopping action (add to cart/wishlist) without authentication | Alert modal (no auto-close). "Login required" message. "OK" button → redirect to `/login?redirect=<encoded_path>` | "Please log in to continue" | "ログインしてください" |
| **FORBIDDEN** (403) | `alertError` | Merchant or Admin attempts shopping action (add to cart/wishlist) | Alert banner (destructive). No auto-close. | "Shopping features are only available to buyers" | "買い物機能はバイヤーのみ利用できます" |
| **NOT_FOUND** (404) | `alertError` | Product detail not found (invalid slug) | Empty state / banner | "Product not found" | "商品が見つかりません" |
| **TOO_MANY_REQUESTS** (429) | `alertError` | Rate limit exceeded on public search | Alert banner (destructive) + retry countdown | "Too many requests. Please wait {seconds} seconds" | "リクエストが多すぎます。{seconds}秒お待ちください" |
| **INTERNAL_SERVER_ERROR** (500) | `alertError` | Server error | Alert banner (destructive) + retry button | "Something went wrong. Please try again" | "問題が発生しました。もう一度お試しください" |
| **NET_ERR** | `alertError` | Network error | Alert banner (destructive) + retry button | "Network error. Please check your connection" | "ネットワークエラー。接続を確認してください" |

---

## 7. Database Fields Mapping (データベースフィールドマッピング)

| Form / UI Field | API Field | Database Column | Table | Data Type |
| :--- | :--- | :--- | :--- | :--- |
| `txtSearch` | `q` | `name` / `short_description` / `tags` / `ingredients` | `products` | VARCHAR / TEXT / TEXT[] (partial case-insensitive match) |
| `chkCategory` | `categoryId` | `id` | `categories` | UUID FK |
| `chkSkinType` | `skinTypes` | `skin_types` | `products` | TEXT[] enum (`hasEvery`) |
| `chkIngredient` | `ingredients` | `ingredients` | `products` | TEXT[] (`hasSome`) |
| `txtMinPrice` | `minPrice` | `price` | `products` | NUMERIC(10,2) |
| `txtMaxPrice` | `maxPrice` | `price` | `products` | NUMERIC(10,2) |
| `rdoRating` | `rating` | `avg_rating` | `products` | NUMERIC(3,2) |
| `selSort` | `sort` / `order` | `price` / `avg_rating` / `created_at` | `products` | NUMERIC / NUMERIC / TIMESTAMP |
| `pgnPagination` | `page` | — (skip) | `products` | INTEGER |
| `selPageSize` | `limit` | — (take) | `products` | INTEGER |
| — | — | `is_active` | `products` | BOOLEAN (filter: active only, BR-SEARCH-012) |
| — | — | `is_approved` | `shops` | BOOLEAN (filter: approved shop only, BR-SEARCH-013) |
| `slotAdTop` | `ad` | `id` | `advertisements` | UUID PK |
| — | — | `placement` | `advertisements` | VARCHAR (`search_top`) |
| — | — | `title` | `advertisements` | VARCHAR(255) |
| — | — | `description` | `advertisements` | TEXT |
| — | — | `image_url` | `advertisements` | VARCHAR(500) |
| — | — | `cta_text` | `advertisements` | VARCHAR(100) |
| — | — | `cta_url` | `advertisements` | VARCHAR(500) |
| — | — | `impression_url` | `advertisements` | VARCHAR(500) |
| — | — | `tier` | `advertisements` | VARCHAR (premium/standard/basic) |
| — | — | `urgency` | `advertisements` | INTEGER |
| — | — | `approval_status` | `advertisements` | VARCHAR (pending/approved/rejected) |
| — | — | `starts_at` | `advertisements` | TIMESTAMP |
| — | — | `expires_at` | `advertisements` | TIMESTAMP |

---

## 8. API Response Mapping (APIレスポンスマッピング)

### 8.1 Search Success Response

```json
{
  "data": [
    {
      "id": "6b72a6b2-60cc-483a-867c-1b77df7f7dc8",
      "name": "Gentle Foaming Cleanser",
      "slug": "gentle-foaming-cleanser",
      "shortDescription": "pH-balanced cleanser for oily skin",
      "price": "29.99",
      "compareAtPrice": "39.99",
      "images": ["https://cdn.example.com/products/6b72a6b2-60cc-483a-867c-1b77df7f7dc8/main.webp"],
      "skinTypes": ["oily", "combination"],
      "tags": ["cleanser", "fragrance-free"],
      "avgRating": "4.5",
      "reviewCount": 128,
      "isInStock": true,
      "category": { "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "Cleansers", "slug": "cleansers" }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Note:** `price` and `compareAtPrice` are serialized as strings (API Standard 8.3).

### 8.2 Category Tree Success Response

```json
{
  "data": [
    {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "name": "Skincare",
      "slug": "skincare",
      "iconUrl": "https://cdn.example.com/categories/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/icon.webp",
      "sortOrder": 1,
      "children": [
        {
          "id": "3a52c3c9-c1b7-4c4f-9e67-d8687cfc1d9f",
          "name": "Cleansers",
          "slug": "cleansers",
          "iconUrl": null,
          "sortOrder": 1,
          "children": []
        }
      ]
    }
  ]
}
```

### 8.3 Search Error Response (Validation)

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 100", "rating must not be greater than 5"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products"
}
```

### 8.4 Search Error Response (Rate Limited)

```json
{
  "statusCode": 429,
  "error": "TOO_MANY_REQUESTS",
  "errorCode": "THROTTLER_001",
  "message": "Too many requests. Please wait 30 seconds",
  "retryAfter": 30,
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products"
}
```

### 8.5 Sponsored Advertisement Response (Search Top Placement)

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "placement": "search_top",
      "title": "Summer Skincare Sale",
      "description": "Up to 40% off premium skincare products",
      "imageUrl": "https://cdn.example.com/ads/a1b2c3d4-e5f6-7890-abcd-ef1234567890/banner.webp",
      "ctaText": "Shop Now",
      "ctaUrl": "/products?category=skincare&sort=newest",
      "impressionUrl": "https://analytics.example.com/impression?ad_id=a1b2c3d4",
      "tier": "premium",
      "urgency": 8,
      "approvalStatus": "approved",
      "startsAt": "2026-08-01T00:00:00.000Z",
      "expiresAt": "2026-09-01T00:00:00.000Z"
    }
  ]
}
```

**Note:** Ad response is fetched independently and cached in Redis (key `cache:ads:search-top`, TTL 5 min). Ad failure never blocks product results. Each slide in the `slotAdTop` slide-down panel renders `title`, `description`, `imageUrl`, and `ctaText`/`ctaUrl` together.

### 8.6 Shopping Restriction Error Response (401 Guest)

```json
{
  "statusCode": 401,
  "error": "UNAUTHORIZED",
  "message": ["Please log in to continue"],
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/cart"
}
```

### 8.7 Shopping Restriction Error Response (403 Merchant/Admin)

```json
{
  "statusCode": 403,
  "error": "SHOPPING_NOT_ALLOWED",
  "message": ["Shopping features are only available to buyers"],
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/cart"
}
```

---

## 9. i18n Keys Reference (i18nキーリファレンス)

### 9.1 English (en) — Search & Filter

| Key | Value |
| :--- | :--- |
| `search.title` | "Search Products" |
| `search.searchPlaceholder` | "Search by name, description, or ingredient..." |
| `search.searchButton` | "Search" |
| `search.clear` | "Clear" |
| `search.resultsCount` | "{total} products for '{q}'" |
| `search.resultsCountDefault` | "{total} products" |
| `search.sort` | "Sort by" |
| `search.sort.newest` | "Newest" |
| `search.sort.priceAsc` | "Price: Low to High" |
| `search.sort.priceDesc` | "Price: High to Low" |
| `search.sort.rating` | "Highest Rated" |
| `search.view` | "View" |
| `search.view.grid` | "Grid" |
| `search.view.list` | "List" |
| `search.view.gridLabel` | "Switch to grid view" |
| `search.view.listLabel` | "Switch to list view" |
| `search.filtersTitle` | "Filters" |
| `search.openFilters` | "Open filters" |
| `search.categories` | "Categories" |
| `search.skinType` | "Skin Type" |
| `search.skinType.dry` | "Dry" |
| `search.skinType.oily` | "Oily" |
| `search.skinType.combination` | "Combination" |
| `search.skinType.sensitive` | "Sensitive" |
| `search.skinType.normal` | "Normal" |
| `search.ingredients` | "Ingredients" |
| `search.priceRange` | "Price Range" |
| `search.minPrice` | "Min price" |
| `search.maxPrice` | "Max price" |
| `search.rating` | "Minimum Rating" |
| `search.applyFilters` | "Apply Filters" |
| `search.resetFilters` | "Reset Filters" |
| `search.clearAllFilters` | "Clear all" |
| `search.pagination` | "Pagination" |
| `search.pagination.previous` | "Previous" |
| `search.pagination.next` | "Next" |
| `search.pageSize` | "Items per page" |
| `search.empty.title` | "No products found" |
| `search.empty.description` | "Try clearing filters or broadening your keyword" |
| `search.chip.skinType` | "Skin Type: {value}" |
| `search.chip.ingredient` | "Ingredient: {value}" |
| `search.chip.category` | "Category: {value}" |
| `search.chip.priceRange` | "${min}–${max}" |
| `search.chip.rating` | "Rating: {value}+" |
| `search.errors.serverError` | "Something went wrong. Please try again" |
| `search.errors.tooManyRequests` | "Too many requests. Please wait {seconds} seconds" |
| `search.errors.retry` | "Retry" |
| `search.sponsored` | "Sponsored" |
| `search.sponsored.label` | "Sponsored Ad" |
| `search.sponsored.panelLabel` | "Sponsored advertisements" |
| `search.sponsored.adAlt` | "Advertisement: {title}" |
| `search.sponsored.slideStatus` | "Sponsored ad {position} of {total}: {title}" |
| `search.errors.loginRequired` | "Please log in to continue" |
| `search.errors.shoppingNotAllowed` | "Shopping features are only available to buyers" |

### 9.2 Japanese (ja) — Search & Filter

| Key | Value |
| :--- | :--- |
| `search.title` | "商品検索" |
| `search.searchPlaceholder` | "商品名、説明、成分で検索..." |
| `search.searchButton` | "検索" |
| `search.clear` | "クリア" |
| `search.resultsCount` | "「{q}」の検索結果 {total}件" |
| `search.resultsCountDefault` | "全{total}件の商品" |
| `search.sort` | "並び順" |
| `search.sort.newest` | "新着順" |
| `search.sort.priceAsc` | "価格が安い順" |
| `search.sort.priceDesc` | "価格が高い順" |
| `search.sort.rating` | "評価が高い順" |
| `search.view` | "表示" |
| `search.view.grid` | "グリッド" |
| `search.view.list` | "リスト" |
| `search.view.gridLabel` | "グリッド表示に切り替え" |
| `search.view.listLabel` | "リスト表示に切り替え" |
| `search.filtersTitle` | "フィルタ" |
| `search.openFilters` | "フィルタを開く" |
| `search.categories` | "カテゴリ" |
| `search.skinType` | "肌タイプ" |
| `search.skinType.dry` | "乾燥肌" |
| `search.skinType.oily` | "脂性肌" |
| `search.skinType.combination` | "混合肌" |
| `search.skinType.sensitive` | "敏感肌" |
| `search.skinType.normal` | "普通肌" |
| `search.ingredients` | "成分" |
| `search.priceRange` | "価格帯" |
| `search.minPrice` | "最低価格" |
| `search.maxPrice` | "最高価格" |
| `search.rating` | "最低評価" |
| `search.applyFilters` | "フィルタを適用" |
| `search.resetFilters` | "フィルタをリセット" |
| `search.clearAllFilters` | "すべてクリア" |
| `search.pagination` | "ページネーション" |
| `search.pagination.previous` | "前へ" |
| `search.pagination.next` | "次へ" |
| `search.pageSize` | "1ページあたりの件数" |
| `search.empty.title` | "該当する商品がありません" |
| `search.empty.description` | "フィルタをクリアするか、キーワードを広げてください" |
| `search.chip.skinType` | "肌タイプ: {value}" |
| `search.chip.ingredient` | "成分: {value}" |
| `search.chip.category` | "カテゴリ: {value}" |
| `search.chip.priceRange` | "{min}〜{max}円" |
| `search.chip.rating` | "評価: {value}以上" |
| `search.errors.serverError` | "問題が発生しました。もう一度お試しください" |
| `search.errors.tooManyRequests` | "リクエストが多すぎます。{seconds}秒お待ちください" |
| `search.errors.retry` | "再試行" |
| `search.sponsored` | " sponsor" |
| `search.sponsored.label` | " sponsor広告" |
| `search.sponsored.panelLabel` | "スポンサー広告" |
| `search.sponsored.adAlt` | "広告: {title}" |
| `search.sponsored.slideStatus` | "スポンサー広告 {position} / {total}: {title}" |
| `search.errors.loginRequired` | "ログインしてください" |
| `search.errors.shoppingNotAllowed` | "買い物機能はバイヤーのみ利用できます" |


---

## 10. Shared Components

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/products/components/ProductCard.tsx` |
| **Purpose** | Displays a single product summary in the results grid |
| **Usage** | `cardProduct` in results grid; click navigates to `/products/:slug` |

### 10.2 FilterChips Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/search/components/FilterChips.tsx` |
| **Purpose** | Renders active filter tags/chips row from URL query params |
| **Usage** | `chipsActiveFilters`, `chipFilter`, `btnClearAllFilters` (BR-SEARCH-019 to 024) |

### 10.3 EmptyState Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/empty-state.tsx` |
| **Purpose** | Displays illustration + message when no products match |
| **Usage** | `pnlEmpty` with "Reset Filters" action |

### 10.4 Pagination Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/pagination.tsx` |
| **Purpose** | Renders previous/next + page number controls |
| **Usage** | `pgnPagination` with boundary state handling |

### 10.5 Skeleton Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/skeleton.tsx` |
| **Purpose** | Shimmer placeholder grid during fetch |
| **Usage** | `sklLoading` (lavender shimmer) |

### 10.6 Accordion / Checkbox / RadioGroup Components

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/components/ui/accordion.tsx`, `frontend/src/components/ui/checkbox.tsx`, `frontend/src/components/ui/radio-group.tsx` |
| **Usage** | Filter groups (`grpCategories`, `grpSkinType`, `grpIngredients`, `grpPriceRange`, `grpRating`), checkboxes, and star rating selector |

### 10.7 ViewToggle Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/search/components/ViewToggle.tsx` |
| **Purpose** | Renders the Grid/List view toggle and the product items in either a responsive grid (1–4 columns) or a stacked, mobile-friendly list |
| **Usage** | `tglViewMode`, `btnGridMode`, `btnListMode`; drives the layout of `gridProducts` / `cardProduct` / `sklLoading` |

### 10.8 SponsoredAdSlider Component

| Property | Value |
| :--- | :--- |
| **Location** | `frontend/src/features/search/components/SponsoredAdSlider.tsx` |
| **Purpose** | Slide-down sponsored advertisement panel: fetches eligible ads, renders the animated slide-down container (`slotAdTop`) — horizontally centered between the page header ([A]) and the search bar + filters row ([B]+[C]) across the full container width, with the search bar + filters rendered immediately below — and per-ad slide cards (image, title, description, CTA, Sponsored badge) with responsive horizontal/stacked layouts and 5-second auto-rotation |
| **Usage** | `slotAdTop` and sub-items `trackAdSlides`, `cardAdSlide`, `imgAdBanner`, `lblAdTitle`, `txtAdDescription`, `btnAdCta`, `badgeSponsored` (Sec 4.2 items 39–46, Sec 5.15) |

---

## 11. Special UI Notes & Styling Constraints (特記事項・UI仕様)

- **Design System:** Luxury Cosmetics Theme — Primary `#7C3AED` (Purple), Accent `#EC4899` (Pink), Secondary `#F3E8FF` (Lavender).
- **URL-State Single Source of Truth:** All search/filter/sort/page state persisted in URL query params (BR-SEARCH-003). Back-button and share-URL friendly.
- **Responsive Viewport Design:** Desktop: search bar + filters side-by-side in the same row, results below with 4-column grid; tablet: search bar + compact filters in the same row, 2–3 column results; mobile: search bar + filter trigger in the same row, filter drawer + 1–2 column results (Sec 3.2).
- **Accessibility:** Every control keyboard navigable. ARIA labels required. Drawer uses focus trap + `aria-modal`. Error messages announced via `role="alert"`. Chips announce removal.
- **View Mode Toggle:** Segmented Grid/List control in the results toolbar next to `selSort`. Grid renders the responsive 1–4 column card layout; List renders single-column stacked rows (thumbnail left, title/description/price right) optimized for narrow viewports — no horizontal scroll, long text truncated. Selection is device-independent, persisted to `localStorage` (`search.viewMode`), defaults to Grid, and is never serialized into the URL, so search/filter/sort/pagination state is unaffected.
- **View Toggle Accessibility:** `tglViewMode` renders as `role="group"` with a visible label; each segment is a focusable button with `aria-pressed` reflecting the active mode and an `aria-label` (i18n). Focus indicator uses the primary color ring. Operable by keyboard (Tab / Enter / Space; arrow-key navigation within the group) and by touch (targets ≥ 44px). Active mode changes announced to screen readers via `aria-live="polite"`.
- **Performance:** Skeleton shimmer grid during fetch; 300ms debounce on keyword input; TanStack Query caching; `keepPreviousData` on pagination. Cache-aside Redis pattern (list TTL 2 min, category tree TTL 30 min).
- **Security:** All user input sanitized (Prisma parameterized queries; React auto-escaping). Never log full response body. Rate limiting on public search.
- **Design Tokens:** Status badges use standard color mapping — success: `bg-green-100 text-green-800`, error: `bg-red-100 text-red-800`, warning: `bg-amber-100 text-amber-800`. Rating stars use Beauty Pink.
- **Guest Alert Modal (401):** When a guest (unauthenticated user) attempts a shopping action (add to cart/wishlist), display an alert modal with "Please log in to continue" message and an "OK" button. The modal must NOT auto-close. Clicking "OK" redirects to `/login?redirect=<encoded_current_path>`. The redirect preserves the user's search context after login.
- **Merchant/Admin Shopping Restriction (403):** When a Merchant or Admin user attempts a shopping action (add to cart/wishlist), display an alert banner with "Shopping features are only available to buyers" message. The banner does NOT auto-close. Merchant/Admin users are strictly prohibited from shopping features per DEVELOPMENT_RULES Section 5.4.
- **Sponsored Ad Slide-Down Panel:** `slotAdTop` renders horizontally centered between the page header ([A]) and the search bar + filters row ([B]+[C]) as a slide-down panel spanning the full container width — when eligible ads load it expands downward (height 0 → auto with translateY −100% → 0, 300ms ease-out, once per mount), smoothly pushing the search bar + filters row and all content below it down. Hidden entirely on ad fetch error or when no ads are eligible — no slide-down occurs. Ad fetch is independent of product results — never blocks or defers product loading.
- **Ad Slide Composition:** Every slide shows the ad's image/banner, title, description, CTA button, and the "Sponsored" badge together (REQUIREMENT_SPEC §5.3). Title truncated to 1 line; description clamped to 2 lines and hidden when absent. Slide transitions are vertical slide-down (500ms) on a 5-second interval (max 5 ads, tier priority + round-robin unchanged).
- **Ad Panel Responsiveness:** On all breakpoints the panel spans the full container width, horizontally centered between [A] and the [B]+[C] row, with [B]+[C] immediately below. Desktop/tablet (≥ 768px): horizontal slide — image 320×120 (`object-cover`) left, text block right, inline right-aligned CTA. Mobile (< 768px): stacked slide — full-width 16:9 image, title, description, full-width CTA below. Breakpoint switches are CSS-only: no refetch, no rotation reset.
- **Ad Panel Accessibility:** Container exposes `role="region"` + `aria-label` (`search.sponsored.panelLabel`). Auto-advancement pauses on hover and while keyboard focus is inside the panel, resuming on leave/blur (WCAG 2.2.2). Slide changes announced via `aria-live="polite"` using `search.sponsored.slideStatus`. Images carry descriptive `alt` from `search.sponsored.adAlt`. CTA is a focusable link with a visible primary focus ring; the whole-slide click area must not trap keyboard users. `prefers-reduced-motion: reduce` disables the entrance and slide transitions (instant swap; 5-second interval unchanged).
- **Guest Data Leakage:** Guest user search state (filters, keywords) must not persist across sessions. No shopping-related data (cart count, wishlist) exposed to guests.

---

## 12. Testing Checklist (テストチェックリスト)

### 12.1 Keyword Search Tests

- [ ] Keyword search returns partial (case-insensitive) matches
- [ ] Keyword matches name, short description, tags, and ingredients
- [ ] 300ms debounce fires only after typing idle
- [ ] Debounce timer resets on each keystroke
- [ ] Enter key fires query immediately
- [ ] Search button fires query immediately
- [ ] Clear search resets to default catalog
- [ ] Keyword > 255 chars rejected (VAL-SEARCH-001)
- [ ] URL `q` param updates correctly
- [ ] Results count text updates ("{total} products for '{q}'")

### 12.2 Filter Tests

- [ ] Category checkbox filters including descendants (BR-SEARCH-010)
- [ ] Skin type multi-select uses hasEvery semantics
- [ ] Ingredient multi-select uses hasSome semantics
- [ ] Min/max price bounds enforced
- [ ] Min price < 0 rejected (VAL-SEARCH-005)
- [ ] Max price < 0 rejected (VAL-SEARCH-006)
- [ ] Min price > max price rejected (VAL-SEARCH-007)
- [ ] Rating filter (1–5) applied (avg_rating >= rating)
- [ ] Any filter change resets page to 1 (BR-SEARCH-011)
- [ ] Apply Filters button applies selections
- [ ] Reset Filters clears all filters, keeps keyword
- [ ] Out-of-stock products still listed with `isInStock: false`

### 12.3 Sort & Pagination Tests

- [ ] Sort options: newest, price asc, price desc, rating
- [ ] Sort change resets page to 1
- [ ] Invalid sort/order rejected (VAL-SEARCH-009/010)
- [ ] Default limit is 20
- [ ] Page size options: 10 / 20 / 50
- [ ] Page size change resets page to 1
- [ ] Previous disabled on first page
- [ ] Next disabled on last page
- [ ] Page beyond range clamped to last page
- [ ] Page < 1 rejected (VAL-SEARCH-011)
- [ ] Limit > 100 rejected (VAL-SEARCH-012)

### 12.4 Active Filter Chips Tests

- [ ] Chips row hidden when no filters applied
- [ ] One chip per active filter value rendered
- [ ] Chip label format correct (e.g., "Skin Type: Dry", "$10–$50", "Rating: 4★+")
- [ ] Chip close (×) removes single filter value
- [ ] Chip removal resets page to 1
- [ ] "Clear all" removes all filters, keeps keyword
- [ ] Chips row placement correct on desktop and mobile

### 12.5 Responsive & State Tests

- [ ] Search bar + filters in the same row on desktop/tablet
- [ ] Filters drawer opens via trigger on mobile
- [ ] Desktop/tablet: ad panel above the search + filters row
- [ ] Mobile: ad panel above the search bar + filter trigger row
- [ ] Drawer applies/clears filter changes correctly
- [ ] Drawer close (X) dismisses without applying
- [ ] Loading skeleton shown during fetch
- [ ] Empty state shown when total = 0 (with Reset Filters)
- [ ] Error banner shown on 429/500 with retry button
- [ ] Retry refetches successfully
- [ ] Product card click navigates to `/products/:slug`
- [ ] Browser back button restores previous search state
- [ ] Language toggle switches all labels (EN/JA/MY)
- [ ] Theme toggle works
- [ ] Keyboard navigation works (Tab, Enter, Arrow)
- [ ] Screen readers announce errors and chip removal

### 12.6 View Mode Toggle Tests

- [ ] Default view is Grid on first visit (no stored preference)
- [ ] Grid view renders responsive 1–4 column layout (mobile 1–2 columns)
- [ ] List view renders stacked single-column rows (thumbnail left, details right)
- [ ] List view is mobile-friendly — no horizontal scroll; truncation applied to long titles/descriptions
- [ ] Switching views keeps search keyword unchanged
- [ ] Switching views keeps filters, sort, and page position unchanged
- [ ] Switching views does not trigger a refetch (no additional API call)
- [ ] No URL query params change when switching views
- [ ] Selected view persisted to `localStorage` (`search.viewMode`)
- [ ] View restored from `localStorage` on page reload
- [ ] Absent/invalid stored value falls back to Grid
- [ ] `aria-pressed` reflects the active segment
- [ ] Toggle keyboard operable (Tab to focus, Enter/Space to select, arrow keys within group)
- [ ] Focus ring (primary) visible on toggle segments
- [ ] Screen reader announces the active view mode
- [ ] Touch targets ≥ 44px on mobile

### 12.7 Sponsored Advertisement (Slide-Down Panel) Tests

- [ ] Ad slot fetched from `GET /api/v1/ads?placement=search_top`
- [ ] Ad slot rendered between the page header ([A]) and the search bar + filters row ([B]+[C]) in `slotAdTop`
- [ ] Panel horizontally centered across the full container width; not confined to the results area
- [ ] Search bar + filters row ([B]+[C]) renders immediately below the ad panel
- [ ] Panel slides down smoothly (300ms ease-out) when ads load, pushing the search bar + filters row and product results down
- [ ] Slide-down entrance runs once per mount (no replay on refetch/re-render)
- [ ] Each slide displays image/banner, title, description, and CTA together
- [ ] "Sponsored" label badge displayed on every slide (REQUIREMENT_SPEC §5.3)
- [ ] Description clamped to 2 lines; long titles truncated to 1 line
- [ ] Description hidden gracefully when absent (null/empty)
- [ ] Desktop/tablet (≥ 768px): horizontal slide layout — image left (320×120), text block right, inline CTA
- [ ] Mobile (< 768px): stacked slide layout — full-width 16:9 image, full-width CTA; search bar + filter trigger in same row below ad
- [ ] Breakpoint switch re-layouts slides without refetch and without resetting rotation
- [ ] Auto-slide advances every 5 seconds with vertical slide-down transition (unchanged)
- [ ] Maximum 5 ads enforced in the slider (unchanged)
- [ ] Tier priority (Premium > Standard > Basic, round-robin within tier) unchanged (BR-SEARCH-026)
- [ ] Auto-advancement pauses on hover and on keyboard focus inside the panel; resumes on leave/blur
- [ ] `prefers-reduced-motion: reduce` disables entrance/slide animations; interval unchanged
- [ ] Panel exposed as `role="region"` with i18n aria-label; slide changes announced via `aria-live="polite"`
- [ ] Ad images have descriptive alt text; CTA is keyboard-focusable with visible focus ring
- [ ] Ad slot failure (error/empty) gracefully hidden — no slide-down occurs; product results unaffected
- [ ] Ad slot cached in Redis (`cache:ads:search-top`, TTL 5 min)
- [ ] Ad CTA click triggers `ad.click` analytics event
- [ ] Ad slot independent of product results fetch (parallel, non-blocking)

### 12.8 Role-Based Access Tests

- [ ] Guest: search, browse, filter, sort, paginate work without authentication
- [ ] Guest: shopping action (add to cart/wishlist) triggers alert modal (no auto-close)
- [ ] Guest: alert modal "OK" button redirects to `/login?redirect=<encoded_path>`
- [ ] Guest: no shopping-related data (cart count, wishlist) exposed
- [ ] Buyer: search and shopping actions both work
- [ ] Merchant: search works; shopping action returns 403 `SHOPPING_NOT_ALLOWED`
- [ ] Merchant: alert banner "Shopping features are only available to buyers" displayed
- [ ] Admin: search works; shopping action returns 403 `SHOPPING_NOT_ALLOWED`
- [ ] Admin: alert banner displayed, does not auto-close

### 12.9 My Language Tests

- [ ] Language toggle switches to Myanmar (my) labels
- [ ] All Myanmar translations render correctly (search.title, filters, chips, errors)
- [ ] Sponsored ad i18n keys render in Myanmar
- [ ] Guest/merchant/admin error messages render in Myanmar

---

*End of Screen Items Specification (Search & Filter Page)*

