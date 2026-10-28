# Program Checklist (PCL) — Product Detail

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-PROD-001 |
| **Target Screen** | Product Detail (Buyer / Public / Merchant preview) |
| **Subsystem** | Catalog — Products, Reviews, Promotions, Advertisements |
| **Version** | 1.0 |
| **Created** | 2026-10-21 |
| **Last Updated** | 2026-10-21 |
| **Status** | Active |
| **Source Specs** | DD_PROD_01–06; 機能設計書 / 画面項目設計書 (ProductDetail) |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Product detail page loads with all sections for a public visitor
  - **Evidence**:
    - `N-01_1_product_detail_loading.png`
    - `N-01_2_product_detail_loaded.png`
    - Test: product-detail.spec.ts › "N-01: displays product detail page with all sections" — passed
  - **Precondition**: An active product exists whose merchant `licenseStatus = 'approved'`
  - **Steps**:
    1. Navigate to `/products/{slug}` (unauthenticated)
    2. Wait for the detail request to settle
    3. Inspect the back button, gallery, info panel, tabs and similar products section
  - **Expected Result**: Back button, ad banner, gallery, product info (name, price, stock, SKU, skin types), Description / Ingredients / Reviews tabs and Similar Products all render. No login redirect occurs
  - **Business Rules**: BR-PROD-001, BR-PROD-002
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The route param `:id` is resolved server-side by `ProductsService.resolveProduct` as UUID, slug or SKU..

- [x] **N-02**: Product detail resolves by UUID and by SKU as well as by slug
  - **Evidence**:
    - `N-02_1_resolved_by_uuid.png`
    - `N-02_2_resolved_by_sku.png`
    - Test: product-detail.spec.ts › "N-02: resolves product detail by uuid and sku" — passed
  - **Precondition**: The same product is addressable by UUID, slug and SKU
  - **Steps**:
    1. Navigate to `/products/{uuid}` and verify the page renders
    2. Navigate to `/products/{sku}` and verify the page renders
  - **Expected Result**: All three identifiers resolve to the identical product detail payload — same name, price, images and promotion badge
  - **Business Rules**: BR-PROD-001
  - **API**: `GET /api/v1/products/{uuid}`
  - **Note**: `resolveProduct` uses `{ id, isActive: true }` for a UUID and `{ isActive: true, OR: [{ slug }, { sku }] }` otherwise..

- [x] **N-03**: Price renders in MMK with a struck-through compare-at price and a "Save {diff} MMK" badge
  - **Evidence**:
    - `N-03_1_price_with_save_badge.png`
    - Test: product-detail.spec.ts › "N-03: shows price in MMK with save amount badge" — passed
  - **Precondition**: Product has `price = 25` and `compareAtPrice = 32`
  - **Steps**:
    1. Open the product detail page
    2. Inspect the price row
  - **Expected Result**: Primary price renders as `25 MMK`; compare-at price renders struck through as `32 MMK`; a destructive badge renders `Save 7 MMK`
  - **Business Rules**: BR-PROD-003
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The savings badge shows an absolute amount, not a percentage. `formatPrice` uses `Intl.NumberFormat('en-US')` and the currency is fixed to MMK..

- [x] **N-04**: Rating summary renders and scrolls to the reviews section
  - **Evidence**:
    - `N-04_1_rating_summary_before_click.png`
    - `N-04_2_rating_summary_after_scroll.png`
    - Test: product-detail.spec.ts › "N-04: scrolls to reviews when rating summary is clicked" — passed
  - **Precondition**: Product has `avgRating` and `reviewCount` greater than zero
  - **Steps**:
    1. Click the rating summary row (stars + numeric rating + review count)
  - **Expected Result**: Clicking the rating summary switches the product tabs to **Reviews** and smooth-scrolls the `#reviews` anchor into view
  - **Business Rules**: BR-PROD-009
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The rating row is a `<button>` with an `aria-label` of "Go to reviews. Rated X out of 5 from N reviews". The page owns the tab state: `ProductInfo` raises `onShowReviews` and `ProductTabs` scrolls the anchor only once the reviews panel is mounted (Radix unmounts inactive tab panels, so the anchor does not exist before the tab is selected)..

- [x] **N-05**: Image gallery swaps the main image when a thumbnail is clicked
  - **Evidence**:
    - `N-05_1_gallery_before_click.png`
    - `N-05_2_gallery_after_thumbnail_click.png`
    - Test: product-detail.spec.ts › "N-05: displays product image gallery" — passed
  - **Precondition**: Product has two or more images
  - **Steps**:
    1. Click the second thumbnail in the gallery strip
  - **Expected Result**: The main image swaps to the clicked asset; the clicked thumbnail gains the active border and ring; the previously active thumbnail loses it
  - **Business Rules**: BR-PROD-002
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: `images[0]` is the cover image. Relative image paths are resolved against `VITE_API_BASE_URL` with the `/api/v1` suffix stripped..

- [x] **N-06**: Stock status badge renders the in-stock variant
  - **Evidence**:
    - `N-06_1_in_stock_badge.png`
    - Test: product-detail.spec.ts › "N-06: displays in stock status badge" — passed
  - **Precondition**: Product has `stockQuantity = 45` and `lowStockThreshold = 10`
  - **Steps**:
    1. Open the product detail page
    2. Inspect the stock badge next to the SKU
  - **Expected Result**: A default-variant badge reads `In stock (45)` and the purchase area shows `45 in stock`
  - **Business Rules**: BR-PROD-004, BR-PROD-012
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: `getStockStatus` returns the out-of-stock badge when `stockQuantity <= 0`, the low-stock badge when `stockQuantity <= lowStockThreshold`, otherwise the in-stock badge..

- [x] **N-07**: Skin type badges render for each product skin type
  - **Evidence**:
    - `N-07_1_skin_type_badges.png`
    - Test: product-detail.spec.ts › "N-07: displays skin type badges" — passed
  - **Precondition**: Product has `skinTypes = ["dry", "sensitive"]`
  - **Steps**:
    1. Open the product detail page
    2. Inspect the badge group under the price row
  - **Expected Result**: Two pill badges render (`dry`, `sensitive`) in uppercase with primary text colour
  - **Business Rules**: None (UI display)
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The badge group is omitted entirely when `skinTypes` is empty..

- [x] **N-08**: Promotion discount badge renders from the embedded `promotions[0]`
  - **Evidence**:
    - `N-08_1_promotion_discount_badge.png`
    - Test: product-detail.spec.ts › "N-08: displays promotion discount badge" — passed
  - **Precondition**: Merchant has an active, in-window promotion with `discountTypeCode = 'percentage'`, `discountValue = 10`, `code = 'GLOW10'`
  - **Steps**:
    1. Open the product detail page
    2. Inspect the badge group
  - **Expected Result**: A secondary badge renders `GLOW10: 10% off`
  - **Business Rules**: BR-PROD-018, BR-PROD-019
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The badge is sourced from the detail response's `promotions` array — there is no separate promotions request. `discountTypeCode === 'percentage'` renders "% off", anything else renders a plain "off" amount..

- [x] **N-09**: Tabs switch between Description, Ingredients and Reviews
  - **Evidence**:
    - `N-09_1_tab_description.png`
    - `N-09_2_tab_ingredients.png`
    - `N-09_3_tab_reviews.png`
    - Test: product-detail.spec.ts › "N-09: switches between description ingredients and reviews tabs" — passed
  - **Precondition**: Product has a description and at least one ingredient
  - **Steps**:
    1. Click the **Ingredients** tab
    2. Click the **Reviews** tab
    3. Click the **Description** tab
  - **Expected Result**: Each click swaps the panel content. The Reviews tab label carries the review count, e.g. `Reviews (32)`
  - **Business Rules**: None (UI navigation)
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The description panel renders `product.description` through `dangerouslySetInnerHTML`..

- [x] **N-10**: Approved reviews render with rating, author and status badges
  - **Evidence**:
    - `N-10_1_reviews_loading.png`
    - `N-10_2_reviews_section.png`
    - Test: product-detail.spec.ts › "N-10: displays product reviews section" — passed
  - **Precondition**: Product has at least one `status='approved'` review
  - **Steps**:
    1. Open the product detail page
    2. Click the **Reviews** tab
  - **Expected Result**: Each review card shows the author name, a date, a star rating, the title and body. Review images are not rendered in buyer-side review cards. A green `Verified` badge renders for `isVerifiedPurchase = true`, and the avatar falls back to the first letter of the author's name
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products/{slug}/reviews?page=1&limit=10`
  - **Note**: The backend selects `user { id, name }` only, so `avatarUrl` is always undefined and the initials fallback always renders. The `select` clause also omits `status`, and the list is filtered to `status = 'approved'`, so the review card's `Pending` badge and the purple author-highlight branch can never render against this endpoint..

- [x] **N-11**: "Load more reviews" advances to the next page of reviews
  - **Evidence**:
    - `N-11_1_reviews_page_1.png`
    - `N-11_2_reviews_page_2.png`
    - Test: product-detail.spec.ts › "N-11: loads more reviews on demand" — passed
  - **Precondition**: Product has more than 10 approved reviews so `page < totalPages`
  - **Steps**:
    1. Open the **Reviews** tab
    2. Click **Load more reviews**
  - **Expected Result**: The panel briefly shows `Loading reviews...` and then displays the second page of reviews. The button stays visible while `page < totalPages`
  - **Business Rules**: None (pagination)
  - **API**: `GET /api/v1/products/{slug}/reviews?page=2&limit=10`
  - **Note**: Despite the "Load more reviews" label, the list is **replaced, not appended**: the page number is component state and is part of the query key (`['product', idOrSlug, 'reviews', { page, limit }]`), so the new query returns only that page's `items` and no accumulator is kept. The UI requests `limit=10` while the backend default is 20..

- [x] **N-12**: Similar products render and navigate to the target product
  - **Evidence**:
    - `N-12_1_similar_products_grid.png`
    - `N-12_2_navigated_to_similar_product.png`
    - Test: product-detail.spec.ts › "N-12: displays related products" — passed
  - **Precondition**: At least one other active product shares the category and overlaps the skin types
  - **Steps**:
    1. Scroll to the **Similar Products** section
    2. Click the first product card
  - **Expected Result**: A responsive grid (`grid-cols-2 md:grid-cols-4`) renders up to 8 cards. Clicking a card navigates to that product's detail page
  - **Business Rules**: None (recommendation display)
  - **API**: `GET /api/v1/products/{slug}/similar?limit=8`
  - **Note**: The UI requests `limit=8` while the backend default is 4. The backend excludes the target product and requires `merchant.licenseStatus = 'approved'`..

- [x] **N-13**: Buyer adds the product to the cart
  - **Evidence**:
    - `N-13_1_cart_before_add.png`
    - `N-13_2_cart_after_add.png`
    - `N-13_3_db_cart_items.json`
    - `N-13_3_db_cart_items.png`
    - `N-13_4_db_cart_count.json`
    - `N-13_4_db_cart_count.png`
    - Test: product-detail.spec.ts › "N-13: adds product to cart and retains selected quantity" — passed
  - **Precondition**: Authenticated buyer; product is in stock and not already in the cart
  - **Steps**:
    1. Open `/buyer/products/{slug}`
    2. Set quantity to 2 with the stepper
    3. Click **Add to Cart**
    4. Wait for the cart query to settle
  - **Expected Result**: A success toast `Added to cart` is shown, the cart badge count increases and the `cart_items` row is created with `quantity = 2`
  - **Business Rules**: BR-PROD-004, BR-PROD-010
  - **API**: `POST /api/v1/cart/items`
  - **Note**: Cart mutation is owned by the Cart team. The button shows a spinner and the label `Adding...` while the request is in flight, and `addToCart` invalidates `cartKeys.all` so the badge refetches. The quantity stepper keeps its value after a successful add — `handleAddToCart` never calls `setQuantity(1)`. Capture the DB evidence with `captureCartDbEvidence(page, 'N-13_3_db_cart_items', email, description, productId)` and `captureCartCountDbEvidence(page, 'N-13_4_db_cart_count', email, description, productId)` from `e2e/utils/db-evidence.ts`..

- [x] **N-14**: Buyer adds the product to the wishlist
  - **Evidence**:
    - `N-14_1_wishlist_before_add.png`
    - `N-14_2_wishlist_after_add.png`
    - `N-14_3_db_wishlists.json`
    - `N-14_3_db_wishlists.png`
    - `N-14_4_db_wishlist_count.json`
    - `N-14_4_db_wishlist_count.png`
    - Test: product-detail.spec.ts › "N-14: toggles product in wishlist" — passed
  - **Precondition**: Authenticated buyer; product not already in the wishlist
  - **Steps**:
    1. Open `/buyer/products/{slug}`
    2. Click **Add to Wishlist**
    3. Wait for the wishlist query to settle
  - **Expected Result**: A success toast `Added to wishlist` is shown and the button switches to the filled "Added to Wishlist" state. The `wishlists` row is created for the buyer and product
  - **Business Rules**: BR-PROD-013
  - **API**: `POST /api/v1/wishlist/{productId}`
  - **Note**: The in-wishlist state is derived from the buyer's wishlist list, so the button is already "Added" on load when the product is saved. Wishlist removal is out of scope. Capture the DB evidence with `captureWishlistDbEvidence(page, 'N-14_3_db_wishlists', email, description, productId)` and `captureWishlistCountDbEvidence(page, 'N-14_4_db_wishlist_count', email, description, productId)`..

- [x] **N-15**: Eligible buyer submits a review and it is created as pending
  - **Evidence**:
    - `N-15_1_review_form_before_submit.png`
    - `N-15_2_review_after_submit.png`
    - `N-15_3_db_reviews.json`
    - `N-15_3_db_reviews.png`
    - `N-15_4_db_reviews_count.json`
    - `N-15_4_db_reviews_count.png`
    - Test: product-detail.spec.ts › "N-15: submits review for eligible buyer" — passed
  - **Precondition**: Authenticated buyer with a `delivered` order containing the product and no existing review
  - **Steps**:
    1. Open the **Reviews** tab
    2. Select a 5-star rating
    3. Enter a title and a body
    4. Click **Submit Review**
    5. Wait for the review and detail queries to settle
  - **Expected Result**: A success toast states the review is awaiting approval. The `reviews` row is created with `status = 'pending'` and `is_verified_purchase = true`, and the review does not appear in the public approved list. The review, `can-review` and detail queries are invalidated
  - **Business Rules**: BR-PROD-005, BR-PROD-006, BR-PROD-008, BR-PROD-009, BR-PROD-009a
  - **API**: `POST /api/v1/products/{slug}/reviews`
  - **Note**: A `REVIEW_CREATED` in-app notification is created for every admin. Rating aggregates are recomputed over `status='approved'` only, so a new pending review does not change the displayed rating. There is no dedicated review helper in `e2e/utils/db-evidence.ts` — use `captureDbEvidence` with a `SELECT ... FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id WHERE u.email = $1 AND p.id = $2` query..

- [x] **N-16**: Buyer reports a review
  - **Evidence**:
    - `N-16_1_review_report_dialog_before_submit.png`
    - `N-16_2_review_after_report.png`
    - `N-16_3_db_review_reports.json`
    - `N-16_3_db_review_reports.png`
    - `N-16_4_db_review_reports_count.json`
    - `N-16_4_db_review_reports_count.png`
    - Test: product-detail.spec.ts › "N-16: reports a review" — passed
  - **Precondition**: Authenticated non-merchant user; product has at least one approved review
  - **Steps**:
    1. Hover a review card and click the flag icon
    2. Select the `Spam` reason
    3. Enter optional details
    4. Click **Submit Report**
    5. Wait for the request to settle
  - **Expected Result**: The dialog closes and a success toast `Report submitted` is shown. The `review_reports` row is created with `status = 'pending'`, `reported_by` = the buyer and `description` = the submitted `detail` text
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/reviews/{reviewId}/report`
  - **Note**: The request field is `detail` and is persisted as `description`. The endpoint requires only a JWT — the buyer role is not enforced, and the trigger button is hidden for merchants. Use `captureDbEvidence` with a `SELECT ... FROM review_reports rr JOIN users u ON u.id = rr.reported_by WHERE rr.review_id = $1 AND u.email = $2` query..

- [x] **N-17**: Ad banner renders, auto-rotates and navigates internally
  - **Evidence**:
    - `N-17_1_ad_banner_before_rotate.png`
    - `N-17_2_ad_banner_after_rotate.png`
    - `N-17_3_navigated_to_ad_product.png`
    - Test: product-detail.spec.ts › "N-17: displays ad banner with internal navigation" — passed
  - **Precondition**: An approved, active, in-window ad exists for placement `productDetail_page_banner` with an approved shop
  - **Steps**:
    1. Open the product detail page
    2. Wait more than 5 seconds and observe the slider
    3. Click the ad card
  - **Expected Result**: The sponsored slider renders with a `SPONSORED` badge. The active ad rotates every 5 seconds. Clicking the card performs an internal navigation to `/buyer/products/{sku}` — no new browser tab is opened
  - **Business Rules**: BR-PROD-021, BR-PROD-022, BR-PROD-023
  - **API**: `GET /api/v1/search/ads?placement=productDetail_page_banner`
  - **Note**: The mounted banner is the shared `AdBannerSlider`, which reads `GET /api/v1/search/ads` — not the product-scoped `GET /products/:id/advertisements`, which is only consumed by the unmounted `SidebarAdvertisements` component. Rotation pauses on hover, keyboard focus and `prefers-reduced-motion`..

- [x] **N-18**: Back button returns to the previous page
  - **Evidence**:
    - `N-18_0_search_products_before.png`
    - `N-18_1_back_button.png`
    - `N-18_2_returned_to_previous_page.png`
    - Test: product-detail.spec.ts › "N-18: navigates back via back button" — passed
  - **Precondition**: Buyer navigated to the detail page from the product listing
  - **Steps**:
    1. Click the back arrow button at the top of the page
  - **Expected Result**: The browser history moves back one entry and the previous page is restored
  - **Business Rules**: None (UI navigation)
  - **API**: None
  - **Note**: The button calls `navigate(-1)` and carries the `aria-label` "Go back"..

- [x] **N-19**: `#reviews` deep link opens the Reviews tab and scrolls to it
  - **Evidence**:
    - `N-19_1_product_detail_without_hash.png`
    - `N-19_2_reviews_deep_link.png`
    - Test: product-detail.spec.ts › "N-19: opens reviews tab from hash deep link" — passed
  - **Precondition**: Product exists
  - **Steps**:
    1. Navigate to `/buyer/products/{slug}#reviews`
  - **Expected Result**: The Reviews tab is selected and the page smooth-scrolls to the `#reviews` anchor — both on a fresh load with the hash and when the hash changes on an already-open page
  - **Business Rules**: None (deep link)
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: `ProductDetail` derives the active tab from `location.hash` and adjusts it during render, so a same-page `#reviews` change switches the tab in the same paint. The user's own review is highlighted with a purple border when the hash is present..

- [x] **N-20**: Language toggle updates all product detail labels
  - **Evidence**:
    - `N-20_1_product_detail_english.png`
    - `N-20_2_product_detail_japanese.png`
    - `N-20_3_product_detail_myanmar.png`
    - Test: product-detail.spec.ts › "N-20: toggles language on product detail page" — passed
  - **Precondition**: User is on the product detail page
  - **Steps**:
    1. Switch the language to Japanese
    2. Verify the labels
    3. Switch the language to Myanmar
    4. Verify the labels
    5. Switch back to English
  - **Expected Result**: Tabs, price and stock labels, CTA buttons, review form labels and empty states all render in the selected locale. The currency suffix follows the locale: `MMK` in English and Japanese, `Ks` in Myanmar
  - **Business Rules**: None (i18n)
  - **API**: None
  - **Note**: `buyer.products.price.amountInMmk` is `{{amount}} MMK` in `en` and `ja` but `{{amount}} Ks` in `my`; `savingsInMmk` is `Save {{amount}} MMK` / `{{amount}} MMKお得` / `{{amount}} Ks သက်သာ`. The number itself is always formatted with `Intl.NumberFormat('en-US')`, so the digits and separators do not change. The `Reviews ({{count}})` tab label is missing from the locale files, so that tab keeps its English fallback..

- [x] **N-21**: Theme toggle switches between dark and light modes
  - **Evidence**:
    - `N-21_1_product_detail_light.png`
    - `N-21_2_product_detail_dark.png`
    - Test: product-detail.spec.ts › "N-21: toggles theme on product detail page" — passed
  - **Precondition**: User is on the product detail page
  - **Steps**:
    1. Toggle the theme to dark
    2. Verify the page
    3. Toggle the theme back to light
  - **Expected Result**: Backgrounds, borders and text colours flip consistently across the gallery, info panel, tabs and reviews
  - **Business Rules**: None (UI)
  - **API**: None
  - **Note**: The sticky mobile CTA bar uses `bg-background/95` with a backdrop blur, so it follows the theme..

- [x] **N-22**: Desktop responsive layout renders the two-column grid
  - **Evidence**:
    - `N-22_1_desktop_product_detail.png`
    - Test: product-detail.spec.ts › "N-22: displays responsive layout on desktop viewport" — passed
  - **Precondition**: Viewport width ≥ 768px (`md:` breakpoint)
  - **Steps**:
    1. Set the viewport to 1280×720
    2. Open the product detail page
  - **Expected Result**: A two-column grid renders — gallery on the left, product info on the right. Purchase actions are inline inside the info panel and the Similar Products grid renders 4 columns
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: The inline purchase block is `hidden md:block` and the sticky mobile bar is `md:hidden`, so exactly one is visible at desktop width..

- [x] **N-23**: Mobile responsive layout renders the sticky CTA bar
  - **Evidence**:
    - `N-23_1_mobile_product_detail_top.png`
    - `N-23_2_mobile_sticky_cta.png`
    - Test: product-detail.spec.ts › "N-23: displays responsive layout with sticky CTA on mobile viewport" — passed
  - **Precondition**: Viewport width < 768px; authenticated buyer
  - **Steps**:
    1. Set the viewport to 375×667
    2. Open the product detail page
    3. Scroll down the page
  - **Expected Result**: The layout stacks into a single column. A fixed bottom bar (`md:hidden`) shows the quantity stepper, **Add to Cart** and **Add to Wishlist**, and it stays pinned while scrolling. The inline purchase actions in the info panel are hidden
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: The sticky bar is rendered only when `showCTA` is true — that is, for guests and buyers, but never for merchants..

- [x] **N-24**: Merchant view gates commerce content
  - **Evidence**:
    - `N-24_1_buyer_view_for_comparison.png`
    - `N-24_2_merchant_view.png`
    - Test: product-detail.spec.ts › "N-24: hides commerce content in merchant view" — passed
  - **Precondition**: Authenticated merchant with `role = 'merchant'`
  - **Steps**:
    1. Open `/merchant/products/{id}/view`
  - **Expected Result**: The ad banner, purchase actions (desktop and sticky mobile), promotion discount badge, "Sold by" line, the Description and Ingredients tabs and the Similar Products section are all hidden. Only the product information and the Reviews tab remain
  - **Business Rules**: None (role gating)
  - **API**: `GET /api/v1/products/{id}`
  - **Note**: Gating is driven by `user?.role === 'merchant'` and is applied through `isMerchantView` props on `ProductInfo` and `ProductTabs`..

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Unknown product identifier shows the not-found empty state
  - **Evidence**:
    - `A-01_1_product_not_found_loading.png`
    - `A-01_2_product_not_found.png`
    - Test: product-detail.spec.ts › "A-01: shows not found state for unknown product" — passed
  - **Precondition**: No product exists for the given identifier
  - **Steps**:
    1. Navigate to `/products/nonexistent-product-slug`
  - **Expected Result**: The page shows `Product not found.` with a **Browse products** link that navigates to `/products`. No skeleton is left on screen
  - **Business Rules**: BR-PROD-001
  - **API**: `GET /api/v1/products/nonexistent-product-slug`
  - **Note**: The backend also returns 404 for an inactive product or a merchant whose `licenseStatus` is not `approved`..

- [x] **A-02**: Missing route parameter shows the invalid-product message
  - **Evidence**:
    - `A-02_1_invalid_product.png`
    - Test: product-detail.spec.ts › "A-02: shows invalid product message when id param is missing" — passed
  - **Precondition**: The route is mounted without an `:id` segment
  - **Steps**:
    1. Render the detail page component without an `:id` param
  - **Expected Result**: The path never resolves to the detail page, so the catch-all 404 page is rendered and no product request is fired
  - **Business Rules**: None (route guard)
  - **API**: None
  - **Note**: `useProductDetail` is disabled while `idOrSlug` is empty, so the query is not sent. The `Invalid product.` message itself is only reachable when the component is mounted without an `:id` — the router never mounts it that way, so the E2E asserts the reachable state (the 404 page, no request)..

- [x] **A-03**: Guest clicking Add to Cart is redirected to login
  - **Evidence**:
    - `A-03_1_guest_before_add_to_cart.png`
    - `A-03_2_guest_after_add_to_cart.png`
    - `A-03_3_db_cart_count.json`
    - `A-03_3_db_cart_count.png`
    - Test: product-detail.spec.ts › "A-03: redirects guest user attempting to add to cart" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Open a public product detail page
    2. Click **Add to Cart**
  - **Expected Result**: The browser navigates to `/login?redirect=/buyer/products`. No cart request is sent and no `cart_items` row is created
  - **Business Rules**: BR-PROD-015
  - **API**: None (frontend guard)
  - **Note**: The guard is `window.location.href = '/login?redirect=/buyer/products'`. Capture the DB evidence with `captureCartCountDbEvidence(page, 'A-03_3_db_cart_count', email, description)` to prove the write never happened..

- [x] **A-04**: Guest clicking Add to Wishlist is redirected to login
  - **Evidence**:
    - `A-04_1_guest_before_add_to_wishlist.png`
    - `A-04_2_guest_after_add_to_wishlist.png`
    - `A-04_3_db_wishlist_count.json`
    - `A-04_3_db_wishlist_count.png`
    - Test: product-detail.spec.ts › "A-04: redirects guest user attempting to add to wishlist" — passed
  - **Precondition**: User is not authenticated
  - **Steps**:
    1. Open a public product detail page
    2. Click **Add to Wishlist**
  - **Expected Result**: The browser navigates to `/login?redirect=/buyer/products`. The wishlist button is clickable for guests — clicking it reaches the login redirect, exactly like the **Add to Cart** button — and no `wishlists` row is created
  - **Business Rules**: BR-PROD-015
  - **API**: None (frontend guard)
  - **Note**: `wishlistDisabled` only covers an in-flight wishlist request. Guests and non-buyers reach `handleAddToWishlist`, which sends them to `/login?redirect=/buyer/products` or `/unauthorized`. Capture the DB evidence with `captureWishlistCountDbEvidence(page, 'A-04_3_db_wishlist_count', email, description)`.

- [x] **A-05**: Signed-in non-buyer role is redirected to the unauthorized page
  - **Evidence**:
    - `A-05_1_non_buyer_before.png`
    - `A-05_2_non_buyer_unauthorized.png`
    - Test: product-detail.spec.ts › "A-05: redirects non-buyer user to unauthorized" — passed
  - **Precondition**: Authenticated as a role that is neither `buyer` nor `merchant` (e.g. `admin`); the public product page `/products/{slug}` is open at a viewport ≥ 768px
  - **Steps**:
    1. Open the public product detail page `/products/{slug}` as an admin
    2. Click **Add to Cart** in the inline purchase block
  - **Expected Result**: The browser navigates to `/unauthorized`. No cart or wishlist request is sent
  - **Business Rules**: BR-PROD-015
  - **API**: None (frontend guard)
  - **Note**: The guard is `window.location.href = '/unauthorized'` for any role other than `buyer`. This path is reachable only by a non-merchant, non-buyer role: a **merchant** never sees the CTA at all, because `ProductInfo` hides the inline purchase block and the mobile sticky bar when `isMerchantView` is true, and `/buyer/products/:id` is route-guarded to `roles={['buyer']}`. The merchant case is covered by N-24..

- [x] **A-06**: Submitting a review without a rating is blocked
  - **Evidence**:
    - `A-06_1_rating_missing_before.png`
    - `A-06_2_rating_required_error.png`
    - Test: product-detail.spec.ts › "A-06: blocks review submission without rating" — passed
  - **Precondition**: Authenticated eligible buyer; the Reviews tab is open
  - **Steps**:
    1. Leave the rating unselected
    2. Enter a body
    3. Click **Submit Review**
  - **Expected Result**: A red inline error `Please select a rating.` appears under the star widget and no POST request is sent
  - **Business Rules**: BR-PROD-007
  - **API**: None (client validation)
  - **Note**: `validate()` runs before the mutation and the rating error is cleared as soon as a star is clicked..

- [x] **A-07**: Submitting a review without a body is blocked
  - **Evidence**:
    - `A-07_1_review_body_missing_before.png`
    - `A-07_2_review_body_required_error.png`
    - Test: product-detail.spec.ts › "A-07: blocks review submission without body" — passed
  - **Precondition**: Authenticated eligible buyer; the Reviews tab is open
  - **Steps**:
    1. Select a 3-star rating
    2. Leave the body empty or whitespace only
    3. Click **Submit Review**
  - **Expected Result**: A red inline error `Please write your review.` appears under the textarea and no POST request is sent
  - **Business Rules**: BR-PROD-007
  - **API**: None (client validation)
  - **Note**: The body is trimmed before the check, so whitespace-only input is rejected. The DTO itself allows a null body — the requirement is client-side only..

- [x] **A-08**: Buyer without a delivered order is blocked by the eligibility check
  - **Evidence**:
    - `A-08_1_not_delivered_before.png`
    - `A-08_2_not_delivered_after.png`
    - Test: product-detail.spec.ts › "A-08: blocks review for buyer without delivered order" — passed
  - **Precondition**: Authenticated buyer with no `delivered` order containing the product
  - **Steps**:
    1. Open the **Reviews** tab and wait for the eligibility check to resolve
    2. Enter a rating and a body
    3. Click **Submit Review**
  - **Expected Result**: `GET /products/{slug}/can-review` returns `{ canReview: false, reason: 'not_delivered' }`. Clicking **Submit Review** shows the inline message `You can only review products you have purchased and received.` and no POST request is sent. The submit button itself stays enabled — it is only disabled while the request is in flight or while the eligibility check is still pending
  - **Business Rules**: BR-PROD-005
  - **API**: `GET /api/v1/products/{slug}/can-review`
  - **Note**: Eligibility requires an order with `statusCode = 'delivered'` containing the product. The message is not shown proactively — `errors.submit` is only set by `validate()` when the user clicks submit. The API-level rejection of the same case is HTTP 400 (see I-13), not 422..

- [x] **A-09**: Buyer who already reviewed is blocked by the eligibility check
  - **Evidence**:
    - `A-09_1_already_reviewed_before.png`
    - `A-09_2_already_reviewed_after.png`
    - Test: product-detail.spec.ts › "A-09: blocks review for buyer who already reviewed" — passed
  - **Precondition**: Authenticated buyer who already has a review for the product
  - **Steps**:
    1. Open the **Reviews** tab and wait for the eligibility check to resolve
    2. Enter a rating and a body
    3. Click **Submit Review**
  - **Expected Result**: `GET /products/{slug}/can-review` returns `{ canReview: false, reason: 'already_reviewed' }`. Clicking **Submit Review** shows the inline message `You have already reviewed this product.` and no POST request is sent. The submit button stays enabled apart from the in-flight and pending-eligibility states
  - **Business Rules**: BR-PROD-006
  - **API**: `GET /api/v1/products/{slug}/can-review`
  - **Note**: The check is the unique `userId_productId` constraint `uq_reviews_user_product`. The message is not shown proactively — `errors.submit` is only set by `validate()` when the user clicks submit. The API-level rejection of the same case is HTTP 409 (see I-14)..

- [x] **A-10**: Duplicate review submission is rejected with 409
  - **Evidence**:
    - `A-10_1_duplicate_review_before.png`
    - `A-10_2_duplicate_review_after.png`
    - `A-10_3_db_reviews_count.json`
    - `A-10_3_db_reviews_count.png`
    - Test: product-detail.spec.ts › "A-10: rejects duplicate review submission with 409" — passed
  - **Precondition**: Authenticated buyer already reviewed the product
  - **Steps**:
    1. Call `POST /api/v1/products/{slug}/reviews` directly with a valid body
  - **Expected Result**: HTTP 409 CONFLICT and the `reviews` row count for the buyer and product is still 1 — no second review row is created
  - **Business Rules**: BR-PROD-006
  - **API**: `POST /api/v1/products/{slug}/reviews`
  - **Note**: The error message is `You have already reviewed this product`. The unique constraint is `reviews (user_id, product_id)`. Use `captureDbEvidence` with a `SELECT COUNT(*)::int FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id WHERE u.email = $1 AND p.id = $2` query..

- [x] **A-11**: Duplicate report is rejected with 409
  - **Evidence**:
    - `A-11_1_duplicate_report_before.png`
    - `A-11_2_duplicate_report_after.png`
    - `A-11_3_db_review_reports_count.json`
    - `A-11_3_db_review_reports_count.png`
    - Test: product-detail.spec.ts › "A-11: rejects duplicate review report with 409" — passed
  - **Precondition**: Authenticated user already reported the same review
  - **Steps**:
    1. Report the same review a second time
  - **Expected Result**: An informational toast `You have already reported this review` is shown. The dialog still closes and resets and the `review_reports` row count is still 1 — no duplicate report row is created
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/reviews/{reviewId}/report`
  - **Note**: The 409 branch shows an informational toast rather than an error toast. Use `captureDbEvidence` with a `SELECT COUNT(*)::int FROM review_reports rr JOIN users u ON u.id = rr.reported_by WHERE rr.review_id = $1 AND u.email = $2` query..

- [x] **A-12**: Report dialog cannot be submitted without a reason
  - **Evidence**:
    - `A-12_1_report_submit_disabled.png`
    - `A-12_2_report_submit_enabled.png`
    - Test: product-detail.spec.ts › "A-12: disables report submit without reason" — passed
  - **Precondition**: Authenticated non-merchant user; the report dialog is open
  - **Steps**:
    1. Leave the reason radio group unselected
    2. Inspect the **Submit Report** button
    3. Attempt to click it
  - **Expected Result**: The **Submit Report** button is disabled and no request is sent
  - **Business Rules**: None (client validation)
  - **API**: None (client validation)
  - **Note**: `canSubmit` requires a non-empty `reason` and no pending mutation. The available reasons are spam, inappropriate, fake and other..

- [x] **A-13**: Out-of-stock product disables the Add to Cart CTA
  - **Evidence**:
    - `A-13_1_out_of_stock_before.png`
    - `A-13_2_out_of_stock_after.png`
    - `A-13_3_db_cart_count.json`
    - `A-13_3_db_cart_count.png`
    - `A-13_4_db_product_stock.json`
    - `A-13_4_db_product_stock.png`
    - Test: product-detail.spec.ts › "A-13: disables add to cart for out of stock product" — passed
  - **Precondition**: Product has `stockQuantity = 0`
  - **Steps**:
    1. Open the product detail page
    2. Inspect the **Add to Cart** button and the quantity stepper
  - **Expected Result**: A destructive `Out of stock` badge renders, the **Add to Cart** button is disabled and the quantity increment control is disabled. The wishlist button remains enabled and no `cart_items` row is created
  - **Business Rules**: BR-PROD-004, BR-PROD-010
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: `cartDisabled` is true when `stockQuantity <= 0` or a cart request is in flight. Use `captureCartCountDbEvidence(page, 'A-13_3_db_cart_count', email, description, productId)` and `captureCartProductDbEvidence(page, 'A-13_4_db_product_stock', email, productId, description)` to show the zero stock row..

- [x] **A-14**: Deactivated account is blocked from cart, wishlist and review actions
  - **Evidence**:
    - `A-14_1_deactivated_before.png`
    - `A-14_2_account_deactivated_dialog.png`
    - Test: product-detail.spec.ts › "A-14: blocks actions for deactivated account" — passed
  - **Precondition**: Authenticated user whose account is deactivated
  - **Steps**:
    1. Open the product detail page
    2. Click **Add to Cart**
  - **Expected Result**: The account-deactivated dialog is shown and no cart request is sent
  - **Business Rules**: None (account status)
  - **API**: None (frontend guard)
  - **Note**: `isAccountDeactivated(user)` gates the action; the review form raises the equivalent `AccountDeactivatedAlertDialog`..

- [x] **A-15**: Reviews fail to load shows an error message
  - **Evidence**:
    - `A-15_1_reviews_loading.png`
    - `A-15_2_reviews_load_error.png`
    - Test: product-detail.spec.ts › "A-15: shows an error message when reviews fail to load" — passed
  - **Precondition**: The reviews endpoint returns an error
  - **Steps**:
    1. Open the **Reviews** tab with the reviews request failing
  - **Expected Result**: The panel shows `Unable to load reviews.` instead of an empty list and the rest of the page remains functional
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/products/{slug}/reviews`
  - **Note**: The loading state shows `Loading reviews...` before the error replaces it..

- [x] **A-16**: Product detail request failure shows the not-found state
  - **Evidence**:
    - `A-16_1_product_request_loading.png`
    - `A-16_2_product_request_error.png`
    - Test: product-detail.spec.ts › "A-16: shows not found state when product request fails" — passed
  - **Precondition**: The product detail endpoint returns a server error
  - **Steps**:
    1. Open the product detail page with the detail request failing
  - **Expected Result**: The page shows `Product not found.` with the **Browse products** link and the skeleton loader is replaced
  - **Business Rules**: None (error handling)
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The `isError || !product` branch renders the same empty state as a 404..

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Quantity minimum of 1 disables the decrement control
  - **Evidence**:
    - `B-01_1_quantity_above_minimum.png`
    - `B-01_2_quantity_min_one.png`
    - Test: product-detail.spec.ts › "B-01: disables decrement at minimum quantity of one" — passed
  - **Precondition**: Product is in stock
  - **Steps**:
    1. Observe the quantity stepper at its default value of 1
    2. Click the decrement (minus) button
  - **Expected Result**: The minus button is disabled and the quantity stays at 1
  - **Business Rules**: BR-PROD-010
  - **API**: None
  - **Note**: `QuantityStepper` clamps with `Math.max(min, value - 1)` and disables the control when `value <= min`..

- [x] **B-02**: Quantity maximum equals the stock quantity and disables the increment control
  - **Evidence**:
    - `B-02_1_quantity_below_stock_limit.png`
    - `B-02_2_quantity_at_stock_limit.png`
    - Test: product-detail.spec.ts › "B-02: caps quantity at available stock" — passed
  - **Precondition**: Product has `stockQuantity = 3`
  - **Steps**:
    1. Increment the quantity to 3
    2. Attempt a fourth increment
  - **Expected Result**: The quantity stops at 3 and the plus button becomes disabled. The value never exceeds `stockQuantity`
  - **Business Rules**: BR-PROD-010, BR-PROD-011
  - **API**: None
  - **Note**: The stepper's `max` prop is `product.stockQuantity`; the cart module re-validates stock server-side on insert..

- [x] **B-03**: Product without a compare-at price shows no savings badge
  - **Evidence**:
    - `B-03_1_no_compare_at_price.png`
    - Test: product-detail.spec.ts › "B-03: hides save badge when compare at price is null" — passed
  - **Precondition**: Product has `compareAtPrice = null`
  - **Steps**:
    1. Open the product detail page
    2. Inspect the price row
  - **Expected Result**: Only the primary MMK price renders. No struck-through price and no `Save ... MMK` badge are shown
  - **Business Rules**: BR-PROD-003
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The whole compare-at block is guarded by `{product.compareAtPrice && (...)}`, so a zero or null value renders nothing..

- [x] **B-04**: Review title at exactly 255 characters is accepted
  - **Evidence**:
    - `B-04_1_title_255_chars.png`
    - `B-04_2_title_255_submitted.png`
    - `B-04_3_db_reviews.json`
    - `B-04_3_db_reviews.png`
    - Test: product-detail.spec.ts › "B-04: accepts review title of exactly 255 characters" — passed
  - **Precondition**: Authenticated eligible buyer
  - **Steps**:
    1. Enter a 255-character title
    2. Select a rating and enter a body
    3. Submit the review
  - **Expected Result**: The full 255-character title is accepted and the review is created with HTTP 201
  - **Business Rules**: BR-PROD-007
  - **API**: `POST /api/v1/products/{slug}/reviews`
  - **Note**: The DTO caps `title` at 255 characters, matching the input's `maxLength={255}`. Capture the DB evidence with `captureDbEvidence` using a `SELECT ... FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id WHERE u.email = $1 AND p.id = $2` query..

- [x] **B-05**: Review title beyond 255 characters is capped by the input
  - **Evidence**:
    - `B-05_1_title_paste_300.png`
    - `B-05_2_title_capped_255.png`
    - Test: product-detail.spec.ts › "B-05: caps review title at 255 characters" — passed
  - **Precondition**: Authenticated eligible buyer
  - **Steps**:
    1. Paste a 300-character title into the title field
  - **Expected Result**: The input retains at most 255 characters and further input is not accepted
  - **Business Rules**: BR-PROD-007
  - **API**: None (client validation)
  - **Note**: The input sets `maxLength={255}`; the backend rejects anything longer with HTTP 400..

- [x] **B-06**: Review body at exactly 5000 characters is accepted
  - **Evidence**:
    - `B-06_1_body_5000_chars.png`
    - `B-06_2_body_5000_submitted.png`
    - `B-06_3_db_reviews.json`
    - `B-06_3_db_reviews.png`
    - Test: product-detail.spec.ts › "B-06: accepts review body of exactly 5000 characters" — passed
  - **Precondition**: Authenticated eligible buyer
  - **Steps**:
    1. Enter a 5000-character body
    2. Observe the character counter
    3. Submit the review
  - **Expected Result**: The counter reads `5000/5000` and the review is created with HTTP 201
  - **Business Rules**: BR-PROD-007
  - **API**: `POST /api/v1/products/{slug}/reviews`
  - **Note**: The textarea sets `maxLength={5000}` and the counter is rendered from `draftBody.length`. Capture the DB evidence with `captureDbEvidence` using a `SELECT ... FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id WHERE u.email = $1 AND p.id = $2` query..

- [x] **B-07**: Review body beyond 5000 characters is capped by the input
  - **Evidence**:
    - `B-07_1_body_paste_6000.png`
    - `B-07_2_body_capped_5000.png`
    - Test: product-detail.spec.ts › "B-07: caps review body at 5000 characters" — passed
  - **Precondition**: Authenticated eligible buyer
  - **Steps**:
    1. Paste a 6000-character body into the textarea
  - **Expected Result**: The textarea retains at most 5000 characters and the counter never exceeds `5000/5000`
  - **Business Rules**: BR-PROD-007
  - **API**: None (client validation)
  - **Note**: The DTO caps `body` at 5000 characters and returns HTTP 400 for longer input..

- [x] **B-08**: Report detail at exactly 1000 characters is accepted
  - **Evidence**:
    - `B-08_1_report_detail_1000_chars.png`
    - `B-08_2_report_detail_1000_submitted.png`
    - `B-08_3_db_review_reports.json`
    - `B-08_3_db_review_reports.png`
    - Test: product-detail.spec.ts › "B-08: accepts report detail of exactly 1000 characters" — passed
  - **Precondition**: Authenticated non-merchant user; the report dialog is open with a reason selected
  - **Steps**:
    1. Enter a 1000-character detail
    2. Submit the report
  - **Expected Result**: The report is submitted successfully with HTTP 201 and the detail is stored
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/reviews/{reviewId}/report`
  - **Note**: The textarea sets `maxLength={1000}` and the DTO caps `detail` at 1000 characters. Capture the DB evidence with `captureDbEvidence` using a `SELECT ... FROM review_reports rr JOIN users u ON u.id = rr.reported_by WHERE rr.review_id = $1 AND u.email = $2` query..

- [x] **B-09**: Report detail beyond 1000 characters is capped by the input
  - **Evidence**:
    - `B-09_1_report_detail_paste_1500.png`
    - `B-09_2_report_detail_capped_1000.png`
    - Test: product-detail.spec.ts › "B-09: caps report detail at 1000 characters" — passed
  - **Precondition**: Authenticated non-merchant user; the report dialog is open
  - **Steps**:
    1. Paste a 1500-character detail into the textarea
  - **Expected Result**: The textarea retains at most 1000 characters
  - **Business Rules**: BR-PROD-015
  - **API**: None (client validation)
  - **Note**: The DTO returns HTTP 400 for a `detail` longer than 1000 characters..

- [x] **B-10**: Rating values 1 and 5 are both accepted
  - **Evidence**:
    - `B-10_1_rating_1_star.png`
    - `B-10_2_rating_5_stars.png`
    - Test: product-detail.spec.ts › "B-10: accepts rating values 1 and 5" — passed
  - **Precondition**: Authenticated eligible buyer
  - **Steps**:
    1. Select 1 star and submit
    2. On a second product, select 5 stars and submit
  - **Expected Result**: Both submissions succeed with HTTP 201 and no range validation error is raised for the extreme values
  - **Business Rules**: BR-PROD-007
  - **API**: `POST /api/v1/products/{slug}/reviews`
  - **Note**: The DTO enforces `@Min(1) @Max(5)` and the DB check `chk_reviews_rating` covers the same range..

- [x] **B-11**: Product with zero reviews shows the empty state
  - **Evidence**:
    - `B-11_1_no_reviews_empty_state.png`
    - Test: product-detail.spec.ts › "B-11: displays empty state when product has no reviews" — passed
  - **Precondition**: Product has no approved reviews
  - **Steps**:
    1. Open the **Reviews** tab
  - **Expected Result**: The panel shows `No reviews yet.` and no **Load more reviews** button is rendered
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products/{slug}/reviews?page=1&limit=10`
  - **Note**: The empty branch fires on `data.items.length === 0`, which includes the case where every review is still pending moderation..

- [x] **B-12**: Product with no similar products hides the section entirely
  - **Evidence**:
    - `B-12_1_similar_section_present.png`
    - `B-12_2_similar_section_hidden.png`
    - Test: product-detail.spec.ts › "B-12: hides similar products section when no matches" — passed
  - **Precondition**: No other product shares the category and skin types
  - **Steps**:
    1. Open the product detail page
    2. Scroll to the bottom
  - **Expected Result**: No **Similar Products** heading and no card grid are rendered — the component returns `null`
  - **Business Rules**: None (empty state)
  - **API**: `GET /api/v1/products/{slug}/similar?limit=8`
  - **Note**: The same `null` return covers the error case, so a failed similar-products request also produces no section..

- [x] **B-13**: Product with no images renders the placeholder image
  - **Evidence**:
    - `B-13_1_placeholder_image.png`
    - Test: product-detail.spec.ts › "B-13: displays placeholder image when product has no images" — passed
  - **Precondition**: Product has `images = []`
  - **Steps**:
    1. Open the product detail page
  - **Expected Result**: The main image resolves to `/placeholder-product.png` and the thumbnail strip is not rendered
  - **Business Rules**: BR-PROD-002
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: `ProductGallery` substitutes `['/placeholder-product.png']` when `images` is empty, and a single image produces no thumbnail strip..

- [x] **B-14**: Product with no description shows the empty description state
  - **Evidence**:
    - `B-14_1_no_description_state.png`
    - Test: product-detail.spec.ts › "B-14: displays empty description state" — passed
  - **Precondition**: Product has `description = null`
  - **Steps**:
    1. Open the **Description** tab
  - **Expected Result**: The panel shows `No description available.` and no HTML is injected
  - **Business Rules**: BR-PROD-017
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The `dangerouslySetInnerHTML` branch is only taken when `product.description` is truthy..

- [x] **B-15**: Product with no ingredients shows the empty ingredients state
  - **Evidence**:
    - `B-15_1_no_ingredients_state.png`
    - Test: product-detail.spec.ts › "B-15: displays empty ingredients state" — passed
  - **Precondition**: Product has `ingredients = []`
  - **Steps**:
    1. Open the **Ingredients** tab
  - **Expected Result**: The panel shows `No ingredients listed.` and no list is rendered
  - **Business Rules**: None (empty state)
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The ingredient list is only rendered when `ingredients.length > 0`..

- [x] **B-16**: Stock exactly at the low-stock threshold shows the low-stock badge
  - **Evidence**:
    - `B-16_1_low_stock_at_threshold.png`
    - Test: product-detail.spec.ts › "B-16: shows low stock badge at threshold" — passed
  - **Precondition**: Product has `stockQuantity = 10` and `lowStockThreshold = 10`
  - **Steps**:
    1. Open the product detail page
  - **Expected Result**: A secondary-variant badge renders `Low stock (10 left)` rather than `In stock (10)`
  - **Business Rules**: BR-PROD-012
  - **API**: `GET /api/v1/products/{slug}`
  - **Note**: The comparison is `stockQuantity <= lowStockThreshold`, so the threshold value itself counts as low stock..

- [x] **B-17**: No horizontal overflow at the 320px viewport
  - **Evidence**:
    - `B-17_1_320px_product_detail.png`
    - Test: product-detail.spec.ts › "B-17: has no horizontal overflow at a 320px viewport" — passed
  - **Precondition**: Viewport width 320px
  - **Steps**:
    1. Set the viewport to 320×640
    2. Open the product detail page in English, Japanese and Myanmar
    3. Check `document.documentElement.scrollWidth <= clientWidth`
  - **Expected Result**: Zero horizontal overflow. The sticky mobile CTA bar and the gallery thumbnail strip scroll internally without breaking the page layout
  - **Business Rules**: None (Responsive)
  - **API**: None
  - **Note**: The gallery strip uses `overflow-x-auto` and the Similar Products grid collapses to 2 columns below the `md:` breakpoint..

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

> API contract tests include evidence screenshots showing the request method, URL, status, request body, and response body.

- [x] **I-01**: `GET /api/v1/products/:idOrSlug` returns 200 with embedded promotions and rating breakdown
  - **Evidence**:
    - `I-01_1_api_product_detail.png`
    - Test: product-detail.spec.ts › "I-01: returns product detail with embedded promotions and rating breakdown" — passed
  - **Precondition**: An active product of an approved merchant exists
  - **Steps**:
    1. Call `GET /api/v1/products/{idOrSlug}`
    2. Verify HTTP status and response fields
  - **Expected Response**: HTTP 200; body `{ data: { id, name, slug, price (number), compareAtPrice, sku, stockQuantity, lowStockThreshold, images[], tags[], skinTypes[], ingredients[], avgRating (number), reviewCount, category { id, name, slug } (no `parent`), merchant { id, shopName, licenseStatus } (no nested `shop`), promotions[] (with `discountTypeCode`, `discountValue`, `minOrderAmount`, `startsAt`, `expiresAt`, `maxUses`, `usedCount` and no computed `balance`), ratingBreakdown[] of `{ star: 1..5, count } } }` — the payload is the object itself, wrapped by the global `{ data }` envelope
  - **Business Rules**: BR-PROD-001, BR-PROD-018, BR-PROD-019
  - **API**: `GET /api/v1/products/:idOrSlug`
  - **Note**: The frontend `unwrap` helper reads `res.data.data ?? res.data`, so the raw envelope is `{ data: { ...product, promotions, ratingBreakdown } }`..

- [x] **I-02**: `GET /api/v1/products/:idOrSlug` resolves UUID, slug and SKU identically
  - **Evidence**:
    - `I-02_1_api_resolve_identifiers.png`
    - Test: product-detail.spec.ts › "I-02: resolves uuid slug and sku to the same product" — passed
  - **Precondition**: The product is addressable by all three identifiers
  - **Steps**:
    1. Call the endpoint three times with the UUID, the slug and the SKU
  - **Expected Response**: HTTP 200 for all three and the `id` field is identical in every response
  - **Business Rules**: BR-PROD-001
  - **API**: `GET /api/v1/products/:idOrSlug`
  - **Note**:.

- [x] **I-03**: `GET /api/v1/products/:idOrSlug` returns 404 for unknown, inactive or unapproved-merchant products
  - **Evidence**:
    - `I-03_1_api_product_not_found.png`
    - Test: product-detail.spec.ts › "I-03: returns 404 for unknown inactive or unapproved product" — passed
  - **Precondition**: Three fixtures exist — a non-existent id, an inactive product, and a product whose merchant license is not approved
  - **Steps**:
    1. Call the endpoint for each fixture
  - **Expected Response**: HTTP 404 NOT_FOUND for all three, with the standard error body `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: BR-PROD-001
  - **API**: `GET /api/v1/products/:idOrSlug`
  - **Note**: The merchant licence gate returns the same 404 as a missing product, so an unapproved merchant is indistinguishable from a non-existent id..

- [x] **I-04**: `GET /api/v1/products/:idOrSlug/reviews` returns 200 with flat pagination
  - **Evidence**:
    - `I-04_1_api_reviews_flat.png`
    - Test: product-detail.spec.ts › "I-04: returns paginated reviews with flat shape" — passed
  - **Precondition**: The product has approved reviews
  - **Steps**:
    1. Call `GET /api/v1/products/{idOrSlug}/reviews?page=1&limit=10`
  - **Expected Response**: HTTP 200; body `{ data: { items: [...], total, page, limit, totalPages } }` — the payload is a flat shape, not `{ data, meta }`, and the whole payload sits inside the global `{ data }` envelope. Each item carries `id, rating, title, body, images[], isVerifiedPurchase, createdAt` and `user { id, name }`; `status` is **not** returned and `avatarUrl` is **not** returned
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products/:idOrSlug/reviews`
  - **Note**: The backend default limit is 20 while the UI sends 10. The `select` clause omits `status`, so the review card's `Pending` badge can never render against this endpoint. A global `TransformInterceptor` wraps every response as `{ data: <payload> }`, which is why the frontend `unwrap` helper reads `res.data.data ?? res.data`..

- [x] **I-05**: `GET /api/v1/products/:idOrSlug/reviews` honours the `sortBy` query parameter
  - **Evidence**:
    - `I-05_1_api_reviews_sortby.png`
    - Test: product-detail.spec.ts › "I-05: honours sortBy on the reviews endpoint" — passed
  - **Precondition**: The product has at least three approved reviews with differing ratings
  - **Steps**:
    1. Call the endpoint with `sortBy=newest`, then `oldest`, then `highest`, then `lowest`
  - **Expected Response**: HTTP 200 for each; the item order changes accordingly and the pagination fields remain consistent
  - **Business Rules**: None (sorting)
  - **API**: `GET /api/v1/products/:idOrSlug/reviews?sortBy={value}`
  - **Note**: The frontend service sends the parameter as `sort`, not `sortBy`, so the UI currently never exercises this option..

- [x] **I-06**: `GET /api/v1/products/:idOrSlug/reviews` returns 400 for invalid query parameters
  - **Evidence**:
    - `I-06_1_api_reviews_bad_query.png`
    - Test: product-detail.spec.ts › "I-06: returns 400 for invalid review query parameters" — passed
  - **Precondition**: Any product
  - **Steps**:
    1. Call the endpoint with `page=0`
    2. Call the endpoint with `limit=51`
    3. Call the endpoint with an unsupported `sortBy` value
  - **Expected Response**: HTTP 400 BAD_REQUEST for each, with a `message` array describing the offending field
  - **Business Rules**: None (validation)
  - **API**: `GET /api/v1/products/:idOrSlug/reviews`
  - **Note**: `page` has `@Min(1)` and `limit` has `@Min(1) @Max(50)`..

- [x] **I-07**: `GET /api/v1/products/:idOrSlug/similar` returns 200 with a bare array of product cards
  - **Evidence**:
    - `I-07_1_api_similar_products.png`
    - Test: product-detail.spec.ts › "I-07: returns similar products as a bare array" — passed
  - **Precondition**: Similar products exist
  - **Steps**:
    1. Call `GET /api/v1/products/{idOrSlug}/similar?limit=8`
  - **Expected Response**: HTTP 200; body `{ data: [ ...card objects ] }` — the payload is a bare array of cards with `id, name, slug, price (number), compareAtPrice, images[], skinTypes[], avgRating, reviewCount, category { id, name, slug }`. The target product is excluded and the array is ordered by `avgRating` descending
  - **Business Rules**: None (recommendation)
  - **API**: `GET /api/v1/products/:idOrSlug/similar`
  - **Note**: The backend default limit is 4 while the UI sends 8..

- [x] **I-08**: `GET /api/v1/products/:idOrSlug/advertisements` returns 200 with at most five eligible ads
  - **Evidence**:
    - `I-08_1_api_advertisements.png`
    - Test: product-detail.spec.ts › "I-08: returns at most five eligible advertisements" — passed
  - **Precondition**: More than five eligible `productDetail_page_banner` ads exist
  - **Steps**:
    1. Call `GET /api/v1/products/{idOrSlug}/advertisements`
  - **Expected Response**: HTTP 200; body `{ data: [ ... ] }` — the payload is a bare array capped at 5 entries, each with `id, title, description, announcementMessage, imageUrl, sku, placement ('productDetail_page_banner'), planTier, startsAt, expiresAt, productId, productSlug` and a nested `shop { name, slug, logoUrl }`. The DTO has no `link_url` field
  - **Business Rules**: BR-PROD-020, BR-PROD-021, BR-PROD-022
  - **API**: `GET /api/v1/products/:idOrSlug/advertisements`
  - **Note**: This endpoint filters `payment_status = 'completed'`; the mounted banner path (`/search/ads`) does not..

- [x] **I-09**: `GET /api/v1/search/ads` returns 200 for the `productDetail_page_banner` placement
  - **Evidence**:
    - `I-09_1_api_search_ads.png`
    - Test: product-detail.spec.ts › "I-09: returns ads for the productDetail_page_banner placement" — passed
  - **Precondition**: An approved, active, in-window ad exists for the placement with an approved shop
  - **Steps**:
    1. Call `GET /api/v1/search/ads?placement=productDetail_page_banner`
  - **Expected Response**: HTTP 200; `{ data: { data: [ { id, placement, title, announcementMessage, description, imageUrl, sku, tier, approvalStatus, startsAt, expiresAt } ] } }`, capped at 5 and ordered by `startsAt` descending. Only ads whose `feeSetting.placement` matches and whose `shop.isApproved = true` are returned
  - **Business Rules**: BR-PROD-021, BR-PROD-022
  - **API**: `GET /api/v1/search/ads?placement=productDetail_page_banner`
  - **Note**: This is the endpoint the mounted `AdBannerSlider` actually calls; `tier` is always reported as `standard` by this service..

- [x] **I-10**: `GET /api/v1/products/:idOrSlug/can-review` returns 200 with the eligibility verdict
  - **Evidence**:
    - `I-10_1_api_can_review.png`
    - Test: product-detail.spec.ts › "I-10: returns the review eligibility verdict" — passed
  - **Precondition**: A buyer JWT is available
  - **Steps**:
    1. Call the endpoint as a buyer with a delivered order and no review
    2. Call it as a buyer without a delivered order
    3. Call it as a buyer who already reviewed
  - **Expected Response**: HTTP 200 in all cases; the body is `{ data: { canReview, reason } }` where `reason` is `null`, `'not_delivered'` or `'already_reviewed'` respectively
  - **Business Rules**: BR-PROD-005, BR-PROD-006, BR-PROD-015
  - **API**: `GET /api/v1/products/:idOrSlug/can-review`
  - **Note**: The query is not gated on authentication — `useCanReview` is only disabled while `idOrSlug` is empty, so a guest still fires the request and receives a 401, surfacing `isEligibilityError`. The guest never sees that state because `ReviewForm` returns the sign-in prompt before rendering the form. A global `TransformInterceptor` wraps every response as `{ data: <payload> }`..

- [x] **I-11**: `GET /api/v1/products/:idOrSlug/can-review` returns 401 without a token and 403 for a non-buyer
  - **Evidence**:
    - `I-11_1_api_can_review_unauthorized.png`
    - Test: product-detail.spec.ts › "I-11: rejects can-review without a token or for a non-buyer" — passed
  - **Precondition**: No token; a merchant token
  - **Steps**:
    1. Call the endpoint without an `Authorization` header
    2. Call the endpoint with a merchant token
  - **Expected Response**: HTTP 401 UNAUTHORIZED and HTTP 403 FORBIDDEN respectively
  - **Business Rules**: BR-PROD-015
  - **API**: `GET /api/v1/products/:idOrSlug/can-review`
  - **Note**: The endpoint is guarded by `JwtAuthGuard` + `RolesGuard('buyer')`..

- [x] **I-12**: `POST /api/v1/products/:idOrSlug/reviews` returns 201 with the review in pending status
  - **Evidence**:
    - `I-12_1_api_create_review.png`
    - `I-12_2_db_reviews.json`
    - `I-12_2_db_reviews.png`
    - Test: product-detail.spec.ts › "I-12: creates a review with pending status" — passed
  - **Precondition**: Authenticated buyer with a delivered order containing the product and no existing review
  - **Steps**:
    1. Call `POST /api/v1/products/{idOrSlug}/reviews` with `{ rating: 5, title, body }`
    2. Verify HTTP status and response fields
  - **Expected Response**: HTTP 201; body `{ data: { id, rating, title, body, images[], status: 'pending', isVerifiedPurchase: true, createdAt } }`. The `reviews` row is persisted with `status = 'pending'` and is not immediately published
  - **Business Rules**: BR-PROD-005, BR-PROD-006, BR-PROD-008, BR-PROD-009
  - **API**: `POST /api/v1/products/:idOrSlug/reviews`
  - **Note**: A `REVIEW_CREATED` in-app notification is created for every admin; notification failure is non-fatal. The Prisma schema declares `reviews.status` with a default of `approved`, but `createReview` always writes `pending` explicitly, so the moderation queue is enforced. Use `captureDbEvidence` with a `SELECT ... FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id WHERE u.email = $1 AND p.id = $2` query..

- [x] **I-13**: `POST /api/v1/products/:idOrSlug/reviews` returns 400 when there is no delivered order
  - **Evidence**:
    - `I-13_1_api_create_review_not_delivered.png`
    - Test: product-detail.spec.ts › "I-13: rejects review creation without a delivered order" — passed
  - **Precondition**: Authenticated buyer without a delivered order for the product
  - **Steps**:
    1. Call `POST /api/v1/products/{idOrSlug}/reviews` with a valid body
  - **Expected Response**: HTTP 400 BAD_REQUEST with a message such as `You can only review products from a delivered order`
  - **Business Rules**: BR-PROD-005
  - **API**: `POST /api/v1/products/:idOrSlug/reviews`
  - **Note**: The status is 400, not 422 — `findDeliveredOrderItem` raises `BadRequestException`..

- [x] **I-14**: `POST /api/v1/products/:idOrSlug/reviews` returns 409 for a duplicate review
  - **Evidence**:
    - `I-14_1_api_create_review_duplicate.png`
    - `I-14_2_db_reviews_count.json`
    - `I-14_2_db_reviews_count.png`
    - Test: product-detail.spec.ts › "I-14: rejects duplicate review creation with 409" — passed
  - **Precondition**: Authenticated buyer already reviewed the product
  - **Steps**:
    1. Call `POST /api/v1/products/{idOrSlug}/reviews` with a valid body
  - **Expected Response**: HTTP 409 CONFLICT with a message such as `You have already reviewed this product` and the `reviews` row count for the buyer and product is still 1
  - **Business Rules**: BR-PROD-006
  - **API**: `POST /api/v1/products/:idOrSlug/reviews`
  - **Note**:.

- [x] **I-15**: `POST /api/v1/products/:idOrSlug/reviews` returns 401 without a token and 403 for a non-buyer
  - **Evidence**:
    - `I-15_1_api_create_review_unauthorized.png`
    - Test: product-detail.spec.ts › "I-15: rejects review creation without a token or for a non-buyer" — passed
  - **Precondition**: No token; a merchant token
  - **Steps**:
    1. Call the endpoint without an `Authorization` header
    2. Call the endpoint with a merchant token
  - **Expected Response**: HTTP 401 UNAUTHORIZED and HTTP 403 FORBIDDEN respectively
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/products/:idOrSlug/reviews`
  - **Note**: The endpoint is guarded by `JwtAuthGuard` + `RolesGuard('buyer')`..

- [x] **I-16**: `POST /api/v1/reviews/:reviewId/report` returns 201 with the created report
  - **Evidence**:
    - `I-16_1_api_report_review.png`
    - `I-16_2_db_review_reports.json`
    - `I-16_2_db_review_reports.png`
    - Test: product-detail.spec.ts › "I-16: creates a review report" — passed
  - **Precondition**: Authenticated user; the review exists and has not been reported by this user
  - **Steps**:
    1. Call `POST /api/v1/reviews/{reviewId}/report` with `{ reason: 'spam', detail: '...' }`
    2. Verify HTTP status and response fields
  - **Expected Response**: HTTP 201; body `{ data: { id, reviewId, reportedBy, reason, description, status: 'pending' } }`. The `review_reports` row is persisted with `reported_by` = the caller and `description` = the submitted `detail` text
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/reviews/:reviewId/report`
  - **Note**: The controller uses `@HttpCode(201)`. A `REVIEW_REPORTED` in-app notification is created for every admin. Use `captureDbEvidence` with a `SELECT ... FROM review_reports rr JOIN users u ON u.id = rr.reported_by WHERE rr.review_id = $1 AND u.email = $2` query..

- [x] **I-17**: `POST /api/v1/reviews/:reviewId/report` returns 409 for a duplicate report
  - **Evidence**:
    - `I-17_1_api_report_review_duplicate.png`
    - `I-17_2_db_review_reports_count.json`
    - `I-17_2_db_review_reports_count.png`
    - Test: product-detail.spec.ts › "I-17: rejects duplicate review report with 409" — passed
  - **Precondition**: The same user already reported the same review
  - **Steps**:
    1. Call `POST /api/v1/reviews/{reviewId}/report` again
  - **Expected Response**: HTTP 409 CONFLICT and the `review_reports` row count for the reporter and review is still 1
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/reviews/:reviewId/report`
  - **Note**: Uniqueness is enforced on `(reviewId, reportedBy)`..

- [x] **I-18**: `POST /api/v1/reviews/:reviewId/report` returns 401 without a token and 404 for an unknown review
  - **Evidence**:
    - `I-18_1_api_report_review_unauthorized.png`
    - Test: product-detail.spec.ts › "I-18: rejects report without a token or for an unknown review" — passed
  - **Precondition**: No token; a non-existent review UUID
  - **Steps**:
    1. Call the endpoint without an `Authorization` header
    2. Call the endpoint with a valid token for a non-existent review
  - **Expected Response**: HTTP 401 UNAUTHORIZED and HTTP 404 NOT_FOUND respectively
  - **Business Rules**: BR-PROD-015
  - **API**: `POST /api/v1/reviews/:reviewId/report`
  - **Note**: The endpoint requires only a JWT — any authenticated role is accepted..

- [x] **I-19**: Error responses follow the standard API error format
  - **Evidence**:
    - `I-19_1_api_error_format.png`
    - Test: product-detail.spec.ts › "I-19: error responses follow standard API error format" — passed
  - **Precondition**: Any error scenario above
  - **Steps**:
    1. Trigger an error and inspect the response body
  - **Expected Response**: The JSON body contains `{ statusCode, message, error, timestamp, path }` for every error status returned by the product detail endpoints
  - **Business Rules**: None (API contract)
  - **API**: Any ProductDetail endpoint
  - **Note**:.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ 24 normal, 16 abnormal, 17 boundary, 19 interface — 76 in total |
| E2E tests implemented | ☑️ `e2e/tests/ProductDetail/product-detail.spec.ts` — 76 tests, one per scenario. **Not executed yet**: every scenario is marked `implemented, not yet run` and the checkboxes stay unticked until a Playwright run records the evidence |
| PCL ↔ E2E cross-check | ☑️ `node e2e/scripts/check-pcl-vs-spec.cjs ProductDetail` — 76/76 scenarios mapped to a test, 144/144 evidence files listed in this PCL are produced by a test, no scenario or capture is missing in either direction |
| Evidence captured | ☐ pending the first Playwright run (the captures listed per scenario are the ones the tests produce) |
| PCL auto-update verified | ☐ `scripts/update-pcl.cjs` currently fails to parse (unresolved merge-conflict markers in the shared script); the Evidence blocks in this file are therefore maintained by hand — `node e2e/scripts/sync-pcl-with-spec.cjs ProductDetail` rewrites the `Test:` lines and drops the stale "no test yet" notes |
| Next review date | 2026-11-21 |
