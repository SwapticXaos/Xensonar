#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src/App.tsx');
const storagePath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowLoopUiStorage.ts');
const nexusPath = path.join(root, 'src/features/xensonar/rooms/nexusParamsInitialState.ts');
const nexusHookPath = path.join(root, 'src/features/xensonar/rooms/useAppNexusParamsState.ts');

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const app = read(appPath);
const storage = read(storagePath);
const nexus = read(nexusPath);
const nexusHook = read(nexusHookPath);

const checks = {
  hasStorageModule: storage.includes('readRootFollowLoopUiPatchFromStorage') && storage.includes('writeRootFollowLoopUiStateToStorage'),
  appUsesStorageModule: nexusHook.includes('readRootFollowLoopUiPatchFromStorage()') && nexusHook.includes('writeRootFollowLoopUiStateToStorage(nParamsUI)') && app.includes('useAppNexusParamsState()'),
  noInlineRootFollowStorageJsonParse: !app.includes('JSON.parse(raw) as Partial<{') && !app.includes('window.localStorage.getItem(ROOT_FOLLOW_LOOP_UI_STORAGE_KEY)'),
  noInlineRootFollowStorageStringify: !app.includes('window.localStorage.setItem(ROOT_FOLLOW_LOOP_UI_STORAGE_KEY, JSON.stringify({'),
  hasMergePolicyHelper: nexus.includes('export const mergeNexusUiPatch') && nexusHook.includes('mergeNexusUiPatch(nexusParamsRef.current, partial)'),
  noInlineParticleVolumeMergePolicy: !app.includes('const resolvedParticlePreset = resolveParticlePlaybackPresetId(merged.particlePreset)'),
  protectsUiNodeAuraAudio: app.includes('ensureRefactorTopologyLegacyAudio') && fs.existsSync(path.join(root, 'src/features/resonance/refactorTopologyLegacyAudio.ts')),
  appLineCountUnderRefactorThreshold: app.split(/\r?\n/).length < 7200,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
