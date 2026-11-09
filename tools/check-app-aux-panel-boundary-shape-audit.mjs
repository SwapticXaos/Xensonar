#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const shapeAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const auxArgsPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgs.ts';
const auxTypesPath = 'src/features/xensonar/layout/appResonanceAuxPanelRuntimeArgsTypes.ts';
const parallelEffectsPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const recordingTakePath = 'src/features/xensonar/layout/buildAppRecordingTakeAuxPanelBoundary.ts';
const materialTrackPath = 'src/features/xensonar/groove/buildAppMaterialTrackPanelBoundary.ts';
const burstDiagnosticsPath = 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const pkg = JSON.parse(read(pkgPath));
const shapeAudit = exists(shapeAuditPath) ? read(shapeAuditPath) : '';
const dependencyAudit = exists(dependencyAuditPath) ? read(dependencyAuditPath) : '';
const auxArgs = exists(auxArgsPath) ? read(auxArgsPath) : '';
const auxTypes = exists(auxTypesPath) ? read(auxTypesPath) : '';
const parallelEffects = exists(parallelEffectsPath) ? read(parallelEffectsPath) : '';
const recordingTake = exists(recordingTakePath) ? read(recordingTakePath) : '';
const materialTrack = exists(materialTrackPath) ? read(materialTrackPath) : '';
const burstDiagnostics = exists(burstDiagnosticsPath) ? read(burstDiagnosticsPath) : '';
const app = read(appPath);
const suite = read(suitePath);
const suiteContract = read(suiteContractPath);
const appLines = app.split(/\r?\n/).length;

const shapeKeys = ['auxRuntimeArgs', 'parallelEffects', 'grooveBass', 'recordingTake', 'burstDiagnostics'];
const auxPanelOrder = ['parallelEffects', 'grooveBass', 'recordingTake', 'burstDiagnostics'];
const nonOwnershipNeedles = [
  'runtimeOwned: false',
  'audioMutating: false',
  'bridgeOwnsPanelPropBuild: false',
];
const requiredShapeGroups = {
  auxRuntimeArgs: auxPanelOrder,
  parallelEffects: ['collectiveMemory', 'sharedFormatters', 'psychedelicSpiral', 'enterHoldPsyFx', 'schwarm', 'runtimeMonitors', 'liveMastering'],
  grooveBass: ['panelArgs', 'preview'],
  recordingTake: ['source', 'session', 'exportActions', 'timeline'],
  burstDiagnostics: ['audioTapMonitor', 'audioBurstRecorder', 'audioPairTherapistStatus', 'rootFollowHealth', 'workspacePackageActivationReport', 'audioBurstRuntime', 'exportContext', 'rootFollowRecoveryActions'],
};

const appAuxPanelBlock = app.slice(app.indexOf('auxPanels: {'), app.indexOf('resonancePanels: {'));
const hasAllGroups = (content, groups) => groups.every((group) => content.includes(`'${group}'`) || content.includes(`"${group}"`));

const checks = {
  expectedFilesExist: [
    shapeAuditPath,
    dependencyAuditPath,
    auxArgsPath,
    auxTypesPath,
    parallelEffectsPath,
    recordingTakePath,
    materialTrackPath,
    burstDiagnosticsPath,
    appPath,
    pkgPath,
  ].every(exists),
  packageVersionAtLeast112: /^3\.2\.91\.6\.9\.(11[2-9]|1[2-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-aux-panel-boundary-shape-audit'] ===
    'node tools/check-app-aux-panel-boundary-shape-audit.mjs',
  shapeAuditDeclaresExpectedContract:
    shapeAudit.includes('APP_AUX_PANEL_BOUNDARY_SHAPE_AUDIT') &&
    shapeAudit.includes('APP_AUX_PANEL_BOUNDARY_SHAPE_AUDIT_ORDER') &&
    shapeAudit.includes('AppAuxPanelBoundaryShapeAuditEntry') &&
    shapeKeys.every((key) => shapeAudit.includes(`${key}: {`)),
  shapeAuditUsesTypedAuxContractNames:
    shapeAudit.includes("from './appResonanceAuxPanelRuntimeArgsTypes'") &&
    shapeAudit.includes('AppAuxPanelBoundaryInputGroupName') &&
    shapeAudit.includes('AppAuxPanelBoundaryOutputContractName') &&
    shapeAudit.includes("export type AppAuxPanelBoundaryShapeAuditKey = 'auxRuntimeArgs' | AppAuxPanelBoundaryKey") &&
    shapeAudit.includes('readonly inputGroups: readonly AppAuxPanelBoundaryInputGroupName[];') &&
    shapeAudit.includes('readonly outputContract: AppAuxPanelBoundaryOutputContractName;'),
  shapeAuditDeclaresNonOwnershipForEveryEntry:
    shapeKeys.every((key) => {
      const start = shapeAudit.indexOf(`${key}: {`);
      const nextStarts = shapeKeys
        .map((other) => shapeAudit.indexOf(`${other}: {`, start + 1))
        .filter((idx) => idx > start);
      const end = nextStarts.length ? Math.min(...nextStarts) : shapeAudit.indexOf('} as const satisfies', start);
      const block = shapeAudit.slice(start, end);
      return nonOwnershipNeedles.every((needle) => block.includes(needle));
    }),
  shapeAuditGroupsMatchCurrentAuxPanels:
    Object.entries(requiredShapeGroups).every(([key, groups]) => {
      const start = shapeAudit.indexOf(`${key}: {`);
      const nextStarts = shapeKeys
        .map((other) => shapeAudit.indexOf(`${other}: {`, start + 1))
        .filter((idx) => idx > start);
      const end = nextStarts.length ? Math.min(...nextStarts) : shapeAudit.indexOf('} as const satisfies', start);
      const block = shapeAudit.slice(start, end);
      return hasAllGroups(block, groups);
    }),
  auxArgsStillDefinesFourAuxPanelInputs:
    auxArgs.includes('APP_AUX_PANEL_BOUNDARY_KEYS') &&
    auxTypes.includes('AppAuxPanelBoundaryInputContractMap') &&
    auxTypes.includes('AppAuxPanelBoundarySourceContractMap') &&
    auxTypes.includes('AppAuxPanelBoundaryOutputContractMap') &&
    ['parallelEffects', 'grooveBass', 'recordingTake', 'burstDiagnostics'].every((needle) => auxTypes.includes(needle)) &&
    ['...normalizedInput.parallelEffects', '...grooveBass', '...normalizedInput.recordingTake', '...normalizedInput.burstDiagnostics'].every((needle) => auxArgs.includes(needle)),
  appPassesFourAuxPanelSourcesInOrder:
    appAuxPanelBlock.includes('parallelEffects: {') &&
    appAuxPanelBlock.includes('resonanceFxUiState') &&
    appAuxPanelBlock.includes('grooveBass: materialTrackPanelProps') &&
    appAuxPanelBlock.includes('recordingTake: recordingRuntime.recordingTake,') &&
    appAuxPanelBlock.includes('burstDiagnostics: burstDiagnosticsPanelProps') &&
    !appAuxPanelBlock.includes('buildAppParallelEffectsAuxPanelBoundary({') &&
    !appAuxPanelBlock.includes('buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)') &&
    auxPanelOrder.every((key, index) => {
      const token = key === 'grooveBass' ? 'grooveBass: materialTrackPanelProps' : key === 'recordingTake' ? 'recordingTake: recordingRuntime.recordingTake' : key === 'burstDiagnostics' ? 'burstDiagnostics: burstDiagnosticsPanelProps' : `${key}:`;
      const pos = appAuxPanelBlock.indexOf(token);
      const prev = auxPanelOrder.slice(0, index).map((prevKey) => {
        const prevToken = prevKey === 'grooveBass' ? 'grooveBass: materialTrackPanelProps' : prevKey === 'recordingTake' ? 'recordingTake: recordingRuntime.recordingTake' : prevKey === 'burstDiagnostics' ? 'burstDiagnostics: burstDiagnosticsPanelProps' : `${prevKey}:`;
        return appAuxPanelBlock.indexOf(prevToken);
      });
      return pos >= 0 && prev.every((prevPos) => prevPos >= 0 && prevPos < pos);
    }),
  parallelEffectsBoundaryGroupsStillMatchShapeAudit:
    parallelEffects.includes('APP_PARALLEL_EFFECTS_AUX_PANEL_BOUNDARY_CONTRACT') &&
    hasAllGroups(parallelEffects, requiredShapeGroups.parallelEffects),
  recordingTakeBoundaryGroupsStillMatchShapeAudit:
    recordingTake.includes('APP_RECORDING_TAKE_AUX_PANEL_BOUNDARY_CONTRACT') &&
    hasAllGroups(recordingTake, requiredShapeGroups.recordingTake),
  reusedResonanceBoundaryOutputsAreExplicitlyNamed:
    materialTrack.includes('export type AppMaterialTrackPanelBoundary') &&
    burstDiagnostics.includes('export type AppBurstDiagnosticsPanelBoundary') &&
    shapeAudit.includes('shared-resonance-panel-boundary-output-reused-as-aux-panel-input'),
  dependencyAuditIncludesShapeAudit:
    dependencyAudit.includes("| 'shapeAudit'") &&
    dependencyAudit.includes('appAuxPanelBoundaryShapeAudit.ts') &&
    dependencyAudit.includes("dependencyRole: 'static-aux-panel-shape-audit'") &&
    dependencyAudit.includes('allowedValueImports: []') &&
    dependencyAudit.includes("allowedTypeImports: ['./appResonanceAuxPanelRuntimeArgsTypes']"),
  noAuxBoundaryIndexOrPassThroughLayerIntroduced:
    !exists('src/features/xensonar/layout/appAuxPanelBoundaryIndex.ts') &&
    !exists('src/features/xensonar/layout/appResonanceAuxPanelBridge.ts') &&
    !exists('src/features/xensonar/layout/appAuxPanelBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Aux panel boundary shape audit') &&
    suite.includes('xensonar:check-app-aux-panel-boundary-shape-audit'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-aux-panel-boundary-shape-audit'),
  appLineCountWithinShapeAuditRange: appLines <= 5585,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  appLines,
  shapeAudit: {
    auditedKeys: shapeKeys,
    auxPanelOrder,
    requiredShapeGroups,
    role: 'static shape map for the aux-panel flattening layer plus parallel-effects/recording-take aux-panel input montage and the two reused resonance-panel outputs',
  },
  movedScope: [
    'Added a static Aux-panel shape audit map for parallelEffects, grooveBass, recordingTake, and burstDiagnostics',
    'Classified grooveBass and burstDiagnostics as reused resonance-panel boundary outputs rather than new Aux-panel ownership',
    'Added guard coverage so the Aux-panel shape layer cannot drift away from the actual App.tsx auxPanels block and boundary contracts',
  ],
  explicitlyNotMoved: [
    'No new Aux-panel bridge/index layer was introduced',
    'No App.tsx runtime logic, recording runtime, WAV export, parallel-effects DSP, Materialspur/GrooveBass scheduling, Burst Diagnostics runtime, Root-Follow, Worklet, Granular, Partikel, Wellenstarter, Drum/Bass, Package, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
