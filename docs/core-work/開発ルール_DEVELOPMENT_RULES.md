# DEVELOPMENT_RULES.md

## Enterprise Development Governance Specification

---

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-DEV-001 |
| **System** | Cosmetics Finder |
| **Version** | 2.1 |
| **Created** | 2026-08-03 |
| **Last Updated** | 2026-08-14 |
| **Author** | Principal Software Architect & Enterprise Engineering Governance Lead |
| **Status** | Released |
| **Audience** | Human Developers, Cursor AI, Gemini Code Assist, Claude |

---

## Table of Contents

1. [Naming Conventions & Coding Standards](#1-naming-conventions--coding-standards)
2. [Project Structure Rules](#2-project-structure-rules)
3. [Git Workflow Standards](#3-git-workflow-standards)
4. [AI Agent Guardrails](#4-ai-agent-guardrails)
5. [Security Standards](#5-security-standards)
6. [Error Handling Standards](#6-error-handling-standards)
7. [Testing Standards](#7-testing-standards)
8. [API Standards](#8-api-standards)
9. [Global UI/UX Design System](#9-global-uiux-design-system)
10. [Performance Standards](#10-performance-standards)
11. [Environment & Deployment Standards](#11-environment--deployment-standards)
12. [Marketplace-Specific Rules](#12-marketplace-specific-rules)
13. [Database Change Governance](#13-database-change-governance)
14. [Acceptance Checklist](#14-acceptance-checklist)

---

# 1. Naming Conventions & Coding Standards

## 1.1 TypeScript Naming Rules

| Element | Convention | Example | Anti-Example |
|---------|-----------|---------|--------------|
| Variables | `camelCase` | `userName`, `orderTotal` | `user_name`, `UserName` |
| Functions | `camelCase` | `getProductById()`, `validateEmail()` | `GetProductById()`, `get_product_by_id` |
| Classes | `PascalCase` | `AuthService`, `ProductController` | `authService`, `auth_service` |
| Interfaces | `PascalCase` (no `I` prefix) | `UserProfile`, `OrderItem` | `IUserProfile`, `iUserProfile` |
| Type aliases | `PascalCase` | `ProductFilters`, `RolePermissions` | `productFilters` |
| Enums | `PascalCase` (members are `PascalCase`) | `OrderStatus.Pending` | `order_status.PENDING` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PRODUCT_IMAGES`, `JWT_EXPIRY` | `maxProductImages`, `maxProductImages` |
| Private class fields | `#privateField` (JS private) or `_prefix` | `#prismaService`, `_userRepository` | `prismaService` (ambiguous) |
| Boolean variables | Prefix with `is`, `has`, `can`, `should` | `isActive`, `hasPermission` | `active`, `permission` |
| Event handlers | `handle` + Event name | `handleLogin()`, `handleSubmit()` | `login()`, `submit()` |
| Callbacks | `on` + Event name | `onClick`, `onSubmit` | `clickHandler` (inconsistent) |

**Prohibited Patterns:**
- Never use `any`. Use `unknown` with type narrowing or specific types.
- Never use `null` where `undefined` suffices. Prefer `undefined` for optional values.
- Never use non-null assertion (`!`) without documented justification.
- Avoid type assertions (`as`) unless absolutely necessary; prefer type guards.

## 1.2 Prisma Naming Rules

| Element | Convention | Example | Anti-Example |
|---------|-----------|---------|--------------|
| Models | `PascalCase` (singular) | `Product`, `OrderItem`, `UserRole` | `Products`, `order_items`, `user_roles` |
| Fields | `camelCase` | `merchantId`, `createdAt` | `merchant_id`, `created_at` |
| Enums | `PascalCase` | `UserRole`, `OrderStatus` | `user_role`, `order_status` |
| Relations | Explicit `@relation` name | `@relation("UserProducts")` | Implicit relation without name |
| Table maps | `snake_case` plural | `@@map("products")`, `@@map("order_items")` | `@@map("Products")` |
| Column maps | `snake_case` | `@map("merchant_id")`, `@map("created_at")` | `@map("merchantId")` |
| Primary keys | `id` with `@default(dbgenerated("gen_random_uuid()"))` or `@default(uuid())` | `id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` | Auto-increment for business entities |
| Foreign keys | `<model>Id` camelCase | `merchantId`, `categoryId` | `merchant_id` in Prisma field name |
| Indexes | `@@index([field])` | `@@index([merchantId])` | No index on FK columns |
| Check constraints | Inline in Prisma | `@db.Decimal(10, 2)` | Raw SQL for simple constraints |

**Schema Rules:**
- Every FK column MUST have an `@@index`.
- Every `@unique` constraint MUST be named explicitly if it involves multiple columns.
- Always specify `onDelete` and `onUpdate` explicitly. Never rely on database defaults.
- Use `Decimal` for monetary values. Never use `Float` or `Double`.
- Use `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid` (or `@default(uuid())`) for primary keys on business entities (aligned with database-level UUID format).
- Use `Int @id @default(autoincrement())` only for lookup/master tables.

## 1.3 React Component Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Components | `PascalCase` function | `ProductCard`, `CartItem`, `OrderHistory` |
| Component files | `PascalCase.tsx` | `ProductCard.tsx`, `CartItem.tsx` |
| Custom hooks | `use` + `PascalCase` | `useAuth()`, `useDebounce()` |
| Hook files | `use` + `PascalCase.ts` | `useAuth.ts`, `useDebounce.ts` |
| Context providers | `PascalCase` + `Provider` | `AuthProvider`, `QueryProvider` |
| Pages | `PascalCase` (noun) | `Home`, `Login`, `Profile`, `ProductDetail` |
| Layout components | `PascalCase` + `Layout` | `MainLayout`, `DashboardLayout` |
| UI primitives (shadcn) | lowercase with `ui/` prefix | `components/ui/button.tsx` |
| Feature components | `PascalCase` within feature folder | `features/auth/components/LoginForm.tsx` |

**Component Rules:**
- One component per file. Named export for types, default export for components.
- Component filename must match the component name exactly.
- No `index.ts` barrel files in component directories (explicit imports required).
- Props type defined in the same file as the component or in a co-located `.types.ts` file.

## 1.4 Environment Variable Naming

| Layer | Prefix | Convention | Example |
|-------|--------|-----------|---------|
| Backend (NestJS) | None | `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET` |
| Frontend (Vite) | `VITE_` | `UPPER_SNAKE_CASE` | `VITE_API_URL`, `VITE_APP_NAME` |
| Prisma | None | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

**Environment Variable Rules:**
- All env vars MUST be validated at startup using Zod schemas.
- Never commit `.env` files. Only `.env.example` with placeholder values.
- Never log environment variable values.
- Secrets (API keys, JWT secrets, database URLs) MUST NOT appear in error messages or logs.
- Frontend env vars are embedded at build time; never expose backend secrets.

## 1.5 File Naming Conventions

| Location | Convention | Example |
|----------|-----------|---------|
| Backend modules | `kebab-case` directories | `modules/auth/`, `modules/products/` |
| Backend files | `kebab-case.ts` | `auth.service.ts`, `jwt.strategy.ts` |
| Frontend pages | `PascalCase.tsx` | `Home.tsx`, `Login.tsx`, `ProductDetail.tsx` |
| Frontend components | `PascalCase.tsx` | `ProductCard.tsx`, `CartItem.tsx` |
| Frontend hooks | `usePascalCase.ts` | `useAuth.ts`, `useDebounce.ts` |
| Frontend types | `kebab-case.types.ts` | `auth.types.ts`, `api.types.ts` |
| Frontend services | `kebab-case.service.ts` | `auth.service.ts`, `product.service.ts` |
| Frontend schemas | `kebab-case.schema.ts` | `auth.schema.ts`, `product.schema.ts` |
| Prisma schema | Single file | `schema.prisma` |
| Test files | Match source + `.spec.ts` / `.test.ts` | `auth.service.spec.ts`, `ProductCard.test.tsx` |
| Config files | `kebab-case.config.ts` | `vite.config.ts`, `prisma.config.ts` |
| CSS files | `kebab-case.css` or module pattern | `index.css`, `ProductCard.module.css` |
| Translation files | `{namespace}.json` | `common.json`, `auth.json`, `products.json` |

## 1.6 Import Ordering Standards

**Backend (NestJS) - enforced via ESLint:**

```typescript
// 1. Node.js built-in modules
import { join } from 'path';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 3. Internal modules (absolute paths with @/ alias)
import { AuthService } from '@/modules/auth/auth.service';
import { CreateUserDto } from '@/modules/auth/dto/create-user.dto';

// 4. Relative imports
import { SomeHelper } from './helpers';
import { SomeType } from './types';
```

**Frontend (React) - enforced via ESLint:**

```typescript
// 1. React / React Router
import { useState } from 'react';
import { useNavigate } from 'react-router';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';

// 3. Internal absolute imports (@/ alias)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { productKeys } from '@/services/queryKeys';

// 4. Relative imports
import { SomeHelper } from './helpers';
import { SomeType } from './types';
```

**Rules:**
- No wildcard imports (`import *`). Import specific named exports only.
- No `require()` in TypeScript files. Use ES module `import` syntax.
- One blank line between import groups.
- Sort imports alphabetically within each group.

---

# 2. Project Structure Rules

## 2.1 Backend Module Structure (NestJS + PostgreSQL)

```
backend/src
│
├── main.ts                                         # Bootstrap entry point
├── app.module.ts                                   # Root module
│
├── config/
│   ├── config.module.ts
│   ├── config.service.ts
│   └── validation.ts
│
├── common/                             # Co-developed
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── public.decorator.ts
│   │
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   │
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   │
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   ├── transform.interceptor.ts
│   │   └── timeout.interceptor.ts
│   │
│   ├── pipes/
│   │   └── validation.pipe.ts
│   │
│   ├── dto/
│   │   ├── pagination.dto.ts
│   │   └── pagination-response.dto.ts
│   │
│   ├── interfaces/
│   │   ├── api-response.interface.ts
│   │   └── pagination.interface.ts
│   │
│   └── utils/
│       ├── date.util.ts
│       └── slug.util.ts
│
├── modules/
│   │
│   ├── auth/                           # [ATM]
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── register.dto.ts
│   │   ├── guards/
│   │   └── strategies/
│   │
│   ├── users/                          # [ATM]
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/
│   │
│   ├── buyer/
│   │   ├── skin-analysis/              # [ATM]
│   │   │   ├── skin-analysis.module.ts
│   │   │   ├── skin-analysis.controller.ts
│   │   │   └── skin-analysis.service.ts
│   │   │
│   │   ├── matching/                   # [ATM]
│   │   │   ├── matching.module.ts
│   │   │   ├── matching.controller.ts
│   │   │   └── matching.service.ts
│   │   │
│   │   ├── wishlist/                   # [EEM]
│   │   │   ├── wishlist.module.ts
│   │   │   ├── wishlist.controller.ts
│   │   │   └── wishlist.service.ts
│   │   │
│   │   ├── cart/                       # [EEM]
│   │   │   ├── cart.module.ts
│   │   │   ├── cart.controller.ts
│   │   │   └── cart.service.ts
│   │   │
│   │   └── orders/                     # [EEM]
│   │       ├── orders.module.ts
│   │       ├── orders.controller.ts
│   │       ├── orders.service.ts
│   │       └── dto/
│   │
│   ├── catalog/
│   │   ├── products/                   # [TMO]
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── categories/                 # [TRPH]
│   │   │   ├── categories.module.ts
│   │   │   ├── categories.controller.ts
│   │   │   └── categories.service.ts
│   │   │
│   │   └── search/                     # [TRPH]
│   │       ├── search.module.ts
│   │       ├── search.controller.ts
│   │       ├── search.service.ts
│   │       └── dto/
│   │
│   ├── merchant/
│   │   ├── products/                   # [ZSLS]
│   │   │   ├── merchant-products.module.ts
│   │   │   ├── merchant-products.controller.ts
│   │   │   └── merchant-products.service.ts
│   │   │
│   │   ├── promotions/                 # [ZSLS]
│   │   │   ├── promotions.module.ts
│   │   │   ├── promotions.controller.ts
│   │   │   └── promotions.service.ts
│   │   │
│   │   └── advertisements/             # [WYT]
│   │       ├── advertisements.module.ts
│   │       ├── advertisements.controller.ts
│   │       └── advertisements.service.ts
│   │
│   ├── admin/
│   │   ├── user-management/            # [PET]
│   │   │   ├── user-management.module.ts
│   │   │   ├── user-management.controller.ts
│   │   │   └── user-management.service.ts
│   │   │
│   │   ├── merchant-management/        # [PET]
│   │   │   ├── merchant-management.module.ts
│   │   │   ├── merchant-management.controller.ts
│   │   │   └── merchant-management.service.ts
│   │   │
│   │   ├── review-management/          # [PET]
│   │   │   ├── reviews.module.ts
│   │   │   ├── reviews.controller.ts
│   │   │   └── reviews.service.ts
│   │   │
│   │   ├── content-moderation/         # [PET]
│   │   │   ├── moderation.module.ts
│   │   │   ├── moderation.controller.ts
│   │   │   └── moderation.service.ts
│   │   │
│   │   ├── advertisement-management/   # [PET]
│   │   │   ├── advertisement-approval.module.ts
│   │   │   ├── advertisement-approval.controller.ts
│   │   │   └── advertisement-approval.service.ts
│   │   │
│   │   ├── commission-revenue/         # [PPH]
│   │   │   ├── commission.module.ts
│   │   │   ├── commission.controller.ts
│   │   │   └── commission.service.ts
│   │   │
│   │   └── audit-logs/                 # [ATM]
│   │       ├── audit-logs.module.ts
│   │       ├── audit-logs.controller.ts
│   │       └── audit-logs.service.ts
│   │
│   └── shared/
│       │
│       ├── profile/                    # [ATM]
│       │   ├── profile.module.ts
│       │   ├── profile.controller.ts
│       │   └── profile.service.ts
│       │
│       ├── notifications/              # [ATM]
│       │   ├── notifications.module.ts
│       │   ├── notifications.controller.ts
│       │   └── notifications.service.ts
│       │
│       └── order-insights/             # [HAML]
│           ├── order-insights.module.ts
│           ├── order-insights.controller.ts
│           ├── order-insights.service.ts
│           ├── dto/
│           │   ├── order-history-query.dto.ts
│           └── README.md
│
├── shared/
│   ├── shared.module.ts
│   │
│   ├── prisma/                         # Shared
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── redis/                          # Shared
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   └── mail/                           # Shared (future)
│       ├── mail.module.ts
│       └── mail.service.ts
│
└── database/                           # Shared
    ├── prisma/
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.ts
    │
    └── seeds/
```

**Backend Module Rules:**
- Each feature module is self-contained with controller, service, DTOs, and tests.
- Each module folder MUST contain a `README.md` documenting developer ownership.
- Feature modules export only what other modules need via `exports` array.
- `common/` contains framework-level utilities shared across ALL modules.
- `shared/` contains global services (Prisma, Redis) registered via `@Global()`.
- Never import another feature module's internal service directly. Use module exports.
- Controllers handle HTTP concerns only. Business logic belongs in services.
- Services contain business logic and data access. Never call Prisma directly from controllers.

### 2.1.1 Developer Ownership Tags

| Tag | Developer | Modules |
|-----|-----------|---------|
| **[ATM]** | ATM | Auth, Users, Skin Analysis, Notifications, Profile, Matching & Recommendation, Audit Logs |
| **[TMO]** | TMO | Products (catalog) |
| **[TRPH]** | TRPH | Search, Categories |
| **[EEM]** | EEM | Wishlist, Cart, Orders |
| **[ZSLS]** | ZSLS | Promotions, Merchant Products |
| **[WYT]** | WYT | Advertisements |
| **[HAML]** | HAML | Order Insights |
| **[PET]** | PET | Reviews, Admin (user/merchant/content moderation, Advertisements) |
| **[PPH]** | PPH | Commission, Revenue |

## 2.2 Frontend Page Structure (React + TypeScript)

```
frontend/src
│
├── app/
│   ├── App.tsx                                        # Root application component
│   └── routes.tsx                                     # Route configuration
│
├── pages/
│   │
│   ├── About.tsx                          # About page
│   ├── NotFound.tsx                       # 404 page
│   ├── Settings.tsx                       # User settings page
│   ├── Unauthorized.tsx                   # Unauthorized access page
│   │
│   ├── auth/                           # [ATM]
│   │   ├── Login.tsx                   # [ATM] User login page
│   │   └── Register.tsx                # [ATM] User registration page
│   │
│   ├── buyer/
│   │   ├── Dashboard.tsx               # [TRPH] Search & Filter Home
│   │   ├── SearchFilter.tsx            # [TRPH] Product search and filtering
│   │   ├── ProductDetail.tsx           # [TMO] Product details and reviews
│   │   ├── Wishlist.tsx                # [EEM] Saved products
│   │   ├── Cart.tsx                    # [EEM] Shopping cart
│   │   ├── Checkout.tsx                # [EEM] Checkout & payment
│   │   ├── SkinAnalysis.tsx            # [ATM] Skin analysis/profile setup
│   │   ├── MatchingRecommendations.tsx # [ATM] Product recommendations
│   │   └── RecommendationHistory.tsx   # [ATM] Recommendation history
│   │
│   ├── merchant/
│   │   ├── Dashboard.tsx               # [ZSLS] Product Management Home
│   │   ├── ProductManagement.tsx       # [ZSLS] Product CRUD
│   │   ├── Advertisements.tsx          # [WYT] Advertisement management
│   │   └── Promotions.tsx              # [ZSLS] Promotion management
│   │
│   ├── admin/
│   │   ├── Dashboard.tsx               # [PET] Admin dashboard overview
│   │   ├── ReviewManagement.tsx        # [PET]
│   │   ├── ContentModeration.tsx       # [PET]
│   │   ├── UserManagement.tsx          # [PET]
│   │   ├── MerchantManagement.tsx      # [PET]
│   │   ├── AdvertisementManagement.tsx # [PET]
│   │   ├── CommissionRevenue.tsx       # [PPH]
│   │   └── AuditLog.tsx                # [ATM]
│   │
│   └── shared/
│       ├── Profile.tsx                 # [ATM] Profile settings
│       ├── Notifications.tsx           # [ATM] Notification center
│       └── OrderInsights.tsx           # [HAML] Orders & reporting dashboard
│
├── features/
│   │
│   ├── auth/                           # [ATM]
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── schemas/
│   │
│   ├── buyer/
│   │   ├── skin-analysis/              # [ATM]
│   │   ├── matching/                   # [ATM]
│   │   ├── products/                   # [TMO]
│   │   ├── wishlist/                   # [EEM]
│   │   ├── cart/                       # [EEM]
│   │   └── checkout/                   # [EEM]
│   │
│   ├── merchant/
│   │   ├── products/                   # [ZSLS]
│   │   ├── promotions/                 # [ZSLS]
│   │   └── advertisements/             # [WYT]
│   │
│   ├── admin/
│   │   ├── user-management/            # [PET]
│   │   ├── merchant-management/        # [PET]
│   │   ├── content-moderation/         # [PET]
│   │   ├── review-management/          # [PET]
│   │   ├── advertisement-management/   # [PET]
│   │   ├── commission-revenue/         # [PPH]
│   │   └── audit-log/                  # [ATM]
│   │
│   └── shared/
│       ├── profile/                    # [ATM]
│       │   ├── components/
│       │   ├── hooks/
│       │   └── services/
│       │
│       ├── notifications/              # [ATM]
│       │   ├── components/
│       │   ├── hooks/
│       │   └── services/
│       │
│       └── order-insights/             # [HAML]
│           ├── components/
│           │   ├── OrderHistoryTable.tsx
│           │   ├── OrderDetailModal.tsx
│           │   └── OrderStatusChart.tsx
│           ├── hooks/
│           │   └── useOrderInsights.ts
│           └── services/
│               └── orderInsights.service.ts
│
├── components/
│   ├── ui/                             # Co-developed
│   ├── layout/                         # Co-developed
│   ├── navigation/
│   │   ├── BuyerNavbar.tsx             # Co-developed
│   │   ├── MerchantNavbar.tsx          # Co-developed
│   │   ├── AdminNavbar.tsx             # Co-developed
│   │   └── RoleBasedMenu.tsx           # Co-developed
│   │
│   ├── common/                         # Co-developed
│   └── auth/                           # [ATM]
│
├── layouts/
│   ├── MainLayout.tsx                 # Co-developed
│   ├── DashboardLayout.tsx            # Co-developed
│   ├── BuyerLayout.tsx                 # Co-developed
│   ├── MerchantLayout.tsx              # Co-developed
│   ├── AdminLayout.tsx                 # Co-developed
│   └── AuthLayout.tsx                  # [ATM]
│
├── hooks/                              # Co-developed
├── providers/                          # Co-developed
├── services/                           # Co-developed
├── schemas/                            # Co-developed
├── types/                              # Co-developed
├── lib/                                # Co-developed
└── i18n/                               # Co-developed
```

**Frontend Structure Rules:**
- Pages are thin. Extract reusable logic into `features/` or `hooks/`.
- `components/ui/` contains shadcn/ui components. Never manually edit after generation.
- Feature folders colocate components, hooks, schemas, and services for that feature.
- Each feature folder MUST contain a `README.md` documenting developer ownership.
- One component per file. Named exports for types, default exports for components.
- Route-level components are in `pages/`. Reusable components go in `components/` or `features/`.
- Layouts are top-level components that wrap page content (admin sidebar, auth forms, main header/footer).
- `features/shared/` contains cross-feature shared components (analytics charts, profile) used by multiple roles.

### 2.2.1 Developer Ownership Tags

| Tag | Developer | Modules |
|-----|-----------|---------|
| **[ATM]** | ATM | Authentication, Users, Skin Analysis, Notifications, Profile, Matching & Recommendation, Audit Logs |
| **[HAML]** | HAML | Order Insights |
| **[TMO]** | TMO | Products (catalog) |
| **[TRPH]** | TRPH | Search, Categories |
| **[EEM]** | EEM | Wishlist, Cart, Orders, Checkout |
| **[ZSLS]** | ZSLS | Promotions, Merchant Products |
| **[WYT]** | WYT | Advertisements |
| **[PET]** | PET | Reviews, Admin (user/merchant/content moderation, Advertisements) |
| **[PPH]** | PPH | Commission, Revenue |

**Ownership Rules:**
- Each module folder MUST have a `README.md` with the assigned developer tag.
- `Shared` / `Co-developed` modules are maintained collaboratively.
- Admin pages use `[PET/PPH]` for shared admin functionality.

## 2.3 Shared Folder Restrictions

| Location | Who Can Use | What Goes Here |
|----------|------------|----------------|
| `backend/src/common/` | ALL backend modules | Decorators, guards, filters, pipes, DTOs, interfaces, utils |
| `backend/src/shared/` | ALL backend modules (via `@Global()`) | Prisma, Redis, Mail services |
| `frontend/src/components/ui/` | ALL frontend features | shadcn/ui primitives (generated, not hand-written) |
| `frontend/src/lib/` | ALL frontend code | `cn()` utility, API client, constants |
| `frontend/src/types/` | ALL frontend code | Shared type definitions |

**Restrictions:**
- NEVER place feature-specific logic in shared folders.
- NEVER import from `backend/src/modules/` in another module's internal files. Use module exports.
- NEVER create new files in `components/ui/` unless generating via shadcn CLI.

### 2.3.1 Developer Ownership Rules
- Each feature module MUST contain a README.md documenting developer ownership
- Developers are responsible for their assigned modules
- Cross-module communication uses NestJS module exports
- Shared folders (common/, shared/, components/ui/) are co-developed

## 2.4 Cross-Module Communication Rules

**Backend Inter-Module Communication:**
- Module A communicates with Module B ONLY through exported services via NestJS dependency injection.
- Modules NEVER import other modules' internal (non-exported) services.
- For events between modules, use NestJS `EventEmitter` (future) or direct service calls via module exports.
- Shared data access goes through `PrismaService` (injected via `shared/prisma`).

**Frontend Cross-Feature Communication:**
- Features communicate through TanStack Query (server state) or URL state.
- NEVER pass server state via React Context. Context is for client-only state (theme, auth).
- NEVER use `window.dispatchEvent` or global event buses. Use TanStack Query invalidation.
- Shared UI components go in `components/common/`. Feature-specific UI stays in `features/`.

---

# 3. Git Workflow Standards

## 3.1 Branch Naming

| Branch Type | Pattern | Example |
|------------|---------|---------|
| Feature | `feature/<ticket>-<short-description>` | `feature/SKM-123-add-product-search` |
| Bugfix | `bugfix/<ticket>-<short-description>` | `bugfix/SKM-456-fix-cart-total` |
| Hotfix | `hotfix/<ticket>-<short-description>` | `hotfix/SKM-789-fix-auth-bypass` |
| Refactor | `refactor/<ticket>-<short-description>` | `refactor/SKM-101-extract-auth-module` |
| Documentation | `docs/<short-description>` | `docs/add-api-documentation` |
| Chore | `chore/<short-description>` | `chore/update-dependencies` |

**Rules:**
- Use lowercase kebab-case for branch names.
- Include ticket ID when available.
- Maximum 50 characters for branch name (excluding prefix).
- Never use personal names or timestamps in branch names.
- Delete branches after merge.

## 3.2 Commit Message Conventions

Follow Conventional Commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(products): add product search with filters` |
| `fix` | Bug fix | `fix(auth): prevent token reuse attack` |
| `docs` | Documentation only | `docs(api): add Swagger annotations` |
| `style` | Formatting, no code change | `style(components): fix button spacing` |
| `refactor` | Code restructuring | `refactor(auth): extract JWT strategy` |
| `perf` | Performance improvement | `perf(products): add Redis cache for listings` |
| `test` | Adding/updating tests | `test(auth): add login flow unit tests` |
| `chore` | Build, config, deps | `chore(deps): update NestJS to v11.0.1` |
| `ci` | CI/CD changes | `ci(github): add e2e test workflow` |
| `revert` | Revert commit | `revert: feat(products): add product search` |

**Scopes:**

| Scope | Description |
|-------|-------------|
| `auth` | Authentication & authorization |
| `users` | User management |
| `products` | Product management |
| `orders` | Order processing |
| `cart` | Shopping cart |
| `reviews` | Product reviews |
| `promotions` | Discount codes |
| `admin` | Admin panel |
| `merchant` | Merchant dashboard |
| `ai` | AI skin analysis |
| `db` | Database schema/migrations |
| `api` | API infrastructure |
| `ui` | UI components |
| `i18n` | Internationalization |
| `config` | Configuration changes |

**Rules:**
- Subject line: imperative mood, lowercase, no period, max 72 characters.
- Body: wrap at 72 characters. Explain *what* and *why*, not *how*.
- Footer: reference issue IDs (`Closes #123`, `Refs #456`).
- Breaking changes: add `BREAKING CHANGE:` footer or `!` after type (`feat!: ...`).

## 3.3 Pull Request Requirements

**PR Title:** Must follow commit message format (Conventional Commits).

**PR Description Template:**

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Related Issues
Closes #(issue_number)

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] No console.log or debug statements left
- [ ] No hardcoded secrets or credentials
- [ ] All existing tests pass
- [ ] New tests have adequate coverage
- [ ] API documentation updated (if applicable)
- [ ] Database migration tested (if applicable)
- [ ] i18n keys added for new strings (if applicable)
```

**PR Rules:**
- PRs MUST have at least 1 approval before merge.
- PRs MUST pass all CI checks (lint, test, build) before merge.
- PRs MUST have linked issue/ticket.
- Maximum 400 lines of diff per PR. Split larger changes.
- Squash merge to main/develop branches.
- Never merge with unresolved conflicts.

## 3.4 Code Review Checklist

**Reviewer MUST verify:**

- [ ] **Correctness:** Does the code do what the issue requires?
- [ ] **Security:** No SQL injection, XSS, CSRF vulnerabilities. No secrets in code.
- [ ] **RBAC:** All new endpoints have proper `@Roles()` decorators and guards.
- [ ] **Validation:** All inputs validated via DTOs with `class-validator`.
- [ ] **Error handling:** All error paths return proper HTTP status codes and messages.
- [ ] **Database:** Prisma schema changes follow naming conventions. Migrations are reversible where possible.
- [ ] **Performance:** No N+1 queries. Proper use of `select`/`include`. Redis caching where appropriate.
- [ ] **Tests:** Unit tests for services, integration tests for controllers. Adequate coverage.
- [ ] **TypeScript:** No `any` types. Proper type annotations. No `@ts-ignore`.
- [ ] **i18n:** New user-facing strings use translation keys, not hardcoded text.
- [ ] **Accessibility:** New UI components follow WCAG 2.1 AA.
- [ ] **Documentation:** Swagger annotations updated for new endpoints.

---

# 4. AI Agent Guardrails

## 4.1 Files AI Can Modify

AI agents (Cursor, Copilot, Claude Code, Gemini Code Assist) MAY modify the following files:

| Category | Allowed Files |
|----------|--------------|
| **Backend Services** | `src/modules/**/*.service.ts`, `src/modules/**/*.controller.ts`, `src/modules/**/*.module.ts` |
| **Backend DTOs** | `src/modules/**/*.dto.ts` |
| **Backend Strategies/Guards** | `src/modules/auth/strategies/*.ts`, `src/modules/auth/guards/*.ts`, `src/common/guards/*.ts` |
| **Backend Interceptors/Filters** | `src/common/interceptors/*.ts`, `src/common/filters/*.ts` |
| **Backend Pipes/Decorators** | `src/common/pipes/*.ts`, `src/common/decorators/*.ts` |
| **Frontend Pages** | `src/pages/**/*.tsx` |
| **Frontend Features** | `src/features/**/*.tsx`, `src/features/**/*.ts` |
| **Frontend Hooks** | `src/hooks/*.ts` |
| **Frontend Services** | `src/services/*.ts` |
| **Frontend Schemas** | `src/schemas/*.ts` |
| **Frontend Components** | `src/components/layout/*.tsx`, `src/components/common/*.tsx` |
| **Frontend Types** | `src/types/*.ts` |
| **Prisma Schema** | `prisma/schema.prisma` (MUST follow naming conventions in Section 1.2) |
| **Prisma Migrations** | `prisma/migrations/**` (MUST be generated via `prisma migrate dev`) |
| **Tests** | `**/*.spec.ts`, `**/*.test.tsx`, `**/*.test.ts` |
| **Translation Files** | `public/locales/**/*.json` |
| **Documentation** | `docs/**/*.md` |
| **Configuration** | `.eslintrc.*`, `tsconfig.json` (with caution) |

## 4.2 Files AI Cannot Modify

AI agents MUST NOT modify the following files without explicit human approval:

| Category | Restricted Files | Reason |
|----------|-----------------|--------|
| **Bootstrap** | `backend/src/main.ts` | Critical application entry point |
| **Root Module** | `backend/src/app.module.ts` | Module registration affects all features |
| **Prisma Config** | `backend/prisma.config.ts` | Database connection configuration |
| **Package Files** | `backend/package.json`, `frontend/package.json` | Dependency management requires review |
| **Environment** | `.env`, `.env.*` | Secrets and configuration |
| **Lock Files** | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` | Dependency resolution integrity |
| **Git Config** | `.gitignore`, `.git/` | Repository configuration |
| **CI/CD** | `.github/workflows/*.yml` | Deployment pipeline security |
| **shadcn/ui** | `src/components/ui/*` | Generated components, use CLI only |
| **Vite Config** | `frontend/vite.config.ts` | Build configuration |
| **NestJS CLI** | `backend/nest-cli.json` | Build configuration |
| **Core Module** | `backend/src/core/**/*.ts` | One-time setup, imported only in AppModule |
| **Shared Module** | `backend/src/shared/shared.module.ts` | Global module registration |
| **Prisma Seed** | `backend/prisma/seed.ts` | Database seeding logic |

## 4.3 Required Context Documents

Before generating or modifying code, AI agents MUST read and understand:

| Document | Location | Purpose |
|----------|----------|---------|
| Requirements Definition | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business rules, functional requirements |
| Database Design Spec | `docs/core-work/データベース設計書.md` | Schema design, data dictionary |
| Specification Document | `docs/SPECIFICATION.md` | Full architecture, technology stack, API design |
| This Document | `DEVELOPMENT_RULES.md` | Coding standards, guardrails, governance |
| Prisma Schema | `backend/prisma/schema.prisma` | Current database schema (source of truth) |
| Existing Code | Respective module files | Maintain consistency with existing patterns |

**Context Rules:**
- Always read the Prisma schema before writing any database-related code.
- Always read existing services in the same module before adding new ones.
- Always read existing DTOs in the module for naming/style consistency.
- Always check for existing similar functionality before creating new modules.

## 4.4 Output Verification Checklist

AI-generated code MUST pass all of the following before being considered complete:

| # | Verification Item | How to Verify |
|---|-------------------|---------------|
| 1 | No `any` types | TypeScript compilation with strict mode |
| 2 | No `console.log` in production code | ESLint rules |
| 3 | No hardcoded secrets | Grep for patterns like `password`, `secret`, `key` in plaintext |
| 4 | All inputs validated | Check DTOs have `class-validator` decorators |
| 5 | RBAC enforced | Check controllers have `@UseGuards(JwtAuthGuard, RolesGuard)` |
| 6 | Error handling | No unhandled promise rejections; proper try/catch |
| 7 | Prisma queries optimized | No N+1; proper `select`/`include` usage |
| 8 | Unit tests exist | `*.spec.ts` files for new services |
| 9 | i18n keys for new strings | No hardcoded UI text |
| 10 | TypeScript compiles | `npm run build` succeeds |
| 11 | ESLint passes | `npm run lint` passes |
| 12 | Existing tests pass | `npm run test` passes |

---

# 5. Security Standards

## 5.1 JWT Rules

| Rule | Implementation |
|------|---------------|
| Access token expiry | 15 minutes |
| Refresh token expiry | 7 days |
| Access token secret | `JWT_ACCESS_SECRET` env var |
| Refresh token secret | `JWT_REFRESH_SECRET` env var (DIFFERENT from access secret) |
| Token format | `Bearer <token>` in `Authorization` header |
| Token storage (frontend) | Access token in memory variable only. NEVER in `localStorage` or `sessionStorage` |
| Token storage (backend) | Refresh token hashed with Argon2 before DB storage |
| Token payload | `{ sub: userId, email, role, jti }` |
| Refresh token cookie | `httpOnly: true`, `secure: true`, `sameSite: 'strict'`, `path: '/api/v1/auth/refresh'` |

**MUST:**
- Validate token signature on every request.
- Check Redis blacklist before processing.
- Reject expired tokens immediately.
- Never include sensitive data in token payload (no passwords, no PII beyond email/name).

**NEVER:**
- Store refresh tokens in `localStorage`.
- Use the same secret for access and refresh tokens.
- Log token values.
- Return tokens in URL query parameters.

## 5.2 Refresh Token Rotation

| Step | Action |
|------|--------|
| 1 | Client sends refresh request with HTTP-only cookie |
| 2 | Backend verifies token signature with `JWT_REFRESH_SECRET` |
| 3 | Backend checks token exists in DB and `isRevoked = false` |
| 4 | Backend validates `absoluteLimitAt` (90-day hard cap) |
| 5 | Backend validates token family (breach detection) |
| 6 | Backend revokes old token (`isRevoked = true`) |
| 7 | Backend issues new access token + new refresh token |
| 8 | Backend hashes new refresh token and stores in DB |
| 9 | Backend updates session record |
| 10 | **If reuse detected:** Revoke ALL user tokens, return 401 |

**Token Family Rules:**
- Each login session generates a unique family ID.
- On rotation, new token inherits the same family ID.
- If a revoked token is used (reuse detection), ALL tokens for that family AND user are revoked.

## 5.3 Redis Token Blacklist

| Key Pattern | TTL | Use Case |
|-------------|-----|----------|
| `blacklist:{jti}` | Remaining token TTL (max 15min) | Access token blacklist on logout |
| `refresh:blacklist:{jti}` | 7 days | Refresh token blacklist on reuse detection |

**Rules:**
- On logout: `SET blacklist:{jti} "1" EX <remaining_ttl>`
- JwtAuthGuard MUST check blacklist before processing: `EXISTS blacklist:{jti}`
- Blacklist check MUST be sub-millisecond (Redis is in-memory).
- Never store full token in blacklist. Store only the JTI claim.

## 5.4 RBAC Enforcement

**Role Hierarchy:** `admin` > `merchant` > `buyer`

**Backend Enforcement:**

```typescript
// Every protected endpoint MUST have:
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')  // or @Roles('admin'), @Roles('buyer')
@Controller('products')
export class ProductsController { ... }

// Public endpoints MUST be explicitly marked:
@Public()
@Get()
findAll() { ... }
```

**Frontend Enforcement:**

```typescript
// ProtectedRoute component MUST wrap role-restricted routes:
<Route element={<ProtectedRoute roles={['merchant'] />}>
  <Route path="/merchant/*" element={<MerchantLayout />} />
</Route>
```

**RBAC Rules:**
- Every API endpoint MUST have a role requirement (public or specific role).
- Never rely on frontend-only authorization. Always enforce on backend.
- Admin endpoints MUST require `admin` role. No exceptions.
- Merchant endpoints MUST require `merchant` or `admin` role.
- Buyer-specific features (reviews, wishlist, cart, checkout, AI analysis) MUST require the `buyer` role. Merchants and Admins are strictly prohibited from accessing these features.

## 5.5 Password Hashing Using Argon2

| Parameter | Value |
|-----------|-------|
| Algorithm | Argon2id (memory-hard) |
| Memory cost | 64 MB minimum |
| Time cost | 3 iterations |
| Parallelism | 4 threads |
| Salt | Generated automatically by argon2 library |

**Rules:**
- NEVER store plain text passwords.
- NEVER log password values or hashes.
- Passwords MUST be minimum 8 characters.
- Use `argon2.hash(password)` for hashing.
- Use `argon2.verify(hash, password)` for verification.
- Never use MD5, SHA-1, SHA-256, or bcrypt for password hashing. Argon2 only.

## 5.6 Input Validation

**Validation Layers (ALL required):**

```
Layer 1: Frontend (Zod) ──> Layer 2: API Client (Zod runtime) ──> Layer 3: Backend DTO (class-validator) ──> Layer 4: Prisma (DB constraints)
```

**Backend Validation Rules:**
- ALL request bodies MUST be validated by `class-validator` decorated DTOs.
- Global `ValidationPipe` MUST be configured with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`.
- Query parameters MUST be validated with DTO classes.
- URL parameters (IDs) MUST be validated as proper UUID format.

**Frontend Validation Rules:**
- ALL forms MUST use `zodResolver` with React Hook Form.
- Zod schemas MUST validate both frontend and match backend DTO constraints.
- Never trust frontend validation alone. Always validate on backend.

**Prohibited:**
- String concatenation for SQL queries (use parameterized queries via Prisma).
- `eval()`, `new Function()`, or dynamic code execution.
- `dangerouslySetInnerHTML` without DOMPurify sanitization.
- Unescaped user input in HTML templates.

## 5.7 File Upload Validation

| Constraint | Value |
|-----------|-------|
| Max file size (product images) | 5 MB |
| Max file size (user avatar) | 5 MB |
| Max file size (AI analysis photo) | 10 MB |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/webp` |
| Max files per product | 10 |
| File naming | UUID-based: `{uuid}.{ext}` |

**Rules:**
- Validate MIME type on server side. Never trust `Content-Type` header alone.
- Validate file magic bytes, not just extension.
- Store uploaded files outside webroot. Serve via signed URLs or API endpoint.
- Never execute uploaded files.
- Scan uploads for malware in production (future).

---

# 6. Error Handling Standards

## 6.1 Standard API Error Format

**Success Response:**

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error Response:**

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than 8 characters"],
  "error": "Bad Request",
  "timestamp": "2026-08-03T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

**Error Response Rules:**
- `statusCode`: HTTP status code (integer).
- `message`: Array of validation error strings OR single error message string.
- `error`: HTTP status text (e.g., "Bad Request", "Unauthorized", "Forbidden").
- `timestamp`: ISO 8601 UTC timestamp.
- `path`: Request path that caused the error.

## 6.2 Exception Hierarchy

| Exception | HTTP Status | When to Use |
|-----------|-------------|-------------|
| `BadRequestException` | 400 | Invalid input, validation errors |
| `UnauthorizedException` | 401 | Missing or invalid authentication |
| `ForbiddenException` | 403 | Valid auth but insufficient permissions |
| `NotFoundException` | 404 | Resource not found |
| `ConflictException` | 409 | Duplicate resource (email already exists, slug conflict) |
| `UnprocessableEntityException` | 422 | Business logic validation failure |
| `TooManyRequestsException` | 429 | Rate limit exceeded |
| `InternalServerErrorException` | 500 | Unexpected server errors |

**Custom Exceptions:**
- Extend `HttpException` for domain-specific errors.
- Always include meaningful error messages.
- Never expose internal implementation details in error messages.

## 6.3 Logging Guidelines

**Log Levels:**

| Level | Usage |
|-------|-------|
| `error` | System errors, unhandled exceptions, security violations |
| `warn` | Deprecation notices, retryable failures, approaching limits |
| `log` | Normal application flow, request completion |
| `debug` | Detailed information for debugging (development only) |
| `verbose` | Extremely detailed tracing (development only) |

**Logging Rules:**
- Use NestJS `Logger` class. Never use `console.log` in production code.
- Log format: `[${context}] ${message}` - always include context (module name).
- Structured logging: include relevant metadata as objects.
- NEVER log passwords, tokens, credit cards, or PII.
- NEVER log full request/response bodies in production (security risk).
- Log request ID for correlation across services.

**Example:**

```typescript
private readonly logger = new Logger(AuthService.name);

// Correct
this.logger.log(`User ${userId} logged in successfully`);
this.logger.error(`Failed to login user ${email}: ${error.message}`, error.stack);
this.logger.warn(`Token refresh failed for user ${userId}: token family mismatch`);

// PROHIBITED
this.logger.log(`Password: ${password}`);  // NEVER log credentials
this.logger.log(`Token: ${accessToken}`);  // NEVER log tokens
console.log('debug info');  // NEVER use console.log
```

## 6.4 Audit Logging Requirements

| Event | Data to Log | Retention |
|-------|------------|-----------|
| User login | userId, email, IP, timestamp, success/fail | 90 days |
| User logout | userId, timestamp | 90 days |
| Password change | userId, timestamp | 90 days |
| Product created | merchantId, productId, timestamp | 1 year |
| Product updated | merchantId, productId, changes, timestamp | 1 year |
| Order created | userId, orderId, total, timestamp | 1 year |
| Order status change | orderId, oldStatus, newStatus, timestamp | 1 year |
| Admin actions | adminId, action, target, timestamp | 2 years |
| Failed auth attempts | IP, email, timestamp, reason | 30 days |
| RBAC violations | userId, endpoint, requiredRole, timestamp | 30 days |

**Audit Log Format:**

```json
{
  "event": "USER_LOGIN",
  "userId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "timestamp": "2026-08-03T12:00:00.000Z",
  "success": true,
  "metadata": {}
}
```

---

# 7. Testing Standards

## 7.1 Unit Testing Requirements

**Backend (NestJS + Jest):**

| Component | Test Type | Minimum Coverage |
|-----------|-----------|-----------------|
| Services | Unit test with mocked dependencies | 90% |
| Controllers | Unit test with mocked services | 85% |
| Strategies (JWT) | Unit test with mocked Prisma/Redis | 80% |
| Guards | Unit test with mocked strategies | 80% |
| Pipes | Unit test | 90% |
| Utils | Unit test (pure functions) | 100% |

**Frontend (Vitest + React Testing Library):**

| Component | Test Type | Minimum Coverage |
|-----------|-----------|-----------------|
| Hooks | Unit test with mocked API | 90% |
| Components (ui) | Snapshot + interaction test | 80% |
| Services | Unit test with MSW | 85% |
| Schemas (Zod) | Unit test (valid/invalid inputs) | 100% |
| Utils | Unit test (pure functions) | 100% |

**Unit Test Rules:**
- Test files MUST be co-located with source files: `auth.service.ts` → `auth.service.spec.ts`.
- Use `describe` blocks to group related tests.
- Use `it` (not `test`) for individual test cases.
- Test names MUST be descriptive: `it('should return 401 when token is expired')`.
- Mock external dependencies (Prisma, Redis, HTTP clients). Never call real databases in unit tests.
- Each test MUST be independent. No shared state between tests.
- Follow AAA pattern: Arrange, Act, Assert.

## 7.2 Integration Testing Requirements

**Backend Integration Tests:**

| Scenario | Tool | Scope |
|----------|------|-------|
| API endpoint flow | Jest + Supertest | Full request lifecycle |
| Database operations | Jest + Prisma test instance | CRUD operations with real DB |
| Authentication flow | Jest + Supertest | Login, refresh, logout, blacklist |
| RBAC enforcement | Jest + Supertest | Role-based access for each endpoint |

**Integration Test Rules:**
- Use test database (separate from development).
- Reset database state before each test suite.
- Test actual HTTP requests/responses, not just method calls.
- Test error scenarios: invalid tokens, missing fields, forbidden access.

## 7.3 E2E Testing Requirements

| Flow | Coverage Target |
|------|----------------|
| User registration → login → profile edit | Complete path |
| Product browsing → search → filter → detail | Complete path |
| Add to cart → checkout → order confirmation | Complete path |
| Merchant: create product → manage inventory | Complete path |
| Admin: approve merchant → moderate review | Complete path |
| AI analysis: upload → results → recommendations | Complete path |
| i18n: language switch → translated content | Complete path |

**E2E Test Rules:**
- Use Playwright or Cypress for browser-based E2E tests.
- Test on Chrome, Firefox, Safari (if applicable).
- Test responsive layouts (desktop, tablet, mobile viewports).
- Test keyboard navigation for accessibility.
- E2E tests run in CI before deployment.

## 7.4 Minimum Coverage Targets

| Metric | Minimum Target | Enforcement |
|--------|---------------|-------------|
| Backend unit test coverage | 80% | CI gate: fail if < 80% |
| Frontend unit test coverage | 70% | CI gate: fail if < 70% |
| Integration test coverage | 70% | CI gate: fail if < 70% |
| Critical path E2E coverage | 100% of P0 flows | Manual verification |
| Branch coverage | 75% | Enforced by Jest/Vitest config |

## 7.5 Security Test Cases

Every security-related feature MUST include tests for:

| Test Category | Example Cases |
|---------------|---------------|
| Authentication bypass | Attempt access without token, with expired token, with revoked token |
| Authorization bypass | Attempt admin endpoint with buyer token, merchant endpoint with buyer token |
| Token reuse detection | Use revoked refresh token, verify all user tokens revoked |
| Input validation | Send SQL injection strings, XSS payloads, oversized inputs |
| Rate limiting | Send >100 requests in 60 seconds, verify 429 response |
| Password security | Verify Argon2 hashing, verify no plain text storage |
| RBAC enforcement | Verify each endpoint rejects unauthorized roles |
| IDOR prevention | Attempt to access other user's resources |
| CSRF protection | Verify SameSite cookie attributes |
| File upload abuse | Upload non-image files, oversized files, malformed images |

---

# 8. API Standards

## 8.1 REST Conventions

| Verb | Purpose | Example | Success Code |
|------|---------|---------|-------------|
| `GET` | Read resource(s) | `GET /api/v1/products` | 200 |
| `POST` | Create resource | `POST /api/v1/products` | 201 |
| `PATCH` | Partial update | `PATCH /api/v1/products/:id` | 200 |
| `DELETE` | Remove resource | `DELETE /api/v1/products/:id` | 204 |

**REST Rules:**
- Use plural nouns for resources: `/products`, `/users`, `/orders`.
- Use URI parameters for specific resources: `/products/:id`.
- Use query parameters for filtering, sorting, pagination.
- NEVER use `PUT` for partial updates. Use `PATCH`.
- `DELETE` is idempotent. Deleting a non-existent resource returns 204.
- Always return the updated/created resource in response body.

## 8.2 Versioning Strategy

- URI-based versioning: `/api/v1/...`
- Default version: `v1`
- Breaking changes require new version: `/api/v2/...`
- Deprecated versions supported for minimum 6 months.
- Version header optional: `Accept-Version: v1`

**Breaking Changes (require version bump):**
- Removing an endpoint
- Renaming a field in response
- Changing field type
- Changing authentication requirements
- Changing pagination format

**Non-Breaking Changes (same version):**
- Adding new endpoints
- Adding new optional fields to response
- Adding new optional query parameters
- Adding new enum values

## 8.3 Response Structure

**Single Resource:**

```json
{
  "data": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Product Name",
    "price": "29.99"
  }
}
```

**Collection with Pagination:**

```json
{
  "data": [
    { "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "Product 1" },
    { "id": "a3b90f42-4b7d-4bad-9bdd-2b0d7b3dcb6d", "name": "Product 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Response Rules:**
- Always wrap data in `{ data: ... }` envelope.
- Use `meta` for pagination metadata.
- Use ISO 8601 for all dates: `"2026-08-03T12:00:00.000Z"`.
- Use string for decimal values to avoid floating-point precision issues: `"29.99"` not `29.99`.
- Never return Prisma entity directly. Use DTOs or explicit `select`.

## 8.4 Pagination Standards

**Offset-Based Pagination (default):**

```
GET /api/v1/products?page=1&limit=20&sort=createdAt&order=desc
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort` | string | `createdAt` | Sort field |
| `order` | string | `desc` | Sort direction: `asc` or `desc` |

**Response:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Cursor-Based Pagination (for large datasets):**

```
GET /api/v1/products?cursor=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d&limit=20
```

**Cursor Response:**

```json
{
  "data": [...],
  "meta": {
    "nextCursor": "a3b90f42-4b7d-4bad-9bdd-2b0d7b3dcb6d",
    "hasMore": true,
    "limit": 20
  }
}
```

**Pagination Rules:**
- Default page size: 20. Maximum: 100.
- Always return `total` count for offset pagination.
- Never return more than 100 items per request.
- Use cursor-based pagination for infinite scroll UIs.

## 8.5 AI Analysis Endpoint Standards

**Endpoint:** `POST /api/v1/recommendations/skin-analysis`

**Request:**

```json
{
  "image": "<base64-encoded-image>"
}
```

**Response (200):**

```json
{
  "data": {
    "analysisId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "skinType": "combination",
    "conditions": [
      { "name": "mild_acne", "severity": "low", "confidence": 0.87 },
      { "name": "oiliness", "severity": "moderate", "confidence": 0.92 }
    ],
    "estimatedAge": 28,
    "recommendations": [
      {
        "productId": "a3b90f42-4b7d-4bad-9bdd-2b0d7b3dcb6d",
        "productName": "Gentle Foaming Cleanser",
        "reason": "Suitable for combination skin with mild acne",
        "matchScore": 0.94
      }
    ],
    "analyzedAt": "2026-08-03T12:00:00.000Z"
  }
}
```

**AI Analysis Rules:**
- Request MUST validate image format (JPG, PNG, WebP).
- Request MUST validate image size (max 10MB).
- Response MUST include `analysisId` for history tracking.
- Response MUST include `confidence` scores for each condition.
- Response MUST include personalized `recommendations` with `matchScore`.
- Analysis results MUST be cached for 24 hours.
- Re-analysis is always allowed (overwrites cache).
- Analysis history is retained indefinitely.

---

# 9. Global UI/UX Design System

## 9.1 Marketplace Design Language

**Design Principles:**
- Luxury beauty marketplace aesthetic inspired by Sephora, Dior Beauty, Rare Beauty, and Glow Recipe.
- Elegant, feminine, sophisticated visual identity.
- Mobile-first responsive design.
- Consistent spacing using Tailwind's 4px grid system.
- Semantic color tokens from shadcn/ui (never raw color values).
- WCAG 2.1 AA compliance for all interactive elements.

**Brand Identity:**
- Primary brand color: Luxury Purple (#7C3AED) - conveys premium, sophisticated beauty.
- Accent color: Beauty Pink (#EC4899) - used for promotions, CTA highlights, wishlist hearts, ratings, and sale badges.
- Secondary color: Soft Lavender (#F3E8FF) - used for card backgrounds, sections, filters, badges, and subtle surfaces.
- The overall aesthetic should feel premium, clean, and modern like high-end beauty retailers.

**Layout Grid:**
- Desktop: 12-column grid, max-width 1280px, centered.
- Tablet: 8-column grid.
- Mobile: 4-column grid.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.

## 9.2 Product Cards

**Layout:**

```
┌─────────────────────────────┐
│  [Product Image]            │
│  Aspect ratio: 1:1          │
│  Object-fit: cover           │
├─────────────────────────────┤
│  Category Badge (optional)  │
│  Product Name (2 lines max) │
│  ★★★★☆ (4.2) · 128 reviews │
│  $29.99  $39.99 (strikethr)│
│  [Skin Type Tags]           │
│  [♡ Add to Wishlist]        │
└─────────────────────────────┘
```

**Product Card Rules:**
- Image: 1:1 aspect ratio, lazy-loaded, fallback placeholder.
- Name: max 2 lines with `line-clamp-2`, bold weight.
- Rating: Lucide `Star` icons with Beauty Pink (#EC4899) color, half-star support, review count linked.
- Price: Current price bold, compare-at price with strikethrough, currency formatted.
- Tags: Small pill badges for skin types (e.g., "Oily", "Sensitive") with Soft Lavender (#F3E8FF) background.
- Wishlist: Heart icon toggle with Beauty Pink (#EC4899) color, animated on click.
- Hover: Subtle shadow elevation, optional quick-view button.
- Card background: Soft Lavender (#F3E8FF) for luxury beauty aesthetic.
- Border: Light gray border with rounded corners for premium feel.

## 9.3 AI Analysis Screens

**Upload Screen:**

```
┌─────────────────────────────────────────┐
│  📸 AI Skin Analysis                    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │   [Drop Zone / Upload Area]     │    │
│  │   Drag & drop or click to upload│    │
│  │   JPG, PNG, WebP · Max 10MB    │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Preview Image] (after upload)         │
│  [Analyze Now] button (primary)         │
│                                         │
│  Previous Analyses:                     │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │Date 1│ │Date 2│ │Date 3│           │
│  └──────┘ └──────┘ └──────┘           │
└─────────────────────────────────────────┘
```

**Results Screen:**

```
┌─────────────────────────────────────────┐
│  Analysis Results                       │
│                                         │
│  Skin Type: Combination                 │
│  Estimated Age: 28                      │
│                                         │
│  Conditions:                            │
│  ┌─────────────────────────────────┐    │
│  │ 🟢 Mild Acne        Low    87% │    │
│  │ 🟡 Oiliness         Med    92% │    │
│  │ 🟢 Hydration        Good   78% │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Recommended Products:                  │
│  ┌──────────┐ ┌──────────┐             │
│  │Product 1 │ │Product 2 │             │
│  │94% match │ │91% match │             │
│  └──────────┘ └──────────┘             │
│                                         │
│  [Re-Analyze] [View History]            │
└─────────────────────────────────────────┘
```

**AI Screen Rules:**
- Loading state: Skeleton shimmer or spinner during analysis with lavender background.
- Error state: Clear error message with retry button.
- Progress indicator for long-running analysis.
- Condition severity: Color-coded badges (green=low, yellow=moderate, red=high).
- Confidence displayed as percentage bar.
- Products sorted by match score descending.
- "Re-Analyze" button always available with Luxury Purple (#7C3AED) background.
- Upload area: Soft Lavender (#F3E8FF) background with purple border.
- Results page: Clean white background with lavender card sections.
- CTA buttons: Luxury Purple (#7C3AED) with white text.

## 9.4 Merchant Dashboard Design

```
┌─────────────────────────────────────────┐
│  Merchant Dashboard                     │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Total │ │Orders│ │Avg   │ │Rating│  │
│  │Sales │ │  127 │ │$45.2 │ │4.7★  │  │
│  │$5,740│ │      │ │      │ │      │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  Sales Trend (Chart)                    │
│  ┌─────────────────────────────────┐    │
│  │  📈 Line chart / Bar chart      │    │
│  │  Last 30 days                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Recent Orders                          │
│  ┌─────────────────────────────────┐    │
│  │ Order #  │ Customer │ Amount │St│    │
│  │ #1001    │ John D.  │ $89.99 │ ✓│    │
│  │ #1000    │ Jane S.  │ $34.50 │ ⏳│   │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Dashboard Rules:**
- KPI cards: Large number, label, trend indicator (up/down arrow with percentage) on Soft Lavender (#F3E8FF) background.
- Charts: Use Recharts or similar. Responsive, interactive with Luxury Purple (#7C3AED) as primary chart color.
- Tables: Sortable columns, pagination, status badges with luxury aesthetic.
- Time range selector: 7d, 30d, 90d, 1y.
- All monetary values formatted with currency symbol.
- Header: Luxury Purple (#7C3AED) background with white text.
- Sidebar: Clean white background with purple accent for active items.

## 9.5 Admin Dashboard Design

```
┌─────────────────────────────────────────┐
│  Admin Dashboard                        │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Users │ │Merch.│ │Orders│ │Revenue│  │
│  │1,247 │ │  42  │ │3,891 │ │$127K │  │
│  │+12%  │ │ +3   │ │ +8%  │ │ +15% │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│                                         │
│  Pending Actions                        │
│  ┌─────────────────────────────────┐    │
│  │ 🔔 5 merchant approvals pending │    │
│  │ 🔔 12 reviews to moderate       │    │
│  │ 🔔 2 content reports            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Revenue & User Growth Charts           │
│  ┌─────────────────────────────────┐    │
│  │  📈 Dual-axis chart             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Admin Dashboard Rules:**
- Alert badges for pending actions (merchant approvals, review moderation) with Beauty Pink (#EC4899) accent.
- Platform-wide metrics with trend indicators on Soft Lavender (#F3E8FF) backgrounds.
- Quick action buttons for common admin tasks with Luxury Purple (#7C3AED) styling.
- All charts must be interactive (hover tooltips, click to drill down) with purple-based color scheme.
- Header: Luxury Purple (#7C3AED) background with white text.
- Sidebar: Clean white background with purple accent for active items.
- Revenue charts: Use purple gradient fills for premium aesthetic.

## 9.6 Color Palette

**Luxury Cosmetics Design System - Official Color Palette**

**Use shadcn/ui CSS variables only. Never define raw colors.**

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--background` | #FFFFFF (White) | #18181B (Near-black) | Page background |
| `--foreground` | #18181B (Near-black) | #FFFFFF (White) | Primary text |
| `--primary` | #7C3AED (Luxury Purple) | #7C3AED (Luxury Purple) | Primary actions, links, CTA buttons |
| `--primary-foreground` | #FFFFFF (White) | #FFFFFF (White) | Text on primary |
| `--secondary` | #F3E8FF (Soft Lavender) | #2D1B4E (Dark Lavender) | Secondary actions, card backgrounds |
| `--muted` | #F8F4FF (Light Lavender) | #1F1529 (Very Dark Purple) | Muted backgrounds, subtle surfaces |
| `--muted-foreground` | #6B7280 (Gray) | #9CA3AF (Light Gray) | Secondary text, captions |
| `--destructive` | #EF4444 (Red) | #EF4444 (Red) | Delete, error actions |
| `--border` | #E5E7EB (Light Gray) | #374151 (Dark Gray) | Borders |
| `--ring` | #7C3AED (Luxury Purple) | #7C3AED (Luxury Purple) | Focus rings |
| `--accent` | #EC4899 (Beauty Pink) | #EC4899 (Beauty Pink) | Promotions, wishlist hearts, ratings, sale badges |

**Additional Brand Colors:**

| Color | Hex | Usage |
|-------|-----|-------|
| Luxury Purple | #7C3AED | Main brand color, primary buttons, headers, navigation |
| Beauty Pink | #EC4899 | Promotions, CTA highlights, wishlist hearts, rating stars, sale badges, beauty-focused accents |
| Soft Lavender | #F3E8FF | Card backgrounds, section backgrounds, filter backgrounds, badges, subtle surfaces |
| Muted Lavender | #F8F4FF | Input backgrounds, hover states, subtle highlights |
| Success Green | #22C55E | Success states, positive indicators |
| Warning Amber | #F59E0B | Warning states, low stock alerts |
| Error Red | #EF4444 | Error states, destructive actions |

**Semantic Colors (Tailwind utilities):**

```
bg-background     → Page background (White)
bg-primary        → Primary buttons (Luxury Purple)
bg-secondary      → Secondary surfaces (Soft Lavender)
bg-accent         → Accent elements (Beauty Pink)
bg-destructive    → Delete buttons (Red)
bg-muted          → Muted backgrounds (Light Lavender)
text-foreground   → Primary text (Near-black)
text-muted-foreground → Secondary text (Gray)
text-primary-foreground → Text on purple buttons (White)
border-border     → All borders (Light Gray)
ring              → Focus rings (Luxury Purple)
```

**Color Usage Rules:**
- **Purple (#7C3AED)** becomes the main brand color and replaces all previous "Brand Blue" references. Use for primary buttons, navigation, headers, links, and focus rings.
- **Pink (#EC4899)** is used for promotions, CTA highlights, wishlist hearts, rating stars, sale badges, and beauty-focused accents.
- **Lavender (#F3E8FF)** is used for card backgrounds, section backgrounds, filter backgrounds, badges, and subtle surfaces.
- **White (#FFFFFF)** remains the primary page background.
- **Dark text (#18181B)** remains the primary typography color.
- NEVER use raw color values like `bg-white`, `bg-gray-500`, `text-red-500`.
- ALWAYS use semantic tokens: `bg-background`, `text-muted-foreground`.
- `dark:` overrides on shadcn components are PROHIBITED.
- Color decisions are made via CSS variables, not Tailwind classes.
- Use purple and pink gradients for hero sections and promotional banners.
- Product cards should have luxury beauty aesthetics with lavender backgrounds.
- AI Skin Analysis pages should use lavender backgrounds and purple CTA buttons.
- Merchant and Admin dashboards should follow the same purple-based theme.
- Wishlist icons, rating elements, and promotional badges should use pink accents.

## 9.7 Typography

| Element | Tailwind Classes | Usage |
|---------|-----------------|-------|
| Page title | `text-3xl font-bold tracking-tight` | Page headings |
| Section title | `text-xl font-semibold` | Section headings |
| Card title | `text-lg font-medium` | Card headings |
| Body text | `text-base` | Paragraphs |
| Small text | `text-sm` | Captions, helper text |
| Extra small | `text-xs` | Badges, timestamps |
| Price | `text-lg font-bold` | Product prices |
| Price (compare) | `text-sm text-muted-foreground line-through` | Original prices |

**Typography Rules:**
- Use Tailwind typography utilities, never raw CSS `font-size`.
- Line height: `leading-normal` for body, `leading-tight` for headings.
- Max line length: 60-80 characters for readability.
- Use `line-clamp-*` utilities for text truncation.

## 9.8 Forms

**Form Layout:**

```
┌─────────────────────────────────────────┐
│  Form Title                             │
│                                         │
│  Label                                   │
│  ┌─────────────────────────────────┐    │
│  │ Input                           │    │
│  └─────────────────────────────────┘    │
│  Helper text / Error message            │
│                                         │
│  Label                                   │
│  ┌─────────────────────────────────┐    │
│  │ Select ▼                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌──────────────┐ ┌──────────────┐     │
│  │ Cancel       │ │ Submit       │     │
│  └──────────────┘ └──────────────┘     │
└─────────────────────────────────────────┘
```

**Form Rules:**
- Labels MUST be associated with inputs via `htmlFor`/`id`.
- Error messages MUST be displayed below the input, linked via `aria-describedby`.
- Required fields MUST have visual indicator (asterisk) and `aria-required`.
- Submit button MUST show loading state during submission with Luxury Purple (#7C3AED) background.
- Form submission MUST be disabled during loading.
- Use `FormMessage` component from shadcn/ui for error display.
- Validation errors MUST appear inline, not in alerts.
- Cancel button uses `variant="outline"`. Submit uses default variant with purple styling.
- Input backgrounds: Soft Lavender (#F3E8FF) for luxury beauty aesthetic.
- Focus states: Purple ring (#7C3AED) for consistent brand identity.

## 9.9 Tables

**Table Structure:**

```
┌──────┬──────────────┬────────┬─────────┬──────────┐
│ Sort │ Product Name │ Price  │ Stock   │ Status   │
├──────┼──────────────┼────────┼─────────┼──────────┤
│ ☐    │ Cleanser     │ $29.99 │ 150     │ Active   │
│ ☐    │ Serum        │ $49.99 │ 0       │ Inactive │
│ ☐    │ Moisturizer  │ $34.99 │ 5       │ Low Stock│
├──────┴──────────────┴────────┴─────────┴──────────┤
│ ◄ 1 2 3 ... 8 >                     Showing 1-20  │
└───────────────────────────────────────────────────┘
```

**Table Rules:**
- Use shadcn/ui `Table` component.
- Sortable columns: Click header to sort, show arrow indicator with purple accent.
- Selectable rows: Checkbox in first column with purple accent.
- Pagination: Bottom of table, shows current range with purple active page.
- Empty state: Message + illustration when no data.
- Loading state: Skeleton rows during fetch.
- Responsive: Horizontal scroll on mobile with sticky first column.
- Header background: Soft Lavender (#F3E8FF) for luxury beauty aesthetic.
- Row hover: Light lavender background for premium feel.
- Status badges: Use the updated status badge colors with purple and pink accents.

## 9.10 Modals (Dialogs)

**Modal Structure:**

```
┌─────────────────────────────────────────┐
│  Dialog Title                    [X]    │
├─────────────────────────────────────────┤
│                                         │
│  Dialog content goes here.              │
│                                         │
├─────────────────────────────────────────┤
│  [Cancel]                        [Save] │
└─────────────────────────────────────────┘
```

**Modal Rules:**
- Use shadcn/ui `Dialog` component (Radix UI).
- Focus MUST be trapped within dialog when open.
- ESC key MUST close the dialog.
- Click outside dialog MUST close it (unless confirmation required).
- Title MUST be descriptive and concise.
- Actions: Cancel (outline) on left, Primary action on right with Luxury Purple (#7C3AED) background.
- Destructive modals: Use `AlertDialog` with red confirmation button.
- Loading state on submit button during async operations.
- Modal background: White with subtle lavender border for luxury aesthetic.
- Header: Luxury Purple (#7C3AED) accent or border for brand consistency.

## 9.11 Status Badges

| Status | Badge Color | Text |
|--------|------------|------|
| Active | Green (`bg-green-100 text-green-800`) | Active |
| Inactive | Gray (`bg-gray-100 text-gray-800`) | Inactive |
| Pending | Amber (`bg-amber-100 text-amber-800`) | Pending |
| Processing | Purple (`bg-purple-100 text-purple-800`) | Processing |
| Delivered | Green (`bg-green-100 text-green-800`) | Delivered |
| Done | Green (`bg-green-100 text-green-800`) | Done |
| Approved | Green (`bg-green-100 text-green-800`) | Approved |
| Rejected | Red (`bg-red-100 text-red-800`) | Rejected |
| Low Stock | Amber (`bg-amber-100 text-amber-800`) | Low Stock |
| Out of Stock | Red (`bg-red-100 text-red-800`) | Out of Stock |
| Sale/Promotion | Pink (`bg-pink-100 text-pink-800`) | Sale |
| New Arrival | Purple (`bg-purple-100 text-purple-800`) | New |

**Badge Rules:**
- Use `Badge` component from shadcn/ui with appropriate `variant`.
- Consistent sizing: `text-xs px-2 py-0.5 rounded-full`.
- Color MUST convey semantic meaning (green=good, red=bad, yellow=warning, purple=processing/brand, pink=promotions).
- Never use color alone to convey information. Include text label.
- Use Beauty Pink (#EC4899) for promotional badges and sale indicators.
- Use Luxury Purple (#7C3AED) for processing states and brand-related badges.

---

# 10. Performance Standards

## 10.1 API Response Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p50) | ≤ 200ms | Server-side logging |
| API response time (p95) | ≤ 500ms | Server-side logging |
| API response time (p99) | ≤ 1000ms | Server-side logging |
| Database query time | ≤ 50ms | Prisma logging |
| Redis operation time | ≤ 5ms | Redis logging |
| Health check endpoint | ≤ 50ms | Always |

## 10.2 Dashboard Targets

| Metric | Target |
|--------|--------|
| Initial page load (LCP) | ≤ 2 seconds |
| Time to Interactive (TTI) | ≤ 3 seconds |
| First Contentful Paint (FCP) | ≤ 1.5 seconds |
| Cumulative Layout Shift (CLS) | ≤ 0.1 |
| First Input Delay (FID) | ≤ 100ms |

## 10.3 Search Targets

| Metric | Target |
|--------|--------|
| Search response time (10K records) | ≤ 3 seconds |
| Autocomplete response time | ≤ 200ms |
| Filter application time | ≤ 500ms |
| Debounce delay (search input) | 300ms |

## 10.4 AI Analysis Targets

| Metric | Target |
|--------|--------|
| Image upload time | ≤ 5 seconds (10MB file) |
| AI analysis processing | ≤ 10 seconds |
| Results rendering | ≤ 500ms |
| Cache hit response | ≤ 200ms |
| Re-analysis allowed | Immediately (override cache) |

## 10.5 Redis Caching Standards

| Cache Target | TTL | Invalidation |
|-------------|-----|-------------|
| Product detail | 5 min | On product update/delete |
| Product list (with filters) | 2 min | On any product mutation |
| Category tree | 30 min | On category mutation |
| User profile | 5 min | On profile update |
| Shop profile | 10 min | On shop update |
| Access token blacklist | Remaining TTL | On logout |
| Rate limit counters | 60s (API), 300s (auth) | Automatic sliding window |

**Caching Rules:**
- Cache-aside pattern: Check Redis → miss → query DB → set Redis.
- Write-through invalidation: On mutation, `DEL` the cache key.
- NEVER cache sensitive data (passwords, tokens, PII).
- ALWAYS set TTL. Never cache indefinitely.
- Use `cache:product:{id}` naming convention.
- Use hash for list caches: `cache:products:list:{hash}`.

---

# 11. Environment & Deployment Standards

## 11.1 Environment Variable Schema

**Backend (.env):**

```bash
# Application
APP_PORT=8080
APP_API_PREFIX=api/v1
APP_CORS_ORIGIN=http://localhost:5173
APP_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cosmetics_finder

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ABSOLUTE_LIMIT_DAYS=90

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_PRODUCT=5242880
MAX_FILE_SIZE_AVATAR=5242880
MAX_FILE_SIZE_ANALYSIS=10485760

# AI (future)
AI_API_KEY=
AI_API_URL=
```

**Frontend (.env):**

```bash
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Cosmetics Finder
VITE_APP_VERSION=0.1.0
```

**Environment Variable Rules:**
- ALL env vars MUST be validated at startup using Zod schemas.
- `.env` files MUST NOT be committed to git.
- `.env.example` MUST be committed with placeholder values.
- Sensitive values MUST be at least 32 characters.
- NEVER log environment variable values.
- NEVER expose backend env vars to frontend (only `VITE_` prefixed).

## 11.2 Docker Setup

**docker-compose.yml (Development):**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: cosmetics_finder
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgresql://dev_user:dev_password@postgres:5432/cosmetics_finder
      REDIS_HOST: redis
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:8080/api/v1

volumes:
  postgres_data:
```

**Docker Rules:**
- Use Alpine-based images for smaller size.
- NEVER include secrets in Dockerfiles. Use runtime environment variables.
- Use multi-stage builds for production images.
- Run containers as non-root user.
- Health checks MUST be defined for all services.

## 11.3 CI/CD Requirements

**Pipeline Stages:**

| Stage | Steps | Gate |
|-------|-------|------|
| Lint | ESLint (backend + frontend) | Must pass |
| Type Check | TypeScript strict mode compilation | Must pass |
| Unit Tests | Jest (backend) + Vitest (frontend) | Must pass, coverage ≥ 80% |
| Integration Tests | Backend API tests | Must pass |
| Build | `npm run build` (both) | Must succeed |
| Security Scan | `npm audit`, dependency check | No critical/high vulns |
| E2E Tests | Playwright/Cypress | Must pass (on PR to main) |

**CI/CD Rules:**
- All checks MUST pass before merge to main/develop.
- Failed pipelines block deployment.
- Deployment to staging: Automatic on merge to develop.
- Deployment to production: Manual approval required.
- Rollback capability MUST be maintained.

## 11.4 Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| Database URL | Environment variable | Backend only |
| JWT secrets | Environment variable | Backend only |
| Redis password | Environment variable | Backend only |
| API keys | Environment variable | Backend only |
| Upload credentials | Environment variable | Backend only |

**Secrets Rules:**
- NEVER commit secrets to git.
- NEVER log secrets.
- NEVER include secrets in error messages.
- NEVER expose secrets to frontend.
- Use environment variables for all secrets.
- Rotate secrets periodically (quarterly recommended).
- Use different secrets for development, staging, production.

---

# 12. Marketplace-Specific Rules

## 12.1 Product Ownership Rules

| Rule | Implementation |
|------|---------------|
| Product belongs to merchant | `merchantId` FK on products table |
| Merchants can only edit own products | Service checks `merchantId === currentUser.id` |
| Merchants can only delete own products | Service checks `merchantId === currentUser.id` |
| Admin can edit/delete any product | Admin role bypasses ownership check |
| Product soft-delete via `isActive` | `DELETE` endpoint sets `isActive = false` |
| Inactive products hidden from search | Query filters `isActive = true` |

**Ownership Verification (Backend):**

```typescript
// In products.service.ts
async update(id: string, dto: UpdateProductDto, userId: string) {
  const product = await this.prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundException('Product not found');
  if (product.merchantId !== userId) throw new ForbiddenException('Not your product');
  // ... update logic
}
```

## 12.2 Merchant Approval Workflow

| Step | Action | Status |
|------|--------|--------|
| 1 | User registers as merchant | `role = 'merchant'` |
| 2 | Merchant creates shop profile | `shops.is_approved = false` |
| 3 | Admin reviews shop | — |
| 4a | Admin approves | `shops.is_approved = true` |
| 4b | Admin rejects | Shop deleted or flagged |
| 5 | Approved merchant can list products | Product listing enabled |

**Rules:**
- New merchant shops are `is_approved = false` by default.
- Products from unapproved shops are NOT visible to buyers.
- Admin receives notification for pending approvals.
- Admin can reject with reason (stored for merchant reference).
- Re-approval required if shop is deactivated.

## 12.3 Review Moderation Rules

| Rule | Detail |
|------|--------|
| Eligibility | Only verified purchasers can review |
| One review per user per product | Enforced via unique constraint `[userId, productId]` |
| Rating range | 1-5 inclusive, enforced via check constraint |
| Auto-approval | Reviews approved by default (`is_approved = true`) |
| Admin moderation | Admin can approve/reject/delete any review |
| Average rating | Auto-calculated from approved reviews only |
| Review count | Auto-calculated from approved reviews only |

**Review Flow:**

```
User submits review → is_approved = true → Visible on product
                                        ↓
                            Admin flags review → is_approved = false → Hidden from product
```

## 12.4 Order Lifecycle Rules

**Status Flow:**

```
placed → confirmed → packed → shipped → out_for_delivery → delivered
```

**Transition Rules:**

| From | Allowed To | Triggered By |
|------|-----------|-------------|
| placed | confirmed | Merchant |
| confirmed | packed | Merchant |
| packed | shipped | Merchant |
| shipped | out_for_delivery | Courier/System |
| out_for_delivery | delivered | Buyer/System |

**Order Rules:**
- Stock is decremented atomically on order creation (`$transaction`).
- Prices are locked at order creation time.
- Total = Subtotal + Shipping Cost + Tax.
- Subtotal = Σ(unit_price × quantity).
- Delivered status is confirmed by system or buyer.

## 12.5 Wishlist Rules

| Rule | Detail |
|------|--------|
| One wishlist entry per user per product | Unique constraint `[userId, productId]` |
| Toggle behavior | POST adds, DELETE removes (idempotent) |
| Wishlist shows product info | Join with products table for name, price, image |
| Move to cart | Optional feature: copy wishlist item to cart |
| Inactive products | Still shown in wishlist but marked as unavailable |

## 12.6 Promotion Rules

| Rule | Detail |
|------|--------|
| Code uniqueness | Unique constraint on `code` column |
| Merchant isolation | Each merchant creates own promotions |
| Discount types | `percentage` or `fixed` (enum constraint) |
| Min order amount | Optional minimum for discount applicability |
| Usage limits | Optional `max_uses` with `used_count` tracking |
| Date range | `starts_at` < `expires_at` (check constraint) |
| Active status | `is_active` flag for enable/disable |
| One coupon per order | Enforced at checkout service level |
| Discount floor | Discounted amount cannot go below $0 |

**Discount Calculation:**

```
percentage discount: discount = subtotal × (discountValue / 100)
fixed discount: discount = min(discountValue, subtotal)
final = max(0, subtotal - discount)
```

## 12.7 Advertisement Rules

| Rule | Detail |
|------|--------|
| Merchant ownership | Ads belong to a shop, shop belongs to merchant |
| Date range | `starts_at` < `expires_at` (check constraint) |
| Active filtering | Only `is_active = true` AND within date range shown |
| Shop approval required | Only approved shops can have active ads |
| Image optional | Ads can be text-only or with image |
| Link URL optional | Click-through URL is optional |
| Admin approval required | All ads must be approved by admin before display |
| Payment required | Merchants must pay advertising fee before submission |
| Weekly ad limit | Maximum 5 active advertisements per week |
| Announcement message | Ads must include announcement message for display |
| Approval status | Ads have approval_status: pending/approved/rejected |
| Payment status | Ads have payment_status: pending/paid/failed/refunded |
| Rejection refund | Automatic refund if ad is rejected |
| Resubmission | Rejected ads can be edited and resubmitted |

## 12.8 AI Skin Analysis Rules

| Rule | Detail |
|------|--------|
| Image requirements | Face must be visible, well-lit, clear |
| Supported formats | JPG, PNG, WebP |
| Max file size | 10MB |
| Analysis output | Skin type, conditions with severity, estimated age |
| Recommendations | Based on analysis results and product database |
| Caching | Results cached for 24 hours per user |
| Re-analysis | Allowed at any time, overwrites cache |
| History | Retained indefinitely |
| Buyer-only feature | Only users with `buyer` role can use AI analysis |
| Storage | Analysis images stored securely, not publicly accessible |

---

# 13. Database Change Governance

## 13.1 Prisma Migration Rules

| Rule | Detail |
|------|--------|
| Development migrations | `npx prisma migrate dev --name <description>` |
| Production migrations | `npx prisma migrate deploy` (non-interactive) |
| Never use `db push` in production | `db push` is for prototyping only |
| Migration files committed | SQL migration files MUST be in version control |
| Schema is source of truth | Always modify `schema.prisma`, never raw SQL |
| Reversible when possible | Migrations should have up AND down paths |
| Backward compatible | New columns should be nullable or have defaults |
| No breaking changes | Don't rename/remove columns without migration strategy |

**Migration Strategy for Dangerous Changes:**

```
1. Add nullable column
2. Backfill data
3. Add NOT NULL constraint
4. (Optional) Remove old column in next migration
```

## 13.2 Schema Review Process

**Before any Prisma schema change:**

- [ ] Schema change follows naming conventions (Section 1.2)
- [ ] New indexes added for FK columns and frequent query filters
- [ ] `onDelete`/`onUpdate` explicitly specified for all relations
- [ ] `Decimal` used for monetary values (never `Float`)
- [ ] Check constraints added for business rules (e.g., `price > 0`)
- [ ] Migration tested on development database
- [ ] Migration tested on staging database
- [ ] Migration has rollback strategy
- [ ] Performance impact assessed (new indexes)
- [ ] Schema change documented in PR description

## 13.3 Prohibited Direct Database Modifications

**NEVER do the following without going through Prisma migrations:**

| Prohibited Action | Reason |
|-------------------|--------|
| `ALTER TABLE` via raw SQL | Bypasses schema version control |
| `INSERT` into lookup tables without seed script | Data inconsistency |
| `DROP TABLE` or `DROP COLUMN` | Data loss risk |
| `UPDATE` without `WHERE` clause | Accidental bulk update |
| Manual index creation | Bypasses schema tracking |
| Changing column types | Breaking change risk |
| Modifying constraints | Data integrity risk |

**Exception:** Emergency production fixes with documented approval and post-fix migration.

---

# 14. Acceptance Checklist

## Pre-Merge Checklist (Developer MUST complete)

### Code Quality
- [ ] No `any` types in TypeScript code
- [ ] No `console.log` statements in production code
- [ ] No hardcoded secrets, credentials, or API keys
- [ ] No commented-out code blocks
- [ ] All functions have clear, descriptive names
- [ ] Code follows naming conventions (Section 1)
- [ ] ESLint passes with zero errors
- [ ] TypeScript compiles without errors (strict mode)

### Security
- [ ] All new endpoints have `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] All new endpoints have `@Roles()` decorator
- [ ] All inputs validated via DTOs with `class-validator`
- [ ] No SQL injection vectors (Prisma parameterized queries used)
- [ ] No XSS vectors (no `dangerouslySetInnerHTML` without sanitization)
- [ ] File uploads validated (MIME type, size)
- [ ] Passwords hashed with Argon2 (never plain text)
- [ ] JWT secrets not exposed in logs or error messages

### Database
- [ ] Prisma schema follows naming conventions (Section 1.2)
- [ ] New FK columns have `@@index`
- [ ] `onDelete`/`onUpdate` explicitly specified
- [ ] Migration tested on development database
- [ ] Migration is reversible where possible
- [ ] No breaking changes without migration strategy

### Testing
- [ ] Unit tests added for new services/methods
- [ ] Unit tests added for new controllers
- [ ] Integration tests added for new endpoints
- [ ] All existing tests still pass
- [ ] Test coverage meets minimum targets (Section 7.4)
- [ ] Test names are descriptive and follow conventions

### Frontend (if applicable)
- [ ] All new UI strings use i18n translation keys
- [ ] Components follow naming conventions (Section 1.3)
- [ ] Forms use `zodResolver` with React Hook Form
- [ ] No raw color values (use semantic tokens)
- [ ] Keyboard navigation works
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Loading/error states implemented
- [ ] No unused imports or variables

### Backend (if applicable)
- [ ] Swagger annotations updated for new endpoints
- [ ] Error responses follow standard format (Section 6.1)
- [ ] Logging uses NestJS Logger (no `console.log`)
- [ ] Redis caching implemented where appropriate
- [ ] Rate limiting applied to new public endpoints
- [ ] Audit logging implemented for sensitive operations

### Documentation
- [ ] PR description follows template (Section 3.3)
- [ ] Related issues linked in PR
- [ ] Breaking changes documented
- [ ] New environment variables documented in `.env.example`
- [ ] API documentation updated (Swagger)

### Performance
- [ ] No N+1 queries (use `select`/`include` properly)
- [ ] Redis caching for frequently accessed data
- [ ] Pagination implemented for list endpoints
- [ ] Image uploads optimized (compressed, multiple sizes)
- [ ] Database queries use proper indexes

---

**Document Management:**
- Author: Principal Software Architect & Enterprise Engineering Governance Lead
- Created: 2026-08-03
- Last Updated: 2026-08-14
- Next Review: Phase 2 Planning
- Approved By: [Approved]

---

*End of DEVELOPMENT_RULES.md*
