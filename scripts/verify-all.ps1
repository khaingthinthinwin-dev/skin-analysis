# verify-all.ps1 — Windows PowerShell version of verify-all.sh
# Usage: .\scripts\verify-all.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Skin Analysis — Project Health Verification" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0

# ─── STEP 1: Backend ──────────────────────────────────────────────────────────
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "  STEP 1/2: Backend Quality Gates (lint, build, test)" -ForegroundColor White
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

Set-Location "$PSScriptRoot\..\backend"

Write-Host "  [1a] Running backend lint..." -NoNewline
$lint = npm run lint --silent 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✔ PASSED" -ForegroundColor Green; $passed++ }
else { Write-Host " ✖ FAILED" -ForegroundColor Red; $failed++ }

Write-Host "  [1b] Running backend build..." -NoNewline
$build = npm run build --silent 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✔ PASSED" -ForegroundColor Green; $passed++ }
else { Write-Host " ✖ FAILED" -ForegroundColor Red; $failed++ }

Write-Host "  [1c] Running backend tests..." -NoNewline
$test = npm run test --silent 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✔ PASSED" -ForegroundColor Green; $passed++ }
else { Write-Host " ✖ FAILED" -ForegroundColor Red; $failed++ }

Write-Host ""

# ─── STEP 2: Frontend ─────────────────────────────────────────────────────────
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "  STEP 2/2: Frontend Quality Gates (lint, build, test)" -ForegroundColor White
Write-Host "──────────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

Set-Location "$PSScriptRoot\..\frontend"

Write-Host "  [2a] Running frontend lint..." -NoNewline
$lint = npm run lint --silent 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✔ PASSED" -ForegroundColor Green; $passed++ }
else { Write-Host " ✖ FAILED" -ForegroundColor Red; $failed++ }

Write-Host "  [2b] Running frontend build..." -NoNewline
$build = npm run build --silent 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✔ PASSED" -ForegroundColor Green; $passed++ }
else { Write-Host " ✖ FAILED" -ForegroundColor Red; $failed++ }

Write-Host "  [2c] Running frontend tests..." -NoNewline
$test = npm run test:coverage --silent 2>&1
if ($LASTEXITCODE -eq 0) { Write-Host " ✔ PASSED" -ForegroundColor Green; $passed++ }
else { Write-Host " ✖ FAILED" -ForegroundColor Red; $failed++ }

Write-Host ""

# ─── Report ───────────────────────────────────────────────────────────────────
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  VERIFICATION REPORT" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Summary: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║  ✔  ALL CHECKS PASSED — SAFE TO COMMIT          ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Green
} else {
    Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "  ║  ✖  VERIFICATION FAILED — DO NOT COMMIT/MERGE   ║" -ForegroundColor Red
    Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
exit 0
