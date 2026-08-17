# Environment Setup Guide (環境構築ガイド)

# Cosmetics Finder
# Environment Setup Guide

**OS:** Windows 10/11  
**Stack:** NestJS 11 + TypeScript 5.7+ + Prisma 6 + PostgreSQL 16 + Redis 7 + React 19 + Vite 6 + Tailwind CSS 4 + React Router 7  
**Last Updated:** 2026-08-14

---

## Table of Contents

1. [Prerequisites Overview](#1-prerequisites-overview)
2. [Step 1 — Install Node.js & npm](#2-step-1--install-nodejs--npm)
3. [Step 2 — Install Git](#3-step-2--install-git)
4. [Step 3 — Install PostgreSQL 16](#4-step-3--install-postgresql-16)
5. [Step 4 — Add PostgreSQL to System PATH](#5-step-4--add-postgresql-to-system-path)
6. [Step 5 — Install Redis (Memurai for Windows)](#6-step-5--install-redis-memurai-for-windows)
7. [Step 6 — Create Database](#7-step-6--create-database)
8. [Step 7 — Backend Setup](#8-step-7--backend-setup)
9. [Step 8 — Frontend Setup](#9-step-8--frontend-setup)
10. [Step 9 — Create .gitignore](#10-step-9--create-gitignore)
11. [Step 10 — Final Verification Checklist](#11-step-10--final-verification-checklist)
12. [NPM Packages Reference](#12-npm-packages-reference)
13. [Troubleshooting](#13-troubleshooting)
14. [Database Schema Management Reference](#database-schema-management-reference)

---

## 1. Prerequisites Overview

Before starting, you need the following installed and running:

| # | Software | Minimum Version | Purpose |
|---|----------|-----------------|---------|
| 1 | Node.js | v22+ (LTS) | JavaScript runtime |
| 2 | npm | v10+ | Package manager (comes with Node.js) |
| 3 | Git | v2.30+ | Version control |
| 4 | PostgreSQL | v16+ | Primary database |
| 5 | Redis (Memurai) | v4+ | Cache & session store |

---

## 2. Step 1 — Install Node.js & npm

### Check if already installed

Open **PowerShell** and run:

```powershell
node --version
npm --version
```

**Expected output:**
```
v22.x.x    (or any version v22+)
10.x.x     (or any version v10+)
```

### If NOT installed

**Option A — Official Installer (Recommended):**

1. Go to https://nodejs.org/
2. Download the **LTS** version (recommended for stability)
3. Run the installer:
   - Accept the license agreement
   - Keep default installation path (`C:\Program Files\nodejs\`)
   - Check the box: **"Automatically install the necessary tools"** if prompted
4. Click **Install** → **Finish**
5. **Close and reopen PowerShell**, then verify:
   ```powershell
   node --version
   npm --version
   ```

**Option B — Via winget (if winget is available):**

```powershell
winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
```

Close and reopen PowerShell, then verify.

---

## 3. Step 2 — Install Git

### Check if already installed

```powershell
git --version
```

**Expected output:**
```
git version 2.x.x.windows.1    (or any version v2.30+)
```

### If NOT installed

**Option A — Official Installer:**

1. Go to https://git-scm.com/download/win
2. Download and run the installer
3. Use all default settings (click **Next** through each screen)
4. Click **Install** → **Finish**
5. Close and reopen PowerShell, then verify:
   ```powershell
   git --version
   ```

**Option B — Via winget:**

```powershell
winget install --id Git.Git --accept-source-agreements --accept-package-agreements
```

Close and reopen PowerShell, then verify.

---

## 4. Step 3 — Install PostgreSQL 16

### Check if already installed

```powershell
psql --version
```

**Expected output:**
```
psql (PostgreSQL) 16.x    (or any version 16+)
```

### If NOT installed

**Option A — Via winget (Recommended — Silent Install):**

```powershell
winget install --id PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements
```

> **Note:** This installs PostgreSQL silently with a randomly generated superuser password. We will handle authentication in Step 6.

**Option B — EDB Installer (Interactive — More Control):**

1. Go to https://www.postgresql.org/download/windows/
2. Click **"Download the installer"** (EDB)
3. Choose **PostgreSQL 16** for Windows x86-64
4. Run the installer:
   - Installation directory: keep default (`C:\Program Files\PostgreSQL\16`)
   - Select components: **PostgreSQL Server**, **pgAdmin 4**, **Command Line Tools**
   - Data directory: keep default
   - **Set a superuser password** — write this down! (e.g., `postgres123`)
   - Port: keep default **5432**
   - Locale: keep default
5. Click **Next** → **Finish**

### Verify the service is running

```powershell
Get-Service -Name "postgresql*"
```

**Expected output:**
```
Status   Name               DisplayName
------   ----               -----------
Running  postgresql-x64-16  postgresql-x64-16 - PostgreSQL Serv...
```

If the status shows **Stopped**, start it:
```powershell
net start postgresql-x64-16
```

---

## 5. Step 4 — Add PostgreSQL to System PATH

After installing PostgreSQL, the `psql` command may not be recognized in new terminals. You need to add PostgreSQL's `bin` directory to your system PATH.

### Check if it's already in PATH

```powershell
psql --version
```

If this returns an error like `'psql' is not recognized`, follow the steps below.

### Add to PATH (GUI Method)

1. Press **Win + S**, search for **"Environment Variables"**
2. Click **"Edit the system environment variables"**
3. In the System Properties window, click the **"Environment Variables..."** button
4. Under **System variables**, find and select **Path**, then click **Edit**
5. Click **New** and add:
   ```
   C:\Program Files\PostgreSQL\16\bin
   ```
6. Click **OK** on all three dialogs to save

### Add to PATH (PowerShell — Temporary for current session)

If you just need it working right now without restarting:

```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
```

> **Important:** This only lasts for the current PowerShell session. Use the GUI method above for a permanent fix.

### Verify

Close and reopen PowerShell (if you used the GUI method), then:

```powershell
psql --version
```

**Expected output:**
```
psql (PostgreSQL) 16.x
```

---

## 6. Step 5 — Install Redis (Memurai for Windows)

Redis does not have an official Windows build. **Memurai** is a Redis-compatible server that runs natively on Windows. It is free for development use.

### Check if already installed

```powershell
redis-cli ping
```

**Expected output:**
```
PONG
```

### If NOT installed

**Option A — Via winget (Recommended):**

```powershell
winget install --id Memurai.MemuraiDeveloper --accept-source-agreements --accept-package-agreements
```

> **What happens:** Memurai installs as a **Windows Service** and starts automatically. It listens on port **6379** (same as Redis) with **no password** by default.

**Option B — Redis for Windows (Chocolatey):**

```powershell
choco install redis-64
```

**Option C — Docker:**

```powershell
# Install Docker Desktop first (https://www.docker.com/products/docker-desktop/)
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Verify installation

Close and reopen PowerShell, then:

```powershell
# Test connection
redis-cli ping

# Check version
redis-cli --version
```

**Expected output:**
```
PONG
redis-cli 7.x.x
```

---

## 7. Step 6 — Create Database

Now we need to create the project's database in PostgreSQL.

### If you used the EDB Installer (Interactive)

You chose a superuser password during installation. Use that password:

```powershell
# Connect to PostgreSQL as superuser
psql -U postgres -h 127.0.0.1

# You will be prompted for the password you set during installation
```

### If you used winget (Silent Install)

The winget installer sets a random superuser password. To get around this, we temporarily set the authentication to "trust" mode:

**Step A — Change authentication to trust:**

```powershell
# Find and edit pg_hba.conf
notepad "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
```

Find this line:
```
host    all             all             127.0.0.1/32            scram-sha-256
```

Change it to:
```
host    all             all             127.0.0.1/32            trust
```

Save the file and close Notepad.

**Step B — Restart PostgreSQL to apply the change:**

```powershell
# Option 1: Using pg_ctl
pg_ctl restart -D "C:\Program Files\PostgreSQL\16\data"

# Option 2: Using Windows Services (may require admin)
net stop postgresql-x64-16
net start postgresql-x64-16
```

**Step C — Test the connection (no password needed now):**

```powershell
psql -U postgres -h 127.0.0.1 -c "SELECT 1 AS test;"
```

**Expected output:**
```
 test
------
    1
(1 row)
```

### Create the database

```powershell
# Create the database
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE cosmetics_finder;"

# Grant all privileges
psql -U postgres -h 127.0.0.1 -c "GRANT ALL PRIVILEGES ON DATABASE cosmetics_finder TO postgres;"
```

**Expected output for each command:**
```
CREATE DATABASE
GRANT
```

### Restore secure authentication

After creating the database, change `pg_hba.conf` back to secure mode:

```powershell
notepad "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
```

Change the line back to:
```
host    all             all             127.0.0.1/32            scram-sha-256
```

Save the file, then reload the config:

```powershell
pg_ctl reload -D "C:\Program Files\PostgreSQL\16\data"
```

### Verify the database was created

```powershell
psql -U postgres -h 127.0.0.1 -d cosmetics_finder -c "SELECT current_database();"
```

**Expected output:**
```
  current_database
-------------------
 cosmetics_finder
(1 row)
```

---

## 8. Step 7 — Backend Setup

### 8.1 Navigate to backend folder

```powershell
cd backend
```

### 8.2 Install Dependencies

```powershell
npm install
```

### 8.3 Configure Environment Variables

```powershell
# Copy the example env file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ==========================================
# Cosmetics Finder
# Backend Environment Configuration
# ==========================================

# --- Database (PostgreSQL) ---
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cosmetics_finder?schema=public"

# --- Redis ---
REDIS_URL="redis://localhost:6379"

# --- JWT Authentication ---
JWT_ACCESS_SECRET="skm-access-secret-dev-2026-change-in-production"
JWT_REFRESH_SECRET="skm-refresh-secret-dev-2026-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# --- Server ---
NODE_ENV="development"
PORT=8080
API_PREFIX="api/v1"

# --- CORS (frontend URL) ---
CORS_ORIGIN="http://localhost:3000"

# --- Frontend API URL ---
VITE_API_BASE_URL="http://localhost:8080/api/v1"
```

### 8.4 Initialize Database

```powershell
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed the database with sample data
npm run db:seed
```

### 8.5 Start Backend Server

```powershell
# Development mode (with hot reload)
npm run start:dev
```

**Expected output:**
```
Nest application successfully started
Application is running on: http://localhost:8080
Swagger documentation: http://localhost:8080/api/docs
```

The backend starts at: **http://localhost:8080**  
API Documentation: **http://localhost:8080/api/docs** (Swagger)

---

## 9. Step 8 — Frontend Setup

### 9.1 Open a NEW terminal

Keep the backend running and open a new PowerShell window.

### 9.2 Navigate to frontend folder

```powershell
cd C:\path\to\skin-analysis\frontend
```

### 9.3 Install Dependencies

```powershell
npm install
```

### 9.4 Configure Environment Variables

```powershell
cp .env.example .env
```

Edit `.env`:

```env
# ==========================================
# Cosmetics Finder
# Frontend Environment Configuration
# ==========================================

VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_APP_NAME=SkincareAI
```

### 9.5 Start Frontend Server

```powershell
npm run dev
```

**Expected output:**
```
VITE v6.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

The frontend starts at: **http://localhost:3000** (auto-opens in browser)

---

## 10. Step 9 — Create .gitignore

A `.gitignore` file is already included in the repository. However, if you need to recreate it, here's what it should contain:

### Root `.gitignore`

```gitignore
# Dependencies
node_modules/

# Environment
.env
.env.local

# Logs
*.log
server.err.log
server.log

# Lock files
package-lock.json

# Build
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Prisma
generated/
```

### Backend `.gitignore`

```gitignore
node_modules/

# Environment
.env

# Generated Prisma
/generated/prisma

# Logs
*.log
server.err.log
server.log

# Lock files
package-lock.json

# Build
dist/
```

### Frontend `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build
dist/
dist-ssr/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/*
!.vscode/extensions.json
.idea

# OS
.DS_Store
Thumbs.db

# Debug
npm-debug.log*

# Lock files
package-lock.json
```

### Important Notes about `.gitignore`

- **`package-lock.json`** — Ignored because each member may have different npm versions, causing conflicts
- **`server.log` / `server.err.log`** — Ignored because these are auto-generated when running the server
- **`dist/`** — Ignored because this is the build output directory

---

## 11. Step 10 — Final Verification Checklist

Run this complete verification script in PowerShell to confirm everything is ready:

```powershell
Write-Host "========================================"
Write-Host " ENVIRONMENT VERIFICATION REPORT"
Write-Host " Cosmetics Finder"
Write-Host "========================================"
Write-Host ""

# 1. Node.js
Write-Host "1. Node.js:    $(node --version)"

# 2. npm
Write-Host "2. npm:        $(npm --version)"

# 3. Git
Write-Host "3. Git:        $(git --version)"

# 4. PostgreSQL
Write-Host "4. PostgreSQL: $(psql --version)"

# 5. Database Connection Test
$dbTest = psql -U postgres -h 127.0.0.1 -d cosmetics_finder -t -c "SELECT 'OK: ' || current_database();"
Write-Host "   DB Connection: $($dbTest.Trim())"

# 6. Redis
$redisTest = redis-cli ping
Write-Host "5. Redis:      PING -> $redisTest"

# 7. .env file (backend)
Write-Host "6. Backend .env:  $(if (Test-Path 'backend/.env') { 'EXISTS' } else { 'MISSING' })"

# 8. .gitignore (root)
Write-Host "7. .gitignore: $(if (Test-Path '.gitignore') { 'EXISTS' } else { 'MISSING' })"

Write-Host ""
Write-Host "========================================"
Write-Host " ALL CHECKS COMPLETE"
Write-Host "========================================"
```

### Expected Output (All Passing)

```
========================================
 ENVIRONMENT VERIFICATION REPORT
 Cosmetics Finder
========================================

1. Node.js:    v22.x.x
2. npm:        10.x.x
3. Git:        git version 2.x.x.windows.1
4. PostgreSQL: psql (PostgreSQL) 16.x
   DB Connection: OK: cosmetics_finder
5. Redis:      PING -> PONG
6. Backend .env:  EXISTS
7. .gitignore: EXISTS

========================================
 ALL CHECKS COMPLETE
========================================
```

If all items show green/OK, your environment is **100% ready**.

---

## 12. NPM Packages Reference

These packages are already installed in the project. **You do NOT need to install them manually** — they are installed when you run `npm install`.

### Backend (NestJS + Prisma)

| Package | Purpose |
|---------|---------|
| `@nestjs/common` | Core decorators and utilities |
| `@nestjs/core` | Application core |
| `@nestjs/platform-express` | Express.js HTTP adapter |
| `@nestjs/config` | `.env` file management |
| `@nestjs/jwt` | JWT token generation/verification |
| `@nestjs/passport` | Authentication middleware |
| `@nestjs/swagger` | Swagger API documentation & annotations |
| `@prisma/client` | Prisma ORM client |
| `prisma` | Prisma CLI |
| `ioredis` | Redis client |
| `argon2` | Password hashing |
| `class-validator` | DTO validation decorators |
| `class-transformer` | Object transformation utilities |

### Frontend (React + Vite)

| Package | Purpose |
|---------|---------|
| `react` | UI library |
| `react-dom` | React DOM rendering |
| `react-router` | Client-side routing (React Router v7) |
| `@tanstack/react-query` | Server state management |
| `react-hook-form` | Form handling |
| `zod` | Schema validation |
| `axios` | HTTP client |
| `i18next` | Internationalization |
| `tailwindcss` | Tailwind CSS v4 framework |
| `@tailwindcss/vite` | Vite plugin for Tailwind CSS v4 |
| `lucide-react` | Icon library |
| `sonner` | Toast notification library |
| `shadcn/ui` | UI components (Radix UI primitives) |

---

## 13. Troubleshooting

### Problem: `psql` not recognized after PostgreSQL installation

**Cause:** PostgreSQL's `bin` directory is not in your system PATH.  
**Fix:** See [Step 4 — Add PostgreSQL to System PATH](#5-step-4--add-postgresql-to-system-path).

### Problem: PostgreSQL service won't start

```powershell
# Check service status
Get-Service -Name "postgresql*"

# Try starting manually
net start postgresql-x64-16

# Check PostgreSQL logs for errors
Get-Content "C:\Program Files\PostgreSQL\16\data\log" -Tail 30
```

### Problem: Cannot connect to PostgreSQL — "password authentication failed"

**Cause:** You don't know the superuser password (common with winget install).  
**Fix:** Temporarily change `pg_hba.conf` to use `trust` authentication. See [Step 6](#7-step-6--create-database) for detailed instructions.

### Problem: `redis-cli` not recognized

**Cause:** Redis is not installed or not in PATH.  
**Fix:** Close and reopen PowerShell. If still not recognized, check if Redis is installed:
```powershell
Get-Service -Name "Redis"
```
If not found, install Redis:
```powershell
winget install --id Memurai.MemuraiDeveloper --accept-source-agreements --accept-package-agreements
```

### Problem: Port already in use (8080 or 3000)

```powershell
# Check what's using port 8080 (backend)
netstat -ano | findstr :8080

# Check what's using port 3000 (frontend)
netstat -ano | findstr :3000

# Kill the process using the port
taskkill /PID <PID> /F
```

### Problem: Prisma client not generated

```powershell
cd backend
npx prisma generate
```

### Problem: "Drift detected" when running `npm run db:migrate`

**Cause:** The database schema is out of sync with migration history. This happens when:
- `npm run db:push` was used instead of `npm run db:migrate`
- Tables were manually created or modified
- Migrations were applied on a different branch without committing migration files

**Fix — Option A (Reset database — dev only, loses all data):**

```powershell
cd backend

# Reset database and reapply all migrations
npx prisma migrate reset --force

# Regenerate Prisma client
npm run db:generate

# (Optional) Re-seed with sample data
npm run db:seed
```

**Fix — Option B (Keep data, create migration for drift):**

```powershell
cd backend

# Accept the current schema state as a new migration
npx prisma migrate dev --accept-data-loss
```

> **Warning:** Option B may cause data loss if columns/tables were added outside of migrations.

### Problem: Schema changed but no migration file created

**Cause:** `npm run db:push` was used instead of `npm run db:migrate`. The `db:push` command syncs schema directly without creating a migration file, which causes drift.

**Fix:**

```powershell
cd backend

# Reset to clean state
npx prisma migrate reset --force

# Create proper migration
npm run db:migrate

# Regenerate client
npm run db:generate
```

> **Important:** Always use `npm run db:migrate` (not `db:push`) when working with a team. Migration files must be committed to git so other developers can apply them.

### Problem: `db:push` vs `db:migrate` — When to use which?

| Command | Creates Migration File | Safe for Team | When to Use |
|---------|----------------------|---------------|-------------|
| `npm run db:push` | No | No | Quick prototyping, solo development only |
| `npm run db:migrate` | Yes | Yes | **Always use this** when working with others |

**Rule of thumb:** If the code is in git and other people will pull it, **always use `npm run db:migrate`**.

### Problem: Frontend build errors

```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Problem: `winget` is not recognized

**Cause:** Windows Package Manager is not installed (older Windows 10 builds).  
**Fix:** Install from the Microsoft Store: search for **"App Installer"** by Microsoft, or download from https://github.com/microsoft/winget-cli/releases

---

## Summary of Connection Details

| Service | Host | Port | Username | Password | Database |
|---------|------|------|----------|----------|----------|
| PostgreSQL | localhost | 5432 | postgres | (your password) | cosmetics_finder |
| Redis | localhost | 6379 | — | *(none in dev)* | — |
| Backend API | localhost | 8080 | — | — | — |
| Frontend | localhost | 3000 | — | — | — |
| Swagger Docs | localhost | 8080/api/docs | — | — | — |

---

## Quick Start (TL;DR)

```powershell
# 1. Start PostgreSQL and Redis (should be running as services)

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed        # (Optional) Load sample data
npm run start:dev

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## Database Schema Management Reference

### Common Commands

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Regenerate Prisma Client after schema changes |
| `npm run db:migrate` | Create migration file + apply to database |
| `npm run db:push` | Sync schema directly (no migration file — **avoid for teams**) |
| `npm run db:seed` | Load sample data into database |
| `npm run db:studio` | Open Prisma Studio (GUI to view/edit data) |
| `npx prisma migrate reset` | Drop and recreate database, reapply all migrations |

### After Changing `schema.prisma`

Always follow this order:

```powershell
cd backend

# 1. Generate Prisma Client
npm run db:generate

# 2. Create migration and apply
npm run db:migrate

# 3. Verify (optional)
npm run db:studio
```

### If You Accidentally Used `db:push`

```powershell
cd backend

# Reset database (loses all data)
npx prisma migrate reset --force

# Re-apply migrations properly
npm run db:migrate
npm run db:generate
npm run db:seed        # (Optional)
```

---

*End of Environment Setup Guide*
