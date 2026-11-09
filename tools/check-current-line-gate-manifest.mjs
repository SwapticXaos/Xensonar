#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  CURRENT_LINE_CANONICAL_GATE_SCRIPTS,
  CURRENT_LINE_GATE_CHECK_FILES,
  CURRENT_LINE_GATE_SCRIPTS,
} from './current-line-gate-manifest.mjs';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const pkg = JSON.parse(read('package.json'));

function fail(message) {
  console.error(`[current-line-gate-manifest] ${message}`);
  process.exit(1);
}

if (!CURRENT_LINE_GATE_CHECK_FILES.includes('check-current-line-gate-manifest.mjs')) {
  fail('manifest must list its own checker as a current-line gate file');
}

const missingFiles = CURRENT_LINE_GATE_CHECK_FILES
  .map((file) => `tools/${file}`)
  .filter((file) => !fs.existsSync(path.join(root, file)));
if (missingFiles.length) fail(`manifest references missing check files: ${missingFiles.join(', ')}`);

const missingScripts = CURRENT_LINE_GATE_SCRIPTS
  .filter((gate) => gate.script && !pkg.scripts?.[gate.script])
  .map((gate) => gate.script);
if (missingScripts.length) fail(`manifest references missing package scripts: ${missingScripts.join(', ')}`);

if (pkg.scripts?.['xensonar:check-current-line-gate-manifest'] !== 'node tools/check-current-line-gate-manifest.mjs') {
  fail('package.json missing xensonar:check-current-line-gate-manifest script');
}

const taxonomy = read('tools/report-check-landscape-taxonomy.mjs');
if (!taxonomy.includes("'./current-line-gate-manifest.mjs'")) {
  fail('check taxonomy must read current-line gates from the shared manifest');
}

const refactorSuite = read('tools/run-xensonar-refactor-sanity-suite.mjs');
if (!refactorSuite.includes('CURRENT_LINE_GATE_SCRIPTS')) {
  fail('refactor suite must run current-line gates from the shared manifest');
}

const developmentBasis = read('tools/report-xensonar-development-basis.mjs');
if (!developmentBasis.includes('CURRENT_LINE_CANONICAL_GATE_SCRIPTS')) {
  fail('development basis report must list canonical gates from the shared manifest');
}

const duplicateGateScripts = CURRENT_LINE_GATE_SCRIPTS
  .map((gate) => gate.script)
  .filter(Boolean)
  .filter((script, index, all) => all.indexOf(script) !== index);
if (duplicateGateScripts.length) fail(`duplicate gate scripts in manifest: ${duplicateGateScripts.join(', ')}`);

const duplicateCanonicalScripts = CURRENT_LINE_CANONICAL_GATE_SCRIPTS
  .filter((script, index, all) => all.indexOf(script) !== index);
if (duplicateCanonicalScripts.length) fail(`duplicate canonical gate scripts in manifest: ${duplicateCanonicalScripts.join(', ')}`);

console.log(JSON.stringify({
  ok: true,
  currentLineGateFiles: CURRENT_LINE_GATE_CHECK_FILES.length,
  currentLineGateScripts: CURRENT_LINE_GATE_SCRIPTS.length,
  canonicalGateScripts: CURRENT_LINE_CANONICAL_GATE_SCRIPTS.length,
}, null, 2));
