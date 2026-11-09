#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const requireFile = (file) => { if (!fs.existsSync(file)) failures.push(`missing ${file}`); };
const requireText = (label, content, needle) => { if (!content.includes(needle)) failures.push(`${label} missing ${needle}`); };
const forbidText = (label, content, needle) => { if (content.includes(needle)) failures.push(`${label} still contains ${needle}`); };

const storePath = 'src/features/l3lab/spectralForge/state/store.ts';
const actionsPath = 'src/features/l3lab/spectralForge/state/storeForge3MainSnapshotActions.ts';
const storeTypesPath = 'src/features/l3lab/spectralForge/state/storeTypes.ts';
const appPath = 'src/App.tsx';
const audioEnginePath = 'src/features/l3lab/spectralForge/audio/AudioEngine.ts';

for (const file of [storePath, actionsPath, storeTypesPath, appPath, audioEnginePath, 'package.json']) requireFile(file);

const store = read(storePath);
const actions = read(actionsPath);
const storeTypes = read(storeTypesPath);
const pkg = read('package.json');

for (const marker of [
  "from './storeForge3MainSnapshotActions'",
  '...createForge3MainSnapshotStoreActions(set, get)',
]) requireText('store.ts', store, marker);

for (const marker of [
  'export interface Forge3MainSnapshot',
  'undoStack: Forge3MainSnapshot[];',
  'redoStack: Forge3MainSnapshot[];',
  'pushUndo: () => void;',
  'undo: () => void;',
  'redo: () => void;',
]) requireText('storeTypes.ts', storeTypes, marker);

for (const marker of [
  'export type Forge3MainSnapshotStoreActions',
  'function captureForge3MainSnapshot(state: AppState): Forge3MainSnapshot',
  'function restoreForge3MainSnapshot(snapshot: Forge3MainSnapshot, state: AppState): Partial<AppState>',
  'export function createForge3MainSnapshotStoreActions',
  'const MAX_UNDO = 30;',
  'spectralSnapshot: state.spectralData.cloneData()',
  'bodySnapshot: getForge3BodyField().captureSnapshot()',
  'state.spectralData.restoreData(snapshot.spectralSnapshot)',
  'getForge3BodyField().restoreSnapshot(snapshot.bodySnapshot)',
  'sourceAsset: snapshot.sourceAsset',
  'sourceAssetContext: snapshot.sourceAssetContext',
  'sourcePreviewMode: snapshot.sourcePreviewMode',
  'lastCommitDomain: snapshot.lastCommitDomain',
  'activeMediatedBody: snapshot.activeMediatedBody',
  'renderVersion: state.renderVersion + 1',
  'audioBufferDirty: true',
  'redoStack: [...state.redoStack, redoSnapshot]',
  'undoStack: [...state.undoStack, undoSnapshot]',
]) requireText('storeForge3MainSnapshotActions.ts', actions, marker);

for (const marker of [
  'const MAX_UNDO = 30;',
  'const snapshot: Forge3MainSnapshot = {',
  'const redoSnapshot: Forge3MainSnapshot = {',
  'const undoSnapshot: Forge3MainSnapshot = {',
  'bodySnapshot: getForge3BodyField().captureSnapshot()',
  'getForge3BodyField().restoreSnapshot(snapshot.bodySnapshot)',
  'spectralData.restoreData(snapshot.spectralSnapshot)',
  'undo: () => {\n    const { spectralData, undoStack, redoStack',
  'redo: () => {\n    const { spectralData, undoStack, redoStack',
]) forbidText('store.ts', store, marker);

for (const marker of [
  'AudioEngine',
  'Worklet',
  'rootFollowWorklet',
  'stableLane',
  'create(',
]) forbidText('storeForge3MainSnapshotActions.ts', actions, marker);

requireText('package.json', pkg, 'xensonar:check-spectralforge-store-forge3-main-snapshot-actions-boundary');

if (failures.length) {
  console.error('[spectralforge-store-forge3-main-snapshot-actions-boundary] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  storePath,
  actionsPath,
  message: 'Forge3 main undo/redo snapshots are grouped outside store.ts while preserving the public store API.',
}, null, 2));
