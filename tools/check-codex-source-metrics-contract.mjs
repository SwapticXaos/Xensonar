#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  sourceMetricsPaths,
} from './codex-refactor-harness-contract.mjs';
import {
  buildSourceMetrics,
  codexSourceMetricsModuleVersion,
} from './codex-source-metrics.mjs';

const failures = [];

const moduleText = fs.readFileSync('tools/codex-source-metrics.mjs', 'utf8');
for (const marker of [
  'codexSourceMetricsModuleVersion',
  'buildSourceMetrics',
  'sourceMetricHotspots',
  'buildSourceProfileLedger',
  'buildTagHistogram',
  'node_modules',
  'dist',
]) {
  if (!moduleText.includes(marker)) failures.push(`source metrics module missing marker ${marker}`);
}

const source = buildSourceMetrics(process.cwd());
if (source.summary.fileCount < 10) failures.push('source metrics found too few files');
if (source.summary.totalLines < 1000) failures.push('source metrics found too few lines');
if (source.files.some((file) => file.includes('node_modules/') || file.startsWith('dist/'))) failures.push('source metrics included excluded build/dependency paths');
const impactRunner = fs.readFileSync('tools/run-codex-refactor-impact-ledger.mjs', 'utf8');
if (!impactRunner.includes("from './codex-source-metrics.mjs'")) failures.push('impact ledger does not import codex-source-metrics module');
if (/function\s+(allSourceFiles|fileMetrics|tagsFor|sedimentScore)\b/.test(impactRunner)) failures.push('impact ledger still carries old duplicated source metric helpers');

const run = spawnSync(process.execPath, ['tools/run-codex-source-metrics-snapshot.mjs', '--limit', '8'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (run.status !== 0) failures.push(`source metrics snapshot failed with ${run.status}: ${run.stderr || run.stdout}`.trim());
if (!fs.existsSync(sourceMetricsPaths.json)) failures.push(`missing source metrics json ${sourceMetricsPaths.json}`);
if (!fs.existsSync(sourceMetricsPaths.markdown)) failures.push(`missing source metrics markdown ${sourceMetricsPaths.markdown}`);

if (!failures.length) {
  const report = JSON.parse(fs.readFileSync(sourceMetricsPaths.json, 'utf8'));
  if (report.reportKind !== 'xensonar-codex-source-metrics-snapshot') failures.push(`unexpected reportKind ${report.reportKind}`);
  if (report.harnessVersion !== codexRefactorHarnessVersion) failures.push(`harnessVersion ${report.harnessVersion} != ${codexRefactorHarnessVersion}`);
  if (report.moduleVersion !== codexSourceMetricsModuleVersion) failures.push(`moduleVersion ${report.moduleVersion} != ${codexSourceMetricsModuleVersion}`);
  if (report.summary.fileCount !== source.summary.fileCount) failures.push(`snapshot file count ${report.summary.fileCount} != direct file count ${source.summary.fileCount}`);
  if (!Array.isArray(report.tagHistogram) || report.tagHistogram.length < 3) failures.push('tagHistogram unexpectedly small');
  if (!Array.isArray(report.sedimentHotspots) || report.sedimentHotspots.length < 5) failures.push('sedimentHotspots unexpectedly small');
  const md = fs.readFileSync(sourceMetricsPaths.markdown, 'utf8');
  for (const marker of ['Source Metrics Snapshot', 'gemeinsame Messbasis', 'Tag-Histogramm', 'Größte Verzeichnisse', 'Sediment-Hotspots']) {
    if (!md.includes(marker)) failures.push(`markdown missing marker ${marker}`);
  }
}

if (failures.length) {
  console.error('[codex-source-metrics-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-source-metrics-contract', version: codexRefactorHarnessVersion, moduleVersion: codexSourceMetricsModuleVersion, files: source.summary.fileCount }, null, 2));
