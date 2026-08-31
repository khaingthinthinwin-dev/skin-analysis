# Matching & Recommendation — Step-by-Step Flow Guide

**Document:** Simple explanation of how the Matching & Recommendation system works  
**Target Screen:** Recommendations Page (`/buyer/recommendations`)  
**Function ID:** FN-MATCH-001  
**Created:** 2026-08-31

---

## Table of Contents

1. [Overview](#1-overview)
2. [Flow 1: Buyer Opens Recommendations Page](#2-flow-1-buyer-opens-recommendations-page)
3. [Flow 2: AI Analysis vs Generic Fallback](#3-flow-2-ai-analysis-vs-generic-fallback)
4. [Flow 3: How Match Score Is Calculated](#4-flow-3-how-match-score-is-calculated)
5. [Flow 4: How Product Rating Works](#5-flow-4-how-product-rating-works)
6. [Flow 5: Buyer Uses Filters](#6-flow-5-buyer-uses-filters)
7. [Flow 6: Buyer Sorts and Paginates](#7-flow-6-buyer-sorts-and-paginates)
8. [Flow 7: Recommendation History](#8-flow-7-recommendation-history)
9. [Flow 8: Sponsored Ad Panel (D0)](#9-flow-8-sponsored-ad-panel-d0)
10. [Flow 9: Buyer Clicks a Product](#10-flow-9-buyer-clicks-a-product)
11. [Flow 10: Error Handling](#11-flow-10-error-handling)
12. [Key Rules Summary](#12-key-rules-summary)
13. [API Endpoints Summary](#13-api-endpoints-summary)

---

## 1. Overview

The Matching & Recommendation system is like a **personal shopping assistant** that knows your skin type and suggests the right skincare products.

**What it does:**
- Shows personalized product recommendations based on your AI skin analysis
- Scores each product 0-100 on how well it matches your skin
- Lets you filter by skin type, ingredients, and price
- Shows your past recommendation history
- Displays sponsored ads in a carousel above the results

**Two modes:**
- **AI Mode** — You have a recent skin analysis (less than 24 hours old) → personalized recommendations with match scores
- **Generic Mode** — No analysis or analysis is old → shows featured/top-rated products with a prompt to run AI analysis

---

## 2. Flow 1: Buyer Opens Recommendations Page

```
STEP 1: Buyer clicks "Recommendations" in the menu
        → Goes to /buyer/recommendations
        → System checks: "Is this buyer logged in?"
           NO  → Redirect to login page
           YES → Continue to Step 2

STEP 2: System checks: "Does this buyer have a recent AI skin analysis?"
        (checks if completed within last 24 hours)

STEP 3: Frontend calls the API
        → GET /api/v1/recommendations/personalized
        → Passes: skinTypes, price range, ingredients, sort, page

STEP 4: Backend receives the request
        → Step 4a: Validate inputs (are filters valid?)
        → Step 4b: Check Redis cache
           CACHE HIT  → Return cached results (super fast, ≤200ms)
           CACHE MISS → Continue to Step 5

STEP 5: Backend queries the database
        → Finds products where:
           ✓ is_active = true
           ✓ Shop is approved
           ✓ Matches skin types (if filter set)
           ✓ Matches ingredients (if set)
           ✓ Price within range (if set)

STEP 6: Backend calculates match score (0-100) for each product

STEP 7: Backend saves results to Redis cache (TTL: 5 minutes)
        → Returns JSON to frontend

STEP 8: Frontend displays the page with product cards
```

---

## 3. Flow 2: AI Analysis vs Generic Fallback

```
                    ┌─────────────────────────────┐
                    │  Has AI analysis?            │
                    └──────────┬──────────────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         YES (≤ 24h)    YES (> 24h)         NO
                │              │              │
                ▼              ▼              ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  source = "ai"   │ │  source = "ai"   │ │  source =        │
│  (fresh)         │ │  (stale)         │ │  "generic"       │
│                  │ │                  │ │                  │
│  Badge:          │ │  Badge:          │ │  Badge:          │
│  "🧬 AI Analysis"│ │  "🧬 AI Analysis"│ │  "⬡ General Picks"│
│  (emerald green) │ │  (emerald green) │ │  (amber/orange)  │
│                  │ │                  │ │                  │
│  Cards show:     │ │  Cards show:     │ │  Cards show:     │
│  "92% match"     │ │  "92% match"     │ │  Category badges:│
│  scores          │ │  scores          │ │  ⭐ Featured     │
│                  │ │                  │ │  🏆 Top Rated    │
│  Skin types from │ │  Skin types from │ │  🔥 Best Seller  │
│  AI pre-selected │ │  AI pre-selected │ │  ✨ New           │
│  in filter       │ │  in filter       │ │                  │
│                  │ │                  │ │  Profile Prompt  │
│  No prompt       │ │  Subtle banner:  │ │  Banner shown:   │
│  banner          │ │  "Want Fresh     │ │  "Start Skin     │
│                  │ │   Results?"      │ │   Analysis →"    │
│                  │ │  [Retake →]      │ │  (prominent)     │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

**Key:**
- **≤ 24h**: Analysis completed within last 24 hours → full AI mode, no banner
- **> 24h**: Analysis older than 24 hours → AI mode with subtle retake prompt
- **No analysis**: Never completed or all deleted → generic fallback with prominent CTA

**Important:** History section shows in ALL 3 modes (when history exists).

---

## 4. Flow 3: How Match Score Is Calculated

Each product gets a score from 0 to 100 based on 4 factors:

```
┌──────────────────────────────────────────────────────────┐
│  MATCH SCORE CALCULATION (0-100)                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. SKIN TYPE COMPATIBILITY (up to 50 points)             │
│     ├── Product has your primary skin type → 50 points    │
│     ├── Product has your secondary skin type → 30 points  │
│     └── No match → 0 points                               │
│                                                           │
│  2. SKIN CONCERN MATCH (up to 20 points)                  │
│     ├── Product addresses your skin concerns → up to 20   │
│     └── (e.g., acne, dark spots, wrinkles)                │
│                                                           │
│  3. PRODUCT RATING (up to 20 points)                      │
│     ├── Rating ≥ 4.5 → 20 points                          │
│     ├── Rating 4.0-4.49 → 15 points                       │
│     ├── Rating 3.0-3.99 → 10 points                       │
│     └── Rating < 3.0 → 0 points                           │
│                                                           │
│  4. FEATURED BOOST (up to 10 points)                      │
│     └── Product is featured → 10 points                    │
│                                                           │
├──────────────────────────────────────────────────────────┤
│  EXAMPLE: Vitamin C Serum                                 │
│  ├── Skin type "oily" matches buyer → +50                 │
│  ├── Concern "dark spots" matches → +15                   │
│  ├── Rating 4.7 → +20                                     │
│  ├── Featured product → +10                                │
│  └── TOTAL = 95% match ✓                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Flow 4: How Product Rating Works

Product ratings come from **buyer reviews**. The system calculates an average from all approved reviews.

### Rating Lifecycle

```
STEP 1: Buyer purchases a product
        → Order status must be "delivered" (verified purchase)
        → Only verified buyers can write reviews

STEP 2: Buyer writes a review
        → Selects 1-5 stars
        → Writes title + body (optional images)
        → Submits review

STEP 3: System creates review record
        → INSERT INTO reviews (user_id, product_id, rating, ...)
        → Sets is_verified_purchase = true
        → Review enters "pending" state for admin moderation

STEP 4: Admin approves the review
        → Only approved reviews count toward product rating
        → Rejected reviews are excluded

STEP 5: System recalculates product rating (in a transaction)
        → avg_rating = AVG(rating) from approved reviews only
        → review_count = COUNT(approved reviews only)

STEP 6: Updates products table
        → UPDATE products SET avg_rating = 4.70, review_count = 128

STEP 7: Invalidates Redis cache
        → DEL cache:product:{id}
```

### The Two Fields on Products Table

```
┌──────────────────────────────────────────────────────────┐
│  products table                                           │
├──────────────────────────────────────────────────────────┤
│  avg_rating   DECIMAL(3,2)  → Average of approved reviews│
│               Example: 4.70                               │
│                                                           │
│  review_count INTEGER        → Total approved reviews     │
│               Example: 128                                │
└──────────────────────────────────────────────────────────┘
```

### When Rating Gets Recalculated

| Event | What Happens |
|-------|-------------|
| New review created | Recalculate avg_rating and review_count |
| Admin approves review | Recalculate (review now counts) |
| Admin rejects review | Recalculate (review excluded) |
| Admin deletes review | Recalculate (review removed) |

### Rating in Match Score

The product rating affects the match score (0-100):

```
Rating ≥ 4.5      → 20 points (best)
Rating 4.0 - 4.49 → 15 points
Rating 3.0 - 3.99 → 10 points
Rating < 3.0      → 0 points (lowest)
```

### Rating Display on Product Card

```
┌──────────────────────────────────────┐
│  [Product Image]                      │
│  Vitamin C Brightening Serum          │
│  ★ 4.70 (128)                        │
│  ¥4,980                              │
│  [oily] [combination]                 │
│  95% match                            │
└──────────────────────────────────────┘
  ↑           ↑         ↑
  Stars    Review     Match
  shown    count      score
```

### Important Rules

| Rule | Description |
|------|-------------|
| **Verified purchase only** | Must buy the product before reviewing |
| **One review per buyer** | Unique (user_id, product_id) constraint |
| **Rating 1-5 only** | DB check constraint: `chk_reviews_rating` |
| **Only approved reviews count** | Pending/rejected excluded from avg_rating |
| **Recalculation is transactional** | Atomic update to prevent race conditions |
| **Cache invalidation** | Redis cache cleared after recalculation |

---

## 6. Flow 5: Buyer Uses Filters

### Filter by Skin Type

```
STEP 1: Buyer checks "Dry" skin type checkbox
        → URL changes to: ?skinTypes=dry
        → Page resets to page 1

STEP 2: Frontend re-fetches with new filter
        → GET /api/v1/recommendations/personalized?skinTypes=dry

STEP 3: Backend filters products
        → Only shows products where skin_types array contains "dry"
        → Re-calculates match scores
        → Returns filtered results

STEP 4: Frontend updates the grid
        → Shows only dry-skin-compatible products
```

### Filter by Price Range

```
STEP 1: Buyer enters Min: 2000, Max: 5000
        → URL changes to: ?minPrice=2000&maxPrice=5000

STEP 2: Backend filters
        → Only products with price between ¥2,000 and ¥5,000
```

### Filter by Ingredients

```
STEP 1: Buyer checks "Vitamin C" and "Hyaluronic Acid"
        → URL changes to: ?ingredients=vitamin_c,hyaluronic_acid

STEP 2: Backend filters
        → Only products containing selected ingredients
```

### Reset All Filters

```
STEP 1: Buyer clicks "Reset Filters"
        → All filter params cleared
        → Page resets to page 1
        → Returns to default results
```

---

## 7. Flow 6: Buyer Sorts and Paginates

### Sort

```
STEP 1: Buyer changes sort to "Price: Low to High"
        → URL changes to: ?sort=price&order=asc

STEP 2: Backend re-sorts results
        → Products ordered by price ascending

Sort options:
├── matchScore (default for AI mode)
├── price
├── rating
└── createdAt
```

### Paginate

```
STEP 1: Buyer clicks page 2
        → URL changes to: ?page=2

STEP 2: Frontend fetches page 2
        → Shows next 20 products (default page size)

Desktop: [Pagination controls] < 1 2 3 ... 8 >
Mobile:  [Load More button]
```

---

## 8. Flow 7: Recommendation History

```
STEP 1: Buyer scrolls to "Previously Recommended" section
        → Only shown if buyer has past AI analysis sessions
        → Shows in BOTH AI and Generic modes

STEP 2: Frontend calls history API
        → GET /api/v1/recommendations/history

STEP 3: Backend queries
        → Finds past skin_analysis_recommendations
        → Groups by analysis session date
        → Returns sessions with products

STEP 4: Frontend displays accordion
        ┌──────────────────────────────────────────┐
        │  📋 Previously Recommended                │
        │                                           │
        │  ▼ Aug 20, 2026 — Oily Skin Analysis     │
        │    [Vitamin C Serum ¥4,980]               │
        │    [Oil-Free Moisturizer ¥2,800]          │
        │    [Clay Mask ¥1,500]                     │
        │                                           │
        │  ▶ Aug 15, 2026 — Combination Skin       │
        │    (click to expand)                      │
        └──────────────────────────────────────────┘

History is kept for 180 days, then purged.
```

---

## 9. Flow 8: Sponsored Ad Panel (D0)

```
STEP 1: Page loads → System fetches ads
        → GET /api/v1/ads/panel?placement=category_banner

STEP 2: Backend finds eligible ads
        ✓ is_active = true
        ✓ approval_status = 'approved'
        ✓ payment_status = 'completed'
        ✓ started (starts_at <= now)
        ✓ not expired (expires_at > now)
        → Sorts by payment amount (highest first)
        → Returns up to 5 ads

STEP 3: Frontend shows carousel
        ┌──────────────────────────────────────────┐
        │  ┌────────────────────────────────────┐  │
        │  │ [Image]  Vitamin C Serum     [→]   │  │
        │  │          Dermatologist-             │  │
        │  │          recommended                │  │
        │  │                     [Shop Now]      │  │
        │  └────────────────────────────────────┘  │
        │  ● ○ ○ ○ ○     (dot indicators)         │
        │                                           │
        │  Sponsored products are paid placements   │
        │  from merchants                           │
        └──────────────────────────────────────────┘

STEP 4: Auto-slide every 5 seconds
        → Pauses when buyer hovers (desktop)
        → Buyer can click arrows to navigate manually

STEP 5: Buyer clicks "Shop Now"
        → Fire-and-forget: POST /api/v1/ads/track/click
        → Navigates to product page

STEP 6: When panel becomes visible (≥50% on screen)
        → Fire-and-forget: POST /api/v1/ads/track/impression
        → Records that the ad was seen
```

---

## 10. Flow 9: Buyer Clicks a Product

```
STEP 1: Buyer clicks on "Vitamin C Serum" card
        → Navigates to /buyer/products/vitamin-c-brightening-serum

STEP 2: Product detail page loads
        → Shows full product info
        → Shows skin type compatibility
        → Shows "Similar Products" section
           (same category + skin type, max 8 items)
```

---

## 11. Flow 10: Error Handling

```
┌─────────────────────────────────────────────────────────┐
│  ERROR SCENARIOS                                         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  401 (Not logged in)                                      │
│  → Redirect to /login                                     │
│                                                           │
│  403 (Wrong role)                                         │
│  → Redirect to /unauthorized                              │
│                                                           │
│  400 (Bad request)                                        │
│  → Show inline validation errors on filters               │
│                                                           │
│  429 (Too many requests)                                  │
│  → Show "Too many requests. Please wait" + countdown      │
│                                                           │
│  500 (Server error)                                       │
│  → Show error banner with "Retry" button                  │
│                                                           │
│  Network error                                            │
│  → Show "Network error. Check connection" + retry         │
│                                                           │
│  No results found                                         │
│  → Show "No matching products" + "Reset Filters" button   │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Key Rules Summary

| Rule | What It Means |
|------|---------------|
| **24-hour freshness** | AI analysis expires after 24h → falls back to generic |
| **Stale analysis banner** | Analysis > 24h old → subtle "Want Fresh Results?" banner |
| **Fresh analysis = no banner** | Analysis ≤ 24h old → no prompt banner shown |
| **Generic = prominent banner** | No analysis → full "Start Skin Analysis →" banner |
| **Score = 0-100** | Higher score = better match for your skin |
| **Rating from reviews** | Product rating = average of approved buyer reviews (1-5 stars) |
| **Verified purchase only** | Must buy product before reviewing |
| **Only approved reviews count** | Pending/rejected reviews excluded from avg_rating |
| **Only active products** | Out-of-stock items still show but marked "Out of Stock" |
| **Only approved shops** | Products from unapproved shops are hidden |
| **Cache for 5 min** | Same query returns cached results (fast!) |
| **Ads are separate** | Sponsored ads appear in a carousel above the grid, not mixed in |
| **History is independent** | History shows even when using generic results |
| **Page resets on filter** | Any filter change goes back to page 1 |
| **Max 50 per page** | Cannot request more than 50 products at once |
| **History kept 180 days** | Past recommendations are purged after 180 days |

---

## 13. API Endpoints Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/v1/recommendations/personalized` | GET | Get personalized recommendations | Required (buyer) |
| `/api/v1/recommendations/similar/:productId` | GET | Get similar products | None (public) |
| `/api/v1/recommendations/history` | GET | Get recommendation history | Required (buyer) |
| `/api/v1/ads/panel` | GET | Get sponsored ads for carousel | None (public) |
| `/api/v1/ads/track/impression` | POST | Record ad was seen | None (public) |
| `/api/v1/ads/track/click` | POST | Record ad was clicked | None (public) |

---

## Visual Summary

```
┌──────────────────────────────────────────────────────────────┐
│                     BUYER OPENS PAGE                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │ Has AI Analysis? │
                 └────┬───────┬────┘
                      │       │
            YES (≤24h)│       │NO
                      ▼       ▼
               ┌─────────┐ ┌──────────┐
               │   AI    │ │ Generic  │
               │ Results │ │ Results  │
               │ (fresh) │ │ + Banner │
               └────┬────┘ └────┬─────┘
                    │           │
               YES (>24h)       │
                    ▼           │
              ┌───────────┐     │
              │ AI Results│     │
              │ (stale)   │     │
              │ + Retake  │     │
              └────┬──────┘     │
                   │            │
                   └─────┬──────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐
      │  Filter  │ │  Sort    │ │  Page    │
      │  Results │ │  Results │ │  Results │
      └──────────┘ └──────────┘ └──────────┘
            │            │            │
            └────────────┼────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Click Product  │
                │  → Detail Page  │
                └─────────────────┘
```

---

*End of Matching & Recommendation Flow Guide*
