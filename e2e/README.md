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

# Update PCL checklists from test results
npm run update-pcl
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

---

## PCL (Program Checklist) Auto-Update

E2E test results automatically update PCL checklist documents for all 15 screen modules.

### How It Works

```
E2E Tests Run
    ↓
modular-reporter.ts writes test-results/{Module}/results.json
    ↓
update-pcl.cjs reads results + e2e/pcl-map/{Module}.json
    ↓
Matches passed test titles → PCL checklist text
    ↓
Replaces "- [ ]" → "- [x]" in each module's PCL file
```

### Run PCL Update

```bash
# 1. Run E2E tests first
npm test

# 2. Update all 15 PCL checklists
npm run update-pcl

# Or update a specific module
npm run update-pcl:SignUp_LogIn
# or: node ../scripts/update-pcl.cjs SearchAndFilter
```

### Output Example

```
📋 PCL Map loaded: 15 modules
📁 Test results directory: e2e/test-results

✅ SignUp_LogIn: 48 passed, 0 failed, 35 PCL items marked
⚠️ SearchAndFilter: 7 passed, 2 failed, 5 PCL items marked
⏭️  Audit_Log: no test results found (skipped)
...

═══════════════════════════════════════
📊 Summary:
   Modules processed: 14/15
   ✅ Total passed:   89
   ❌ Total failed:   5
   📝 PCL items marked: 127
═══════════════════════════════════════
```

### PCL Files

| Screen Module | PCL File |
|---------------|----------|
| SignUp_LogIn | `docs/screen/SignUp_LogIn/SignUp_LogIn_PCL.md` |
| SearchAndFilter | `docs/screen/SearchAndFilter/Search_And_Filter_PCL.md` |
| ProductDetail | `docs/screen/ProductDetail/ProductDetail_PCL.md` |
| Matching_And_Recommendation | `docs/screen/Matching_And_Recommendation/Matching_And_Recommendation_PCL.md` |
| AI_Skin_Analysis | `docs/screen/AI_Skin_Analysis/AI_Skin_Analysis_PCL.md` |
| Wishlist_Cart | `docs/screen/Wishlist_Cart/Wishlist_Cart_PCL.md` |
| Checkout_Purchase | `docs/screen/Checkout_Purchase/Checkout_Purchase_PCL.md` |
| Product_Management | `docs/screen/Product_Management/Product_Management_PCL.md` |
| Advertisement_Management | `docs/screen/Advertisement_Management/Merchant_Advertisement_PCL.md` |
| Ad_Management_Screen | `docs/screen/Ad_Management_Screen/Admin_AdManagement_PCL.md` |
| Promotion_Pages | `docs/screen/Promotion_Pages/Promotion_PCL.md` |
| Review_ContentModeration | `docs/screen/Review_ContentModeration/Review_Content_Moderation_PCL.md` |
| Commission_Revenue | `docs/screen/Commission_Revenue/Commission_Revenue_PCL.md` |
| Order_Insights | `docs/screen/Order_Insights/Order_Insights_PCL.md` |
| Audit_Log | `docs/screen/Audit Log Screen/Admin_Audit_Log_PCL.md` |

### Configuration

Test title → PCL text mappings are stored in `e2e/pcl-map/{ModuleName}.json`.

To add a new mapping:

1. Add checklist item in the screen's `*_PCL.md`
2. Add mapping in `e2e/pcl-map/{ModuleName}.json`:
   ```json
   {
     "pclFile": "docs/screen/ModuleName/Module_PCL.md",
     "specFiles": ["e2e/tests/ModuleName/spec.spec.ts"],
     "mappings": {
       "should do something": "PCL checklist text to match"
     }
   }
   ```

### File Structure

```
e2e/
├── pcl-map/                      # Per-module test title → PCL text mappings
│   ├── SignUp_LogIn.json
│   ├── SearchAndFilter.json
│   └── ... (15 files)
├── test-results/                 # Per-module test results
│   ├── SignUp_LogIn/
│   │   └── results.json          # Generated by modular-reporter.ts
│   ├── SearchAndFilter/
│   │   └── results.json
│   └── ...
scripts/
└── update-pcl.cjs                 # Updates PCL checklists from test results
```
