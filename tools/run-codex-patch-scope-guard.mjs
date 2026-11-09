#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  codexRefactorHarnessVersion,
  patchScopeGuardPaths,
} from './codex-refactor-harness-contract.mjs';
import {
  getPatchScope,
  findPatchScopeViolations,
  patchScopeBaselinePath,
  patchScopePolicyVersion,
} from './codex-patch-scope-policy.mjs';

const root = process.cwd();
const defaultExcludedDirs = new Set(['node_modules', 'dist', '.git']);
const defaultExcludedFileRules = [
  /^reports\/[^/]+\.(?:json|md)$/,
  /^reports\/codex-patch-scope-guard\.(?:json|md)$/,
  /^reports\/codex-runtime-touch-guard\.(?:json|md)$/,
  /^reports\/codex-refactor-delta-guard\.(?:json|md)$/,
  /^reports\/codex-source-metrics-snapshot\.(?:json|md)$/,
  /^reports\/codex-current-line-baseline-refresh\.(?:json|md)$/,
];

function parseArgs(argv) {
  const args = {
    scope: 'harness-only',
    baseline: patchScopeBaselinePath,
    allowScopeViolations: false,
    writeBaseline: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--scope') args.scope = argv[++i] || args.scope;
    else if (arg.startsWith('--scope=')) args.scope = arg.slice('--scope='.length);
    else if (arg === '--baseline') args.baseline = argv[++i] || args.baseline;
    else if (arg.startsWith('--baseline=')) args.baseline = arg.slice('--baseline='.length);
    else if (arg === '--allow-scope-violations') args.allowScopeViolations = true;
    else if (arg === '--write-baseline') args.writeBaseline = argv[++i] || args.baseline;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/run-codex-patch-scope-guard.mjs [--scope harness-only|tooling-only|runtime-declared] [--baseline <json>] [--allow-scope-violations] [--write-baseline <json>]');
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

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walkAllFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && defaultExcludedDirs.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(root, abs).split(path.sep).join('/');
    if (entry.isDirectory()) walkAllFiles(abs, acc);
    else if (entry.isFile()) {
      if (defaultExcludedFileRules.some((rule) => rule.test(rel))) continue;
      const buf = fs.readFileSync(abs);
      acc.push({ path: rel, bytes: buf.length, sha256: sha256(buf) });
    }
  }
  return acc;
}

function buildSnapshot() {
  const files = walkAllFiles(root).sort((a, b) => a.path.localeCompare(b.path));
  return {
    reportKind: 'xensonar-codex-patch-scope-snapshot',
    harnessVersion: codexRefactorHarnessVersion,
    patchScopePolicyVersion,
    generatedAt: new Date().toISOString(),
    exclusion: {
      dirs: [...defaultExcludedDirs].sort(),
      volatileFiles: defaultExcludedFileRules.map((rule) => String(rule)),
    },
    summary: {
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    },
    files,
  };
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(relPath(rel), 'utf8'));
}

function writeJson(rel, value) {
  const full = relPath(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2) + '\n');
}

function byPath(rows = []) {
  return new Map(rows.map((row) => [row.path, row]));
}

function compareSnapshots(baseline, current) {
  const before = byPath(baseline.files || []);
  const after = byPath(current.files || []);
  const added = [...after.keys()].filter((file) => !before.has(file)).sort();
  const deleted = [...before.keys()].filter((file) => !after.has(file)).sort();
  const modified = [...after.keys()].filter((file) => before.has(file) && after.get(file).sha256 !== before.get(file).sha256).sort();
  const changedFiles = [...new Set([...added, ...deleted, ...modified])].sort();
  const changedRows = changedFiles.map((file) => {
    const b = before.get(file);
    const c = after.get(file);
    return {
      file,
      status: !b ? 'added' : !c ? 'deleted' : 'modified',
      before: b ? { bytes: b.bytes, sha256: b.sha256 } : null,
      after: c ? { bytes: c.bytes, sha256: c.sha256 } : null,
      deltaBytes: (c?.bytes || 0) - (b?.bytes || 0),
    };
  });
  return { added, deleted, modified, changedFiles, changedRows };
}

function writeMarkdown(report) {
  const md = [
    '# Xensonar Codex Patch Scope Guard',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- policyVersion: ${report.patchScopePolicyVersion}`,
    `- baseline: ${report.baseline.path}`,
    `- selectedScope: ${report.scope.name}`,
    `- verdict: ${report.verdict}`,
    '',
    '## Lesart',
    '',
    'Dieser Guard vergleicht den aktuellen Arbeitsbaum gegen eine eingefrorene Baseline und prüft, ob die geänderten Dateien zum deklarierten Patch-Scope passen. Damit wird aus „wir sagen Harness-Slice“ eine maschinenlesbare Behauptung: Produkt-Runtime-Dateien dürfen in `harness-only` nicht beiläufig auftauchen.',
    '',
    '## Scope',
    '',
    `- Label: ${report.scope.label}`,
    `- Intent: ${report.scope.intent}`,
    `- Required guards: ${report.scope.requiredGuards.join(' | ')}`,
    '',
    '## Delta',
    '',
    `- hinzugefügt: ${report.delta.added.length}`,
    `- gelöscht: ${report.delta.deleted.length}`,
    `- geändert: ${report.delta.modified.length}`,
    `- alle geänderten Dateien: ${report.delta.changedFiles.length}`,
    '',
    '## Geänderte Dateien',
    '',
    '| Datei | Status | Δ Bytes | Scope-Bewertung |',
    '|---|---|---:|---|',
  ];
  if (report.delta.changedRows.length) {
    const classifications = new Map(report.classifications.map((row) => [row.file, row]));
    for (const row of report.delta.changedRows) {
      const cls = classifications.get(row.file);
      md.push(`| ${row.file} | ${row.status} | ${row.deltaBytes} | ${cls?.allowed ? 'ok' : `BLOCK: ${cls?.reason || 'unknown'}`} |`);
    }
  } else {
    md.push('| — | — | 0 | ok |');
  }
  md.push('', '## Verstöße', '');
  if (report.violations.length) {
    for (const violation of report.violations) md.push(`- ${violation.file}: ${violation.reason}`);
  } else {
    md.push('- keine Scope-Verstöße erkannt');
  }
  md.push('', '## Falsifikationsfrage', '');
  md.push('Entspricht die tatsächliche Dateimenge dem deklarierten Patch-Typ, oder wurde eine Produkt-/Runtime-Grenze unter dem Etikett eines Harness-Slices heimlich berührt?');
  fs.mkdirSync(path.dirname(relPath(patchScopeGuardPaths.markdown)), { recursive: true });
  fs.writeFileSync(relPath(patchScopeGuardPaths.markdown), md.join('\n'));
}

const args = parseArgs(process.argv);
const current = buildSnapshot();
if (args.writeBaseline) {
  writeJson(args.writeBaseline, current);
  console.log(JSON.stringify({ ok: true, wrote: args.writeBaseline, fileCount: current.summary.fileCount }, null, 2));
  process.exit(0);
}
const scope = getPatchScope(args.scope);
if (!scope) throw new Error(`Unknown patch scope: ${args.scope}`);
const baseline = readJson(args.baseline);
const delta = compareSnapshots(baseline, current);
const classifications = delta.changedFiles.map((file) => ({ file, ...findPatchScopeViolations([file], args.scope)[0] }));
const violationRows = findPatchScopeViolations(delta.changedFiles, args.scope);
const violations = violationRows.map((row) => ({ file: row.file, reason: row.reason }));
const ok = args.allowScopeViolations || violations.length === 0;
const report = {
  ok,
  reportKind: 'xensonar-codex-patch-scope-guard',
  harnessVersion: codexRefactorHarnessVersion,
  patchScopePolicyVersion,
  generatedAt: new Date().toISOString(),
  baseline: {
    path: args.baseline,
    generatedAt: baseline.generatedAt,
    summary: baseline.summary || { fileCount: baseline.fileCount, totalBytes: null },
  },
  current: { generatedAt: current.generatedAt, summary: current.summary },
  scope: {
    name: args.scope,
    label: scope.label,
    intent: scope.intent,
    requiredGuards: scope.requiredGuards,
  },
  policy: { allowScopeViolations: args.allowScopeViolations },
  delta,
  classifications: delta.changedFiles.map((file) => {
    const match = findPatchScopeViolations([file], args.scope)[0];
    if (match) return match;
    return { file, scopeName: args.scope, knownScope: true, allowed: true, reason: 'allowed-by-scope' };
  }),
  violations,
  verdict: violations.length ? (args.allowScopeViolations ? 'allowed-scope-violations' : 'blocked-scope-violations') : 'clean',
};
writeJson(patchScopeGuardPaths.json, report);
writeMarkdown(report);
console.log(JSON.stringify({ ok: report.ok, report: patchScopeGuardPaths.json, markdown: patchScopeGuardPaths.markdown, scope: args.scope, changedFiles: delta.changedFiles.length, violations: violations.length, verdict: report.verdict }, null, 2));
process.exit(ok ? 0 : 1);
