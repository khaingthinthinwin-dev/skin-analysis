# DD_Ad_Management_Screen_06 — Test Specification

> **Doc ID:** SKM-DD-ADM-06 | **Version:** 2.0 | **Status:** Draft
> **Last Updated:** 2026-10-15
> **Target Screen:** Admin Ad Management (管理者広告管理)
> **Subsystem:** Advertisement Management — Admin Ad Review, Approval, Fee Management, Analytics & Reporting
> **Function ID:** FN-ADM-001

---

## 1. Overview

This document defines the testing strategy for the Admin Ad Management module. The current codebase contains a Playwright E2E test skeleton with a page object model. Backend unit tests and frontend component tests are planned but not yet implemented.

---

## 2. Test File Locations

| File | Framework | Purpose |
|------|-----------|---------|
| `e2e/tests/Ad_Management_Screen/ad-management.spec.ts` | Playwright | E2E test scenarios for ad management |
| `e2e/pages/Ad_Management_Screen/AdManagementPage.ts` | Playwright | Page object model for the ad management page |

---

## 3. E2E Test Scenarios (Playwright)

### 3.1 Current Test Structure

The E2E spec uses `test.describe` blocks organized by feature area. Authentication is handled via a shared `auth.fixture`.

```
test.describe('Admin Ad Management')
  ├── test.describe('Page Loading')
  │   └── should display ad management page with ad list
  ├── test.describe('Ad Review')
  │   ├── should approve a pending ad [TODO]
  │   └── should reject a pending ad [TODO]
  └── test.describe('Export')
      └── should export ad report as CSV [TODO]
```

### 3.2 Page Object Model

`AdManagementPage` provides locators and helper methods:

| Member | Type | Description |
|--------|------|-------------|
| `adList` | Locator | Ad list table container |
| `approveButton` | Locator | Approve action button |
| `rejectButton` | Locator | Reject action button |
| `bulkApproveButton` | Locator | Bulk approve button |
| `searchInput` | Locator | Shop search textbox |
| `statusFilter` | Locator | Status filter combobox |
| `exportButton` | Locator | Export navigation button |
| `goto()` | method | Navigates to `/admin/ads`, waits for network idle, captures screenshot |
| `capture(step)` | method | Captures screenshot with step label |

### 3.3 Planned E2E Scenarios

| Scenario | Steps | Expected Outcome |
|----------|-------|------------------|
| **Page loads with ad list** | Navigate to `/admin/ads` | Ad list, search input, and export button are visible |
| **Approve a pending ad** | Select a pending ad → click Approve | Toast "Advertisement approved"; pending count decrements |
| **Reject a pending ad** | Select a pending ad → click Reject → enter reason → confirm | Toast "Advertisement rejected"; ad shows rejected status |
| **Export ad report as CSV** | Click Export → select report type → set date range → Generate | CSV file downloads with correct filename |

---

## 4. Key Test Patterns

### 4.1 Authentication

Tests import from a shared `auth.fixture` that handles admin authentication before each test.

### 4.2 Screenshot Capture

Every test captures screenshots at key steps using `adPage.capture(stepLabel)`. Screenshots are saved with descriptive names (e.g., `N-01_1_ad_approve_action`).

### 4.3 Page Object Pattern

All page interactions go through the `AdManagementPage` class, which encapsulates:
- Locator definitions (using `getByRole`, `locator`)
- Navigation helpers (`goto()`)
- Screenshot utilities (`capture()`)

### 4.4 Async/Await with Network Idle

Navigation waits for `networkidle` to ensure TanStack Query data has loaded before assertions.

---

## 5. Coverage Areas

### 5.1 Current Coverage

| Area | Status | Notes |
|------|--------|-------|
| Page load | Implemented | Verifies ad list, search input, export button visible |
| Approve ad | Skeleton (TODO) | Test exists but logic not implemented |
| Reject ad | Skeleton (TODO) | Test exists but logic not implemented |
| Export CSV | Skeleton (TODO) | Test exists but logic not implemented |

### 5.2 Planned Coverage

| Area | Description |
|------|-------------|
| **Ad List Filtering** | Status, placement, tier, shop search (debounced), date range filters |
| **Bulk Approve** | Multi-select pending ads → bulk approve flow |
| **Bulk Reject** | Multi-select pending ads → bulk reject with reason |
| **Fee Settings CRUD** | Create, edit, deactivate, reactivate fee settings |
| **Fee History** | View history, month filter, bulk delete (non-current-month) |
| **Revenue Analytics** | Date range picker, placement/tier filters, summary metrics, charts |
| **Export Reports** | All 3 report types (ad performance, submission history, fee history) |
| **Validation** | Zod schema validation (required fields, max lengths, UUID formats) |
| **Error Handling** | Toast notifications for API failures |
| **Pagination** | Page navigation, page size selector |
| **Notification Deep Link** | `?highlightAdId` parameter highlights and scrolls to ad |

### 5.3 Frontend Component Tests (Planned)

Using Vitest + React Testing Library:

| Component | Test Focus |
|-----------|------------|
| `AdReviewModal` | Modal open/close, approve/reject actions, form validation, fee display |
| `BulkApproveModal` | Confirm/cancel, loading state |
| `BulkRejectModal` | Reason validation, confirm/cancel, loading state |
| `CreateFeeModal` | Form validation, duplicate combination disable, submit flow |
| `EditFeeModal` | Pre-filled values, validation, submit flow |
| `DeactivateFeeModal` | Warning display, reason validation |
| `ReactivateFeeModal` | Optional reason, confirm flow |
| `DeleteFeeHistoryModal` | Confirm/cancel, loading state |
| `ExportConfigForm` | Date range validation, filter selection, generate button state |
| `AdTable` | Row rendering, checkbox selection, highlight, skeleton loading |
| `FilterBar` | Filter controls, debounced shop search, reset |
| `badges` | Status/payment/tier badge rendering and colors |

### 5.4 Backend Unit Tests (Planned)

| Service | Test Focus |
|---------|------------|
| `admin-ad-management.service.ts` | listAds, approveAd, rejectAd, bulkApproveAds, bulkRejectAds |
| `admin-ad-fee.service.ts` | CRUD operations, uniqueness checks, fee history logging |
| `admin-ad-analytics.service.ts` | Revenue aggregation, date range validation |
| `admin-ad-export.service.ts` | CSV generation, column correctness |

---

## 6. Test Data Requirements

### 6.1 Ad Fixtures

| Fixture | Key Fields |
|---------|------------|
| Pending ad | `approvalStatus: 'pending'`, has image, schedule, payment |
| Approved ad | `approvalStatus: 'approved'`, `approvedBy`, `approvedAt` set |
| Rejected ad | `approvalStatus: 'rejected'`, `rejectionReason` set |

### 6.2 Fee Setting Fixtures

| Fixture | Key Fields |
|---------|------------|
| Active fee setting | `isActive: true`, valid placement/tier |
| Inactive fee setting | `isActive: false` |

### 6.3 Fee History Fixtures

| Fixture | Key Fields |
|---------|------------|
| Current month record | `createdAt` within current month (protected) |
| Previous month record | `createdAt` in previous month (deletable) |

---

## 7. Cross-References

| Related Document | Purpose |
|------------------|---------|
| [DD_Ad_Management_Screen_05_BUSINESS_LOGIC.md](./DD_Ad_Management_Screen_05_BUSINESS_LOGIC.md) | Business logic specification |

---

*End of Test Specification (Admin Ad Management Screen)*
