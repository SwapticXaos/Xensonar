#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const builderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const readinessPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceReadinessAudit.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const panelArgsTypesPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgsTypes.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const readiness = exists(readinessPath) ? read(readinessPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const panelArgsTypes = exists(panelArgsTypesPath) ? read(panelArgsTypesPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const appCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
const appRoomScenesStart = app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({');
const assemblyCallBlock = appCallStart >= 0 && appRoomScenesStart > appCallStart ? app.slice(appCallStart, appRoomScenesStart) : '';
const directStageStart = app.indexOf('const resonanceStageSource = buildAppResonanceScreenStageSource({');
const directStageEnd = directStageStart >= 0 ? app.indexOf('\n  const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource({', directStageStart) : -1;
const directStageBlock = directStageStart >= 0 && directStageEnd > directStageStart ? app.slice(directStageStart, directStageEnd) : '';
const stageBlock = assemblyCallBlock.includes('stage: {') ? assemblyCallBlock : directStageBlock;

const groups = {
  activity: ['nexusActive', 'resonanceInputIndicator', 'setNexusActive'],
  canvas: ['nexusCanvasRef', 'gameWidth: GAME_WIDTH', 'gameHeight: GAME_HEIGHT', 'spawnNexusRipple'],
  audioReadiness: ['ensureAudioReady', 'prewarmAudioRuntime', 'resetResonanceTransientState', 'audioCtx'],
  gridCursor: [
    'updateNParams', 'nexusParamsRef', 'updateFocusCursor', 'activeGridDragStepRef',
    'activeGridDragStartYRef', 'activeGridDragBaseOffsetRef', 'activeGridDragMovedRef',
    'getVisibleGridLines', 'yFromFreq', 'setManualGridStepOffset',
    'commitResonanceCursorY', 'toggleManualGridStepMute',
  ],
  installationGate: [
    'installationSharedFieldActive',
    'installationSharedFieldController',
    'nexusRefs',
    'setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate',
  ],
};

const blockForGroup = (group) => {
  const start = stageBlock.indexOf(`${group}: {`);
  if (start < 0) return '';
  const otherStarts = Object.keys(groups)
    .filter((other) => other !== group)
    .map((other) => stageBlock.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = otherStarts.length ? Math.min(...otherStarts) : stageBlock.length;
  return stageBlock.slice(start, end);
};

const forbiddenRuntimeTokens = [
  'createOscillator(', 'createGain(', '.connect(', '.start(', 'requestAnimationFrame(',
  'setInterval(', 'setTimeout(', 'new AudioContext(', 'ensureAudioReady(',
  'prewarmAudioRuntime(', 'resetResonanceTransientState(', 'commitResonanceCursorY(',
  'toggleManualGridStepMute(', 'setManualGridStepOffset(', 'spawnNexusRipple(',
  'setPlayfieldCursorInside(', '.current =', '.current=', 'localStorage.', 'MediaRecorder',
  'startQuantizedCollisionRuntime(', 'runParticleNexusToneOrchestrator(', 'playWaveStartSound(',
  'emitWaveStartSound(', 'scheduleBassClipStep(', 'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
];

const checks = {
  expectedFilesExist: [appPath, assemblyPath, builderPath, readinessPath, panelArgsPath, shapeAuditPath, dependencyAuditPath, pkgPath, suitePath, suiteContractPath].every(exists),
  packageVersionAtLeast151: /^3\.2\.91\.6\.9\.(15[1-9]|1[6-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-stage-source-builder-probe'] ===
    'node tools/check-app-resonance-screen-stage-source-builder-probe.mjs',
  builderIsUsedDirectlyOrViaAssembly:
    (app.includes('appResonanceScreenStageSourceBuilder') && directStageBlock.includes('buildAppResonanceScreenStageSource({')) ||
    (assembly.includes('appResonanceScreenStageSourceBuilder') && assembly.includes('buildAppResonanceScreenStageSource(stage)')),
  appStageGroupsAreExplicitAndComplete: Object.entries(groups).every(([group, keys]) => {
    const block = blockForGroup(group);
    return block.includes(`${group}: {`) && keys.every((key) => block.includes(key));
  }),
  appStageGroupsRemainInExpectedOrder:
    ['activity', 'canvas', 'audioReadiness', 'gridCursor', 'installationGate'].every((group) => stageBlock.includes(`${group}: {`)) &&
    stageBlock.indexOf('activity: {') < stageBlock.indexOf('canvas: {') &&
    stageBlock.indexOf('canvas: {') < stageBlock.indexOf('audioReadiness: {') &&
    stageBlock.indexOf('audioReadiness: {') < stageBlock.indexOf('gridCursor: {') &&
    stageBlock.indexOf('gridCursor: {') < stageBlock.indexOf('installationGate: {'),
  rootFollowGateStaysExplicit:
    blockForGroup('installationGate').includes('setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate'),
  builderDeclaresOnlySourceGroupTypesAndFlattening: [
    'BuildAppResonanceScreenStageSourceInput',
    'AppResonanceScreenStageActivitySourceArgs',
    'AppResonanceScreenStageCanvasSourceArgs',
    'AppResonanceScreenStageAudioReadinessSourceArgs',
    'AppResonanceScreenStageGridCursorSourceArgs',
    'AppResonanceScreenStageInstallationGateSourceArgs',
    'APP_RESONANCE_SCREEN_STAGE_SOURCE_BUILDER_PROBE',
    'export function buildAppResonanceScreenStageSource({',
    '...activity,', '...canvas,', '...audioReadiness,', '...gridCursor,', '...installationGate,',
    'satisfies AppResonanceScreenStageSourceArgs',
  ].every((needle) => builder.includes(needle)),
  builderImportsOnlyTypeContractAndReadinessAudit:
    builder.includes("import type { AppResonanceScreenStageSourceArgs } from './appResonanceScreenPanelRuntimeArgsTypes';") &&
    builder.includes("from './appResonanceScreenStageSourceReadinessAudit'") &&
    !builder.includes("from '../") &&
    !builder.includes('React'),
  builderDoesNotExecuteRuntimeOrMutateRefs: forbiddenRuntimeTokens.every((needle) => !builder.includes(needle)),
  readinessAuditConsumedButStillNonOwning:
    readiness.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT') &&
    readiness.includes('auditOnly: false') &&
    readiness.includes('dedicatedStageSourceBuilderIntroduced: true') &&
    readiness.includes('appStillOwnsStageSourceComposition: true') &&
    readiness.includes("nextAllowedStepAfterAudit: 'buildAppResonanceScreenStageSource'"),
  panelArgsStillExposesFlatStageOutputContract:
    panelArgsTypes.includes('export type AppResonanceScreenStageSourceArgs = Pick<') &&
    panelArgsTypes.includes('readonly stage: AppResonanceScreenStageSourceArgs'),
  shapeAuditKnowsBuilderGroup:
    shapeAudit.includes("'stageSourceBuilder'") &&
    shapeAudit.includes('stage source builder owns only group flattening'),
  dependencyAuditKnowsBuilderAndNoOwnership:
    dependencyAudit.includes('stageSourceBuilder') &&
    dependencyAudit.includes("importKind: 'stage-source-builder-probe'") &&
    dependencyAudit.includes('appResonanceScreenStageSourceBuilder.ts') &&
    dependencyAudit.includes('no stage handler construction') &&
    dependencyAudit.includes('no Root-Follow gate ownership'),
  oldFlatStageObjectNoLongerInScreenCall:
    !app.includes('gameWidth: GAME_WIDTH,\n      gameHeight: GAME_HEIGHT,\n      installationSharedFieldActive,'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen stage-source builder probe') &&
    suite.includes('xensonar:check-app-resonance-screen-stage-source-builder-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-stage-source-builder-probe'),
  lineCountEnvelope: appLines <= 5535 && builderLines <= 120,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  builderLines,
  acceptedCallsiteShape: assemblyCallBlock ? 'assembly-hook' : 'direct-stage-source',
  stageGroups: Object.keys(groups),
  movedScope: [
    'buildAppResonanceScreenStageSource remains a thin source-group flattening probe.',
    'In 6.9.155+ it may be called through useAppResonanceScreenRuntimeAssembly rather than directly in App.tsx.',
    'Event-handler construction and all audio/grid/root-follow behavior remain outside the builder.',
  ],
  explicitlyNotMoved: [
    'buildResonanceStagePanelProps handler construction',
    'ensureAudioReady/prewarm/reset bodies',
    'grid/cursor action bodies',
    'Root-Follow playfield inside gate ownership',
    'ResonanceControl, ParticleSystem, SoundPalette, AuxPanel, Package, Room III, AudioWorklet runtime',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
