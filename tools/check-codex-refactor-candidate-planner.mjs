#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  candidatePlannerPaths,
  codexRefactorHarnessVersion,
  focusProfileNames,
} from './codex-refactor-harness-contract.mjs';

const failures = [];
const run = spawnSync(process.execPath, ['tools/run-codex-refactor-candidate-planner.mjs', '--all'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (run.status !== 0) failures.push(`candidate planner failed with ${run.status}: ${run.stderr || run.stdout}`.trim());
if (!fs.existsSync(candidatePlannerPaths.json)) failures.push(`missing candidate json ${candidatePlannerPaths.json}`);
if (!fs.existsSync(candidatePlannerPaths.markdown)) failures.push(`missing candidate markdown ${candidatePlannerPaths.markdown}`);

if (!failures.length) {
  const report = JSON.parse(fs.readFileSync(candidatePlannerPaths.json, 'utf8'));
  if (report.harnessVersion !== codexRefactorHarnessVersion) failures.push(`harnessVersion ${report.harnessVersion} != ${codexRefactorHarnessVersion}`);
  if (report.reportKind !== 'xensonar-codex-refactor-candidate-planner') failures.push(`unexpected reportKind ${report.reportKind}`);
  if (report.profileCount !== focusProfileNames().length) failures.push(`profileCount ${report.profileCount} != ${focusProfileNames().length}`);
  if (!report.agentsPresent) failures.push('AGENTS.md not embedded/present for candidate planner context');
  const seen = new Set((report.plans || []).map((plan) => plan.focus));
  for (const focus of focusProfileNames()) {
    if (!seen.has(focus)) failures.push(`missing focus plan ${focus}`);
    const plan = (report.plans || []).find((item) => item.focus === focus);
    if (!plan) continue;
    if (!plan.recommendedFirstSlice?.file) failures.push(`${focus} missing recommendedFirstSlice`);
    if (!Array.isArray(plan.candidates) || plan.candidates.length < 3) failures.push(`${focus} has too few candidates`);
    if (!String(plan.recommendedFirstSlice?.falsificationQuestion || '').includes('?')) failures.push(`${focus} missing falsification question`);
    if (!Array.isArray(plan.gates) || plan.gates.length === 0) failures.push(`${focus} missing gates`);
  }
  const md = fs.readFileSync(candidatePlannerPaths.markdown, 'utf8');
  for (const marker of ['Candidate Planner', 'Empfohlener erster dünner Slice', 'Falsifikationsfrage', 'kein Klang-/UI-Beweis']) {
    if (!md.includes(marker)) failures.push(`markdown missing marker ${marker}`);
  }
}

if (failures.length) {
  console.error('[codex-refactor-candidate-planner] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-refactor-candidate-planner', version: codexRefactorHarnessVersion, profiles: focusProfileNames().length }, null, 2));
