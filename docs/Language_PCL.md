# Program Checklist (PCL) — Application Language Support

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-I18N-001 |
| **Target Screen** | All mounted application pages |
| **Subsystem** | Application Internationalization |
| **Version** | 1.0 |
| **Created** | 2026-10-16 |
| **Last Updated** | 2026-10-16 |
| **Status** | Active |

> Scope: verify all mounted user-facing routes in English (en), Japanese (ja), and Myanmar (my). This is a cross-application language checklist; it does not assert that each page is already fully translated. Every unchecked item needs test evidence before it is marked passed.

## Route Coverage Inventory

The route sweep scenarios below cover these mounted routes from frontend/src/app/routes.tsx:

| Area | Routes |
|------|--------|
| Public | /, /about, /products, /products/:id, /unauthorized, * (not found) |
| Authentication | /login, /register, /forgot-password, /verify-code, /reset-password |
| Shared account | /dashboard/profile, /dashboard/settings |
| Buyer | /buyer, /buyer/search, /buyer/products, /buyer/products/:id, /buyer/wishlist, /buyer/wishlist/products/:id, /buyer/cart, /buyer/checkout, /buyer/checkout/confirmation/:orderId, /buyer/skin-analysis, /buyer/skin-analysis/history, /buyer/skin-analysis/:id, /buyer/recommendations, /buyer/profile, /buyer/notifications, /orders, /orders/:id |
| Merchant | /merchant, /merchant/products, /merchant/product-review, /merchant/products/new, /merchant/products/:id/view, /merchant/products/:id/edit, /merchant/advertisements, /merchant/promotions, /merchant/promotions/new, /merchant/promotions/:id/edit, /merchant/order-insights, /merchant/orders/:id, /merchant/profile, /merchant/notifications |
| Admin / super_admin | /admin, /admin/users, /admin/orders, /admin/orders/:id, /admin/merchants, /admin/ads, /admin/ads/packages, /admin/ads/fee-history, /admin/ads/analytics, /admin/ads/export, /admin/reviews, /admin/content, /admin/commission-revenue, /admin/audit-logs, /admin/master-data, /admin/create-admin, /admin/profile, /admin/notifications |

> Route parameters must be replaced with valid test records for each role. Commented-out routes and static demo components that are not mounted in the router are excluded.

## 1. Normal Scenarios (N) — Happy Path

- [ ] **N-01**: Language menu exposes all supported languages
  - **Precondition**: Application is open on a route where the language control is available.
  - **Steps**:
    1. Open the language menu.
    2. Inspect the language options.
  - **Expected Result**: English (en), Japanese (ja), and Myanmar (my) are selectable.
  - **Business Rules**: None (supported application languages).
  - **Note**: Not yet verified on all layouts, especially authentication and role-specific layouts.

- [ ] **N-02**: English language sweep covers every mounted route
  - **Precondition**: Valid test accounts and required seed data exist for buyer, merchant, admin, and super_admin routes; routes can be opened directly.
  - **Steps**:
    1. Select English.
    2. Visit every route listed in the Route Coverage Inventory using an authorized account.
    3. Inspect page titles, navigation, buttons, forms, tables, dialogs, validation, empty/loading/error states, and notifications where applicable.
  - **Expected Result**: User-facing text is readable in English; no raw translation keys, blank labels, or unintended mixed-language strings appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: Not yet verified; current page test coverage does not establish a complete application-wide language sweep.

- [ ] **N-03**: Japanese language sweep covers every mounted route
  - **Precondition**: Same route access and data prerequisites as N-02.
  - **Steps**:
    1. Select Japanese (ja).
    2. Visit every route listed in the Route Coverage Inventory using an authorized account.
    3. Inspect page titles, navigation, buttons, forms, tables, dialogs, validation, empty/loading/error states, and notifications where applicable.
  - **Expected Result**: User-facing text is readable in Japanese; no raw translation keys, blank labels, or unintended mixed-language strings appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: Not yet verified; current page test coverage does not establish a complete application-wide language sweep.

- [ ] **N-04**: Myanmar language sweep covers every mounted route
  - **Precondition**: Same route access and data prerequisites as N-02.
  - **Steps**:
    1. Select Myanmar (my).
    2. Visit every route listed in the Route Coverage Inventory using an authorized account.
    3. Inspect page titles, navigation, buttons, forms, tables, dialogs, validation, empty/loading/error states, and notifications where applicable.
  - **Expected Result**: User-facing text is readable in Myanmar; no raw translation keys, blank labels, or unintended mixed-language strings appear.
  - **Business Rules**: None (i18n presentation).
  - **Note**: Not yet verified; current page test coverage does not establish a complete application-wide language sweep.

- [ ] **N-05**: Language switching updates the current page without losing its working state
  - **Precondition**: User is on a page with entered form data, selected filters, or an open dialog.
  - **Steps**:
    1. Enter or select representative page state.
    2. Change language among English, Japanese, and Myanmar.
  - **Expected Result**: Visible copy updates to the selected language and the page remains usable; entered values, filters, and dialog state are preserved unless the page behavior explicitly resets them.
  - **Business Rules**: None (i18n interaction).
  - **Note**: Not yet verified across page families.

- [ ] **N-06**: Language preference persists across navigation and reload
  - **Precondition**: Browser local storage is available.
  - **Steps**:
    1. Select Japanese or Myanmar.
    2. Navigate to another page and reload it.
    3. Open the language menu.
  - **Expected Result**: Selected language remains active and is reflected by the language control after navigation and reload.
  - **Business Rules**: None (language preference persistence).
  - **Note**: i18n config uses localStorage in its detection/cache setup; persistence needs browser-level verification.

- [ ] **N-07**: Shared and role-specific navigation is translated consistently
  - **Precondition**: Buyer, merchant, admin/super_admin, and shared account layouts can be opened.
  - **Steps**:
    1. Inspect header, language menu, sidebar/navigation, profile/notification links, and common action labels in each layout.
    2. Repeat in all three supported languages.
  - **Expected Result**: Shared labels use consistent translations across layouts and role-specific navigation labels match the destination pages.
  - **Business Rules**: None (shared i18n presentation).
  - **Note**: Not yet verified across all layouts.

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [ ] **A-01**: Missing translation key uses a readable fallback
  - **Precondition**: A controlled test fixture omits one key referenced by a page.
  - **Steps**:
    1. Load the page in Japanese or Myanmar with the missing key.
    2. Inspect the affected text.
  - **Expected Result**: Configured English fallback or explicit default text appears; raw key names and blank text are not shown.
  - **Business Rules**: None (configured i18next fallback).
  - **Note**: Use a controlled test fixture; do not delete production translation entries to run this scenario.

- [ ] **A-02**: Locale resource load failure leaves the page usable
  - **Precondition**: Browser/network test can make a locale resource unavailable.
  - **Steps**:
    1. Select Japanese or Myanmar while blocking its translation resource request.
    2. Open representative public, auth, buyer, merchant, and admin pages.
  - **Expected Result**: Pages remain functional with readable fallback text; no blank page, raw keys, or broken controls appear.
  - **Business Rules**: None (i18n resource failure handling).
  - **Note**: Not yet verified; behavior depends on locale loading and fallback handling.

- [ ] **A-03**: Unsupported language code does not break application routes
  - **Precondition**: Test setup can initialize i18next with a code outside en, ja, and my.
  - **Steps**:
    1. Initialize the application with an unsupported language code.
    2. Open representative routes from each route family.
  - **Expected Result**: Application remains usable and displays configured fallback text; unsupported codes are not offered in the language menu.
  - **Business Rules**: None (supported language allowlist and fallback).
  - **Note**: Unsupported codes are not user-selectable; exercise only with controlled test setup.

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [ ] **B-01**: Long Japanese and Myanmar strings remain visible on narrow screens
  - **Precondition**: Route samples from public/auth, buyer, merchant, and admin areas are available at 375x667.
  - **Steps**:
    1. Select Japanese and inspect long headings, buttons, table headers, alerts, and dialogs.
    2. Select Myanmar and repeat.
  - **Expected Result**: Text wraps or adapts without clipping essential copy, hiding actions, or making the page unusable.
  - **Business Rules**: None (localized responsive UI).
  - **Note**: Not yet verified across all page families.

- [ ] **B-02**: Interpolated values and plural forms render correctly in all locales
  - **Precondition**: Seed data covers zero, one, and multiple items/counts where the page supports them.
  - **Steps**:
    1. Inspect count, date, amount, name, and validation-message interpolation in English.
    2. Repeat in Japanese and Myanmar.
  - **Expected Result**: Dynamic values appear in the intended position; required plural/count forms are valid; placeholders such as {{count}} are not shown literally.
  - **Business Rules**: None (i18n interpolation and pluralization).
  - **Note**: Do not assume localized numeral formatting unless the page explicitly implements it.

- [ ] **B-03**: Loading, empty, validation, success, and failure states are translated
  - **Precondition**: Representative pages can be placed in each applicable UI state.
  - **Steps**:
    1. Trigger loading, empty, validation, success, and request-failure states.
    2. Repeat in all three supported languages.
  - **Expected Result**: User-facing state text and actions follow the active language while preserving the meaning and correctness of the state.
  - **Business Rules**: None (i18n presentation); underlying business behavior is unchanged.
  - **Note**: Some states are page-specific; cover applicable states on each route in the inventory.

## 4. Interface Scenarios (I) — Locale Resource Contracts

> These are static translation-resource contract checks; screenshots are not applicable.

- [ ] **I-01**: All supported locale resources load and parse as JSON
  - **Precondition**: Public locale assets are available from the application build.
  - **Steps**:
    1. Load /locales/en/translation.json and parse the response.
    2. Load /locales/ja/translation.json and parse the response.
    3. Load /locales/my/translation.json and parse the response.
  - **Expected Response**: Each supported translation resource loads successfully and parses as a JSON object.
  - **Business Rules**: Supported language codes are en, ja, and my.
  - **Note**: The application also bundles the skin namespace for all three locales; validate that namespace in its locale contract check.

- [ ] **I-02**: Translation keys used by mounted pages resolve in each supported locale
  - **Precondition**: Current route components and locale resources are available for key inventory.
  - **Steps**:
    1. Collect i18n keys referenced by every mounted route in the Route Coverage Inventory, including shared layouts and reusable dialogs/components.
    2. Check each key and any plural/interpolation form in English, Japanese, and Myanmar resources or confirm an intentional English/default fallback.
    3. Confirm no obsolete commented-out route is counted as a mounted page.
  - **Expected Response**: Every user-facing key used by mounted pages resolves to meaningful text or an explicitly accepted fallback in each supported locale; no missing-key output is exposed.
  - **Business Rules**: None (translation resource completeness).
  - **Note**: This is a verification requirement, not a claim that all current keys are already translated.

- [ ] **I-03**: Locale switching and detection use configured language codes
  - **Precondition**: Application i18n instance is initialized.
  - **Steps**:
    1. Select each supported language using the language menu.
    2. Inspect the active i18n language and stored language preference after each selection.
    3. Start a fresh browser context with a supported browser language preference and inspect the initial language behavior.
  - **Expected Response**: changeLanguage selects en, ja, or my; configured detection/cache behavior uses localStorage and supported-language fallback as expected.
  - **Business Rules**: None (i18next configuration contract).
  - **Note**: Assert browser-language negotiation against current i18next config, not an assumed locale priority beyond its configured detection order.

---

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | Complete |
| Application-wide language tests implemented | Pending |
| PCL auto-update verified | Pending |
| Next review date | 2026-10-30 |
