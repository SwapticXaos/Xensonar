#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const scriptPath = path.join(root, 'tools/report-check-landscape-taxonomy.mjs');
const packageJsonPath = path.join(root, 'package.json');
const suitePath = path.join(root, 'tools/run-xensonar-refactor-sanity-suite.mjs');
const gateManifestPath = path.join(root, 'tools/current-line-gate-manifest.mjs');
const requiredCategories = [
  'current-line-gate',
  'behavioral-execution-test',
  'integration-smoke-test',
  'contract-check',
  'import-boundary-check',
  'string-dom-marker-check',
  'historical-patch-artifact',
  'source-audit-check',
  'consolidation-candidate',
];

function fail(message) {
  console.error(`[check-landscape-taxonomy-contract] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(scriptPath)) fail('missing tools/report-check-landscape-taxonomy.mjs');
const source = fs.readFileSync(scriptPath, 'utf8');
for (const category of requiredCategories) {
  if (!source.includes(category)) fail(`taxonomy script does not mention category ${category}`);
}
if (!source.includes('does not delete, rewrite, or consolidate')) {
  fail('taxonomy script must explicitly be read-only and non-consolidating');
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (pkg.scripts['xensonar:report-check-landscape-taxonomy'] !== 'node tools/report-check-landscape-taxonomy.mjs') {
  fail('package.json missing xensonar:report-check-landscape-taxonomy script');
}
if (pkg.scripts['xensonar:check-check-landscape-taxonomy-contract'] !== 'node tools/check-check-landscape-taxonomy-contract.mjs') {
  fail('package.json missing xensonar:check-check-landscape-taxonomy-contract script');
}

const suite = fs.readFileSync(suitePath, 'utf8');
const gateManifest = fs.readFileSync(gateManifestPath, 'utf8');
if (!suite.includes('CURRENT_LINE_GATE_SCRIPTS')) {
  fail('current-line refactor suite must run shared current-line gate manifest');
}
if (!gateManifest.includes('xensonar:report-check-landscape-taxonomy')) {
  fail('current-line gate manifest must include the check landscape taxonomy report');
}
if (!gateManifest.includes('xensonar:check-check-landscape-taxonomy-contract')) {
  fail('current-line gate manifest must include the taxonomy contract check');
}

const out = 'reports/check-landscape-taxonomy.contract-test.json';
const md = 'reports/CHECK_LANDSCAPE_TAXONOMY_CONTRACT_TEST.md';
const proc = spawnSync(process.execPath, ['tools/report-check-landscape-taxonomy.mjs', '--strict', '--out', out, '--md', md, '--quiet'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (proc.status !== 0) {
  console.error(proc.stdout);
  console.error(proc.stderr);
  fail('taxonomy report failed in strict mode');
}
const reportPath = path.join(root, out);
if (!fs.existsSync(reportPath)) fail('strict taxonomy report did not write JSON report');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (report.reportKind !== 'xensonar-check-landscape-taxonomy') fail('unexpected reportKind');
if (!report.summary || report.summary.totalCheckScripts < 500) fail('taxonomy report scanned too few check scripts');
if (!Array.isArray(report.entries) || report.entries.length !== report.summary.totalCheckScripts) {
  fail('taxonomy entries do not match summary total');
}

console.log(JSON.stringify({ ok: true, totalCheckScripts: report.summary.totalCheckScripts, categories: Object.keys(report.categoryDefinitions).length }, null, 2));
