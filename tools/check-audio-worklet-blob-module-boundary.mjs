#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const must = (file, needle, label) => {
  if (!read(file).includes(needle)) failures.push(`${file}: missing ${label}`);
};
const mustNot = (file, needle, label) => {
  if (read(file).includes(needle)) failures.push(`${file}: forbidden ${label}`);
};

const helper = 'src/features/xensonar/audio/audioWorkletBlobModule.ts';
const waveBridge = 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts';
const rootBridge = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts';
const forceCell = 'src/features/xensonar/audio/forceCellIgniter.ts';
const stableSource = 'src/features/xensonar/audio/stableMusicLaneWorkletProcessorSource.ts';
const stationarySource = 'src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts';
const waveSource = 'src/features/xensonar/audio/waveStarterWorkletPilotProcessorSource.ts';
const rootSource = 'src/features/xensonar/rootFollow/rootFollowWorkletShadowProcessorSource.ts';

for (const file of [helper, waveBridge, rootBridge, forceCell, stableSource, stationarySource, waveSource, rootSource]) {
  if (!fs.existsSync(file)) failures.push(`missing file ${file}`);
}

must(helper, 'resolveAudioWorkletBlobSupport', 'shared support resolver');
must(helper, 'createAudioWorkletBlobModuleUrl', 'shared blob URL creator');
must(helper, 'addAudioWorkletBlobModule', 'shared addModule helper');
must(helper, "URL.revokeObjectURL(url)", 'shared revoke discipline');

must(waveBridge, 'resolveAudioWorkletBlobSupport(ctx)', 'Wellenstarter bridge uses shared support resolver');
must(waveBridge, 'addAudioWorkletBlobModule(ctx, WAVE_STARTER_WORKLET_PILOT_CODE)', 'Wellenstarter bridge uses shared module loader');
must(waveBridge, 'new AudioWorkletNode(ctx, PROCESSOR_NAME', 'Wellenstarter bridge still instantiates its node locally');
mustNot(waveBridge, 'new Blob([WAVE_STARTER_WORKLET_PILOT_CODE]', 'Wellenstarter bridge-local worklet Blob creation');
mustNot(waveBridge, 'URL.createObjectURL(blob)', 'Wellenstarter bridge-local blob URL creation');

must(rootBridge, 'resolveAudioWorkletBlobSupport(ctx)', 'Root-Follow bridge uses shared support resolver');
must(rootBridge, 'addAudioWorkletBlobModule(', 'Root-Follow bridge uses shared module loader');
must(rootBridge, 'ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_CODE', 'Root-Follow bridge supplies processor source to shared module loader');
must(rootBridge, 'new AudioWorkletNode(ctx, PROCESSOR_NAME', 'Root-Follow bridge still instantiates its node locally');
mustNot(rootBridge, 'new Blob([ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_CODE]', 'Root-Follow bridge-local worklet Blob creation');
mustNot(rootBridge, 'URL.createObjectURL(blob)', 'Root-Follow bridge-local blob URL creation');

must(forceCell, 'addAudioWorkletBlobModule(ctx, FORCE_CELL_WORKLET_SOURCE)', 'ForceCell uses shared module loader');
mustNot(forceCell, 'new Blob([FORCE_CELL_WORKLET_SOURCE]', 'ForceCell local worklet Blob creation');

must(stableSource, 'createAudioWorkletBlobModuleUrl(STABLE_MUSIC_LANE_WORKLET_PROCESSOR_SOURCE)', 'Stable music lane source uses shared URL helper');
must(stationarySource, 'createAudioWorkletBlobModuleUrl(STATIONARY_RHYTHM_WORKLET_PROCESSOR_SOURCE)', 'Stationary rhythm source uses shared URL helper');
must(waveSource, 'registerProcessor', 'Wellenstarter processor source remains separate from bridge');
must(rootSource, 'registerProcessor', 'Root-Follow processor source remains separate from bridge');

if (failures.length) {
  console.error('[audio-worklet-blob-module-boundary] FAIL');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[audio-worklet-blob-module-boundary] OK · Blob-backed AudioWorklet module loading is centralized while bridges retain node/session ownership.');
