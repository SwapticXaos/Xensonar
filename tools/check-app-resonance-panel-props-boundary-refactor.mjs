#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const boundaryIndexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const boundaryIndex = exists(boundaryIndexPath) ? read(boundaryIndexPath) : '';
const performanceBoundaryPath = 'src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts';
const performanceBoundary = exists(performanceBoundaryPath) ? read(performanceBoundaryPath) : '';
const burstBoundaryPath = 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts';
const burstBoundary = exists(burstBoundaryPath) ? read(burstBoundaryPath) : '';
const materialTrackBoundaryPath = 'src/features/xensonar/groove/buildAppMaterialTrackPanelBoundary.ts';
const materialTrackBoundary = exists(materialTrackBoundaryPath) ? read(materialTrackBoundaryPath) : '';
const resonanceControlBoundaryPath = 'src/features/xensonar/rooms/buildAppResonanceControlPanelBoundary.ts';
const resonanceControlBoundary = exists(resonanceControlBoundaryPath) ? read(resonanceControlBoundaryPath) : '';
const particleSystemBoundaryPath = 'src/features/xensonar/rooms/buildAppParticleSystemPanelBoundary.ts';
const particleSystemBoundary = exists(particleSystemBoundaryPath) ? read(particleSystemBoundaryPath) : '';
const appLines = app.split(/\r?\n/).length;

const forbiddenRuntimeMoves = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'advanceMyzelSynthRoom3Runtime(',
  'renderMyzelSynthRoom3RuntimeCanvas(',
];

const builderImports = [
  './features/xensonar/rooms/buildMaterialTrackPanelProps',
  './features/xensonar/rooms/buildBurstDiagnosticsPanelProps',
  './features/xensonar/performanceCrisis/performanceCrisisPanelProps',
  './features/xensonar/rooms/buildResonanceControlProps',
  './features/xensonar/rooms/buildParticleSystemProps',
];

const checks = {
  boundaryFileExists: exists(boundaryPath),
  appUsesPanelPropsBoundary: app.includes('} = useAppResonancePanelPropsBoundary({'),
  appImportsPanelPropsBoundary: app.includes('./features/xensonar/layout/useAppResonancePanelPropsBoundary'),
  appNoLongerImportsPanelSubBoundariesViaIndex: !app.includes('./features/xensonar/layout/appResonancePanelBoundaryIndex'),
  appNoLongerImportsPanelSubBoundariesDirectly: [
    './features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary',
    './features/xensonar/groove/buildAppMaterialTrackPanelBoundary',
    './features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary',
    './features/xensonar/rooms/buildAppParticleSystemPanelBoundary',
    './features/xensonar/rooms/buildAppResonanceControlPanelBoundary',
  ].every((needle) => !app.includes(needle)),
  appNoLongerImportsPanelPropBuilders: builderImports.every((needle) => !app.includes(needle)),
  appNoLongerCallsPanelPropBuildersDirectly: [
    'buildMaterialTrackPanelProps({',
    'buildBurstDiagnosticsPanelProps({',
    'buildPerformanceCrisisPanelProps({',
    'buildResonanceControlProps({',
    'buildParticleSystemProps({',
  ].every((needle) => !app.includes(needle)),
  boundaryIndexExists: exists(boundaryIndexPath),
  boundaryIndexReExportsSubBoundaryBuilders: [
    'buildAppBurstDiagnosticsPanelBoundary',
    'buildAppMaterialTrackPanelBoundary',
    'buildAppPerformanceCrisisPanelBoundary',
    'buildAppParticleSystemPanelBoundary',
    'buildAppResonanceControlPanelBoundary',
    'APP_RESONANCE_PANEL_BOUNDARY_KEYS',
    'APP_RESONANCE_PANEL_BOUNDARY_MANIFEST',
  ].every((needle) => boundaryIndex.includes(needle)),
  boundaryIndexDeclaresNonRuntimeNonAudioMutatingManifest:
    (boundaryIndex.match(/runtimeOwned: false/g) || []).length >= 5 &&
    (boundaryIndex.match(/audioMutating: false/g) || []).length >= 5,
  boundaryOwnsPanelPropBuilderCalls: [
    'export function useAppResonancePanelPropsBoundary',
    'buildMaterialTrackPanelProps(normalizeMaterialTrackPanelInput(materialTrack))',
    'buildBurstDiagnosticsPanelProps(',
    'normalizeBurstDiagnosticsPanelInput(burstDiagnostics)',
    'buildPerformanceCrisisPanelProps(',
    'normalizePerformanceCrisisPanelInput(performanceCrisis)',
    'buildResonanceControlProps(',
    'normalizeResonanceControlPanelInput(resonanceControl)',
    'buildParticleSystemProps(',
    'normalizeParticleSystemPanelInput(particleSystem)',
  ].every((needle) => boundary.includes(needle)),
  boundaryKeepsTypedPanelContracts: [
    'MaterialTrackPanelProps',
    'BurstDiagnosticsPanelProps',
    'PerformanceCrisisPanelProps',
    'ResonanceControlRuntimeProps',
    'ParticleSystemRuntimeProps',
    'AppResonancePanelPropsBoundary',
  ].every((needle) => boundary.includes(needle)),
  boundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !boundary.includes(needle)),
  appStillOwnsRiskyNonMaterialPanelInputDataAndCallbacks: [
    'burstDiagnostics: {',
    'audioBurstRuntime',
    'rootFollowRecoveryActions:',
    'resonanceControl: {',
    'gridAndTuning:',
    'trafficRefs:',
    'toneActions:',
    'myzelInstallation:',
    'performanceCrisis: {',
    'rootFollowGranulationSource: { nParamsUI, updateNParams }',
    'particleSystem: {',
    'agentActions: { previewParticlePresetSelection: previewParticlePresetSelectionAction, toggleNexusAgent, setNexusAgentVolume }',
    'setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate,',
  ].every((needle) => app.includes(needle)) &&
    app.includes('materialTrack: {') &&
    app.includes('previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef }') &&
    !app.includes('materialTrack: buildAppMaterialTrackPanelBoundary({'),
  materialTrackSubBoundaryExists: exists(materialTrackBoundaryPath),
  materialTrackSubBoundaryOwnsPreviewAndCatalogMapping: [
    'export function buildAppMaterialTrackPanelBoundary',
    'export function buildAppBassPreviewContext',
    'grooveStateFromMycelium(myceliumSnapshot, currentTimeSec)',
    'drumPatterns: DRUM_PATTERNS',
    'drumKits: DRUM_KITS',
    'bassPatterns: BASS_PATTERNS',
  ].every((needle) => materialTrackBoundary.includes(needle)),
  materialTrackSubBoundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !materialTrackBoundary.includes(needle)),
  resonanceControlSubBoundaryExists: exists(resonanceControlBoundaryPath),
  resonanceControlSubBoundaryOwnsSemanticGroupingOnly: [
    'export function buildAppResonanceControlPanelBoundary',
    'AppResonanceControlStateBoundary',
    'AppResonanceControlGridBoundary',
    'AppResonanceControlTrafficRefsBoundary',
    'AppResonanceControlToneActionsBoundary',
    'AppResonanceControlMyzelInstallationBoundary',
  ].every((needle) => resonanceControlBoundary.includes(needle)),
  resonanceControlSubBoundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !resonanceControlBoundary.includes(needle)),
  particleSystemSubBoundaryExists: exists(particleSystemBoundaryPath),
  particleSystemSubBoundaryOwnsSemanticGroupingOnly: [
    'export function buildAppParticleSystemPanelBoundary',
    'AppParticleSystemSelectionBoundary',
    'AppParticleSystemPresetCatalogSourceBoundary',
    'AppParticleSystemAgentActionBoundary',
    '...selection',
    '...presetCatalogSource',
    '...agentActions',
  ].every((needle) => particleSystemBoundary.includes(needle)),
  particleSystemSubBoundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !particleSystemBoundary.includes(needle)),
  burstDiagnosticsSubBoundaryExists: exists(burstBoundaryPath),
  burstDiagnosticsSubBoundaryOwnsRecorderActions: [
    'export function buildAppBurstDiagnosticsPanelBoundary',
    'onStartAudioBurstRecorder: audioBurstRuntime.start',
    'onExportAudioBurstRecorder: () => audioBurstRuntime.exportLog(exportContext)',
  ].every((needle) => burstBoundary.includes(needle)),
  burstDiagnosticsSubBoundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !burstBoundary.includes(needle)),
  performanceCrisisSubBoundaryExists: exists(performanceBoundaryPath),
  performanceCrisisSubBoundaryOwnsPanelInputMapping: [
    'export function buildAppPerformanceCrisisPanelBoundary',
    'activePresetId: uiPolicyState.performanceCrisisPresetId',
    'setActivePresetId: uiPolicyState.setPerformanceCrisisPresetId',
    'currentGranularSettings: normalizeRootFollowGranularSettings(',
    'applyGranularRootFollowSettings: updateRootFollowGranularSettings',
  ].every((needle) => performanceBoundary.includes(needle)),
  performanceCrisisSubBoundaryDoesNotMoveAudioOrRafRuntime: forbiddenRuntimeMoves.every((needle) => !performanceBoundary.includes(needle)),
  appStillOwnsScreenBoundaryCall: app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({'),
  appLineCountUnder6640: appLines < 6640,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Panel prop builder ownership for Material Track, Burst Diagnostics, Performance Crisis, Resonance Control, and Particle System',
    'A typed App -> resonance panel props boundary before the lower screen/surface shell boundary',
    'A narrower Performance & Krisenmanagement App-panel input boundary under the shared resonance panel seam',
    'A narrower Burst-Diagnose App-panel input boundary for recorder/export callbacks',
    'A narrower Materialspur/GrooveBass App-panel input boundary for static catalogs and bass preview context plus compact App callsite preview-source cleanup',
    'A narrower Resonance-Control App-panel input boundary for state, grid/tuning, quantize-adjacent refs, tone actions, and Myzel installation callbacks',
    'A narrower Particle-System App-panel input boundary for selection, catalog, and agent-action handoff',
  ],
  explicitlyNotMoved: [
    'Panel input data and callbacks remain App-owned; Burst-Diagnostics, Performance-Crisis, Material Track, Resonance-Control, and Particle-System mapping are normalized by the props boundary while risk groups stay visible',
    'Wellenstarter, Bass/Drum scheduling, Room III audio, Root-Follow, Materialspur',
    'Screen, surface, room-scene, and Myzel runtime logic',
  ],
  futureSeamsMadeClearer: [
    'A later screen-panel split can receive one app resonance panel props contract instead of direct builder calls from App.tsx',
    'The existing screen/surface boundary now consumes panel props produced by a named panel-props seam',
    'Performance & Krisenmanagement panel input now has a dedicated typed App boundary without owning audio/runtime behavior',
    'Material Track panel input now has a dedicated typed App boundary without owning Drum/Bass scheduling or Materialspur import/export behavior',
    'Resonance-Control panel input now has a dedicated typed App boundary without owning quantize scheduling, cursor runtime, or grid mutation behavior',
    'Particle-System panel input now has a dedicated typed App boundary without owning particle playback, simulation lane, or quantize behavior',
    'The resonance panel sub-boundaries now have one App import/index seam and a non-runtime/non-audio-mutating manifest',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
