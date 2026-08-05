# PRWM Quick Setup Guide (環境構築・自動セットアップ)

This guide provides a one-click automated setup process for developers joining the Payment Request Workflow Management (PRWM) project.

## What does this do?

Instead of manually running commands and importing the database (which can cause `permission denied` errors if done incorrectly), the automated script (`setup.js`) will:
1. **Install Backend Dependencies** (`npm install` in the root).
2. **Install Frontend Dependencies** (`npm install` in `/frontend` including React, Vite, Tailwind, etc.).
3. **Restore Database Safely**: Connects to PostgreSQL as `prwm_admin`, drops the old schema, and correctly imports `payment_request_db_backup.sql` so that `prwm_admin` retains full ownership and prevents any `permission denied for table users` errors.
4. **Fix Password Hashes**: Automatically uses the corrected `bcrypt` hashes inside the SQL file so `Password@123` works immediately.

## Prerequisites

Ensure you have completed the prerequisite installations from the [ENVIRONMENT_SETUP_GUIDE.md](./ENVIRONMENT_SETUP_GUIDE.md):
- Node.js (v18+)
- PostgreSQL 16 (with `payment_request_db` created and `prwm_admin` user configured)

## Running the Setup

Simply open a terminal in the root directory of the project and run:

```bash
node setup.js
```

### Expected Output
```text
=========================================
 PRWM Automated Environment Setup Script
=========================================

📦 [1/3] Installing Backend Dependencies...
✅ Backend dependencies installed successfully.

📦 [2/3] Installing Frontend Dependencies...
✅ Frontend dependencies installed successfully.

🗄️ [3/3] Restoring Database and Fixing Permissions...
   -> Connected to PostgreSQL as prwm_admin
   -> Dropping existing schema to prevent ownership conflicts...
   -> Executing payment_request_db_backup.sql...
✅ Database restoration completed successfully.

=========================================
 🎉 Setup Complete! You are ready to go.
=========================================
```

## Starting the Application

After the setup is complete, you can start both servers:

**1. Start Backend API Server**
```bash
npm run start:dev
```

**2. Start Frontend Server**
Open a new terminal tab:
```bash
cd frontend
npm run dev
```

You can now open `http://localhost:5173/login` and log in using `soehtetlin@prwm.local` with the password `Password@123`.
