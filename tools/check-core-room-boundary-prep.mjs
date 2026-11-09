#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(__filename), '..');
const fail = (message) => {
  console.error(`core-room-boundary-prep check failed: ${message}`);
  process.exit(1);
};
const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(repo, rel));

const profileRel = 'src/features/xensonar/rooms/roomBuildProfiles.ts';
if (!exists(profileRel)) fail(`${profileRel} is missing`);
const profile = read(profileRel);
if (!profile.includes("XENSONAR_ROOM_BUILD_PROFILE_VERSION = '3.2.91.4.114.49-core-room-boundary-prep-1'")) {
  fail('room build profile version marker is missing');
}
if (/^import\s/m.test(profile)) fail('roomBuildProfiles.ts must stay import-free/lightweight');
for (const id of ['RESONANCE', 'L3LAB', 'TOPOLOGY', 'MAIN', 'XENPOLAR', 'GAME']) {
  if (!profile.includes(`id: '${id}'`)) fail(`room profile does not describe ${id}`);
}
for (const needle of [
  'jump-run-jam-to-materialschmiede',
  'xensonar-refactor-receiver',
  'src/features/xenpolar/rooms/xenpolarExportActions.ts',
  'src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx',
]) {
  if (!profile.includes(needle)) fail(`handoff contract marker missing: ${needle}`);
}

if (exists('tools/build-core-test-html.mjs')) {
  fail('old shell HTML builder from the rejected 114.49/114.50 line must not be present');
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
if (!['preferred', 'implemented as first boundary split'].includes(report.variantA.verdict) || report.variantA.viable !== true) {
  fail('Variant A must be the preferred/implemented viable path');
}
if (!['not recommended yet', 'not used'].includes(report.variantB.verdict)) {
  fail('Variant B must remain unused or blocked until Extras imports are untangled');
}
if (!report.handoffEvidence.jumpRunJamSenderPreserved || !report.handoffEvidence.xensonarRefactorReceiverPreserved) {
  fail('Jump-Run-Jam sender and Xensonar Refactor receiver evidence must both be preserved');
}

console.log('core-room-boundary-prep check passed');
console.log(`Variant A: ${report.variantA.verdict}; Variant B: ${report.variantB.verdict}; viewport runtime Extras imports: ${(report.viewportRuntimeExtraImports ?? report.staticExtraImports ?? []).length}`);
