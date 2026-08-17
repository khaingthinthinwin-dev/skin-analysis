# DD_PROD_06 — Test Specification

> **Doc ID:** SKM-DD-PROD-06 | **Version:** 1.2 | **Status:** Released  
> **Last Updated:** 2026-08-17

---

## 1. Overview

This document defines the testing strategy for the Product Management module, covering Unit Tests, Component Tests, and End-to-End (E2E) Scenarios.

---

## 2. Backend Unit Tests (`src/modules/products/tests/`)

### 2.1 `products.service.spec.ts`

Mock dependencies: `PrismaService`, `RedisService`, `ConfigService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **findAll** | Public access, no filters | Returns only `isActive=true` products with pagination |
| **findAll** | Merchant access | Returns all own products regardless of `isActive` |
| **findAll** | Search filter | Filters products by name/SKU containing query |
| **findAll** | Category filter | Filters products by categoryId |
| **findAll** | Price range filter | Filters products within min/max price |
| **findAll** | Sort by price ascending | Returns products sorted by price asc |
| **findAll** | Pagination | Returns correct page with limit |
| **findBySlug** | Valid slug, active product | Returns product with category relation |
| **findBySlug** | Invalid slug | Throws `NotFoundException` |
| **findBySlug** | Inactive product | Throws `NotFoundException` |
| **findBySlug** | Cache hit | Returns cached product without DB query |
| **create** | Valid data, approved shop | Creates product, generates slug, returns DTO |
| **create** | Shop not approved | Throws `ForbiddenException` |
| **create** | Category not found | Throws `NotFoundException` |
| **create** | Slug conflict | Regenerates slug with suffix |
| **create** | SKU conflict | Throws `ConflictException` |
| **create** | Image upload | Uploads files, stores paths in DB |
| **create** | Invalid image type | Throws `UnsupportedMediaTypeException` |
| **create** | Image exceeds 5MB | Throws `PayloadTooLargeException` |
| **create** | More than 10 images | Throws `BadRequestException` |
| **update** | Valid data, own product | Updates product, returns DTO |
| **update** | Not product owner | Throws `ForbiddenException` |
| **update** | Product not found | Throws `NotFoundException` |
| **update** | Name changed, slug regenerated | Updates slug, checks uniqueness |
| **update** | SKU changed, conflict | Throws `ConflictException` |
| **update** | Category changed, invalid | Throws `NotFoundException` |
| **update** | Image added | Uploads new image, adds to array |
| **update** | Image removed | Deletes from storage, removes from array |
| **softDelete** | Own product | Sets `isActive=false`, returns 204 |
| **softDelete** | Not product owner | Throws `ForbiddenException` |
| **softDelete** | Product not found | Throws `NotFoundException` |
| **softDelete** | Product with active orders (pending) | Throws `ConflictException` with "Cannot delete product with active orders" |
| **softDelete** | Product with active orders (processing) | Throws `ConflictException` with "Cannot delete product with active orders" |
| **softDelete** | Product with active orders (shipped) | Throws `ConflictException` with "Cannot delete product with active orders" |
| **softDelete** | Product with resolved orders only (delivered) | Soft-deletes successfully |
| **softDelete** | Product with resolved orders only (cancelled) | Soft-deletes successfully |
| **softDelete** | Product with no orders | Soft-deletes successfully |
| **updateStock** | Valid quantity, own product | Updates stock, returns stock DTO |
| **updateStock** | Quantity < 0 | Throws `BadRequestException` |
| **updateStock** | Not product owner | Throws `ForbiddenException` |
| **updateStock** | Stock below threshold | Returns `isLowStock=true` |
| **updateStock** | Stock = 0 | Returns `isOutOfStock=true` |
| **bulkAction** | Activate multiple products | Sets `isActive=true` for all |
| **bulkAction** | Deactivate multiple products | Sets `isActive=false` for all |
| **bulkAction** | Mixed ownership | Returns partial success with errors |
| **bulkAction** | Empty IDs | Throws `BadRequestException` |
| **bulkSoftDelete** | Delete multiple products | Sets `isActive=false` for all |
| **bulkSoftDelete** | Mixed ownership | Returns partial success with errors |
| **bulkSoftDelete** | Product with active orders (pending) | Skips product, adds to errors array |
| **bulkSoftDelete** | Product with active orders (processing) | Skips product, adds to errors array |
| **bulkSoftDelete** | Product with active orders (shipped) | Skips product, adds to errors array |
| **bulkSoftDelete** | Product with resolved orders only (delivered) | Soft-deletes successfully |
| **bulkSoftDelete** | Product with resolved orders only (cancelled) | Soft-deletes successfully |
| **bulkSoftDelete** | Product with no orders | Soft-deletes successfully |
| **bulkSoftDelete** | Mixed: some with active orders, some without | Deletes eligible, skips products with active orders |
| **deleteAllByMerchant** | All products have active orders | Returns deleted=0, skipped with all product IDs |
| **deleteAllByMerchant** | No products with active orders | Deletes all, returns deleted count |
| **deleteAllByMerchant** | Mixed: some with active orders, some without | Deletes eligible, skips products with active orders |
| **deleteAllByMerchant** | Merchant with no products | Returns deleted=0, skipped=0 |
| **deleteAllByMerchant** | Cache invalidation | Invalidates all product caches |

### 2.2 `products.controller.spec.ts`

Mock dependencies: `ProductsService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **GET /products** | Valid query | Calls `service.findAll`, returns 200 |
| **GET /products** | Invalid query params | Returns 400 Bad Request |
| **GET /products/:slug** | Valid slug | Calls `service.findBySlug`, returns 200 |
| **GET /products/:slug** | Invalid slug | Returns 404 Not Found |
| **POST /products** | Valid payload + files | Calls `service.create`, returns 201 |
| **POST /products** | Missing auth | Returns 401 Unauthorized |
| **POST /products** | Invalid role | Returns 403 Forbidden |
| **POST /products** | Validation errors | Returns 400 Bad Request |
| **POST /products** | Slug conflict | Returns 409 Conflict |
| **PATCH /products/:id** | Valid payload | Calls `service.update`, returns 200 |
| **PATCH /products/:id** | Not owner | Returns 403 Forbidden |
| **PATCH /products/:id** | Not found | Returns 404 Not Found |
| **DELETE /products/:id** | Own product | Calls `service.softDelete`, returns 204 |
| **DELETE /products/:id** | Not owner | Returns 403 Forbidden |
| **DELETE /products/:id** | Product with active orders | Returns 409 Conflict |
| **PATCH /products/:id/stock** | Valid quantity | Calls `service.updateStock`, returns 200 |
| **PATCH /products/:id/stock** | Invalid quantity | Returns 400 Bad Request |
| **PATCH /products/bulk** | Valid action | Calls `service.bulkAction`, returns 200 |
| **DELETE /products/bulk** | Valid IDs | Calls `service.bulkSoftDelete`, returns 200 |
| **DELETE /products/bulk** | Some products with active orders | Returns 200 with partial success (some skipped) |
| **DELETE /products/all** | Valid merchant | Calls `service.deleteAllByMerchant`, returns 200 |
| **DELETE /products/all** | Missing auth | Returns 401 Unauthorized |
| **DELETE /products/all** | Merchant not approved | Returns 403 Forbidden |

### 2.3 `require-approved-merchant.guard.spec.ts`

Mock dependencies: `PrismaService`.

| Test Suite | Scenario | Expected Outcome |
|------------|----------|------------------|
| **requireApprovedMerchant** | Merchant with approved license | Allows request to proceed |
| **requireApprovedMerchant** | Merchant with pending license | Throws `ForbiddenException` with MERCHANT_NOT_APPROVED |
| **requireApprovedMerchant** | Merchant with rejected license | Throws `ForbiddenException` with MERCHANT_REJECTED and reason |
| **requireApprovedMerchant** | Merchant not found | Throws `ForbiddenException` |
| **requireApprovedMerchant** | Admin user | Allows request to proceed (guard skipped for admins) |

---

## 3. Frontend Component Tests

Using Vitest + React Testing Library.

### 3.1 `ProductTable.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Displays product table with columns |
| Loading state | Shows skeleton loaders |
| Empty state | Shows "No products found" message |
| Product list | Renders product rows with data |
| Search input | Debounced search triggers API call |
| Status filter | Filters products by status |
| Pagination | Navigates between pages |
| Select all checkbox | Selects/deselects all products on page |
| Individual checkbox | Toggles individual product selection |
| Bulk actions bar | Shows when ≥ 1 product selected |
| Bulk activate | Calls bulk action API |
| Bulk deactivate | Shows confirmation dialog |
| Bulk delete | Shows confirmation dialog with count |
| Edit button | Navigates to edit form |
| Delete button | Shows confirmation dialog |
| Toggle active | Calls update API |
| Toggle featured | Calls update API |
| Inline stock edit | Double-click converts to input |
| Inline stock save | Enter/Blur saves stock change |
| Inline stock cancel | Escape cancels edit |
| Low stock warning | Shows amber highlight |
| Out of stock | Shows red highlight |

### 3.2 `ProductForm.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render (Create) | Shows empty form with defaults |
| Initial render (Edit) | Populates form with existing data |
| Name input | Accepts text, max 255 chars |
| Name required | Shows "Product name is required" error |
| Short description | Accepts text, max 500 chars |
| Short description required | Shows error on empty |
| Description editor | Accepts rich text |
| Category select | Shows category tree |
| Category required | Shows error on empty |
| SKU input | Accepts text, max 100 chars |
| Price input | Accepts number, min 0.01 |
| Price required | Shows error on empty/zero |
| Compare price | Accepts number > price |
| Stock quantity | Accepts integer >= 0 |
| Low stock threshold | Default 10 |
| Image upload (valid) | Shows preview grid |
| Image upload (invalid type) | Shows VAL-PROD-010 error |
| Image upload (too large) | Shows VAL-PROD-011 error |
| Image upload (> 10) | Shows VAL-PROD-012 error |
| Image reorder | Drag to reorder |
| Image delete | Removes from preview |
| Skin types checkbox | Toggles selection |
| Ingredients tag input | Adds/removes tags |
| Tags tag input | Adds/removes tags |
| Is Active switch | Defaults to true (Create) |
| Is Featured switch | Defaults to false (Create) |
| Save button (Create) | Calls create API |
| Save button (Edit) | Calls update API |
| Save as Draft | Saves with isActive=false |
| Cancel button | Navigates to list |
| Loading state | Shows spinner during submission |
| Validation errors | Displays inline errors |
| API errors | Shows alert banner |

### 3.3 `ImageUploadZone.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Initial render | Shows drag & drop zone |
| Drag valid image | Shows preview |
| Click to upload | Opens file picker |
| Invalid file type | Shows error message |
| File too large | Shows error message |
| Too many files | Shows error message |
| Remove file | Removes from preview |

### 3.4 `BulkActionsBar.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| No selection | Hidden |
| 1 product selected | Shows "1 selected" |
| 3 products selected | Shows "3 selected" |
| Activate click | Calls bulk activate |
| Deactivate click | Shows confirmation |
| Delete click | Shows confirmation with count |

### 3.5 `DeleteConfirmDialog.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Closed | Not visible |
| Open (single) | Shows "Delete Product" title |
| Open (bulk) | Shows "Delete {N} Products" title |
| Confirm click | Triggers delete action |
| Cancel click | Closes dialog |
| Loading state | Shows spinner on confirm button |

### 3.6 `InlineStockEditor.test.tsx`

| Scenario | Expected Outcome |
|----------|------------------|
| Display mode | Shows stock number |
| Double-click | Converts to input |
| Enter key | Saves and reverts to display |
| Blur | Saves and reverts to display |
| Escape key | Cancels and reverts |
| Invalid value | Shows error, reverts |
| Loading | Shows spinner during save |

---

## 4. End-to-End (E2E) Scenarios (Playwright)

| Scenario ID | Flow Description |
|-------------|------------------|
| **E2E-PROD-01** | **Happy Path: Create Product**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Click "Add New Product".<br>4. Fill name, description, price, category.<br>5. Upload 2 images.<br>6. Select skin types.<br>7. Click "Save Product".<br>8. Verify redirect to product list.<br>9. Verify new product appears in list. |
| **E2E-PROD-02** | **Edit Product**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Click "Edit" on a product.<br>4. Verify form populated with existing data.<br>5. Change name and price.<br>6. Click "Update Product".<br>7. Verify redirect to product list.<br>8. Verify updated product in list. |
| **E2E-PROD-03** | **Delete Product**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Click "Delete" on a product.<br>4. Verify confirmation dialog appears.<br>5. Click "Delete" to confirm.<br>6. Verify product removed from list. |
| **E2E-PROD-04** | **Toggle Product Status**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Toggle "Active" switch off.<br>4. Verify status badge changes to "Inactive".<br>5. Toggle "Active" switch on.<br>6. Verify status badge changes to "Active". |
| **E2E-PROD-05** | **Inline Stock Update**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Double-click stock cell.<br>4. Enter new value.<br>5. Press Enter.<br>6. Verify stock updated. |
| **E2E-PROD-06** | **Bulk Activate**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Select 3 products.<br>4. Click "Bulk Actions" → "Activate Selected".<br>5. Verify products activated. |
| **E2E-PROD-07** | **Bulk Delete**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Select 2 products.<br>4. Click "Bulk Actions" → "Delete Selected".<br>5. Verify confirmation dialog with count.<br>6. Confirm deletion.<br>7. Verify products removed. |
| **E2E-PROD-08** | **Search Products**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Type "serum" in search input.<br>4. Wait for debounced search.<br>5. Verify filtered results. |
| **E2E-PROD-09** | **Filter by Status**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Select "Inactive" from status filter.<br>4. Verify only inactive products shown. |
| **E2E-PROD-10** | **Pagination**<br>1. Login as merchant with 25+ products.<br>2. Navigate to /merchant/products.<br>3. Verify page 1 shown.<br>4. Click "Next".<br>5. Verify page 2 shown. |
| **E2E-PROD-11** | **Permission Denied**<br>1. Login as merchant A.<br>2. Try to access /merchant/products/B-id/edit (merchant B's product).<br>3. Verify 403 Forbidden error. |
| **E2E-PROD-12** | **Image Validation**<br>1. Login as merchant.<br>2. Navigate to product form.<br>3. Try to upload .txt file.<br>4. Verify VAL-PROD-010 error.<br>5. Try to upload 6MB image.<br>6. Verify VAL-PROD-011 error. |
| **E2E-PROD-13** | **Save as Draft**<br>1. Login as merchant.<br>2. Navigate to product form.<br>3. Fill valid data.<br>4. Click "Save as Draft".<br>5. Verify redirect to list.<br>6. Verify product shows "Inactive" status. |
| **E2E-PROD-14** | **Language Toggle**<br>1. Navigate to /merchant/products.<br>2. Toggle language to Japanese.<br>3. Verify all labels in Japanese.<br>4. Toggle back to English. |
| **E2E-PROD-15** | **Theme Toggle**<br>1. Navigate to /merchant/products.<br>2. Toggle to dark mode.<br>3. Verify dark theme applied.<br>4. Toggle to light mode. |
| **E2E-PROD-16** | **Responsive Layout**<br>1. Navigate to /merchant/products on desktop.<br>2. Verify full table layout.<br>3. Resize to mobile.<br>4. Verify horizontal scroll on table. |
| **E2E-PROD-17** | **License Status Restriction (Pending)**<br>1. Login as merchant with pending license.<br>2. Navigate to /merchant/products.<br>3. Verify error toast: "Your account is pending approval. Product management is not available at this time."<br>4. Verify redirect to home page (/). |
| **E2E-PROD-18** | **License Status Restriction (Rejected)**<br>1. Login as merchant with rejected license.<br>2. Verify login alert banner: "Your account has been rejected. Reason: [rejectionReason]"<br>3. Navigate to /merchant/products.<br>4. Verify error toast with rejection reason.<br>5. Verify redirect to home page (/). |
| **E2E-PROD-19** | **Delete Product with Active Orders**<br>1. Login as merchant.<br>2. Navigate to /merchant/products.<br>3. Click "Delete" on a product with active orders.<br>4. Verify confirmation dialog appears.<br>5. Click "Delete" to confirm.<br>6. Verify error toast: "Cannot delete product with active orders. All orders must be completed first."<br>7. Verify product still appears in list. |
| **E2E-PROD-20** | **Delete All Products**<br>1. Login as merchant with multiple products.<br>2. Navigate to /merchant/products.<br>3. Click "Delete All Products" button.<br>4. Verify confirmation dialog shows count of products to be deleted.<br>5. Confirm deletion.<br>6. Verify products deleted, products with active orders skipped.<br>7. Verify success toast with deleted/skipped counts. |

---

## 5. Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Backend Unit Tests | 90% |
| Frontend Component Tests | 85% |
| E2E Critical Paths | 100% |
| Integration Tests | 80% |

---

## 6. Test Data Setup

### 6.1 Test Products

| Name | Price | Stock | Status | Category |
|------|-------|-------|--------|----------|
| Hydrating Serum | 29.99 | 50 | Active | Serums |
| Night Cream | 49.99 | 0 | Active | Moisturizers |
| Sunscreen SPF50 | 19.99 | 5 | Active | Sunscreen |
| Inactive Product | 39.99 | 100 | Inactive | Cleansers |

### 6.2 Test Users

| Email | Role | License Status | Rejection Reason |
|-------|------|----------------|------------------|
| merchant1@test.com | merchant | approved | N/A |
| merchant2@test.com | merchant | approved | N/A |
| merchant_pending@test.com | merchant | pending | N/A |
| merchant_rejected@test.com | merchant | rejected | "Missing business license documentation" |
| buyer@test.com | buyer | N/A | N/A |
| admin@test.com | admin | N/A | N/A |

---

## 7. Cross-References

| Related Document | Purpose |
|-----------------|---------|
| [DD_PROD_05](./DD_Product_Management_05_BUSINESS_LOGIC.md) | Business logic tested by unit tests |
| [DD_PROD_02](./DD_Product_Management_02_FRONTEND_Page.md) | Frontend components tested |
| [DD_PROD_03](./DD_Product_Management_03_API_ENDPOINTS.md) | API endpoints tested |
| [機能設計書_Product_Management](../商品管理画面_機能設計書.md) | Functional requirements |
| [画面項目設計書_Product_Management](../画面項目設計書_Product_Management.md) | Screen items specification |
