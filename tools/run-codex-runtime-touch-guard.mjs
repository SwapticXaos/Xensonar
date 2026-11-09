#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  codexRefactorHarnessVersion,
  runtimeTouchGuardPaths,
} from './codex-refactor-harness-contract.mjs';
import {
  buildSourceMetrics,
  codexSourceMetricsModuleVersion,
  readRepoText,
} from './codex-source-metrics.mjs';

const root = process.cwd();
const defaultBaselinePath = 'reports/codex-runtime-sensitive-baseline.3.2.91-7.7.90.json';

function parseArgs(argv) {
  const args = {
    baseline: defaultBaselinePath,
    allowRuntimeTouch: false,
    writeBaseline: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--baseline') args.baseline = argv[++i] || args.baseline;
    else if (arg === '--allow-runtime-touch') args.allowRuntimeTouch = true;
    else if (arg === '--write-baseline') args.writeBaseline = argv[++i] || args.baseline;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/run-codex-runtime-touch-guard.mjs [--baseline <json>] [--allow-runtime-touch] [--write-baseline <json>]');
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

function writeJson(rel, value) {
  const full = relPath(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2));
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(relPath(rel), 'utf8'));
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function isRuntimeSensitive(metric) {
  const file = metric.file;
  if (!file.startsWith('src/')) return false;
  if ((metric.tags || []).includes('tooling-contract')) return false;
  if ((metric.tags || []).includes('audio/runtime')) return true;
  if ((metric.tags || []).includes('persistence/package')) return true;
  return /(?:spectralForge\/integral|carrierIntegral|rootFollow|waveStarter|AudioEngine|PackageStation|packageStation|materialLoop|MaterialLoop|melodic|Melodic|scheduler|worklet|buffer|AudioBuffer|render|playback|voice)/i.test(file);
}

function buildSensitiveSnapshot() {
  const source = buildSourceMetrics(root, { roots: ['src'] });
  const sensitiveMetrics = source.metrics.filter(isRuntimeSensitive);
  const files = sensitiveMetrics.map((metric) => {
    const text = readRepoText(root, metric.file);
    return {
      file: metric.file,
      sha256: sha256(text),
      bytes: metric.bytes,
      lines: metric.lines,
      tags: metric.tags,
      audioTermCount: metric.audioTermCount,
      timerCount: metric.timerCount,
      browserGlobalCount: metric.browserGlobalCount,
      sedimentScore: metric.sedimentScore,
    };
  }).sort((a, b) => a.file.localeCompare(b.file));
  return {
    reportKind: 'xensonar-codex-runtime-sensitive-baseline',
    harnessVersion: codexRefactorHarnessVersion,
    sourceMetricsModuleVersion: codexSourceMetricsModuleVersion,
    generatedAt: new Date().toISOString(),
    policy: {
      scope: 'src runtime-sensitive files only',
      inclusion: 'audio/runtime tag, persistence/package tag, or explicit routing/rendering/runtime filename signals',
      defaultMode: 'fail when sensitive files are added, deleted, or hash-modified unless --allow-runtime-touch is explicit',
    },
    summary: {
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
      totalLines: files.reduce((sum, file) => sum + file.lines, 0),
    },
    files,
  };
}

function byFile(rows = []) {
  return new Map(rows.map((row) => [row.file, row]));
}

function compareSnapshots(baseline, current) {
  const before = byFile(baseline.files || []);
  const after = byFile(current.files || []);
  const added = [...after.keys()].filter((file) => !before.has(file)).sort();
  const deleted = [...before.keys()].filter((file) => !after.has(file)).sort();
  const modified = [...after.keys()].filter((file) => before.has(file) && after.get(file).sha256 !== before.get(file).sha256).map((file) => {
    const b = before.get(file);
    const c = after.get(file);
    return {
      file,
      before: { sha256: b.sha256, bytes: b.bytes, lines: b.lines, sedimentScore: b.sedimentScore },
      after: { sha256: c.sha256, bytes: c.bytes, lines: c.lines, sedimentScore: c.sedimentScore },
      delta: {
        bytes: c.bytes - b.bytes,
        lines: c.lines - b.lines,
        sedimentScore: Math.round((c.sedimentScore - b.sedimentScore) * 10) / 10,
      },
      tags: c.tags,
    };
  }).sort((a, b) => Math.abs(b.delta.bytes) - Math.abs(a.delta.bytes) || a.file.localeCompare(b.file));
  return { added, deleted, modified };
}

function writeMarkdown(report) {
  const md = [
    '# Xensonar Codex Runtime Touch Guard',
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
    'Dieser Guard schützt Harness-/Tooling-Slices davor, versehentlich Klang-, Scheduler-, Routing-, Paketstations- oder Audio-Runtime-Pfade zu berühren. Er ist absichtlich strenger als der Delta Guard: Schon hash-identische Größen sind egal, aber jede tatsächliche Änderung an runtime-sensitiven Dateien wird sichtbar.',
    '',
    'Wenn ein Patch bewusst Audio-/Runtime-Code anfassen soll, muss das explizit mit `--allow-runtime-touch` geschehen und im Patchbericht als hörbarer/semantischer Trade-off beschrieben werden. Für reine Harness-, Codex- oder Report-Slices bleibt der erwartete Zustand: keine sensitive Runtime-Berührung.',
    '',
    '## Schutzumfang',
    '',
    `- Baseline-sensitive Dateien: ${report.baseline.summary.fileCount}`,
    `- Aktuell-sensitive Dateien: ${report.current.summary.fileCount}`,
    `- Baseline-Zeilen: ${report.baseline.summary.totalLines}`,
    `- Aktuell-Zeilen: ${report.current.summary.totalLines}`,
    '',
    '## Runtime Touch Delta',
    '',
    `- hinzugefügt: ${report.delta.added.length}`,
    `- gelöscht: ${report.delta.deleted.length}`,
    `- geändert: ${report.delta.modified.length}`,
    '',
    '### Geänderte sensitive Dateien',
    '',
    '| Datei | Δ Zeilen | Δ Bytes | Δ Sediment | Tags |',
    '|---|---:|---:|---:|---|',
  ];
  if (report.delta.modified.length) {
    for (const row of report.delta.modified) md.push(`| ${row.file} | ${row.delta.lines} | ${row.delta.bytes} | ${row.delta.sedimentScore} | ${(row.tags || []).join(', ')} |`);
  } else {
    md.push('| — | 0 | 0 | 0 | — |');
  }
  md.push('', '### Hinzugefügt', '');
  if (report.delta.added.length) report.delta.added.forEach((file) => md.push(`- ${file}`));
  else md.push('- —');
  md.push('', '### Gelöscht', '');
  if (report.delta.deleted.length) report.delta.deleted.forEach((file) => md.push(`- ${file}`));
  else md.push('- —');
  md.push('', '## Verstöße', '');
  if (report.violations.length) report.violations.forEach((violation) => md.push(`- ${violation}`));
  else md.push('- keine sensitive Runtime-Berührung erkannt');
  md.push('', '## Falsifikationsfrage', '');
  md.push('Kann dieser Slice ehrlich als Harness-/Refactor-Werkzeugschicht gelten, ohne dass ein hörbarer Renderer, Scheduler, Routingvertrag, Paketpayload oder Browser-Runtime-Pfad verändert wurde?');
  fs.mkdirSync(path.dirname(relPath(runtimeTouchGuardPaths.markdown)), { recursive: true });
  fs.writeFileSync(relPath(runtimeTouchGuardPaths.markdown), md.join('\n'));
}

const args = parseArgs(process.argv);
const current = buildSensitiveSnapshot();
if (args.writeBaseline) {
  writeJson(args.writeBaseline, current);
  console.log(JSON.stringify({ ok: true, wrote: args.writeBaseline, fileCount: current.summary.fileCount }, null, 2));
  process.exit(0);
}
const baseline = readJson(args.baseline);
const delta = compareSnapshots(baseline, current);
const violations = [];
if (delta.added.length) violations.push(`${delta.added.length} runtime-sensitive file(s) added`);
if (delta.deleted.length) violations.push(`${delta.deleted.length} runtime-sensitive file(s) deleted`);
if (delta.modified.length) violations.push(`${delta.modified.length} runtime-sensitive file(s) modified`);
const ok = args.allowRuntimeTouch || violations.length === 0;
const report = {
  ok,
  reportKind: 'xensonar-codex-runtime-touch-guard',
  harnessVersion: codexRefactorHarnessVersion,
  sourceMetricsModuleVersion: codexSourceMetricsModuleVersion,
  generatedAt: new Date().toISOString(),
  baseline: {
    path: args.baseline,
    harnessVersion: baseline.harnessVersion,
    sourceMetricsModuleVersion: baseline.sourceMetricsModuleVersion,
    generatedAt: baseline.generatedAt,
    summary: baseline.summary,
  },
  current: {
    generatedAt: current.generatedAt,
    summary: current.summary,
  },
  policy: {
    allowRuntimeTouch: args.allowRuntimeTouch,
    defaultMode: 'runtime-sensitive diffs fail for harness/tooling slices',
  },
  delta,
  violations,
  verdict: violations.length ? (args.allowRuntimeTouch ? 'allowed-runtime-touch' : 'blocked-runtime-touch') : 'clean',
};
writeJson(runtimeTouchGuardPaths.json, report);
writeMarkdown(report);
console.log(JSON.stringify({ ok: report.ok, report: runtimeTouchGuardPaths.json, markdown: runtimeTouchGuardPaths.markdown, verdict: report.verdict, violations: violations.length, modified: delta.modified.length, added: delta.added.length, deleted: delta.deleted.length }, null, 2));
process.exit(ok ? 0 : 1);
