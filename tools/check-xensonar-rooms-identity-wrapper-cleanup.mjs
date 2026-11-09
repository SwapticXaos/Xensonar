#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const boundary = read('src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts');
const topologyRuntime = read('src/features/xensonar/rooms/topologyRoomRuntimeCoordinator.ts');
const deletedFiles = [
  'src/features/xensonar/rooms/buildMaterialTrackPanelProps.ts',
  'src/features/xensonar/rooms/buildBurstDiagnosticsPanelProps.ts',
  'src/features/xensonar/rooms/buildParticleSystemProps.ts',
  'src/features/xensonar/rooms/topologyResidentConfigRuntimeArgs.ts',
];
const sourceFiles = fs.readdirSync(path.join(root, 'src/features/xensonar/rooms')).join('\n')
  + '\n' + fs.readdirSync(path.join(root, 'src/features/xensonar/layout')).join('\n');

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'window.addEventListener',
  'audioEngine',
  'scheduleBassClipStep',
  'scheduleExportedDrumConfigStep',
];

const checks = {
  identityWrapperFilesDeleted: deletedFiles.every((rel) => !exists(rel)),
  boundaryPassesDirectPanelPropsDirectly: [
    'materialTrackPanelProps: materialTrack',
    'burstDiagnosticsPanelProps: burstDiagnostics',
    'particleSystemRuntimeProps: particleSystem',
  ].every((needle) => boundary.includes(needle)),
  boundaryKeepsSemanticTransformBuilders: [
    'buildPerformanceCrisisPanelProps(performanceCrisis)',
    'buildResonanceControlProps(resonanceControl)',
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotReferenceDeletedBuilders: [
    'buildMaterialTrackPanelProps',
    'buildBurstDiagnosticsPanelProps',
    'buildParticleSystemProps',
  ].every((needle) => !boundary.includes(needle)),
  topologyRuntimeUsesResidentConfigBindingsDirectly: topologyRuntime.includes('typeof buildTopologyResidentConfigBindings')
    && topologyRuntime.includes('return buildTopologyResidentConfigRuntimeActions(args);')
    && !topologyRuntime.includes('buildTopologyResidentConfigRuntimeArgs'),
  noDeletedRoomBuilderFilenamesRemainVisible: [
    'buildMaterialTrackPanelProps.ts',
    'buildBurstDiagnosticsPanelProps.ts',
    'buildParticleSystemProps.ts',
    'topologyResidentConfigRuntimeArgs.ts',
  ].every((needle) => !sourceFiles.includes(needle)),
  noRuntimeLogicMovedIntoBoundary: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({
  ok: failures.length === 0,
  cleanup: 'removed empty pass-through Xensonar rooms/layout prop/runtime identity wrappers',
  explicitlyKept: [
    'performance crisis props builder because it derives presets and resolved config',
    'resonance control props builder because it intentionally filters non-spread runtime args',
    'audio, scheduling, preview, and material runtime code untouched',
  ],
  checks,
  failures,
}, null, 2));
if (failures.length) process.exit(1);
