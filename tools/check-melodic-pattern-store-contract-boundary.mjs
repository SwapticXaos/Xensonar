#!/usr/bin/env node
import fs from 'node:fs';

const fail = (message) => {
  console.error(`[melodic-pattern-store-contract-boundary] ${message}`);
  process.exit(1);
};
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : fail(`missing ${path}`);

const contractPath = 'src/features/l3lab/canonicalForge/melodicPatternStoreContract.ts';
const roomPath = 'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx';
const composerControllerPath = 'src/features/l3lab/canonicalForge/canonicalMelodicComposerStateController.ts';
const projectControllerPath = 'src/features/l3lab/canonicalForge/melodicProjectWorkspaceController.ts';
const variantControllerPath = 'src/features/l3lab/canonicalForge/melodicPatternVariantController.ts';
const historyMembranePath = 'src/features/l3lab/canonicalForge/canonicalHistoryMembrane.ts';
const lifecyclePath = 'src/features/l3lab/canonicalForge/useCanonicalForgeLifecycleEffects.ts';
const handoffEffectsPath = 'src/features/l3lab/canonicalForge/useCanonicalForgeHandoffEffects.ts';

const contract = read(contractPath);
const room = read(roomPath);
const composerController = read(composerControllerPath);
const projectController = read(projectControllerPath);
const variantController = read(variantControllerPath);
const historyMembrane = read(historyMembranePath);
const lifecycle = read(lifecyclePath);
const handoffEffects = read(handoffEffectsPath);

for (const required of [
  'export type MelodicPatternStores',
  'export type LoopComposerWorkspaceSnapshot',
  'export function readMelodicPatternStores',
  'export function commitMelodicPatternStores',
  'export function createGeneratedMelodicPatternStoresFromComposer',
  'export function cloneLoopComposerWorkspaceSnapshot',
  'export function createLoopComposerWorkspaceSnapshot',
]) {
  if (!contract.includes(required)) fail(`contract is missing ${required}.`);
}

for (const [label, source] of [
  ['CanonicalForgeRoom', room],
  ['canonicalMelodicComposerStateController', composerController],
  ['melodicProjectWorkspaceController', projectController],
  ['melodicPatternVariantController', variantController],
  ['canonicalHistoryMembrane', historyMembrane],
  ['useCanonicalForgeHandoffEffects', handoffEffects],
]) {
  if (!source.includes('commitMelodicPatternStores')) {
    fail(`${label} must use commitMelodicPatternStores for variants/links ref+state writes.`);
  }
}

for (const [label, source] of [
  ['canonicalMelodicComposerStateController', composerController],
  ['melodicProjectWorkspaceController', projectController],
]) {
  if (/LoopComposerWorkspaceSnapshotLike|MelodicPatternStoresLike/.test(source)) {
    fail(`${label} still defines local snapshot/store-like duplicate types.`);
  }
}

if (!variantController.includes('type MelodicPatternStores') || !variantController.includes('createSelfPatternLink') || !variantController.includes('createLinkedPatternLink')) {
  fail('melodicPatternVariantController must consume store/link contracts from melodicPatternStoreContract.');
}

for (const [label, source] of [
  ['CanonicalForgeRoom', room],
  ['useCanonicalForgeLifecycleEffects', lifecycle],
  ['useCanonicalForgeHandoffEffects', handoffEffects],
]) {
  if (source.includes('createGeneratedPatternVariantsFromComposer')) {
    fail(`${label} still builds pattern variants without the shared store contract.`);
  }
  if (/Object\.fromEntries\([^\n]+patternA: 'patternA'/.test(source)) {
    fail(`${label} still builds pattern links inline.`);
  }
}

if (!historyMembrane.includes("export type {\n  LoopComposerWorkspaceSnapshot,") || !historyMembrane.includes("from './melodicPatternStoreContract'")) {
  fail('canonicalHistoryMembrane must re-export LoopComposerWorkspaceSnapshot from melodicPatternStoreContract.');
}

for (const forbidden of [
  'audioEngine',
  'createCanonicalSourcePreviewController',
  'AudioContext',
  'requestAnimationFrame',
  'window.addEventListener',
  'localStorage',
  'sessionStorage',
]) {
  if (contract.includes(forbidden)) {
    fail(`melodicPatternStoreContract must remain composer/store-only; found ${forbidden}.`);
  }
}

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 1735) {
  fail(`CanonicalForgeRoom exceeds pattern store boundary threshold (${roomLines} > 1735).`);
}

console.log(JSON.stringify({ ok: true, roomLines, contractLines: contract.split(/\r?\n/).length }, null, 2));
