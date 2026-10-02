"use strict";
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, '..');
const PCL_MAP_DIR = path.join(ROOT_DIR, 'e2e/pcl-map');
const TEST_RESULTS_DIR = path.join(ROOT_DIR, 'e2e/test-results');

const PCL_ID_KEY = /^[NABI]-\d+$/;

function loadPclMap() {
    if (!fs.existsSync(PCL_MAP_DIR)) {
        console.error(`❌ pcl-map/ directory not found at ${PCL_MAP_DIR}`);
        process.exit(1);
    }

    const pclMap = {};
    const files = fs.readdirSync(PCL_MAP_DIR).filter(f => f.endsWith('.json'));

    if (files.length === 0) {
        console.error(`❌ No JSON files found in ${PCL_MAP_DIR}`);
        process.exit(1);
    }

    for (const file of files) {
        const moduleName = path.basename(file, '.json');
        const filePath = path.join(PCL_MAP_DIR, file);
        pclMap[moduleName] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }

    return pclMap;
}

function loadModuleResults(moduleName) {
    const resultsPath = path.join(TEST_RESULTS_DIR, moduleName, 'results.json');
    if (!fs.existsSync(resultsPath)) {
        return [];
    }
    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    return data.tests.map(t => ({
        status: t.status,
        title: t.title,
        file: t.file,
    }));
}

function listScreenshots(moduleName, pclId) {
    const dir = path.join(TEST_RESULTS_DIR, moduleName, 'screenshots');
    if (!fs.existsSync(dir)) return [];
    const prefix = `${pclId}_`;
    const files = fs
        .readdirSync(dir)
        .filter(f => {
            if (!f.startsWith(prefix)) return false;
            const lower = f.toLowerCase();
            return lower.endsWith('.png') || lower.endsWith('.json');
        })
        .filter(f => f !== 'index.json');
    const index = loadScreenshotIndex(moduleName);
    const order = Object.keys(index);
    const pos = (f) => {
        const i = order.indexOf(f);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return files.sort((a, b) => pos(a) - pos(b) || a.localeCompare(b));
}

function loadScreenshotIndex(moduleName) {
    const indexPath = path.join(TEST_RESULTS_DIR, moduleName, 'screenshots', 'index.json');
    if (!fs.existsSync(indexPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
        return {};
    }
}

function stripMarkdown(text) {
    return text.replace(/\*\*/g, '');
}

function resetPCL(content) {
    return content.replace(/- \[x\]/g, '- [ ]');
}

function removeEvidenceBlocks(content) {
    const lines = content.split('\n');
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        if (/^\s*- \*\*Evidence\*\*:/.test(lines[i])) {
            while (i + 1 < lines.length && /^\s{4,}- /.test(lines[i + 1])) {
                i++;
            }
            continue;
        }
        out.push(lines[i]);
    }
    return out.join('\n');
}

function buildStatusLookup(results) {
    const map = new Map();
    for (const r of results) {
        const base = path.basename(r.file);
        map.set(`${base}::${r.title}`, r.status);
    }
    return map;
}

function normalizeIndexEntry(entry) {
    if (!entry) return {};
    if (typeof entry === 'string') return { description: entry };
    return entry;
}

/**
 * Multi-line Evidence block (primary test only — refs[0]):
 *   - **Evidence**:
 *     - {description} → `file.png`   (or bare `file.png` if no description)
 *     - Test: {spec} › "{title}" — {status}
 * Screenshots are filtered to the primary test when the index records a test;
 * shots without test metadata are always kept. If filtering drops everything
 * but PCL screenshots exist, falls back to all of them.
 * I-* items: API test note only (no screenshots).
 */
function buildEvidenceLines(moduleName, pclId, refs, statusLookup) {
    const lines = ['  - **Evidence**:'];
    const descIndex = loadScreenshotIndex(moduleName);
    const primary = refs[0] || null;
    const primaryKey = primary
        ? `${path.basename(primary.file)}::${primary.title}`
        : null;

    if (pclId.startsWith('I-')) {
        lines.push('    - API test \u2014 no screenshot');
    } else {
        const shots = listScreenshots(moduleName, pclId);
        const withMeta = shots.map(shot => ({
            shot,
            meta: normalizeIndexEntry(descIndex[shot]),
        }));
        let shown = withMeta.filter(
            ({ meta }) => !meta.test || !primaryKey || meta.test === primaryKey
        );
        if (shown.length === 0 && withMeta.length > 0) {
            shown = withMeta;
        }

        if (shown.length === 0) {
            lines.push('    - Screenshots: (none captured)');
        } else {
            for (const { shot, meta } of shown) {
                if (meta.description) {
                    lines.push(`    - ${meta.description} \u2192 \`${shot}\``);
                } else {
                    lines.push(`    - \`${shot}\``);
                }
            }
        }
    }

    if (primary) {
        const status = statusLookup.get(`${primary.file}::${primary.title}`) || 'missing';
        lines.push(`    - Test: ${primary.file} \u203a "${primary.title}" \u2014 ${status}`);
    }

    return lines;
}

/**
 * New PCL-ID-keyed format: mappings[pclId] = [{ file, title }, ...]
 * Ticks only when ALL refs passed. Writes/replaces a multi-line Evidence block under the item.
 */
function updatePCLNew(moduleName, pclFilePath, results, mappings) {
    const fullPath = path.join(ROOT_DIR, pclFilePath);
    if (!fs.existsSync(fullPath)) {
        console.log(`   ⚠️  PCL file not found: ${pclFilePath}`);
        return { updated: 0, ticked: [], gaps: [], missingItems: [] };
    }

    const statusLookup = buildStatusLookup(results);
    let content = fs.readFileSync(fullPath, 'utf-8');
    content = removeEvidenceBlocks(content);
    content = resetPCL(content);

    const lines = content.split('\n');
    const ticked = [];
    const gaps = [];
    const missingItems = [];
    let updatedCount = 0;

    const decisions = [];
    for (const [pclId, rawRefs] of Object.entries(mappings)) {
        if (!PCL_ID_KEY.test(pclId)) continue;
        const refs = Array.isArray(rawRefs) ? rawRefs : [];

        if (refs.length === 0) {
            gaps.push(pclId);
            decisions.push({ pclId, tick: false, evidenceLines: null });
            continue;
        }

        const statuses = refs.map(
            ref => statusLookup.get(`${ref.file}::${ref.title}`) || 'missing'
        );
        const allPassed = statuses.every(s => s === 'passed');
        decisions.push({
            pclId,
            tick: allPassed,
            evidenceLines: buildEvidenceLines(moduleName, pclId, refs, statusLookup),
        });
    }

    for (const d of decisions) {
        const idPattern = new RegExp(`\\*\\*${d.pclId}\\*\\*:`);
        let idx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (idPattern.test(lines[i])) {
                idx = i;
                break;
            }
        }

        if (idx === -1) {
            missingItems.push(d.pclId);
            continue;
        }

        if (d.tick && lines[idx].includes('- [ ]')) {
            lines[idx] = lines[idx].replace('- [ ]', '- [x]');
            updatedCount++;
            ticked.push(d.pclId);
        }

        if (d.evidenceLines) {
            lines.splice(idx + 1, 0, ...d.evidenceLines);
        }
    }

    fs.writeFileSync(fullPath, lines.join('\n'));
    return { updated: updatedCount, ticked, gaps, missingItems };
}

/**
 * Legacy title-keyed format: mappings[title] = pclId
 * Kept for modules that have not migrated to PCL-ID-keyed maps.
 */
function updatePCLLegacy(pclFilePath, results, mappings) {
    const fullPath = path.join(ROOT_DIR, pclFilePath);
    if (!fs.existsSync(fullPath)) {
        console.log(`   ⚠️  PCL file not found: ${pclFilePath}`);
        return { updated: 0 };
    }

    let content = fs.readFileSync(fullPath, 'utf-8');
    content = resetPCL(content);
    let updatedCount = 0;

    for (const result of results) {
        if (result.status !== 'passed') continue;

        const pclText = mappings[result.title] || null;
        if (!pclText) continue;

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('- [ ]') && stripMarkdown(lines[i]).includes(pclText)) {
                lines[i] = lines[i].replace('- [ ]', '- [x]');
                updatedCount++;
                break;
            }
        }
        content = lines.join('\n');
    }

    fs.writeFileSync(fullPath, content);
    return { updated: updatedCount };
}

function isNewFormat(config) {
    if (config.format === 'pcl-id-keyed') return true;
    const keys = Object.keys(config.mappings || {});
    return keys.length > 0 && keys.every(k => PCL_ID_KEY.test(k));
}

// Main
const targetModule = process.argv[2]; // optional: specific module name
const pclMap = loadPclMap();
const allModules = Object.keys(pclMap);
const modules = targetModule ? [targetModule] : allModules;

if (targetModule && !pclMap[targetModule]) {
    console.error(`❌ Module "${targetModule}" not found in pcl-map/ directory`);
    console.error(`   Available modules: ${allModules.join(', ')}`);
    process.exit(1);
}

console.log(`📋 PCL Map loaded: ${allModules.length} modules from pcl-map/`);
if (targetModule) {
    console.log(`🎯 Target module: ${targetModule}`);
} else {
    console.log(`🔄 Updating all modules`);
}
console.log(`📁 Test results directory: ${TEST_RESULTS_DIR}`);
console.log('');

let totalUpdated = 0;
let totalPassed = 0;
let totalFailed = 0;
let totalSkipped = 0;
let modulesProcessed = 0;
const allGaps = [];
const allMissingItems = [];

for (const moduleName of modules) {
    const config = pclMap[moduleName];
    const results = loadModuleResults(moduleName);

    if (results.length === 0) {
        console.log(`⏭️  ${moduleName}: no test results found (skipped)`);
        totalSkipped++;
        continue;
    }

    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;

    totalPassed += passed;
    totalFailed += failed;

    let updated;
    if (isNewFormat(config)) {
        const res = updatePCLNew(moduleName, config.pclFile, results, config.mappings);
        updated = res.updated;
        if (res.gaps.length) {
            allGaps.push(...res.gaps.map(g => `${moduleName}:${g}`));
        }
        if (res.missingItems.length) {
            allMissingItems.push(...res.missingItems.map(m => `${moduleName}:${m}`));
        }
        modulesProcessed++;

        const status = failed > 0 ? '⚠️' : '✅';
        console.log(`${status} ${moduleName}: ${passed} passed, ${failed} failed, ${updated} PCL items marked`);
        if (res.gaps.length) {
            console.log(`   ⚠️  Known gaps (left unchecked): ${res.gaps.join(', ')}`);
        }
        if (res.missingItems.length) {
            console.log(`   ❌ Mapping refs PCL IDs not found in file: ${res.missingItems.join(', ')}`);
        }
    } else {
        const res = updatePCLLegacy(config.pclFile, results, config.mappings);
        updated = res.updated;
        modulesProcessed++;

        const status = failed > 0 ? '⚠️' : '✅';
        console.log(`${status} ${moduleName}: ${passed} passed, ${failed} failed, ${updated} PCL items marked (legacy title-keyed)`);
    }

    totalUpdated += updated;
}

console.log('');
console.log('═══════════════════════════════════════');
console.log(`📊 Summary:`);
console.log(`   Modules processed: ${modulesProcessed}/${modules.length}`);
console.log(`   ✅ Total passed:   ${totalPassed}`);
console.log(`   ❌ Total failed:   ${totalFailed}`);
console.log(`   📝 PCL items marked: ${totalUpdated}`);
if (allGaps.length) {
    console.log(`   ⚠️  Known gaps: ${allGaps.join(', ')}`);
}
if (allMissingItems.length) {
    console.log(`   ❌ Missing PCL IDs in files: ${allMissingItems.join(', ')}`);
}
console.log('═══════════════════════════════════════');
