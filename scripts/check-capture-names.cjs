"use strict";
/**
 * Validates that every capture name inside e2e/tests (all *.spec.ts files) follows
 * the serial pattern: <SCENARIO-ID>_<n>_<description>
 * e.g. N-01_1_form_filled, A-16_2_buyer_redirect_to_login
 *
 * Usage: node scripts/check-capture-names.cjs [--quiet]
 * Exit code 1 if any violation is found.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TESTS_DIR = path.join(ROOT, "e2e", "tests");
const QUIET = process.argv.includes("--quiet");

const NAME_PATTERN = /^[NABI]-\d{2}_\d+_[A-Za-z0-9_-]+$/;
const CAP_CALL =
  /\b(?:captureScreenshot|captureDbEvidence|captureUserDbEvidence|captureUserCountDbEvidence|captureUserWithMerchantDbEvidence|captureElementScreenshot)\s*\(\s*[^,'()]+,\s*'([^']+)'/g;
const PAGE_CAP = /\.capture\(\s*'([^']+)'\)/g;

const violations = [];
let scanned = 0;

function lineNumberAt(src, index) {
  return src.slice(0, index).split("\n").length;
}

(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith(".spec.ts")) {
      const src = fs.readFileSync(full, "utf-8");
      const rel = path.relative(ROOT, full).replace(/\\/g, "/");
      for (const re of [CAP_CALL, PAGE_CAP]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(src)) !== null) {
          scanned++;
          if (!NAME_PATTERN.test(m[1])) {
            violations.push(`${rel}:${lineNumberAt(src, m.index)}  '${m[1]}'`);
          }
        }
      }
    }
  }
})(TESTS_DIR);

if (violations.length) {
  console.error(
    `Capture name violations (${violations.length}/${scanned}), expected <ID>_<n>_<desc>:`
  );
  for (const v of violations) console.error("  " + v);
  process.exit(1);
}

if (!QUIET) {
  console.log(`OK: ${scanned} capture names conform to <ID>_<n>_<desc>`);
}
