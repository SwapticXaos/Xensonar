#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(__filename), '..');
const fail = (message) => {
  console.error(`core-entry-boundary-split check failed: ${message}`);
  process.exit(1);
};
const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(repo, rel));

for (const rel of [
  'src/features/xensonar/rooms/coreBuildProfile.ts',
  'src/features/xensonar/rooms/AppRoomViewport.tsx',
  'src/features/xensonar/layout/AppHeader.tsx',
  'tools/audit-core-room-profile-variants.mjs',
]) {
  if (!exists(rel)) fail(`${rel} is missing`);
}

const pkg = JSON.parse(read('package.json'));
if (!/^3\.2\.91\.4\.114\.(50|51|52|53)$/.test(pkg.version)) fail(`package version is ${pkg.version}, expected 3.2.91.4.114.50/51/52/53 line`);
if (!pkg.scripts?.['build:core-test']?.includes('XENSONAR_CORE_TEST_BUILD=1')) fail('build:core-test script must use XENSONAR_CORE_TEST_BUILD=1');

const vite = read('vite.config.ts');
if (!vite.includes('__XENSONAR_CORE_TEST_BUILD__') || !vite.includes('process.env.XENSONAR_CORE_TEST_BUILD')) {
  fail('vite config must define __XENSONAR_CORE_TEST_BUILD__ from env');
}

const viewport = read('src/features/xensonar/rooms/AppRoomViewport.tsx');
for (const forbidden of [
  'import { MainRoom }',
  'import { XenpolarRoom }',
  'import { IrrlichtArenaPanel }',
]) {
  if (viewport.includes(forbidden)) fail(`AppRoomViewport still has runtime import: ${forbidden}`);
}
for (const needle of [
  'lazy(() => import("./MainRoom")',
  'lazy(() => import("./XenpolarRoom")',
  'lazy(() => import("./IrrlichtArenaPanel")',
  'XENSONAR_CORE_TEST_BUILD',
  'DisabledExtraRoom',
]) {
  if (!viewport.includes(needle)) fail(`AppRoomViewport missing boundary marker: ${needle}`);
}

const header = read('src/features/xensonar/layout/AppHeader.tsx');
for (const needle of ['XENSONAR_CORE_TEST_BUILD', 'II. MATERIALSCHMIEDE', 'III.1 TOPOLOGICAL MANIFOLD', 'IV. XENPOLAR']) {
  if (!header.includes(needle)) fail(`AppHeader missing full/core navigation marker: ${needle}`);
}

const audit = spawnSync(process.execPath, ['tools/audit-core-room-profile-variants.mjs', '--json'], {
  cwd: repo,
  encoding: 'utf8',
});
if (audit.status !== 0) {
  process.stdout.write(audit.stdout || '');
  process.stderr.write(audit.stderr || '');
  fail('variant audit did not pass');
}
const report = JSON.parse(audit.stdout);
if (report.variantA.verdict !== 'implemented as first boundary split' || report.variantA.viable !== true) {
  fail('Variant A boundary split must be implemented and viable');
}
if (report.variantB.verdict !== 'not used') fail('Variant B must not be used in this patch');
if (report.viewportRuntimeExtraImports.length !== 0) fail('viewport must not runtime-import Extras rooms');
if (!report.handoffEvidence.jumpRunJamSenderPreserved || !report.handoffEvidence.xensonarRefactorReceiverPreserved) {
  fail('Jump-Run-Jam sender and Xensonar Refactor receiver evidence must remain preserved');
}

console.log('core-entry-boundary-split check passed');
console.log(`Variant A: ${report.variantA.verdict}; Variant B: ${report.variantB.verdict}; remaining guarded/static controller imports: ${report.remainingCoreStaticExtras.length}`);
