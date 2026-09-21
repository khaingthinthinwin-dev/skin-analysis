"use strict";
const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, '..');
const PCL_MAP_DIR = path.join(ROOT_DIR, 'e2e/pcl-map');
const TEST_RESULTS_DIR = path.join(ROOT_DIR, 'e2e/test-results');

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

function stripMarkdown(text) {
    return text.replace(/\*\*/g, '');
}

function resetPCL(content) {
    return content.replace(/- \[x\]/g, '- [ ]');
}

function updatePCL(pclFilePath, results, mappings) {
    const fullPath = path.join(ROOT_DIR, pclFilePath);
    if (!fs.existsSync(fullPath)) {
        console.log(`   ⚠️  PCL file not found: ${pclFilePath}`);
        return 0;
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
    return updatedCount;
}

// Main
const targetModule = process.argv[2]; // optional: specific module name
const pclMap = loadPclMap();
const allModules = Object.keys(pclMap);
const modules = targetModule ? [targetModule] : allModules;

// Validate target module
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

    const updated = updatePCL(config.pclFile, results, config.mappings);
    totalUpdated += updated;
    modulesProcessed++;

    const status = failed > 0 ? '⚠️' : '✅';
    console.log(`${status} ${moduleName}: ${passed} passed, ${failed} failed, ${updated} PCL items marked`);
}

console.log('');
console.log('═══════════════════════════════════════');
console.log(`📊 Summary:`);
console.log(`   Modules processed: ${modulesProcessed}/${modules.length}`);
console.log(`   ✅ Total passed:   ${totalPassed}`);
console.log(`   ❌ Total failed:   ${totalFailed}`);
console.log(`   📝 PCL items marked: ${totalUpdated}`);
console.log('═══════════════════════════════════════');
