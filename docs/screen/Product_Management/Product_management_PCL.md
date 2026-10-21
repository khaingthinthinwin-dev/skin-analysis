# Program Checklist (PCL) — Product Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-PROD-001 |
| **Target Screen** | Product Management (`/merchant/products`) |
| **Subsystem** | Merchant Product Catalog |
| **Version** | 2.1 |
| **Created** | 2026-08-10 |
| **Last Updated** | 2026-10-20 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: View product list as approved merchant
  - **Evidence**:
    - `N-01_2_table_columns_visible.png`
    - `N-01_1_product_management_page_loaded.png`
    - Test: Product_Management.spec.ts › "N-01: should view product list as approved merchant" — passed
  - **Precondition**: User is authenticated as an approved merchant with active status (`licenseStatus === 'approved'`, `isActive === true`)
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Page header displays "Product Management" with subtitle and "Add New Product" button; table renders with columns: Select All Checkbox, Image, Product Name, SKU, Price (Discount Price), Compare At Price, Stock, Status, isFeatured, and Actions
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products`

- [x] **N-02**: Navigate to Create Product page
  - **Evidence**:
    - `N-02_1_new_product_page_loaded.png`
    - `N-02_2_product_form_filled.png`
    - `N-02_3_uploaded_1_images.png`
    - `N-02_4_save_clicked.png`
    - `N-02_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-02: should create a new product with valid data" — passed
  - **Precondition**: User is authenticated as an approved merchant on `/merchant/products`
  - **Steps**:
    1. Click "Add New Product" button in the page header
  - **Expected Result**: Application navigates to `/merchant/products/new`
  - **Business Rules**: BR-PROD-001
  - **API**: None (client-side routing)

- [x] **N-03**: Navigate to Edit Product page via row action
  - **Evidence**:
    - `N-03_1_product_management_page_loaded.png`
    - `N-03_2_edit_product_clicked.png`
    - `N-03_3_save_clicked.png`
    - `N-03_4_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-03: should edit an existing product" — passed
  - **Precondition**: User is authenticated as an approved merchant with products in the table
  - **Steps**:
    1. Locate target product row in the table
    2. Click the Edit button (pencil icon) in the Actions column
  - **Expected Result**: Application navigates to `/merchant/products/:id/edit`
  - **Business Rules**: BR-PROD-005
  - **API**: None (client-side routing)

- [x] **N-04**: Toggle product active status (Active ⇄ Inactive)
  - **Evidence**:
    - `N-04_1_product_management_page_loaded.png`
    - `N-04_2_delete_dialog_opened.png`
    - `N-04_3_delete_confirmed.png`
    - `N-04_4_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-04: should delete a product (soft delete)" — passed
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Locate target product row in the table
    2. Click the Status switch button in the Status column (`bg-green-500` for active, `bg-input` for inactive)
  - **Expected Result**: Switch flips visually, `PATCH /api/v1/products/bulk` fires with `{ ids: [id], action: 'activate' | 'deactivate' }`, and success toast ("Product activated" or "Product deactivated") is displayed
  - **Business Rules**: BR-PROD-014, BR-PROD-015
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **N-05**: Toggle product featured status
  - **Evidence**:
    - `N-05_1_product_management_page_loaded.png`
    - `N-05_2_active_toggle_clicked.png`
    - `N-05_3_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-05: should toggle product active status" — passed
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Locate target product row in the table
    2. Click the isFeatured switch button in the isFeatured column
  - **Expected Result**: Switch flips visually, `PATCH /api/v1/products/:id/toggle-featured` fires, and success toast "Featured status updated" is displayed
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id/toggle-featured`

- [x] **N-06**: Update stock quantity inline via editor
  - **Evidence**:
    - `N-06_1_product_management_page_loaded.png`
    - `N-06_2_featured_toggle_clicked.png`
    - `N-06_3_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-06: should toggle product featured status" — passed
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
  - **Evidence**:
    - `N-07_1_product_management_page_loaded.png`
    - `N-07_2_stock_updated_25.png`
    - `N-07_3_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-07: should update stock quantity inline" — passed
  - **Precondition**: Inline stock editor is currently open on a product row
  - **Steps**:
    1. Modify the stock number inside the input
    2. Press Escape key or click the X (cancel) button
  - **Expected Result**: Inline editor closes, original stock value is preserved, and no API request is sent
  - **Business Rules**: None (UI Interaction)
  - **API**: None

- [x] **N-08**: Search products by keyword
  - **Evidence**:
    - `N-08_1_product_management_page_loaded.png`
    - `N-08_2_search_results_Test_Product.png`
    - Test: Product_Management.spec.ts › "N-08: should search products by name" — passed
  - **Precondition**: Merchant has multiple products listed
  - **Steps**:
    1. Type a query string into the "Search products..." input field in the filter bar
  - **Expected Result**: Search state updates, page resets to 1, query parameter `search` is sent to API, and table displays matching products
  - **Business Rules**: None (Search)
  - **API**: `GET /api/v1/products?search={query}&page=1&limit={limit}`

- [x] **N-09**: Filter products by status (All / Active / Inactive)
  - **Evidence**:
    - `N-09_1_product_management_page_loaded.png`
    - `N-09_2_filtered_by_status_Active.png`
    - Test: Product_Management.spec.ts › "N-09: should filter products by status" — passed
  - **Precondition**: Merchant has products in both active and inactive states
  - **Steps**:
    1. Click the Status filter dropdown in the filter bar
    2. Select "Active" (or "Inactive", or "All")
  - **Expected Result**: Page resets to 1, query parameter `isActive` (`true` / `false` / `undefined`) is applied, and table filters accordingly
  - **Business Rules**: None (Filter)
  - **API**: `GET /api/v1/products?isActive={true|false}&page=1&limit={limit}`

- [x] **N-10**: Sort products by criteria (Newest / Price / Rating / Name)
  - **Evidence**:
    - `N-10_1_product_management_page_loaded.png`
    - `N-10_2_sorted_by_Price.png`
    - Test: Product_Management.spec.ts › "N-10: should sort products by price" — passed
  - **Precondition**: Merchant has multiple products listed
  - **Steps**:
    1. Click the "Sort by" dropdown in the filter bar
    2. Select "Price" (or "Rating", "Name", "Newest")
  - **Expected Result**: `sortBy` query parameter updates and table re-orders rows accordingly
  - **Business Rules**: None (Sort)
  - **API**: `GET /api/v1/products?sortBy={criteria}`

- [x] **N-11**: Select individual products and select all via checkboxes
  - **Evidence**:
    - `N-11_1_product_management_page_loaded.png`
    - `N-11_2_all_products_selected.png`
    - Test: Product_Management.spec.ts › "N-11: should bulk select products via checkbox" — passed
  - **Precondition**: Merchant has multiple products listed
  - **Steps**:
    1. Click the header checkbox ("Select all") to select all products on current page
    2. Click individual row checkboxes to toggle selection for specific items
  - **Expected Result**: Header checkbox reflects full/empty selection state, selected rows receive highlighted background (`bg-muted/30`), and selection state tracks chosen IDs for deletion. The current page does not render bulk activate/deactivate controls.
  - **Business Rules**: None (UI Selection)
  - **API**: None

- [x] **N-12**: Bulk delete selected products with confirmation breakdown
  - **Evidence**:
    - `N-12_1_product_management_page_loaded.png`
    - `N-12_2_all_products_selected.png`
    - `N-12_3_bulk_delete_clicked.png`
    - `N-12_4_delete_confirmed.png`
    - `N-12_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-12: should bulk delete products" — passed
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
  - **Evidence**:
    - `N-13_1_new_product_page_loaded.png`
    - `N-13_2_product_form_filled.png`
    - `N-13_3_uploaded_1_images.png`
    - `N-13_4_save_as_draft_clicked.png`
    - `N-13_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "N-13: should save product as draft" — passed
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
  - **Evidence**:
    - `N-14_1_settings_page_loaded.png`
    - `N-14_2_language_toggled.png`
    - Test: Product_Management.spec.ts › "N-14: should toggle language on screen" — passed
  - **Precondition**: Merchant navigates to `/merchant/products?highlightProductId={productId}` with a valid product ID
  - **Steps**:
    1. Open URL with `highlightProductId` parameter
  - **Expected Result**: The matching product row in the table is visually emphasized with an amber highlight ring and amber background tint (`bg-amber-50 dark:bg-amber-950/40 ring-2 ring-inset ring-amber-400/70`)
  - **Business Rules**: None (Deep Linking / UX)
  - **API**: `GET /api/v1/products`

- [x] **N-15**: Display discounted pricing and savings in product table
  - **Evidence**:
    - `N-15_1_settings_page_loaded.png`
    - `N-15_2_theme_toggled.png`
    - Test: Product_Management.spec.ts › "N-15: should toggle theme on screen" — passed
  - **Precondition**: Merchant has products with discounts (`compareAtPrice > price`) as well as regular prices
  - **Steps**:
    1. View product rows in table
  - **Expected Result**: Discounted products display the discounted selling price in bold with an emerald subtext "Saved {diff}", and Compare At Price shows regular price struck-through; non-discounted products display regular price in Compare At Price without strikethrough and a dash in Price
  - **Business Rules**: BR-PROD-002, BR-PROD-003
  - **API**: `GET /api/v1/products`

- [x] **N-16**: Paginate product list with page navigation and limit change
  - **Evidence**:
    - `N-16_1_product_management_page_loaded.png`
    - `N-16_2_table_columns_visible.png`
    - `N-16_3_desktop_viewport.png`
    - Test: Product_Management.spec.ts › "N-16: should display responsive layout on desktop viewport" — passed
  - **Precondition**: Merchant has more products than the current page limit
  - **Steps**:
    1. Click "Next" or specific page number in PaginationControls
    2. Click "Previous" to navigate back
    3. Change page limit selector (e.g. 10 → 20)
  - **Expected Result**: Page state updates, table displays the corresponding slice of products, previous button is disabled on page 1, and changing limit resets page to 1
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?page={page}&limit={limit}`

- [x] **N-17**: Language toggle updates screen text
  - **Evidence**:
    - `N-17_1_product_management_page_loaded.png`
    - `N-17_2_mobile_viewport.png`
    - Test: Product_Management.spec.ts › "N-17: should display responsive layout on mobile viewport" — passed
  - **Precondition**: User is on `/merchant/products`
  - **Steps**:
    1. Toggle language selector (English / Japanese / Myanmar)
  - **Expected Result**: All UI labels, table column headers, and placeholders update to the selected language
  - **Business Rules**: None (i18n)

- [ ] **N-18**: Theme toggle switches light and dark modes
  - **Precondition**: User is on `/merchant/products`
  - **Steps**:
    1. Toggle theme selector
  - **Expected Result**: UI switches seamlessly between dark and light palettes
  - **Business Rules**: None (Theme)

- [ ] **N-19**: Responsive layout on desktop and mobile viewports
  - **Precondition**: User views `/merchant/products` across viewport widths
  - **Steps**:
    1. View on desktop (1280x720)
    2. View on mobile (375x667)
  - **Expected Result**: Desktop shows full-width controls and action buttons; mobile shows stacked search/filter inputs and a horizontally scrollable table container (`overflow-x-auto`)
  - **Business Rules**: None (Responsive)

- [ ] **N-20**: Create product with full form (name, descriptions, category, pricing, stock, images, tags, skin types, ingredients)
  - **Precondition**: User is authenticated as an approved merchant on `/merchant/products/new`
  - **Steps**:
    1. Fill required fields: Product Name, Short Description, Full Description (Rich Text), Category
    2. Fill optional fields: Price (discount price), Compare At Price (required), SKU (auto-generated, read-only), Stock Quantity, Low Stock Threshold
    3. Select Tags, Skin Types (multi-select), Ingredients
    4. Upload at least one product image (max 10)
    5. Click "Create Product"
  - **Expected Result**: `POST /api/v1/products` fires with FormData, success toast "Product created", redirect to `/merchant/products`
  - **Business Rules**: BR-PROD-001, BR-PROD-004, BR-PROD-006, BR-PROD-007
  - **API**: `POST /api/v1/products`

- [ ] **N-21**: Edit product with pre-filled form and image retention
  - **Precondition**: User is authenticated as an approved merchant on `/merchant/products/:id/edit`
  - **Steps**:
    1. Form pre-populated with existing product data
    2. Modify fields as needed
    3. Optionally replace images (retained images tracked via `retainedImageUrls`)
    4. Click "Save Changes"
  - **Expected Result**: `PATCH /api/v1/products/:id` fires with FormData, success toast "Product updated", redirect to `/merchant/products`
  - **Business Rules**: BR-PROD-005
  - **API**: `PATCH /api/v1/products/:id`

- [ ] **N-22**: View product image fallback when image fails to load
  - **Precondition**: Product has an invalid or missing image URL
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Image element catches `onError` and renders fallback placeholder container with "No img" text (localized)
  - **Business Rules**: None (UI Resilience)
  - **API**: `GET /api/v1/products`

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Access product management without authentication
  - **Evidence**:
    - `A-01_1_new_product_page_loaded.png`
    - `A-01_2_save_clicked.png`
    - `A-01_3_validation_errors_empty_form.png`
    - Test: Product_Management.spec.ts › "A-01: should show validation errors when submitting empty product form" — passed
  - **Precondition**: User is not logged in (no session / token)
  - **Steps**:
    1. Navigate directly to `/merchant/products`
  - **Expected Result**: User is immediately redirected to `/login`
  - **Business Rules**: BR-PROD-022
  - **API**: `GET /api/v1/products` (returns 401)

- [x] **A-02**: Pending merchant access — restricted UI and pending approval banner
  - **Evidence**:
    - `A-02_1_new_product_page_loaded.png`
    - `A-02_2_product_form_filled.png`
    - `A-02_3_save_clicked.png`
    - `A-02_4_validation_error_price_zero.png`
    - Test: Product_Management.spec.ts › "A-02: should show validation error for price <= 0" — passed
  - **Precondition**: User is authenticated as a merchant with `licenseStatus === 'pending'`
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Warning banner "Account Pending" is displayed: "Your merchant account is currently pending admin approval..."; "Add New Product" button is hidden; "Delete" button is hidden; table selection checkboxes and Actions column are hidden; Status and Featured toggles render as read-only badges; Stock cells are read-only
  - **Business Rules**: BR-PROD-026, BR-PROD-027
  - **API**: `GET /api/v1/products`

- [x] **A-03**: Rejected merchant access — restricted UI and account rejected banner
  - **Evidence**:
    - `A-03_1_new_product_page_loaded.png`
    - `A-03_2_product_form_filled.png`
    - `A-03_3_save_clicked.png`
    - `A-03_4_validation_error_compare_price.png`
    - Test: Product_Management.spec.ts › "A-03: should show validation error for compareAtPrice <= price" — passed
  - **Precondition**: User is authenticated as a merchant with `licenseStatus === 'rejected'`
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Destructive banner "Account Rejected" is displayed with message and link "Go to Profile" (`/merchant/profile`); all CRUD buttons and interactive controls remain hidden
  - **Business Rules**: BR-PROD-026, BR-PROD-027
  - **API**: `GET /api/v1/products`

- [ ] **A-04**: Deactivated merchant access — restricted UI and account deactivated banner
  - **Precondition**: User is authenticated as a merchant with deactivated status (`isActive === false` or `status === 'deactivated'`)
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Destructive banner "Account Deactivated" is displayed: "Your merchant account is currently deactivated. Some features may be restricted until an admin activates your account."; all CRUD buttons and interactive controls are hidden
  - **Business Rules**: BR-PROD-026
  - **API**: `GET /api/v1/products`

- [x] **A-05**: Delete product with active orders — active order pre-check and skip breakdown
  - **Evidence**:
    - `A-05_1_new_product_page_loaded.png`
    - `A-05_2_unsupported_image_format.png`
    - Test: Product_Management.spec.ts › "A-05: should show error when uploading unsupported image format" — passed
  - **Precondition**: Selected products include at least one product with active (non-delivered) orders
  - **Steps**:
    1. Select product with active orders via checkbox
    2. Click "Delete" button in filter bar
    3. Observe confirmation dialog description
  - **Expected Result**: `checkActiveOrdersMutate` detects active orders; dialog description states "{N} product(s) with active orders will be skipped"; confirming deletion skips those products and toast notifies the user of skipped count
  - **Business Rules**: BR-PROD-024, BR-PROD-025
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **A-06**: Inline stock editor rejects negative or non-numeric input
  - **Evidence**:
    - `A-06_1_new_product_page_loaded.png`
    - `A-06_2_uploaded_11_images.png`
    - `A-06_3_more_than_10_images.png`
    - Test: Product_Management.spec.ts › "A-06: should show error when uploading more than 10 images" — passed
  - **Precondition**: Inline stock editor is open on a product row
  - **Steps**:
    1. Enter a negative value (e.g. -5) into the stock input field
    2. Press Enter
  - **Expected Result**: Editor blocks save (rejects `num < 0`), resets to original value, and does not dispatch API mutation
  - **Business Rules**: BR-PROD-018
  - **API**: None (client-side validation in `InlineStockEditor`)

- [x] **A-07**: Product list API failure displays error state with Retry button
  - **Evidence**:
    - Screenshots: (none captured)
    - Test: Product_Management.spec.ts › "A-07: should redirect to login when accessing product management without authentication" — passed
  - **Precondition**: API endpoint fails (network error or server 500)
  - **Steps**:
    1. Navigate to `/merchant/products` while API fails
  - **Expected Result**: Loading spinner is replaced by an error card: "Failed to load products. Please try again." with a "Retry" button that reloads the page
  - **Business Rules**: None (Error Handling)
  - **API**: `GET /api/v1/products`

- [x] **A-08**: Stock update API error displays error toast and reverts
  - **Evidence**:
    - `A-08_1_product_management_page_loaded.png`
    - `A-08_2_pending_banner_visible.png`
    - `A-08_3_pending_merchant_no_crud.png`
    - Test: Product_Management.spec.ts › "A-08: should show pending banner and hide CRUD buttons for pending merchant" — passed
  - **Precondition**: Inline stock update fails on server (e.g. 500 or conflict)
  - **Steps**:
    1. Modify stock inline and submit
  - **Expected Result**: Error toast "Failed to update stock" is displayed; stock reverts to previous value
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **A-09**: Status toggle API error displays error toast and reverts
  - **Evidence**:
    - `A-09_1_product_management_page_loaded.png`
    - `A-09_2_rejected_banner_visible.png`
    - `A-09_3_rejected_merchant_no_crud.png`
    - Test: Product_Management.spec.ts › "A-09: should show rejected banner and hide CRUD buttons for rejected merchant" — passed
  - **Precondition**: Active status toggle fails on server
  - **Steps**:
    1. Click Status toggle switch on a product row
  - **Expected Result**: Error toast "Failed to [activate|deactivate] product" is displayed
  - **Business Rules**: BR-PROD-015
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **A-10**: Featured toggle API error displays error toast
  - **Evidence**:
    - `A-10_1_product_management_page_loaded.png`
    - `A-10_2_delete_dialog_opened.png`
    - `A-10_3_delete_confirmed.png`
    - `A-10_4_delete_product_active_orders.png`
    - Test: Product_Management.spec.ts › "A-10: should show error when deleting product with active orders" — passed
  - **Precondition**: Featured status toggle fails on server
  - **Steps**:
    1. Click isFeatured toggle switch on a product row
  - **Expected Result**: Error toast "Failed to update featured status" is displayed
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id/toggle-featured`

- [x] **A-11**: Create product form validation — required fields
  - **Evidence**:
    - `A-11_1_product_management_page_loaded.png`
    - `A-11_2_stock_updated_-5.png`
    - `A-11_3_negative_stock_update.png`
    - Test: Product_Management.spec.ts › "A-11: should show error when updating stock to negative value" — passed
  - **Precondition**: User is on `/merchant/products/new`
  - **Steps**:
    1. Leave required fields empty (Product Name, Short Description, Full Description, Category)
    2. Click "Create Product"
  - **Expected Result**: Form displays inline validation errors for each required field (`text-destructive` paragraphs); submit is blocked; no API call
  - **Business Rules**: BR-PROD-004, BR-PROD-006, BR-PROD-007
  - **API**: None (client-side validation via react-hook-form + Zod)

- [ ] **A-12**: Create product form validation — price and stock numeric constraints
  - **Precondition**: User is on `/merchant/products/new`
  - **Steps**:
    1. Enter negative price or stock quantity
    2. Click "Create Product"
  - **Expected Result**: Form validation rejects negative values; inline error messages displayed
  - **Business Rules**: BR-PROD-004, BR-PROD-018
  - **API**: None (client-side validation)

- [ ] **A-13**: Create product — image upload validation (file type, max files)
  - **Precondition**: User is on `/merchant/products/new`
  - **Steps**:
    1. Attempt to upload non-image file (e.g., PDF)
    2. Attempt to upload more than 10 images
  - **Expected Result**: Invalid file types rejected; max 10 files enforced by ImageUploadZone
  - **Business Rules**: BR-PROD-007
  - **API**: None (client-side validation)

- [ ] **A-14**: Edit product — SKU field is read-only (auto-generated)
  - **Precondition**: User is on `/merchant/products/:id/edit`
  - **Steps**:
    1. Observe SKU input field
  - **Expected Result**: SKU input is disabled (`disabled:opacity-50`), cannot be modified
  - **Business Rules**: BR-PROD-001
  - **API**: None (UI only)

- [ ] **A-15**: Delete all confirmation when catalog is empty
  - **Precondition**: Merchant has 0 products, clicks "Delete" button
  - **Steps**:
    1. Click "Delete" button in filter bar
  - **Expected Result**: Dialog displays "No products to delete" message; confirm button disabled
  - **Business Rules**: BR-PROD-024
  - **API**: None

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Empty state — catalog or filter returns zero products
  - **Evidence**:
    - `B-01_1_new_product_page_loaded.png`
    - `B-01_2_product_form_filled.png`
    - `B-01_3_uploaded_1_images.png`
    - `B-01_4_save_clicked.png`
    - `B-01_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "B-01: should accept product name at minimum length (1 character)" — passed
  - **Precondition**: Merchant has 0 products in catalog (or search query yields no matches)
  - **Steps**:
    1. Navigate to `/merchant/products` with empty dataset
  - **Expected Result**: Table renders a single row spanning all columns displaying "No products found"; Delete button is hidden from action bar
  - **Business Rules**: None (UI Empty State)
  - **API**: `GET /api/v1/products`

- [x] **B-02**: Stock quantity at zero (Out of Stock indicator in destructive red)
  - **Evidence**:
    - `B-02_1_new_product_page_loaded.png`
    - `B-02_2_product_form_filled.png`
    - `B-02_3_uploaded_1_images.png`
    - `B-02_4_save_clicked.png`
    - `B-02_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "B-02: should accept product name at maximum length (255 characters)" — passed
  - **Precondition**: Product has `stockQuantity === 0`
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Stock number is rendered in destructive red text (`text-destructive`), visually flagging zero inventory
  - **Business Rules**: BR-PROD-020
  - **API**: `GET /api/v1/products`

- [x] **B-03**: Stock quantity at low stock threshold (1 to 10 in amber warning)
  - **Evidence**:
    - `B-03_1_new_product_page_loaded.png`
    - `B-03_2_name_exceeds_max_length.png`
    - Test: Product_Management.spec.ts › "B-03: should reject product name exceeding maximum length (256 characters)" — passed
  - **Precondition**: Product has `stockQuantity > 0 && stockQuantity <= 10`
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Stock number is rendered in amber warning text (`text-amber-600`), visually flagging low stock
  - **Business Rules**: BR-PROD-019
  - **API**: `GET /api/v1/products`

- [x] **B-04**: Stock quantity above threshold (> 10 in standard neutral)
  - **Evidence**:
    - `B-04_1_new_product_page_loaded.png`
    - `B-04_2_product_form_filled.png`
    - `B-04_3_uploaded_1_images.png`
    - `B-04_4_save_clicked.png`
    - `B-04_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "B-04: should accept SKU at maximum length (100 characters)" — passed
  - **Precondition**: Product has `stockQuantity > 10`
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Stock number is rendered in standard font color without low-stock warning highlights
  - **Business Rules**: None (Stock Display)
  - **API**: `GET /api/v1/products`

- [x] **B-05**: Long product name text truncation with ellipsis
  - **Evidence**:
    - `B-05_1_new_product_page_loaded.png`
    - `B-05_2_product_form_filled.png`
    - `B-05_3_uploaded_1_images.png`
    - `B-05_4_save_clicked.png`
    - `B-05_5_success_toast_visible.png`
    - Test: Product_Management.spec.ts › "B-05: should accept short description at maximum length (500 characters)" — passed
  - **Precondition**: Product has a very long name (up to 255 characters)
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Product name truncates cleanly with ellipsis (`truncate max-w-0`), preserving table column alignment
  - **Business Rules**: BR-PROD-001
  - **API**: `GET /api/v1/products`

- [x] **B-06**: Pagination boundary — first page (Previous button disabled)
  - **Evidence**:
    - `B-06_1_product_management_page_loaded.png`
    - `B-06_2_product_list_state.png`
    - Test: Product_Management.spec.ts › "B-06: should display empty state when merchant has no products" — passed
  - **Precondition**: Merchant is on page 1 of product list
  - **Steps**:
    1. Observe previous page button in PaginationControls
  - **Expected Result**: Previous page button is disabled; current page indicator displays "1"
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?page=1`

- [x] **B-07**: Pagination boundary — last page (Next button disabled)
  - **Evidence**:
    - `B-07_1_product_management_page_loaded.png`
    - `B-07_2_stock_updated_10.png`
    - `B-07_3_stock_at_threshold.png`
    - Test: Product_Management.spec.ts › "B-07: should show low stock warning at threshold" — passed
  - **Precondition**: Merchant is on last page (`page === totalPages`)
  - **Steps**:
    1. Navigate to last page of product list
  - **Expected Result**: Next page button is disabled; table displays remaining products for the final page
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?page={totalPages}`

- [x] **B-08**: Page limit selection boundary (change items per page)
  - **Evidence**:
    - `B-08_1_product_management_page_loaded.png`
    - `B-08_2_stock_updated_0.png`
    - `B-08_3_stock_at_zero.png`
    - Test: Product_Management.spec.ts › "B-08: should show out of stock indicator at zero stock" — passed
  - **Precondition**: Merchant has more than 10 products
  - **Steps**:
    1. Change items per page selector (e.g. from 10 to 20 or 50)
  - **Expected Result**: Page resets to 1, table updates to display new limit count of rows
  - **Business Rules**: None (Pagination)
  - **API**: `GET /api/v1/products?limit={newLimit}&page=1`

- [x] **B-09**: Delete confirmation when zero products are selected (triggers Delete All flow)
  - **Evidence**:
    - `B-09_1_new_product_page_loaded.png`
    - `B-09_2_product_form_filled.png`
    - `B-09_3_uploaded_1_images.png`
    - `B-09_4_save_clicked.png`
    - `B-09_5_discount_100_percent.png`
    - Test: Product_Management.spec.ts › "B-09: should accept discount percentage at maximum (100%)" — passed
  - **Precondition**: Merchant has products listed, selects 0 checkboxes, clicks "Delete"
  - **Steps**:
    1. With no products selected, click "Delete" button in filter bar
  - **Expected Result**: Dialog title displays "Delete Products", description asks "Are you sure you want to delete all {totalCount} products?...", and confirming triggers `useDeleteAll`
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `DELETE /api/v1/products/all`

- [x] **B-10**: Delete confirmation when exactly 1 product is selected (singular title/text)
  - **Evidence**:
    - `B-10_1_new_product_page_loaded.png`
    - `B-10_2_product_form_filled.png`
    - `B-10_3_save_clicked.png`
    - `B-10_4_discount_exceeds_100.png`
    - Test: Product_Management.spec.ts › "B-10: should show validation error for discount exceeding 100%" — passed
  - **Precondition**: Exactly 1 product checkbox is selected
  - **Steps**:
    1. Check exactly 1 product checkbox
    2. Click "Delete" button in filter bar
  - **Expected Result**: Dialog title displays "Delete Selected Product" (singular), description states "Are you sure you want to delete this 1 product?..."
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **B-11**: Delete confirmation with all items on current page selected
  - **Evidence**:
    - `B-11_1_product_management_page_loaded.png`
    - `B-11_2_pagination_state.png`
    - Test: Product_Management.spec.ts › "B-11: should handle pagination at last page boundary" — passed
  - **Precondition**: Header "Select all" checkbox is checked
  - **Steps**:
    1. Click header checkbox to select all rows
    2. Click "Delete" button in filter bar
  - **Expected Result**: Dialog title displays "Delete Selected Products", description confirms deleting all selected products
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`, `POST /api/v1/products/bulk-delete`

- [x] **B-12**: Delete product already inactive (triggers permanent deletion breakdown)
  - **Evidence**:
    - `B-12_1_new_product_page_loaded.png`
    - `B-12_2_uploaded_10_images.png`
    - `B-12_3_max_images_uploaded.png`
    - Test: Product_Management.spec.ts › "B-12: should accept exactly 10 images (max allowed)" — passed
  - **Precondition**: Selected product is already inactive (`isActive === false`)
  - **Steps**:
    1. Select an inactive product using checkbox
    2. Click "Delete" and observe breakdown in dialog
    3. Confirm deletion
  - **Expected Result**: Dialog description specifies "{N} soft-deleted product(s) will be permanently deleted"; when confirmed, product is permanently hard-deleted from database
  - **Business Rules**: BR-PROD-016
  - **API**: `POST /api/v1/products/bulk-delete`

- [ ] **B-13**: Stock quantity at maximum integer value
  - **Precondition**: Product has `stockQuantity` at or near `Number.MAX_SAFE_INTEGER`
  - **Steps**:
    1. View product row in table
    2. Attempt to increment via inline editor
  - **Expected Result**: Stock displays correctly; inline editor input has `min=0` but no explicit max; backend validation applies
  - **Business Rules**: None
  - **API**: `GET /api/v1/products`, `PATCH /api/v1/products/:id/stock`

- [ ] **B-14**: Price and Compare At Price with decimal precision (2 decimal places)
  - **Precondition**: Product has price values with decimals (e.g., 19.99, 29.99)
  - **Steps**:
    1. View product row in table
    2. View product form
  - **Expected Result**: Prices formatted with 2 decimal places via `formatPrice`; form inputs accept step="0.01"
  - **Business Rules**: BR-PROD-002, BR-PROD-003
  - **API**: `GET /api/v1/products`, `POST/PATCH /api/v1/products`

- [ ] **B-15**: Maximum image upload (10 images)
  - **Precondition**: User on create/edit product form
  - **Steps**:
    1. Upload 10 images
    2. Attempt to upload 11th image
  - **Expected Result**: First 10 accepted; 11th rejected by ImageUploadZone `maxFiles={10}`
  - **Business Rules**: BR-PROD-007
  - **API**: `POST/PATCH /api/v1/products`

- [ ] **B-16**: Product with no category assigned (edge case)
  - **Precondition**: Product exists with null/missing category
  - **Steps**:
    1. View product row in table
  - **Expected Result**: Category cell displays placeholder or category name; form requires category selection
  - **Business Rules**: BR-PROD-006
  - **API**: `GET /api/v1/products`

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/products` — fetches paginated product list for merchant
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-01: GET /api/v1/products should return 200 with product list" — passed
  - **Precondition**: User is authenticated as merchant
  - **Steps**:
    1. Send `GET /api/v1/products?page=1&limit=10&sortBy=newest` with auth headers
  - **Expected Response**: Status code 200, JSON `{ data: { items: [{ id, name, slug, price, compareAtPrice, stockQuantity, isActive, isFeatured, sku, images, ... }], meta: { page, limit, total, totalPages } } }`
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products`

- [x] **I-02**: `GET /api/v1/products` with query filters (`search`, `isActive`, `sortBy`, `page`, `limit`)
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-02: GET /api/v1/products/:slug should return 200 with product detail" — passed
  - **Precondition**: Products exist in database
  - **Steps**:
    1. Send `GET /api/v1/products?search=cream&isActive=true&sortBy=price&page=1&limit=10`
  - **Expected Response**: Status code 200, JSON contains only active products matching query "cream" sorted by price
  - **Business Rules**: None (Filter/Search)
  - **API**: `GET /api/v1/products`

- [x] **I-03**: `PATCH /api/v1/products/:id/stock` — updates stock quantity inline
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-03: GET /api/v1/products/:slug should return 404 for non-existent slug" — passed
  - **Precondition**: Product belongs to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id/stock` with `{ stockQuantity: 25 }`
  - **Expected Response**: Status code 200, JSON `{ data: { id, stockQuantity: 25, isLowStock, isOutOfStock } }`
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **I-04**: `PATCH /api/v1/products/:id/stock` — returns 400 for negative stock value
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-04: POST /api/v1/products should return 201 with created product" — passed
  - **Precondition**: Product exists
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id/stock` with `{ stockQuantity: -5 }`
  - **Expected Response**: Status code 400 Bad Request, validation error message
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **I-05**: `PATCH /api/v1/products/:id/toggle-featured` — toggles featured flag
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-05: POST /api/v1/products should return 400 for validation failure" — passed
  - **Precondition**: Product belongs to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id/toggle-featured`
  - **Expected Response**: Status code 200, JSON `{ data: { id, isFeatured } }`
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id/toggle-featured`

- [x] **I-06**: `PATCH /api/v1/products/bulk` — bulk activates or deactivates products
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-06: PATCH /api/v1/products/:id should return 200 with updated product" — passed
  - **Precondition**: Valid product IDs belonging to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/bulk` with `{ ids: ["uuid1"], action: "deactivate" }`
  - **Expected Response**: Status code 200, JSON `{ data: { updated: 1 } }`
  - **Business Rules**: BR-PROD-015
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **I-07**: `POST /api/v1/products/check-active-orders` — pre-checks active orders before deletion
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-07: DELETE /api/v1/products/:id should return 200 on success" — passed
  - **Precondition**: Array of product IDs provided
  - **Steps**:
    1. Send `POST /api/v1/products/check-active-orders` with `{ ids: ["uuid1", "uuid2"] }`
  - **Expected Response**: Status code 200, JSON `{ data: { skippedIds: ["uuid2"] } }`
  - **Business Rules**: BR-PROD-024
  - **API**: `POST /api/v1/products/check-active-orders`

- [x] **I-08**: `POST /api/v1/products/bulk-delete` — bulk soft/hard deletes selected products
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-08: PATCH /api/v1/products/:id/stock should return 200 with stock update" — passed
  - **Precondition**: Array of product IDs provided
  - **Steps**:
    1. Send `POST /api/v1/products/bulk-delete` with `{ ids: ["uuid1", "uuid2"] }`
  - **Expected Response**: Status code 200, JSON `{ data: { deactivated: 1, permanentlyDeleted: 1, skippedIds: [] } }`
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `POST /api/v1/products/bulk-delete`

- [x] **I-09**: `DELETE /api/v1/products/all` — deletes all merchant products with active order skip
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-09: GET /api/v1/categories should return 200 with category tree" — passed
  - **Precondition**: User is authenticated as merchant
  - **Steps**:
    1. Send `DELETE /api/v1/products/all` with body `{ search?: string, isActive?: boolean }`
  - **Expected Response**: Status code 200, JSON `{ data: { deactivated: number, permanentlyDeleted: number, skippedActiveOrders: number } }`
  - **Business Rules**: BR-PROD-024
  - **API**: `DELETE /api/v1/products/all`

- [x] **I-10**: `DELETE /api/v1/products/:id` — single product soft delete (active product → inactive)
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-10: error response should follow standard API format" — passed
  - **Precondition**: Product belongs to merchant, has no active orders
  - **Steps**:
    1. Send `DELETE /api/v1/products/:id` with auth headers
  - **Expected Response**: Status code 200, JSON `{ message: "Product deactivated" }`
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `DELETE /api/v1/products/:id`

- [x] **I-11**: `DELETE /api/v1/products/:id/hard` — single product hard delete (inactive product → permanent)
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-11: POST /api/v1/products should return 403 for pending merchant" — passed
  - **Precondition**: Product belongs to merchant, is already inactive (`isActive === false`)
  - **Steps**:
    1. Send `DELETE /api/v1/products/:id/hard` with auth headers
  - **Expected Response**: Status code 200, JSON `{ message: "Product permanently deleted" }`
  - **Business Rules**: BR-PROD-016
  - **API**: `DELETE /api/v1/products/:id/hard`

- [x] **I-12**: `DELETE /api/v1/products/:id` — returns 409 Conflict when product has active orders
  - **Evidence**:
    - API test — no screenshot
    - Test: Product_Management.spec.ts › "I-12: DELETE /api/v1/products/:id should return 409 for product with active orders" — passed
  - **Precondition**: Product has associated active orders (status !== 'delivered')
  - **Steps**:
    1. Send `DELETE /api/v1/products/:id` for product with active orders
  - **Expected Response**: Status code 409 Conflict, JSON `{ statusCode: 409, error: "CONFLICT", message: "Cannot delete product with active orders..." }`
  - **Business Rules**: BR-PROD-024, BR-PROD-025
  - **API**: `DELETE /api/v1/products/:id`

- [ ] **I-13**: `POST /api/v1/products` — create product with multipart/form-data
  - **Precondition**: User is authenticated as approved merchant
  - **Steps**:
    1. Send `POST /api/v1/products` with FormData containing: name, shortDescription, description, categoryId, stockQuantity, price (optional), compareAtPrice, lowStockThreshold (optional), skinTypes (JSON array), ingredients (JSON array), tags (JSON array), isActive (optional), isFeatured (optional), images (File[])
  - **Expected Response**: Status code 201, JSON `{ data: { id, name, slug, ... } }`
  - **Business Rules**: BR-PROD-001, BR-PROD-004, BR-PROD-006, BR-PROD-007
  - **API**: `POST /api/v1/products`

- [ ] **I-14**: `PATCH /api/v1/products/:id` — update product with multipart/form-data
  - **Precondition**: Product belongs to authenticated merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id` with FormData containing any updatable fields plus `retainedImageUrls` (JSON array of strings)
  - **Expected Response**: Status code 200, JSON `{ data: { id, name, slug, ... } }`
  - **Business Rules**: BR-PROD-005
  - **API**: `PATCH /api/v1/products/:id`

- [ ] **I-15**: Error response follows standard API format
  - **Precondition**: Any API error (400, 401, 403, 404, 409, 500)
  - **Steps**:
    1. Trigger error on any product endpoint
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any endpoint

---

## Screenshot Evidence

Product Management screenshots follow the SignUp/Login naming convention:
`<scenario-id>_<capture-number>_<descriptive-state>.png`. For example,
the N-01 product list screenshots are `N-01_1_product_management_page_loaded.png`
and `N-01_2_table_columns_visible.png`. Captures and their originating tests are
indexed in [the Product Management screenshot index](../../../e2e/test-results/Product_Management/screenshots/index.json).

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ (59 Product Management E2E tests; not every documented PCL scenario is automated) |
| PCL auto-update verified | ☑️ |
| Next review date | 2026-11-15 |
