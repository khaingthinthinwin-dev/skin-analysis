# Program Checklist (PCL) — Product Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-PROD-001 |
| **Target Screen** | Product Management (`/merchant/products`) |
| **Subsystem** | Merchant Product Catalog |
| **Version** | 2.0 |
| **Created** | 2026-08-10 |
| **Last Updated** | 2026-10-15 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: View product list as approved merchant
  - **Precondition**: User is authenticated as an approved merchant with active status (`licenseStatus === 'approved'`, `isActive === true`)
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Page header displays "Product Management" with subtitle and "Add New Product" button; table renders with columns: Select All Checkbox, Image, Product Name, SKU, Price (Discount Price), Compare At Price, Stock, Status, isFeatured, and Actions
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products`

- [x] **N-02**: Navigate to Create Product page
  - **Precondition**: User is authenticated as an approved merchant on `/merchant/products`
  - **Steps**:
    1. Click "Add New Product" button in the page header
  - **Expected Result**: Application navigates to `/merchant/products/new`
  - **Business Rules**: BR-PROD-001
  - **API**: None (client-side routing)

- [x] **N-03**: Navigate to Edit Product page via row action
  - **Precondition**: User is authenticated as an approved merchant with products in the table
  - **Steps**:
    1. Locate target product row in the table
    2. Click the Edit button (pencil icon) in the Actions column
  - **Expected Result**: Application navigates to `/merchant/products/:id/edit`
  - **Business Rules**: BR-PROD-005
  - **API**: None (client-side routing)

- [x] **N-04**: Toggle product active status (Active ⇄ Inactive)
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Locate target product row in the table
    2. Click the Status switch button in the Status column (`bg-green-500` for active, `bg-input` for inactive)
  - **Expected Result**: Switch flips visually, `PATCH /api/v1/products/bulk` fires with `{ ids: [id], action: 'activate' | 'deactivate' }`, and success toast ("Product activated" or "Product deactivated") is displayed
  - **Business Rules**: BR-PROD-014, BR-PROD-015
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **N-05**: Toggle product featured status
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Locate target product row in the table
    2. Click the isFeatured switch button in the isFeatured column
  - **Expected Result**: Switch flips visually, `PATCH /api/v1/products/:id/toggle-featured` fires, and success toast "Featured status updated" is displayed
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id/toggle-featured`

- [x] **N-06**: Update stock quantity inline via editor
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Hover over the Stock cell in a product row to reveal the Pencil button
    2. Click the Pencil button to open the inline number input
    3. Enter a new non-negative integer stock value
    4. Press Enter or click the Check button
  - **Expected Result**: Inline editor closes, `PATCH /api/v1/products/:id/stock` fires with `{ stockQuantity: value }`, success toast "Stock updated" is displayed, and the cell updates
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **N-07**: Cancel inline stock update without saving
  - **Precondition**: Inline stock editor is currently open on a product row
  - **Steps**:
    1. Modify the stock number inside the input
    2. Press Escape key or click the X (cancel) button
  - **Expected Result**: Inline editor closes, original stock value is preserved, and no API request is sent
  - **Business Rules**: None (UI Interaction)
  - **API**: None

- [x] **N-08**: Search products by keyword
  - **Precondition**: Merchant has multiple products listed
  - **Steps**:
    1. Type a query string into the "Search products..." input field in the filter bar
  - **Expected Result**: Search state updates, page resets to 1, query parameter `search` is sent to API, and table displays matching products
  - **Business Rules**: None (Search)
  - **API**: `GET /api/v1/products?search={query}&page=1&limit={limit}`

- [x] **N-09**: Filter products by status (All / Active / Inactive)
  - **Precondition**: Merchant has products in both active and inactive states
  - **Steps**:
    1. Click the Status filter dropdown in the filter bar
    2. Select "Active" (or "Inactive", or "All")
  - **Expected Result**: Page resets to 1, query parameter `isActive` (`true` / `false` / `undefined`) is applied, and table filters accordingly
  - **Business Rules**: None (Filter)
  - **API**: `GET /api/v1/products?isActive={true|false}&page=1&limit={limit}`

- [x] **N-10**: Sort products by criteria (Newest / Price / Rating / Name)
  - **Precondition**: Merchant has multiple products listed
  - **Steps**:
    1. Click the "Sort by" dropdown in the filter bar
    2. Select "Price" (or "Rating", "Name", "Newest")
  - **Expected Result**: `sortBy` query parameter updates and table re-orders rows accordingly
  - **Business Rules**: None (Sort)
  - **API**: `GET /api/v1/products?sortBy={criteria}`

- [x] **N-11**: Select individual products and select all via checkboxes
  - **Precondition**: Merchant has multiple products listed
  - **Steps**:
    1. Click the header checkbox ("Select all") to select all products on current page
    2. Click individual row checkboxes to toggle selection for specific items
  - **Expected Result**: Header checkbox reflects full/empty selection state, selected rows receive highlighted background (`bg-muted/30`), and selection array tracks chosen IDs
  - **Business Rules**: None (UI Selection)
  - **API**: None

- [x] **N-12**: Bulk delete selected products with confirmation breakdown
  - **Precondition**: Merchant has selected one or more products using checkboxes (no active orders)
  - **Steps**:
    1. Select products via checkboxes
    2. Click the "Delete" button in the filter bar
    3. Observe the "Delete Selected Products" confirmation dialog showing count breakdown (deactivated count, permanently deleted soft-deleted products, and skipped active order products)
    4. Click "Delete" in the dialog to confirm
  - **Expected Result**: `POST /api/v1/products/bulk-delete` executes, dialog closes, success toast shows deletion summary (e.g., "X deactivated, Y permanently deleted"), and selection is cleared
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **N-13**: Delete all products with confirmation breakdown (no selection)
  - **Precondition**: Merchant has products in catalog and no checkboxes are selected (`selectedIds.length === 0`)
  - **Steps**:
    1. Ensure no individual rows are selected
    2. Click the "Delete" button in the filter bar
    3. Observe the "Delete Products" dialog: "Are you sure you want to delete all X products?..." with breakdown
    4. Click "Delete" in the dialog to confirm
  - **Expected Result**: `DELETE /api/v1/products/all` executes with current filter parameters (`search`, `isActive`), dialog closes, success toast displays deletion summary (`{deactivated} deactivated, {permanentlyDeleted} permanently deleted, {skippedActiveOrders} skipped`), and list refreshes
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `DELETE /api/v1/products/all`

- [x] **N-14**: Highlight product row via URL query parameter (`highlightProductId`)
  - **Precondition**: Merchant navigates to `/merchant/products?highlightProductId={productId}` with a valid product ID
  - **Steps**:
    1. Open URL with `highlightProductId` parameter
  - **Expected Result**: The matching product row in the table is visually emphasized with an amber highlight ring and amber background tint (`bg-amber-50 dark:bg-amber-950/40 ring-2 ring-inset ring-amber-400/70`)
  - **Business Rules**: None (Deep Linking / UX)
  - **API**: `GET /api/v1/products`

- [x] **N-15**: Display discounted pricing and savings in product table
  - **Precondition**: Merchant has products with discounts (`compareAtPrice > price`) as well as regular prices
  - **Steps**:
    1. View product rows in table
  - **Expected Result**: Discounted products display the discounted selling price in bold with an emerald subtext "Saved {diff}", and Compare At Price shows regular price struck-through; non-discounted products display regular price in Compare At Price without strikethrough and a dash in Price
  - **Business Rules**: BR-PROD-002, BR-PROD-003
  - **API**: `GET /api/v1/products`

- [x] **N-16**: Paginate product list with page navigation and limit change
  - **Precondition**: Merchant has more products than the current page limit
  - **Steps**:
    1. Click "Next" or specific page number in PaginationControls
    2. Click "Previous" to navigate back
    3. Change page limit selector (e.g. 10 → 20)
  - **Expected Result**: Page state updates, table displays the corresponding slice of products, previous button is disabled on page 1, and changing limit resets page to 1
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?page={page}&limit={limit}`

- [x] **N-17**: Language toggle updates screen text
  - **Precondition**: User is on `/merchant/products`
  - **Steps**:
    1. Toggle language selector (English / Japanese / Myanmar)
  - **Expected Result**: All UI labels, table column headers, and placeholders update to the selected language
  - **Business Rules**: None (i18n)

- [x] **N-18**: Theme toggle switches light and dark modes
  - **Precondition**: User is on `/merchant/products`
  - **Steps**:
    1. Toggle theme selector
  - **Expected Result**: UI switches seamlessly between dark and light palettes
  - **Business Rules**: None (Theme)

- [x] **N-19**: Responsive layout on desktop and mobile viewports
  - **Precondition**: User views `/merchant/products` across viewport widths
  - **Steps**:
    1. View on desktop (1280x720)
    2. View on mobile (375x667)
  - **Expected Result**: Desktop shows full-width controls and action buttons; mobile shows stacked search/filter inputs and a horizontally scrollable table container (`overflow-x-auto`)
  - **Business Rules**: None (Responsive)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Access product management without authentication
  - **Precondition**: User is not logged in (no session / token)
  - **Steps**:
    1. Navigate directly to `/merchant/products`
  - **Expected Result**: User is immediately redirected to `/login`
  - **Business Rules**: BR-PROD-022
  - **API**: `GET /api/v1/products` (returns 401)

- [x] **A-02**: Pending merchant access — restricted UI and pending approval banner
  - **Precondition**: User is authenticated as a merchant with `licenseStatus === 'pending'`
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Warning banner "Account Pending" is displayed: "Your merchant account is currently pending admin approval..."; "Add New Product" button is hidden; "Delete" button is hidden; table selection checkboxes and Actions column are hidden; Status and Featured toggles render as read-only badges; Stock cells are read-only
  - **Business Rules**: BR-PROD-026, BR-PROD-027
  - **API**: `GET /api/v1/products`

- [x] **A-03**: Rejected merchant access — restricted UI and account rejected banner
  - **Precondition**: User is authenticated as a merchant with `licenseStatus === 'rejected'`
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Destructive banner "Account Rejected" is displayed with message and link "Go to Profile" (`/merchant/profile`); all CRUD buttons and interactive controls remain hidden
  - **Business Rules**: BR-PROD-026, BR-PROD-027
  - **API**: `GET /api/v1/products`

- [x] **A-04**: Deactivated merchant access — restricted UI and account deactivated banner
  - **Precondition**: User is authenticated as a merchant with deactivated status (`isActive === false` or `status === 'deactivated'`)
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Destructive banner "Account Deactivate" is displayed: "Your merchant account is currently Deactivate. Some features may be restricted until an admin activates your account."; all CRUD buttons and interactive controls are hidden
  - **Business Rules**: BR-PROD-026
  - **API**: `GET /api/v1/products`

- [x] **A-05**: Delete product with active orders — active order pre-check and skip breakdown
  - **Precondition**: Selected products include at least one product with active (non-delivered) orders
  - **Steps**:
    1. Select product with active orders via checkbox
    2. Click "Delete" button in filter bar
    3. Observe confirmation dialog description
  - **Expected Result**: `checkActiveOrdersMutate` detects active orders; dialog description states "{N} product(s) with active orders will be skipped"; confirming deletion skips those products and toast notifies the user of skipped count
  - **Business Rules**: BR-PROD-024, BR-PROD-025
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **A-06**: Inline stock editor rejects negative or non-numeric input
  - **Precondition**: Inline stock editor is open on a product row
  - **Steps**:
    1. Enter a negative value (e.g. -5) into the stock input field
    2. Press Enter
  - **Expected Result**: Editor blocks save (rejects `num < 0`), resets to original value, and does not dispatch API mutation
  - **Business Rules**: BR-PROD-018
  - **API**: None (client-side validation in `InlineStockEditor`)

- [x] **A-07**: Product list API failure displays error state with Retry button
  - **Precondition**: API endpoint fails (network error or server 500)
  - **Steps**:
    1. Navigate to `/merchant/products` while API fails
  - **Expected Result**: Loading spinner is replaced by an error card: "Failed to load products. Please try again." with a "Retry" button that reloads the page
  - **Business Rules**: None (Error Handling)
  - **API**: `GET /api/v1/products`

- [x] **A-08**: Stock update API error displays error toast and reverts
  - **Precondition**: Inline stock update fails on server (e.g. 500 or conflict)
  - **Steps**:
    1. Modify stock inline and submit
  - **Expected Result**: Error toast "Failed to update stock" is displayed; stock reverts to previous value
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **A-09**: Status toggle API error displays error toast and reverts
  - **Precondition**: Active status toggle fails on server
  - **Steps**:
    1. Click Status toggle switch on a product row
  - **Expected Result**: Error toast "Failed to [activate|deactivate] product" is displayed
  - **Business Rules**: BR-PROD-015
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **A-10**: Featured toggle API error displays error toast
  - **Precondition**: Featured status toggle fails on server
  - **Steps**:
    1. Click isFeatured toggle switch on a product row
  - **Expected Result**: Error toast "Failed to update featured status" is displayed
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id/toggle-featured`

- [x] **A-11**: Broken product image displays fallback "No img" placeholder
  - **Precondition**: Product image URL is invalid, returns 404, or fails to load
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Image element catches `onError` and renders fallback placeholder container with "No img" text
  - **Business Rules**: None (UI Resilience)
  - **API**: `GET /api/v1/products`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Empty state — catalog or filter returns zero products
  - **Precondition**: Merchant has 0 products in catalog (or search query yields no matches)
  - **Steps**:
    1. Navigate to `/merchant/products` with empty dataset
  - **Expected Result**: Table renders a single row spanning all columns displaying "No products found"; Delete button is hidden from action bar
  - **Business Rules**: None (UI Empty State)
  - **API**: `GET /api/v1/products`

- [x] **B-02**: Stock quantity at zero (Out of Stock indicator in destructive red)
  - **Precondition**: Product has `stockQuantity === 0`
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Stock number is rendered in destructive red text (`text-destructive`), visually flagging zero inventory
  - **Business Rules**: BR-PROD-020
  - **API**: `GET /api/v1/products`

- [x] **B-03**: Stock quantity at low stock threshold (1 to 10 in amber warning)
  - **Precondition**: Product has `stockQuantity > 0 && stockQuantity <= 10`
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Stock number is rendered in amber warning text (`text-amber-600`), visually flagging low stock
  - **Business Rules**: BR-PROD-019
  - **API**: `GET /api/v1/products`

- [x] **B-04**: Stock quantity above threshold (> 10 in standard neutral)
  - **Precondition**: Product has `stockQuantity > 10`
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Stock number is rendered in standard font color without low-stock warning highlights
  - **Business Rules**: None (Stock Display)
  - **API**: `GET /api/v1/products`

- [x] **B-05**: Long product name text truncation with ellipsis
  - **Precondition**: Product has a very long name (up to 255 characters)
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Product name truncates cleanly with ellipsis (`truncate max-w-0`), preserving table column alignment
  - **Business Rules**: BR-PROD-001
  - **API**: `GET /api/v1/products`

- [x] **B-06**: Pagination boundary — first page (Previous button disabled)
  - **Precondition**: Merchant is on page 1 of product list
  - **Steps**:
    1. Observe previous page button in PaginationControls
  - **Expected Result**: Previous page button is disabled; current page indicator displays "1"
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?page=1`

- [x] **B-07**: Pagination boundary — last page (Next button disabled)
  - **Precondition**: Merchant is on last page (`page === totalPages`)
  - **Steps**:
    1. Navigate to last page of product list
  - **Expected Result**: Next page button is disabled; table displays remaining products for the final page
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?page={totalPages}`

- [x] **B-08**: Page limit selection boundary (change items per page)
  - **Precondition**: Merchant has more than 10 products
  - **Steps**:
    1. Change items per page selector (e.g. from 10 to 20 or 50)
  - **Expected Result**: Page resets to 1, table updates to display new limit count of rows
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?limit={newLimit}&page=1`

- [x] **B-09**: Delete confirmation when zero products are selected (triggers Delete All flow)
  - **Precondition**: Merchant has products listed, selects 0 checkboxes, clicks "Delete"
  - **Steps**:
    1. With no products selected, click "Delete" button in filter bar
  - **Expected Result**: Dialog title displays "Delete Products", description asks "Are you sure you want to delete all {totalCount} products?...", and confirming triggers `useDeleteAll`
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `DELETE /api/v1/products/all`

- [x] **B-10**: Delete confirmation when exactly 1 product is selected (singular title/text)
  - **Precondition**: Exactly 1 product checkbox is selected
  - **Steps**:
    1. Check exactly 1 product checkbox
    2. Click "Delete" button in filter bar
  - **Expected Result**: Dialog title displays "Delete Selected Product" (singular), description states "Are you sure you want to delete this 1 product?..."
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **B-11**: Delete confirmation with all items on current page selected
  - **Precondition**: Header "Select all" checkbox is checked
  - **Steps**:
    1. Click header checkbox to select all rows
    2. Click "Delete" button in filter bar
  - **Expected Result**: Dialog title displays "Delete Selected Products", description confirms deleting all selected products
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **B-12**: Delete product already inactive (triggers permanent deletion breakdown)
  - **Precondition**: Selected product is already inactive (`isActive === false`)
  - **Steps**:
    1. Select an inactive product using checkbox
    2. Click "Delete" and observe breakdown in dialog
    3. Confirm deletion
  - **Expected Result**: Dialog description specifies "{N} soft-deleted product(s) will be permanently deleted"; when confirmed, product is permanently hard-deleted from database
  - **Business Rules**: BR-PROD-016
  - **API**: `POST /api/v1/products/bulk-delete`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/products` — fetches paginated product list for merchant
  - **Precondition**: User is authenticated as merchant
  - **Steps**:
    1. Send `GET /api/v1/products?page=1&limit=10&sortBy=newest` with auth headers
  - **Expected Response**: Status code 200, JSON `{ data: { items: [{ id, name, slug, price, compareAtPrice, stockQuantity, isActive, isFeatured, sku, images, ... }], meta: { page, limit, total, totalPages } } }`
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products`

- [x] **I-02**: `GET /api/v1/products` with query filters (`search`, `isActive`, `sortBy`, `page`, `limit`)
  - **Precondition**: Products exist in database
  - **Steps**:
    1. Send `GET /api/v1/products?search=cream&isActive=true&sortBy=price&page=1&limit=10`
  - **Expected Response**: Status code 200, JSON contains only active products matching query "cream" sorted by price
  - **Business Rules**: None (Filter/Search)
  - **API**: `GET /api/v1/products`

- [x] **I-03**: `PATCH /api/v1/products/:id/stock` — updates stock quantity inline
  - **Precondition**: Product belongs to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id/stock` with `{ stockQuantity: 25 }`
  - **Expected Response**: Status code 200, JSON `{ data: { id, stockQuantity: 25, isLowStock, isOutOfStock } }`
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **I-04**: `PATCH /api/v1/products/:id/stock` — returns 400 for negative stock value
  - **Precondition**: Product exists
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id/stock` with `{ stockQuantity: -5 }`
  - **Expected Response**: Status code 400 Bad Request, validation error message
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **I-05**: `PATCH /api/v1/products/:id/toggle-featured` — toggles featured flag
  - **Precondition**: Product belongs to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id/toggle-featured`
  - **Expected Response**: Status code 200, JSON `{ data: { id, isFeatured } }`
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id/toggle-featured`

- [x] **I-06**: `PATCH /api/v1/products/bulk` — bulk activates or deactivates products
  - **Precondition**: Valid product IDs belonging to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/bulk` with `{ ids: ["uuid1"], action: "deactivate" }`
  - **Expected Response**: Status code 200, JSON `{ data: { updated: 1 } }`
  - **Business Rules**: BR-PROD-015
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **I-07**: `POST /api/v1/products/check-active-orders` — pre-checks active orders before deletion
  - **Precondition**: Array of product IDs provided
  - **Steps**:
    1. Send `POST /api/v1/products/check-active-orders` with `{ ids: ["uuid1", "uuid2"] }`
  - **Expected Response**: Status code 200, JSON `{ data: { skippedIds: ["uuid2"] } }`
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`

- [x] **I-08**: `POST /api/v1/products/bulk-delete` — bulk soft/hard deletes selected products
  - **Precondition**: Array of product IDs provided
  - **Steps**:
    1. Send `POST /api/v1/products/bulk-delete` with `{ ids: ["uuid1", "uuid2"] }`
  - **Expected Response**: Status code 200, JSON `{ data: { deactivated: 1, permanentlyDeleted: 1, skippedIds: [] } }`
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `POST /api/v1/products/bulk-delete`

- [x] **I-09**: `DELETE /api/v1/products/all` — deletes all merchant products with active order skip
  - **Precondition**: User is authenticated as merchant
  - **Steps**:
    1. Send `DELETE /api/v1/products/all` with body `{ search?: string, isActive?: boolean }`
  - **Expected Response**: Status code 200, JSON `{ data: { deactivated: number, permanentlyDeleted: number, skippedActiveOrders: number } }`
  - **Business Rules**: BR-PROD-024
  - **API**: `DELETE /api/v1/products/all`

- [x] **I-10**: `DELETE /api/v1/products/:id` — single product soft delete
  - **Precondition**: Product belongs to merchant, has no active orders
  - **Steps**:
    1. Send `DELETE /api/v1/products/:id` with auth headers
  - **Expected Response**: Status code 200 or 204 No Content
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `DELETE /api/v1/products/:id`

- [x] **I-11**: `DELETE /api/v1/products/:id` — returns 409 Conflict when product has active orders
  - **Precondition**: Product has associated active orders (status !== 'delivered')
  - **Steps**:
    1. Send `DELETE /api/v1/products/:id` for product with active orders
  - **Expected Response**: Status code 409 Conflict, JSON `{ statusCode: 409, error: "CONFLICT", message: "Cannot delete product with active orders..." }`
  - **Business Rules**: BR-PROD-024, BR-PROD-025
  - **API**: `DELETE /api/v1/products/:id`

- [x] **I-12**: Error response follows standard API format
  - **Precondition**: Any API error (400, 401, 403, 404, 409, 500)
  - **Steps**:
    1. Trigger error on any product endpoint
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any endpoint

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| PCL auto-update verified | ☑️ |
| Next review date | 2026-11-15 |
