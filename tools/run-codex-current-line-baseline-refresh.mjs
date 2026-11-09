#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  currentLineBaselineRefreshPaths,
  sourceMetricsBaselinePaths,
  runtimeSensitiveBaselinePaths,
} from './codex-refactor-harness-contract.mjs';
import { patchScopeBaselinePath, patchScopePolicyVersion } from './codex-patch-scope-policy.mjs';
import { XENSONAR_ACCEPTED_ARCHITECTURE_LINE, XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';

const root = process.cwd();
const acceptedLine = XENSONAR_ACCEPTED_ARCHITECTURE_LINE;
const refreshedLine = XENSONAR_ARCHITECTURE_LINE;

function relPath(rel) { return path.join(root, rel); }
function readJson(rel) { return JSON.parse(fs.readFileSync(relPath(rel), 'utf8')); }
function writeJson(rel, value) {
  const full = relPath(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2) + '\n');
}
function run(command) {
  const started = Date.now();
  const proc = spawnSync('/bin/bash', ['-lc', command], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 1024 * 1024 * 32,
  });
  return {
    command,
    status: proc.status === 0 ? 'pass' : 'fail',
    exitCode: proc.status,
    durationMs: Date.now() - started,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-12).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-12).join('\n').trim(),
  };
}
function parseArgs(argv) {
  const args = { writeBaselines: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--write-baselines') args.writeBaselines = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/run-codex-current-line-baseline-refresh.mjs [--write-baselines]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}
function assertBaselineVersion(label, baseline, expectedVersion) {
  const observed = baseline.harnessVersion || baseline.patchScopePolicyVersion || baseline.version;
  return observed === expectedVersion ? null : `${label} version ${observed} != ${expectedVersion}`;
}
function writeMarkdown(report) {
  const md = [
    '# Xensonar Current-Line Guard Baseline Refresh',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- acceptedLine: ${report.acceptedLine}`,
    `- refreshedLine: ${report.refreshedLine}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- patchScopePolicyVersion: ${report.patchScopePolicyVersion}`,
    '',
    '## Zweck',
    '',
    'Dieser Slice setzt nach der akzeptierten 7.7.89-Linie einen neuen lokalen Nullpunkt für die Guard-Lesart. Das ist kein Verhaltensbeweis, kein Klangtest und keine nachträgliche Legitimierung alter Änderungen. Es entfernt nur kumulatives Warnrauschen, damit künftige manuelle Patches wieder lokal lesbar werden.',
    '',
    '## Aktualisierte Baselines',
    '',
    `- Source Metrics: ${report.baselines.sourceMetrics.path}`,
    `- Runtime Touch: ${report.baselines.runtimeSensitive.path}`,
    `- Patch Scope: ${report.baselines.patchScope.path}`,
    '',
    '## Baseline Summaries',
    '',
    '| Baseline | Dateien | Zeilen | Bytes |',
    '|---|---:|---:|---:|',
    `| Source Metrics | ${report.baselines.sourceMetrics.summary.fileCount} | ${report.baselines.sourceMetrics.summary.totalLines} | ${report.baselines.sourceMetrics.summary.totalBytes} |`,
    `| Runtime-sensitive | ${report.baselines.runtimeSensitive.summary.fileCount} | ${report.baselines.runtimeSensitive.summary.totalLines} | ${report.baselines.runtimeSensitive.summary.totalBytes} |`,
    `| Patch Scope | ${report.baselines.patchScope.summary.fileCount} | — | ${report.baselines.patchScope.summary.totalBytes} |`,
    '',
    '## Guard-Probe nach Refresh',
    '',
    '| Probe | Status | Exit |',
    '|---|---:|---:|',
  ];
  for (const probe of report.probes) md.push(`| ${probe.command.replace(/\|/g, '\\|')} | ${probe.status} | ${probe.exitCode} |`);
  md.push('', '## Warnungen / Grenzen', '');
  if (report.warnings.length) report.warnings.forEach((warning) => md.push(`- ${warning}`));
  else md.push('- keine technischen Baseline-Warnungen');
  md.push('', '## Falsifikationsfrage', '');
  md.push('Sind künftige Guard-Deltas ab jetzt wieder lokal auf den aktuellen Patch zurückführbar, oder melden sie weiterhin akzeptierte Altänderungen als neues Risiko?');
  fs.mkdirSync(path.dirname(relPath(currentLineBaselineRefreshPaths.markdown)), { recursive: true });
  fs.writeFileSync(relPath(currentLineBaselineRefreshPaths.markdown), md.join('\n'));
}

const args = parseArgs(process.argv);
const writes = [];
if (args.writeBaselines) {
  writes.push(run('node tools/run-codex-source-metrics-snapshot.mjs'));
  const source = readJson('reports/codex-source-metrics-snapshot.json');
  const sourceBaseline = { ...source, generatedAt: new Date().toISOString(), baselineKind: 'current-line-source-metrics', acceptedLine };
  writeJson(sourceMetricsBaselinePaths.json, sourceBaseline);
  writes.push(run(`node tools/run-codex-runtime-touch-guard.mjs --write-baseline ${runtimeSensitiveBaselinePaths.json}`));
  writes.push(run(`node tools/run-codex-patch-scope-guard.mjs --write-baseline ${patchScopeBaselinePath}`));
}
const sourceMetrics = readJson(sourceMetricsBaselinePaths.json);
const runtimeSensitive = readJson(runtimeSensitiveBaselinePaths.json);
const patchScope = readJson(patchScopeBaselinePath);
const warnings = [];
for (const maybe of [
  assertBaselineVersion('sourceMetrics', sourceMetrics, refreshedLine),
  assertBaselineVersion('runtimeSensitive', runtimeSensitive, refreshedLine),
  assertBaselineVersion('patchScope', patchScope, refreshedLine),
]) if (maybe) warnings.push(maybe);
const probes = [
  run('node tools/run-codex-refactor-delta-guard.mjs --fail-on-warnings'),
  run('node tools/run-codex-runtime-touch-guard.mjs'),
  run('node tools/run-codex-patch-scope-guard.mjs --scope tooling-only'),
];
const failedProbes = probes.filter((probe) => probe.status !== 'pass');
const report = {
  ok: warnings.length === 0 && failedProbes.length === 0,
  reportKind: 'xensonar-codex-current-line-baseline-refresh',
  harnessVersion: codexRefactorHarnessVersion,
  patchScopePolicyVersion,
  generatedAt: new Date().toISOString(),
  acceptedLine,
  refreshedLine,
  writeMode: args.writeBaselines,
  writeResults: writes,
  baselines: {
    sourceMetrics: { path: sourceMetricsBaselinePaths.json, harnessVersion: sourceMetrics.harnessVersion, moduleVersion: sourceMetrics.moduleVersion, summary: sourceMetrics.summary },
    runtimeSensitive: { path: runtimeSensitiveBaselinePaths.json, harnessVersion: runtimeSensitive.harnessVersion, sourceMetricsModuleVersion: runtimeSensitive.sourceMetricsModuleVersion, summary: runtimeSensitive.summary },
    patchScope: { path: patchScopeBaselinePath, harnessVersion: patchScope.harnessVersion, patchScopePolicyVersion: patchScope.patchScopePolicyVersion, summary: patchScope.summary },
  },
  probes,
  warnings,
};
writeJson(currentLineBaselineRefreshPaths.json, report);
writeMarkdown(report);
console.log(JSON.stringify({ ok: report.ok, report: currentLineBaselineRefreshPaths.json, markdown: currentLineBaselineRefreshPaths.markdown, warnings: warnings.length, failedProbes: failedProbes.length }, null, 2));
process.exit(report.ok ? 0 : 1);
