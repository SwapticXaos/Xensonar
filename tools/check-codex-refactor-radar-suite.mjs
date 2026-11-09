#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  codexRefactorHarnessVersion,
  focusProfileNames,
  radarIndexPaths,
  reportPathsForFocus,
} from './codex-refactor-harness-contract.mjs';

const failures = [];
const run = spawnSync(process.execPath, ['tools/run-codex-refactor-harness.mjs', '--all'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 16,
});
if (run.status !== 0) {
  failures.push(`radar runner failed with ${run.status}: ${run.stderr || run.stdout}`.trim());
}
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
if (!fs.existsSync(radarIndexPaths.json)) failures.push(`missing radar json ${radarIndexPaths.json}`);
if (!fs.existsSync(radarIndexPaths.markdown)) failures.push(`missing radar markdown ${radarIndexPaths.markdown}`);

if (!failures.length) {
  const index = readJson(radarIndexPaths.json);
  const expected = focusProfileNames();
  if (index.harnessVersion !== codexRefactorHarnessVersion) failures.push(`radar harnessVersion ${index.harnessVersion} != ${codexRefactorHarnessVersion}`);
  if (index.profileCount !== expected.length) failures.push(`profileCount ${index.profileCount} != ${expected.length}`);
  const seen = new Set((index.profiles || []).map((profile) => profile.focus));
  for (const focus of expected) {
    if (!seen.has(focus)) failures.push(`radar missing profile ${focus}`);
    const paths = reportPathsForFocus(focus);
    if (!fs.existsSync(paths.json)) failures.push(`missing profile json ${paths.json}`);
    if (!fs.existsSync(paths.markdown)) failures.push(`missing profile markdown ${paths.markdown}`);
    if (fs.existsSync(paths.json)) {
      const report = readJson(paths.json);
      if (report.focus !== focus) failures.push(`${paths.json} focus mismatch ${report.focus}`);
      if (report.harnessVersion !== codexRefactorHarnessVersion) failures.push(`${paths.json} harnessVersion mismatch ${report.harnessVersion}`);
      if (!report.agentInstructionsDigest?.present) failures.push(`${paths.json} has no AGENTS digest`);
      if ((report.missingPrimaryFiles || []).length) failures.push(`${focus} missing primary files: ${report.missingPrimaryFiles.join(', ')}`);
      if (!String(report.codexPrompt || '').includes('--- AGENTS.md ---')) failures.push(`${focus} codexPrompt does not embed AGENTS.md`);
    }
  }
}

if (failures.length) {
  console.error('[codex-refactor-radar-suite] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, harness: 'codex-refactor-radar', version: codexRefactorHarnessVersion, profiles: focusProfileNames().length }, null, 2));
