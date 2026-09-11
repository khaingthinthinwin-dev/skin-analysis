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
| Sign Up / Log In | `npx playwright test tests/SignUp_LogIn/` |
| Search & Filter | `npx playwright test tests/SearchAndFilter/` |
| Product Detail | `npx playwright test tests/ProductDetail/` |
| Matching & Recommendation | `npx playwright test tests/Matching_And_Recommendation/` |
| AI Skin Analysis | `npx playwright test tests/AI_Skin_Analysis/` |
| Wishlist & Cart | `npx playwright test tests/Wishlist_Cart/` |
| Checkout & Purchase | `npx playwright test tests/Checkout_Purchase/` |
| Product Management | `npx playwright test tests/Product_Management/` |
| Advertisement Management (Merchant) | `npx playwright test tests/Advertisement_Management/` |
| Promotion Pages | `npx playwright test tests/Promotion_Pages/` |
| Ad Management Screen (Admin) | `npx playwright test tests/Ad_Management_Screen/` |
| Review & Content Moderation | `npx playwright test tests/Review_ContentModeration/` |
| Commission & Revenue | `npx playwright test tests/Commission_Revenue/` |
| Order Insights | `npx playwright test tests/Order_Insights/` |
| Audit Log | `npx playwright test tests/Audit_Log/` |

---

## Useful Commands

```bash
# Run single test file
npx playwright test tests/SignUp_LogIn/login.spec.ts

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
├── tests/                          # Test files (organized by screen)
│   ├── SignUp_LogIn/               # Login, Register
│   ├── SearchAndFilter/            # Search & filter tests
│   ├── ProductDetail/              # Product detail tests
│   ├── Matching_And_Recommendation/# Matching & recommendation tests
│   ├── AI_Skin_Analysis/           # Skin analysis tests
│   ├── Wishlist_Cart/              # Wishlist & cart tests
│   ├── Checkout_Purchase/          # Checkout & purchase tests
│   ├── Product_Management/         # Merchant product management
│   ├── Advertisement_Management/   # Merchant ad management
│   ├── Promotion_Pages/            # Merchant promotions
│   ├── Ad_Management_Screen/       # Admin ad management
│   ├── Review_ContentModeration/   # Admin content moderation
│   ├── Commission_Revenue/         # Admin commission & revenue
│   ├── Order_Insights/             # Order insights (all roles)
│   └── Audit_Log/                  # Admin audit log
├── pages/                          # Page Objects (mirrors tests/ structure)
├── fixtures/                       # Test fixtures
├── utils/                          # Helpers (screenshot, constants)
├── global-teardown.ts              # Organizes test-results into screen folders
└── test-results/                   # Output (organized by screen)
    ├── SignUp_LogIn/               # Test result artifacts
    ├── SignUp_LogIn_Screenshots/   # Screenshots for SignUp_LogIn tests
    └── ...
```

---

## Screenshots

Screenshots are saved automatically into screen-specific folders:
- `test-results/{ScreenName}_Screenshots/` — captured during tests
- `test-results/{ScreenName}/` — Playwright auto-screenshots (on failure/retry)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module` | Run `npm install` in e2e/ |
| `Browser not found` | Run `npx playwright install chromium` |
| `Timeout waiting for server` | Start backend + frontend first |
| `Element not found` | Check selector matches actual UI |
