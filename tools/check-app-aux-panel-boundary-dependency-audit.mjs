#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const auditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const auxTypesPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgsTypes.ts';
const sourceNormalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const parallelEffectsPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const recordingTakePath = 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundary.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const pkg = JSON.parse(read(pkgPath));
const audit = exists(auditPath) ? read(auditPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const auxTypes = exists(auxTypesPath) ? read(auxTypesPath) : '';
const parallelEffects = exists(parallelEffectsPath) ? read(parallelEffectsPath) : '';
const recordingTake = exists(recordingTakePath) ? read(recordingTakePath) : '';
const app = read(appPath);
const suite = read(suitePath);
const suiteContract = read(suiteContractPath);
const appLines = app.split(/\r?\n/).length;

const expectedDependencyAuditKeys = ['auxRuntimeArgs', 'sourceNormalizer', 'parallelEffects', 'recordingTake', 'shapeAudit'];

const dependencyAuditFiles = {
  auxRuntimeArgs: auxArgsPath,
  sourceNormalizer: sourceNormalizerPath,
  parallelEffects: parallelEffectsPath,
  recordingTake: recordingTakePath,
  shapeAudit: 'validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts',
};

const allowedValueImports = {
  auxRuntimeArgs: ['./appResonanceAuxPanelSourceNormalizer'],
  sourceNormalizer: ['./buildAppParallelEffectsAuxPanelBoundary', './buildAppRecordingTakeAuxPanelBoundary'],
  parallelEffects: [],
  recordingTake: [],
  shapeAudit: [],
};

const allowedTypeImports = {
  auxRuntimeArgs: ['./appResonanceAuxPanelRuntimeArgsTypes'],
  sourceNormalizer: ['./appResonanceAuxPanelRuntimeArgsTypes'],
  parallelEffects: ['./buildAppParallelEffectsAuxPanelBoundaryTypes'],
  recordingTake: ['./buildAppRecordingTakeAuxPanelBoundaryTypes'],
  shapeAudit: ['./appResonanceAuxPanelRuntimeArgsTypes'],
};

const forbiddenImportFragments = [
  'App.tsx',
  'AudioEngine',
  'audioEngine',
  'audioWorklet',
  'worklet',
  'scheduler',
  'voicePool',
  'rootFollowRuntime',
  'rootFollowLoopRuntime',
  'packageStation',
  'workspacePackageStore',
  'packagePersistence',
  'Room3Runtime',
  'myzelSynthRuntime',
  'particlePlayback',
  'waveStarterRuntime',
  'recordingRuntime',
  'liveMasterBus',
];

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'updateLiveMasteringSystem(',
  'updatePsychedelicSpiralDevice(',
  'createPsychedelicSpiralDevice(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'localStorage.',
];

const importRegex = /import\s+[\s\S]*?\sfrom\s+['"]([^'"]+)['"];?/g;
const extractImports = (content) => {
  const imports = [];
  for (const match of content.matchAll(importRegex)) {
    const statement = match[0].replace(/\s+/g, ' ').trim();
    const source = match[1];
    const isTypeOnly = /^import\s+type\b/.test(statement);
    imports.push({ statement, source, isTypeOnly });
  }
  return imports;
};

const dependencyFindings = Object.fromEntries(
  Object.entries(dependencyAuditFiles).map(([key, rel]) => {
    const content = exists(rel) ? read(rel) : '';
    const imports = extractImports(content);
    const valueImports = imports.filter((entry) => !entry.isTypeOnly).map((entry) => entry.source);
    const typeImports = imports.filter((entry) => entry.isTypeOnly).map((entry) => entry.source);
    const unexpectedValueImports = valueImports.filter((source) => !allowedValueImports[key].includes(source));
    const unexpectedTypeImports = typeImports.filter((source) => !allowedTypeImports[key].includes(source));
    const importText = imports.map((entry) => entry.source).join('\n');
    const forbiddenImportHits = forbiddenImportFragments.filter((fragment) => importText.includes(fragment));
    const forbiddenRuntimeHits = forbiddenRuntimeTokens.filter((token) => content.includes(token));
    return [key, {
      file: rel,
      exists: exists(rel),
      valueImports,
      typeImports,
      unexpectedValueImports,
      unexpectedTypeImports,
      forbiddenImportHits,
      forbiddenRuntimeHits,
    }];
  }),
);

const allDependencyFilesClean = Object.values(dependencyFindings).every((finding) =>
  finding.exists &&
  finding.unexpectedValueImports.length === 0 &&
  finding.unexpectedTypeImports.length === 0 &&
  finding.forbiddenImportHits.length === 0 &&
  finding.forbiddenRuntimeHits.length === 0
);

const checks = {
  expectedFilesExist: [auditPath, auxArgsPath, auxTypesPath, sourceNormalizerPath, parallelEffectsPath, recordingTakePath, 'validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts', appPath, pkgPath].every(exists),
  packageVersionAtLeast110: /^3\.2\.91\.6\.9\.(11[0-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-aux-panel-boundary-dependency-audit'] ===
    'node tools/check-app-aux-panel-boundary-dependency-audit.mjs',
  auditDeclaresExplicitDependencyMap:
    audit.includes('APP_AUX_PANEL_BOUNDARY_DEPENDENCY_AUDIT') &&
    audit.includes('APP_AUX_PANEL_BOUNDARY_DEPENDENCY_FORBIDDEN_IMPORT_FRAGMENTS') &&
    expectedDependencyAuditKeys.every((key) => audit.includes(`${key}: {`) || audit.includes(`'${key}'`)),
  auditDeclaresNonOwnershipFlags: [
    'mayImportReact: false',
    'mayImportApp: false',
    'mayImportAudioRuntime: false',
    'mayImportPackagePersistence: false',
    'runtimeOwned: false',
    'audioMutating: false',
  ].every((needle) => audit.includes(needle)),
  actualAuxBoundaryImportsMatchAuditAllowlist: allDependencyFilesClean,
  auxRuntimeArgsStillOnlyFlattensAuxPanels:
    auxTypes.includes('type AppResonancePanelSuiteArgs = Parameters<typeof buildResonancePanelSuiteProps>[0];') &&
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_KEYS') &&
    auxTypes.includes('AppAuxPanelBoundaryInputContractMap') &&
    auxTypes.includes('AppAuxPanelBoundarySourceContractMap') &&
    auxTypes.includes('AppAuxPanelBoundaryOutputContractMap') &&
    ['parallelEffects', 'grooveBass', 'recordingTake', 'burstDiagnostics'].every((needle) => auxTypes.includes(needle)) &&
    ['...normalizedInput.parallelEffects', '...grooveBass', '...normalizedInput.recordingTake', '...normalizedInput.burstDiagnostics'].every((needle) => auxArgs.includes(needle)),
  parallelEffectsBoundaryStillPureMontage:
    parallelEffects.includes('APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT') &&
    parallelEffects.includes('runtimeOwned: false') &&
    parallelEffects.includes('audioMutating: false') &&
    [
      'collectiveMemory',
      'sharedFormatters',
      'psychedelicSpiral',
      'enterHoldPsyFx',
      'schwarm',
      'runtimeMonitors',
      'liveMastering',
    ].every((group) => parallelEffects.includes(`...${group}`)),
  recordingTakeBoundaryStillPureMontage:
    recordingTake.includes('APP_RECORDING_TAKE_AUX_PANEL_BOUNDARY_CONTRACT') &&
    recordingTake.includes('runtimeOwned: false') &&
    recordingTake.includes('audioMutating: false') &&
    [
      'source',
      'session',
      'exportActions',
      'timeline',
    ].every((group) => recordingTake.includes(`...${group}`)),
  shapeAuditStillPureStaticMap:
    exists('validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts') &&
    read('validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts').includes('APP_AUX_PANEL_BOUNDARY_SHAPE_AUDIT') &&
    read('validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts').includes('runtimeOwned: false') &&
    read('validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts').includes('audioMutating: false'),
  appPassesAuxPanelSourcesInsideAuxPanels:
    app.includes('auxPanels: {') &&
    app.includes('parallelEffects: {') &&
    app.includes('resonanceFxUiState') &&
    app.includes('grooveBass: materialTrackPanelProps') &&
    app.includes('recordingTake: recordingRuntime.recordingTake,') &&
    app.includes('burstDiagnostics: burstDiagnosticsPanelProps') &&
    !app.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !app.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)'),
  noAuxBoundaryIndexOrPassThroughLayerIntroduced:
    !exists('src/features/xensonar/layout/appAuxPanelBoundaryIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/appAuxPanelBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Aux panel boundary dependency audit') &&
    suite.includes('xensonar:check-app-aux-panel-boundary-dependency-audit'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-aux-panel-boundary-dependency-audit'),
  appLineCountWithinDependencyAuditRange: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  dependencyAudit: {
    auditedKeys: expectedDependencyAuditKeys,
    guardedFiles: dependencyAuditFiles,
    allDependencyFilesClean,
    dependencyFindings,
  },
  movedScope: [
    'A static dependency audit contract for the aux-panel flattening boundary, the source normalizer, the parallel-effects aux-panel input boundary, and the recording-take aux-panel input boundary',
    'A guard that compares actual import statements against the allowed type/value import map',
    'A sanity-suite hook so the aux-panel layer cannot silently start importing runtime/audio/package/App dependencies',
  ],
  explicitlyNotMoved: [
    'No App.tsx runtime logic was intentionally changed; App.tsx passes the recording take into the existing aux-panel boundary while the grouping lives inside that boundary',
    'No additional aux-panel bridge pass-through file or index was introduced',
    'No collective memory, Psychedelic Spiral, Enter-Hold PsyFX, Schwarm, live mastering, recording runtime/session, WAV export, package, audio, scheduling, Root-Follow, Worklet, Granular, Materialspur, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
