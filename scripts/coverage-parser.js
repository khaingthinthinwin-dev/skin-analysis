const fs = require('fs');
const path = require('path');

const summaryPath = path.resolve(__dirname, '../backend/coverage/coverage-summary.json');
if (!fs.existsSync(summaryPath)) {
  console.error("  \x1b[31m✖ Could not find backend/coverage/coverage-summary.json\x1b[0m");
  process.exit(1);
}

const data = require(summaryPath);

const modules = ['auth', 'users', 'common', 'config', 'shared'];
const result = {};

for (const mod of modules) {
  result[mod] = { lines: { total: 0, covered: 0 } };
}

let totalLines = { total: 0, covered: 0 };

for (const [filepath, metrics] of Object.entries(data)) {
  if (filepath === 'total') {
    totalLines.total = metrics.lines.total;
    totalLines.covered = metrics.lines.covered;
    continue;
  }

  const normalizedPath = filepath.replace(/\\/g, '/');

  let matched = false;
  for (const mod of modules) {
    if (normalizedPath.includes(`src/modules/${mod}/`) || normalizedPath.includes(`src/${mod}/`)) {
      result[mod].lines.total += metrics.lines.total;
      result[mod].lines.covered += metrics.lines.covered;
      matched = true;
      break;
    }
  }

  if (!matched && normalizedPath.includes('src/')) {
    // Files outside known modules still count toward total
  }
}

console.log("  \x1b[1mCoverage Summary (Module Breakdown)\x1b[0m");
console.log("  ────────────────────────────────────────────────────────");
console.log("  Module               | % Lines | Covered / Total");
console.log("  ────────────────────────────────────────────────────────");

const formatRow = (name, total, covered) => {
  const pct = total === 0 ? "N/A" : ((covered / total) * 100).toFixed(2);
  if (pct === "N/A") {
    console.log(`  ${name.padEnd(20)} | ${" N/A".padStart(6)} | 0 / 0`);
    return -1;
  }
  const numPct = parseFloat(pct);
  const color = numPct >= 80 ? "\x1b[32m" : "\x1b[33m";
  console.log(`  ${name.padEnd(20)} | ${color}${pct.padStart(6)}%\x1b[0m | ${covered} / ${total}`);
  return numPct;
};

const totalPct = formatRow("Project Total", totalLines.total, totalLines.covered);
console.log("  ────────────────────────────────────────────────────────");

for (const mod of modules) {
  formatRow(mod, result[mod].lines.total, result[mod].lines.covered);
}
console.log("  ────────────────────────────────────────────────────────");

if (totalPct === -1) {
  console.log("  \x1b[33m⚠ No coverage data found. Run tests with coverage first.\x1b[0m");
} else if (totalPct < 80) {
  console.log("  \x1b[33m⚠ Coverage is below 80% — consider adding more tests.\x1b[0m");
} else {
  console.log("  \x1b[32m✔ Project coverage meets the 80% threshold.\x1b[0m");
}
