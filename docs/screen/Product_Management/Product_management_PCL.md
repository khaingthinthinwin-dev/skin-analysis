# Program Checklist (PCL) — Product Management

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-PROD-001 |
| **Target Screen** | Product Management |
| **Subsystem** | Merchant Product Catalog |
| **Version** | 1.0 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: View product list as approved merchant
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Product table displays with columns: Thumbnail, Name, SKU, Price, Stock, Status, Featured, Actions
  - **Business Rules**: BR-PROD-008
  - **API**: `GET /api/v1/products`

- [x] **N-02**: Create a new product with valid data
  - **Precondition**: User is authenticated as an approved merchant
  - **Steps**:
    1. Navigate to `/merchant/products/new`
    2. Fill in product name, short description, description, category, price, stock quantity
    3. Upload at least one image
    4. Click "Save"
  - **Expected Result**: Success toast displayed, redirects to `/merchant/products`
  - **Business Rules**: BR-PROD-001, BR-PROD-002, BR-PROD-007
  - **API**: `POST /api/v1/products`

- [x] **N-03**: Edit an existing product
  - **Precondition**: User is authenticated as an approved merchant with an existing product
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Click the Edit button on a product row
    3. Modify product name or price
    4. Click "Save"
  - **Expected Result**: Success toast displayed, redirects to `/merchant/products` with updated data
  - **Business Rules**: BR-PROD-005, BR-PROD-022
  - **API**: `PATCH /api/v1/products/:id`

- [x] **N-04**: Delete a product (soft delete)
  - **Precondition**: User is authenticated as an approved merchant with a product that has no active orders
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Click the Delete button on a product row
    3. Confirm deletion in the dialog
  - **Expected Result**: Success toast displayed, product removed from list (set to inactive)
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `DELETE /api/v1/products/:id`

- [x] **N-05**: Toggle product active status
  - **Precondition**: User is authenticated as an approved merchant with an existing product
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Click the Active toggle switch on a product row
  - **Expected Result**: Status badge updates, success toast displayed
  - **Business Rules**: BR-PROD-014, BR-PROD-015
  - **API**: `PATCH /api/v1/products/:id`

- [x] **N-06**: Toggle product featured status
  - **Precondition**: User is authenticated as an approved merchant with an existing product
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Click the Featured toggle switch on a product row
  - **Expected Result**: Featured badge updates, success toast displayed
  - **Business Rules**: BR-PROD-017
  - **API**: `PATCH /api/v1/products/:id`

- [x] **N-07**: Update stock quantity inline
  - **Precondition**: User is authenticated as an approved merchant with an existing product
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Double-click the Stock cell on a product row
    3. Enter new stock value
    4. Press Enter or click outside
  - **Expected Result**: Stock value updates, success toast displayed
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **N-08**: Search products by name
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Type a product name in the search input
  - **Expected Result**: Product list filters to show matching products
  - **Business Rules**: None (Search)
  - **API**: `GET /api/v1/products?search={query}`

- [x] **N-09**: Filter products by status
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Select "Active" from the status filter dropdown
  - **Expected Result**: Product list shows only active products
  - **Business Rules**: None (Filter)
  - **API**: `GET /api/v1/products?isActive=true`

- [x] **N-10**: Sort products by price
  - **Precondition**: User is authenticated as an approved merchant with existing products
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Select "Price" from the sort dropdown
  - **Expected Result**: Product list reorders by price
  - **Business Rules**: None (Sort)
  - **API**: `GET /api/v1/products?sortBy=price`

- [x] **N-11**: Bulk select and activate products
  - **Precondition**: User is authenticated as an approved merchant with multiple products
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Select multiple products using checkboxes
    3. Click "Activate" in the bulk actions bar
  - **Expected Result**: Selected products become active, success toast displayed
  - **Business Rules**: None (Bulk)
  - **API**: `PATCH /api/v1/products/bulk`

- [x] **N-12**: Bulk delete products
  - **Precondition**: User is authenticated as an approved merchant with multiple products that have no active orders
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Select multiple products using checkboxes
    3. Click "Delete" in the bulk actions bar
    4. Confirm deletion
  - **Expected Result**: Selected products are soft-deleted, success toast displayed
  - **Business Rules**: BR-PROD-024
  - **API**: `DELETE /api/v1/products/bulk`

- [ ] **N-13**: Delete all products
  - **Precondition**: User is authenticated as an approved merchant with products, some with active orders
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Click the "Delete" button (no products selected)
    3. Confirm deletion
  - **Expected Result**: Eligible products deleted, products with active orders skipped, toast shows counts
  - **Business Rules**: BR-PROD-024
  - **API**: `DELETE /api/v1/products/all`

- [x] **N-14**: Save product as draft
  - **Precondition**: User is authenticated as an approved merchant
  - **Steps**:
    1. Navigate to `/merchant/products/new`
    2. Fill in required product fields
    3. Click "Save as Draft"
  - **Expected Result**: Product saved with `isActive = false`, success toast displayed, redirects to list
  - **Business Rules**: BR-PROD-016
  - **API**: `POST /api/v1/products`

- [x] **N-15**: Language toggle works on screen
  - **Precondition**: User is on Product Management page
  - **Steps**:
    1. Toggle language to Japanese / Myanmar
  - **Expected Result**: All UI labels update to selected language
  - **Business Rules**: None (i18n)

- [x] **N-16**: Theme toggle works on screen
  - **Precondition**: User is on Product Management page
  - **Steps**:
    1. Toggle theme to dark / light
  - **Expected Result**: Styling switches between dark and light modes
  - **Business Rules**: None (UI)

- [x] **N-17**: Responsive layout on desktop viewport
  - **Precondition**: Viewport >= 1024px
  - **Steps**:
    1. Set viewport to 1280x720
  - **Expected Result**: Desktop layout with full table columns and sidebar navigation
  - **Business Rules**: None (Responsive)

- [x] **N-18**: Responsive layout on mobile viewport
  - **Precondition**: Viewport < 768px
  - **Steps**:
    1. Set viewport to 375x667
  - **Expected Result**: Mobile layout with stacked form and horizontally scrollable table
  - **Business Rules**: None (Responsive)

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Submit product form with empty required fields
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Leave all fields blank
    2. Click "Save"
  - **Expected Result**: Inline validation error messages displayed for name, description, category, price, images; submit blocked
  - **Business Rules**: BR-PROD-001
  - **API**: `POST /api/v1/products`

- [x] **A-02**: Submit with price less than or equal to 0
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter price as 0 or negative
    2. Click "Save"
  - **Expected Result**: Validation error "Price must be greater than 0" displayed
  - **Business Rules**: BR-PROD-002
  - **API**: `POST /api/v1/products`

- [x] **A-03**: Submit with compareAtPrice less than or equal to price
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter price as 50
    2. Enter compareAtPrice as 40
    3. Click "Save"
  - **Expected Result**: Validation error "Compare price must be greater than selling price" displayed
  - **Business Rules**: BR-PROD-003
  - **API**: `POST /api/v1/products`

- [x] **A-04**: Upload image exceeding 5MB
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Attempt to upload an image file larger than 5MB
  - **Expected Result**: Validation error "File exceeds maximum size of 5MB" displayed
  - **Business Rules**: BR-PROD-010
  - **API**: `POST /api/v1/products`

- [x] **A-05**: Upload unsupported image format
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Attempt to upload a GIF or BMP file
  - **Expected Result**: Validation error "File type not supported" displayed
  - **Business Rules**: BR-PROD-011
  - **API**: `POST /api/v1/products`

- [x] **A-06**: Upload more than 10 images
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Attempt to upload 11 images
  - **Expected Result**: Validation error "Maximum 10 images allowed" displayed
  - **Business Rules**: BR-PROD-009
  - **API**: `POST /api/v1/products`

- [x] **A-07**: Access product management without authentication
  - **Precondition**: User is not logged in
  - **Steps**:
    1. Navigate directly to `/merchant/products`
  - **Expected Result**: Redirect to `/login`
  - **Business Rules**: BR-PROD-022
  - **API**: `GET /api/v1/products`

- [x] **A-08**: Pending merchant attempts to create product
  - **Precondition**: User is authenticated as a merchant with `licenseStatus === 'pending'`
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Observe pending banner and hidden CRUD buttons
  - **Expected Result**: Pending approval banner displayed, Add Product button hidden, table read-only
  - **Business Rules**: BR-PROD-026, BR-PROD-027
  - **API**: `POST /api/v1/products` (returns 403)

- [x] **A-09**: Rejected merchant views product management
  - **Precondition**: User is authenticated as a merchant with `licenseStatus === 'rejected'`
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Rejection banner displayed with reason, CRUD buttons hidden
  - **Business Rules**: BR-PROD-026, BR-PROD-027
  - **API**: `GET /api/v1/products`

- [x] **A-10**: Delete product with active orders
  - **Precondition**: Product has associated orders with status other than `delivered`
  - **Steps**:
    1. Navigate to `/merchant/products`
    2. Click Delete on the product
    3. Confirm deletion
  - **Expected Result**: Error toast "Cannot delete product with active orders. All orders must be completed first."
  - **Business Rules**: BR-PROD-024, BR-PROD-025
  - **API**: `DELETE /api/v1/products/:id`

- [ ] **A-11**: Merchant attempts to edit another merchant's product
  - **Precondition**: User is authenticated as a merchant, product belongs to another merchant
  - **Steps**:
    1. Send `PATCH /api/v1/products/:id` with another merchant's product ID
  - **Expected Result**: 403 Forbidden response
  - **Business Rules**: BR-PROD-022
  - **API**: `PATCH /api/v1/products/:id`

- [x] **A-12**: Update stock to negative value
  - **Precondition**: User is on the Product Management page
  - **Steps**:
    1. Double-click stock cell
    2. Enter -5
    3. Press Enter
  - **Expected Result**: Validation error "Stock quantity must be 0 or greater" displayed
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Product name at minimum length (1 character)
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter a single character as product name
    2. Fill other required fields
    3. Click "Save"
  - **Expected Result**: Product created successfully
  - **Business Rules**: BR-PROD-001

- [x] **B-02**: Product name at maximum length (255 characters)
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter exactly 255 characters as product name
    2. Fill other required fields
    3. Click "Save"
  - **Expected Result**: Product created successfully
  - **Business Rules**: BR-PROD-001

- [x] **B-03**: Product name exceeding maximum length (256 characters)
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter 256 characters as product name
  - **Expected Result**: Input truncated or validation error displayed
  - **Business Rules**: BR-PROD-001

- [x] **B-04**: SKU at maximum length (100 characters)
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter exactly 100 characters as SKU
    2. Fill other required fields
    3. Click "Save"
  - **Expected Result**: Product created successfully with SKU
  - **Business Rules**: BR-PROD-004

- [x] **B-05**: Short description at maximum length (500 characters)
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Enter exactly 500 characters as short description
    2. Fill other required fields
    3. Click "Save"
  - **Expected Result**: Product created successfully
  - **Business Rules**: BR-PROD-001

- [x] **B-06**: Empty state — no products
  - **Precondition**: Merchant has 0 products
  - **Steps**:
    1. Navigate to `/merchant/products`
  - **Expected Result**: Empty state displayed with "No products found" message and "Add your first product" button
  - **Business Rules**: None (UI)

- [x] **B-07**: Stock at low threshold (equal to threshold)
  - **Precondition**: Product has `lowStockThreshold = 10`
  - **Steps**:
    1. Update stock to 10
  - **Expected Result**: Low stock warning displayed
  - **Business Rules**: BR-PROD-019

- [x] **B-08**: Stock at zero (out of stock)
  - **Precondition**: Product has stock > 0
  - **Steps**:
    1. Update stock to 0
  - **Expected Result**: Out of stock indicator displayed, product hidden from buyers
  - **Business Rules**: BR-PROD-020

- [x] **B-09**: Discount percentage at maximum (100%)
  - **Precondition**: User is on the Create Promotion page
  - **Steps**:
    1. Enter 100 as discount percentage
  - **Expected Result**: Accepted (valid boundary)
  - **Business Rules**: BR-PROD-002

- [x] **B-10**: Discount percentage exceeding maximum (101%)
  - **Precondition**: User is on the Create Promotion page
  - **Steps**:
    1. Enter 101 as discount percentage
  - **Expected Result**: Validation error "Percentage must not exceed 100" displayed
  - **Business Rules**: BR-PROD-002

- [x] **B-11**: Pagination at boundary — last page
  - **Precondition**: Merchant has 25 products, limit is 10
  - **Steps**:
    1. Navigate to page 3
  - **Expected Result**: Shows 5 products (remaining), pagination shows "Page 3 of 3"
  - **Business Rules**: None (Pagination)

- [x] **B-12**: Maximum images uploaded (10 images)
  - **Precondition**: User is on the Create Product page
  - **Steps**:
    1. Upload exactly 10 images
  - **Expected Result**: All 10 images accepted, upload zone disabled
  - **Business Rules**: BR-PROD-009

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `GET /api/v1/products` — returns 200 with product list and pagination
  - **Precondition**: Products exist in the database
  - **Steps**:
    1. Call API with valid query parameters
  - **Expected Response**: Status code 200, JSON `{ data: [...], meta: { page, limit, total, totalPages } }`
  - **Business Rules**: None
  - **API**: `GET /api/v1/products`

- [x] **I-02**: `GET /api/v1/products/:slug` — returns 200 with product detail
  - **Precondition**: Product with valid slug exists and is active
  - **Steps**:
    1. Call API with valid slug
  - **Expected Response**: Status code 200, JSON `{ data: { id, name, slug, price, ... } }`
  - **Business Rules**: None
  - **API**: `GET /api/v1/products/:slug`

- [x] **I-03**: `GET /api/v1/products/:slug` — returns 404 for non-existent slug
  - **Precondition**: No product with the given slug
  - **Steps**:
    1. Call API with non-existent slug
  - **Expected Response**: Status code 404, JSON `{ statusCode: 404, error: "NOT_FOUND" }`
  - **Business Rules**: None
  - **API**: `GET /api/v1/products/:slug`

- [x] **I-04**: `POST /api/v1/products` — returns 201 with created product
  - **Precondition**: Valid payload with all required fields and at least one image
  - **Steps**:
    1. Call API with valid multipart/form-data body
  - **Expected Response**: Status code 201, JSON `{ data: { id, name, slug, price, isActive, ... } }`
  - **Business Rules**: BR-PROD-001
  - **API**: `POST /api/v1/products`

- [x] **I-05**: `POST /api/v1/products` — returns 400 for validation failure
  - **Precondition**: Payload missing required fields
  - **Steps**:
    1. Call API with empty body
  - **Expected Response**: Status code 400, JSON `{ statusCode: 400, error: "BAD_REQUEST", message: [...] }`
  - **Business Rules**: BR-PROD-001
  - **API**: `POST /api/v1/products`

- [x] **I-06**: `POST /api/v1/products` — returns 403 for pending merchant
  - **Precondition**: Merchant has `licenseStatus === 'pending'`
  - **Steps**:
    1. Call API with valid payload
  - **Expected Response**: Status code 403, JSON `{ statusCode: 403, error: "MERCHANT_NOT_APPROVED" }`
  - **Business Rules**: BR-PROD-026
  - **API**: `POST /api/v1/products`

- [x] **I-07**: `PATCH /api/v1/products/:id` — returns 200 with updated product
  - **Precondition**: Valid payload, product belongs to authenticated merchant
  - **Steps**:
    1. Call API with valid partial update body
  - **Expected Response**: Status code 200, JSON `{ data: { id, name, updatedAt, ... } }`
  - **Business Rules**: BR-PROD-022
  - **API**: `PATCH /api/v1/products/:id`

- [ ] **I-08**: `DELETE /api/v1/products/:id` — returns 204 for successful soft delete
  - **Precondition**: Product exists, belongs to merchant, has no active orders
  - **Steps**:
    1. Call API with valid product ID
  - **Expected Response**: Status code 204 No Content
  - **Business Rules**: BR-PROD-016, BR-PROD-024
  - **API**: `DELETE /api/v1/products/:id`

- [x] **I-09**: `DELETE /api/v1/products/:id` — returns 409 for product with active orders
  - **Precondition**: Product has orders with status other than `delivered`
  - **Steps**:
    1. Call API with product ID that has active orders
  - **Expected Response**: Status code 409, JSON `{ statusCode: 409, error: "CONFLICT", message: "Cannot delete product with active orders..." }`
  - **Business Rules**: BR-PROD-024, BR-PROD-025
  - **API**: `DELETE /api/v1/products/:id`

- [x] **I-10**: `PATCH /api/v1/products/:id/stock` — returns 200 with stock update
  - **Precondition**: Valid stock quantity, product belongs to merchant
  - **Steps**:
    1. Call API with `{ stockQuantity: 25 }`
  - **Expected Response**: Status code 200, JSON `{ data: { id, stockQuantity, isLowStock, isOutOfStock } }`
  - **Business Rules**: BR-PROD-018
  - **API**: `PATCH /api/v1/products/:id/stock`

- [x] **I-11**: `GET /api/v1/categories` — returns 200 with category tree
  - **Precondition**: Categories exist in database
  - **Steps**:
    1. Call API
  - **Expected Response**: Status code 200, JSON `{ data: [{ id, name, slug, children: [...] }] }`
  - **Business Rules**: None
  - **API**: `GET /api/v1/categories`

- [x] **I-12**: Error response follows standard API format
  - **Precondition**: Any error scenario
  - **Steps**:
    1. Trigger error
  - **Expected Response**: JSON contains `{ statusCode, message, error, timestamp, path }`
  - **Business Rules**: None
  - **API**: Any endpoint

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☐ |
| PCL auto-update verified | ☐ |
