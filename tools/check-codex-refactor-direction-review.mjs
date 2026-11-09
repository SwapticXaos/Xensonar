#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing file ${file}`); };
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireText = (label, text, needle) => { if (!text.includes(needle)) failures.push(`${label} missing ${needle}`); };

const jsonPath = 'reports/refactor-direction-review-7790.json';
const mdPath = 'reports/refactor-direction-review-7790.md';
const docPath = 'docs/REFACTOR_DIRECTION_AFTER_7.7.89.md';
for (const file of [jsonPath, mdPath, docPath, 'tools/run-codex-refactor-direction-review.mjs']) requireFile(file);

let report = null;
try { report = JSON.parse(read(jsonPath)); } catch (err) { failures.push(`invalid json report: ${err.message}`); }
if (report) {
  if (report.version !== '3.2.91-7.7.90') failures.push(`unexpected version ${report.version}`);
  if (report.patch !== 'refactor_direction_review') failures.push(`unexpected patch ${report.patch}`);
  if (!Array.isArray(report.series) || report.series.length < 5) failures.push('series list too small');
  if (!Array.isArray(report.nextPaths) || report.nextPaths.length < 3) failures.push('nextPaths list too small');
  if (!Array.isArray(report.stopRules) || report.stopRules.length < 5) failures.push('stopRules list too small');
  const decisions = new Set((report.series || []).map((item) => item.decision));
  for (const expected of ['pause-mechanical-extraction', 'consolidate-not-expand', 'do-next-reduction-candidates', 'map-before-cut', 'do-not-refactor-now']) {
    if (!decisions.has(expected)) failures.push(`missing decision ${expected}`);
  }
  const immediateNext = report.recommendation?.immediateNext || '';
  if (!immediateNext.includes('check_report_sediment_candidates')) failures.push('immediate next must be check/report sediment candidates');
}

const md = read(mdPath);
for (const marker of [
  'Mechanische App.tsx-Boundary Nummer sechs',
  'neue Boundary, kein Größengewinn',
  'Check-/Report-Sediment-Kandidaten',
  'XensonarRefactorRoom-Zonenkarte',
  'SpectralCanvas Interaction-Zonenkarte',
  'Keine Klangpfad-Vereinheitlichung',
  'Antonia',
  'AudioEngine.ts direkt refaktorisieren',
]) requireText('review markdown', md, marker);

const runner = read('tools/run-codex-refactor-direction-review.mjs');
for (const marker of [
  'source-metrics/manual-refactor-direction-review',
  'pause-mechanical-extraction',
  'consolidate-not-expand',
  'check_report_sediment_candidates',
  'Keine Klangpfad-Vereinheitlichung',
]) requireText('review runner', runner, marker);

const pkg = JSON.parse(read('package.json') || '{}');
if (pkg.version !== '3.2.91-7.7.90') failures.push(`package version ${pkg.version} !== 3.2.91-7.7.90`);
if (!pkg.scripts?.['xensonar:codex:refactor-direction-review']) failures.push('missing refactor direction review script');
if (!pkg.scripts?.['xensonar:check-codex-refactor-direction-review']) failures.push('missing refactor direction review check script');

if (failures.length) {
  console.error('[refactor-direction-review-7790] FAILED');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('[refactor-direction-review-7790] PASS: refactor direction review blocks mechanical boundary churn and selects check/report sediment candidates next.');
