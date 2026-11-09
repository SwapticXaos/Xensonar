#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  agentsInstructionsPath,
  candidatePlannerPaths,
  codexRefactorHarnessVersion,
  focusProfileNames,
  focusProfiles,
  impactLedgerPaths,
} from './codex-refactor-harness-contract.mjs';
import {
  buildDirectorySummary,
  buildSourceMetrics,
  buildSourceProfileLedger,
  buildTagHistogram,
  codexSourceMetricsModuleVersion,
  readRepoText,
  repoPathExists,
  sourceMetricHotspots,
} from './codex-source-metrics.mjs';

const root = process.cwd();

function parseArgs(argv) {
  const args = { runGates: false, limit: 12, skipCandidateRefresh: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run-gates') args.runGates = true;
    else if (arg === '--limit') args.limit = Number(argv[++i] || args.limit);
    else if (arg === '--skip-candidate-refresh') args.skipCandidateRefresh = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/run-codex-refactor-impact-ledger.mjs [--run-gates] [--limit <n>] [--skip-candidate-refresh]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(args.limit) || args.limit < 1) args.limit = 12;
  return args;
}

function relPath(...parts) {
  return path.join(root, ...parts);
}

function read(rel) {
  return fs.readFileSync(relPath(rel), 'utf8');
}

function readOptional(rel) {
  return repoPathExists(root, rel) ? readRepoText(root, rel) : '';
}

function readJsonOptional(rel) {
  if (!repoPathExists(root, rel)) return null;
  try { return JSON.parse(read(rel)); } catch { return null; }
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

function latestBuildReports() {
  return fs.readdirSync(root)
    .filter((name) => /^BUILD_REPORT_XENSONAR_.*\.md$/.test(name))
    .map((name) => {
      const stat = fs.statSync(relPath(name));
      const text = read(name);
      return { file: name, mtimeMs: stat.mtimeMs, htmlBytes: parseHtmlBytes(text), hasImpactLedger: text.includes('Impact Ledger') };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, 8);
}

function parseHtmlBytes(text) {
  const matches = [...text.matchAll(/(?:Core-HTML|HTML[^\n:]*):\s*([0-9][0-9.,]*)\s*Bytes/gi)];
  if (!matches.length) return null;
  const raw = matches[matches.length - 1][1].replace(/[.,]/g, '');
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function currentDistHtmlSize() {
  const html = relPath('dist', 'index.html');
  if (!fs.existsSync(html)) return null;
  const stat = fs.statSync(html);
  return { file: 'dist/index.html', bytes: stat.size };
}

function candidateDrift(previous, current) {
  if (!previous || !current) return { available: false, reason: 'no previous candidate report available before refresh' };
  const prevPlans = new Map((previous.plans || []).map((plan) => [plan.focus, plan]));
  const changes = [];
  for (const plan of current.plans || []) {
    const prev = prevPlans.get(plan.focus);
    const beforeFile = prev?.recommendedFirstSlice?.file || null;
    const afterFile = plan.recommendedFirstSlice?.file || null;
    changes.push({
      focus: plan.focus,
      beforeFile,
      afterFile,
      changed: beforeFile !== afterFile,
      beforeReason: prev?.recommendedFirstSlice?.reason || null,
      afterReason: plan.recommendedFirstSlice?.reason || null,
    });
  }
  return { available: true, changedCount: changes.filter((item) => item.changed).length, changes };
}

function buildQueue(candidateReport, sourceMetricMap, limit) {
  const byFile = new Map();
  for (const plan of candidateReport?.plans || []) {
    for (const candidate of plan.candidates || []) {
      const metrics = sourceMetricMap.get(candidate.file) || null;
      const tags = metrics?.tags || candidate.riskTags || [];
      const action = tags.includes('audio/runtime')
        ? 'measure-first: nur Gate/Adapter/Report-Slice, kein Scheduling/Klangkörper'
        : tags.includes('persistence/package')
          ? 'roundtrip-first: Payload-Ledger/Gate vor Datenform-Änderung'
          : tags.includes('ui-surface')
            ? 'truth-first: Handler/Props-Vertrag, keine erklärende UI-Tapete'
            : 'thin-helper-first: kleine Typ-/Hilfsgrenze extrahieren';
      const current = byFile.get(candidate.file) || {
        focuses: [],
        file: candidate.file,
        candidateRoles: [],
        candidateWeight: 0,
        sedimentScore: metrics?.sedimentScore ?? null,
        bytes: metrics?.bytes ?? candidate.bytes,
        lines: metrics?.lines ?? candidate.lines,
        tags,
        recommendedAction: action,
      };
      if (!current.focuses.includes(plan.focus)) current.focuses.push(plan.focus);
      if (!current.candidateRoles.includes(candidate.candidateRole)) current.candidateRoles.push(candidate.candidateRole);
      current.candidateWeight = Math.max(current.candidateWeight ?? 0, candidate.refactorWeight ?? 0);
      byFile.set(candidate.file, current);
    }
  }
  return [...byFile.values()]
    .sort((a, b) => (b.sedimentScore ?? 0) - (a.sedimentScore ?? 0) || (b.candidateWeight ?? 0) - (a.candidateWeight ?? 0))
    .slice(0, limit);
}

function refreshCandidateReport(args) {
  const previous = readJsonOptional(candidatePlannerPaths.json);
  if (!args.skipCandidateRefresh) {
    const run = shell('node tools/run-codex-refactor-candidate-planner.mjs --all');
    if (run.status !== 'pass') return { previous, current: null, refresh: run };
    return { previous, current: readJsonOptional(candidatePlannerPaths.json), refresh: run };
  }
  return { previous, current: previous, refresh: null };
}

function writeReports(report) {
  fs.mkdirSync(path.dirname(relPath(impactLedgerPaths.json)), { recursive: true });
  fs.writeFileSync(relPath(impactLedgerPaths.json), JSON.stringify(report, null, 2));
  const md = [
    '# Xensonar Codex Refactor Impact Ledger',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- sourceMetricsModule: ${report.sourceMetrics.module} @ ${report.sourceMetrics.version}`,
    `- package: ${report.package.name}`,
    `- version: ${report.package.version}`,
    `- AGENTS.md: ${report.agentsPresent ? 'present' : 'missing'}`,
    '',
    '## Lesart',
    '',
    'Dieses Refactor-Wirkungsbuch sammelt Vorher/Nachher-Signale, Sediment-Hotspots und Candidate-Drift. Es ist kein Klang-/UI-/Export-Beweis, sondern eine Messschicht vor dem nächsten dünnen Refactor-Slice.',
    '',
    '## Source Metrics Modul',
    '',
    'Die Datei `tools/codex-source-metrics.mjs` ist die gemeinsame Messquelle für Impact Ledger und Source-Metrics-Snapshot. Neue Refactor-Reports sollen diese Quelle wiederverwenden statt eigene Sediment-/Tagging-Heuristiken zu duplizieren.',
    '',
    '## Build-/Größen-Signale',
    '',
    `- dist/index.html: ${report.buildSignals.currentDistHtml ? `${report.buildSignals.currentDistHtml.bytes} Bytes` : 'nicht vorhanden'}`,
    `- letzte Build-Reports: ${report.buildSignals.latestBuildReports.length}`,
    '',
    '## Source Summary',
    '',
    `- Dateien: ${report.sourceSummary.fileCount}`,
    `- Zeilen: ${report.sourceSummary.totalLines}`,
    `- Bytes: ${report.sourceSummary.totalBytes}`,
    '',
    '## Tag-Histogramm',
    '',
    '| Tag | Dateien |',
    '|---|---:|',
  ];
  for (const item of report.sourceMetrics.tagHistogram) md.push(`| ${item.tag} | ${item.count} |`);
  md.push('', '## Sediment-Hotspots', '', '| Datei | Zeilen | Bytes | Sediment | Tags |', '|---|---:|---:|---:|---|');
  for (const item of report.sedimentHotspots) {
    md.push(`| ${item.file} | ${item.lines} | ${item.bytes} | ${item.sedimentScore} | ${item.tags.join(', ')} |`);
  }
  md.push('', '## Profil-Ledger', '', '| Profil | Dateien | Zeilen | Bytes | Hotspot | Fehlende Primärdateien |', '|---|---:|---:|---:|---|---|');
  for (const profile of report.profileLedger) {
    md.push(`| ${profile.focus} | ${profile.fileCount} | ${profile.aggregate.lines} | ${profile.aggregate.bytes} | ${profile.hotspot?.file || '—'} | ${profile.missingPrimaryFiles.join(', ') || '—'} |`);
  }
  md.push('', '## Candidate-Drift', '');
  if (report.candidateDrift.available) {
    md.push(`- geänderte erste Slices: ${report.candidateDrift.changedCount}`, '');
    for (const change of report.candidateDrift.changes) md.push(`- ${change.focus}: ${change.beforeFile || '—'} → ${change.afterFile || '—'}`);
  } else {
    md.push(`- nicht verfügbar: ${report.candidateDrift.reason}`);
  }
  md.push('', '## Refactor Queue', '', '| Profile | Datei | Zeilen | Sediment | Aktion |', '|---|---|---:|---:|---|');
  for (const item of report.refactorQueue) {
    md.push(`| ${item.focuses.join(', ')} | ${item.file} | ${item.lines} | ${item.sedimentScore} | ${item.recommendedAction} |`);
  }
  md.push('', '## Gate-Ergebnisse', '');
  if (report.gateResults.length) {
    for (const gate of report.gateResults) md.push(`- ${gate.status.toUpperCase()} · ${gate.command} · ${gate.durationMs}ms`);
  } else {
    md.push('- nicht ausgeführt; für Gate-Lauf `npm run xensonar:codex:refactor-impact:gates` verwenden');
  }
  fs.writeFileSync(relPath(impactLedgerPaths.markdown), md.join('\n'));
}

const args = parseArgs(process.argv);
const pkg = JSON.parse(read('package.json'));
const candidate = refreshCandidateReport(args);
const source = buildSourceMetrics(root);
const gateResults = [];
if (args.runGates) {
  gateResults.push(shell('node tools/check-codex-source-metrics-contract.mjs'));
  gateResults.push(shell('node tools/check-codex-refactor-harness-contract.mjs'));
  gateResults.push(shell('node tools/check-codex-refactor-radar-suite.mjs'));
  gateResults.push(shell('node tools/check-codex-refactor-candidate-planner.mjs'));
}
const report = {
  ok: Boolean(candidate.current) && (!candidate.refresh || candidate.refresh.status === 'pass') && gateResults.every((gate) => gate.status === 'pass'),
  reportKind: 'xensonar-codex-refactor-impact-ledger',
  harnessVersion: codexRefactorHarnessVersion,
  generatedAt: new Date().toISOString(),
  package: { name: pkg.name, version: pkg.version },
  agentsInstructionsPath,
  agentsPresent: readOptional(agentsInstructionsPath).trim().length > 0,
  sourceMetrics: {
    module: 'tools/codex-source-metrics.mjs',
    version: codexSourceMetricsModuleVersion,
    tagHistogram: buildTagHistogram(source.metrics),
    largestDirectories: buildDirectorySummary(source.metrics, 3).slice(0, args.limit),
  },
  sourceSummary: source.summary,
  buildSignals: {
    currentDistHtml: currentDistHtmlSize(),
    latestBuildReports: latestBuildReports(),
  },
  sedimentHotspots: sourceMetricHotspots(source.metrics, args.limit),
  profileLedger: buildSourceProfileLedger(root, focusProfileNames(), focusProfiles, source.byFile),
  candidateRefresh: candidate.refresh,
  candidateDrift: candidateDrift(candidate.previous, candidate.current),
  refactorQueue: buildQueue(candidate.current, source.byFile, args.limit),
  gateResults,
};
writeReports(report);
console.log(JSON.stringify({ ok: report.ok, report: impactLedgerPaths.json, markdown: impactLedgerPaths.markdown, hotspots: report.sedimentHotspots.length, queue: report.refactorQueue.length, sourceMetricsModule: report.sourceMetrics.module }, null, 2));
process.exit(report.ok ? 0 : 1);
