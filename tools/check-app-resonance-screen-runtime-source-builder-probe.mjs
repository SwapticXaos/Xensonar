#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const builderPath = 'src/features/xensonar/layout/appResonanceScreenRuntimeSourceBuilder.ts';
const assemblyPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeAssembly.ts';
const boundaryPath = 'src/features/xensonar/layout/useAppResonanceScreenRuntimeBoundary.ts';
const panelArgsPath = 'src/features/xensonar/layout/appResonanceScreenPanelRuntimeArgs.ts';
const stageBuilderPath = 'src/features/xensonar/layout/appResonanceScreenStageSourceBuilder.ts';
const soundPaletteBuilderPath = 'src/features/xensonar/layout/appResonanceScreenSoundPaletteSourceBuilder.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appResonanceScreenRuntimeArgsDependencyAudit.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const assembly = exists(assemblyPath) ? read(assemblyPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const panelArgs = exists(panelArgsPath) ? read(panelArgsPath) : '';
const stageBuilder = exists(stageBuilderPath) ? read(stageBuilderPath) : '';
const soundPaletteBuilder = exists(soundPaletteBuilderPath) ? read(soundPaletteBuilderPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const forbiddenRuntimeTokens = [
  'createOscillator(', 'createGain(', '.connect(', '.start(', 'safeApplyAttack(',
  'safeApplyExponentialRelease(', 'requestAnimationFrame(', 'setInterval(', 'setTimeout(',
  'new AudioContext(', 'ensureAudioReady(', 'prewarmAudioRuntime(',
  'resetResonanceTransientState(', 'commitResonanceCursorY(', 'toggleManualGridStepMute(',
  'setManualGridStepOffset(', 'setPlayfieldCursorInside(', 'spawnNexusRipple(',
  'previewWavePresetSelection(', 'startMetaPresetRoulette(', 'randomizeMetaPresetForSession(',
  'applyMetaPreset(', 'startQuantizedCollisionRuntime(', 'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(', 'emitWaveStartSound(', 'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(', 'scheduleExportedDrumConfigStep(', 'MediaRecorder',
  'localStorage.', '.current =', '.current=',
];

const appUsesLegacy154Shape = app.includes('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({') &&
  app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary(resonanceScreenRuntimeSource);');
const appUsesAssemblyShape = app.includes('useAppResonanceScreenRuntimeAssembly({') &&
  !app.includes('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({');

const checks = {
  expectedFilesExist: [
    appPath, builderPath, assemblyPath, boundaryPath, panelArgsPath, stageBuilderPath,
    soundPaletteBuilderPath, auxArgsPath, shapeAuditPath, dependencyAuditPath, pkgPath,
    suitePath, suiteContractPath,
  ].every(exists),
  packageVersionAtLeast153: /^3\.2\.91\.6\.9\.(15[3-9]|1[6-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-screen-runtime-source-builder-probe'] ===
    'node tools/check-app-resonance-screen-runtime-source-builder-probe.mjs',
  runtimeSourceBuilderStillExistsAndDeclaresTopologyOnly: [
    'BuildAppResonanceScreenRuntimeSourceInput',
    'AppResonanceScreenRuntimeSourceArgs',
    'APP_RESONANCE_SCREEN_RUNTIME_SOURCE_BUILDER_PROBE',
    'builderOwnsScreenRuntimeSourceTopologyOrdering: true',
    'export function buildAppResonanceScreenRuntimeSource({',
    'chrome,', 'auxPanels,', 'soundPaletteActions,', 'corePanels,',
    'resonancePanels: corePanels,',
    'satisfies AppResonanceScreenRuntimeSourceArgs',
  ].every((needle) => builder.includes(needle)),
  sourceBuilderUsedEitherDirectlyOrViaAssembly:
    appUsesLegacy154Shape ||
    (appUsesAssemblyShape && assembly.includes('const resonanceScreenRuntimeSource = buildAppResonanceScreenRuntimeSource({')),
  stageAndSoundPaletteSourceBuildersRemainDedicated:
    stageBuilder.includes('export function buildAppResonanceScreenStageSource') &&
    soundPaletteBuilder.includes('export function buildAppResonanceScreenSoundPaletteSource') &&
    (app.includes('buildAppResonanceScreenStageSource({') || assembly.includes('buildAppResonanceScreenStageSource(stage)')) &&
    (app.includes('buildAppResonanceScreenSoundPaletteSource({') || assembly.includes('buildAppResonanceScreenSoundPaletteSource(soundPalette)')),
  finalRuntimeSourceStillUsesTopologicalSectionsOnly:
    builder.includes('chrome') &&
    builder.includes('auxPanels') &&
    builder.includes('soundPaletteActions') &&
    builder.includes('corePanels') &&
    builder.includes('resonancePanels: corePanels') &&
    (app.includes('const resonanceAuxPanelSource = {') || app.includes('auxPanels: resonanceAuxPanelSource')),
  oldInlineBoundaryObjectNoLongerUsed:
    !app.includes('const resonanceScreenRuntime = useAppResonanceScreenRuntimeBoundary({'),
  builderImportsOnlyTypesFromLocalContracts:
    builder.includes("import type { BuildAppResonanceAuxPanelRuntimeArgsInput } from './appResonanceAuxPanelRuntimeArgs';") &&
    builder.includes("from './appResonanceScreenPanelRuntimeArgsTypes'") &&
    !builder.includes("from '../") &&
    !builder.includes('React') &&
    !builder.includes('import {'),
  builderDoesNotExecuteRuntimeOrMutateRefs: forbiddenRuntimeTokens.every((needle) => !builder.includes(needle)),
  boundaryStillOwnsAuxAndPanelFlatteningAndEntryComposition:
    boundary.includes('const appResonanceAuxPanelRuntimeArgs = buildAppResonanceAuxPanelRuntimeArgs(auxPanels);') &&
    boundary.includes('buildAppResonanceScreenPanelRuntimeArgs') &&
    boundary.includes('corePanelSource: resonancePanels,') &&
    boundary.includes('buildAppResonanceScreenRuntimeEntry({'),
  panelArgsStillOwnsPanelRuntimeArgsFlattening:
    panelArgs.includes('export function buildAppResonanceScreenPanelRuntimeArgs({') &&
    panelArgs.includes('const corePanelArgs = buildAppResonanceScreenCorePanelArgs(corePanelSource);') &&
    panelArgs.includes('const soundPaletteCatalogArgs = buildAppResonanceScreenSoundPaletteCatalogArgs();') &&
    panelArgs.includes('const soundPaletteActionArgs = buildAppResonanceScreenSoundPaletteActionArgs(soundPaletteActions);'),
  auxChainStillOwnsAuxFlattening:
    auxArgs.includes('normalizeAppResonanceAuxPanelSources(input)') &&
    auxArgs.includes('export function buildAppResonanceAuxPanelRuntimeArgs('),
  auditsKnowRuntimeSourceBuilderAndNoOwnership:
    shapeAudit.includes('screenRuntimeSourceBuilder') &&
    dependencyAudit.includes('runtimeSourceBuilder') &&
    dependencyAudit.includes('appResonanceScreenRuntimeSourceBuilder.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance screen runtime-source builder probe') &&
    suite.includes('xensonar:check-app-resonance-screen-runtime-source-builder-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-screen-runtime-source-builder-probe'),
  lineCountEnvelope: appLines <= 5535 && builderLines <= 120,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  builderLines,
  acceptedCallsiteShape: appUsesAssemblyShape ? 'assembly-hook' : appUsesLegacy154Shape ? 'direct-runtime-source' : 'unknown',
  movedScope: [
    'buildAppResonanceScreenRuntimeSource remains the thin screen-topology source builder.',
    'In 6.9.155+ it may be called through useAppResonanceScreenRuntimeAssembly rather than directly in App.tsx.',
  ],
  explicitlyNotMoved: [
    'Stage handler/audio-readiness/grid-cursor/root-follow-gate behavior',
    'SoundPalette preview/roulette/wave/overtone action bodies',
    'AuxPanel normalization/flattening',
    'Panel runtime args flattening and static catalog/action adapter rehydration',
    'Screen runtime entry composition',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
