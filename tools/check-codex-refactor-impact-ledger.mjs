#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  focusProfileNames,
  impactLedgerPaths,
} from './codex-refactor-harness-contract.mjs';

const failures = [];
const run = spawnSync(process.execPath, ['tools/run-codex-refactor-impact-ledger.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (run.status !== 0) failures.push(`impact ledger failed with ${run.status}: ${run.stderr || run.stdout}`.trim());
if (!fs.existsSync(impactLedgerPaths.json)) failures.push(`missing impact json ${impactLedgerPaths.json}`);
if (!fs.existsSync(impactLedgerPaths.markdown)) failures.push(`missing impact markdown ${impactLedgerPaths.markdown}`);

if (!failures.length) {
  const report = JSON.parse(fs.readFileSync(impactLedgerPaths.json, 'utf8'));
  if (report.reportKind !== 'xensonar-codex-refactor-impact-ledger') failures.push(`unexpected reportKind ${report.reportKind}`);
  if (report.harnessVersion !== codexRefactorHarnessVersion) failures.push(`harnessVersion ${report.harnessVersion} != ${codexRefactorHarnessVersion}`);
  if (!report.agentsPresent) failures.push('AGENTS.md not present in impact ledger context');
  if (!report.sourceSummary || report.sourceSummary.fileCount < 10) failures.push('sourceSummary unexpectedly small');
  if (report.sourceMetrics?.module !== 'tools/codex-source-metrics.mjs') failures.push('impact ledger is not using codex-source-metrics module');
  if (!Array.isArray(report.sourceMetrics?.tagHistogram) || report.sourceMetrics.tagHistogram.length < 3) failures.push('sourceMetrics tagHistogram unexpectedly small');
  if (!Array.isArray(report.sedimentHotspots) || report.sedimentHotspots.length < 5) failures.push('sedimentHotspots too small');
  if (!Array.isArray(report.profileLedger) || report.profileLedger.length !== focusProfileNames().length) failures.push('profileLedger profile count mismatch');
  if (!Array.isArray(report.refactorQueue) || report.refactorQueue.length < 5) failures.push('refactorQueue too small');
  for (const profile of report.profileLedger || []) {
    if (!profile.focus || !profile.aggregate) failures.push(`invalid profile ledger row ${JSON.stringify(profile)}`);
    if ((profile.missingPrimaryFiles || []).length) failures.push(`${profile.focus} missing primary files: ${profile.missingPrimaryFiles.join(', ')}`);
  }
  const md = fs.readFileSync(impactLedgerPaths.markdown, 'utf8');
  for (const marker of ['Impact Ledger', 'Vorher/Nachher-Signale', 'Sediment-Hotspots', 'Refactor-Wirkungsbuch', 'Candidate-Drift', 'Refactor Queue', 'Source Metrics Modul', 'Tag-Histogramm']) {
    if (!md.includes(marker)) failures.push(`markdown missing marker ${marker}`);
  }
}

if (failures.length) {
  console.error('[codex-refactor-impact-ledger] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-refactor-impact-ledger', version: codexRefactorHarnessVersion, profiles: focusProfileNames().length }, null, 2));
