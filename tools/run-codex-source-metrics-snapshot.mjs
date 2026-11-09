#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  codexRefactorHarnessVersion,
  sourceMetricsPaths,
} from './codex-refactor-harness-contract.mjs';
import {
  buildDirectorySummary,
  buildSourceMetrics,
  buildTagHistogram,
  codexSourceMetricsModuleVersion,
  sourceMetricHotspots,
} from './codex-source-metrics.mjs';

const root = process.cwd();

function parseArgs(argv) {
  const args = { limit: 20 };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit') args.limit = Number(argv[++i] || args.limit);
    else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node tools/run-codex-source-metrics-snapshot.mjs [--limit <n>]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(args.limit) || args.limit < 1) args.limit = 20;
  return args;
}

function relPath(rel) {
  return path.join(root, rel);
}

function writeReports(report) {
  fs.mkdirSync(path.dirname(relPath(sourceMetricsPaths.json)), { recursive: true });
  fs.writeFileSync(relPath(sourceMetricsPaths.json), JSON.stringify(report, null, 2));
  const md = [
    '# Xensonar Codex Source Metrics Snapshot',
    '',
    `- ok: ${report.ok}`,
    `- generatedAt: ${report.generatedAt}`,
    `- harnessVersion: ${report.harnessVersion}`,
    `- moduleVersion: ${report.moduleVersion}`,
    '',
    '## Lesart',
    '',
    'Dieser Snapshot ist die gemeinsame Messbasis für Refactor Radar, Impact Ledger und künftige dünne Refactor-Slices. Er bewertet keine Klangqualität und beweist keine Runtime-Funktion, sondern normalisiert Datei-, Tag-, Größen- und Sediment-Signale.',
    '',
    '## Summary',
    '',
    `- Dateien: ${report.summary.fileCount}`,
    `- Zeilen: ${report.summary.totalLines}`,
    `- Bytes: ${report.summary.totalBytes}`,
    '',
    '## Tag-Histogramm',
    '',
    '| Tag | Dateien |',
    '|---|---:|',
  ];
  for (const row of report.tagHistogram) md.push(`| ${row.tag} | ${row.count} |`);
  md.push('', '## Größte Verzeichnisse nach Zeilen', '', '| Pfad | Dateien | Zeilen | Bytes | Max. Sediment |', '|---|---:|---:|---:|---:|');
  for (const row of report.directorySummary) md.push(`| ${row.path} | ${row.fileCount} | ${row.lines} | ${row.bytes} | ${row.maxSedimentScore} |`);
  md.push('', '## Sediment-Hotspots', '', '| Datei | Zeilen | Bytes | Sediment | Tags |', '|---|---:|---:|---:|---|');
  for (const row of report.sedimentHotspots) md.push(`| ${row.file} | ${row.lines} | ${row.bytes} | ${row.sedimentScore} | ${row.tags.join(', ')} |`);
  fs.writeFileSync(relPath(sourceMetricsPaths.markdown), md.join('\n'));
}

const args = parseArgs(process.argv);
const source = buildSourceMetrics(root);
const report = {
  ok: source.summary.fileCount > 0,
  reportKind: 'xensonar-codex-source-metrics-snapshot',
  harnessVersion: codexRefactorHarnessVersion,
  moduleVersion: codexSourceMetricsModuleVersion,
  generatedAt: new Date().toISOString(),
  summary: source.summary,
  tagHistogram: buildTagHistogram(source.metrics),
  directorySummary: buildDirectorySummary(source.metrics, 3).slice(0, args.limit),
  sedimentHotspots: sourceMetricHotspots(source.metrics, args.limit),
};
writeReports(report);
console.log(JSON.stringify({ ok: report.ok, report: sourceMetricsPaths.json, markdown: sourceMetricsPaths.markdown, files: report.summary.fileCount, hotspots: report.sedimentHotspots.length }, null, 2));
process.exit(report.ok ? 0 : 1);
