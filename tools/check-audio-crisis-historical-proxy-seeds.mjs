#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fail = (message) => {
  console.error(`[audio-crisis-historical-proxy-seeds] FAIL: ${message}`);
  process.exit(1);
};

const seedPath = path.resolve(root, 'diagnostics/audio_crisis_matrix/historical_proxy_seed_runs.json');
const planPath = path.resolve(root, 'diagnostics/audio_crisis_matrix/historical_proxy_reproduction_plan.md');
const rawRunsPath = path.resolve(root, 'diagnostics/audio_crisis_matrix/raw_runs.json');
const recommendedPath = path.resolve(root, 'diagnostics/audio_crisis_matrix/recommended_defaults.md');

if (!fs.existsSync(seedPath)) fail('missing historical_proxy_seed_runs.json');
if (!fs.existsSync(planPath)) fail('missing historical_proxy_reproduction_plan.md');

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
if (seed.schemaVersion !== 1) fail('schemaVersion must be 1');
if (seed.provenanceStatus !== 'historical-proxy-screenshot-transcription') {
  fail('seed provenanceStatus must remain historical-proxy-screenshot-transcription');
}
if (seed.scoreUse !== 'excluded-from-default-scoring') {
  fail('historical proxy seeds must stay excluded from default scoring');
}
if (!Array.isArray(seed.requiredInterpretation) || seed.requiredInterpretation.length < 3) {
  fail('requiredInterpretation must explicitly state the non-scoring contract');
}
const requiredPhrases = [
  'Do not merge these values into raw_runs.json.',
  'Do not use them for recommended_defaults.md scoring.',
];
for (const phrase of requiredPhrases) {
  if (!seed.requiredInterpretation.includes(phrase)) fail(`missing interpretation guard: ${phrase}`);
}

if (!Array.isArray(seed.tables) || seed.tables.length < 4) fail('expected at least four historical tables');
const requiredTables = [
  'historical_g3_comparable_2026_05_04_064927',
  'historical_b1_break_2026_05_04_060741',
  'historical_global_burst_threshold_2026_05_04_014809',
  'historical_s1_global_pressure_2026_05_04_013924',
];
const tableIds = new Set(seed.tables.map((table) => table.id));
for (const id of requiredTables) {
  if (!tableIds.has(id)) fail(`missing table ${id}`);
}

let rowCount = 0;
for (const table of seed.tables) {
  if (table.status !== 'historical-proxy') fail(`table ${table.id} must be historical-proxy`);
  if (!Array.isArray(table.rows) || table.rows.length < 1) fail(`table ${table.id} has no rows`);
  if (!table.screenshotFileName || !table.interpretation) fail(`table ${table.id} lacks provenance text`);
  rowCount += table.rows.length;
  for (const row of table.rows) {
    if (typeof row.version !== 'string' || !row.version) fail(`table ${table.id} has a row without version`);
  }
}
if (rowCount < 12) fail('expected at least 12 historical rows');

const plan = fs.readFileSync(planPath, 'utf8');
for (const needle of [
  'historical_proxy_seed_runs.json',
  'root-follow-glissando',
  'combo-root-particle-wave',
  'full-lane-max-stress',
  'nicht in `raw_runs.json` übernehmen',
]) {
  if (!plan.includes(needle)) fail(`reproduction plan missing ${needle}`);
}

if (fs.existsSync(rawRunsPath)) {
  const rawRuns = JSON.parse(fs.readFileSync(rawRunsPath, 'utf8'));
  const flat = JSON.stringify(rawRuns);
  for (const id of requiredTables) {
    if (flat.includes(id)) fail(`raw_runs.json must not contain historical seed id ${id}`);
  }
}
if (fs.existsSync(recommendedPath)) {
  const recommended = fs.readFileSync(recommendedPath, 'utf8');
  if (recommended.includes('historical-proxy-screenshot-transcription') && recommended.includes('empfohlen')) {
    fail('recommended_defaults.md must not recommend a default from historical proxy seeds');
  }
}

console.log(`[audio-crisis-historical-proxy-seeds] OK · ${seed.tables.length} historical tables / ${rowCount} rows guarded as non-scoring proxy seeds.`);
