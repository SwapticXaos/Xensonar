#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const nexusHook = read('src/features/xensonar/rooms/useAppNexusParamsState.ts');
const waveHook = read('src/features/xensonar/audio/useWaveStarterSoundRuntime.ts');

const protectedFiles = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
  'src/features/xensonar/audio/waveStarterMicroOrchestrator.ts',
];

const checks = {
  appUsesNexusHook: app.includes('useAppNexusParamsState()'),
  nexusHookOwnsInitialParams: nexusHook.includes('createInitialNexusParams(initialOvertonesByPreset.current)') && nexusHook.includes('mergeNexusUiPatch'),
  nexusHookOwnsRootFollowStorage: nexusHook.includes('readRootFollowLoopUiPatchFromStorage()') && nexusHook.includes('writeRootFollowLoopUiStateToStorage(nParamsUI)'),
  nexusHookOwnsParticleProfileStorage: nexusHook.includes('PARTICLE_SAMPLE_PROFILE_STORAGE_KEY') && nexusHook.includes('particleSampleProfileMode'),
  appNoLongerOwnsNexusStorageEffects: !app.includes('readRootFollowLoopUiPatchFromStorage()') && !app.includes('writeRootFollowLoopUiStateToStorage(nParamsUI)') && !app.includes('window.localStorage.setItem(PARTICLE_SAMPLE_PROFILE_STORAGE_KEY'),
  appUsesWaveSoundHook: app.includes('useWaveStarterSoundRuntime('),
  waveHookOwnsSoundRuntimeRef: waveHook.includes('waveSoundRuntimeRef') && waveHook.includes('listSavedMelodicSamples()'),
  appNoLongerOwnsWaveSampleRefreshEffect: !app.includes('MELODIC_SAMPLE_LIBRARY_UPDATED_EVENT') && !app.includes('refreshWaveStarterSampleEntries'),
  protectedRoom3AudioFilesPresent: protectedFiles.every((rel) => fs.existsSync(path.join(root, rel))),
  room3UiNodeAuraMarkerPresent: read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeColorOsc') && read('src/features/resonance/refactorTopologyNodeAura.ts').includes('getNodeAuraSignature'),
  waveStarterMicroOrchestratorStillPresent: read('src/features/xensonar/audio/waveStarterMicroOrchestrator.ts').includes('emit-micro') && read('src/features/xensonar/audio/waveStarterLaneRuntime.ts').includes('wave-starter-lane-micro-released'),
  appLineCountUnder7200: app.split(/\r?\n/).length < 7200,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  nexusHookLines: nexusHook.split(/\r?\n/).length,
  waveHookLines: waveHook.split(/\r?\n/).length,
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
