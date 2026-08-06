# Full Stack Starter Skill Specification
## Cosmetics Finder

---

## 1. Executive Summary

This specification defines a reusable, implementation-ready architecture for the **Cosmetics Finder** platform. The platform connects buyers seeking personalized skincare solutions with merchants selling skincare products, powered by AI skin analysis and smart product recommendations.

### Platform Capabilities

| Role | Core Capabilities |
|------|-------------------|
| **Buyer** | Registration, AI skin analysis, smart product recommendations, product search/filtering, reviews, wishlist, cart, checkout, shop finder (GPS) |
| **Merchant** | Product management, inventory, shop profile, promotions, coupons, advertisements, sales dashboard, analytics |
| **Admin** | User/merchant management, review/content moderation, analytics & reports, revenue & commission management |

### Design Principles

- **Luxury Beauty Marketplace**: Elegant, feminine, sophisticated aesthetic inspired by Sephora, Dior Beauty, Rare Beauty, and Glow Recipe
- **Type-Safe End-to-End**: TypeScript on both frontend and backend; Prisma schema as single source of truth
- **Security-First**: JWT with refresh token rotation, RBAC, Redis blacklisting, input validation
- **Performance-Oriented**: Redis caching, lazy loading, code splitting, optimized queries
- **Scalable Architecture**: Feature-based modular design, API versioning, database indexing strategy
- **Accessibility**: WCAG 2.1 AA compliance, semantic HTML, keyboard navigation
- **Internationalization**: English, Myanmar, and Japanese language support from day one

**Brand Identity:**
- Primary brand color: Luxury Purple (#7C3AED) - conveys premium, sophisticated beauty
- Accent color: Beauty Pink (#EC4899) - used for promotions, CTA highlights, wishlist hearts, ratings, and sale badges
- Secondary color: Soft Lavender (#F3E8FF) - used for card backgrounds, sections, filters, badges, and subtle surfaces

---

## 2. Technology Stack Overview

### Backend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | LTS (22+) | JavaScript runtime |
| Framework | NestJS | v11 | Modular, testable backend framework |
| Language | TypeScript | v5.9+ | Type safety |
| ORM | Prisma | v7 | Database access, migrations, type generation |
| Database | PostgreSQL | v16 | Primary data store |
| Cache/Session | Redis | v7 | Session management, caching, rate limiting |
| Authentication | JWT | - | Access + refresh token strategy |
| Validation | class-validator + Zod | - | DTO and schema validation |
| API Docs | Swagger/OpenAPI | v3 | API documentation |
| Testing | Jest + Supertest | - | Unit and e2e testing |
| Hashing | Argon2 | - | Password hashing (memory-hard) |

### Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | v19.2 | UI library |
| Build Tool | Vite | v8 | Development server and bundler |
| Language | TypeScript | v5.9+ | Type safety (strict mode) |
| Routing | React Router | v7 | Client-side routing |
| Server State | TanStack Query | v5 | Data fetching, caching, mutations |
| Forms | React Hook Form | v7 | Form state management |
| Validation | Zod | v4 | Schema validation |
| UI Components | shadcn/ui | latest | Accessible, composable components |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Icons | Lucide React | latest | Icon library |
| i18n | i18next + react-i18next | v24 | Internationalization |
| Theme | next-themes | v0.4 | Dark/light mode |
| HTTP Client | Axios | v1 | API communication |
| Toast | Sonner | v2 | Notification toasts |
| Testing | Vitest + React Testing Library | - | Component and unit testing |

---

## 3. Overall System Architecture

```
+-------------------------------------------------------------------+
|                        CLIENT LAYER                               |
|  +-------------------------------------------------------------+  |
|  |  React SPA (Vite + TypeScript)                              |  |
|  |  |-- shadcn/ui Components                                   |  |
|  |  |-- React Router (Lazy Routes)                             |  |
|  |  |-- TanStack Query (Server State)                          |  |
|  |  |-- React Hook Form + Zod (Forms)                          |  |
|  |  |-- i18next (EN/MY/JA)                                      |  |
|  |  +-- next-themes (Light/Dark)                               |  |
|  +----------------------------+--------------------------------+  |
|                               | HTTPS (JWT Bearer)                |
+-------------------------------+-----------------------------------+
|                          API LAYER                                |
|  +----------------------------+--------------------------------+  |
|  |  NestJS REST API (v11 + TypeScript)                         |  |
|  |  |-- Auth Module (JWT + Refresh Rotation)                   |  |
|  |  |-- Guards (JWT, RBAC)                                     |  |
|  |  |-- Pipes (ValidationPipe + class-validator)               |  |
|  |  |-- Interceptors (Logging, Serialization, Timeout)         |  |
|  |  |-- Filters (ExceptionFilter -> Structured Errors)         |  |
|  |  +-- Swagger/OpenAPI Documentation                          |  |
|  +----------+-------------------------------+------------------+  |
|             |                               |                    |
+-------------+-------------------------------+--------------------+
|          DATA LAYER                    CACHE LAYER               |
|  +----------+----------+      +----------+----------+            |
|  |  PostgreSQL v16     |      |  Redis v7            |            |
|  |  |-- Prisma ORM v7  |      |  |-- Session Store   |            |
|  |  |-- Migrations     |      |  |-- Token Blacklist |            |
|  |  |-- Indexes        |      |  |-- API Cache       |            |
|  |  +-- Transactions   |      |  +-- Rate Limiting   |            |
|  +---------------------+      +---------------------+            |
+-------------------------------------------------------------------+
```

### Request Lifecycle

1. Client sends HTTP request with `Authorization: Bearer <accessToken>`
2. NestJS global pipes validate input (`ValidationPipe` with `whitelist: true`)
3. `JwtAuthGuard` verifies token, checks Redis blacklist
4. `RolesGuard` checks RBAC permissions
5. Controller delegates to Service
6. Service uses Prisma for database operations
7. Service checks Redis cache for frequently-accessed data
8. Response passes through `ClassSerializerInterceptor` (excludes sensitive fields)
9. Exception filters catch and format errors consistently
10. Client receives structured JSON response

---

## 4. Frontend Architecture

### 4.1 Vite Configuration

- Use `@vitejs/plugin-react` for Fast Refresh
- Use `@tailwindcss/vite` for Tailwind v4 integration
- Configure path aliases: `@/` -> `src/`
- Set `build.target: 'es2022'`
- Enable `build.rollupOptions.output.manualChunks` to split vendor bundles
- Environment variables prefixed with `VITE_` (validated at build time)

### 4.2 React 19.2+ Standards

- Strict mode enabled in development
- No `useEffect` for data fetching -- use TanStack Query exclusively
- Use `useOptimistic` for immediate UI feedback during mutations
- Use composition over prop drilling
- Memoize only when profiling proves a rendering problem
- Component naming: PascalCase files, default exports for components, named exports for types

### 4.3 TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  }
}
```

**Rules:**
- Never use `any` -- use `unknown` with type narrowing
- Use `type` over `interface` unless declaration merging is needed
- Use discriminated unions for state variations
- Validate environment variables with Zod at startup

### 4.4 React Router v7

- Lazy-load all route components via `React.lazy()` + `Suspense`
- Nested route structure with layout routes
- Protected routes via wrapper component checking auth state
- Route loaders for data pre-fetching where applicable
- 404 catch-all route

### 4.5 TanStack Query v5

**Query Key Factory Pattern:**
```typescript
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};
```

**Configuration:**
- `staleTime: 5 * 60 * 1000` (5 minutes for most queries)
- `gcTime: 10 * 60 * 1000` (10 minutes cache retention)
- `retry: 2` with exponential backoff
- `refetchOnWindowFocus: false` (configurable per query)
- Use `placeholderData: keepPreviousData` for pagination
- Use `useSuspenseQuery` when Suspense boundaries are available

**Mutation Pattern:**
- Always invalidate narrowest useful key in `onMutate`/`onSettled`
- Use optimistic updates with snapshot + rollback pattern
- Cancel in-flight queries before optimistic updates
- Never mirror query data into local `useState`

### 4.6 React Hook Form + Zod

- Use `zodResolver` for form validation
- Validate on client (UX) and server (security)
- Keep form logic outside UI components
- Use `Field` and `FieldGroup` components from shadcn/ui for layout
- Show `aria-invalid` and error messages via `FormMessage` component

### 4.7 shadcn/ui Components

**Core Principles:**
- Components live in `components/ui/` -- owned by the codebase
- Compose, don't reinvent: Settings = Tabs + Card + form controls
- Use built-in variants before custom styles
- Use semantic colors (`bg-primary`, `text-muted-foreground`) -- never raw values
- Use `cn()` for conditional classes
- Use `gap-*` instead of `space-x-*` / `space-y-*`
- Use `size-*` when width and height are equal
- No manual `z-index` on overlay components
- Never use `dangerouslySetInnerHTML` without DOMPurify

**Component Selection:**

| Need | Component |
|------|-----------|
| Actions | `Button` with variant |
| Forms | `Input`, `Select`, `Switch`, `Checkbox`, `Textarea` |
| Data Display | `Table`, `Card`, `Badge`, `Avatar` |
| Navigation | `Sidebar`, `Tabs`, `Breadcrumb`, `Pagination` |
| Overlays | `Dialog`, `Sheet`, `Drawer`, `AlertDialog` |
| Feedback | Sonner `toast()`, `Alert`, `Progress`, `Skeleton` |
| Layout | `Card`, `Separator`, `ScrollArea`, `Accordion` |

### 4.8 Tailwind CSS v4

- CSS-first configuration using `@theme` blocks
- Mobile-first responsive design (`md:`, `lg:`, `xl:` breakpoints)
- OKLCH color space for vibrant, consistent colors
- No `@apply` -- use utility classes directly in JSX
- CSS variables for theming (light/dark via `.dark` class)

### 4.9 Lucide React

- Import specific icons, not entire library
- Use consistent sizing: `size-4` for inline, `size-6` for standalone
- No sizing classes on icons inside shadcn components (they handle sizing)

---

## 5. Backend Architecture

### 5.1 NestJS Module Design

**Feature-Based Structure (Recommended):**
- Each feature is a self-contained module with controllers, services, DTOs, entities, and tests
- Group by domain, not by technical layer
- Shared cross-cutting concerns in a `SharedModule` (marked `@Global()`)
- One-time setup in a `CoreModule` (imported only in `AppModule`)

**Module Rules:**
- Feature modules export only what other modules need
- Avoid `@Global()` unless genuinely cross-cutting
- Keep DTOs (API shape) separate from Prisma entities (DB shape)
- Never return an entity directly from a controller

### 5.2 REST API Design

- API versioning via URI: `/api/v1/...`
- Plural nouns for resources: `/products`, `/users`, `/orders`
- HTTP methods: GET (read), POST (create), PATCH (update), DELETE (remove)
- Consistent response format: `{ data: T }` for success, `{ statusCode, message, error }` for errors
- Pagination: `?page=1&limit=20` with cursor-based alternative for large datasets
- Filtering: `?category=moisturizer&minPrice=10&maxPrice=50`
- Sorting: `?sort=createdAt&order=desc`

### 5.3 Prisma ORM v7

**Schema Design Standards:**
- PascalCase model names (singular), camelCase fields
- `cuid()` or `uuid(7)` for primary keys (not auto-increment for distributed)
- `Decimal` for monetary amounts (never `Float`)
- Explicit `onDelete`/`onUpdate` on every relation
- `@@index` on all foreign key columns and frequent query filters
- `@unique` on natural keys (email, slug)
- Composite indexes for multi-column queries
- Map to snake_case tables with `@@map("table_name")`

**Query Optimization:**
- One global `PrismaClient` instance -- never create multiple
- Use `select` to fetch only needed fields
- Use `include` with `select` to avoid N+1 (Prisma v7 relationJoins)
- Use cursor-based pagination for large datasets
- Use `$transaction` for multi-step writes requiring atomicity
- Never concatenate user input into raw SQL -- use `$queryRaw` tagged templates

**Migration Strategy:**
- Development: `prisma migrate dev --name description`
- Production: `prisma migrate deploy` (non-interactive, advisory locking)
- Never use `db push` in production
- Commit generated SQL files alongside schema changes
- For dangerous migrations: add nullable column -> backfill -> add constraint

### 5.4 PostgreSQL Architecture

**Schema Organization:**
- Use schemas for multi-tenancy if needed: `public`, `auth`, `analytics`
- UUID v7 for primary keys (time-ordered, URL-safe)
- JSONB for flexible metadata fields
- Full-text search indexes for product search
- Composite indexes matching real filter/sort patterns
- Partial indexes for common WHERE conditions (e.g., `WHERE deletedAt IS NULL`)

**Connection Management:**
- Connection pooling via PgBouncer or Prisma Accelerate
- `max_connections` tuning based on concurrent workload
- Separate read replicas for read-heavy operations

### 5.5 Redis Architecture

**Key Separation Strategy:**
- `session:{token}` -- session data with TTL
- `blacklist:{jti}` -- access token blacklist until natural expiry
- `cache:{entity}:{id}` -- cached entity data with TTL
- `rate:{ip}:{window}` -- rate limit counters
- `lock:{resource}` -- distributed locks

**Configuration:**
```redis
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

**Patterns:**
- Cache-aside for entity caching: check Redis -> miss -> query DB -> set Redis
- Write-through invalidation: on mutation, `DEL` the cache key
- Lua scripts for atomic multi-step operations
- Sliding window for rate limiting (sorted sets + `ZRANGEBYSCORE`)
- Sliding expiration for sessions (refresh TTL on each access)

### 5.6 JWT Authentication

**Dual-Token Architecture:**
- Access Token: 15-minute expiry, signed with `JWT_ACCESS_SECRET`
- Refresh Token: 7-day expiry, signed with `JWT_REFRESH_SECRET` (different secret)
- Refresh tokens hashed (Argon2) before database storage
- Token rotation: issue new refresh token on every use
- Absolute time limit: 90-day hard session cap regardless of rotations
- Token family tracking for breach detection (reuse detection)
- On reuse of revoked token: revoke ALL tokens for the user

**Redis Blacklisting:**
- On logout, blacklist access token in Redis for remaining TTL
- JwtAuthGuard checks Redis blacklist on every request (sub-millisecond)
- Prevents stolen tokens from being used after logout

**Refresh Token Storage:**
- Store as HTTP-only, Secure, SameSite=Strict cookie on `/auth/refresh` path
- Access token returned in response body (stored in memory on frontend)
- Never store refresh token in localStorage

### 5.7 RBAC (Role-Based Access Control)

**Role Hierarchy:**
- `admin` > `merchant` > `buyer`
- Each role has a defined permission set
- Guards check role at controller or globally
- Use `@Roles('merchant')` decorator for endpoint-level control
- Use `@Public()` decorator to skip auth on specific routes

---

## 6. Recommended Folder Structure

### 6.1 Frontend Structure

```
frontend/
|-- public/
|   +-- locales/
|       |-- en/
|       |   |-- common.json
|       |   |-- auth.json
|       |   |-- products.json
|       |   +-- dashboard.json
|       |-- my/
|       |   |-- common.json
|       |   |-- auth.json
|       |   |-- products.json
|       |   +-- dashboard.json
|       +-- ja/
|           |-- common.json
|           |-- auth.json
|           |-- products.json
|           +-- dashboard.json
|-- src/
|   |-- api/
|   |   |-- generated/          # Generated API types (DO NOT EDIT)
|   |   +-- client.ts           # Axios instance + interceptors
|   |-- app/
|   |   |-- App.tsx
|   |   +-- routes.tsx
|   |-- components/
|   |   |-- ui/                 # shadcn/ui components
|   |   |   |-- button.tsx
|   |   |   |-- card.tsx
|   |   |   |-- dialog.tsx
|   |   |   |-- form.tsx
|   |   |   |-- input.tsx
|   |   |   |-- select.tsx
|   |   |   |-- skeleton.tsx
|   |   |   |-- table.tsx
|   |   |   |-- tabs.tsx
|   |   |   +-- ...
|   |   |-- layout/
|   |   |   |-- Header.tsx
|   |   |   |-- Footer.tsx
|   |   |   |-- Sidebar.tsx
|   |   |   |-- MainLayout.tsx
|   |   |   +-- DashboardLayout.tsx
|   |   |-- common/
|   |   |   |-- UserNav.tsx
|   |   |   |-- ThemeToggle.tsx
|   |   |   |-- LanguageToggle.tsx
|   |   |   |-- LoadingSpinner.tsx
|   |   |   +-- ErrorBoundary.tsx
|   |   +-- auth/
|   |       +-- ProtectedRoute.tsx
|   |-- features/
|   |   |-- auth/
|   |   |   |-- components/
|   |   |   |-- hooks/
|   |   |   |-- schemas/
|   |   |   +-- services/
|   |   |-- products/
|   |   |   |-- components/
|   |   |   |-- hooks/
|   |   |   |-- schemas/
|   |   |   +-- services/
|   |   |-- cart/
|   |   |-- checkout/
|   |   |-- skin-analysis/
|   |   |-- merchant/
|   |   +-- admin/
|   |-- hooks/
|   |   |-- useAuth.ts
|   |   +-- useDebounce.ts
|   |-- i18n/
|   |   +-- index.ts
|   |-- lib/
|   |   |-- api-client.ts
|   |   |-- constants.ts
|   |   +-- utils.ts
|   |-- pages/
|   |   |-- Home.tsx
|   |   |-- Login.tsx
|   |   |-- Register.tsx
|   |   |-- Profile.tsx
|   |   |-- Settings.tsx
|   |   |-- NotFound.tsx
|   |   |-- Unauthorized.tsx
|   |   |-- products/
|   |   |   |-- ProductList.tsx
|   |   |   |-- ProductDetail.tsx
|   |   |   +-- ProductSearch.tsx
|   |   |-- cart/
|   |   |   +-- Cart.tsx
|   |   |-- checkout/
|   |   |   +-- Checkout.tsx
|   |   |-- skin-analysis/
|   |   |   +-- SkinAnalysis.tsx
|   |   |-- merchant/
|   |   |   |-- Dashboard.tsx
|   |   |   |-- Products.tsx
|   |   |   |-- Promotions.tsx
|   |   |   +-- Analytics.tsx
|   |   +-- admin/
|   |       |-- Dashboard.tsx
|   |       |-- Users.tsx
|   |       |-- Merchants.tsx
|   |       +-- Analytics.tsx
|   |-- providers/
|   |   |-- QueryProvider.tsx
|   |   |-- ThemeProvider.tsx
|   |   |-- I18nProvider.tsx
|   |   +-- AuthProvider.tsx
|   |-- schemas/
|   |   +-- auth.schema.ts
|   |-- services/
|   |   |-- auth.service.ts
|   |   |-- product.service.ts
|   |   +-- queryKeys.ts
|   |-- types/
|   |   |-- index.ts
|   |   |-- auth.types.ts
|   |   +-- api.types.ts
|   |-- index.css
|   |-- main.tsx
|   +-- vite-env.d.ts
|-- index.html
|-- package.json
|-- tsconfig.json
|-- tsconfig.app.json
|-- vite.config.ts
+-- vitest.config.ts
```

### 6.2 Backend Structure

```
backend/
|-- prisma/
|   |-- schema.prisma
|   |-- seed.ts
|   +-- migrations/
|       +-- 20260801_000000_init/
|           +-- migration.sql
|-- src/
|   |-- main.ts
|   |-- app.module.ts
|   |-- common/
|   |   |-- decorators/
|   |   |   |-- roles.decorator.ts
|   |   |   |-- current-user.decorator.ts
|   |   |   +-- public.decorator.ts
|   |   |-- guards/
|   |   |   |-- jwt-auth.guard.ts
|   |   |   +-- roles.guard.ts
|   |   |-- filters/
|   |   |   +-- http-exception.filter.ts
|   |   |-- interceptors/
|   |   |   |-- logging.interceptor.ts
|   |   |   |-- transform.interceptor.ts
|   |   |   +-- timeout.interceptor.ts
|   |   |-- pipes/
|   |   |   +-- validation.pipe.ts
|   |   |-- dto/
|   |   |   +-- pagination.dto.ts
|   |   |-- interfaces/
|   |   |   +-- pagination-response.interface.ts
|   |   +-- utils/
|   |       +-- helpers.ts
|   |-- config/
|   |   |-- config.module.ts
|   |   |-- config.service.ts
|   |   +-- validation.ts
|   |-- modules/
|   |   |-- auth/
|   |   |   |-- auth.module.ts
|   |   |   |-- auth.controller.ts
|   |   |   |-- auth.service.ts
|   |   |   |-- strategies/
|   |   |   |   |-- jwt.strategy.ts
|   |   |   |   +-- jwt-refresh.strategy.ts
|   |   |   |-- guards/
|   |   |   |   +-- local-auth.guard.ts
|   |   |   |-- dto/
|   |   |   |   |-- login.dto.ts
|   |   |   |   |-- register.dto.ts
|   |   |   |   +-- refresh-token.dto.ts
|   |   |   +-- auth.spec.ts
|   |   |-- users/
|   |   |   |-- users.module.ts
|   |   |   |-- users.controller.ts
|   |   |   |-- users.service.ts
|   |   |   |-- dto/
|   |   |   +-- users.spec.ts
|   |   |-- merchants/
|   |   |   |-- merchants.module.ts
|   |   |   |-- merchants.controller.ts
|   |   |   |-- merchants.service.ts
|   |   |   |-- dto/
|   |   |   +-- merchants.spec.ts
|   |   |-- products/
|   |   |   |-- products.module.ts
|   |   |   |-- products.controller.ts
|   |   |   |-- products.service.ts
|   |   |   |-- dto/
|   |   |   +-- products.spec.ts
|   |   |-- categories/
|   |   |   +-- ...
|   |   |-- reviews/
|   |   |   +-- ...
|   |   |-- wishlist/
|   |   |   +-- ...
|   |   |-- cart/
|   |   |   +-- ...
|   |   |-- orders/
|   |   |   +-- ...
|   |   |-- promotions/
|   |   |   +-- ...
|   |   |-- advertisements/
|   |   |   +-- ...
|   |   |-- recommendations/
|   |   |   +-- ...
|   |   |-- analytics/
|   |   |   +-- ...
|   |   +-- admin/
|   |       +-- ...
|   |-- shared/
|   |   |-- shared.module.ts
|   |   |-- redis/
|   |   |   |-- redis.module.ts
|   |   |   +-- redis.service.ts
|   |   |-- prisma/
|   |   |   |-- prisma.module.ts
|   |   |   +-- prisma.service.ts
|   |   +-- mail/
|   |       +-- mail.module.ts
|   +-- core/
|       |-- core.module.ts
|       +-- database/
|           +-- database.module.ts
|-- test/
|   |-- jest-e2e.json
|   |-- setup.ts
|   |-- auth.e2e-spec.ts
|   |-- products.e2e-spec.ts
|   +-- helpers/
|       +-- create-test-app.ts
|-- .env
|-- .env.example
|-- .eslintrc.js
|-- nest-cli.json
|-- package.json
|-- tsconfig.json
|-- tsconfig.build.json
+-- vitest.config.ts
```

---

## 7. Authentication Architecture

### 7.1 Register Flow

1. Client sends `POST /api/v1/auth/register` with `{ name, email, password }`
2. Backend validates input via `RegisterDto` (class-validator)
3. Backend checks email uniqueness
4. Backend hashes password with Argon2
5. Backend creates user in PostgreSQL via Prisma
6. Backend generates access token (15min) + refresh token (7d)
7. Backend hashes refresh token, stores in `refresh_tokens` table
8. Backend sets refresh token as HTTP-only cookie on `/auth/refresh`
9. Backend returns access token in response body
10. Frontend stores access token in memory (variable, not localStorage)

### 7.2 Login Flow

1. Client sends `POST /api/v1/auth/login` with `{ email, password }`
2. Backend validates credentials against stored Argon2 hash
3. Backend generates new token pair
4. Backend creates session record with device info (User-Agent parsing)
5. Backend returns access token; sets refresh token cookie

### 7.3 Logout Flow

1. Client sends `POST /api/v1/auth/logout`
2. Backend verifies access token, calculates remaining TTL
3. Backend adds access token to Redis blacklist for remaining TTL
4. Backend revokes refresh token in database
5. Backend clears refresh token cookie
6. Frontend clears access token from memory, redirects to login

### 7.4 Refresh Token Flow

1. Client sends `POST /api/v1/auth/refresh` (refresh token sent via HTTP-only cookie)
2. Backend verifies refresh token signature with `JWT_REFRESH_SECRET`
3. Backend checks token exists in database and is not revoked
4. Backend validates token family (detect reuse of revoked token)
5. Backend revokes old refresh token
6. Backend issues new access token + new refresh token
7. Backend updates session record
8. If reuse detected: revoke ALL user tokens, return 401

### 7.5 Token Verification

1. `JwtAuthGuard` extracts token from `Authorization: Bearer <token>` header
2. Verifies signature and expiry with `JWT_ACCESS_SECRET`
3. Checks Redis blacklist (`BLACKLIST:{jti}` key exists -> deny)
4. Attaches decoded payload to `request.user`
5. `RolesGuard` checks `request.user.role` against `@Roles()` decorator

### 7.6 Password Reset (Ready)

- Endpoint: `POST /api/v1/auth/forgot-password` -- sends reset email with time-limited token
- Endpoint: `POST /api/v1/auth/reset-password` -- validates token, updates password
- Token stored hashed in `password_resets` table with 1-hour TTL
- Frontend pages: `/forgot-password`, `/reset-password`

---

## 8. User Roles & Permissions

### Role Definitions

| Role | Description | Permissions |
|------|-------------|-------------|
| `buyer` | End user purchasing products | Browse products, AI skin analysis, add to cart, checkout, write reviews, manage wishlist, view orders, manage profile |
| `merchant` | Seller on the platform | All buyer permissions + manage products, manage inventory, manage shop profile, create promotions/coupons, view sales analytics, manage advertisements |
| `admin` | Platform administrator | All permissions + user management, merchant management, review moderation, content moderation, analytics & reports, revenue management, commission management |

### Permission Matrix (Backend)

```typescript
const PERMISSIONS = {
  buyer: [
    'products:read',
    'cart:read', 'cart:write',
    'orders:read',
    'reviews:read', 'reviews:write',
    'wishlist:read', 'wishlist:write',
    'profile:read', 'profile:write',
    'skin-analysis:create',
  ],
  merchant: [
    'products:read', 'products:write',
    'inventory:read', 'inventory:write',
    'shop:read', 'shop:write',
    'promotions:read', 'promotions:write',
    'coupons:read', 'coupons:write',
    'advertisements:read', 'advertisements:write',
    'analytics:read',
  ],
  admin: [
    'users:read', 'users:write', 'users:delete',
    'merchants:read', 'merchants:write', 'merchants:approve',
    'reviews:read', 'reviews:moderate',
    'content:read', 'content:moderate',
    'analytics:read',
    'revenue:read',
    'commissions:read', 'commissions:write',
    'settings:read', 'settings:write',
  ],
};
```

### Frontend Role Handling

- `ProtectedRoute` component accepts `roles?: string[]` prop
- Routes protected by role: `/dashboard/*` requires `merchant` or `admin`
- Admin routes: `/admin/*` requires `admin` role
- UI conditionally renders based on `user.role` (e.g., show "Merchant Dashboard" link only for merchants)

---

## 9. API Versioning Strategy

### URI-Based Versioning

- Base path: `/api/v1`
- Version in URL: `/api/v1/products`, `/api/v1/users`
- Major version bump for breaking changes: `/api/v2/products`

### Versioning Rules

- New features added to current version by default
- Breaking changes require new version
- Deprecated versions supported for minimum 6 months
- Version header optional: `Accept-Version: v1`
- Swagger documentation tagged per version

### Implementation

```typescript
// main.ts
app.setGlobalPrefix('api/v1');

// Or use @nestjs/swagger versioning
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'api/v',
  defaultVersion: '1',
});
```

---

## 10. Validation Strategy

### Backend Validation (class-validator + NestJS)

**Global ValidationPipe Configuration:**
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,           // Strip unknown properties
  forbidNonWhitelisted: true, // Throw on unknown properties
  transform: true,           // Auto-transform payloads to DTO instances
  transformOptions: {
    enableImplicitConversion: true,
  },
}));
```

**DTO Standards:**
- All DTOs use class-validator decorators
- DTOs define API contract, separate from Prisma entities
- Nested validation for complex objects
- Custom validators for domain-specific rules (e.g., valid SKU format)

### Frontend Validation (Zod)

- Zod schemas for form validation (React Hook Form via `zodResolver`)
- Zod schemas for API response validation (runtime type safety)
- Schemas colocated with features: `features/auth/schemas/auth.schema.ts`
- Shared schemas between frontend and backend where applicable

### Validation Layers

```
Frontend (Zod) -> API Client (Zod runtime check) -> Backend DTO (class-validator) -> Prisma (DB constraints)
```

---

## 11. Error Handling Strategy

### Backend Error Response Format

```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than 8 characters"],
  "error": "Bad Request",
  "timestamp": "2026-08-01T12:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

### Exception Filter

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : { message: 'Internal server error' };

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'string' ? message : (message as any).message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Frontend Error Handling

- TanStack Query `onError` callbacks for mutation errors
- Global error toast via Sonner for background refetch errors
- Error boundaries at route level for rendering errors
- API client interceptor handles 401 (redirect to login) and 500 (generic message)
- Structured error types: `type ApiError = { statusCode: number; message: string | string[]; error: string }`

---

## 12. Localization Architecture

### Supported Languages

| Code | Language | Direction |
|------|----------|-----------|
| `en` | English | LTR |
| `my` | Myanmar (Burmese) | LTR |
| `ja` | Japanese | LTR |

### Implementation

- **Backend**: `i18next` for API response localization (error messages, notifications)
- **Frontend**: `react-i18next` for UI text localization
- **Translation files**: `public/locales/{lang}/{namespace}.json`
- **Namespaces**: `common`, `auth`, `products`, `dashboard`, `errors`
- **Language detection**: `i18next-browser-languagedetector` (localStorage -> browser language -> default)
- **Language toggle**: Header component, persisted in localStorage

### Translation Key Convention

```json
{
  "nav": {
    "home": "Home",
    "products": "Products",
    "cart": "Cart"
  },
  "auth": {
    "login": {
      "title": "Sign In",
      "email": "Email Address",
      "password": "Password",
      "submit": "Sign In"
    }
  }
}
```

### API Response Localization

- Backend error messages returned as keys: `{ message: "auth.invalid_credentials" }`
- Frontend resolves keys to localized strings
- Accept-Language header sent with requests for server-side localization

---

## 13. Theme Architecture

### Implementation

- `next-themes` library with class-based toggle
- Three modes: Light, Dark, System (follows OS preference)
- Theme persisted in localStorage
- CSS variables on `:root` (light) and `.dark` (dark)

### CSS Variable System (shadcn/ui) - Luxury Cosmetics Theme

```css
:root {
  --background: 0 0% 100%;           /* #FFFFFF White */
  --foreground: 240 6% 10%;          /* #18181B Near-black */
  --primary: 263 83% 64%;            /* #7C3AED Luxury Purple */
  --primary-foreground: 0 0% 100%;   /* #FFFFFF White */
  --secondary: 270 100% 96%;         /* #F3E8FF Soft Lavender */
  --muted: 270 100% 97%;             /* #F8F4FF Light Lavender */
  --muted-foreground: 220 9% 46%;    /* #6B7280 Gray */
  --accent: 330 81% 60%;             /* #EC4899 Beauty Pink */
  --destructive: 0 84% 60%;          /* #EF4444 Red */
  --border: 220 13% 91%;             /* #E5E7EB Light Gray */
  --ring: 263 83% 64%;               /* #7C3AED Luxury Purple */
}

.dark {
  --background: 240 6% 10%;          /* #18181B Near-black */
  --foreground: 0 0% 100%;           /* #FFFFFF White */
  --primary: 263 83% 64%;            /* #7C3AED Luxury Purple */
  --primary-foreground: 0 0% 100%;   /* #FFFFFF White */
  --secondary: 270 50% 20%;          /* #2D1B4E Dark Lavender */
  --muted: 270 40% 12%;              /* #1F1529 Very Dark Purple */
  --muted-foreground: 220 9% 60%;    /* #9CA3AF Light Gray */
  --accent: 330 81% 60%;             /* #EC4899 Beauty Pink */
  --destructive: 0 84% 60%;          /* #EF4444 Red */
  --border: 220 13% 30%;             /* #374151 Dark Gray */
  --ring: 263 83% 64%;               /* #7C3AED Luxury Purple */
}
```

### Tailwind Integration

- Use semantic tokens in Tailwind: `bg-background`, `text-foreground`, `bg-primary`, `bg-secondary`, `bg-accent`
- Never use raw color values: `bg-white dark:bg-gray-950` -> use `bg-background`
- No manual `dark:` overrides on shadcn components
- Brand colors: Primary Purple (#7C3AED), Accent Pink (#EC4899), Secondary Lavender (#F3E8FF)
- Use `bg-primary` for main buttons, `bg-accent` for promotional elements, `bg-secondary` for card backgrounds

---

## 14. Redis Usage Strategy

### Session Management

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `session:{userId}:{sessionId}` | 30 days | User session data |
| `session:{userId}:{sessionId}:sliding` | 30 days (refreshed on access) | Sliding expiration |

### Token Blacklisting

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `blacklist:{jti}` | Time until token expiry | Prevent use of revoked access tokens |
| `refresh:blacklist:{jti}` | 7 days | Prevent use of revoked refresh tokens |

### API Caching

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `cache:product:{id}` | 5 minutes | Product detail cache |
| `cache:products:list:{hash}` | 2 minutes | Product list with filters |
| `cache:categories` | 30 minutes | Category tree (rarely changes) |
| `cache:shop:{id}` | 10 minutes | Shop profile |
| `cache:user:{id}` | 5 minutes | User profile |

### Rate Limiting

| Key Pattern | Algorithm | Limit | Window |
|-------------|-----------|-------|--------|
| `rate:api:{ip}` | Sliding window | 100 requests | 60 seconds |
| `rate:auth:{ip}` | Fixed window | 5 attempts | 300 seconds |
| `rate:auth:{email}` | Fixed window | 5 attempts | 300 seconds |
| `rate:upload:{userId}` | Token bucket | 10 files | 60 seconds |

### Lua Script for Atomic Rate Limiting

```lua
-- sliding_window.lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local window_start = now - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
  redis.call('EXPIRE', key, window)
  return {1, limit - count - 1}
else
  return {0, 0}
end
```

---

## 15. PostgreSQL Architecture

### Core Tables

#### User Management

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'buyer'
    CHECK (role IN ('buyer', 'merchant', 'admin')),
  avatar_url TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  family VARCHAR(255) NOT NULL,
  device_info JSONB,
  ip_address INET,
  is_revoked BOOLEAN DEFAULT false,
  absolute_limit_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Product Management

```sql
-- Categories (self-referencing for nested categories)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  sku VARCHAR(100) UNIQUE,
  stock_quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  images TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  skin_types TEXT[] DEFAULT '{}',
  ingredients TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Indexes
CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_search ON products USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);
```

#### Reviews

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  body TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### Orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'confirmed', 'processing',
      'shipped', 'delivered', 'cancelled', 'refunded'
    )),
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  merchant_id UUID NOT NULL REFERENCES users(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL
);
```

#### Wishlist

```sql
CREATE TABLE wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

#### Promotions

```sql
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2),
  max_uses INT,
  used_count INT DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 16. Prisma Design Standards

### Schema Naming

- Models: PascalCase, singular (`Product`, `OrderItem`)
- Fields: camelCase (`createdAt`, `userId`)
- Map to snake_case tables: `@@map("products")`, `@map("created_at")`
- Enums: PascalCase (`UserRole`, `OrderStatus`)

### ID Strategy

```prisma
model Product {
  id String @id @default(cuid())
  // Or for time-ordered distributed IDs:
  // id String @id @default(uuid())
}
```

### Relations

- Always declare both sides of a relation
- Always specify `onDelete` explicitly (never rely on defaults)
- Use `Restrict` for parent records that must not be deleted with children
- Use `Cascade` for child records subordinate to parent (e.g., order_items -> orders)
- Use `SetNull` for optional relationships (e.g., category parent)

### Indexes

- `@@index([field])` on every FK column
- `@@index([field1, field2])` for composite queries
- Partial indexes for common conditions: `@@index([createdAt], where: "deletedAt IS NULL")`
- Full-text search indexes via raw SQL

### Transactions

```typescript
// Use $transaction for multi-step writes
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.orderItem.createMany({
    data: items.map(i => ({ ...i, orderId: order.id })),
  });
  await tx.product.updateMany({
    where: { id: { in: productIds } },
    data: { stockQuantity: { decrement: 1 } },
  });
});
```

### Generated Types

```typescript
// Use Prisma-generated types instead of hand-written interfaces
import type { Prisma } from '../generated/prisma/client';

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { category: true; merchant: { select: { name: true } } };
}>;
```

---

## 17. Frontend Pages

### Buyer Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Featured products, promotions, categories, hero section |
| `/login` | Login | Email/password login form |
| `/register` | Register | Registration form |
| `/profile` | Profile | User profile, order history, settings |
| `/skin-analysis` | Skin Analysis | Upload photo, AI analysis results, recommendations |
| `/recommendations` | Recommendations | Personalized product suggestions |
| `/products` | Product Search | Search with filters (category, price, skin type, rating) |
| `/products/:slug` | Product Detail | Product images, description, reviews, add to cart |
| `/wishlist` | Wishlist | Saved products |
| `/cart` | Cart | Cart items, quantity update, promo code |
| `/checkout` | Checkout | Shipping address, payment, order summary |
| `/shop-finder` | Shop Finder | GPS-based nearby shops map view |

### Merchant Pages

| Route | Page | Description |
|-------|------|-------------|
| `/merchant/dashboard` | Dashboard | Sales overview, recent orders, key metrics |
| `/merchant/products` | Product Management | CRUD for products with inventory |
| `/merchant/products/new` | Add Product | Product creation form |
| `/merchant/products/:id/edit` | Edit Product | Product editing form |
| `/merchant/promotions` | Promotions | Create/manage promotions and coupons |
| `/merchant/advertisements` | Advertisements | Manage shop ads |
| `/merchant/analytics` | Analytics | Sales reports, product performance |

### Admin Pages

| Route | Page | Description |
|-------|------|-------------|
| `/admin/dashboard` | Dashboard | Platform metrics, user growth, revenue |
| `/admin/users` | User Management | View/disable users |
| `/admin/merchants` | Merchant Management | Approve/reject merchants |
| `/admin/reviews` | Review Moderation | Approve/reject/flag reviews |
| `/admin/analytics` | Analytics | Platform-wide reports |
| `/admin/revenue` | Revenue | Revenue reports, commission tracking |

---

## 18. API Modules

### Auth Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/register` | POST | Public | Register new user |
| `/api/v1/auth/login` | POST | Public | Login |
| `/api/v1/auth/refresh` | POST | Public (cookie) | Refresh access token |
| `/api/v1/auth/logout` | POST | Protected | Logout |
| `/api/v1/auth/verify` | GET | Protected | Verify token, return user |
| `/api/v1/auth/forgot-password` | POST | Public | Request password reset |
| `/api/v1/auth/reset-password` | POST | Public | Reset password with token |

### User Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/users/me` | GET | Protected | Get current user profile |
| `/api/v1/users/me` | PATCH | Protected | Update profile |
| `/api/v1/users/me/avatar` | POST | Protected | Upload avatar |
| `/api/v1/users/me/password` | PATCH | Protected | Change password |

### Merchant Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/merchants` | GET | Admin | List all merchants |
| `/api/v1/merchants/:id` | GET | Public | Get merchant profile |
| `/api/v1/merchants/:id/approve` | POST | Admin | Approve merchant |
| `/api/v1/merchants/:id/reject` | POST | Admin | Reject merchant |
| `/api/v1/merchants/shop` | GET | Merchant | Get own shop profile |
| `/api/v1/merchants/shop` | PATCH | Merchant | Update shop profile |

### Product Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/products` | GET | Public | List products (filter, search, paginate) |
| `/api/v1/products/:slug` | GET | Public | Get product detail |
| `/api/v1/products` | POST | Merchant | Create product |
| `/api/v1/products/:id` | PATCH | Merchant | Update product |
| `/api/v1/products/:id` | DELETE | Merchant | Delete product |
| `/api/v1/products/:id/stock` | PATCH | Merchant | Update stock |

### Recommendation Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/recommendations/skin-analysis` | POST | Protected | Submit skin analysis |
| `/api/v1/recommendations/personalized` | GET | Protected | Get personalized recommendations |
| `/api/v1/recommendations/similar/:productId` | GET | Public | Get similar products |

### Wishlist Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/wishlist` | GET | Protected | Get user wishlist |
| `/api/v1/wishlist/:productId` | POST | Protected | Add to wishlist |
| `/api/v1/wishlist/:productId` | DELETE | Protected | Remove from wishlist |

### Cart Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/cart` | GET | Protected | Get cart contents |
| `/api/v1/cart/items` | POST | Protected | Add item to cart |
| `/api/v1/cart/items/:id` | PATCH | Protected | Update quantity |
| `/api/v1/cart/items/:id` | DELETE | Protected | Remove item |
| `/api/v1/cart/promo` | POST | Protected | Apply promo code |

### Order Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/orders` | POST | Protected | Create order from cart |
| `/api/v1/orders` | GET | Protected | List user orders |
| `/api/v1/orders/:id` | GET | Protected | Get order detail |
| `/api/v1/orders/:id/cancel` | POST | Protected | Cancel order |

### Review Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/products/:productId/reviews` | GET | Public | List product reviews |
| `/api/v1/products/:productId/reviews` | POST | Protected | Create review |
| `/api/v1/reviews/:id` | PATCH | Owner | Update review |
| `/api/v1/reviews/:id` | DELETE | Owner/Admin | Delete review |

### Promotion Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/promotions` | POST | Merchant | Create promotion |
| `/api/v1/promotions` | GET | Merchant | List own promotions |
| `/api/v1/promotions/:id` | PATCH | Merchant | Update promotion |
| `/api/v1/promotions/:id` | DELETE | Merchant | Delete promotion |
| `/api/v1/promotions/validate` | POST | Protected | Validate promo code |

### Advertisement Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/ads` | POST | Merchant | Create advertisement |
| `/api/v1/ads` | GET | Merchant | List own ads |
| `/api/v1/ads/:id` | PATCH | Merchant | Update ad |
| `/api/v1/ads/:id` | DELETE | Merchant | Delete ad |
| `/api/v1/ads/active` | GET | Public | Get active ads |

### Analytics Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/analytics/merchant/dashboard` | GET | Merchant | Merchant dashboard stats |
| `/api/v1/analytics/merchant/sales` | GET | Merchant | Sales reports |
| `/api/v1/analytics/merchant/products` | GET | Merchant | Product performance |
| `/api/v1/analytics/admin/dashboard` | GET | Admin | Platform dashboard |
| `/api/v1/analytics/admin/revenue` | GET | Admin | Revenue reports |
| `/api/v1/analytics/admin/users` | GET | Admin | User growth analytics |

### Admin Module

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/admin/users` | GET | Admin | List all users |
| `/api/v1/admin/users/:id/status` | PATCH | Admin | Enable/disable user |
| `/api/v1/admin/merchants` | GET | Admin | List all merchants |
| `/api/v1/admin/merchants/:id/status` | PATCH | Admin | Approve/reject merchant |
| `/api/v1/admin/reviews/pending` | GET | Admin | Pending reviews |
| `/api/v1/admin/reviews/:id/moderate` | POST | Admin | Moderate review |
| `/api/v1/admin/content/pending` | GET | Admin | Pending content |
| `/api/v1/admin/content/:id/moderate` | POST | Admin | Moderate content |

---

## 19. Security Best Practices

### Authentication Security

- Argon2 for password hashing (memory-hard, GPU-resistant)
- Different secrets for access and refresh tokens
- Refresh token rotation on every use
- Token family tracking for breach detection
- Absolute session time limit (90 days)
- HTTP-only, Secure, SameSite=Strict cookies for refresh tokens
- Access tokens stored in memory only (not localStorage)

### API Security

- CORS configured with specific allowed origins
- Rate limiting on all endpoints (stricter on auth endpoints)
- Request size limits (e.g., 10MB for file uploads)
- Input validation at every layer (frontend Zod -> backend class-validator -> Prisma)
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via React auto-escaping + Content-Security-Policy headers
- CSRF protection via SameSite cookies + CSRF token for state-changing operations
- Helmet.js for HTTP security headers

### Data Security

- Never log passwords, tokens, or sensitive PII
- Environment variables for all secrets (never in code)
- Database connection strings in environment variables
- Encrypted connections (TLS) to PostgreSQL and Redis
- Sensitive fields excluded from API responses (`@Exclude()` on password hash)

### Infrastructure Security

- HTTPS in production (TLS termination at load balancer)
- Redis authentication enabled
- PostgreSQL with role-based access (separate read/write users)
- Non-root container execution
- Regular dependency auditing (`npm audit`)

---

## 20. Accessibility Standards

### WCAG 2.1 AA Compliance

- Semantic HTML elements (`<main>`, `<article>`, `<nav>`, `<header>`, `<footer>`)
- All interactive elements keyboard accessible (Tab, Enter, Space, Escape, Arrow keys)
- Focus visible indicators on all focusable elements
- Skip-to-main-content link
- Color contrast ratio minimum 4.5:1 for normal text, 3:1 for large text
- All images have descriptive `alt` text
- Form inputs have associated `<label>` elements
- Error messages linked to inputs via `aria-describedby`
- ARIA labels on icon-only buttons
- `role` and `aria-*` attributes on custom interactive elements

### shadcn/ui Accessibility

- Radix UI primitives handle focus trapping, keyboard navigation, ARIA
- Never remove `aria-*` props from components
- Dialog/Sheet always has accessible title
- Dropdown menus fully keyboard navigable
- Tabs support arrow key navigation
- Form validation uses `aria-invalid` and `aria-describedby`

### Testing

- Automated accessibility checks with `@axe-core/react` in development
- Manual keyboard navigation testing for all interactive flows
- Screen reader testing for critical flows (NVDA/VoiceOver)

---

## 21. Testing Strategy

### Frontend Testing (Vitest + React Testing Library)

| Test Type | Tool | Target | Coverage Goal |
|-----------|------|--------|---------------|
| Unit | Vitest | Utility functions, hooks, services | 80%+ |
| Component | Vitest + RTL | Component render + interaction | Critical paths |
| Integration | Vitest + RTL | Feature flows (auth, cart, checkout) | Key features |
| E2E | Playwright | Critical user journeys | Major flows |

### Backend Testing (Jest + Supertest)

| Test Type | Tool | Target | Coverage Goal |
|-----------|------|--------|---------------|
| Unit | Jest | Services, utilities, strategies | 80%+ |
| Integration | Jest + Supertest | Controller -> Service -> Prisma | All endpoints |
| E2E | Jest + Supertest | Full HTTP request lifecycle | Critical paths |

### Testing Principles

- Test behavior, not implementation
- Prefer integration tests over unit tests with heavy mocking
- Use fakes over mocks when possible (realistic test doubles)
- Mock external services (email, payment, AI), not internal logic
- Use real test database for e2e tests (Docker containers)
- Clear test state between tests (truncate tables or use transactions)
- Tests colocated with source files: `*.spec.ts` next to `*.ts`

---

## 22. Required Unit Tests

### Backend Unit Tests

```
auth.service.ts
  |-- register: creates user with hashed password
  |-- register: throws on duplicate email
  |-- login: returns tokens for valid credentials
  |-- login: throws on invalid credentials
  |-- generateTokens: creates access + refresh tokens
  +-- verifyRefreshToken: validates and rotates token

users.service.ts
  |-- findById: returns user when found
  |-- findById: throws NotFoundException when not found
  |-- updateProfile: updates user fields
  +-- updatePassword: hashes and saves new password

products.service.ts
  |-- create: creates product with valid data
  |-- findAll: returns paginated products with filters
  |-- findBySlug: returns product with relations
  |-- update: updates product fields
  |-- delete: soft-deletes product
  +-- updateStock: decrements stock atomically

orders.service.ts
  |-- create: creates order from cart items
  |-- create: decrements product stock
  |-- create: throws on insufficient stock
  +-- findByUser: returns user orders

promotions.service.ts
  |-- create: creates promotion with valid dates
  |-- validate: applies percentage discount
  |-- validate: applies fixed discount
  |-- validate: throws on expired promotion
  +-- validate: throws on max uses exceeded
```

### Frontend Unit Tests

```
utils.ts
  |-- cn: merges class names correctly
  |-- formatCurrency: formats price with currency symbol
  +-- formatDate: formats date string

hooks
  |-- useAuth: provides auth context values
  +-- useDebounce: debounces value changes

services
  |-- authService.login: sends correct API request
  |-- authService.register: sends correct API request
  +-- queryKeys: generates correct key hierarchy

schemas
  |-- loginSchema: validates valid login data
  |-- loginSchema: rejects invalid email
  |-- loginSchema: rejects short password
  +-- registerSchema: validates matching passwords
```

---

## 23. Required Integration Tests

### Backend Integration Tests

```
Auth (e2e)
  |-- POST /auth/register: creates user and returns tokens
  |-- POST /auth/register: returns 400 for invalid data
  |-- POST /auth/login: returns tokens for valid credentials
  |-- POST /auth/login: returns 401 for invalid credentials
  |-- POST /auth/refresh: rotates refresh token
  |-- POST /auth/refresh: returns 401 for revoked token
  |-- POST /auth/logout: blacklists access token
  +-- GET /auth/verify: returns user for valid token

Products (e2e)
  |-- GET /products: returns paginated products
  |-- GET /products: filters by category
  |-- GET /products: searches by name
  |-- GET /products/:slug: returns product detail
  |-- POST /products: creates product (merchant auth)
  |-- POST /products: returns 401 without auth
  |-- POST /products: returns 403 for buyer role
  |-- PATCH /products/:id: updates product
  +-- DELETE /products/:id: soft-deletes product

Orders (e2e)
  |-- POST /orders: creates order from cart
  |-- POST /orders: returns 401 without auth
  |-- GET /orders: returns user orders
  +-- POST /orders/:id/cancel: cancels pending order

Admin (e2e)
  |-- GET /admin/users: returns 403 for non-admin
  |-- GET /admin/users: returns user list for admin
  |-- PATCH /admin/merchants/:id/status: approves merchant
  +-- GET /admin/reviews/pending: returns pending reviews
```

### Frontend Integration Tests

```
Auth Flow
  |-- Login form submits and redirects to home
  |-- Register form creates account and logs in
  |-- Protected route redirects to login when unauthenticated
  +-- Logout clears auth state and redirects

Product Flow
  |-- Product list loads with filters
  |-- Product detail shows reviews and add-to-cart
  |-- Search returns filtered results
  +-- Category navigation filters products

Cart Flow
  |-- Add to cart updates cart count
  |-- Update quantity changes item total
  |-- Remove item updates cart
  +-- Promo code applies discount

Checkout Flow
  |-- Checkout shows order summary
  |-- Submit order creates order and clears cart
  +-- Order confirmation shows order details
```

---

## 24. Performance Optimization Strategy

### Frontend Performance

- **Code Splitting**: Route-based lazy loading via `React.lazy()` + `Suspense`
- **Image Optimization**: WebP/AVIF format, responsive `srcset`, lazy loading (`loading="lazy"`)
- **Bundle Analysis**: Regular `vite-bundle-visualizer` runs to identify bloat
- **Core Web Vitals Targets**: LCP < 2.5s, INP < 200ms, CLS < 0.1
- **Font Optimization**: `font-display: swap` for web fonts
- **Virtualization**: Use `@tanstack/react-virtual` for long lists (100+ items)
- **Prefetching**: Hover-based prefetch on product cards via `queryClient.prefetchQuery`
- **Pagination**: Use `placeholderData: keepPreviousData` to prevent flicker

### Backend Performance

- **Database Indexing**: Indexes on all FK columns, search fields, and filter columns
- **Query Optimization**: Use `select` to fetch only needed fields
- **Connection Pooling**: PgBouncer or Prisma Accelerate for PostgreSQL
- **Redis Caching**: Cache frequently-accessed data (products, categories, user profiles)
- **Response Compression**: Enable gzip/brotli compression
- **Request Timeout**: 30-second timeout on API requests
- **N+1 Prevention**: Use Prisma `include`/`select` with relation joins

### Redis Performance

- Set `maxmemory` with `allkeys-lru` eviction
- Use Redis pipelines for batch operations
- Use Lua scripts for atomic multi-step operations
- Monitor `memory_fragmentation_ratio` and `keyspace_misses`
- Separate Redis instances for cache vs. session vs. queue in production

---

## 25. Production Readiness Checklist

### Backend

- [ ] Environment variables validated at startup (fail fast)
- [ ] Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`
- [ ] Global exception filter returning structured errors
- [ ] Rate limiting on all endpoints
- [ ] CORS configured with specific origins
- [ ] Helmet.js for security headers
- [ ] Request logging (structured JSON format)
- [ ] Health check endpoint (`GET /health`)
- [ ] Graceful shutdown handling (SIGTERM, SIGINT)
- [ ] Database connection pooling configured
- [ ] Redis connection pooling configured
- [ ] JWT secrets in environment variables (not in code)
- [ ] Prisma migrations committed and version-controlled
- [ ] Swagger/OpenAPI documentation generated
- [ ] Test coverage >= 80%

### Frontend

- [ ] `tsc --noEmit` passes without errors
- [ ] ESLint passes without warnings
- [ ] All routes lazy-loaded
- [ ] Environment variables validated at build time
- [ ] Error boundaries on critical sections
- [ ] Loading states for all async operations
- [ ] Accessibility audit (Lighthouse >= 90)
- [ ] Bundle size analyzed and optimized
- [ ] Responsive design verified on mobile/tablet/desktop
- [ ] Dark/light mode working correctly
- [ ] i18n working for EN, MY, and JA
- [ ] Test coverage >= 80%

### Infrastructure

- [ ] HTTPS enabled (TLS termination)
- [ ] Database backups configured (automated daily)
- [ ] Redis persistence enabled (RDB + AOF)
- [ ] Redis maxmemory configured with eviction policy
- [ ] PostgreSQL max_connections tuned
- [ ] Monitoring alerts configured (memory, CPU, connections)
- [ ] Log aggregation configured
- [ ] CI/CD pipeline running tests and linting

---

## 26. Deployment Considerations

### Docker

```dockerfile
# Multi-stage build for backend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 8080
CMD ["node", "dist/main.js"]
```

### Environment Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Access token signing secret | (random 64-char string) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | (random 64-char string) |
| `CORS_ORIGIN` | Allowed CORS origins | `https://app.example.com` |
| `VITE_API_BASE_URL` | Frontend API base URL | `https://api.example.com/api/v1` |

### Database

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, Neon, Supabase)
- Enable automated backups with point-in-time recovery
- Use read replicas for read-heavy operations
- Connection pooling via PgBouncer or built-in pooler

### Redis

- Use managed Redis (AWS ElastiCache, Redis Cloud, Upstash)
- Enable persistence for session data
- Configure eviction policy based on use case
- Monitor memory usage and set alerts

---

## 27. CI/CD Readiness

### Pipeline Stages

```
1. Lint & Format
   |-- Frontend: ESLint + Prettier
   +-- Backend: ESLint + Prettier

2. Type Check
   |-- Frontend: tsc --noEmit
   +-- Backend: tsc --noEmit

3. Unit Tests
   |-- Frontend: vitest run
   +-- Backend: jest run

4. Integration Tests
   |-- Frontend: vitest run --coverage
   +-- Backend: jest run --coverage

5. Build
   |-- Frontend: vite build
   +-- Backend: nest build

6. E2E Tests (on preview deployment)
   |-- Frontend: playwright test
   +-- Backend: jest --config jest-e2e.json

7. Deploy (on merge to main)
   |-- Frontend: Vercel / Cloudflare Pages / AWS Amplify
   +-- Backend: Docker -> AWS ECS / Google Cloud Run / Railway
```

### Quality Gates

- Zero ESLint errors
- Zero TypeScript errors
- Test coverage >= 80%
- Build succeeds
- Lighthouse performance score >= 90
- No critical security vulnerabilities (`npm audit`)

---

## 28. Monitoring & Logging Strategy

### Logging

- **Structured JSON logging** (Pino or Winston wrapped as NestJS provider)
- Log levels: `error`, `warn`, `info`, `debug`, `trace`
- Never log passwords, tokens, or PII
- Request/response logging with correlation IDs
- Error logging with stack traces

### Monitoring Metrics

| Metric | Alert Threshold |
|--------|----------------|
| API response time (p95) | > 500ms |
| API error rate | > 1% |
| Database connection pool usage | > 80% |
| Redis memory usage | > 80% |
| Redis eviction rate | > 0 |
| CPU usage | > 80% for 5 minutes |
| Memory usage | > 85% |

### Health Check

```typescript
// GET /health
{
  "status": "ok",
  "timestamp": "2026-08-01T12:00:00.000Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### Observability Stack (Recommended)

- **Logging**: Pino -> stdout -> aggregated by Datadog/Grafana Loki/CloudWatch
- **Metrics**: Prometheus metrics endpoint -> Grafana dashboards
- **Tracing**: OpenTelemetry -> Jaeger/Grafana Tempo
- **Error Tracking**: Sentry or similar
- **Uptime Monitoring**: External health check service (Pingdom, BetterStack)

---

## 29. Future Expansion Strategy

### AI Recommendation Engine

- **Phase 1**: Rule-based recommendations (skin type x product attributes)
- **Phase 2**: Collaborative filtering (users who bought X also bought Y)
- **Phase 3**: ML model (TensorFlow.js or Python microservice via API)
- Integration point: `POST /api/v1/recommendations/personalized`

### AI Skin Detection Service

- **Architecture**: Separate microservice (Python + TensorFlow/PyTorch)
- **API**: `POST /api/v1/ai/analyze-skin` -> returns skin analysis results
- **Models**: Acne detection, skin type classification, wrinkle analysis
- **Processing**: Image preprocessing -> model inference -> result formatting
- **Integration**: Frontend sends photo -> backend proxies to AI service -> returns results

### Image Processing

- Use Sharp (Node.js) for server-side image resizing/format conversion
- CDN for image delivery (CloudFront, Cloudflare)
- Multiple resolutions: thumbnail (150px), medium (600px), full (1200px)
- WebP/AVIF conversion for modern browsers
- Lazy loading with blur-up placeholder

### Notification System

- **Email**: SendGrid, AWS SES, or Resend
- **Push Notifications**: Firebase Cloud Messaging (web + mobile)
- **In-App**: WebSocket connection for real-time notifications
- **SMS**: Twilio for order updates (optional)

### Email Service

- Transactional emails: welcome, password reset, order confirmation, shipping updates
- Marketing emails: promotions, newsletters (opt-in only)
- Template engine: MJML or React Email for responsive templates

### Mobile App Integration

- REST API is already mobile-ready (JWT auth, versioned endpoints)
- Consider React Native for cross-platform mobile app
- Shared types via OpenAPI spec + code generation
- Push notification integration via Firebase

### Multi-Vendor Expansion

- Already architected with merchant role
- Add marketplace features: seller ratings, comparison, multi-seller checkout
- Commission system per merchant
- Merchant analytics dashboard

### Multi-Language Expansion

- Add more languages via i18next translation files
- RTL support for Arabic/Hebrew (CSS logical properties)
- Locale-aware date/number formatting via `Intl` API
- Backend error message localization via Accept-Language header

### Microservice Migration

- **When**: When team size exceeds 10+ developers or specific modules need independent scaling
- **How**: NestJS microservices with TCP/Redis transport
- **Split candidates**: AI service, notification service, payment service, analytics service
- **Shared**: Common DTOs in `libs/` package, shared types
- **Communication**: Redis Streams or NATS for event-driven messaging
- **Service Discovery**: Consul or built-in NestJS microservice discovery

---

## Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend Framework | NestJS v11 | Modular, testable, TypeScript-native |
| ORM | Prisma v7 | Type-safe, migration-first, PostgreSQL-optimized |
| Database | PostgreSQL | ACID, JSONB, full-text search, proven at scale |
| Cache | Redis v7 | Sub-millisecond reads, session management, rate limiting |
| Auth | JWT + Refresh Rotation | Stateless access, stateful refresh, breach detection |
| Frontend | React 19 + Vite 8 | Fast builds, modern React features |
| Forms | React Hook Form + Zod | Minimal re-renders, schema validation |
| UI | shadcn/ui + Tailwind v4 | Accessible, composable, no vendor lock-in |
| Data Fetching | TanStack Query v5 | Caching, background sync, optimistic updates |
| API Style | REST + OpenAPI | Industry standard, tooling support |

This specification is designed to be consumed by an AI agent for independent implementation. All architectural patterns, folder structures, naming conventions, and testing requirements are explicitly defined.
