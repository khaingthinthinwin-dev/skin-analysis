# AI-Powered Skincare Marketplace

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

- Node.js 22+
- PostgreSQL 16+
- Redis 7+

### 1. Clone and install

```bash
git clone <repo-url>
cd skin-analysis

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
Frontend runs on `http://localhost:5173`.

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
    └── guides/                            # Setup & environment guides
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
