#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const stageAuditPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceReadinessAudit.ts';
const stageBuilderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const stageAudit = exists(stageAuditPath) ? read(stageAuditPath) : '';
const stageBuilder = exists(stageBuilderPath) ? read(stageBuilderPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';
const appLines = app.split(/\r?\n/).length;
const stageAuditLines = stageAudit.split(/\r?\n/).length;
const stageBuilderLines = stageBuilder.split(/\r?\n/).length;
const panelArgsLines = panelArgs.split(/\r?\n/).length;

const screenCallStart = app.indexOf('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');
const screenCallEnd = screenCallStart >= 0 ? app.indexOf('\n  const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);', screenCallStart) : -1;
const screenCall = screenCallStart >= 0 && screenCallEnd > screenCallStart ? app.slice(screenCallStart, screenCallEnd) : '';
const stageStart = app.indexOf('const resonanceStageSource = buildAppResonanceScreenStageSource({');
const soundPaletteSourceStart = app.indexOf('const resonanceSoundPaletteSource = buildAppResonanceScreenSoundPaletteSource({', stageStart);
const stageBlock = stageStart >= 0 && soundPaletteSourceStart > stageStart ? app.slice(stageStart, soundPaletteSourceStart) : '';
const assemblyCallStart = app.indexOf('const resonanceScreenRuntime = useAppResonanceScreenRuntimeAssembly({');
const roomScenesStart = app.indexOf('\n  const appRoomScenes = useAppRoomSceneRuntimeBoundary({');
const assemblyCallBlock = assemblyCallStart >= 0 && roomScenesStart > assemblyCallStart ? app.slice(assemblyCallStart, roomScenesStart) : '';
const stageInputBlock = assemblyCallBlock.includes('stage: {') ? assemblyCallBlock : stageBlock;

const groupSources = {
  stageActivity: [
    'nexusActive',
    'resonanceInputIndicator',
    'setNexusActive',
  ],
  stageCanvas: [
    'nexusCanvasRef',
    'gameWidth',
    'gameHeight',
    'spawnNexusRipple',
  ],
  stageAudioReadiness: [
    'ensureAudioReady',
    'prewarmAudioRuntime',
    'resetResonanceTransientState',
    'audioCtx',
  ],
  stageGridCursor: [
    'updateNParams',
    'nexusParamsRef',
    'updateFocusCursor',
    'activeGridDragStepRef',
    'activeGridDragStartYRef',
    'activeGridDragBaseOffsetRef',
    'activeGridDragMovedRef',
    'getVisibleGridLines',
    'yFromFreq',
    'setManualGridStepOffset',
    'commitResonanceCursorY',
    'toggleManualGridStepMute',
  ],
  stageInstallationGate: [
    'installationSharedFieldActive',
    'installationSharedFieldController',
    'nexusRefs',
    'setPlayfieldCursorInside',
  ],
};

const builderGroups = {
  activity: groupSources.stageActivity,
  canvas: groupSources.stageCanvas,
  audioReadiness: groupSources.stageAudioReadiness,
  gridCursor: groupSources.stageGridCursor,
  installationGate: groupSources.stageInstallationGate,
};

const allStageKeys = Object.values(groupSources).flat();
const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'ensureAudioReady(',
  'prewarmAudioRuntime(',
  'resetResonanceTransientState(',
  'commitResonanceCursorY(',
  'toggleManualGridStepMute(',
  'setManualGridStepOffset(',
  'spawnNexusRipple(',
  'setPlayfieldCursorInside(',
  '.current =',
  '.current=',
  'localStorage.',
];

const blockForAuditGroup = (group) => {
  const start = stageAudit.indexOf(`${group}: {`);
  if (start < 0) return '';
  const starts = Object.keys(groupSources)
    .filter((other) => other !== group)
    .map((other) => stageAudit.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = starts.length ? Math.min(...starts) : stageAudit.indexOf('} as const satisfies', start);
  return stageAudit.slice(start, end);
};

const blockForBuilderGroup = (group) => {
  const start = stageInputBlock.indexOf(`${group}: {`);
  if (start < 0) return '';
  const starts = Object.keys(builderGroups)
    .filter((other) => other !== group)
    .map((other) => stageInputBlock.indexOf(`${other}: {`, start + 1))
    .filter((idx) => idx > start);
  const end = starts.length ? Math.min(...starts) : stageInputBlock.length;
  return stageInputBlock.slice(start, end);
};

const groupCoverage = Object.fromEntries(Object.entries(groupSources).map(([group, keys]) => {
  const block = blockForAuditGroup(group);
  return [group, {
    blockExists: block.length > 0,
    keysPresent: keys.every((key) => block.includes(`'${key}'`)),
    nonOwnershipFlagsPresent: [
      'sourceOwnerStillApp: true',
      'readinessOnly: true',
      'mayExtractBeforeDedicatedBuilder: false',
      'ownsRuntime: false',
      'mutatesAudio: false',
      'ownsRoomLifecycle: false',
      'ownsPackagePersistence: false',
    ].every((needle) => block.includes(needle)),
  }];
}));

const keyOccurrenceCounts = Object.fromEntries(allStageKeys.map((key) => {
  const matches = stageAudit.match(new RegExp(`'${key}'`, 'g')) || [];
  return [key, matches.length];
}));

const checks = {
  expectedFilesExist: [
    appPath,
    assemblyPath,
    stageAuditPath,
    stageBuilderPath,
    panelArgsPath,
    shapeAuditPath,
    dependencyAuditPath,
    boundaryPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast150: /^3\.2\.91\.6\.9\.(15[0-9]|1[6-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-stage-source-readiness-audit'] ===
    'node tools/check-app-resonance-screen-stage-source-readiness-audit.mjs',
  appUsesDedicatedStageSourceBuilderWithAuditedGroups:
    ((screenCall.includes('corePanels: {') && screenCall.includes('stage: resonanceStageSource')) ||
      assemblyCallBlock.includes('useAppResonanceScreenRuntimeAssembly({')) &&
    (stageBlock.includes('const resonanceStageSource = buildAppResonanceScreenStageSource({') ||
      assembly.includes('buildAppResonanceScreenStageSource(stage)')) &&
    Object.entries(builderGroups).every(([group, keys]) => {
      const block = blockForBuilderGroup(group);
      return block.includes(`${group}: {`) && keys.every((key) => block.includes(key));
    }) &&
    stageInputBlock.includes('setPlayfieldCursorInside: setRootFollowPlayfieldInsideGate'),
  stageAuditDeclaresManifestAndGroups: [
    'APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_GROUP_KEYS',
    'APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT',
    'APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_MANIFEST',
    'APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_PROBE',
    "cleanupKind: 'app-resonance-screen-stage-source-readiness-audit'",
    'appStillOwnsStageSourceComposition: true',
    'auditOnly: false',
    'dedicatedStageSourceBuilderIntroduced: true',
    "nextAllowedStepAfterAudit: 'buildAppResonanceScreenStageSource'",
  ].every((needle) => stageAudit.includes(needle)),
  stageGroupsCoverExpectedKeys:
    Object.values(groupCoverage).every((entry) => entry.blockExists && entry.keysPresent && entry.nonOwnershipFlagsPresent),
  stageKeysAreCoveredExactlyOnce:
    Object.values(keyOccurrenceCounts).every((count) => count === 1),
  builderIsDedicatedThinFlatteningProbe:
    stageBuilder.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_BUILDER_PROBE') &&
    stageBuilder.includes('export function buildAppResonanceScreenStageSource({') &&
    ['...activity,', '...canvas,', '...audioReadiness,', '...gridCursor,', '...installationGate,'].every((needle) => stageBuilder.includes(needle)) &&
    forbiddenRuntimeTokens.every((needle) => !stageBuilder.includes(needle)),
  panelArgsStillDefinesFlatStageSourceKeyContract:
    panelArgs.includes('export type AppResonanceScreenStageSourceKey =') &&
    allStageKeys.every((key) => panelArgs.includes(`| '${key}'`) || panelArgs.includes(`'${key}'`)) &&
    panelArgs.includes('export type AppResonanceScreenStageSourceArgs = Pick<'),
  shapeAuditKnowsStageSubgroupsAndBuilder:
    shapeAudit.includes("from './appResonanceScreenStageSourceReadinessAudit'") &&
    Object.keys(groupSources).every((group) => shapeAudit.includes(`'${group}'`)) &&
    shapeAudit.includes("'stageSourceBuilder'"),
  dependencyAuditKnowsStageReadinessAuditAndBuilder:
    dependencyAudit.includes('stageSourceReadinessAudit') &&
    dependencyAudit.includes('stageSourceBuilder') &&
    dependencyAudit.includes("importKind: 'stage-source-readiness-contract'") &&
    dependencyAudit.includes("importKind: 'stage-source-builder-probe'") &&
    dependencyAudit.includes('appResonanceScreenStageSourceBuilder.ts'),
  boundaryExportsStageReadinessAuditButDoesNotUseItAsBuilder:
    boundary.includes("from './appResonanceScreenStageSourceReadinessAudit'") &&
    boundary.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT') &&
    boundary.includes('APP_RESONANCE_SCREEN_STAGE_SOURCE_READINESS_AUDIT_MANIFEST') &&
    !boundary.includes('buildAppResonanceScreenStageSource'),
  noRuntimeOrSchedulingMovedIntoStageAuditOrBuilder:
    forbiddenRuntimeTokens.every((needle) => !stageAudit.includes(needle) && !stageBuilder.includes(needle)) &&
    !stageAudit.includes("from '../") &&
    !stageBuilder.includes("from '../") &&
    !stageAudit.includes('React') &&
    !stageBuilder.includes('React'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen stage-source readiness audit') &&
    suite.includes('xensonar:check-app-resonance-screen-stage-source-readiness-audit'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-stage-source-readiness-audit'),
  lineCountEnvelope:
    appLines <= 5485 &&
    stageAuditLines <= 190 &&
    stageBuilderLines <= 120 &&
    panelArgsLines <= 320,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  stageAuditLines,
  stageBuilderLines,
  panelArgsLines,
  readinessGroups: groupSources,
  keyOccurrenceCounts,
  movedScope: [
    'Retained the static stage source readiness audit and marked it as consumed by a dedicated builder probe.',
    'Confirmed the App.tsx stage input groups match the audited readiness groups.',
    'Confirmed the builder is a thin source-group flattener, not a Stage runtime owner.',
  ],
  explicitlyNotMoved: [
    'Stage event-handler construction',
    'Audio readiness execution',
    'Grid/cursor action bodies',
    'Root-Follow playfield gate ownership',
    'ResonanceControl, ParticleSystem, SoundPalette, AuxPanels, Package, Room III, AudioWorklet runtime',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
