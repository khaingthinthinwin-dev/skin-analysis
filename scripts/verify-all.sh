#!/usr/bin/env bash
# =============================================================================
# verify-all.sh — One-Stop Project Health Verification Script
# =============================================================================
# Usage:     bash scripts/verify-all.sh
#            bash scripts/verify-all.sh --ci   (non-interactive CI mode)
#
# This script is the SINGLE SOURCE OF TRUTH for checking project health.
# It uses ONLY native bash tools (grep, git) and existing npm scripts.
# Zero additional npm packages required.
# =============================================================================

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

STEP_RESULTS=()
TOTAL_STEPS=3
PASSED=0
FAILED=0
WARNED=0

# ─── Helper Functions ────────────────────────────────────────────────────────

print_header() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  Skin Analysis — Project Health Verification${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

print_step() {
  local step_num="$1"
  local step_name="$2"
  echo ""
  echo -e "${BOLD}──────────────────────────────────────────────────────────────${NC}"
  echo -e "${BOLD}  STEP ${step_num}/${TOTAL_STEPS}: ${step_name}${NC}"
  echo -e "${BOLD}──────────────────────────────────────────────────────────────${NC}"
  echo ""
}

record_pass() {
  local step_name="$1"
  STEP_RESULTS+=("${GREEN}✔ PASS${NC}  │ ${step_name}")
  PASSED=$((PASSED + 1))
}

record_fail() {
  local step_name="$1"
  STEP_RESULTS+=("${RED}✖ FAIL${NC}  │ ${step_name}")
  FAILED=$((FAILED + 1))
}

record_warn() {
  local step_name="$1"
  STEP_RESULTS+=("${YELLOW}⚠ WARN${NC}  │ ${step_name}")
  WARNED=$((WARNED + 1))
}

# ─── STEP 1: Quality Gates — Backend ────────────────────────────────────────

step_backend_quality() {
  print_step "1" "Backend Quality Gates (lint, build, test)"

  local gate_failures=0

  cd "$PROJECT_ROOT/backend"

  echo -e "  ${CYAN}[1a]${NC} Running backend lint..."
  if npm run lint --silent 2>&1; then
    echo -e "  ${GREEN}✔${NC} Backend lint: PASSED"
  else
    echo -e "  ${RED}✖${NC} Backend lint: FAILED"
    gate_failures=$((gate_failures + 1))
  fi

  echo -e "  ${CYAN}[1b]${NC} Running backend build..."
  if npm run build --silent 2>&1; then
    echo -e "  ${GREEN}✔${NC} Backend build: PASSED"
  else
    echo -e "  ${RED}✖${NC} Backend build: FAILED"
    gate_failures=$((gate_failures + 1))
  fi

  echo -e "  ${CYAN}[1c]${NC} Running backend tests..."
  if npm run test --silent 2>&1; then
    echo -e "  ${GREEN}✔${NC} Backend tests: PASSED"
  else
    echo -e "  ${RED}✖${NC} Backend tests: FAILED"
    gate_failures=$((gate_failures + 1))
  fi
  echo ""

  if [ "$gate_failures" -eq 0 ]; then
    record_pass "Backend Quality Gates (lint, build, test)"
  else
    record_fail "Backend Quality Gates — ${gate_failures} check(s) failed"
  fi
}

# ─── STEP 2: Quality Gates — Frontend ───────────────────────────────────────

step_frontend_quality() {
  print_step "2" "Frontend Quality Gates (lint, build, test)"

  local gate_failures=0

  cd "$PROJECT_ROOT/frontend"

  echo -e "  ${CYAN}[2a]${NC} Running frontend lint..."
  if npm run lint --silent 2>&1; then
    echo -e "  ${GREEN}✔${NC} Frontend lint: PASSED"
  else
    echo -e "  ${RED}✖${NC} Frontend lint: FAILED"
    gate_failures=$((gate_failures + 1))
  fi

  echo -e "  ${CYAN}[2b]${NC} Running frontend build..."
  if npm run build --silent 2>&1; then
    echo -e "  ${GREEN}✔${NC} Frontend build: PASSED"
  else
    echo -e "  ${RED}✖${NC} Frontend build: FAILED"
    gate_failures=$((gate_failures + 1))
  fi

  echo -e "  ${CYAN}[2c]${NC} Running frontend tests..."
  if npm run test:coverage --silent 2>&1; then
    echo -e "  ${GREEN}✔${NC} Frontend tests: PASSED"
  else
    echo -e "  ${RED}✖${NC} Frontend tests: FAILED"
    gate_failures=$((gate_failures + 1))
  fi
  echo ""

  if [ "$gate_failures" -eq 0 ]; then
    record_pass "Frontend Quality Gates (lint, build, test)"
  else
    record_fail "Frontend Quality Gates — ${gate_failures} check(s) failed"
  fi
}

# ─── STEP 3: Test Coverage Check ────────────────────────────────────────────

step_test_coverage() {
  print_step "3" "Test Coverage Report"

  cd "$PROJECT_ROOT/backend"
  echo -e "  ${CYAN}[3]${NC} Running backend coverage..."
  npm run test:cov --silent -- --coverageReporters="json-summary" >/dev/null 2>&1 || true

  if [ -f "coverage/coverage-summary.json" ]; then
    node "$PROJECT_ROOT/scripts/coverage-parser.js"
    record_warn "Test Coverage Report (informational)"
  else
    echo -e "  ${YELLOW}⚠ Could not generate coverage report${NC}"
    record_warn "Test Coverage Report (skipped)"
  fi
}

# ─── Consolidated Report ────────────────────────────────────────────────────

print_report() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}  VERIFICATION REPORT${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${BOLD}Step    │ Result${NC}"
  echo -e "  ────────┼──────────────────────────────────────────────────"

  for result in "${STEP_RESULTS[@]}"; do
    echo -e "  ${result}"
  done

  echo ""
  echo -e "  ────────┼──────────────────────────────────────────────────"
  echo -e "  ${BOLD}Summary${NC} │ ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}, ${YELLOW}${WARNED} warnings${NC}"
  echo ""

  if [ "$FAILED" -gt 0 ]; then
    echo -e "  ${RED}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "  ${RED}${BOLD}║  ✖  VERIFICATION FAILED — DO NOT COMMIT/MERGE   ║${NC}"
    echo -e "  ${RED}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Fix all failures above before committing."
  elif [ "$WARNED" -gt 0 ]; then
    echo -e "  ${YELLOW}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "  ${YELLOW}${BOLD}║  ⚠  VERIFICATION PASSED WITH WARNINGS           ║${NC}"
    echo -e "  ${YELLOW}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Review warnings above."
  else
    echo -e "  ${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "  ${GREEN}${BOLD}║  ✔  ALL CHECKS PASSED — SAFE TO COMMIT          ║${NC}"
    echo -e "  ${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
  fi

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# ─── Main Execution ──────────────────────────────────────────────────────────

main() {
  print_header

  step_backend_quality
  step_frontend_quality
  step_test_coverage

  print_report

  if [ "$FAILED" -gt 0 ]; then
    exit 1
  fi

  exit 0
}

main "$@"
