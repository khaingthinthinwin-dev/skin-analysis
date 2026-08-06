# 🤖 Team AI-Assisted Development Workflow Guide

> **Document ID:** PRWM-GUIDE-001  
> **System:** Payment Request Workflow Management System (支払申請ワークフロー管理システム)  
> **Classification:** MANDATORY — Required Reading for All Developers Before Using AI Agents  
> **Version:** 1.0  
> **Created:** 2026-06-18  
> **Author:** Principal Software Architect & Agile Coach  
> **Status:** Released (承認済み)  
> **Compliance Level:** All rules are **BINDING**. Violations will result in PR rejection.

---

## 📑 Table of Contents

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
16. [📦 Shared Component Library — UI Consistency Mandate (NEW)](#16--shared-component-library--ui-consistency-mandate-new)

---

## 1. 🎯 Why This Guide Exists

### The Problem

We are a team of **5 developers** building **5 role-based modules** simultaneously, using AI coding agents (Gemini, Cursor, GitHub Copilot) to accelerate development. Without strict guardrails, this creates three catastrophic risks:

| 🚨 Risk | What Happens | Real Cost |
|:---|:---|:---|
| **Merge Conflict Hell** | AI generates code that touches shared files or other modules | Hours lost resolving conflicts; potential data loss |
| **Inconsistent Standards** | Each developer's AI produces different patterns, naming, and structures | Unmaintainable codebase; failed code reviews |
| **Architectural Drift** | AI ignores module boundaries, creates cross-dependencies | Tightly coupled system; impossible to maintain independently |

### The Solution

This guide establishes **strict, non-negotiable rules** that every developer must follow when using AI agents. Think of it as the traffic law for our AI-powered development highway.

> 💡 **Core Principle:** AI is a powerful tool — like a chainsaw. Without safety gear and training, it causes more damage than manual work.

### Who Must Follow This Guide

| Person | Requirement |
|:---|:---|
| Soe Htet Lin (Applicant) | ✅ **MANDATORY** |
| Aye Thandar Moe (Manager) | ✅ **MANDATORY** |
| Khaing Thin Thin Win (Approver) | ✅ **MANDATORY** |
| Shin Min Thant (Accounting) | ✅ **MANDATORY** |
| Ye Maung Maung (Admin) | ✅ **MANDATORY** |
| AI Agents (Gemini, Cursor, Copilot) | ✅ Must be constrained by these rules |

---

## 2. 💀 The 3 Deadly Sins of AI-Assisted Team Development

### Sin #1: Letting AI Roam Free 🔓

**What it looks like:**
```
❌ "Hey AI, build me the Manager verification feature."
```

**Why it's deadly:** The AI has no knowledge of our directory structure, naming conventions, or module boundaries. It will generate files wherever it wants, use whatever naming it prefers, and likely touch shared files.

**The Correct Way:**
```
✅ "Using the specifications in DD_MANAGER_01_OVERVIEW.md and following 
   02_開発ルール_DEVELOPMENT_RULES.md Section 1 naming conventions, 
   implement the ManagerService.startReview() method in 
   src/modules/manager/manager.service.ts."
```

---

### Sin #2: Skipping the Verification Step 🙈

**What it looks like:**
```
❌ AI generates code → Developer commits immediately → Pushes to branch
```

**Why it's deadly:** AI-generated code frequently contains:
- Implicit `any` types (violates `strict: true`)
- Cross-module imports (violates directory isolation)
- Wrong naming conventions (`user_name` instead of `userName`)
- Missing JSDoc comments
- Incorrect import ordering

**The Correct Way:**
```
✅ AI generates code → VERIFY-7 checklist → Lint → Build → Test → Commit
```

---

### Sin #3: Touching the Shared Layer Without Permission 🚫

**What it looks like:**
```
❌ AI modifies src/modules/shared/entities/payment-request.entity.ts
   to add a new column for the Manager module
```

**Why it's deadly:** The shared layer is used by ALL 5 modules. One change can break 4 other developers' work simultaneously.

**The Correct Way:**
```
✅ Create a request ticket → Get Project Leader written approval → 
   Make the change with full regression testing → Notify ALL developers
```

---

## 3. 🏗️ Golden Rule: The Directory Isolation Contract

This is the **single most important concept** in our entire development process. Every developer and every AI agent must internalize this rule completely.

### 3.1 Your Territory Map

```
🏠 YOU OWN THIS → You can freely create, modify, and delete files here.
🔒 RESTRICTED   → You need Project Leader written approval.
🚫 FORBIDDEN    → You must NEVER touch these directories.
```

| Developer | Branch | 🏠 Backend Owned | 🏠 Frontend Owned | 🔒 Restricted | 🚫 Forbidden |
|:---|:---|:---|:---|:---|:---|
| **Soe Htet Lin** | `feature/applicant-soehtetlin` | `src/modules/applicant/` | `frontend/src/pages/applicant/` | `src/modules/shared/` | All other module dirs |
| **Aye Thandar Moe** | `feature/manager-ayethandarmoe` | `src/modules/manager/` | `frontend/src/pages/manager/` | `src/modules/shared/` | All other module dirs |
| **Khaing Thin Thin Win** | `feature/approver-khaingthinthinwin` | `src/modules/approver/` | `frontend/src/pages/approver/` | `src/modules/shared/` | All other module dirs |
| **Shin Min Thant** | `feature/accounting-shinminthant` | `src/modules/accounting/` | `frontend/src/pages/accounting/` | `src/modules/shared/` | All other module dirs |
| **Ye Maung Maung** | `feature/admin-yemaungmaung` | `src/modules/admin/` | `frontend/src/pages/admin/` | `src/modules/shared/` | All other module dirs |

### 3.2 The Import Firewall

```typescript
// ✅ ALLOWED — Import from shared layer
import { PaymentRequest } from '../shared/entities/payment-request.entity';
import { PaymentStatus } from '../shared/enums/payment-status.enum';
import { NotificationGateway } from '../shared/gateways/notification.gateway';

// ❌ FORBIDDEN — Direct cross-module import (BLOCKING PR VIOLATION)
import { ManagerService } from '../manager/manager.service';
import { ApplicantController } from '../applicant/applicant.controller';
```

### 3.3 Visual Boundary Diagram

```
                    ┌─────────────────────────────┐
                    │    🔒 SHARED LAYER          │
                    │    src/modules/shared/       │
                    │    (entities, DTOs, enums,   │
                    │     guards, gateways)        │
                    └──────────┬──────────────────┘
                               │ ← Import FROM shared only
          ┌────────────────────┼────────────────────┐
          │                    │                     │
    ┌─────┴─────┐      ┌──────┴──────┐     ┌───────┴───────┐
    │ 🏠 Module │      │ 🏠 Module   │     │ 🏠 Module     │
    │ applicant │──✘──>│  manager    │──✘──>│  approver     │
    │ (Soe)     │      │ (Aye)       │     │ (Khaing)      │
    └───────────┘      └─────────────┘     └───────────────┘
          ✘                   ✘                    ✘
    ┌─────┴─────┐      ┌──────┴──────┐
    │ 🏠 Module │      │ 🏠 Module   │      ✘ = NO cross-imports
    │ accounting│──✘──>│  admin      │      ← = One-way dependency
    │ (Shin)    │      │ (Ye)        │
    └───────────┘      └─────────────┘
```

> ⚠️ **CRITICAL:** If your AI agent generates ANY import from another role module, **REJECT THE OUTPUT IMMEDIATELY.** Do not attempt to fix it — regenerate with corrected context.

---

## 4. ✈️ Pre-Flight Checklist — Before You Open the AI Agent

Before you type a single prompt to your AI agent, complete this checklist **every single time:**

### 4.1 Context Loading Checklist

```
□ Step 1: Confirm you are on YOUR feature branch
    $ git branch --show-current
    Expected: feature/{your-role}-{your-name}
    
□ Step 2: Pull latest changes
    $ git pull origin master
    $ git merge master  (resolve any conflicts BEFORE using AI)
    
□ Step 3: Identify the EXACT task
    "I am implementing [SPECIFIC FUNCTION] in [EXACT FILE PATH]"
    Example: "I am implementing saveDraft() in src/modules/applicant/applicant.service.ts"
    
□ Step 4: Gather your context documents (in priority order)
```

### 4.2 Mandatory Context Document Matrix

| Priority | Document | When to Feed to AI | Why |
|:---|:---|:---|:---|
| 🔴 **P0 — ALWAYS** | `docs/core_ja/02_開発ルール_DEVELOPMENT_RULES.md` | Every single prompt | Architecture rules, naming, design system |
| 🔴 **P0 — ALWAYS** | Your specific Detailed Design file | Every task | Screen-specific specs, field definitions |
| 🟠 **P1 — REQUIRED** | `docs/core_ja/01_要件定義書_REQUIREMENT_SPEC.md` | Business logic tasks | Workflow transitions, business rules |
| 🟡 **P2 — REFERENCE** | `docs/core_ja/03_データベース設計書_DATABASE_SPEC.md` | Backend/database tasks | Entity schemas, column types |
| 🔵 **P3 — AS NEEDED** | `docs/detailed_design/00_common/` files | Shared patterns | Types, validation, components, DB patterns |

### 4.3 The 30-Second Context Injection

Before every AI interaction, paste this header into your prompt:

```markdown
## 🔒 AI AGENT CONSTRAINTS
- I am working on the {ROLE} module ONLY.
- Backend files: src/modules/{role}/ — DO NOT touch any other module.
- Frontend files: frontend/src/pages/{role}/ — DO NOT touch any other module.
- Shared layer (src/modules/shared/): READ-ONLY — DO NOT modify.
- Naming: camelCase for variables/functions, PascalCase for classes/components.
- Files: kebab-case.ts for backend, PascalCase.tsx for frontend components.
- TypeScript strict mode: NO `any`, NO `@ts-ignore`, NO `@ts-nocheck`.
- All public methods must include JSDoc with @description, @param, @returns, @throws.
- Import order: Node builtins → Framework → Third-party → Shared → Local.
```

---

## 5. 📝 The AI Prompting Protocol

### 5.1 The Anatomy of a Perfect AI Prompt

Every prompt to the AI agent must follow this structure:

```
┌──────────────────────────────────────────────────┐
│  1. 🔒 CONSTRAINTS BLOCK                        │
│     Module boundary, naming rules, strict mode   │
│                                                  │
│  2. 📄 CONTEXT DOCUMENTS                        │
│     Reference specific DD_ files and sections    │
│                                                  │
│  3. 🎯 PRECISE TASK                             │
│     Exact file path, function name, behavior     │
│                                                  │
│  4. 📏 OUTPUT FORMAT                            │
│     Expected structure, imports, exports         │
│                                                  │
│  5. ✅ SUCCESS CRITERIA                         │
│     What "correct" looks like                    │
└──────────────────────────────────────────────────┘
```

### 5.2 Prompt Quality Levels

| Level | Description | Risk | Example |
|:---|:---|:---|:---|
| ❌ **Level 0 — Dangerous** | Vague, no context | Guaranteed violations | "Build me a dashboard" |
| ⚠️ **Level 1 — Risky** | Some context, vague scope | Likely violations | "Build the manager verification feature using NestJS" |
| 🟡 **Level 2 — Acceptable** | Context docs, specific file | Minor issues possible | "Implement the verify endpoint in manager.controller.ts using DD_MANAGER_05" |
| ✅ **Level 3 — Ideal** | Full constraints, exact scope, DD reference, output format | Minimal risk | See template below |

### 5.3 The Level 3 Prompt Template

```markdown
## 🔒 AI AGENT CONSTRAINTS
- Module: MANAGER (src/modules/manager/ only)
- Shared layer: READ-ONLY — DO NOT modify
- TypeScript strict mode: NO `any`, NO `@ts-ignore`
- Naming: camelCase variables, PascalCase classes, kebab-case files
- JSDoc required on all public methods

## 📄 CONTEXT (attached files)
- docs/core_ja/02_開発ルール_DEVELOPMENT_RULES.md (Section 1: Naming, Section 2: Directory Isolation)
- docs/detailed_design/02_manager/DD_MANAGER_05_API_ENDPOINTS.md (Section: Verify Endpoint)
- docs/detailed_design/00_common/DD_COMMON_09_DATABASE_ACCESS_PATTERNS.md (Transaction Pattern)

## 🎯 TASK
Implement the `verifyRequest()` method in `src/modules/manager/manager.service.ts`.

**Behavior:**
1. Accept `requestId: number`, `managerId: number`, `ipAddress: string`
2. Load the PaymentRequest entity with relations
3. Validate current status is `MANAGER_REVIEWING` (throw ConflictException if not)
4. Transition status to `MANAGER_VERIFIED`
5. Create an immutable `approval_logs` record
6. Emit WebSocket event `request:status-changed`
7. Return the updated PaymentRequest entity

## 📏 OUTPUT FORMAT
- Single file: `src/modules/manager/manager.service.ts`
- Import only from `@nestjs/*`, `typeorm`, and `../shared/*`
- Use the QueryRunner transaction pattern from DD_COMMON_09
- Include full JSDoc with @description, @param, @returns, @throws

## ✅ SUCCESS CRITERIA
- Zero TypeScript errors under `strict: true`
- No imports from other role modules
- ConflictException thrown for invalid status transitions
- ApprovalLog entry created within the same transaction
```

---

## 6. 🔍 The AI Output Verification Framework (VERIFY-7)

**Every single piece of AI-generated code must pass ALL 7 checks before staging.** No exceptions. No shortcuts.

### The VERIFY-7 Checklist

```
 VERIFY-7: The 7-Point AI Output Inspection
 ─────────────────────────────────────────────

 □ V — VALIDATE TYPES
       Are ALL types explicit? No `any`, no missing return types,
       no untyped parameters?
       
 □ E — ENFORCE NAMING
       Do all variables, functions, classes, and files follow
       the Section 1.1 naming convention matrix?
       
 □ R — RESTRICT IMPORTS
       Are there ZERO cross-module imports?
       Is import ordering correct? (Node → Framework → Third-party → Shared → Local)
       
 □ I — INSPECT BUSINESS LOGIC
       Does the workflow transition match the state machine in
       01_要件定義書 Section 3.3?
       
 □ F — FORMAT & DESIGN
       Do UI components use exact color tokens, spacing, and
       typography from Section 9 of Development Rules?
       
 □ Y — YIELD SECURITY
       Do all endpoints include @UseGuards(JwtAuthGuard, RolesGuard)
       and @Roles() decorators?
       
 □ 7 — SEVEN COMMANDS
       Run these 6 commands in order:
       1. npm run lint          (zero errors)
       2. npm run build         (zero TypeScript errors)
       3. npm run test          (all unit tests pass)
       4. git diff --stat       (confirm only YOUR files changed)
       5. git diff --name-only  (NO shared layer modifications)
       6. grep -r "from '\.\./" src/modules/{your-role}/
          (verify no cross-module imports)
```

### Quick Reference: Common AI Mistakes to Catch

| ❌ AI Does This | ✅ You Must Fix To This | Rule Violated |
|:---|:---|:---|
| `const data: any = ...` | `const data: PaymentRequest = ...` | TypeScript strict mode |
| `function getUser(id)` | `function getUser(id: number): Promise<User>` | Explicit typing |
| `import { X } from '../manager/...'` | Remove; use shared layer instead | Directory isolation |
| `user_name`, `total_amount` | `userName`, `totalAmount` | camelCase convention |
| `PaymentRequestservice.ts` | `payment-request.service.ts` | kebab-case file naming |
| `// @ts-ignore` | Fix the actual type error | Strict mode prohibition |
| `alert('Are you sure?')` | Use `<ConfirmDialog />` component | Modal requirement |
| No JSDoc on public method | Add full `@description`, `@param`, `@returns`, `@throws` | Documentation standard |
| `bg-blue-500` (wrong shade) | `bg-blue-900` (corporate primary) | Design system tokens |

---

## 7. 🌿 Git Workflow with AI Agents — The Safety Net

### 7.1 The AI-Safe Git Workflow

```
 ┌──────────────────────────────────────────────────────────────┐
 │                    AI-SAFE GIT WORKFLOW                       │
 │                                                              │
 │  1. 🔄 SYNC         Pull latest from master                 │
 │  2. 🤖 GENERATE     Use AI with proper constraints           │
 │  3. 🔍 VERIFY       Run VERIFY-7 checklist                   │
 │  4. 📂 SCOPE CHECK  Confirm only YOUR files are modified     │
 │  5. ✍️  COMMIT       Use semantic commit message              │
 │  6. 🚀 PUSH         Push to YOUR feature branch              │
 │  7. 📋 PR           Create PR with description template      │
 └──────────────────────────────────────────────────────────────┘
```

### 7.2 Step-by-Step Git Commands

#### Step 1: Sync Before AI Session

```bash
# ALWAYS start here before opening AI
git checkout feature/{your-role}-{your-name}
git fetch origin
git merge origin/master

# Verify no conflicts before proceeding
git status
```

#### Step 2: After AI Generates Code — Scope Validation

```bash
# 🔴 CRITICAL: Check which files were changed
git diff --name-only

# Expected output: ONLY files in YOUR module directory
# ✅ src/modules/applicant/applicant.service.ts
# ✅ src/modules/applicant/dto/create-payment-request.dto.ts
# ✅ frontend/src/pages/applicant/CreateRequestForm.tsx
#
# 🚫 If you see ANY of these, REVERT IMMEDIATELY:
# ❌ src/modules/shared/entities/...
# ❌ src/modules/manager/...
# ❌ package.json (AI added a dependency!)
# ❌ .env
# ❌ tsconfig.json
```

#### Step 3: Selective Staging (Never `git add .` !)

```bash
# ⚠️ NEVER do this:
# git add .          ← This stages EVERYTHING including AI mistakes

# ✅ ALWAYS do this:
git add src/modules/{your-role}/        # Your backend module
git add frontend/src/pages/{your-role}/ # Your frontend module

# Review what's staged
git diff --staged --stat
```

#### Step 4: Commit with Semantic Format

```bash
# Format: {prefix}: {description in imperative mood}
# Max 72 characters in subject line

# ✅ Good commit messages:
git commit -m "feat: implement applicant draft creation service method"
git commit -m "fix: resolve totalAmount decimal precision in breakdown calculation"
git commit -m "test: add unit tests for manager verification flow"
git commit -m "refactor: extract breakdown total calculation to shared utility"

# ❌ Bad commit messages:
git commit -m "updated stuff"
git commit -m "AI generated code for manager"
git commit -m "Fixed."
git commit -m "WIP"
```

### 7.3 Branch Protection Summary

| Rule | Enforcement |
|:---|:---|
| Direct push to `main` | 🚫 **BLOCKED** at repository level |
| Direct push to `develop` | 🚫 **BLOCKED** at repository level |
| Force-push on `main`/`develop` | 🚫 **DISABLED** |
| All changes via Pull Request | ✅ **MANDATORY** |
| `npm run build` succeeds | ✅ Required for PR merge (CI) |
| `npm run lint` zero errors | ✅ Required for PR merge (CI) |
| `npm run test` all pass | ✅ Required for PR merge (CI) |
| Minimum 1 peer review approval | ✅ Required for PR merge |
| Scope confined to your module | ✅ Validated manually in review |
| Shared layer changes require Project Leader | ✅ Manual gate |

### 7.4 PR Description Template

Every Pull Request must use this template:

```markdown
## Summary
[What does this PR accomplish? Be specific.]

## Screen/Module
[Applicant / Manager / Approver / Accounting / Admin / Shared]

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
- [ ] All changes are within my assigned module directory
- [ ] No shared layer modifications (or Project Leader approved)
- [ ] No cross-module imports added
- [ ] No new dependencies added to package.json (or team approved)

## Screenshots (if UI changes)
[Attach before/after screenshots]
```

---

## 8. 🔐 The Shared Layer: Touch It and Die Protocol

The shared layer (`src/modules/shared/` and `frontend/src/components/shared/`) is the **most dangerous area** of the codebase. It contains code used by ALL 5 modules. One wrong change breaks everything.

### 8.1 What Lives in the Shared Layer

| Directory | Contents | Danger Level |
|:---|:---|:---|
| `src/modules/shared/entities/` | TypeORM entities (User, PaymentRequest, etc.) | 🔴 **EXTREME** — DB schema changes |
| `src/modules/shared/enums/` | PaymentStatus, UserRole, etc. | 🔴 **EXTREME** — Used everywhere |
| `src/modules/shared/guards/` | JwtAuthGuard, RolesGuard | 🟠 **HIGH** — Security impact |
| `src/modules/shared/gateways/` | WebSocket notification gateway | 🟠 **HIGH** — Real-time system |
| `src/modules/shared/pipes/` | Validation pipes | 🟡 **MEDIUM** |
| `src/modules/shared/interceptors/` | Logging, transform interceptors | 🟡 **MEDIUM** |
| `src/modules/shared/dto/` | Shared DTOs | 🟠 **HIGH** |
| `frontend/src/components/shared/` | StatusBadge, DataTable, KpiCard, SearchFilterBar, etc. | 🟠 **HIGH** — UI consistency |
| `frontend/src/services/` | API client, WebSocket service | 🔴 **EXTREME** |
| `frontend/src/hooks/` | useAuth, useWebSocket | 🔴 **EXTREME** |

### 8.2 Access Control Matrix

| Action | Permission | Required Approval | AI Agent Allowed? |
|:---|:---|:---|:---|
| **Import and use** shared entities/DTOs/enums | ✅ ALLOWED | None | ✅ Yes |
| **Read** shared code for reference | ✅ ALLOWED | None | ✅ Yes |
| **Add new files** to shared layer | ⚠️ RESTRICTED | Project Leader **written** approval | ❌ **NO** |
| **Modify existing** shared entities or interfaces | ⚠️ RESTRICTED | Project Leader **written** approval + full regression test | ❌ **NO** |
| **Delete** any shared file | 🚫 FORBIDDEN | **NOT permitted under any circumstances** | ❌ **ABSOLUTELY NO** |

### 8.3 Shared Frontend Components — MANDATORY Usage

> 🆕 **NEW ENFORCEMENT (2026-06-23):** All dashboard pages MUST use these shared components. Creating local copies is FORBIDDEN and will be detected by CI (`verify-all.sh` STEP 4).

| Need | MUST Use | Import |
|:---|:---|:---|
| Dashboard KPI cards | `KpiCard` | `import { KpiCard } from '../../components/shared/KpiCard';` |
| KPI card grid layout | `DashboardKpiGrid` | `import { DashboardKpiGrid } from '../../components/shared/DashboardKpiGrid';` |
| Status pills/badges | `StatusBadge` | `import { StatusBadge } from '../../components/shared/StatusBadge';` |
| Data tables | `DataTable` | `import { DataTable } from '../../components/shared/DataTable';` |
| Page title/header | `PageHeader` | `import { PageHeader } from '../../components/shared/PageHeader';` |
| Search & filter bar | `SearchFilterBar` | `import { SearchFilterBar } from '../../components/shared/SearchFilterBar';` |
| Refresh button | `RefreshButton` | `import { RefreshButton } from '../../components/shared/RefreshButton';` |
| Empty states | `EmptyState` | `import { EmptyState } from '../../components/shared/EmptyState';` |
| Confirm modals | `ConfirmDialog` | `import { ConfirmDialog } from '../../components/shared/ConfirmDialog';` |
| Date picker | `DatePicker` | `import { DatePicker } from '../../components/shared/DatePicker';` |
| Loading indicator | `LoadingSpinner` | `import { LoadingSpinner } from '../../components/shared/LoadingSpinner';` |

**FORBIDDEN patterns that CI will detect and BLOCK:**
```typescript
// ❌ BLOCKED by verify-all.sh STEP 4
const StatusBadge: React.FC<{ statusId: number }> = ({ statusId }) => { ... };
export function ApproverStatusBadge({ statusId }: Props) { ... }
export function ApproverDataTable<T>({ columns }: Props) { ... }

// ✅ CORRECT — always import from shared
import { StatusBadge, DataTable, KpiCard } from '../../components/shared';
```

### 8.4 Emergency Shared Layer Change Process

If you genuinely need a shared layer change:

```
 ┌─────────────────────────────────────────────────────────┐
 │  SHARED LAYER CHANGE REQUEST PROCESS                    │
 │                                                         │
 │  1. 📝 CREATE written request describing:               │
 │     - What file needs to change                         │
 │     - What specific change is needed                    │
 │     - Why it can't be done in your module alone         │
 │     - Impact assessment on other 4 modules              │
 │                                                         │
 │  2. 📨 SUBMIT to Project Leader (Soe Htet Lin)         │
 │                                                         │
 │  3. ⏳ WAIT for written approval                        │
 │     (Do NOT proceed without it!)                        │
 │                                                         │
 │  4. 🧪 IMPLEMENT with full regression test suite        │
 │                                                         │
 │  5. 📢 NOTIFY all 5 developers of the change           │
 │                                                         │
 │  6. 🔄 ALL developers pull and verify their modules     │
 └─────────────────────────────────────────────────────────┘
```

---

## 9. 📅 The Anti-Conflict Daily Routine

Follow this routine **every working day** to prevent merge conflicts and ensure smooth parallel development.

### 9.1 Morning Sync (First 10 Minutes)

```bash
# 🌅 Step 1: Start of day — sync with master
git checkout feature/{your-role}-{your-name}
git fetch origin
git merge origin/master

# If conflicts arise: resolve them BEFORE doing any new work
# If you can't resolve: ask the team IMMEDIATELY

# 🌅 Step 2: Verify your working tree is clean
git status
# Should show: "nothing to commit, working tree clean"

# 🌅 Step 3: Verify build still passes after merge
npm run build
npm run test
```

### 9.2 During Development (Continuous)

```
 Every AI interaction cycle:
 
 ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
 │ 📝 Prompt│───>│ 🤖 AI    │───>│ 🔍 VERIFY│───>│ ✅ Stage │
 │ (Level 3)│    │ Generates │    │ (VERIFY-7)│   │ & Commit │
 └──────────┘    └──────────┘    └──────────┘    └──────────┘
       │                                               │
       │              ❌ FAIL → Regenerate              │
       └───────────────────────────────────────────────┘
```

**Rules during development:**
- 🕐 **Commit frequently** — Small, focused commits (1 function = 1 commit)
- 🔒 **Never leave uncommitted AI-generated code overnight**
- 📂 **Always check `git diff --name-only` before staging**

### 9.3 End of Day (Last 10 Minutes)

```bash
# 🌙 Step 1: Commit all verified work
git add src/modules/{your-role}/
git add frontend/src/pages/{your-role}/
git commit -m "feat: [what you accomplished today]"

# 🌙 Step 2: Push to your feature branch
git push origin feature/{your-role}-{your-name}

# 🌙 Step 3: Verify build one final time
npm run build
npm run test

# 🌙 Step 4: Report status to team
# In the team chat, post:
# "✅ {Your Name} — Pushed to feature/{role}. 
#  Changes: [brief summary]. Build: PASS. Tests: PASS."
```

### 9.4 Weekly Integration (Every Friday)

```
 ┌─────────────────────────────────────────────────────────┐
 │  WEEKLY INTEGRATION CEREMONY (30 minutes, all devs)     │
 │                                                         │
 │  1. Each developer presents what they completed         │
 │  2. Identify any shared layer needs for next week       │
 │  3. Resolve any pending integration issues              │
 │  4. Each branch merges latest master                    │
 │  5. Verify all 5 modules build and test independently   │
 └─────────────────────────────────────────────────────────┘
```

---

## 10. 🚫 AI Agent Red Lines — Absolute Prohibitions

These actions are **STRICTLY FORBIDDEN** for AI agents under ALL circumstances. If an AI agent does any of these, **immediately discard the output.**

### 10.1 Code Generation Red Lines

| # | Red Line | Why It's Forbidden |
|:---|:---|:---|
| 1 | ❌ Modify files in `src/modules/shared/` | Breaks all 5 modules |
| 2 | ❌ Modify files outside your assigned module | Creates merge conflicts |
| 3 | ❌ Add `// @ts-ignore` or `// @ts-nocheck` | Bypasses type safety |
| 4 | ❌ Use the `any` type in application code | Violates strict mode |
| 5 | ❌ Import from another role module | Violates directory isolation |
| 6 | ❌ Generate `npm install` commands | Unapproved dependencies |
| 7 | ❌ Create database migrations (`CREATE TABLE`, `ALTER TABLE`) | Requires Project Leader review |
| 8 | ❌ Modify `.env`, `docker-compose.yml`, CI/CD configs | Environment integrity |
| 9 | ❌ Delete or rename existing files | Requires human instruction |
| 10 | ❌ Create new NestJS modules or React routes | Requires human approval |
| 11 | ❌ Modify `main.ts`, `AppModule`, or global middleware | Core architecture impact |
| 12 | ❌ Generate mock data with real personal/financial info | Security/privacy risk |
| 13 | ❌ Use `alert()` or `confirm()` browser dialogs | Design system violation |
| 14 | ❌ Use raw SQL string concatenation | SQL injection vulnerability |

### 10.2 The Decision Flowchart

```
 Is the AI suggesting a change to a file outside my module?
 │
 ├── YES → 🚫 REJECT IMMEDIATELY. Regenerate with constraints.
 │
 └── NO → Is the AI modifying the shared layer?
          │
          ├── YES → 🚫 STOP. Follow Section 8 process.
          │
          └── NO → Does the code pass VERIFY-7?
                   │
                   ├── NO → 🔄 Fix manually or regenerate.
                   │
                   └── YES → ✅ PROCEED to stage and commit.
```

---

## 11. 🚨 Incident Response: When AI Breaks Something

Despite all precautions, sometimes AI-generated code causes issues. Follow this escalation process:

### 11.1 Severity Classification

| Severity | Description | Example | Response Time |
|:---|:---|:---|:---|
| 🔴 **S1 — Critical** | Shared layer corrupted, multiple modules broken | AI modified entity file, migrations ran | **IMMEDIATE** — Stop all work |
| 🟠 **S2 — Major** | Build broken on your branch | AI introduced type errors | **30 minutes** — Fix before next commit |
| 🟡 **S3 — Minor** | Code quality issue, wrong naming | camelCase violation, missing JSDoc | **End of day** — Fix in next commit |
| 🔵 **S4 — Cosmetic** | Formatting, import order | Imports not sorted correctly | **Next PR** — Fix during review |

### 11.2 Emergency Rollback Procedure

```bash
# 🚨 SCENARIO: AI-generated code was committed and it broke something

# Step 1: Identify the bad commit
git log --oneline -5

# Step 2: Revert the specific commit (keeps history clean)
git revert <bad-commit-hash>

# Step 3: Verify the build is restored
npm run build
npm run test

# Step 4: Commit the revert
git commit -m "revert: undo AI-generated [description] due to [issue]"

# Step 5: Push the revert
git push origin feature/{your-role}-{your-name}

# Step 6: Notify the team
# "⚠️ {Your Name}: Reverted commit {hash} on feature/{role}. 
#  Issue: [brief description]. Build restored."
```

### 11.3 Post-Incident Review

After any S1 or S2 incident caused by AI-generated code:

1. **Document** what went wrong in the team chat
2. **Identify** which guardrail was missed (which VERIFY-7 check was skipped?)
3. **Update** your personal AI prompt templates to prevent recurrence
4. **Share** the lesson with the team

---

## 12. 📜 Naming Convention Quick Reference Card

Print this or keep it open during development. This is the **single source of truth** for all naming.

### 12.1 Code Naming

| Scope | Convention | Example | ✅ Correct | ❌ Wrong |
|:---|:---|:---|:---|:---|
| Variables & Functions | `camelCase` | `totalAmount` | `getRequestDetails` | `get_request_details` |
| Classes & Components | `PascalCase` | `PaymentRequestService` | `ApplicantDashboard` | `applicantDashboard` |
| TypeScript Enums & Members | `PascalCase` | `PaymentStatus.ManagerVerified` | `UserRole.Applicant` | `UserRole.applicant` |
| Database Tables & Columns | `snake_case` | `payment_requests` | `request_number` | `requestNumber` |
| Environment Variables | `SCREAMING_SNAKE_CASE` | `DATABASE_HOST` | `JWT_SECRET` | `jwtSecret` |

### 12.2 File Naming

| Scope | Convention | Example |
|:---|:---|:---|
| Backend TS Files | `kebab-case` | `payment-request.entity.ts`, `applicant.controller.ts` |
| Frontend Components | `PascalCase` | `ApplicantDashboard.tsx`, `StatusBadge.tsx` |
| Frontend Utilities | `kebab-case` | `use-payment-form.ts`, `calculate-total.ts` |
| DTO Files | `kebab-case` with action prefix | `create-payment-request.dto.ts` |
| Test Files | Mirror source + `.spec.ts` | `payment-request.service.spec.ts` |
| CSS Overrides | `kebab-case` | `status-badge-draft`, `modal-overlay-backdrop` |

### 12.3 Git Naming

| Type | Pattern | Example |
|:---|:---|:---|
| Feature (role-based) | `feature/{role}-{developer}` | `feature/applicant-soehtetlin` |
| Feature (screen-based) | `feature/screen-[A-E]-{description}` | `feature/screen-A-draft-save` |
| Bug Fix | `fix/{description}` | `fix/totalAmount-precision-rounding` |
| Chore | `chore/{description}` | `chore/upgrade-nestjs-v11` |
| Hotfix | `hotfix/{description}` | `hotfix/jwt-token-expiry` |
| Commit Message | `{prefix}: {imperative mood}` | `feat: implement draft creation API` |

---

## 13. 📚 AI Prompt Template Library

Copy-paste these templates and fill in the blanks for consistent, safe AI interactions.

### Template 1: Backend Service Method

```markdown
## 🔒 CONSTRAINTS
- Module: {ROLE} (src/modules/{role}/ ONLY)
- Shared layer: READ-ONLY
- TypeScript strict: true (NO `any`, NO `@ts-ignore`)
- Naming: camelCase functions, PascalCase classes, kebab-case files
- Full JSDoc required

## 📄 CONTEXT FILES (attached)
- docs/core_ja/02_開発ルール_DEVELOPMENT_RULES.md (Section 1, 2, 5, 6)
- docs/detailed_design/{NN}_{role}/DD_{ROLE}_05_API_ENDPOINTS.md
- docs/detailed_design/00_common/DD_COMMON_09_DATABASE_ACCESS_PATTERNS.md

## 🎯 TASK
Implement the `{methodName}()` method in `src/modules/{role}/{role}.service.ts`.

**Business Logic:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Error Handling:**
- Throw {ExceptionType} when {condition}

## ✅ VERIFY BEFORE ACCEPTING
- Zero TypeScript errors
- No cross-module imports
- Transaction pattern used for multi-table operations
- ApprovalLog entry created
- WebSocket event emitted
```

### Template 2: Frontend Page Component

```markdown
## 🔒 CONSTRAINTS
- Module: {ROLE} (frontend/src/pages/{role}/ ONLY)
- Shared components: USE from frontend/src/components/shared/ (DO NOT modify)
- TypeScript strict: true
- Design system: Use EXACT color tokens from 02_開発ルール Section 9
- No browser alert()/confirm() — use ConfirmDialog component

## 📄 CONTEXT FILES (attached)
- docs/core_ja/02_開発ルール_DEVELOPMENT_RULES.md (Section 9: Design System)
- docs/detailed_design/{NN}_{role}/DD_{ROLE}_{NN}_FRONTEND_{SCREEN}.md
- docs/detailed_design/00_common/DD_COMMON_05_SHARED_COMPONENTS.md
- docs/detailed_design/00_common/DD_COMMON_06_SHARED_SERVICES_AND_HOOKS.md

## 🎯 TASK
Create the `{ComponentName}.tsx` component at
`frontend/src/pages/{role}/{ComponentName}.tsx`.

**Layout Requirements:**
- [Layout specs from DD file]

**Data Requirements:**
- API endpoint: {endpoint}
- Response type: {type from DD_COMMON_03}

**UI Components to Use:**
- StatusBadge from shared
- ConfirmDialog for destructive actions
- Card container pattern (rounded-xl shadow-sm border-slate-200 p-6)

## ✅ VERIFY BEFORE ACCEPTING
- Design system tokens correct (bg-blue-900, text-slate-900, etc.)
- Responsive layout (mobile/tablet/desktop breakpoints)
- No cross-module imports
- Keyboard accessibility on all interactive elements
```

### Template 3: DTO with Validation

```markdown
## 🔒 CONSTRAINTS
- Module: {ROLE} (src/modules/{role}/dto/ ONLY)
- TypeScript strict: true
- Use class-validator decorators
- Use class-transformer for sanitization

## 📄 CONTEXT FILES (attached)
- docs/detailed_design/{NN}_{role}/DD_{ROLE}_06_DTOS_AND_TYPES.md
- docs/detailed_design/00_common/DD_COMMON_04_SHARED_VALIDATION.md
- docs/core_ja/01_要件定義書_REQUIREMENT_SPEC.md (Section 3.5: Field Specs)

## 🎯 TASK
Create `{dto-name}.dto.ts` at `src/modules/{role}/dto/{dto-name}.dto.ts`.

**Fields:** (from DD file Section {N})
- {fieldName}: {type} — {validation rules}
- ...

**Validation Rules:**
- [Business rules from requirement spec]

## ✅ VERIFY BEFORE ACCEPTING
- All fields have explicit types
- @IsNotEmpty(), @IsString(), @MaxLength() etc. applied
- @Transform() for string trimming
- Matches the field specs in 01_要件定義書 Section 3.5
```

### Template 4: Unit Test

```markdown
## 🔒 CONSTRAINTS
- Module: {ROLE} (src/modules/{role}/tests/ ONLY)
- Test framework: Jest
- File naming: {source-file}.spec.ts

## 📄 CONTEXT FILES (attached)
- docs/detailed_design/{NN}_{role}/DD_{ROLE}_07_TEST_SPEC.md
- src/modules/{role}/{role}.service.ts (the file being tested)

## 🎯 TASK
Create unit tests for `{ClassName}.{methodName}()` in
`src/modules/{role}/tests/{class-name}.spec.ts`.

**Test Cases Required:**
1. ✅ Happy path: [expected behavior]
2. ❌ Invalid status transition: throw ConflictException
3. ❌ Unauthorized role: throw ForbiddenException
4. ❌ Resource not found: throw NotFoundException
5. ❌ [Additional edge cases from DD_ROLE_07]

## ✅ VERIFY BEFORE ACCEPTING
- All test cases from DD_{ROLE}_07 are covered
- Both positive and negative test cases included
- Mocks are properly set up for TypeORM repository and services
- No real database connections
```

---

## 14. ✅ Code Review Checklist for AI-Generated Code

When reviewing a teammate's PR that contains AI-generated code, use this extended checklist:

### 14.1 Architecture Compliance

```
□ All changes are within the developer's assigned module directory
□ No files modified in src/modules/shared/ (unless Project Leader approved)
□ No cross-module imports (grep for imports from other role modules)
□ No new NestJS modules or React route entries without approval
□ No modifications to main.ts, AppModule, or global middleware
```

### 14.2 Type Safety & Standards

```
□ TypeScript strict mode: no `any`, no `@ts-ignore`, no `@ts-nocheck`
□ All function parameters and return types explicitly annotated
□ Interface for object shapes, Type for unions/intersections
□ All public methods have JSDoc (@description, @param, @returns, @throws)
□ Import ordering: Node → Framework → Third-party → Shared → Local
```

### 14.3 Naming Conventions

```
□ Variables & functions: camelCase
□ Classes & components: PascalCase
□ Backend files: kebab-case.ts
□ Frontend components: PascalCase.tsx
□ Frontend utilities: kebab-case.ts
□ DTOs: kebab-case with action prefix
□ Database references: snake_case
```

### 14.4 Security

```
□ All endpoints have @UseGuards(JwtAuthGuard, RolesGuard) + @Roles()
□ DTOs use class-validator decorators
□ String inputs trimmed with @Transform()
□ No raw SQL string concatenation
□ No hardcoded credentials or tokens
□ File upload validates MIME type (PDF, JPEG, JPG, PNG only)
```

### 14.5 Business Logic

```
□ Workflow transitions match state machine (01_要件定義書 Section 3.3)
□ Rejection comments enforce minimum 10 characters
□ ApprovalLog created for all state transitions
□ Soft delete used (is_deleted flag), no hard deletes
□ Mandalay branch alert logic correct for Accounting
□ TotalAmount calculated from breakdown items, not manual input
```

### 14.6 UI/UX Design System

```
□ Primary Corporate color: #1E3A8A (bg-blue-900)
□ Status badge colors match Section 9.2.2 exactly
□ Card container: rounded-xl shadow-sm border-slate-200 p-6
□ Font: Inter loaded from Google Fonts CDN
□ Button variants match Section 9.5.4
□ Modal uses backdrop-blur-sm, not browser alert()
□ Table follows Section 9.5.2 spec
□ Responsive breakpoints: mobile default, md:768px, lg:1024px, xl:1280px
□ 🆕 Uses shared KpiCard, NOT inline KPI card implementation
□ 🆕 Uses shared StatusBadge, NOT local StatusBadge copy
□ 🆕 Uses shared DataTable, NOT local DataTable copy
□ 🆕 Uses shared SearchFilterBar for all filter/search UIs
□ 🆕 Uses shared RefreshButton for refresh actions
□ 🆕 No inline component duplicates (verify-all.sh STEP 4 passes)
```

### 14.7 Testing

```
□ Unit tests added for new service methods
□ Both positive and negative test cases present
□ Workflow state transition test cases match Section 7.3 matrix
□ Tests use mocks (no real database connections)
□ npm run test passes with zero failures
```

---

## 15. 📜 Team Commitment Agreement

By using AI agents in this project, every team member agrees to the following:

### I commit to:

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                                                                 │
 │  1. 🔒 ALWAYS provide proper context constraints to AI agents   │
 │                                                                 │
 │  2. 🔍 ALWAYS run VERIFY-7 on every piece of AI output          │
 │                                                                 │
 │  3. 🏗️ NEVER modify files outside my assigned module directory   │
 │                                                                 │
 │  4. 🤝 NEVER modify the shared layer without written approval   │
 │                                                                 │
 │  5. 📂 NEVER use `git add .` — always stage selectively         │
 │                                                                 │
 │  6. ✍️ ALWAYS write semantic commit messages                     │
 │                                                                 │
 │  7. 🧪 ALWAYS verify build + lint + test before pushing         │
 │                                                                 │
 │  8. 📢 ALWAYS disclose AI usage in PR descriptions              │
 │                                                                 │
 │  9. 🚨 ALWAYS report AI incidents immediately to the team       │
 │                                                                 │
 │  10. 📚 ALWAYS read the relevant DD files before prompting AI   │
 │                                                                 │
 └─────────────────────────────────────────────────────────────────┘
```

---

## Appendix A: Quick Command Reference

```bash
# ─── DAILY SYNC ───────────────────────────────────
git fetch origin && git merge origin/master

# ─── PRE-COMMIT VALIDATION ───────────────────────
npm run lint                        # Must have 0 errors
npm run build                       # Must compile cleanly
npm run test                        # Must pass

# ─── SCOPE VALIDATION ────────────────────────────
git diff --name-only                # Only YOUR module files
git diff --stat                     # Overview of changes

# ─── SELECTIVE STAGING ────────────────────────────
git add src/modules/{role}/         # Stage backend
git add frontend/src/pages/{role}/  # Stage frontend

# ─── SEMANTIC COMMIT ─────────────────────────────
git commit -m "feat: implement [description]"
git commit -m "fix: resolve [description]"
git commit -m "test: add tests for [description]"

# ─── EMERGENCY ROLLBACK ─────────────────────────
git log --oneline -5                # Find bad commit
git revert <hash>                   # Revert cleanly

# ─── FULL PROJECT HEALTH CHECK (ONE COMMAND) ─────
bash scripts/verify-all.sh          # Runs ALL 5 checks:
                                    # 1. Cross-module import scan
                                    # 2. Shared layer modification audit
                                    # 3. Quality gates (lint/build/test)
                                    # 4. 🆕 Inline component duplication scanner
                                    # 5. Consolidated report

# ─── CROSS-MODULE IMPORT CHECK ───────────────────
# Run this to find forbidden imports in your module:
grep -rn "from '\.\.\/(applicant|manager|approver|accounting|admin)" src/modules/{your-role}/
# Expected output: NOTHING (zero matches = safe)
```

---

## Appendix B: Reference Documents

| Document | Path | Purpose |
|:---|:---|:---|
| Requirements Spec | `docs/core_ja/01_要件定義書_REQUIREMENT_SPEC.md` | Business rules, workflow states |
| Development Rules | `docs/core_ja/02_開発ルール_DEVELOPMENT_RULES.md` | Architecture, naming, design system |
| Database Spec | `docs/core_ja/03_データベース設計書_DATABASE_SPEC.md` | Entity schemas, constraints |
| Architecture Guide | `docs/detailed_design/ARCHITECTURE_EXPLANATION.md` | Junior dev onboarding, design-to-code mapping |
| Common DD Files | `docs/detailed_design/00_common/DD_COMMON_*.md` | Shared types, validation, components, auth, errors, DB patterns |
| Module DD Files | `docs/detailed_design/{NN}_{role}/DD_{ROLE}_*.md` | Module-specific detailed design |

---

> **Remember:** AI is your co-pilot, not your autopilot. You are **always** responsible for the code that gets committed. No excuse of "the AI generated it" will be accepted in code review. Own your code. Verify your code. Ship quality code.

---

*Document maintained by the Principal Software Architect. Last updated: 2026-06-18.*
## 16. 📦 Shared Component Library  EUI Consistency Mandate (NEW)

> **Effective Date:** 2026-06-23  
> **Target:** All frontend developers  

This section is a quick-start guide for the new UI consistency enforcement mechanism. To ensure all 5 dashboards look identical and follow the design system (§9 of `02_開発ルール`), we have completed the shared component library and added strict CI enforcement.

### 16.1 The Problem Being Solved

Previously, developers were reading the design system document but building their own components (e.g., inline `<span>` tags for status badges, custom tables, custom filter bars). This resulted in 5 different UI layouts.

**The Fix:** The design system is now codified into reusable React components. You **must** import these components instead of building your own.

### 16.2 The Mandatory Components

You must use these components for all dashboard UI construction. You can import them individually or via the barrel export (`import { KpiCard, StatusBadge } from '../../components/shared';`).

| Component | What it does | Required Usage |
|:---|:---|:---|
| `DashboardKpiGrid` | Wrapper that enforces exactly 4 columns and correct spacing (§9.5.7) | Use to wrap all KPI cards at the top of your dashboard. |
| `KpiCard` | Individual summary metric card with trend/icon (§9.5.7) | Place inside `DashboardKpiGrid`. |
| `StatusBadge` | Colored pill for workflow state (§9.2.2) | Use anywhere a `statusId` is displayed (tables, details). |
| `SearchFilterBar` | Composable top bar with inputs, dropdowns, dates, and buttons | Use for all list/table filtering. Handles the mandatory 300ms debounce automatically. |
| `DataTable` | Sortable, paginated table structure (§9.5.2) | Use for all list views. |
| `RefreshButton` | Standardized refresh action (§9.5.4 Secondary variant) | Use for manual data refetching. |
| `PageHeader` | Standardized title, subtitle, and action area | Use at the top of all main pages. |

### 16.3 Step-by-Step Migration Guide (Phase 2)

If you are working on a feature branch created before June 23, 2026, you must complete these steps before your next PR:

#### Step 1: Rebase to get the new components
```bash
git checkout feature/{your-role}-{your-name}
git fetch origin
git rebase origin/develop
# Or `git merge origin/develop` if you prefer merging
```

#### Step 2: Run the CI Scanner locally
We added STEP 4 to `verify-all.sh`. It will scan your module and tell you exactly which local components you need to delete.
```bash
bash scripts/verify-all.sh
```

#### Step 3: Delete local duplicates and replace with imports
If the scanner finds a duplicate (e.g., `ApplicantStatusBadge`), delete that file. Go to where it was used and import the shared version instead:
```tsx
// ❁EDelete this:
// import { ApplicantStatusBadge } from './components/ApplicantStatusBadge';

// ✁EAdd this:
import { StatusBadge } from '../../components/shared';

// Usage is the same:
<StatusBadge statusId={request.status_id} />
```

#### Step 4: Verify
Run `bash scripts/verify-all.sh` again. It should report:
`✁ENo inline component duplicates detected.`

### 16.4 AI Guardrails

We have updated `.github/copilot-instructions.md`. Your AI agent is now explicitly instructed to use these shared components and forbidden from generating local copies. If your AI agent generates a duplicate `StatusBadge` or custom filter bar, **reject the output** and tell it to use the shared library.
