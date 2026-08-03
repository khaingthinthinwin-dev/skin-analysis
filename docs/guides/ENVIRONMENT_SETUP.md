# Environment Setup Guide

This guide will help you set up the **AI-Powered Skincare Marketplace** project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v22+ (LTS) | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | v16+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Redis** | v7+ | [redis.io](https://redis.io/download) |
| **npm** | v10+ | Comes with Node.js |

---

## Project Structure

```
skin-analysis/
├── backend/        # NestJS REST API (port 8080)
├── frontend/       # React SPA with Vite (port 3000)
└── docs/           # Documentation
```

---

## 1. Start Infrastructure Services

### PostgreSQL

1. Start PostgreSQL service
2. Create a database:

```sql
CREATE DATABASE skincare_marketplace;
```

3. Verify connection:

```bash
psql -U postgres -d skincare_marketplace
```

### Redis

Start Redis server (default port 6379):

```bash
# Windows: Start Redis from installation directory
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

---

## 2. Backend Setup

### Install Dependencies

```bash
cd backend
npm install
```

### Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skincare_marketplace?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (change these in production!)
JWT_ACCESS_SECRET="your-access-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# Server
NODE_ENV="development"
PORT=8080
API_PREFIX="api/v1"

# CORS (frontend URL)
CORS_ORIGIN="http://localhost:5173"

# Frontend API URL
VITE_API_BASE_URL="http://localhost:8080/api/v1"
```

### Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# (Optional) Seed the database with sample data
npm run db:seed
```

### Start Backend Server

```bash
# Development mode (with hot reload)
npm run start:dev

# Debug mode
npm run start:debug
```

The backend starts at: **http://localhost:8080**
API Documentation: **http://localhost:8080/api/docs** (Swagger)

---

## 3. Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install
```

### Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_NAME=SkincareAI
```

### Start Frontend Server

```bash
npm run dev
```

The frontend starts at: **http://localhost:3000** (auto-opens in browser)

---

## Available Scripts

### Backend Commands

| Command | Description |
|---------|-------------|
| `npm run start` | Start the app |
| `npm run start:dev` | Start in watch mode |
| `npm run start:debug` | Start in debug mode |
| `npm run start:prod` | Start production build |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:cov` | Run tests with coverage |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run dev migrations |
| `npm run db:migrate:prod` | Run production migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio (GUI) |

### Frontend Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint TypeScript/TSX files |
| `npm run test` | Run tests (Vitest) |
| `npm run test:coverage` | Run tests with coverage |

---

## Tech Stack

### Backend

- **Runtime:** Node.js v22+ (LTS)
- **Framework:** NestJS v11
- **Language:** TypeScript v5.7+
- **ORM:** Prisma v6
- **Database:** PostgreSQL v16
- **Cache:** Redis (ioredis v6)
- **Auth:** JWT (access + refresh tokens), Argon2 password hashing
- **API Docs:** Swagger/OpenAPI v11

### Frontend

- **UI Library:** React v19
- **Bundler:** Vite v6
- **Language:** TypeScript v5.7+ (strict)
- **Routing:** React Router v7
- **State:** TanStack Query v5
- **Forms:** React Hook Form + Zod
- **UI Components:** shadcn/ui (Radix UI)
- **Styling:** Tailwind CSS v4
- **i18n:** i18next (English, Myanmar, Japanese)
- **Testing:** Vitest, Testing Library, MSW v2

---

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
# Windows: Check Services or run:
pg_isready

# Reset database if needed
dropdb skincare_marketplace
createdb skincare_marketplace
npm run db:migrate
```

### Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# If not running, start Redis
redis-server
```

### Port Already in Use

```bash
# Check what's using port 8080 (backend)
netstat -ano | findstr :8080

# Check what's using port 3000 (frontend)
netstat -ano | findstr :3000

# Kill the process using the port
taskkill /PID <PID> /F
```

### Prisma Client Not Generated

```bash
cd backend
npx prisma generate
```

### Frontend Build Errors

```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

---

## Quick Start (TL;DR)

```bash
# 1. Start PostgreSQL and Redis

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run start:dev

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:3000** in your browser.
