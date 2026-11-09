#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  deltaGuardPaths,
  sourceMetricsBaselinePaths,
  sourceMetricsPaths,
} from './codex-refactor-harness-contract.mjs';
import {
  buildSourceMetrics,
  buildTagHistogram,
  codexSourceMetricsModuleVersion,
  sourceMetricHotspots,
} from './codex-source-metrics.mjs';

const root = process.cwd();

const defaultPolicy = {
  maxFileIncrease: 8,
  maxLineIncrease: 1600,
  maxByteIncrease: 90000,
  maxSedimentScoreIncrease: 25,
  maxToolingFileIncrease: 8,
  coreHtmlMaxIncreaseBytes: 0,
};

function parseArgs(argv) {
  const args = {
    baseline: sourceMetricsBaselinePaths.json,
    runGates: false,
    failOnWarnings: false,
    refreshSnapshot: false,
    policy: { ...defaultPolicy },
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--baseline') args.baseline = argv[++i] || args.baseline;
    else if (arg === '--run-gates') args.runGates = true;
    else if (arg === '--fail-on-warnings') args.failOnWarnings = true;
    else if (arg === '--refresh-snapshot') args.refreshSnapshot = true;
    else if (arg === '--max-file-increase') args.policy.maxFileIncrease = Number(argv[++i] || args.policy.maxFileIncrease);
    else if (arg === '--max-line-increase') args.policy.maxLineIncrease = Number(argv[++i] || args.policy.maxLineIncrease);
    else if (arg === '--max-byte-increase') args.policy.maxByteIncrease = Number(argv[++i] || args.policy.maxByteIncrease);
    else if (arg === '--core-html-max-increase') args.policy.coreHtmlMaxIncreaseBytes = Number(argv[++i] || args.policy.coreHtmlMaxIncreaseBytes);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/run-codex-refactor-delta-guard.mjs [--baseline <json>] [--run-gates] [--fail-on-warnings] [--refresh-snapshot]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function relPath(rel) {
  return path.join(root, rel);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(relPath(rel), 'utf8'));
}

function readJsonOptional(rel) {
  const full = relPath(rel);
  if (!fs.existsSync(full)) return null;
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); } catch { return null; }
}

function writeJson(rel, value) {
  const full = relPath(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2));
}

function shell(commandText) {
  const started = Date.now();
  const proc = spawnSync('/bin/bash', ['-lc', commandText], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
    maxBuffer: 1024 * 1024 * 16,
  });
  return {
    command: commandText,
    status: proc.status === 0 ? 'pass' : 'fail',
    exitCode: proc.status,
    durationMs: Date.now() - started,
    stdoutTail: String(proc.stdout || '').split(/\r?\n/).slice(-10).join('\n').trim(),
    stderrTail: String(proc.stderr || '').split(/\r?\n/).slice(-10).join('\n').trim(),
  };
}

function currentDistHtmlSize() {
  const html = relPath('dist/index.html');
  if (!fs.existsSync(html)) return null;
  return fs.statSync(html).size;
}

function latestBuildReportHtmlBytes() {
  const reports = fs.readdirSync(root)
    .filter((name) => /^BUILD_REPORT_XENSONAR_.*\.md$/.test(name))
    .map((name) => ({ name, mtimeMs: fs.statSync(relPath(name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const { name } of reports) {
    const text = fs.readFileSync(relPath(name), 'utf8');
    const matches = [...text.matchAll(/(?:Core-HTML|HTML[^\n:]*):\s*([0-9][0-9.,]*)\s*Bytes/gi)];
    if (!matches.length) continue;
    const raw = matches[matches.length - 1][1].replace(/[.,]/g, '');
    const bytes = Number(raw);
    if (Number.isFinite(bytes)) return { file: name, bytes };
  }
  return null;
}

function histogramMap(rows = []) {
  return new Map(rows.map((row) => [row.tag, row.count]));
}

function diffSummary(base = {}, current = {}) {
  return {
    fileCount: (current.fileCount || 0) - (base.fileCount || 0),
    totalLines: (current.totalLines || 0) - (base.totalLines || 0),
    totalBytes: (current.totalBytes || 0) - (base.totalBytes || 0),
  };
}

function diffTagHistogram(baseRows, currentRows) {
  const base = histogramMap(baseRows);
  const current = histogramMap(currentRows);
  return [...new Set([...base.keys(), ...current.keys()])]
    .map((tag) => ({ tag, before: base.get(tag) || 0, after: current.get(tag) || 0, delta: (current.get(tag) || 0) - (base.get(tag) || 0) }))
    .filter((row) => row.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.tag.localeCompare(b.tag));
}

function hotspotKey(row) {
  return row?.file || '';
}

function diffHotspots(baseRows = [], currentRows = []) {
  const base = new Map(baseRows.map((row) => [hotspotKey(row), row]));
  const current = new Map(currentRows.map((row) => [hotspotKey(row), row]));
  const entered = [...current.keys()].filter((file) => file && !base.has(file));
  const left = [...base.keys()].filter((file) => file && !current.has(file));
  const scoreChanges = [...current.entries()].filter(([file]) => base.has(file)).map(([file, row]) => ({
    file,
    before: base.get(file).sedimentScore,
    after: row.sedimentScore,
    delta: Math.round((row.sedimentScore - base.get(file).sedimentScore) * 10) / 10,
  })).filter((row) => row.delta !== 0).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { entered, left, scoreChanges };
}

function buildWarnings({ baseline, currentSnapshot, source, args, html }) {
  const warnings = [];
  const delta = diffSummary(baseline.summary, currentSnapshot.summary);
  if (delta.fileCount > args.policy.maxFileIncrease) warnings.push(`file count increased by ${delta.fileCount}, threshold ${args.policy.maxFileIncrease}`);
  if (delta.totalLines > args.policy.maxLineIncrease) warnings.push(`line count increased by ${delta.totalLines}, threshold ${args.policy.maxLineIncrease}`);
  if (delta.totalBytes > args.policy.maxByteIncrease) warnings.push(`source bytes increased by ${delta.totalBytes}, threshold ${args.policy.maxByteIncrease}`);
  const maxBefore = Math.max(...(baseline.sedimentHotspots || []).map((row) => row.sedimentScore || 0), 0);
  const maxAfter = Math.max(...sourceMetricHotspots(source.metrics, 1).map((row) => row.sedimentScore || 0), 0);
  if (maxAfter - maxBefore > args.policy.maxSedimentScoreIncrease) warnings.push(`top sediment score increased by ${Math.round((maxAfter - maxBefore) * 10) / 10}`);
  const tagDelta = diffTagHistogram(baseline.tagHistogram || [], currentSnapshot.tagHistogram || []);
  const tooling = tagDelta.find((row) => row.tag === 'tooling-contract');
  if (tooling && tooling.delta > args.policy.maxToolingFileIncrease) warnings.push(`tooling-contract file count increased by ${tooling.delta}, threshold ${args.policy.maxToolingFileIncrease}`);
  if (html.currentBytes !== null && html.baselineBytes !== null) {
    const htmlDelta = html.currentBytes - html.baselineBytes;
    if (htmlDelta > args.policy.coreHtmlMaxIncreaseBytes) warnings.push(`Core-HTML increased by ${htmlDelta} bytes, threshold ${args.policy.coreHtmlMaxIncreaseBytes}`);
  }
  return warnings;
}

function buildSnapshotFromSource(source) {
  return {
    ok: source.summary.fileCount > 0,
    reportKind: 'xensonar-codex-source-metrics-snapshot-inline',
    harnessVersion: codexRefactorHarnessVersion,
    moduleVersion: codexSourceMetricsModuleVersion,
    generatedAt: new Date().toISOString(),
    summary: source.summary,
    tagHistogram: buildTagHistogram(source.metrics),
    sedimentHotspots: sourceMetricHotspots(source.metrics, 20),
  };
}

function writeReports(report) {
  writeJson(deltaGuardPaths.json, report);
  const md = [
    '# Xensonar Codex Refactor Delta Guard',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- sourceMetricsModule: ${report.sourceMetricsModuleVersion}`,
    `- baseline: ${report.baseline.path}`,
    `- verdict: ${report.verdict}`,
    '',
    '## Lesart',
    '',
    'Der Delta Guard vergleicht einen aktuellen dünnen Refactor-Slice gegen eine eingefrorene Source-Metrics-Baseline. Er ersetzt keine Klang-, Export- oder Browserprüfung, verhindert aber, dass Größen-/Datei-Drift unbemerkt als Refactor-Fortschritt durchrutscht.',
    '',
    '## Summary Delta',
    '',
    '| Signal | Vorher | Jetzt | Delta |',
    '|---|---:|---:|---:|',
    `| Dateien | ${report.baseline.summary.fileCount} | ${report.current.summary.fileCount} | ${report.delta.summary.fileCount} |`,
    `| Zeilen | ${report.baseline.summary.totalLines} | ${report.current.summary.totalLines} | ${report.delta.summary.totalLines} |`,
    `| Bytes | ${report.baseline.summary.totalBytes} | ${report.current.summary.totalBytes} | ${report.delta.summary.totalBytes} |`,
    '',
    '## Core-HTML Delta',
    '',
    `- Baseline: ${report.delta.coreHtml.baselineBytes ?? 'nicht verfügbar'} Bytes`,
    `- Aktuell: ${report.delta.coreHtml.currentBytes ?? 'nicht verfügbar'} Bytes`,
    `- Delta: ${report.delta.coreHtml.deltaBytes ?? 'nicht verfügbar'} Bytes`,
    '',
    '## Tag Delta',
    '',
    '| Tag | Vorher | Jetzt | Delta |',
    '|---|---:|---:|---:|',
  ];
  if (report.delta.tags.length) {
    for (const row of report.delta.tags) md.push(`| ${row.tag} | ${row.before} | ${row.after} | ${row.delta} |`);
  } else {
    md.push('| — | 0 | 0 | 0 |');
  }
  md.push('', '## Hotspot Delta', '');
  md.push(`- neu in Top-Hotspots: ${report.delta.hotspots.entered.join(', ') || '—'}`);
  md.push(`- aus Top-Hotspots verschwunden: ${report.delta.hotspots.left.join(', ') || '—'}`);
  md.push('', '### Score-Änderungen', '', '| Datei | Vorher | Jetzt | Delta |', '|---|---:|---:|---:|');
  if (report.delta.hotspots.scoreChanges.length) {
    for (const row of report.delta.hotspots.scoreChanges.slice(0, 12)) md.push(`| ${row.file} | ${row.before} | ${row.after} | ${row.delta} |`);
  } else {
    md.push('| — | 0 | 0 | 0 |');
  }
  md.push('', '## Warnungen', '');
  if (report.warnings.length) {
    for (const warning of report.warnings) md.push(`- ${warning}`);
  } else {
    md.push('- keine Warnung innerhalb der aktuellen Delta-Policy');
  }
  md.push('', '## Gate-Ergebnisse', '');
  if (report.gateResults.length) {
    for (const gate of report.gateResults) md.push(`- ${gate.status.toUpperCase()} · ${gate.command} · ${gate.durationMs}ms`);
  } else {
    md.push('- nicht ausgeführt; für Gate-Lauf `npm run xensonar:codex:refactor-delta:gates` verwenden');
  }
  fs.mkdirSync(path.dirname(relPath(deltaGuardPaths.markdown)), { recursive: true });
  fs.writeFileSync(relPath(deltaGuardPaths.markdown), md.join('\n'));
}

const args = parseArgs(process.argv);
const baseline = readJson(args.baseline);
const source = buildSourceMetrics(root);
const currentSnapshot = buildSnapshotFromSource(source);
if (args.refreshSnapshot) writeJson(sourceMetricsPaths.json, currentSnapshot);
const currentHtml = currentDistHtmlSize();
const buildReportHtml = latestBuildReportHtmlBytes();
const baselineHtml = baseline.coreHtmlBytes ?? buildReportHtml?.bytes ?? currentHtml;
const html = {
  baselineBytes: baselineHtml ?? null,
  currentBytes: currentHtml ?? null,
};
html.deltaBytes = html.baselineBytes !== null && html.currentBytes !== null ? html.currentBytes - html.baselineBytes : null;
const gateResults = [];
if (args.runGates) {
  gateResults.push(shell('node tools/check-codex-source-metrics-contract.mjs'));
  gateResults.push(shell('node tools/check-codex-refactor-impact-ledger.mjs'));
}
const warnings = buildWarnings({ baseline, currentSnapshot, source, args, html });
const failedGates = gateResults.filter((gate) => gate.status !== 'pass');
const ok = failedGates.length === 0 && (!warnings.length || !args.failOnWarnings);
const report = {
  ok,
  reportKind: 'xensonar-codex-refactor-delta-guard',
  harnessVersion: codexRefactorHarnessVersion,
  sourceMetricsModuleVersion: codexSourceMetricsModuleVersion,
  generatedAt: new Date().toISOString(),
  baseline: {
    path: args.baseline,
    harnessVersion: baseline.harnessVersion,
    moduleVersion: baseline.moduleVersion,
    generatedAt: baseline.generatedAt,
    summary: baseline.summary,
  },
  current: {
    summary: currentSnapshot.summary,
    generatedAt: currentSnapshot.generatedAt,
  },
  delta: {
    summary: diffSummary(baseline.summary, currentSnapshot.summary),
    tags: diffTagHistogram(baseline.tagHistogram || [], currentSnapshot.tagHistogram || []),
    hotspots: diffHotspots(baseline.sedimentHotspots || [], currentSnapshot.sedimentHotspots || []),
    coreHtml: html,
  },
  policy: args.policy,
  warnings,
  verdict: warnings.length ? 'warn' : 'clean',
  gateResults,
};
writeReports(report);
console.log(JSON.stringify({ ok: report.ok, report: deltaGuardPaths.json, markdown: deltaGuardPaths.markdown, verdict: report.verdict, warnings: report.warnings.length, delta: report.delta.summary, coreHtmlDelta: report.delta.coreHtml.deltaBytes }, null, 2));
process.exit(ok ? 0 : 1);
