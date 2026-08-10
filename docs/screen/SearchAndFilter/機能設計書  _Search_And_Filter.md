# Functional Specification (機能設計書) — Search & Filter Page

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-FDS-SEARCH-001 |
| **Target Screen** | Search & Filter Page (検索・フィルタページ) |
| **Subsystem** | Buyer Module — Product Search, Filtering, Sorting & Pagination |
| **Function ID** | FN-SEARCH-001 |
| **Version** | 2.0 |
| **Created** | 2026-08-05 |
| **Last Updated** | 2026-08-07 |
| **Author** | Software Architect |
| **Status** | Released (承認済み) |
| **Classification** | Internal — Engineering Division |

---

## Document Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-08-05 | Software Architect | Initial functional specification for the Search and Filter page covering API endpoints, query parameters, frontend design, database operations, caching, error handling, and testing strategy. |
| 2.0 | 2026-08-07 | Software Architect | Restructured to fully conform to the standard functional specification template, integrating detailed specifications from Requirement, Database, and Development Rules documents and aligning with the Sign-up/Login and Wishlist/Cart functional specification format. |

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

---

## 1. Functional Overview

### 1.1 Purpose and Scope

This screen serves as the discovery and exploration entry point within the Cosmetics Finder platform. The Search and Filter subsystem provides the complete set of capabilities necessary for buyers to locate skincare products by keyword, browse the hierarchical category tree, apply multi-dimensional filters (skin type, ingredients, price range, minimum rating), sort results, and paginate through the catalog.

This subsystem bridges product browsing and product detail. It is responsible for ensuring that only properly validated, active products from approved merchant shops are surfaced to buyers, while maintaining performance through Redis list caching and URL-state-driven frontend navigation that is shareable and back-button friendly.

### 1.2 Functional Responsibilities

This screen is responsible for the following core functional areas:

1. **Keyword Search** — Enabling buyers to search products by keyword with partial (case-insensitive) matching on name, short description, tags, and ingredients.
2. **Category Browsing** — Enabling buyers to navigate a nested category tree and filter by a category including all of its descendant categories.
3. **Multi-Dimensional Filtering** — Enabling buyers to filter products by skin type, ingredients, price range, and minimum review rating.
4. **Sorting** — Enabling buyers to sort results by price, average rating, or newest.
5. **Pagination** — Enabling buyers to page through results (default 20 per page, maximum 100).
6. **Product Discovery** — Presenting active, merchant-approved, in-stock-or-out-of-stock-flagged product cards that link to product detail.
7. **URL-State Navigation** — Persisting all search/filter/sort/page state in URL query parameters as the single source of truth.
8. **Caching** — Serving repeat searches and the category tree from Redis to meet performance targets.

### 1.3 Target Users

| Attribute | Value |
|-----------|-------|
| **Primary Actor** | Visitor (unauthenticated) and Buyer (authenticated) |
| **Required Authentication** | None (public endpoints) |
| **Data Scope** | Global product catalog (active products from approved merchant shops) |
| **Guest Behavior** | Full search, browse, filter, sort, and pagination are available without authentication. Product detail (from result click) is also public. |

### 1.4 Relationships with Other Functions and Peripheral Systems

```text
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Buyer / Visitor        │      │     products / categories           │
│   (Searches & Filters)   ├─────►│  SELECT active, approved products   │
└──────────────────────────┘      └──────────────┬──────────────────────┘
                                                 │ Reads/Writes
                                                 ▼
                                       ┌────────────────────────┐
                                       │  Search & Filter       │
                                       │  Service Layer         │
                                       └──────────┬─────────────┘
                                                  │ Cache-Aside
                                                  ▼
┌──────────────────────────┐      ┌─────────────────────────────────────┐
│   Product Detail Page    │      │     Redis (List / Category Cache)   │
│   (/products/:slug)      │◄─────┤  Serves repeat queries & tree       │
└──────────────────────────┘      └─────────────────────────────────────┘
```

### 1.5 Inputs / Outputs

| Input Information | Data Category | Source / Description |
|-------------------|---------------|----------------------|
| `q` | Query Parameter | Keyword for partial matching search |
| `categoryId` | Query Parameter | Category filter (includes descendants) |
| `skinTypes` | Query Parameter | Skin type filter (comma-separated) |
| `ingredients` | Query Parameter | Ingredient filter (comma-separated) |
| `tags` | Query Parameter | Product tag filter (comma-separated) |
| `minPrice` | Query Parameter | Lower price bound |
| `maxPrice` | Query Parameter | Upper price bound |
| `rating` | Query Parameter | Minimum average rating (1–5) |
| `sort` | Query Parameter | Sort field (`price`, `rating`, `createdAt`) |
| `order` | Query Parameter | Sort direction (`asc`, `desc`) |
| `page` | Query Parameter | Page number (1-indexed) |
| `limit` | Query Parameter | Items per page (max 100) |

| Output Information | Data Category | Destination / Description |
|--------------------|---------------|---------------------------|
| `data` | Product Summary DTO Array | Paginated list of matching product summaries |
| `meta` | Pagination Meta DTO | `page`, `limit`, `total`, `totalPages` |
| `data` (tree) | Category Node DTO Array | Nested category tree for navigation |
| `data` (detail) | Product Detail DTO | Full product data (from result click) |

### 1.6 Related Documents

| No. | Document ID | Document Name | File Path / Reference | Remarks |
|-----|-------------|---------------|----------------------|---------|
| 1 | SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business workflow logic, required fields (B-SEARCH-*, B-MATCH-*), and rules (Rule 4.2.1, 4.2.2). |
| 2 | SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Table structures (`products`, `categories`, `shops`), indexes. |
| 3 | SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Security rules (Section 12.2), design tokens (Sections 9.1–9.6), API standards (8.3), performance standards (10.3). |

---

## 2. Use Cases and Business Workflow

### 2.1 Use Case Catalog

| UC-ID | Use Case Name | Precondition | Postcondition | Triggering Actor |
|-------|---------------|--------------|---------------|------------------|
| UC-SEARCH-001 | Search Products by Keyword | Catalog exists with active products. | Product list filtered by keyword partial match, results displayed. | Visitor / Buyer |
| UC-SEARCH-002 | Browse Products by Category | Category tree loaded. | Products belonging to the category (including descendants) displayed. | Visitor / Buyer |
| UC-SEARCH-003 | Filter by Skin Type | Search results displayed. | Results narrowed to products compatible with selected skin types. | Visitor / Buyer |
| UC-SEARCH-004 | Filter by Ingredients | Search results displayed. | Results narrowed to products containing any selected ingredient. | Visitor / Buyer |
| UC-SEARCH-005 | Filter by Price Range | Search results displayed. | Results narrowed to products within the min/max price bounds. | Visitor / Buyer |
| UC-SEARCH-006 | Filter by Minimum Rating | Search results displayed. | Results narrowed to products with `avg_rating >= rating`. | Visitor / Buyer |
| UC-SEARCH-007 | Sort Results | Search results displayed. | Results re-ordered by price, rating, or newest. | Visitor / Buyer |
| UC-SEARCH-008 | Paginate Results | Search results displayed. | Next/previous page of results loaded with accurate meta. | Visitor / Buyer |
| UC-SEARCH-009 | View Product Detail from Results | Search results displayed. | Buyer navigates to `/products/:slug`. | Visitor / Buyer |
| UC-CATEGORY-001 | Load Category Tree | — | Nested category tree fetched and rendered in filter panel. | Visitor / Buyer |

### 2.2 Primary Business Workflow

```
                     ┌──────────────────────┐
                     │  Buyer / Visitor     │
                     │  Arrives at /products│
                     └───────────┬──────────┘
                                 │
                                 ▼
                   ┌─────────────────────────────┐
                   │  Search & Filter Page       │
                   │  (Keyword, Category, Sort,  │
                   │   Filters, Pagination)      │
                   └──────────┬──────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐
     │ Keyword      │ │ Category     │ │ Filter / Sort /      │
     │ Input        │ │ Checkbox     │ │ Pagination Change    │
     └──────┬───────┘ └──────┬───────┘ └──────────┬───────────┘
            │                │                    │
            ▼                ▼                    ▼
     ┌──────────────────────────────────────────────────────┐
     │      Update URL Query Parameters (single source)     │
     │  q, categoryId, skinTypes, minPrice, maxPrice,       │
     │  rating, sort, order, page (debounce 300ms for q)    │
     └──────────────────┬───────────────────────────────────┘
                        │
                        ▼
     ┌──────────────────────────────────────────────────────┐
     │      GET /api/v1/products?{params}                   │
     │  SearchService.searchProducts(query)                 │
     └──────────────────┬───────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        ┌──────────────┐    ┌──────────────────────┐
        │ Redis HIT    │    │ Redis MISS →         │
        │ (≤200ms)     │    │ PostgreSQL WHERE     │
        └──────┬───────┘    │ is_active + approved │
               │            │ shop + filters       │
               │            └──────────┬───────────┘
               │                       │
               │                       ▼
               │            ┌──────────────────────┐
               │            │ findMany + count     │
               │            │ Serialize Decimal →  │
               │            │ Seed Redis (TTL 2m)  │
               │            └──────────┬───────────┘
               │                       │
               └───────────┬───────────┘
                           ▼
              ┌────────────────────────────┐
              │  SUCCESS                   │
              │  (200, { data, meta })     │
              └────────────┬───────────────┘
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
        ┌────────────────┐     ┌──────────────────┐
        │ Render Product │     │ FAILURE          │
        │ Grid + Meta    │     │ (400/429/500)    │
        └────────────────┘     └────────┬─────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ Display Error│
                                 │ / Retry      │
                                 └──────────────┘
```

### 2.3 Workflow Critical Path Summary

| Step | Action | Status Before | Status After | Assigned To |
|:----:|--------|---------------|--------------|-------------|
| 1 | Buyer navigates to /products (or /search) | — | Search page displayed | System |
| 2 | Buyer types keyword / selects filter / changes sort | Default list | URL params updated | Visitor |
| 3 | Frontend builds query and calls GET /api/v1/products | URL params valid | Query in-flight (skeleton) | System |
| 4 | Backend checks Redis cache | — | HIT (return cached) or MISS (query DB) | System |
| 5 | Backend builds Prisma WHERE (active + approved shop + filters) | — | Filtered result set | System |
| 6 | Backend returns { data, meta } with Decimal as string | Query executed | 200 response | System |
| 7 | Frontend renders product grid, count, pagination | Data received | Results displayed | System |
| 8 | Buyer clicks product card | Results displayed | Navigates to /products/:slug | Visitor |

### 2.4 Relevant Requirements Covered

| Requirement ID | Requirement Summary |
|----------------|---------------------|
| B-SEARCH-001 | User can search products by keyword |
| B-SEARCH-002 | User can browse products by category |
| B-SEARCH-003 | User can sort by price, rating, newest |
| B-SEARCH-004 | Results are paginated (default 20 per page) |
| B-SEARCH-005 | Search supports partial matching |
| B-SEARCH-006 | Category tree supports nested navigation |
| B-MATCH-002 | User can filter products by skin type |
| B-MATCH-003 | User can filter products by ingredients |
| B-MATCH-004 | User can filter products by price range |
| B-MATCH-005 | User can filter products by review rating |

---

## 3. State Transition Specification

### 3.1 Search UI Session States

| State | Description | Results Displayed | Actions Available |
|-------|-------------|:-----------------:|-------------------|
| `IDLE` | Page loaded, no query in-flight | ✓ (default catalog) | Search, filter, sort, paginate |
| `LOADING` | Query in-flight | Skeleton grid | New query (replaces in-flight) |
| `SUCCESS` | Query returned successfully | ✓ | Sort, filter, paginate, view detail |
| `EMPTY` | Query returned zero matches | Empty state | Reset filters, broaden keyword |
| `ERROR` | Query failed (network/5xx) | Error banner | Retry |

### 3.2 Query Lifecycle Transitions

| Transition ID | Origin State | Target State | Trigger Action | Guard Conditions |
|---------------|--------------|--------------|----------------|------------------|
| TR-SEARCH-01 | `IDLE` | `LOADING` | Keyword input after 300ms debounce (Sec 3.4) or filter/sort/page change | Valid URL params |
| TR-SEARCH-02 | `LOADING` | `SUCCESS` | Fetch resolves 200 | Data returned |
| TR-SEARCH-03 | `LOADING` | `EMPTY` | Fetch resolves with `total = 0` | No matching products |
| TR-SEARCH-04 | `LOADING` | `ERROR` | Fetch rejects (network/4xx/5xx) | Error response |
| TR-SEARCH-05 | `SUCCESS` | `LOADING` | Filter/sort/page changed | Params changed |
| TR-SEARCH-06 | `EMPTY` | `LOADING` | Filters reset or new keyword | Params changed |
| TR-SEARCH-07 | `ERROR` | `LOADING` | Retry clicked | — |

### 3.3 Pagination Boundary States

| State | Description | Behavior |
|-------|-------------|----------|
| `FIRST_PAGE` | `page = 1` | Previous button disabled |
| `MID_PAGES` | `1 < page < totalPages` | Both navigation buttons enabled |
| `LAST_PAGE` | `page = totalPages` | Next button disabled |
| `PAGE_BEYOND_RANGE` | `page > totalPages` | Clamped to last page or empty state |

### 3.4 Search Input Debounce Rule


| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| ST-DEB-001 | Debounced Keyword Trigger | Typing in the search bar does NOT issue an API call per keystroke. The search request fires only after 300ms (0.3s) of typing inactivity, submitting the final keyword value. | Frontend (debounce util) |
| ST-DEB-002 | Debounce Timer Reset | Each keystroke within the 300ms window resets the debounce timer; the query is triggered only after 300ms of uninterrupted idle. | Frontend (debounce util) |
| ST-DEB-003 | Immediate Action Bypass | Debounce applies to typing only; the Search button (EL-03), Clear Search (EL-04), and filter/sort/page changes fire immediately without waiting. | Frontend (event handlers) |
| ST-DEB-004 | Supersede In-Flight Query | If a debounced query fires while a previous request is still in-flight, the previous request is cancelled/ignored; only the latest state renders. | Frontend (TanStack Query) |
| ST-DEB-005 | `LOADING` at Fire Time | The `IDLE` → `LOADING` transition occurs when the debounced query actually fires (after 300ms idle), not during the typing window. | Frontend (state machine) |

---

## 4. Business Rules

### 4.1 Search Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SEARCH-001 | Partial Keyword Matching | Keyword matches `name`, `short_description`, `tags`, or `ingredients` (case-insensitive, OR semantics). | Backend (Prisma `contains`) |
| BR-SEARCH-002 | Keyword Length Limit | Keyword must not exceed 255 characters. | Backend (DTO validation) + Frontend (Zod schema) |
| BR-SEARCH-003 | URL Single Source of Truth | All search state (q, filters, sort, page) is persisted in URL query parameters; never React Context. | Frontend (`useSearchParams`) |
| BR-SEARCH-004 | Search Debounce | Keyword input updates the URL/query after 300ms debounce. | Frontend (debounce util) |
| BR-SEARCH-005 | Cache-Aside Pattern | Redis checked first → miss → query DB → seed Redis. TTL must always be set. Never cache sensitive data. | Backend (search service) |

### 4.2 Filter Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SEARCH-006 | Skin Type Matching | `skinTypes` filter uses `hasEvery` semantics on the `skin_types` array. | Backend (Prisma `hasEvery`) |
| BR-SEARCH-007 | Ingredient Matching | `ingredients` filter uses `hasSome` semantics on the `ingredients` array. | Backend (Prisma `hasSome`) |
| BR-SEARCH-008 | Price Range Bounds | `price >= minPrice` and `price <= maxPrice`; both bounds must be ≥ 0. | Backend (DTO + Prisma) |
| BR-SEARCH-009 | Rating Filter | `avg_rating >= rating`; rating must be 1–5. | Backend (DTO + Prisma) |
| BR-SEARCH-010 | Category Subtree | Filtering by `categoryId` includes all descendant categories (recursive parent/child lookup). | Backend (service logic) |
| BR-SEARCH-011 | Page Reset on Change | Any filter or sort change resets `page` to 1. | Frontend (updateParams) |

### 4.3 Visibility Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SEARCH-012 | Active Products Only | Only `is_active = true` products appear in search results (Rule 4.2.1). | Backend (Prisma WHERE) |
| BR-SEARCH-013 | Approved Shop Only | Products from unapproved merchant shops (`shops.is_approved = false`) are NOT visible to buyers (Section 12.2 of Development Rules). | Backend (Prisma join) |
| BR-SEARCH-014 | Out-of-Stock Still Listed | Out-of-stock products remain listed but are flagged `isInStock: false` (Rule 4.2.2). | Backend (serialization) |

### 4.4 Pagination & Sorting Rules

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SEARCH-015 | Sort Allowlist | `sort` ∈ {`price`, `rating`, `createdAt`}; `order` ∈ {`asc`, `desc`}; default `createdAt desc`. | Backend (DTO validation) |
| BR-SEARCH-016 | Pagination Defaults | `page` defaults to 1; `limit` defaults to 20; `limit` maximum 100. | Backend (DTO defaults) |
| BR-SEARCH-017 | Result Counting | `total` counts the full match set ignoring pagination (`skip`/`take`). | Backend (Prisma `count`) |
| BR-SEARCH-018 | Decimal Serialization | `price` and `compare_at_price` serialized as strings (API Standard 8.3). | Backend (serializer) |

### 4.5 Active Filter Chips Specifications

| Rule ID | Rule Name | Description | Enforcement Layer |
|---------|-----------|-------------|-------------------|
| BR-SEARCH-019 | Active Filter Chips Rendering | When filters are applied (e.g., Skin Type: Dry, Price: $10–$50, Rating: 4★+), the UI must render an Active Filter Tags/Chips row that clearly shows each active filter at a glance. | Frontend (FilterChips component) |
| BR-SEARCH-020 | Chip Data Source | Chips are derived from URL query parameters (`categoryId`, `skinTypes`, `ingredients`, `tags`, `minPrice`, `maxPrice`, `rating`) as the single source of truth (BR-SEARCH-003). | Frontend (`useSearchParams`) |
| BR-SEARCH-021 | Chip Label Format | Each chip displays a human-readable label (e.g., "Skin Type: Dry", "$10–$50", "Rating: 4★+"); multi-value filters render one chip per selected value. | Frontend (label mapping) |
| BR-SEARCH-022 | Individual Chip Removal | Clicking a chip's close (×) icon removes that single filter value, updates the URL params, resets `page` to 1 (BR-SEARCH-011), and refetches. | Frontend (event handler) |
| BR-SEARCH-023 | Bulk Chip Removal | A "Clear All" action on the chips row removes all active filters at once while keeping the keyword (`q`) intact, then refetches the default result set. | Frontend (event handler) |
| BR-SEARCH-024 | Chip Responsive Placement | The chips row renders above the results on desktop and above the results inside the filters drawer/header on mobile. | Frontend (responsive layout) |

---

## 5. Screen Specifications

### 5.1 Screen: Search & Filter Page (`/products`, `/search`)

**Purpose:** Allow buyers to discover skincare products through keyword search, category browsing, multi-dimensional filtering, sorting, and pagination.

#### 5.1.1 UI Elements

**Search & Filter View:**

| Element ID | Element Name | Element Type | i18n Key | Required | Description |
|------------|--------------|--------------|----------|:--------:|-------------|
| EL-01 | Page Title | Heading (h1) | `search.title` | Yes | "Search Products" / "商品検索" |
| EL-02 | Search Input | Input (search) | `search.searchPlaceholder` | No | Keyword input with 300ms debounce |
| EL-03 | Search Button | Button (icon, primary) | `search.searchButton` | Yes | Submit keyword search immediately |
| EL-04 | Clear Search | Button (ghost/icon) | `search.clear` | No | Clear keyword and reset to default list |
| EL-05 | Results Count | Text | `search.resultsCount` | Yes | "{total} products for '{q}'" |
| EL-06 | Sort Select | Select | `search.sort` | No | Dropdown: newest, price asc, price desc, rating |
| EL-07 | Filters Panel | Aside (sidebar/drawer) | `search.filtersTitle` | Yes | Container for all filter groups |
| EL-08 | Category Group | Accordion | `search.categories` | No | Nested category checkboxes (tree) |
| EL-09 | Category Checkbox | Checkbox | — | No | Toggle category (includes descendants) |
| EL-10 | Skin Type Group | Accordion | `search.skinType` | No | Skin type filter group |
| EL-11 | Skin Type Checkbox | Checkbox | — | No | dry / oily / combination / sensitive / normal |
| EL-12 | Ingredients Group | Accordion | `search.ingredients` | No | Ingredient filter group |
| EL-13 | Ingredient Checkbox | Checkbox | — | No | Toggle ingredient match (hasSome) |
| EL-14 | Price Range Group | Accordion | `search.priceRange` | No | Min/max price inputs |
| EL-15 | Min Price Input | Input (number) | `search.minPrice` | No | Lower price bound |
| EL-16 | Max Price Input | Input (number) | `search.maxPrice` | No | Upper price bound |
| EL-17 | Rating Group | Accordion | `search.rating` | No | Minimum rating selector |
| EL-18 | Rating Selector | Star radio | — | No | 1–5 star minimum rating (Beauty Pink) |
| EL-19 | Apply Filters Button | Button (primary) | `search.applyFilters` | Yes | Apply current filter selections |
| EL-20 | Reset Filters Button | Button (outline) | `search.resetFilters` | No | Clear all filters, keep keyword |
| EL-21 | Product Grid | Grid | — | Yes | Responsive product grid |
| EL-22 | Product Card | Card | — | Yes | Reused `ProductCard` component |
| EL-23 | Pagination | Pagination | `search.pagination` | No | Previous/next + page numbers |
| EL-24 | Page Size Select | Select | `search.pageSize` | No | 10 / 20 / 50 items per page |
| EL-25 | Loading Skeleton | Skeleton | — | Conditional | Shimmer placeholders (lavender) during fetch |
| EL-26 | Empty State | EmptyState | `search.empty` | Conditional | "No products found" + Reset Filters button |
| EL-27 | Error Banner | Alert | `search.errors.serverError` | Conditional | Inline error with retry button |
| EL-28 | Mobile Filter Trigger | Button (icon) | `search.openFilters` | Conditional | Opens filters drawer on mobile |

**Default State:**
- Search input empty; default catalog shown sorted by newest (createdAt desc)
- Filter groups collapsed; filters sidebar on desktop, drawer on mobile
- 20 products per page (page size select available)
- Skeleton grid shown during initial fetch
- Empty state shown when no products match the active query

---

## 6. Functional Operation Specification

### 6.1 Operation: Search Products

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Keyword input (after debounce), filter/sort/page change, or page load |
| **API Endpoint** | `GET /api/v1/products` |
| **Request Content-Type** | Query parameters only |
| **Pre-Submission Validation** | URL params parsed and validated with Zod (`searchParamsSchema`); backend DTO validated via ValidationPipe |
| **Processing Steps** | 1. Validate `ProductQueryDto` (whitelist + forbidNonWhitelisted). 2. Redis lookup `cache:products:list:{hashOfQuery}`. 3. HIT → return cached JSON (TTL 2 min). 4. MISS → build Prisma WHERE clause (is_active, approved shop, q, category subtree, skinTypes `hasEvery`, ingredients `hasSome`, price range, rating). 5. Apply sort/order (idx_products_price, idx_products_created_at). 6. Apply skip/take pagination. 7. Run `findMany` + `count` in a transaction. 8. Serialize Decimal price as string. 9. Seed Redis (2 min TTL). 10. Return `{ data, meta }`. |
| **Success Response** | 200 OK with `{ data: ProductSummary[], meta }` |
| **Post-Action** | Render product grid, result count, and pagination |



### 6.2 Operation: Browse Category Tree

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Search page load |
| **API Endpoint** | `GET /api/v1/categories` |
| **Request Content-Type** | None |
| **Pre-Submission Validation** | None (public) |
| **Processing Steps** | 1. Redis lookup `cache:categories`. 2. HIT → return cached tree (TTL 30 min). 3. MISS → `prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })`. 4. Build tree from `parent_id` self-reference. 5. Seed Redis (30 min TTL). 6. Return `{ data: tree }`. |
| **Success Response** | 200 OK with `{ data: CategoryNode[] }` |
| **Post-Action** | Render nested category checkboxes in the filter panel |

### 6.3 Operation: Apply Filters

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Checkbox/input change in FilterPanel, or "Apply Filters" button |
| **API Endpoint** | None (frontend URL state only) — combined with Search Products (Sec 6.1) |
| **Request Content-Type** | URL query parameters |
| **Pre-Submission Validation** | `searchParamsSchema` parse (Zod) |
| **Processing Steps** | 1. Collect changed filters (skinTypes, ingredients, minPrice, maxPrice, rating, categoryId). 2. Merge into current params with `page: 1` (BR-SEARCH-011). 3. `setSearchParams(toQueryString(...))`. 4. TanStack Query refetches with new key. 5. Grid updates (skeleton during fetch). |
| **Success Response** | — |
| **Post-Action** | Updated result count and grid |

### 6.4 Operation: Sort Results

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Sort select or order toggle in the results header |
| **API Endpoint** | None (URL state) — combined with Search Products (Sec 6.1) |
| **Request Content-Type** | URL query parameters |
| **Pre-Submission Validation** | `sort` ∈ {price, rating, createdAt}, `order` ∈ {asc, desc} |
| **Processing Steps** | 1. Update `sort`/`order` params with `page: 1`. 2. Refetch via TanStack Query. 3. Re-render grid in new order. |
| **Success Response** | — |
| **Post-Action** | Re-ordered results with updated meta |

### 6.5 Operation: Navigate Pagination

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Page number click, previous/next, or page size change |
| **API Endpoint** | None (URL state) — combined with Search Products (Sec 6.1) |
| **Request Content-Type** | URL query parameters |
| **Pre-Submission Validation** | `page >= 1`, `limit` 1–100 |
| **Processing Steps** | 1. Update `page` (or `limit` + reset page to 1). 2. Refetch via TanStack Query. 3. Render new page of results. 4. Clamp `page > totalPages` (Sec 3.3). |
| **Success Response** | — |
| **Post-Action** | Updated grid + pagination control state |

### 6.6 Operation: View Product Detail

| Attribute | Specification |
|-----------|---------------|
| **Trigger** | Click product card image or name in results |
| **API Endpoint** | `GET /api/v1/products/:slug` |
| **Request Content-Type** | Path parameter |
| **Pre-Submission Validation** | Valid slug |
| **Processing Steps** | 1. Navigate to `/products/:slug`. 2. Product detail page fetches by slug (is_active + approved shop enforced). 3. URL of previous search preserved via query params for back-button restore. |
| **Success Response** | 200 OK with product detail DTO |
| **Post-Action** | Render Product Detail page |

---

## 7. Input / Output Specification

### 7.1 Input Specification — Search Query (入力定義)

| Field | Display Name (EN) | Display Name (JA) | Data Type & Length | Required | Validation |
|-------|-------------------|-------------------|-------------------|:--------:|------------|
| `q` | Keyword | キーワード | VARCHAR(255) | No | `@IsOptional()`, `@MaxLength(255)` |
| `categoryId` | Category | カテゴリ | VARCHAR(25) | No | `@IsOptional()`, CUID format |
| `skinTypes` | Skin Type | 肌タイプ | TEXT[] (comma-separated) | No | `@IsOptional()`, enum: dry/oily/combination/sensitive/normal |
| `ingredients` | Ingredients | 成分 | TEXT[] (comma-separated) | No | `@IsOptional()`, `@IsArray()` |
| `tags` | Tags | タグ | TEXT[] (comma-separated) | No | `@IsOptional()` |
| `minPrice` | Minimum Price | 最低価格 | NUMERIC(10,2) | No | `@IsOptional()`, `@Min(0)` |
| `maxPrice` | Maximum Price | 最高価格 | NUMERIC(10,2) | No | `@IsOptional()`, `@Min(0)` |
| `rating` | Minimum Rating | 最低評価 | NUMERIC(3,2) | No | `@IsOptional()`, `@Min(1)`, `@Max(5)` |
| `sort` | Sort Field | 並び順項目 | ENUM | No (default: `createdAt`) | `@IsIn(['price', 'rating', 'createdAt'])` |
| `order` | Sort Direction | 並び順 | ENUM | No (default: `desc`) | `@IsIn(['asc', 'desc'])` |
| `page` | Page | ページ | INTEGER | No (default: 1) | `@IsOptional()`, `@Min(1)` |
| `limit` | Items Per Page | 1ページあたりの件数 | INTEGER | No (default: 20) | `@IsOptional()`, `@Min(1)`, `@Max(100)` |

**Request Example:**

```
GET /api/v1/products?q=cleanser&skinTypes=oily&minPrice=10&maxPrice=50&rating=4&sort=price&order=asc&page=1&limit=20
```

### 7.2 Output Specification — Product Summary (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `products.id` | CUID string |
| `name` | `products.name` | String |
| `slug` | `products.slug` | URL-friendly string |
| `shortDescription` | `products.short_description` | String |
| `price` | `products.price` | Decimal serialized as string |
| `compareAtPrice` | `products.compare_at_price` | Decimal string or null |
| `images` | `products.images` | Array of URL strings |
| `skinTypes` | `products.skin_types` | Array of skin type enums |
| `tags` | `products.tags` | Array of strings |
| `avgRating` | `products.avg_rating` | Decimal string |
| `reviewCount` | `products.review_count` | Integer |
| `isInStock` | `products.stock_quantity > 0` | Boolean |
| `category` | `categories` | `{ id, name, slug }` object |

**Response Example:**

```json
{
  "data": [
    {
      "id": "clx1234567890",
      "name": "Gentle Foaming Cleanser",
      "slug": "gentle-foaming-cleanser",
      "shortDescription": "pH-balanced cleanser for oily skin",
      "price": "29.99",
      "compareAtPrice": "39.99",
      "images": ["https://cdn.example.com/products/clx1234567890/main.webp"],
      "skinTypes": ["oily", "combination"],
      "tags": ["cleanser", "fragrance-free"],
      "avgRating": "4.5",
      "reviewCount": 128,
      "isInStock": true,
      "category": { "id": "clxcat001", "name": "Cleansers", "slug": "cleansers" }
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

### 7.3 Output Specification — Search Meta (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `page` | Requested page number | Integer |
| `limit` | Requested items per page | Integer |
| `total` | `prisma.product.count({ where })` | Integer |
| `totalPages` | `Math.ceil(total / limit)` | Integer |

### 7.4 Output Specification — Category Node (出力定義)

| Field | Data Source | Display Format |
|-------|-------------|----------------|
| `id` | `categories.id` | CUID string |
| `name` | `categories.name` | String |
| `slug` | `categories.slug` | URL-friendly string |
| `iconUrl` | `categories.icon_url` | URL string or null |
| `sortOrder` | `categories.sort_order` | Integer |
| `children` | Recursive `parent_id` build | Array of Category Node DTOs |

---

## 8. Input Validation Rules

### 8.1 Search Query Validation (Strict Mode)

| Field | Validation Rule | Error Message (EN) | Error Message (JA) |
|-------|-----------------|--------------------|--------------------|
| `q` | Optional, max 255 chars | "Keyword must be 255 characters or fewer" | "キーワードは255文字以内である必要があります" |
| `categoryId` | Optional, valid CUID format | "Invalid category ID" | "無効なカテゴリIDです" |
| `skinTypes` | Optional, valid enum values | "Invalid skin type" | "無効な肌タイプです" |
| `ingredients` | Optional, array of strings | "Invalid ingredients" | "無効な成分です" |
| `minPrice` | Optional, ≥ 0 | "Minimum price must be 0 or more" | "最低価格は0以上である必要があります" |
| `maxPrice` | Optional, ≥ 0 | "Maximum price must be 0 or more" | "最高価格は0以上である必要があります" |
| `rating` | Optional, 1–5 | "Rating must be between 1 and 5" | "評価は1〜5の間である必要があります" |
| `sort` | Optional, price/rating/createdAt | "Invalid sort field" | "無効な並び順項目です" |
| `order` | Optional, asc/desc | "Invalid sort direction" | "無効な並び順です" |
| `page` | Optional, ≥ 1 | "Page must be at least 1" | "ページは1以上である必要があります" |
| `limit` | Optional, 1–100 | "Limit must be between 1 and 100" | "件数は1〜100の間である必要があります" |

### 8.2 Validation Enforcement Layers

1. **Frontend (Client)**: `searchParamsSchema` (Zod) parse + coercion of URL query parameters, with `z.coerce.number()` for numeric fields.
2. **Backend (Server)**: NestJS ValidationPipe + class-validator DTOs on `GET /api/v1/products` (whitelist + forbidNonWhitelisted).
3. **Database (DB)**: Prisma indexes and CHECK constraints (e.g., `chk_products_price`, `chk_products_stock`) as final safety net.

---

## 9. Error Handling Specification

### 9.1 Error Response Structure

```json
{
  "statusCode": 400,
  "message": ["limit must not be greater than 100", "rating must not be greater than 5"],
  "error": "Bad Request",
  "timestamp": "2026-08-05T12:00:00.000Z",
  "path": "/api/v1/products"
}
```

### 9.2 Error Classification Table — Search

| HTTP Status | Error Code | Scenario | User-Facing Behavior |
|-------------|------------|----------|---------------------|
| `400` | `BAD_REQUEST` | Validation failures (invalid params) | Inline validation hint + top banner |
| `401` | `UNAUTHORIZED` | Missing/invalid token on protected action | Redirect to login |
| `403` | `FORBIDDEN` | Access denied | Redirect to login |
| `404` | `NOT_FOUND` | Product detail not found (invalid slug) | Empty state / "Product not found" |
| `429` | `TOO_MANY_REQUESTS` | Rate limit exceeded on public search | "Too many requests. Please wait" + retry countdown |
| `500` | `INTERNAL_SERVER_ERROR` | Server error | "Something went wrong" + retry button |

### 9.3 Frontend Error Display Behavior

- **Field-Level Validation**: Red border and inline text below invalid filter input (e.g., minPrice > maxPrice).
- **Form-Level Summary**: Alert banner at top of results area listing all errors.
- **Loading States**: Skeleton shimmer grid (shadcn `Skeleton`) during fetch; spinner on Apply/Search buttons.
- **Empty Results**: `EmptyState` component with message + illustration and "Reset Filters" button; suggestion to clear filters or broaden keyword.
- **Retry**: TanStack Query `error` + `refetch` for transient failures.

### 9.4 Audit / Logging

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| `SEARCH_EXECUTED` (warn level for slow queries > 500ms) | userId (if logged in), query params, result count, duration | 30 days |

Rules:
- NEVER log the full response body (security).
- Use NestJS `Logger` with `[SearchService]` context. No `console.log`.

---

## 10. Permission and Access Control

### 10.1 Authentication Requirements

- Search, category browsing, and product detail endpoints are **public** — no JWT required.
- Rate limiting is enforced on the public search endpoint to protect against abuse.

### 10.2 Public vs Protected Endpoints

| Endpoint | Access Level | Description |
|----------|-------------|-------------|
| `GET /api/v1/products` | Public | Search/filter/sort/paginate the product catalog |
| `GET /api/v1/categories` | Public | Category tree (nested navigation) |
| `GET /api/v1/products/:slug` | Public | Product detail (from result click) |

### 10.3 Role-Based Access

| Role | Can Search | Can Browse Categories | Can View Product Detail |
|------|:----------:|:---------------------:|:-----------------------:|
| Visitor (guest) | ✓ | ✓ | ✓ |
| `buyer` | ✓ | ✓ | ✓ |
| `merchant` | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | ✓ |

---

## 11. Real-Time Notification Behavior

### 11.1 Current Implementation

The Search and Filter page operates with standard REST API calls. Real-time WebSocket connections are not required for this feature; product availability and price changes are reflected on the next query (mitigated by the 2-minute list cache TTL).

### 11.2 Client-Side State Updates

| Event | Trigger | Action |
|-------|---------|--------|
| `search:paramChange` | URL query param change | Refetch product query (TanStack Query invalidation) |
| `search:debouncedInput` | Keyword input (300ms idle) | Update `q` param and refetch |
| `search:filterApplied` | Apply Filters / Reset Filters | Reset `page` to 1 and refetch |
| `search:pageChange` | Pagination control click | Update `page` and refetch with `keepPreviousData` |

---

## 12. Screen Transition Specification

### 12.1 Inbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| Header search icon | `/products` | Click search icon |
| Any page | `/products` | Click "Search"/browse products link |
| Category nav (footer/header) | `/products?categoryId=...` | Click category link |
| Home page | `/products` | Click "Shop All" or category tile |

### 12.2 Internal Navigation

| Source | Target | Trigger |
|--------|--------|---------|
| `/products` | `/products/:slug` | Click product card image or name |
| `/products` (self) | `/products` (updated params) | Filter/sort/pagination change (URL replaced in place) |
| `/products` | `/products` (default) | Reset Filters clicked |

### 12.3 Outbound Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/products/:slug` | `/products` | Browser back button (query params preserved for restore) |
| `/products` | `/checkout` (via detail) | Continue purchasing flow |
| `/products` | `/login` | Session required action (e.g., add to wishlist) |

### 12.4 Error Navigation

| Source | Target | Condition |
|--------|--------|-----------|
| `/products` | (stay, retry) | 429/500 — error banner with retry button |
| `/products` | `/login` | 401/403 on authenticated action |

---

## 13. Non-Functional Considerations

### 13.1 Performance Requirements (Performance Standards Section 10.3)

| Metric | Target |
|--------|--------|
| Search response time (10K records) | ≤ 3 seconds (NFR-002) |
| Autocomplete response time | ≤ 200ms |
| Filter application time | ≤ 500ms |
| Debounce delay (search input) | 300ms |
| API response time (p95) | ≤ 500ms (NFR-003) |
| Database query time | ≤ 50ms |
| Cache hit response time | ≤ 200ms |

### 13.2 Caching Strategy (Section 5 / 10.5)

| Cache Target | Strategy | TTL | Invalidation |
|--------------|----------|-----|--------------|
| Product list results | `cache:products:list:{hashOfQuery}` (String JSON) | 2 minutes | Any product mutation → `DEL` |
| Category tree | `cache:categories` (String JSON) | 30 minutes | Category mutation → `DEL` |

Rules:
- Cache-aside pattern: Check Redis → miss → query DB → seed Redis.
- List cache key is a hash of the serialized query params to support per-filter caching.
- ALWAYS set TTL. Never cache sensitive data.

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| SQL injection in `q` | Prisma parameterized queries; no string interpolation into SQL |
| XSS in keyword/URL params | React auto-escaping, no `dangerouslySetInnerHTML` |
| Extremely long `q` (> 255) | 400 validation error |
| Invalid CUID in `categoryId` | 400 validation error |
| Rate limit abuse on public search | 429 after threshold |
| Data leakage | Unapproved shop products excluded at query level (Section 12.2) |

### 13.4 Responsive Design Requirements

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥ 1024px) | Filters sidebar + results grid (4 columns) |
| Tablet (768px – 1023px) | Filters sidebar (narrower) + grid (2–3 columns) |
| Mobile (< 768px) | Filters drawer (trigger EL-28) + stacked grid (1–2 columns) |

---

## 14. Configurable Items (External Definitions)

Defined via `.env` configuration:

| Definition Key | Default Value | Description |
|----------------|---------------|-------------|
| `SEARCH_DEFAULT_LIMIT` | `20` | Default items per page |
| `SEARCH_MAX_LIMIT` | `100` | Maximum items per page allowed |
| `SEARCH_DEBOUNCE_MS` | `300` | Keyword input debounce delay in ms |
| `SEARCH_CACHE_TTL_SECONDS` | `120` | Product list Redis cache TTL (2 minutes) |
| `CATEGORY_CACHE_TTL_SECONDS` | `1800` | Category tree Redis cache TTL (30 minutes) |
| `SEARCH_SLOW_QUERY_MS` | `500` | Slow-query warn threshold for `SEARCH_EXECUTED` logging |
| `SEARCH_RATE_LIMIT_PER_MINUTE` | `60` | Max public search requests per minute per IP |

---

## 15. Cross-Reference Traceability Matrix

### 15.1 Requirements Definition Traceability

| Requirement ID | Requirement Description | Covered By (This Document) |
|----------------|-------------------------|----------------------------|
| B-SEARCH-001 | User can search products by keyword | UC-SEARCH-001, Sec 6.1 |
| B-SEARCH-002 | User can browse products by category | UC-SEARCH-002, Sec 6.2 |
| B-SEARCH-003 | User can sort by price, rating, newest | UC-SEARCH-007, Sec 6.4 |
| B-SEARCH-004 | Results are paginated (default 20 per page) | UC-SEARCH-008, Sec 6.5, BR-SEARCH-016 |
| B-SEARCH-005 | Search supports partial matching | UC-SEARCH-001, BR-SEARCH-001, Sec 6.1 |
| B-SEARCH-006 | Category tree supports nested navigation | UC-CATEGORY-001, Sec 6.2, Sec 7.4 |
| B-MATCH-002 | User can filter products by skin type | UC-SEARCH-003, BR-SEARCH-006 |
| B-MATCH-003 | User can filter products by ingredients | UC-SEARCH-004, BR-SEARCH-007 |
| B-MATCH-004 | User can filter products by price range | UC-SEARCH-005, BR-SEARCH-008 |
| B-MATCH-005 | User can filter products by review rating | UC-SEARCH-006, BR-SEARCH-009 |

### 15.2 Database Design Traceability

| Database Table | Relevant Functional Operations |
|----------------|-------------------------------|
| `products` | Search (SELECT with filters), Pagination count (COUNT), Product summary (SELECT) |
| `categories` | Category tree build (SELECT, recursive `parent_id`) |
| `shops` | Merchant approval filter (SELECT join, `is_approved = true`) |
| `reviews` | Rating aggregation (`avg_rating`, `review_count` maintenance) |

### 15.3 Related Document References

| Document ID | Document Name | File Path |
|-------------|---------------|-----------|
| SKM-REQ-001 | Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` |
| SKM-DBS-001 | Database Design Specification | `docs/core-work/データベース設計書_DATABASE_SPEC.md` |
| SKM-DEV-001 | Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` |

---

*End of Functional Specification (Search & Filter Page)*
