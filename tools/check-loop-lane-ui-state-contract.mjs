#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const contract = exists('src/features/xensonar/material/loopLaneUiState.ts')
  ? read('src/features/xensonar/material/loopLaneUiState.ts')
  : '';
const nexus = read('src/features/xensonar/rooms/nexusParamsInitialState.ts');
const rootStorage = read('src/features/xensonar/rootFollow/rootFollowLoopUiStorage.ts');
const materialRuntimeBoundary = read('src/features/xensonar/material/useMaterialLoopRuntimeBoundary.ts');
const materialPanelProps = read('src/features/xensonar/material/useResonanceMaterialLoopPanelProps.ts');
const rootPanelProps = read('src/features/xensonar/material/buildRootFollowPanelProps.ts');
const app = read('src/App.tsx');

const protectedRoom3 = [
  'src/features/resonance/refactorTopologyLegacyAudio.ts',
  'src/features/resonance/refactorTopologyNodeAura.ts',
  'src/features/resonance/refactorTopologyLegacyAudioFrame.ts',
  'src/features/resonance/refactorTopologyLegacyAudioGraph.ts',
  'src/features/xensonar/room3/room3NodeDeviceAudioPath.ts',
];

const checks = {
  hasSharedLoopLaneContract: contract.includes('export type LoopLaneUiStateBase')
    && contract.includes('export type MaterialLoopLaneUiState')
    && contract.includes('export type RootFollowLoopLaneUiState'),
  hasSharedTimeModeGuardAndVolumeClamp: contract.includes('isLoopLaneTimeMode')
    && contract.includes('clampLoopLaneVolume'),
  nexusInitialStateUsesLoopLaneContract: nexus.includes('createInitialNexusLoopLaneUiState()')
    && !nexus.includes('ROOT_FOLLOW_GRANULAR_PRESETS'),
  rootFollowStorageUsesLoopLaneContract: rootStorage.includes('extractRootFollowLoopLaneUiState')
    && rootStorage.includes('rootFollowLoopLaneToNexusPatch')
    && rootStorage.includes('isLoopLaneTimeMode'),
  panelTypesUseLaneContract: materialPanelProps.includes('MaterialLoopLaneUiState')
    && materialPanelProps.includes('RootFollowLoopLaneUiState')
    && rootPanelProps.includes('RootFollowLoopLaneUiState'),
  runtimeBoundaryUsesLaneContract: materialRuntimeBoundary.includes('MaterialLoopLaneUiState')
    && materialRuntimeBoundary.includes('RootFollowLoopLaneUiState'),
  noSharedAudioRendererConflation: !contract.includes('AudioContext')
    && !contract.includes('GainNode')
    && !contract.includes('AudioNode'),
  protectedRoom3AudioFilesStillPresent: protectedRoom3.every(exists),
  room3UiNodeAuraLayerStillPresent: read('src/features/resonance/refactorTopologyNodeAura.ts').includes('getNodeAuraSignature')
    && read('src/features/resonance/refactorTopologyLegacyAudio.ts').includes('nodeColorOsc'),
  waveStarterMicroOrchestratorStillPresent: read('src/features/xensonar/audio/waveStarterMicroOrchestrator.ts').includes('emit-micro'),
  appLineCountUnder7200: app.split(/\r?\n/).length < 7200,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines: app.split(/\r?\n/).length,
  contractLines: contract.split(/\r?\n/).length,
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
