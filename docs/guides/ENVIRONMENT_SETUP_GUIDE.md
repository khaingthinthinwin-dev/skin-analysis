# ENVIRONMENT_SETUP_GUIDE.md

# Payment Request Workflow Management System
# Environment Setup Guide (環境構築ガイド)

**OS:** Windows 10/11  
**Stack:** NestJS + TypeScript + TypeORM + PostgreSQL + Redis  
**Last Updated:** 2026-06-10

---

## Table of Contents

1. [Prerequisites Overview](#1-prerequisites-overview)
2. [Step 1 — Install Node.js & npm](#2-step-1--install-nodejs--npm)
3. [Step 2 — Install Git](#3-step-2--install-git)
4. [Step 3 — Install PostgreSQL 16](#4-step-3--install-postgresql-16)
5. [Step 4 — Add PostgreSQL to System PATH](#5-step-4--add-postgresql-to-system-path)
6. [Step 5 — Install Redis (Memurai for Windows)](#6-step-5--install-redis-memurai-for-windows)
7. [Step 6 — Install NestJS CLI](#7-step-6--install-nestjs-cli)
8. [Step 7 — Create Database & User](#8-step-7--create-database--user)
9. [Step 8 — Configure .env File](#9-step-8--configure-env-file)
10. [Step 9 — Create .gitignore](#10-step-9--create-gitignore)
11. [Step 10 — Final Verification Checklist](#11-step-10--final-verification-checklist)
12. [NPM Packages Reference](#12-npm-packages-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites Overview

Before starting Phase 3 implementation, you need the following installed and running:

| # | Software | Minimum Version | Purpose |
|---|----------|-----------------|---------|
| 1 | Node.js | v18+ | JavaScript runtime |
| 2 | npm | v9+ | Package manager (comes with Node.js) |
| 3 | Git | v2.30+ | Version control |
| 4 | PostgreSQL | v13+ (recommended v16) | Primary database |
| 5 | Redis (Memurai) | v4+ | Cache & session store |
| 6 | NestJS CLI | v10+ | Project scaffolding & development |

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
v24.14.0    (or any version v18+)
11.9.0      (or any version v9+)
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
git version 2.53.0.windows.1    (or any version v2.30+)
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
psql (PostgreSQL) 16.14    (or any version 13+)
```

### If NOT installed

**Option A — Via winget (Recommended — Silent Install):**

```powershell
winget install --id PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements
```

> **Note:** This installs PostgreSQL silently with a randomly generated superuser password. We will handle authentication in [Step 7](#8-step-7--create-database--user).

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
psql (PostgreSQL) 16.14
```

---

## 6. Step 5 — Install Redis (Memurai for Windows)

Redis does not have an official Windows build. **Memurai** is a Redis-compatible server that runs natively on Windows. It is free for development use.

### Check if already installed

```powershell
memurai-cli ping
```

**Expected output:**
```
PONG
```

### If NOT installed

**Via winget (Recommended):**

```powershell
winget install --id Memurai.MemuraiDeveloper --accept-source-agreements --accept-package-agreements
```

> **What happens:** Memurai installs as a **Windows Service** and starts automatically. It listens on port **6379** (same as Redis) with **no password** by default.

### Verify installation

Close and reopen PowerShell, then:

```powershell
# Test connection
memurai-cli ping

# Check version and port
memurai-cli info server | Select-String "memurai_version|tcp_port"
```

**Expected output:**
```
PONG

memurai_version:4.1.2
tcp_port:6379
```

### Alternative Redis Options

If you prefer not to use Memurai:

**Option B — WSL2 (Windows Subsystem for Linux):**
```powershell
# Enable WSL (requires restart)
wsl --install

# Inside WSL Ubuntu terminal:
sudo apt update
sudo apt install redis-server -y
sudo service redis-server start
redis-cli ping    # Should return PONG
```

**Option C — Docker:**
```powershell
# Install Docker Desktop first (https://www.docker.com/products/docker-desktop/)
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

---

## 7. Step 6 — Install NestJS CLI

### Check if already installed

```powershell
nest --version
```

**Expected output:**
```
11.0.23    (or any version 10+)
```

### If NOT installed

```powershell
npm install -g @nestjs/cli
```

### Verify

```powershell
nest --version
```

**Expected output:**
```
11.0.23
```

> **Tip:** If `nest` is not recognized after install, close and reopen PowerShell.

---

## 8. Step 7 — Create Database & User

Now we need to create the project's database and a dedicated user in PostgreSQL.

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

### Create the user and database

```powershell
# Create the application user with a password
psql -U postgres -h 127.0.0.1 -c "CREATE USER prwm_admin WITH PASSWORD 'prwm_dev_2026' CREATEDB;"

# Create the database owned by the new user
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE payment_request_db OWNER prwm_admin;"

# Grant all privileges
psql -U postgres -h 127.0.0.1 -c "GRANT ALL PRIVILEGES ON DATABASE payment_request_db TO prwm_admin;"
```

**Expected output for each command:**
```
CREATE ROLE
CREATE DATABASE
GRANT
```

### Restore secure authentication

After creating the user and database, change `pg_hba.conf` back to secure mode:

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

### Verify the new user can connect

```powershell
$env:PGPASSWORD = "prwm_dev_2026"
psql -U prwm_admin -h 127.0.0.1 -d payment_request_db -c "SELECT current_database(), current_user;"
```

**Expected output:**
```
  current_database  | current_user
--------------------+--------------
 payment_request_db | prwm_admin
(1 row)
```

---

## 9. Step 8 — Configure .env File

Create a file named `.env` in the project root directory:

```
PaymentRequestWorkflowManagement/
├── .env                        ← Create this file
├── .gitignore
├── DESIGN_SPECIFICATION.md
├── REQUIREMENT_DEFINITION.md
└── 支払申請書_YYYYMMDD_社員番号_社員名.xlsx
```

### .env Contents

Copy and paste the following into `.env`:

```env
# ==========================================
# Payment Request Workflow Management System
# Environment Configuration
# ==========================================

# --- Application ---
APP_NAME=PaymentRequestWorkflowManagement
APP_PORT=3000
APP_ENV=development
APP_URL=http://localhost:3000

# --- PostgreSQL Database ---
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=prwm_admin
DB_PASSWORD=prwm_dev_2026
DB_DATABASE=payment_request_db
DB_SYNCHRONIZE=true
DB_LOGGING=true
DB_SSL=false

# --- Redis ---
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# --- JWT Authentication ---
JWT_SECRET=prwm-jwt-secret-dev-2026-change-in-production
JWT_EXPIRATION=3600s
JWT_REFRESH_SECRET=prwm-refresh-secret-dev-2026-change-in-production
JWT_REFRESH_EXPIRATION=7d

# --- File Upload ---
UPLOAD_DEST=./uploads
MAX_FILE_SIZE=10485760

# --- WebSocket ---
WS_PORT=3001
WS_CORS_ORIGIN=http://localhost:5173

# --- Logging ---
LOG_LEVEL=debug
```

### Important Security Notes

- **`DB_SYNCHRONIZE=true`** — This is for development ONLY. In production, use TypeORM migrations instead.
- **`REDIS_PASSWORD=`** — Memurai has no password by default in dev. Set a password in production.
- **`JWT_SECRET`** — Change ALL secret keys before deploying to production.
- **Never commit `.env` to Git** — It is already listed in `.gitignore`.

---

## 10. Step 9 — Create .gitignore

Create a file named `.gitignore` in the project root directory with the following content:

```gitignore
# Dependencies
node_modules/
dist/

# Environment
.env
.env.local
.env.production

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Uploads (local development)
uploads/

# Logs
*.log
logs/

# Test coverage
coverage/

# Build
build/
```

---

## 11. Step 10 — Final Verification Checklist

Run this complete verification script in PowerShell to confirm everything is ready:

```powershell
Write-Host "========================================"
Write-Host " ENVIRONMENT VERIFICATION REPORT"
Write-Host "========================================"
Write-Host ""

# 1. Node.js
Write-Host "1. Node.js:    $(node --version)"

# 2. npm
Write-Host "2. npm:        $(npm --version)"

# 3. Git
Write-Host "3. Git:        $(git --version)"

# 4. NestJS CLI
Write-Host "4. NestJS CLI: $(nest --version)"

# 5. PostgreSQL
Write-Host "5. PostgreSQL: $(psql --version)"

# 6. Database Connection Test
$env:PGPASSWORD = "prwm_dev_2026"
$dbTest = psql -U prwm_admin -h 127.0.0.1 -d payment_request_db -t -c "SELECT 'OK: ' || current_database() || ' as ' || current_user;"
Write-Host "   DB Connection: $($dbTest.Trim())"

# 7. Redis (Memurai)
$redisTest = memurai-cli ping
Write-Host "6. Redis:      PING -> $redisTest"

# 8. .env file
Write-Host "7. .env file:  $(if (Test-Path '.env') { 'EXISTS' } else { 'MISSING' })"

# 9. .gitignore
Write-Host "8. .gitignore: $(if (Test-Path '.gitignore') { 'EXISTS' } else { 'MISSING' })"

Write-Host ""
Write-Host "========================================"
Write-Host " ALL CHECKS COMPLETE"
Write-Host "========================================"
```

### Expected Output (All Passing)

```
========================================
 ENVIRONMENT VERIFICATION REPORT
========================================

1. Node.js:    v24.14.0
2. npm:        11.9.0
3. Git:        git version 2.53.0.windows.1
4. NestJS CLI: 11.0.23
5. PostgreSQL: psql (PostgreSQL) 16.14
   DB Connection: OK: payment_request_db as prwm_admin
6. Redis:      PING -> PONG
7. .env file:  EXISTS
8. .gitignore: EXISTS

========================================
 ALL CHECKS COMPLETE
========================================
```

If all items show green/OK, your environment is **100% ready** for Phase 3 implementation.

---

## 12. NPM Packages Reference

These packages will be installed when we scaffold the NestJS project. **You do NOT need to install them manually** — they will be installed automatically during project setup.

### Core NestJS (auto-installed by `nest new`)

| Package | Purpose |
|---------|---------|
| `@nestjs/common` | Core decorators and utilities |
| `@nestjs/core` | Application core |
| `@nestjs/platform-express` | Express.js HTTP adapter |
| `reflect-metadata` | TypeScript decorator support |
| `rxjs` | Reactive programming (NestJS dependency) |

### TypeORM + PostgreSQL

| Package | Purpose |
|---------|---------|
| `@nestjs/typeorm` | NestJS TypeORM integration module |
| `typeorm` | Object-Relational Mapping framework |
| `pg` | PostgreSQL driver for Node.js |

### Redis & Caching

| Package | Purpose |
|---------|---------|
| `@nestjs/cache-manager` | NestJS caching module |
| `cache-manager` | Caching abstraction layer |
| `cache-manager-redis-store` | Redis adapter for cache-manager |
| `redis` | Redis client for Node.js |

### Configuration & Validation

| Package | Purpose |
|---------|---------|
| `@nestjs/config` | `.env` file management |
| `class-validator` | DTO validation decorators |
| `class-transformer` | Object transformation utilities |
| `joi` | Schema validation for config |

### Authentication & Security

| Package | Purpose |
|---------|---------|
| `@nestjs/jwt` | JWT token generation/verification |
| `@nestjs/passport` | Authentication middleware |
| `passport` | Authentication framework |
| `passport-jwt` | JWT passport strategy |
| `passport-local` | Username/password strategy |
| `bcrypt` | Password hashing |

### WebSocket (Real-Time)

| Package | Purpose |
|---------|---------|
| `@nestjs/websockets` | NestJS WebSocket module |
| `@nestjs/platform-socket.io` | Socket.io adapter |
| `socket.io` | WebSocket library |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `typescript` | TypeScript compiler |
| `@types/node` | Node.js type definitions |
| `@types/bcrypt` | bcrypt type definitions |
| `@types/passport-jwt` | passport-jwt type definitions |
| `@types/passport-local` | passport-local type definitions |
| `@types/cache-manager-redis-store` | Redis store types |
| `ts-node` | TypeScript execution |
| `tsconfig-paths` | Path alias support |
| `@nestjs/testing` | NestJS testing utilities |
| `jest` & `ts-jest` | Testing framework |
| `eslint` & `prettier` | Linting & formatting |

### Frontend Dependencies (React + Vite)

| Package | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing for role-based dashboards |
| `axios` | HTTP client for API requests |
| `lucide-react` | SVG icons for the UI |
| `clsx` & `tailwind-merge` | Utility for conditionally joining Tailwind CSS classes |

### Install Commands (for reference)

```powershell
# Backend Production dependencies
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/cache-manager cache-manager cache-manager-redis-store redis
npm install @nestjs/config class-validator class-transformer joi
npm install @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

# Backend Dev dependencies
npm install -D @types/bcrypt @types/passport-jwt @types/passport-local @types/cache-manager-redis-store

# Frontend Dependencies (run in /frontend)
npm install react-router-dom axios lucide-react clsx tailwind-merge
```

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
**Fix:** Temporarily change `pg_hba.conf` to use `trust` authentication. See [Step 7](#8-step-7--create-database--user) for detailed instructions.

### Problem: `memurai-cli` not recognized

**Cause:** Memurai's directory is not in PATH or Memurai is not installed.  
**Fix:** Close and reopen PowerShell. If still not recognized, check if Memurai is installed:
```powershell
Get-Service -Name "Memurai"
```
If not found, reinstall:
```powershell
winget install --id Memurai.MemuraiDeveloper --accept-source-agreements --accept-package-agreements
```

### Problem: `nest` command not recognized after `npm install -g @nestjs/cli`

**Fix:** Close and reopen PowerShell, or check the global npm bin directory is in PATH:
```powershell
npm config get prefix
# Add the output path to your system PATH if needed
```

### Problem: Redis connection refused on port 6379

**Cause:** Memurai service is not running.  
**Fix:**
```powershell
# Check service status
Get-Service -Name "Memurai"

# Start the service
net start Memurai
```

### Problem: `winget` is not recognized

**Cause:** Windows Package Manager is not installed (older Windows 10 builds).  
**Fix:** Install from the Microsoft Store: search for **"App Installer"** by Microsoft, or download from https://github.com/microsoft/winget-cli/releases

---

## Summary of Connection Details

| Service | Host | Port | Username | Password | Database |
|---------|------|------|----------|----------|----------|
| PostgreSQL | localhost | 5432 | prwm_admin | prwm_dev_2026 | payment_request_db |
| Redis (Memurai) | localhost | 6379 | — | *(none in dev)* | — |
| NestJS App | localhost | 3000 | — | — | — |
| WebSocket | localhost | 3001 | — | — | — |

---

*End of Environment Setup Guide*
