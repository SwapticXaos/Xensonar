#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildCheckRegistryCurationReport, writeCheckRegistryCurationReports, checkRegistryCurationPaths } from './check-registry-curation-core.mjs';

const root = process.cwd();
const report = buildCheckRegistryCurationReport(root);
writeCheckRegistryCurationReports(root, report);
const failures = [];
if (!report.ok) failures.push('report ok flag is false');
if (report.version !== '3.2.91-7.7.70') failures.push(`unexpected version ${report.version}`);
if (report.summary.totalCheckScripts < 200) failures.push(`unexpectedly small check registry: ${report.summary.totalCheckScripts}`);
for (const proofClass of ['marker-static', 'source-shape', 'build-artifact']) {
  if (!report.summary.primaryProofClassHistogram.some((entry) => entry.name === proofClass || report.summary.proofClassSignalHistogram.some((signal) => signal.name === proofClass))) {
    failures.push(`missing proof class signal: ${proofClass}`);
  }
}
for (const file of [checkRegistryCurationPaths.json, checkRegistryCurationPaths.markdown, 'docs/CHECK_REGISTRY_CURATION.md', 'AGENTS.md']) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);
}
const doc = fs.existsSync(path.join(root, 'docs/CHECK_REGISTRY_CURATION.md')) ? fs.readFileSync(path.join(root, 'docs/CHECK_REGISTRY_CURATION.md'), 'utf8') : '';
for (const marker of ['marker-static', 'source-shape', 'browser-dom', 'behavioural-audio-export', 'not behavioural proof']) {
  if (!doc.includes(marker)) failures.push(`docs/CHECK_REGISTRY_CURATION.md missing marker: ${marker}`);
}
const agents = fs.existsSync(path.join(root, 'AGENTS.md')) ? fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8') : '';
for (const marker of ['Check Registry Curation', 'proof class', 'marker-static']) {
  if (!agents.includes(marker)) failures.push(`AGENTS.md missing marker: ${marker}`);
}
if (failures.length) {
  console.error('[check-registry-curation] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, report: checkRegistryCurationPaths.json, markdown: checkRegistryCurationPaths.markdown, totalCheckScripts: report.summary.totalCheckScripts, warnings: report.warnings.length }, null, 2));
