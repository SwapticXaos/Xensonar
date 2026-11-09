#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveTypeScriptCliPath, resolveTypeScriptPackageRoot } from './typescript-runtime.mjs';
import ts from './typescript-runtime.mjs';
import { XENSONAR_PROJECT_LINE } from './xensonar-project-line.mjs';

const checks = [
  'tools/check-refactor-foundation-133.mjs',
  'tools/check-drum-manager-live-kit-routing-134.mjs',
];

const results = checks.map((check) => {
  const run = spawnSync(process.execPath, [check], {
    encoding: 'utf8',
    env: check.endsWith('check-refactor-foundation-133.mjs')
      ? { ...process.env, XENSONAR_MAX_PHYSICAL_CHECKS: '831' }
      : process.env,
  });
  return {
    check,
    ok: run.status === 0,
    status: run.status,
    stdout: (run.stdout || '').trim().slice(-1600),
    stderr: (run.stderr || '').trim().slice(-1600),
  };
});

const toolFiles = fs.readdirSync('tools').filter((name) => name.endsWith('.mjs'));
const hardcodedCompilerRefs = [];
for (const name of toolFiles) {
  const text = fs.readFileSync(path.join('tools', name), 'utf8');
  if (/from\s+['\"]typescript['\"]/.test(text) || /node_modules\/typescript\/bin\/tsc/.test(text)) {
    hardcodedCompilerRefs.push(name);
  }
}

const physicalCheckCount = toolFiles.filter((name) => /^check-.*\.mjs$/.test(name)).length;
const metrics = {
  physicalCheckCount,
  typescriptVersion: ts.version,
  typescriptPackageRoot: resolveTypeScriptPackageRoot(),
  typescriptCliPath: resolveTypeScriptCliPath(),
  hardcodedCompilerRefCount: hardcodedCompilerRefs.length,
  artifactPatch: XENSONAR_PROJECT_LINE.artifactPatch,
  baseArtifactPatch: XENSONAR_PROJECT_LINE.baseArtifactPatch,
};
const metricChecks = {
  physicalCheckCountAtMost831: physicalCheckCount <= 831,
  sharedTypeScriptRuntimeOwnsCompilerResolution: hardcodedCompilerRefs.length === 0,
  artifactPatchIs134: XENSONAR_PROJECT_LINE.artifactPatch === 134,
  baseArtifactPatchIs133: XENSONAR_PROJECT_LINE.baseArtifactPatch === 133,
};
const failures = [
  ...results.filter((entry) => !entry.ok).map((entry) => entry.check),
  ...Object.entries(metricChecks).filter(([, ok]) => !ok).map(([name]) => `metric:${name}`),
];

const report = {
  ok: failures.length === 0,
  patch: 134,
  purpose: 'drum-manager-live-palette-and-toolchain-consolidation',
  metrics,
  metricChecks,
  checks: results.map(({ check, ok, status }) => ({ check, ok, status })),
  hardcodedCompilerRefs,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
