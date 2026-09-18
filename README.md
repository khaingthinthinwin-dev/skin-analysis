# Cosmetics Finder

A full-stack marketplace platform connecting buyers with skincare merchants, powered by AI skin analysis and smart product recommendations.

## Overview

- **Buyers** register, run AI skin analysis, receive personalized product recommendations, browse/filter products, manage wishlists, and checkout.
- **Merchants** manage products, inventory, shop profiles, promotions, coupons, and view sales analytics.
- **Admins** oversee users, merchants, content moderation, revenue, and platform analytics.

## Architecture

```
+-------------------+       HTTPS (JWT)       +-------------------+
|  React SPA        | <---------------------> |  NestJS REST API  |
|  (Vite + React 19)|                         |  (API v1)         |
+-------------------+                         +--------+----------+
                                                       |
                                     +-----------------+-----------------+
                                     |                                 |
                              +------+------+                   +------+------+
                              | PostgreSQL  |                   |    Redis    |
                              | (Prisma v7) |                   |  (Cache)   |
                              +-------------+                   +-------------+
```

**Request flow:** Client -> Global pipes (validation) -> JwtAuthGuard (token + Redis blacklist) -> RolesGuard (RBAC) -> Controller -> Service -> Prisma/Redis -> Response.

## Technology Stack

### Backend

| Layer | Technology |
|-------|-----------|
| Runtime / Framework | Node.js + NestJS 11 |
| Language | TypeScript 5.7 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 (ioredis) |
| Auth | JWT (access + refresh token rotation), Argon2 |
| API Docs | Swagger/OpenAPI |
| Testing | Jest + Supertest |

### Frontend

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite 6 |
| Routing | React Router 7 |
| Server State | TanStack Query 5 |
| Forms | React Hook Form 7 + Zod 4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS 4 |
| i18n | i18next (EN / MY / JA) |
| HTTP Client | Axios |
| Testing | Vitest + React Testing Library |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### 1. Clone and install

```bash
git clone <repo-url>
cd skin-analysis

# Install git hooks
git config core.hooksPath .githooks

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env — set VITE_API_URL
```

### 3. Initialize database

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 4. Start development servers

```bash
# Terminal 1 — Backend
cd backend
npm run start:dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Backend runs on `http://localhost:8080`, Swagger docs at `http://localhost:8080/api/docs`.
Frontend runs on `http://localhost:3000`.

### 5. Install E2E dependencies (optional)

```bash
cd e2e
npm install
npx playwright install chromium
```

## Development Workflow

| Task | Command |
|------|---------|
| **Backend** | |
| Start (watch) | `cd backend && npm run start:dev` |
| Lint | `cd backend && npm run lint` |
| Format | `cd backend && npm run format` |
| Unit tests | `cd backend && npm run test` |
| E2E tests | `cd backend && npm run test:e2e` |
| Generate Prisma client | `cd backend && npm run db:generate` |
| Create migration | `cd backend && npm run db:migrate` |
| Open Prisma Studio | `cd backend && npm run db:studio` |
| **Frontend** | |
| Start dev server | `cd frontend && npm run dev` |
| Lint | `cd frontend && npm run lint` |
| Build | `cd frontend && npm run build` |
| Unit tests | `cd frontend && npm run test` |
| **E2E Tests (Playwright)** | |
| Install Playwright | `cd e2e && npm install && npx playwright install chromium` |
| Run all E2E tests | `cd e2e && npm test` |
| Run tests with UI | `cd e2e && npm run test:ui` |
| Debug tests | `cd e2e && npm run test:debug` |
| View test report | `cd e2e && npm run test:report` |
| Run specific module | `cd e2e && npx playwright test tests/SignUp_LogIn/` |
| Update PCL checklists | `cd e2e && npm run update-pcl` |

## Git Hooks

This project uses Git hooks to ensure code quality:

| Hook | Purpose |
|------|---------|
| `pre-commit` | Runs ESLint on staged files and full verification |
| `commit-msg` | Validates commit message format (Conventional Commits) |
| `prepare-commit-msg` | Adds ticket ID from branch name to commit message |

### Setup

```bash
git config core.hooksPath .githooks
```

### Commit Message Format

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
Example: feat(auth): add login endpoint
```

## Project Structure

```
skin-analysis/
├── backend/
│   ├── src/
│   │   ├── main.ts                        # Bootstrap, global pipes/filters/interceptors
│   │   ├── app.module.ts                  # Root module
│   │   ├── config/                        # Environment validation & config
│   │   ├── common/
│   │   │   ├── decorators/                # @Roles(), @CurrentUser(), @Public()
│   │   │   ├── guards/                    # JwtAuthGuard, RolesGuard
│   │   │   ├── filters/                   # AllExceptionsFilter
│   │   │   ├── interceptors/              # Logging, Transform, Timeout
│   │   │   └── pipes/                     # ValidationPipe
│   │   ├── modules/
│   │   │   ├── auth/                      # Register, login, logout, refresh, JWT strategies
│   │   │   ├── users/                     # Profile management
│   │   │   ├── merchants/                 # Shop profiles, merchant approval
│   │   │   ├── products/                  # CRUD, search, inventory
│   │   │   ├── categories/                # Hierarchical categories
│   │   │   ├── reviews/                   # Product reviews
│   │   │   ├── wishlist/                  # User wishlists
│   │   │   ├── cart/                      # Shopping cart
│   │   │   ├── orders/                    # Order management
│   │   │   ├── promotions/                # Coupons & discounts
│   │   │   ├── advertisements/            # Merchant ads
│   │   │   ├── recommendations/           # AI skin analysis & product suggestions
│   │   │   ├── analytics/                 # Merchant & admin dashboards
│   │   │   └── admin/                     # User/merchant/content moderation
│   │   └── shared/
│   │       ├── redis/                     # RedisModule, RedisService
│   │       └── prisma/                    # PrismaModule, PrismaService
│   ├── prisma/
│   │   ├── schema.prisma                  # Database schema (single source of truth)
│   │   └── migrations/                    # SQL migration files
│   ├── test/                              # E2E test setup
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                           # App.tsx, routes.tsx
│   │   ├── pages/                         # Route-level components (Home, Login, Register, etc.)
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── layout/                    # Header, Footer, Sidebar, MainLayout
│   │   │   └── common/                    # ThemeToggle, LanguageToggle, etc.
│   │   ├── features/
│   │   │   ├── auth/                      # Auth components, hooks, schemas, services
│   │   │   ├── products/                  # Product browsing & detail
│   │   │   ├── cart/                      # Cart management
│   │   │   ├── skin-analysis/             # AI skin analysis UI
│   │   │   ├── merchant/                  # Merchant dashboard
│   │   │   └── admin/                     # Admin dashboard
│   │   ├── hooks/                         # useAuth, useDebounce
│   │   ├── providers/                     # QueryProvider, ThemeProvider, I18nProvider, AuthProvider
│   │   ├── services/                      # API service layer, query key factories
│   │   ├── schemas/                       # Zod validation schemas
│   │   ├── types/                         # Shared TypeScript types
│   │   ├── lib/                           # api-client, utils (cn), constants
│   │   └── i18n/                          # i18next setup
│   ├── public/locales/                    # Translation files (en/, my/, ja/)
│   └── package.json
│
└── docs/
    ├── SPECIFICATION.md                   # Full architecture & API spec
    ├── PCL_TEMPLATE_GUIDE.md              # Master test-focused PCL template & guide
    ├── guides/                            # Setup & environment guides
    └── screen/                            # Per-screen design docs & PCL checklists
        ├── SignUp_LogIn/
        │   ├── SignUp_LogIn_PCL.md        # Program Checklist (auto-updated by E2E tests)
        │   └── ...
        ├── SearchAndFilter/
        │   ├── Search_And_Filter_PCL.md
        │   └── ...
        └── ... (15 screen modules total)
```

## E2E Testing (Playwright)

The project uses **Playwright** for end-to-end testing with a **Page Object Model** pattern.

### Structure

```
e2e/
├── playwright.config.ts          # Playwright config (Chromium, retries, reporters)
├── global-setup.ts               # Cleans test-result folders before run
├── pcl-map/                      # Per-module test title → PCL text mapping configs
│   ├── SignUp_LogIn.json
│   ├── SearchAndFilter.json
│   └── ... (15 module mapping files)
├── fixtures/
│   └── auth.fixture.ts           # Pre-authenticated buyer/merchant page fixtures
├── pages/                        # Page Object classes per screen module
│   ├── SignUp_LogIn/
│   │   ├── LoginPage.ts
│   │   └── RegisterPage.ts
│   ├── SearchAndFilter/
│   │   └── SearchPage.ts
│   └── ... (15 screen modules, 16 page objects)
├── tests/                        # Test specs per screen module
│   ├── SignUp_LogIn/
│   │   ├── auth.spec.ts          # 13 integrated auth E2E scenarios
│   │   ├── register.spec.ts      # 21 register page tests
│   │   └── login.spec.ts         # 14 login page tests
│   ├── SearchAndFilter/
│   │   └── search-filter.spec.ts
│   └── ... (17 spec files total, ~99 tests)
└── utils/
    ├── constants.ts              # Routes, API URLs, test users
    ├── screenshot.ts             # Screenshot capture + evidence collector
    └── modular-reporter.ts       # Custom reporter → per-module results.json
```

### Running Tests

```bash
# Run all E2E tests
cd e2e && npm test

# Run a specific screen module
npx playwright test tests/SignUp_LogIn/

# Run with interactive UI mode
npm run test:ui

# Debug mode (step through)
npm run test:debug
```

### Test Configuration

| Setting | Value |
|---------|-------|
| Browser | Chromium only |
| Base URL | `http://localhost:3000` (frontend) |
| API URL | `http://localhost:8080/api/v1` (backend) |
| Timeout | 30s per test, 10s per action, 15s navigation |
| Retries | 2 on CI, 0 locally |
| Parallel | Disabled (sequential) |
| Reporter | list + custom modular reporter |

### Page Object Model

Each screen has a Page Object class encapsulating locators and actions:

```typescript
// Example: LoginPage
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login('user@test.com', 'password123');
await loginPage.expectRedirectTo('/buyer');
```

### Fixtures

Pre-authenticated pages for tests that require a logged-in user:

```typescript
test('should access dashboard', async ({ buyerPage }) => {
  // buyerPage is already logged in as a buyer
  await buyerPage.goto('/buyer');
});
```

## Program Checklist (PCL)

Each screen module has a **PCL (Program Checklist)** document — a comprehensive verification checklist covering Normal (N), Abnormal (A), Boundary (B), and Interface (I) test cases. Refer to `docs/PCL_TEMPLATE_GUIDE.md` for the standard template.

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

### Auto-Update from E2E Tests

The `scripts/update-pcl.cjs` script automatically marks PCL checkboxes as passed (`- [ ]` → `- [x]`) when E2E tests pass:

```bash
# 1. Run E2E tests (produces per-module results.json)
cd e2e && npm test

# 2. Update all 15 PCL checklists
npm run update-pcl

# Or update only a specific module (e.g. SignUp_LogIn)
npm run update-pcl:SignUp_LogIn
# or: node ../scripts/update-pcl.cjs SearchAndFilter
```

**How it works:**
1. E2E tests run → `modular-reporter.ts` writes `test-results/{Module}/results.json`
2. `scripts/update-pcl.cjs` reads test results and the corresponding `e2e/pcl-map/{ModuleName}.json` mapping file
3. For each passed test, finds matching PCL line and replaces `- [ ]` → `- [x]`
4. Reports summary across all processed modules

### Adding New Tests to PCL

To map a new E2E test to a PCL item:

1. Refer to `docs/PCL_TEMPLATE_GUIDE.md` and add the checklist item under Section 20 in the screen's `*_PCL.md` file
2. Add the mapping in `e2e/pcl-map/{ModuleName}.json`:
   ```json
   {
     "pclFile": "docs/screen/ModuleName/Module_PCL.md",
     "specFiles": ["e2e/tests/ModuleName/module.spec.ts"],
     "mappings": {
       "should do something cool": "E2E-MOD-01: PCL text that appears in the checklist"
     }
   }
   ```

## Key Design Decisions

- **JWT dual-token** — Access token (15 min) stored in memory; refresh token (7 days) in HTTP-only cookie with rotation on every use.
- **Prisma as schema source of truth** — Models map to snake_case tables; generated types used end-to-end.
- **Redis for blacklisting, caching, and rate limiting** — Sub-millisecond token blacklist checks; cache-aside pattern for hot entities.
- **Feature-based modules** — Each domain (auth, products, orders, etc.) is a self-contained NestJS module.
- **i18n from day one** — English, Myanmar, and Japanese via i18next with namespace-based translation files.
- **WCAG 2.1 AA** — Semantic HTML, keyboard navigation, focus indicators, Radix UI primitives handle accessibility.

## API Reference

Swagger documentation is available at `http://localhost:8080/api/docs` when the backend is running.

Base path: `/api/v1`

Key modules: `auth`, `users`, `merchants`, `products`, `categories`, `reviews`, `wishlist`, `cart`, `orders`, `promotions`, `recommendations`, `analytics`, `admin`.

## License

Private — All rights reserved.
