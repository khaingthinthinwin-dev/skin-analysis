# PCL (Pre-condition Checklist) Template Guide

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-GUIDE-PCL-001 |
| **Purpose** | Standard template for creating Pre-condition Checklists per screen/module |
| **Version** | 2.0 |
| **Created** | 2026-09-16 |
| **Last Updated** | 2026-09-16 |
| **Status** | Active |

---

## 1. What is a PCL?

A **Pre-condition Checklist (PCL)** is a comprehensive checklist that tracks whether all pre-conditions for a screen/module are met before development begins. It covers database, backend, frontend, testing, security, and documentation.

**Purpose:**
- Ensure all dependencies are identified before coding starts
- Provide a single source of truth for implementation readiness
- Enable parallel work across team members
- Serve as a verification checklist after implementation

---

## 2. Naming Convention

| Item | Convention | Example |
|------|-----------|---------|
| **File Name** | `{ScreenName}_PCL.md` | `Product_Management_PCL.md` |
| **File Location** | `docs/screen/{ScreenFolder}/` | `docs/screen/Product_Management/` |
| **Document ID** | `SKM-PCL-{MODULE}-{NNN}` | `SKM-PCL-PROD-001` |

---

## 3. Test Case Classification Guide

Every PCL must classify test cases into 4 categories:

| Category | Symbol | Description |
|----------|--------|-------------|
| **Normal** | N | Standard happy-path operations — correct inputs, valid states, expected outcomes |
| **Abnormal** | A | Error scenarios — invalid inputs, permission denied, conflict states, server errors |
| **Boundary** | B | Edge conditions — min/max values, empty states, limit thresholds, exact boundaries |
| **Interface** | I | API-level testing — request/response contracts, status codes, payload validation |

### How to Read Each Test Case

Each test case follows this structure:

```
- [ ] **ID**: Title
  - **Precondition**: What must be true before test runs
  - **Steps**: Step-by-step actions to perform
  - **Expected Result**: What should happen
  - **Business Rules**: Which BR-XXX rules apply
  - **API**: Which endpoint is involved (if applicable)
```

---

## 3. Standard 23-Section Template

Every PCL must follow this structure:

```
 1. Database & Schema
 2. Seed Data
 3. Backend — Module Structure
 4. Backend — API Endpoints
 5. Backend — Business Rules
 6. Backend — Validation
 7. Frontend — Module & Routing
 8. Frontend — Screen Layout
 9. Frontend — UI Elements
10. Frontend — Form Handling
11. Frontend — Error Handling
12. Frontend — State Management
13. Frontend — i18n
14. Frontend — Responsive Design
15. Frontend — Accessibility
16. Frontend — Loading States
17. Caching
18. Testing — Unit Tests
19. Testing — Integration Tests
20. Testing — E2E Tests
21. Performance
22. Security
23. Documentation
```

---

## 4. Section-by-Section Guide

### Section 1: Database & Schema

**What goes here:** All database tables, foreign keys, constraints, and indexes your screen depends on.

**Where to find it:** `docs/core-work/データベース設計書_DATABASE_SPEC.md`

**How to fill:**
1. Find your screen's tables in the DATABASE_SPEC
2. List each table with its required columns
3. List foreign key relationships
4. List unique/check constraints
5. List indexes

**Example:**
```markdown
- [ ] `products` table exists with all required columns (`id`, `name`, `slug`, `price`, ...)
- [ ] `reviews` table exists with `id`, `user_id`, `product_id`, `rating`, `body`, `is_approved`
- [ ] Foreign key: `reviews.product_id` → `products.id` (CASCADE)
- [ ] Unique constraint on `reviews` (`user_id`, `product_id`) — `uq_reviews_user_product`
- [ ] Check constraint: `reviews.rating` between 1 and 5 — `chk_reviews_rating`
- [ ] Indexes on `reviews.product_id`, `reviews.user_id`
- [ ] Prisma schema matches database schema
```

---

### Section 2: Seed Data

**What goes here:** Test data required for development and testing.

**Where to find it:** Check existing seed scripts or create new requirements.

**How to fill:**
1. List users/roles needed
2. List master data (categories, statuses, etc.)
3. List sample records for testing
4. Note any special conditions (active/inactive, approved/pending)

**Example:**
```markdown
- [ ] At least 4 merchants with approved license status
- [ ] At least 20 products across merchants and categories
- [ ] Products have realistic names, descriptions, prices
- [ ] Mix of `isActive: true` and `isActive: false`
- [ ] Stock quantities vary (in stock, low stock, out of stock)
- [ ] Buyer user pre-seeded for authenticated tests
```

---

### Section 3: Backend — Module Structure

**What goes here:** NestJS modules, controllers, services, guards, DTOs.

**Where to find it:** `docs/screen/{Screen}/Detailed Design/DD_*_01_MODULE_OVERVIEW.md`

**How to fill:**
1. List all NestJS modules
2. List controllers with their endpoints
3. List services with business logic
4. List guards (JwtAuthGuard, RolesGuard, etc.)
5. List DTOs for validation

**Example:**
```markdown
- [ ] `ProductsModule` created and registered in `AppModule`
- [ ] `ProductsController` with CRUD endpoints
- [ ] `ProductsService` with business logic
- [ ] DTOs: `CreateProductDto`, `UpdateProductDto`
- [ ] Guards: `JwtAuthGuard`, `RolesGuard`, `LicenseStatusGuard`
- [ ] Proper error handling with consistent error responses
```

---

### Section 4: Backend — API Endpoints

**What goes here:** All API endpoints with HTTP methods, paths, and auth requirements.

**Where to find it:** `docs/screen/{Screen}/Detailed Design/DD_*_03_API_ENDPOINTS.md`

**How to fill:**
1. List each endpoint with HTTP method
2. Specify path and path parameters
3. Note authentication requirements
4. Note request/response format

**Example:**
```markdown
### Product CRUD
- [ ] `GET /api/v1/products` — List products (public)
- [ ] `GET /api/v1/products/:id` — Get product (public)
- [ ] `POST /api/v1/products` — Create product (merchant/admin)
- [ ] `PATCH /api/v1/products/:id` — Update product (merchant/admin)
- [ ] `DELETE /api/v1/products/:id` — Soft delete (merchant/admin)

### Response Format
- [ ] Consistent response structure with `data` payload
- [ ] Proper HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
```

---

### Section 5: Backend — Business Rules

**What goes here:** All business rules with rule IDs, descriptions, and enforcement layer.

**Where to find it:** `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` and `docs/screen/{Screen}/機能設計書*.md`

**How to fill:**
1. Extract all business rules from the functional spec
2. Assign rule IDs (BR-{MODULE}-{NNN})
3. Describe each rule clearly
4. Note enforcement layer (Backend/Frontend/Both)

**Example:**
```markdown
### Product Rules
- [ ] **BR-PROD-001**: Only `is_active = true` products returned publicly
- [ ] **BR-PROD-002**: Price must be > 0
- [ ] **BR-PROD-003**: SKU uniqueness enforced
- [ ] **BR-PROD-004**: Slug auto-generated from name, unique

### Review Rules
- [ ] **BR-PROD-005**: Only verified purchasers can review
- [ ] **BR-PROD-006**: One review per user per product
- [ ] **BR-PROD-007**: Rating must be between 1 and 5
```

---

### Section 6: Backend — Validation

**What goes here:** DTO validation rules using class-validator decorators.

**Where to find it:** `docs/screen/{Screen}/Detailed Design/DD_*_04_DTOS_AND_TYPES.md`

**How to fill:**
1. List all DTOs
2. List validation decorators for each field
3. Note file upload validation rules

**Example:**
```markdown
- [ ] All DTOs use `class-validator` decorators
- [ ] `@IsString()`, `@IsNotEmpty()`, `@MaxLength(255)` on name
- [ ] `@IsNumber()`, `@Min(0.01)` on price
- [ ] `@IsOptional()` on optional fields
- [ ] `@IsArray()`, `@IsIn()` on enum fields
- [ ] ValidationPipe applied globally with `{ whitelist: true }`
```

---

### Section 7: Frontend — Module & Routing

**What goes here:** Frontend routes, guards, lazy loading.

**Where to find it:** `frontend/src/app/routes.tsx` and `docs/screen/{Screen}/Detailed Design/DD_*_02_FRONTEND_Page.md`

**How to fill:**
1. List all routes with paths
2. Note authentication guards
3. Note role-based access
4. Note lazy loading setup

**Example:**
```markdown
- [ ] Product list route: `/merchant/products`
- [ ] Product create route: `/merchant/products/new`
- [ ] Product edit route: `/merchant/products/:id/edit`
- [ ] Routes protected with authentication guard
- [ ] Routes protected with role guard (merchant/admin)
- [ ] Lazy-loaded routes for code splitting
```

---

### Section 8: Frontend — Screen Layout

**What goes here:** Overall page structure for desktop, tablet, mobile.

**Where to find it:** `docs/screen/{Screen}/画面項目設計書*.md` (Section 3: Layout)

**How to fill:**
1. Describe desktop layout (columns, sections)
2. Describe tablet layout
3. Describe mobile layout
4. Note any sticky/fixed elements

**Example:**
```markdown
### Desktop Layout (>= 1024px)
- [ ] Two-column layout: sidebar + main content
- [ ] Table with sortable columns
- [ ] Pagination at bottom

### Mobile Layout (< 768px)
- [ ] Single-column stacked layout
- [ ] Cards instead of table rows
- [ ] Sticky action bar at bottom
```

---

### Section 9: Frontend — UI Elements

**What goes here:** All UI elements with IDs, component types, and i18n keys.

**Where to find it:** `docs/screen/{Screen}/画面項目設計書*.md` (Section 4: Item Definitions)

**How to fill:**
1. List each UI element
2. Specify component type (Button, Input, Badge, etc.)
3. Note i18n key
4. Note required/optional status

**Example:**
```markdown
| Element ID | Element Name | Component | i18n Key | Required |
|------------|--------------|-----------|----------|:--------:|
| `btnSearch` | Search Button | Button | `common.search` | Yes |
| `inputSearch` | Search Input | Input | `products.searchPlaceholder` | Yes |
| `tableProducts` | Product Table | Table | — | Yes |
| `badgeStatus` | Status Badge | Badge | `common.status` | Yes |
```

---

### Section 10: Frontend — Form Handling

**What goes here:** Zod schemas, React Hook Form setup, validation rules.

**Where to find it:** `frontend/src/schemas/` or `frontend/src/features/{module}/schemas/`

**How to fill:**
1. List all forms in the screen
2. List Zod schema fields
3. Note validation rules
4. Note form submission behavior

**Example:**
```markdown
### Product Create/Edit Form
- [ ] React Hook Form + Zod schema validation
- [ ] Product Name: required, max 255 chars
- [ ] Price: required, min 0.01
- [ ] Category: required, select dropdown
- [ ] Images: optional, max 10 files, JPG/PNG/WebP only
- [ ] Submit button disabled during submission
- [ ] Form-level error summary banner
```

---

### Section 11: Frontend — Error Handling

**What goes here:** HTTP status codes mapped to UI behaviors.

**Where to find it:** `docs/screen/{Screen}/機能設計書*.md` (Error Handling section)

**How to fill:**
1. List all HTTP error codes your screen handles
2. Describe UI behavior for each

**Example:**
```markdown
- [ ] 400: Inline field-level errors + top banner
- [ ] 401: Redirect to `/login`
- [ ] 403: "You don't have permission" message
- [ ] 404: "Product not found" with back link
- [ ] 409: "A product with this name already exists"
- [ ] 413: "File size exceeds limit"
- [ ] 429: "Too many attempts. Try again later"
- [ ] 500: "Something went wrong" + retry button
- [ ] Network error: Toast "Network error. Check connection"
```

---

### Section 12: Frontend — State Management

**What goes here:** React Query setup, cache keys, optimistic updates.

**Where to find it:** `frontend/src/features/{module}/hooks/`

**How to fill:**
1. List React Query hooks
2. List cache keys
3. Note cache invalidation strategy
4. Note optimistic updates

**Example:**
```markdown
- [ ] Product list fetched via `useProducts()` hook
- [ ] Product detail fetched via `useProductDetail()` hook
- [ ] Cache key: `products`, `product-{id}`
- [ ] Cache invalidation on mutation
- [ ] Optimistic update for toggle actions (active/featured)
- [ ] Loading states managed per query
```

---

### Section 13: Frontend — i18n

**What goes here:** Translation key structure for EN, JA, MY.

**Where to find it:** `frontend/src/i18n/locales/{lang}/`

**How to fill:**
1. List translation namespaces
2. List key categories
3. Note any special translation requirements

**Example:**
```markdown
- [ ] Translation file: `frontend/src/i18n/locales/{lang}/products.json`
- [ ] Labels: `products.name`, `products.price`, `products.stock`
- [ ] Errors: `products.errors.nameRequired`, `products.errors.priceInvalid`
- [ ] Placeholders: `products.searchPlaceholder`
- [ ] Toast messages: `products.created`, `products.updated`, `products.deleted`
- [ ] Language toggle works on all pages
```

---

### Section 14: Frontend — Responsive Design

**What goes here:** Breakpoint behaviors and responsive adjustments.

**Where to find it:** `docs/screen/{Screen}/画面項目設計書*.md` (Section 3.2)

**How to fill:**
1. List all breakpoints
2. Describe layout at each breakpoint
3. Note any show/hide behavior

**Example:**
```markdown
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single column, stacked cards, sticky CTA |
| Tablet | 768px - 1023px | Two columns, condensed table |
| Desktop | >= 1024px | Full layout, sidebar, full table |
| Wide | >= 1280px | Enhanced spacing, max-width container |
```

---

### Section 15: Frontend — Accessibility

**What goes here:** ARIA, keyboard navigation, color contrast.

**Where to find it:** `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` (Accessibility section)

**How to fill:**
1. List ARIA requirements
2. List keyboard navigation
3. Note color contrast requirements

**Example:**
```markdown
- [ ] Semantic HTML throughout (`<table>`, `<form>`, `<button>`)
- [ ] `aria-label` on all icon buttons
- [ ] `aria-live="polite"` on error alerts
- [ ] Full keyboard navigation (Tab, Enter, Escape)
- [ ] WCAG AA color contrast (4.5:1 minimum)
- [ ] Focus indicators visible on all interactive elements
```

---

### Section 16: Frontend — Loading States

**What goes here:** Skeletons, spinners, disabled states.

**Where to find it:** `docs/screen/{Screen}/画面項目設計書*.md`

**How to fill:**
1. List all loading states
2. Specify component (skeleton, spinner, etc.)

**Example:**
```markdown
- [ ] Skeleton loader for product table rows
- [ ] Skeleton loader for product detail page
- [ ] Spinner on save button during submission
- [ ] Disabled state on buttons during API calls
- [ ] Loading overlay for image uploads
```

---

### Section 17: Caching

**What goes here:** Redis cache keys, TTL, invalidation rules.

**Where to find it:** `docs/screen/{Screen}/機能設計書*.md` (Non-Functional section)

**How to fill:**
1. List cache key patterns
2. List TTL values
3. List invalidation triggers

**Example:**
```markdown
- [ ] Product list cache key: `cache:products:list:{hash}`
- [ ] Product detail cache key: `cache:product:{id}`
- [ ] TTL: 2 minutes (list), 5 minutes (detail)
- [ ] Cache invalidation on create/update/delete
- [ ] Cache invalidation on stock update
```

---

### Section 18: Testing — Unit Tests

**What goes here:** Backend and frontend unit test cases.

**Where to find it:** `docs/screen/{Screen}/Detailed Design/DD_*_06_TEST_SPEC.md`

**How to fill:**
1. List backend service test cases
2. List frontend component test cases
3. Note coverage targets

**Example:**
```markdown
### Backend Unit Tests
- [ ] `ProductsService.create()` — success case
- [ ] `ProductsService.create()` — validation failure
- [ ] `ProductsService.update()` — success case
- [ ] `ProductsService.update()` — ownership check
- [ ] `ProductsService.delete()` — success case
- [ ] `ProductsService.delete()` — active orders blocked

### Frontend Unit Tests
- [ ] Product list renders correctly
- [ ] Search filters products
- [ ] Form validation displays errors
- [ ] Toggle active/featured updates UI
```

---

### Section 19: Testing — Integration Tests

**What goes here:** API flow tests.

**Where to find it:** `docs/screen/{Screen}/Detailed Design/DD_*_06_TEST_SPEC.md`

**How to fill:**
1. List API integration test scenarios
2. Note expected results

**Example:**
```markdown
- [ ] Create product via API — full flow
- [ ] Update product via API — full flow
- [ ] Delete product via API — soft delete
- [ ] Delete product with active orders — blocked
- [ ] Upload images — validation and storage
- [ ] Pagination — correct results
- [ ] Search — correct filtering
- [ ] Unauthorized access — 401
- [ ] Forbidden access — 403
```

---

### Section 20: Testing — E2E Tests

**What goes here:** Playwright E2E test scenarios with full test case format.

**Where to find it:** `e2e/tests/{Screen}/`

**How to fill:**
1. List E2E test scenarios grouped by classification (N/A/B/I)
2. Each test case must include: precondition, steps, expected result, business rules, API endpoint
3. Use the classification symbols: N (Normal), A (Abnormal), B (Boundary), I (Interface)

**Example (detailed format):**
```markdown
### N-01: Product list loads with data
- **Precondition**: At least 5 active products exist in the database; user is authenticated as merchant
- **Steps**:
  1. Navigate to `/merchant/products`
  2. Wait for page load
  3. Verify product table is visible
  4. Verify at least 5 rows are displayed
- **Expected Result**: Product table shows product name, price, stock, status, and action buttons
- **Business Rules**: BR-PROD-001
- **API**: `GET /api/v1/products`

### A-01: Create product without required fields
- **Precondition**: User is authenticated as merchant
- **Steps**:
  1. Navigate to `/merchant/products/new`
  2. Leave all fields empty
  3. Click submit button
- **Expected Result**: Validation errors displayed for all required fields; form not submitted
- **Business Rules**: BR-PROD-002, BR-PROD-003
- **API**: `POST /api/v1/products`

### B-01: Product name at maximum length
- **Precondition**: User is authenticated as merchant
- **Steps**:
  1. Navigate to `/merchant/products/new`
  2. Enter product name with exactly 255 characters
  3. Fill all other required fields
  4. Click submit button
- **Expected Result**: Product created successfully
- **Business Rules**: BR-PROD-004
- **API**: `POST /api/v1/products`

### I-01: Product API returns correct response format
- **Precondition**: Valid JWT token provided
- **Steps**:
  1. Call `GET /api/v1/products` with valid auth header
  2. Verify response status code is 200
  3. Verify response body contains `data` array
  4. Verify each item has required fields
- **Expected Response**: `{ data: Product[], meta: { total, page, limit } }`
- **Business Rules**: BR-PROD-001
- **API**: `GET /api/v1/products`
```

---

### Section 21: Performance

**What goes here:** Response time targets and performance requirements.

**Where to find it:** `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` (Non-Functional section)

**How to fill:**
1. List API response time targets
2. List page load targets
3. Note caching strategy

**Example:**
```markdown
- [ ] Product list API <= 500ms response time
- [ ] Product create API <= 1s response time
- [ ] Product update API <= 500ms response time
- [ ] Image upload <= 3s for 5MB file
- [ ] Redis cache implemented for product list
- [ ] Cache TTL: 2 minutes for list, 5 minutes for detail
```

---

### Section 22: Security

**What goes here:** Authentication, authorization, security measures.

**Where to find it:** `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` (Security section)

**How to fill:**
1. List authentication requirements
2. List authorization rules
3. List security measures

**Example:**
```markdown
- [ ] JWT authentication on all product endpoints
- [ ] Role-based access control (merchant/admin)
- [ ] Ownership verification (merchant can only manage own products)
- [ ] License status verification (pending merchants restricted)
- [ ] Input sanitization (XSS prevention)
- [ ] File upload security (MIME type, size limits)
- [ ] Rate limiting on product endpoints
- [ ] Audit logging for product CRUD operations
```

---

### Section 23: Documentation

**What goes here:** Swagger, API docs, spec completeness.

**Where to find it:** `docs/screen/{Screen}/` folder

**How to fill:**
1. List documentation deliverables
2. Note completeness status

**Example:**
```markdown
- [ ] API documentation via Swagger/OpenAPI
- [ ] All endpoints documented with request/response examples
- [ ] Error codes documented
- [ ] Business rules documented
- [ ] Screen items specification complete
- [ ] Functional specification complete
- [ ] Detailed design documents complete
```

---

## 24. Sign-Off

At the end of every PCL, include a sign-off table:

```markdown
| Item | Status |
|------|--------|
| All sections reviewed | ☑️ |
| Accuracy verified | ☑️ |
| Completeness confirmed | ☑️ |
| Next review date | (Date) |
```

---

## 5. Checkbox Format

| Checkbox | Meaning |
|----------|---------|
| `- [ ]` | Not implemented / Not verified |
| `- [x]` | Implemented and verified |

---

## 6. How to Create a PCL (Step-by-Step)

### Step 1: Read the Functional Spec
Read `docs/screen/{Screen}/機能設計書*.md` to understand:
- Use cases and workflows
- Business rules
- API endpoints
- Error handling

### Step 2: Read the Screen Items Spec
Read `docs/screen/{Screen}/画面項目設計書*.md` to understand:
- UI elements and layouts
- Responsive breakpoints
- i18n keys
- Accessibility requirements

### Step 3: Read the Detailed Design
Read `docs/screen/{Screen}/Detailed Design/DD_*` files to understand:
- Module structure
- API endpoint details
- DTO definitions
- Business logic details
- Test specifications

### Step 4: Read the Database Spec
Read `docs/core-work/データベース設計書_DATABASE_SPEC.md` to find:
- Table structures
- Foreign keys
- Constraints
- Indexes

### Step 5: Fill Each Section
Go through each of the 23 sections and fill in the checklist items based on what you learned from the specs.

### Step 6: Review with Team
Review your PCL with the team to ensure completeness and accuracy.

---

## 7. Reference PCLs

| Screen | PCL File | Location | Document ID |
|--------|----------|----------|-------------|
| SignUp_LogIn | `SignUp_Login_PCL.md` | `docs/screen/SignUp_LogIn/` | SKM-PCL-SIGNUP-001 |
| Product Management | `Product_Management_PCL.md` | `docs/screen/Product_Management/` | SKM-PCL-PROD-001 |
| Product Detail | `Product_Detail_PCL.md` | `docs/screen/ProductDetail/` | SKM-PCL-PROD-002 |

---

## 8. Questions?

Contact the Project Leader or Tech Lead for questions about PCL creation.

---

*Document maintained by the Engineering Division. Last updated: 2026-09-16.*
