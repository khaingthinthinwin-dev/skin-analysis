# E2E Testing Guide

## Quick Start

### 1. Install (first time only)
```bash
cd e2e
npm install
npx playwright install chromium
```

### 2. Start Servers
Open 2 terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Run Tests
Open Terminal 3:
```bash
cd e2e
npx playwright test
```

### 4. View Report
```bash
npx playwright show-report
```

---

## Run by Screen

| Screen | Command |
|--------|---------|
| Auth (Login/Register) | `npx playwright test tests/auth/` |
| Admin Ads | `npx playwright test tests/admin/ads/` |
| Admin Audit Log | `npx playwright test tests/admin/audit-log/` |
| Admin Commission | `npx playwright test tests/admin/commission/` |
| Admin Moderation | `npx playwright test tests/admin/moderation/` |
| Merchant Ads | `npx playwright test tests/merchant/ads/` |
| Merchant Products | `npx playwright test tests/merchant/products/` |
| Merchant Promotions | `npx playwright test tests/merchant/promotions/` |
| Buyer Skin Analysis | `npx playwright test tests/buyer/skin-analysis/` |
| Buyer Checkout | `npx playwright test tests/buyer/checkout/` |
| Buyer Matching | `npx playwright test tests/buyer/matching/` |
| Buyer Product Detail | `npx playwright test tests/buyer/product-detail/` |
| Buyer Wishlist/Cart | `npx playwright test tests/buyer/wishlist-cart/` |
| Orders (All Roles) | `npx playwright test tests/shared/orders/` |
| Search & Filter | `npx playwright test tests/shared/search/` |

---

## Useful Commands

```bash
# Run single test file
npx playwright test tests/auth/login.spec.ts

# Run single test by name
npx playwright test -g "should login as buyer"

# Run with UI mode (interactive)
npx playwright test --ui

# Run in debug mode (step by step)
npx playwright test --debug

# Run with headed browser (see browser)
npx playwright test --headed
```

---

## Folder Structure

```
e2e/
├── tests/                  # Test files
│   ├── auth/               # Login, Register
│   ├── admin/              # Admin screens
│   ├── merchant/           # Merchant screens
│   ├── buyer/              # Buyer screens
│   └── shared/             # Multi-role screens
├── pages/                  # Page Objects
├── fixtures/               # Test fixtures
├── utils/                  # Helpers
└── test-results/           # Screenshots & reports
```

---

## Screenshots

Every test captures screenshots in `test-results/screenshots/`.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module` | Run `npm install` in e2e/ |
| `Browser not found` | Run `npx playwright install chromium` |
| `Timeout waiting for server` | Start backend + frontend first |
| `Element not found` | Check selector matches actual UI |
