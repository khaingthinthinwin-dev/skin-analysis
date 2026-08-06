# Team AI-Assisted Development Workflow Guide

> **Document ID:** SKM-GUIDE-001  
> **System:** Cosmetics Finder  
> **Classification:** MANDATORY — Required Reading for All Developers Before Using AI Agents  
> **Version:** 2.0  
> **Created:** 2026-06-18  
> **Updated:** 2026-08-06  
> **Author:** Principal Software Architect & Agile Coach  
> **Status:** Released  
> **Compliance Level:** All rules are **BINDING**. Violations will result in PR rejection.

---

## Table of Contents

1. [Why This Guide Exists](#1--why-this-guide-exists)
2. [The 3 Deadly Sins of AI-Assisted Team Development](#2--the-3-deadly-sins-of-ai-assisted-team-development)
3. [Golden Rule: The Directory Isolation Contract](#3--golden-rule-the-directory-isolation-contract)
4. [Pre-Flight Checklist — Before You Open the AI Agent](#4--pre-flight-checklist--before-you-open-the-ai-agent)
5. [The AI Prompting Protocol](#5--the-ai-prompting-protocol)
6. [The AI Output Verification Framework (VERIFY-7)](#6--the-ai-output-verification-framework-verify-7)
7. [Git Workflow with AI Agents — The Safety Net](#7--git-workflow-with-ai-agents--the-safety-net)
8. [The Shared Layer: Touch It and Die Protocol](#8--the-shared-layer-touch-it-and-die-protocol)
9. [The Anti-Conflict Daily Routine](#9--the-anti-conflict-daily-routine)
10. [AI Agent Red Lines — Absolute Prohibitions](#10--ai-agent-red-lines--absolute-prohibitions)
11. [Incident Response: When AI Breaks Something](#11--incident-response-when-ai-breaks-something)
12. [Naming Convention Quick Reference Card](#12--naming-convention-quick-reference-card)
13. [AI Prompt Template Library](#13--ai-prompt-template-library)
14. [Code Review Checklist for AI-Generated Code](#14--code-review-checklist-for-ai-generated-code)
15. [Team Commitment Agreement](#15--team-commitment-agreement)
16. [Shared Component Library — UI Consistency Mandate](#16--shared-component-library--ui-consistency-mandate)

---

## 1. Why This Guide Exists

### The Problem

We are a team of **5 developers** building **multiple feature modules** simultaneously for the Cosmetics Finder platform, using AI coding agents (Gemini, Cursor, GitHub Copilot) to accelerate development. Without strict guardrails, this creates three catastrophic risks:

| Risk | What Happens | Real Cost |
|:---|:---|:---|
| **Merge Conflict Hell** | AI generates code that touches shared files or other modules | Hours lost resolving conflicts; potential data loss |
| **Inconsistent Standards** | Each developer's AI produces different patterns, naming, and structures | Unmaintainable codebase; failed code reviews |
| **Architectural Drift** | AI ignores module boundaries, creates cross-dependencies | Tightly coupled system; impossible to maintain independently |

### The Solution

This guide establishes **strict, non-negotiable rules** that every developer must follow when using AI agents. Think of it as the traffic law for our AI-powered development highway.

> **Core Principle:** AI is a powerful tool — like a chainsaw. Without safety gear and training, it causes more damage than manual work.

### Tech Stack Summary

| Layer | Technology |
|:---|:---|
| Frontend | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS v4 + Lucide Icons |
| State | TanStack Query, React Hook Form, Zod |
| Backend | Node.js + NestJS + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache | Redis |
| Auth | JWT (access + refresh token) |
| i18n | i18next (English, Japanese, Myanmar) |
| Testing | Vitest (frontend), Jest (backend) |
| CI/CD | GitHub Actions |

### Who Must Follow This Guide

| Person (Initials) | Module Ownership | Requirement |
|:---|:---|:---|
| **[ATM]** | auth, users, skin-analysis | **MANDATORY** |
| **[HAML]** | matching | **MANDATORY** |
| **[TMO]** | products | **MANDATORY** |
| **[TRPH]** | search, categories | **MANDATORY** |
| **[EEM]** | wishlist, cart, orders | **MANDATORY** |
| **[ZSLS]** | promotions, merchant products | **MANDATORY** |
| **[WYT]** | advertisements, merchant dashboard, sales | **MANDATORY** |
| **[PET]** | reviews, admin moderation, analytics (shared) | **MANDATORY** |
| **[PPH]** | commission, admin revenue, analytics (shared) | **MANDATORY** |
| AI Agents (Gemini, Cursor, Copilot) | Must be constrained by these rules | **MANDATORY** |

---

## 2. The 3 Deadly Sins of AI-Assisted Team Development

### Sin #1: Letting AI Roam Free

**What it looks like:**
```
"Hey AI, build me the skin analysis feature."
```

**Why it's deadly:** The AI has no knowledge of our directory structure, naming conventions, or module boundaries. It will generate files wherever it wants, use whatever naming it prefers, and likely touch shared files.

**The Correct Way:**
```
"Using the specifications in docs/core-work/ and following
docs/core-work/開発ルール_DEVELOPMENT_RULES.md naming conventions,
implement the SkinAnalysisService.analyze() method in
backend/src/modules/skin-analysis/skin-analysis.service.ts."
```

---

### Sin #2: Skipping the Verification Step

**What it looks like:**
```
AI generates code -> Developer commits immediately -> Pushes to branch
```

**Why it's deadly:** AI-generated code frequently contains:
- Implicit `any` types (violates `strict: true`)
- Cross-module imports (violates directory isolation)
- Wrong naming conventions (`user_name` instead of `userName`)
- Missing JSDoc comments
- Incorrect import ordering

**The Correct Way:**
```
AI generates code -> VERIFY-7 checklist -> Lint -> Build -> Test -> Commit
```

---

### Sin #3: Touching the Shared Layer Without Permission

**What it looks like:**
```
AI modifies backend/src/shared/prisma/prisma.service.ts
to add a new query for the matching module
```

**Why it's deadly:** The shared layer is used by ALL modules. One change can break other developers' work simultaneously.

**The Correct Way:**
```
Create a request ticket -> Get Project Leader written approval ->
Make the change with full regression testing -> Notify ALL developers
```

---

## 3. Golden Rule: The Directory Isolation Contract

This is the **single most important concept** in our entire development process. Every developer and every AI agent must internalize this rule completely.

### 3.1 Your Territory Map

```
YOU OWN THIS -> You can freely create, modify, and delete files here.
RESTRICTED   -> You need Project Leader written approval.
FORBIDDEN    -> You must NEVER touch these directories.
```

| Developer | Backend Owned | Frontend Owned | Restricted | Forbidden |
|:---|:---|:---|:---|:---|
| **[ATM]** | `backend/src/modules/auth/`, `backend/src/modules/users/`, `backend/src/modules/skin-analysis/` | `frontend/src/features/auth/`, `frontend/src/features/skin-analysis/`, `frontend/src/pages/Login.tsx`, `frontend/src/pages/Register.tsx`, `frontend/src/pages/Profile.tsx`, `frontend/src/pages/skin-analysis/` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[HAML]** | `backend/src/modules/matching/` | `frontend/src/features/matching/`, `frontend/src/pages/matching/` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[TMO]** | `backend/src/modules/products/` | `frontend/src/features/products/`, `frontend/src/pages/products/ProductDetail.tsx` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[TRPH]** | `backend/src/modules/search/`, `backend/src/modules/categories/` | `frontend/src/features/search/`, `frontend/src/pages/products/ProductSearch.tsx` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[EEM]** | `backend/src/modules/wishlist/`, `backend/src/modules/cart/`, `backend/src/modules/orders/` | `frontend/src/features/wishlist/`, `frontend/src/features/cart/`, `frontend/src/features/checkout/`, `frontend/src/pages/cart/`, `frontend/src/pages/checkout/`, `frontend/src/pages/wishlist/` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[ZSLS]** | `backend/src/modules/promotions/` | `frontend/src/features/merchant/` (product/promotion forms), `frontend/src/pages/merchant/Products.tsx`, `frontend/src/pages/merchant/ProductForm.tsx`, `frontend/src/pages/merchant/Promotions.tsx` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[WYT]** | `backend/src/modules/advertisements/` | `frontend/src/features/merchant/` (dashboard/ads/sales), `frontend/src/pages/merchant/Dashboard.tsx`, `frontend/src/pages/merchant/Advertisements.tsx`, `frontend/src/pages/merchant/SalesAnalytics.tsx` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[PET]** | `backend/src/modules/reviews/`, `backend/src/modules/analytics/` (shared), `backend/src/modules/admin/` (shared) | `frontend/src/features/admin/` (moderation/reports), `frontend/src/pages/admin/Dashboard.tsx`, `frontend/src/pages/admin/Users.tsx`, `frontend/src/pages/admin/Reviews.tsx`, `frontend/src/pages/admin/ContentModeration.tsx`, `frontend/src/pages/admin/Reports.tsx` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |
| **[PPH]** | `backend/src/modules/commission/`, `backend/src/modules/analytics/` (shared), `backend/src/modules/admin/` (shared) | `frontend/src/features/admin/` (commission/revenue), `frontend/src/pages/admin/Commission.tsx`, `frontend/src/pages/admin/Revenue.tsx` | `backend/src/shared/`, `frontend/src/components/ui/` | All other module dirs |

### 3.2 The Import Firewall

```typescript
// ALLOWED — Import from shared layer
import { PrismaService } from '../shared/prisma/prisma.service';
import { RedisService } from '../shared/redis/redis.service';

// FORBIDDEN — Direct cross-module import (BLOCKING PR VIOLATION)
// Example: [ATM] importing from [TMO]'s module
import { ProductsService } from '../products/products.service';
// Example: [EEM] importing from [ATM]'s module
import { AuthService } from '../auth/auth.service';
```

### 3.3 Visual Boundary Diagram

```
                    +-----------------------------+
                    |    SHARED LAYER             |
                    |    backend/src/shared/       |
                    |    (Prisma, Redis, Mail)     |
                    +--------------+--------------+
                                   | <- Import FROM shared only
          +----------+-------------+-------------+----------+
          |          |             |             |          |
    +-----+----+ +---+---+ +------+------+ +----+----+ +--+------+
    | Module   | |Module | | Module     | | Module  | | Module  |
    | auth/    | |matching| | products/ | | search/ | | cart/   |
    | users/   | |[HAML] | | [TMO]     | | categories| | orders/ |
    | skin-    | +-------+ +-----------+ | [TRPH]  | | wishlist|
    | analysis |                         +---------+ | [EEM]   |
    | [ATM]    |                                   +---------+
    +----------+
          X          X          X          X          X
    +-----+----+ +---+---+ +------+------+ +----+----+ +--+------+
    | Module   | |Module | | Module     | | Module  | | Module  |
    |promotions| |adverts| | reviews/   | |commission| | admin/  |
    | [ZSLS]   | | [WYT] | | analytics/ | | [PPH]   | |(shared) |
    +----------+ +-------+ | [PET]      | +---------+ |[PET/PPH]|
                            +------------+             +---------+
          X = NO cross-imports
```

> **CRITICAL:** If your AI agent generates ANY import from another module (e.g., [ATM] importing from [TMO]'s `products/`, or [EEM] importing from [ATM]'s `auth/`), **REJECT THE OUTPUT IMMEDIATELY.** Do not attempt to fix it — regenerate with corrected context.

---

## 4. Pre-Flight Checklist — Before You Open the AI Agent

Before you type a single prompt to your AI agent, complete this checklist **every single time:**

### 4.1 Context Loading Checklist

```
Step 1: Confirm you are on YOUR feature branch
    $ git branch --show-current
    Expected: feature/{module}-{tag} (e.g., feature/skin-analysis-atm, feature/products-tmo)
    
Step 2: Pull latest changes
    $ git pull origin main
    $ git merge main  (resolve any conflicts BEFORE using AI)
    
Step 3: Identify the EXACT task
    "I am implementing [SPECIFIC FUNCTION] in [EXACT FILE PATH]"
    Example: "[ATM] implementing analyze() in backend/src/modules/skin-analysis/skin-analysis.service.ts"

Step 4: Gather your context documents (in priority order)
```

### 4.2 Mandatory Context Document Matrix

| Priority | Document | When to Feed to AI | Why |
|:---|:---|:---|:---|
| **P0 — ALWAYS** | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Every single prompt | Architecture rules, naming, design system |
| **P0 — ALWAYS** | Your specific module README.md | Every task | Module-specific specs |
| **P1 — REQUIRED** | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business logic tasks | Workflow transitions, business rules |
| **P2 — REFERENCE** | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Backend/database tasks | Entity schemas, column types |
| **P3 — AS NEEDED** | `docs/screen/` files | Screen-specific implementations | UI layouts, field definitions |

### 4.3 The 30-Second Context Injection

Before every AI interaction, paste this header into your prompt:

```markdown
## AI AGENT CONSTRAINTS
- Developer: [TAG] (e.g., [ATM], [HAML], [TMO], [TRPH], [EEM], [ZSLS], [WYT], [PET], [PPH])
- I am working on the {MODULE} module ONLY.
- Backend files: backend/src/modules/{module}/ — DO NOT touch any other module.
- Frontend files: frontend/src/features/{module}/ and frontend/src/pages/{module}/ — DO NOT touch any other module.
- Shared layer (backend/src/shared/, frontend/src/components/ui/): READ-ONLY — DO NOT modify.
- Naming: camelCase for variables/functions, PascalCase for classes/components.
- Files: kebab-case.ts for backend, PascalCase.tsx for frontend components.
- TypeScript strict mode: NO `any`, NO `@ts-ignore`, NO `@ts-nocheck`.
- All public methods must include JSDoc with @description, @param, @returns, @throws.
- Import order: Node builtins -> Framework -> Third-party -> Shared -> Local.
```

---

## 5. The AI Prompting Protocol

### 5.1 The Anatomy of a Perfect AI Prompt

Every prompt to the AI agent must follow this structure:

```
+--------------------------------------------------+
|  1. CONSTRAINTS BLOCK                            |
|     Module boundary, naming rules, strict mode   |
|                                                  |
|  2. CONTEXT DOCUMENTS                            |
|     Reference specific spec files and sections   |
|                                                  |
|  3. PRECISE TASK                                 |
|     Exact file path, function name, behavior     |
|                                                  |
|  4. OUTPUT FORMAT                                |
|     Expected structure, imports, exports         |
|                                                  |
|  5. SUCCESS CRITERIA                             |
|     What "correct" looks like                    |
+--------------------------------------------------+
```

### 5.2 Prompt Quality Levels

| Level | Description | Risk | Example |
|:---|:---|:---|:---|
| **Level 0 — Dangerous** | Vague, no context | Guaranteed violations | "Build me a dashboard" |
| **Level 1 — Risky** | Some context, vague scope | Likely violations | "Build the skin analysis feature using NestJS" |
| **Level 2 — Acceptable** | Context docs, specific file | Minor issues possible | "Implement the analyze endpoint in skin-analysis.controller.ts" |
| **Level 3 — Ideal** | Full constraints, exact scope, spec reference, output format | Minimal risk | See template below |

### 5.3 The Level 3 Prompt Template

```markdown
## AI AGENT CONSTRAINTS
- Developer: [ATM]
- Module: SKIN-ANALYSIS (backend/src/modules/skin-analysis/ only)
- Frontend: frontend/src/features/skin-analysis/ only
- Shared layer: READ-ONLY — DO NOT modify
- TypeScript strict mode: NO `any`, NO `@ts-ignore`
- Naming: camelCase variables, PascalCase classes, kebab-case files
- JSDoc required on all public methods

## CONTEXT (attached files)
- docs/core-work/開発ルール_DEVELOPMENT_RULES.md (Section 1: Naming, Section 2: Directory Isolation)
- docs/core-work/要件定義書_REQUIREMENT_SPEC.md (Skin Analysis module section)
- docs/core-work/データベース設計書_DATABASE_SPEC.md (SkinAnalysis entity)

## TASK
Implement the `analyzeSkin()` method in `backend/src/modules/skin-analysis/skin-analysis.service.ts`.

**Behavior:**
1. Accept `userId: number`, `imageFile: Express.Multer.File`
2. Validate image format (JPEG, PNG only)
3. Call AI analysis service for skin assessment
4. Save analysis result to database via Prisma
5. Return the SkinAnalysis entity with skin type and recommendations

**Error Handling:**
- Throw BadRequestException for invalid image format
- Throw NotFoundException if user not found

## OUTPUT FORMAT
- Single file: `backend/src/modules/skin-analysis/skin-analysis.service.ts`
- Import only from `@nestjs/*`, `@prisma/client`, and `../shared/*`
- Use PrismaService from shared layer
- Include full JSDoc with @description, @param, @returns, @throws

## SUCCESS CRITERIA
- Zero TypeScript errors under `strict: true`
- No imports from other modules
- BadRequestException thrown for invalid input
- Analysis result persisted to database
```

---

## 6. The AI Output Verification Framework (VERIFY-7)

**Every single piece of AI-generated code must pass ALL 7 checks before staging.** No exceptions. No shortcuts.

### The VERIFY-7 Checklist

```
 VERIFY-7: The 7-Point AI Output Inspection
 --------------------------------------------

 V — VALIDATE TYPES
       Are ALL types explicit? No `any`, no missing return types,
       no untyped parameters?

 E — ENFORCE NAMING
       Do all variables, functions, classes, and files follow
       the naming convention matrix?

 R — RESTRICT IMPORTS
       Are there ZERO cross-module imports?
       Is import ordering correct? (Node -> Framework -> Third-party -> Shared -> Local)

 I — INSPECT BUSINESS LOGIC
       Does the business logic match the requirements spec?

 F — FORMAT & DESIGN
       Do UI components use correct design tokens?
       Primary: #7C3AED (purple), Accent: #EC4899 (pink), Secondary: #F3E8FF (lavender)

 Y — YIELD SECURITY
       Do all endpoints include proper auth guards?
       JWT authentication, RBAC, input validation

 7 — SEVEN COMMANDS
       Run these commands in order:
       1. cd frontend; npm run lint          (zero errors)
       2. cd frontend; npx tsc --noEmit      (zero TypeScript errors)
       3. cd frontend; npx vitest run        (all tests pass)
       4. cd backend; npm run lint           (zero errors)
       5. cd backend; npm run build          (zero TypeScript errors)
       6. cd backend; npm run test           (all tests pass)
       7. git diff --stat                    (confirm only YOUR files changed)
```

### Quick Reference: Common AI Mistakes to Catch

| AI Does This | You Must Fix To This | Rule Violated |
|:---|:---|:---|
| `const data: any = ...` | `const data: SkinAnalysis = ...` | TypeScript strict mode |
| `function getUser(id)` | `function getUser(id: number): Promise<User>` | Explicit typing |
| `import { X } from '../products/...'` (by [ATM]) | Remove; use shared layer instead | Directory isolation |
| `import { X } from '../auth/...'` (by [TMO]) | Remove; use shared layer instead | Directory isolation |
| `user_name`, `total_amount` | `userName`, `totalAmount` | camelCase convention |
| `SkinAnalysisservice.ts` | `skin-analysis.service.ts` | kebab-case file naming |
| `// @ts-ignore` | Fix the actual type error | Strict mode prohibition |
| `alert('Are you sure?')` | Use `<Dialog>` component from shadcn/ui | Modal requirement |
| No JSDoc on public method | Add full `@description`, `@param`, `@returns`, `@throws` | Documentation standard |
| `bg-purple-500` (wrong shade) | `bg-[#7C3AED]` (brand primary) | Design system tokens |

---

## 7. Git Workflow with AI Agents — The Safety Net

### 7.1 The AI-Safe Git Workflow

```
 +----------------------------------------------------------------+
 |                    AI-SAFE GIT WORKFLOW                         |
 |                                                                |
 |  1. SYNC         Pull latest from main                         |
 |  2. GENERATE     Use AI with proper constraints                |
 |  3. VERIFY       Run VERIFY-7 checklist                        |
 |  4. SCOPE CHECK  Confirm only YOUR files are modified          |
 |  5. COMMIT       Use semantic commit message                   |
 |  6. PUSH         Push to YOUR feature branch                   |
 |  7. PR           Create PR with description template           |
 +----------------------------------------------------------------+
```

### 7.2 Step-by-Step Git Commands

#### Step 1: Sync Before AI Session

```bash
# ALWAYS start here before opening AI
git checkout feature/{module}-{tag}
git fetch origin
git merge origin/main

# Verify no conflicts before proceeding
git status
```

#### Step 2: After AI Generates Code — Scope Validation

```bash
# CRITICAL: Check which files were changed
git diff --name-only

# Expected output: ONLY files in YOUR module directory
# Example for [ATM]:
# OK: backend/src/modules/auth/auth.service.ts
# OK: frontend/src/features/auth/components/LoginForm.tsx
# OK: frontend/src/pages/skin-analysis/SkinAnalysis.tsx
#
# If you see ANY of these, REVERT IMMEDIATELY:
# BAD: backend/src/shared/prisma/prisma.service.ts
# BAD: backend/src/modules/products/products.service.ts
# BAD: package.json (AI added a dependency!)
# BAD: .env
```

#### Step 3: Selective Staging (Never `git add .` !)

```bash
# NEVER do this:
# git add .          <- This stages EVERYTHING including AI mistakes

# ALWAYS do this:
git add backend/src/modules/{your-module}/
git add frontend/src/features/{your-module}/
git add frontend/src/pages/{your-module}/

# Review what's staged
git diff --staged --stat
```

#### Step 4: Commit with Semantic Format

```bash
# Format: {prefix}: {description in imperative mood}
# Max 72 characters in subject line

# Good commit messages:
git commit -m "feat: implement skin analysis upload and processing"
git commit -m "fix: resolve product search filter pagination"
git commit -m "test: add unit tests for cart service"
git commit -m "refactor: extract shared validation utilities"

# Bad commit messages:
git commit -m "updated stuff"
git commit -m "AI generated code"
git commit -m "Fixed."
git commit -m "WIP"
```

### 7.3 Branch Protection Summary

| Rule | Enforcement |
|:---|:---|
| Direct push to `main` | **BLOCKED** at repository level |
| Force-push on `main` | **DISABLED** |
| All changes via Pull Request | **MANDATORY** |
| `npm run build` succeeds | Required for PR merge (CI) |
| `npm run lint` zero errors | Required for PR merge (CI) |
| `npm run test` all pass | Required for PR merge (CI) |
| Minimum 1 peer review approval | Required for PR merge |
| Scope confined to your module (per [TAG] ownership) | Validated manually in review |
| Shared layer changes require Project Leader | Manual gate |

### 7.4 PR Description Template

Every Pull Request must use this template:

```markdown
## Summary
[What does this PR accomplish? Be specific.]

## Module
[ATM: auth/users/skin-analysis | HAML: matching | TMO: products | TRPH: search/categories | EEM: wishlist/cart/orders | ZSLS: promotions/merchant | WYT: ads/merchant dashboard | PET: reviews/admin | PPH: commission/admin]

## AI Usage Disclosure
- [ ] AI agents were used to generate code in this PR
- AI Tool Used: [Gemini / Cursor / Copilot / None]
- VERIFY-7 Checklist: [Completed / Not Applicable]

## Changes
- [List each specific change with file path]

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] `npm run build` passes locally (zero errors)
- [ ] `npm run lint` passes locally (zero errors)
- [ ] `npm run test` passes locally

## Scope Validation
- [ ] All changes are within my assigned module directory ([TAG])
- [ ] No shared layer modifications (or Project Leader approved)
- [ ] No cross-module imports added
- [ ] No new dependencies added to package.json (or team approved)

## Screenshots (if UI changes)
[Attach before/after screenshots]
```

---

## 8. The Shared Layer: Touch It and Die Protocol

The shared layer is the **most dangerous area** of the codebase. It contains code used by ALL modules. One wrong change breaks everything.

### 8.1 What Lives in the Shared Layer

| Directory | Contents | Danger Level |
|:---|:---|:---|
| `backend/src/shared/prisma/` | PrismaModule, PrismaService | **EXTREME** — DB access for all modules |
| `backend/src/shared/redis/` | RedisModule, RedisService | **HIGH** — Caching, sessions |
| `backend/src/shared/mail/` | MailModule, MailService | **MEDIUM** — Email functionality |
| `backend/src/common/` | Decorators, guards, filters, interceptors, pipes, DTOs, interfaces, utils | **HIGH** — Cross-cutting concerns |
| `frontend/src/components/ui/` | shadcn/ui primitives (button, input, card, dialog, etc.) | **HIGH** — UI consistency |
| `frontend/src/components/layout/` | Header, Footer, Sidebar, MainLayout | **HIGH** — App shell |
| `frontend/src/components/common/` | ThemeToggle, LanguageToggle, ErrorBoundary, LoadingSpinner | **MEDIUM** — Shared utilities |
| `frontend/src/lib/` | `cn()` utility, API client, constants | **HIGH** — Core utilities |
| `frontend/src/services/` | API client configuration, query keys | **HIGH** — API layer |
| `frontend/src/types/` | Shared TypeScript types | **HIGH** — Type definitions |
| `frontend/src/hooks/` | useDebounce, useLocalStorage, useMediaQuery | **MEDIUM** — Shared hooks |
| `frontend/src/providers/` | AuthProvider, ThemeProvider, QueryProvider, I18nProvider | **HIGH** — App context |

### 8.2 Access Control Matrix

| Action | Permission | Required Approval | AI Agent Allowed? |
|:---|:---|:---|:---|
| **Import and use** shared services/types/components | ALLOWED | None | Yes |
| **Read** shared code for reference | ALLOWED | None | Yes |
| **Add new files** to shared layer | RESTRICTED | Project Leader **written** approval | **NO** |
| **Modify existing** shared services or types | RESTRICTED | Project Leader **written** approval + full regression test | **NO** |
| **Delete** any shared file | FORBIDDEN | **NOT permitted under any circumstances** | **ABSOLUTELY NO** |

### 8.3 Emergency Shared Layer Change Process

If you genuinely need a shared layer change:

```
 +-----------------------------------------------------+
 |  SHARED LAYER CHANGE REQUEST PROCESS                |
 |                                                     |
 |  1. CREATE written request describing:              |
 |    - What file needs to change                      |
 |    - What specific change is needed                 |
 |    - Why it can't be done in your module alone      |
 |    - Impact assessment on other modules             |
 |                                                     |
 |  2. SUBMIT to Project Leader                        |
 |                                                     |
 |  3. WAIT for written approval                       |
 |    (Do NOT proceed without it!)                     |
 |                                                     |
 |  4. IMPLEMENT with full regression test suite       |
 |                                                     |
 |  5. NOTIFY all developers of the change             |
 |                                                     |
 |  6. ALL developers pull and verify their modules    |
 +-----------------------------------------------------+
```

---

## 9. The Anti-Conflict Daily Routine

Follow this routine **every working day** to prevent merge conflicts and ensure smooth parallel development.

### 9.1 Morning Sync (First 10 Minutes)

```bash
# Step 1: Start of day — sync with main
git checkout feature/{module}-{tag}
git fetch origin
git merge origin/main

# If conflicts arise: resolve them BEFORE doing any new work
# If you can't resolve: ask the team IMMEDIATELY

# Step 2: Verify your working tree is clean
git status
# Should show: "nothing to commit, working tree clean"

# Step 3: Verify build still passes after merge
cd frontend; npm run lint; npx vitest run; cd ..
cd backend; npm run lint; npm run build; npm run test; cd ..
```

### 9.2 During Development (Continuous)

```
 Every AI interaction cycle:

 +----------+    +----------+    +----------+    +----------+
 | Prompt   |---| AI       |---| VERIFY   |---| Stage    |
 | (Level 3)|   | Generates |   | (VERIFY-7)|   | & Commit |
 +----------+    +----------+    +----------+    +----------+
       |                                             |
       |              FAIL -> Regenerate             |
       +---------------------------------------------+
```

**Rules during development:**
- **Commit frequently** — Small, focused commits (1 function = 1 commit)
- **Never leave uncommitted AI-generated code overnight**
- **Always check `git diff --name-only` before staging**

### 9.3 End of Day (Last 10 Minutes)

```bash
# Step 1: Commit all verified work
git add backend/src/modules/{your-module}/
git add frontend/src/features/{your-module}/
git add frontend/src/pages/{your-module}/
git commit -m "feat: [what you accomplished today]"

# Step 2: Push to your feature branch
git push origin feature/{module}-{tag}

# Step 3: Verify build one final time
cd frontend; npm run lint; npx vitest run; cd ..
cd backend; npm run lint; npm run build; npm run test; cd ..

# Step 4: Report status to team
# In the team chat, post:
# "[TAG] — Pushed to feature/{module}.
#  Changes: [brief summary]. Build: PASS. Tests: PASS."
```

### 9.4 Weekly Integration (Every Friday)

```
 +-----------------------------------------------------+
 |  WEEKLY INTEGRATION CEREMONY (30 minutes, all devs) |
 |                                                     |
 |  1. Each developer presents what they completed     |
 |  2. Identify any shared layer needs for next week   |
 |  3. Resolve any pending integration issues          |
 |  4. Each branch merges latest main                  |
 |  5. Verify all modules build and test independently |
 +-----------------------------------------------------+
```

---

## 10. AI Agent Red Lines — Absolute Prohibitions

These actions are **STRICTLY FORBIDDEN** for AI agents under ALL circumstances. If an AI agent does any of these, **immediately discard the output.**

### 10.1 Code Generation Red Lines

| # | Red Line | Why It's Forbidden |
|:---|:---|:---|
| 1 | Modify files in `backend/src/shared/` | Breaks all modules |
| 2 | Modify files in `frontend/src/components/ui/` | UI consistency violation |
| 3 | Modify files outside your assigned module | Creates merge conflicts |
| 4 | Add `// @ts-ignore` or `// @ts-nocheck` | Bypasses type safety |
| 5 | Use the `any` type in application code | Violates strict mode |
| 6 | Import from another module (e.g., [ATM] importing from [TMO]'s products/) | Violates directory isolation |
| 7 | Generate `npm install` commands | Unapproved dependencies |
| 8 | Create database migrations | Requires Project Leader review |
| 9 | Modify `.env`, `docker-compose.yml`, CI/CD configs | Environment integrity |
| 10 | Delete or rename existing files | Requires human instruction |
| 11 | Create new NestJS modules or React routes | Requires human approval |
| 12 | Modify `main.ts`, `AppModule`, or global middleware | Core architecture impact |
| 13 | Generate mock data with real personal info | Security/privacy risk |
| 14 | Use `alert()` or `confirm()` browser dialogs | Use shadcn/ui Dialog instead |
| 15 | Use raw SQL string concatenation | SQL injection vulnerability |

### 10.2 The Decision Flowchart

```
 Is the AI suggesting a change to a file outside my module?
 |
 YES -> REJECT IMMEDIATELY. Regenerate with constraints.
 |
 NO -> Is the AI modifying the shared layer?
       |
       YES -> STOP. Follow Section 8 process.
       |
       NO -> Does the code pass VERIFY-7?
              |
              NO -> Fix manually or regenerate.
              |
              YES -> PROCEED to stage and commit.
```

---

## 11. Incident Response: When AI Breaks Something

Despite all precautions, sometimes AI-generated code causes issues. Follow this escalation process:

### 11.1 Severity Classification

| Severity | Description | Example | Response Time |
|:---|:---|:---|:---|
| **S1 — Critical** | Shared layer corrupted, multiple modules broken | AI modified PrismaService, migrations ran | **IMMEDIATE** — Stop all work |
| **S2 — Major** | Build broken on your branch | AI introduced type errors | **30 minutes** — Fix before next commit |
| **S3 — Minor** | Code quality issue, wrong naming | camelCase violation, missing JSDoc | **End of day** — Fix in next commit |
| **S4 — Cosmetic** | Formatting, import order | Imports not sorted correctly | **Next PR** — Fix during review |

### 11.2 Emergency Rollback Procedure

```bash
# SCENARIO: AI-generated code was committed and it broke something

# Step 1: Identify the bad commit
git log --oneline -5

# Step 2: Revert the specific commit (keeps history clean)
git revert <bad-commit-hash>

# Step 3: Verify the build is restored
cd frontend; npm run lint; npx vitest run; cd ..
cd backend; npm run lint; npm run build; npm run test; cd ..

# Step 4: Commit the revert
git commit -m "revert: undo AI-generated [description] due to [issue]"

# Step 5: Push the revert
git push origin feature/{module}-{tag}

# Step 6: Notify the team
```

### 11.3 Post-Incident Review

After any S1 or S2 incident caused by AI-generated code:

1. **Document** what went wrong in the team chat
2. **Identify** which guardrail was missed (which VERIFY-7 check was skipped?)
3. **Update** your personal AI prompt templates to prevent recurrence
4. **Share** the lesson with the team

---

## 12. Naming Convention Quick Reference Card

Print this or keep it open during development. This is the **single source of truth** for all naming.

### 12.1 Code Naming

| Scope | Convention | Example | Correct | Wrong |
|:---|:---|:---|:---|:---|
| Variables & Functions | `camelCase` | `totalAmount` | `getProductDetails` | `get_product_details` |
| Classes & Components | `PascalCase` | `SkinAnalysisService` | `ProductCard` | `productCard` |
| TypeScript Enums & Members | `PascalCase` | `SkinType.Oily` | `UserRole.Buyer` | `UserRole.buyer` |
| Database Tables & Columns | `snake_case` | `skin_analyses` | `created_at` | `createdAt` |
| Environment Variables | `SCREAMING_SNAKE_CASE` | `DATABASE_URL` | `JWT_SECRET` | `jwtSecret` |

### 12.2 File Naming

| Scope | Convention | Example |
|:---|:---|:---|
| Backend TS Files | `kebab-case` | `skin-analysis.service.ts`, `auth.controller.ts` |
| Frontend Components | `PascalCase` | `ProductCard.tsx`, `AnalysisResults.tsx` |
| Frontend Hooks | `usePascalCase.ts` | `useAuth.ts`, `useDebounce.ts` |
| Frontend Services | `kebab-case.service.ts` | `auth.service.ts`, `analysis.service.ts` |
| DTO Files | `kebab-case.dto.ts` | `login.dto.ts`, `create-product.dto.ts` |
| Schema Files | `kebab-case.schema.ts` | `auth.schema.ts`, `product.schema.ts` |
| Test Files | Mirror source + `.test.ts` or `.spec.ts` | `button.test.tsx`, `auth.service.spec.ts` |
| Type Files | `kebab-case.types.ts` | `api.types.ts`, `user.types.ts` |

### 12.3 Git Naming

| Type | Pattern | Example |
|:---|:---|:---|
| Feature (module-based) | `feature/{module}-{tag}` | `feature/skin-analysis-atm`, `feature/products-tmo` |
| Bug Fix | `fix/{description}` | `fix/product-search-pagination` |
| Chore | `chore/{description}` | `chore/upgrade-nestjs-v11` |
| Hotfix | `hotfix/{description}` | `hotfix/jwt-token-expiry` |
| Commit Message | `{prefix}: {imperative mood}` | `feat: implement skin analysis API` |

---

## 13. AI Prompt Template Library

Copy-paste these templates and fill in the blanks for consistent, safe AI interactions.

### Template 1: Backend Service Method

```markdown
## CONSTRAINTS
- Developer: [TAG] (e.g., [ATM], [HAML], [TMO], etc.)
- Module: {MODULE} (backend/src/modules/{module}/ ONLY)
- Shared layer: READ-ONLY
- TypeScript strict: true (NO `any`, NO `@ts-ignore`)
- Naming: camelCase functions, PascalCase classes, kebab-case files
- Full JSDoc required

## CONTEXT FILES (attached)
- docs/core-work/開発ルール_DEVELOPMENT_RULES.md (Section 1, 2, 5, 6)
- docs/core-work/要件定義書_REQUIREMENT_SPEC.md ({Module} section)
- docs/core-work/データベース設計書_DATABASE_SPEC.md ({Entity} schema)

## TASK
Implement the `{methodName}()` method in `backend/src/modules/{module}/{module}.service.ts`.

**Business Logic:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Error Handling:**
- Throw {ExceptionType} when {condition}

## VERIFY BEFORE ACCEPTING
- Zero TypeScript errors
- No cross-module imports
- PrismaService used for database operations
- Full JSDoc with @description, @param, @returns, @throws
```

### Template 2: Frontend Feature Component

```markdown
## CONSTRAINTS
- Developer: [TAG] (e.g., [ATM], [HAML], [TMO], etc.)
- Module: {MODULE} (frontend/src/features/{module}/ ONLY)
- UI components: USE from frontend/src/components/ui/ (DO NOT modify)
- TypeScript strict: true
- Design system: Primary #7C3AED, Accent #EC4899, Secondary #F3E8FF
- No browser alert()/confirm() — use shadcn/ui Dialog component

## CONTEXT FILES (attached)
- docs/core-work/開発ルール_DEVELOPMENT_RULES.md (Design System section)
- docs/screen/{Screen}/ (screen layout spec)

## TASK
Create the `{ComponentName}.tsx` component at
`frontend/src/features/{module}/components/{ComponentName}.tsx`.

**Layout Requirements:**
- [Layout specs from screen design]

**Data Requirements:**
- API endpoint: {endpoint}
- Use TanStack Query for data fetching

**UI Components to Use:**
- Import from `@/components/ui/*` (button, card, dialog, etc.)
- Use `cn()` utility from `@/lib/utils` for class merging

## VERIFY BEFORE ACCEPTING
- Design system colors correct
- Responsive layout (mobile/tablet/desktop)
- No cross-module imports
- Keyboard accessibility on interactive elements
```

### Template 3: Zod Schema with Validation

```markdown
## CONSTRAINTS
- Developer: [TAG] (e.g., [ATM], [HAML], [TMO], etc.)
- Module: {MODULE} (frontend/src/schemas/ or backend/src/modules/{module}/dto/)
- TypeScript strict: true
- Use Zod for schema validation
- Use React Hook Form resolver for forms

## CONTEXT FILES (attached)
- docs/core-work/要件定義書_REQUIREMENT_SPEC.md (Field specs section)
- docs/core-work/データベース設計書_DATABASE_SPEC.md (Entity schema)

## TASK
Create `{schema-name}.schema.ts` at the appropriate location.

**Fields:** (from spec)
- {fieldName}: {type} — {validation rules}
- ...

**Validation Rules:**
- [Business rules from requirement spec]

## VERIFY BEFORE ACCEPTING
- All fields have explicit types
- .min(), .max(), .regex() etc. applied
- .transform() for string trimming
- Matches the field specs in requirement spec
```

### Template 4: Unit Test

```markdown
## CONSTRAINTS
- Developer: [TAG] (e.g., [ATM], [HAML], [TMO], etc.)
- Module: {MODULE}
- Frontend tests: Vitest + @testing-library/react
- Backend tests: Jest
- File naming: {source-file}.test.ts(x) or .spec.ts

## CONTEXT FILES (attached)
- src/modules/{module}/{module}.service.ts (backend)
- Or src/features/{module}/components/{Component}.tsx (frontend)

## TASK
Create unit tests for `{ClassName}.{methodName}()` or `{Component}`.

**Test Cases Required:**
1. Happy path: [expected behavior]
2. Error case: [error condition]
3. Edge case: [boundary condition]

## VERIFY BEFORE ACCEPTING
- All test cases covered
- Both positive and negative test cases included
- Mocks properly set up (no real DB/network calls)
- All tests pass
```

---

## 14. Code Review Checklist for AI-Generated Code

When reviewing a teammate's PR that contains AI-generated code, use this extended checklist:

### 14.1 Architecture Compliance

```
All changes are within the developer's assigned module directory (per [TAG] ownership)
No files modified in backend/src/shared/ (unless Project Leader approved)
No files modified in frontend/src/components/ui/ (unless via shadcn CLI)
No cross-module imports (grep for imports from other modules — see Section 3.2)
No new NestJS modules or React route entries without approval
No modifications to main.ts, AppModule, or global middleware
```

### 14.2 Type Safety & Standards

```
TypeScript strict mode: no `any`, no `@ts-ignore`, no `@ts-nocheck`
All function parameters and return types explicitly annotated
Interface for object shapes, Type for unions/intersections
All public methods have JSDoc (@description, @param, @returns, @throws)
Import ordering: Node -> Framework -> Third-party -> Shared -> Local
```

### 14.3 Naming Conventions

```
Variables & functions: camelCase
Classes & components: PascalCase
Backend files: kebab-case.ts
Frontend components: PascalCase.tsx
Frontend hooks: usePascalCase.ts
DTOs: kebab-case.dto.ts
Schemas: kebab-case.schema.ts
Database references: snake_case
```

### 14.4 Security

```
All endpoints have proper auth guards (JwtAuthGuard, RolesGuard)
DTOs use Zod or class-validator for validation
String inputs trimmed
No raw SQL string concatenation
No hardcoded credentials or tokens
File upload validates MIME type (JPEG, PNG only for skin analysis)
```

### 14.5 Business Logic

```
Business logic matches requirements spec
Error handling covers all edge cases
Prisma transactions used for multi-table operations
Soft delete used where applicable
API responses follow consistent format
```

### 14.6 UI/UX Design System

```
Primary brand color: #7C3AED (purple)
Accent color: #EC4899 (pink)
Secondary color: #F3E8FF (lavender)
Card containers use consistent styling
shadcn/ui components used (not custom reimplementations)
No browser alert()/confirm() — use Dialog component
Responsive breakpoints: mobile default, md:768px, lg:1024px, xl:1280px
Uses shared UI components from @/components/ui/*
```

### 14.7 Testing

```
Unit tests added for new service methods or components
Both positive and negative test cases present
Tests use mocks (no real database connections)
Frontend: npx vitest run passes
Backend: npm run test passes
```

---

## 15. Team Commitment Agreement

By using AI agents in this project, every team member agrees to the following:

### I commit to:

```
 +-----------------------------------------------------------------+
 |                                                                 |
 |  1. ALWAYS provide proper context constraints to AI agents      |
 |                                                                 |
 |  2. ALWAYS run VERIFY-7 on every piece of AI output             |
 |                                                                 |
 |  3. NEVER modify files outside my assigned module directory      |
 |                                                                 |
 |  4. NEVER modify the shared layer without written approval       |
 |                                                                 |
 |  5. NEVER use `git add .` — always stage selectively            |
 |                                                                 |
 |  6. ALWAYS write semantic commit messages                        |
 |                                                                 |
 |  7. ALWAYS verify build + lint + test before pushing            |
 |                                                                 |
 |  8. ALWAYS disclose AI usage in PR descriptions                 |
 |                                                                 |
 |  9. ALWAYS report AI incidents immediately to the team          |
 |                                                                 |
 |  10. ALWAYS read the relevant spec files before prompting AI    |
 |                                                                 |
 +-----------------------------------------------------------------+
```

---

## Appendix A: Quick Command Reference

```bash
# --- DAILY SYNC ------------------------------------------------
git fetch origin && git merge origin/main

# --- PRE-COMMIT VALIDATION (FRONTEND) --------------------------
cd frontend
npm run lint                        # Must have 0 errors
npx tsc --noEmit                    # Must compile cleanly
npx vitest run                      # Must pass

# --- PRE-COMMIT VALIDATION (BACKEND) ---------------------------
cd backend
npm run lint                        # Must have 0 errors
npm run build                       # Must compile cleanly
npm run test                        # Must pass

# --- SCOPE VALIDATION -------------------------------------------
git diff --name-only                # Only YOUR module files
git diff --stat                     # Overview of changes

# --- SELECTIVE STAGING ------------------------------------------
git add backend/src/modules/{module}/         # Stage backend module
git add frontend/src/features/{module}/       # Stage frontend features
git add frontend/src/pages/{module}/          # Stage frontend pages

# --- SEMANTIC COMMIT --------------------------------------------
git commit -m "feat: implement [description]"
git commit -m "fix: resolve [description]"
git commit -m "test: add tests for [description]"

# --- EMERGENCY ROLLBACK ----------------------------------------
git log --oneline -5                # Find bad commit
git revert <hash>                   # Revert cleanly

# --- CROSS-MODULE IMPORT CHECK ---------------------------------
# Run this to find forbidden imports in your module:
grep -rn "from '\.\.\/(auth|users|skin-analysis|matching|products|search|categories|wishlist|cart|orders|promotions|advertisements|reviews|analytics|admin|commission)" backend/src/modules/{your-module}/
# Expected output: NOTHING (zero matches = safe)
```

---

## Appendix B: Reference Documents

| Document | Path | Purpose |
|:---|:---|:---|
| Specification | `docs/SPECIFICATION.md` | Full architecture, tech stack, brand identity |
| Folder Structure | `docs/FOLDER_STRUCTURE_SAMPLE.md` | Directory layout, naming conventions |
| Development Rules | `docs/core-work/開発ルール_DEVELOPMENT_RULES.md` | Architecture rules, naming, design system |
| Requirements Spec | `docs/core-work/要件定義書_REQUIREMENT_SPEC.md` | Business rules, workflow states |
| Database Spec | `docs/core-work/データベース設計書_DATABASE_SPEC.md` | Prisma schema, entity definitions |
| Screen Designs | `docs/screen/` | Screen-specific UI layouts and specs |
| API Spec | `docs/api/openapi.yaml` | OpenAPI/Swagger API specification |

---

> **Remember:** AI is your co-pilot, not your autopilot. You are **always** responsible for the code that gets committed. No excuse of "the AI generated it" will be accepted in code review. Own your code. Verify your code. Ship quality code.

---

*Document maintained by the Principal Software Architect. Last updated: 2026-08-06.*
