#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const auditPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryDependencyAudit.ts';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const propsBridgePath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const appPath = 'src/App.tsx';
const pkgPath = 'package.json';

const pkg = JSON.parse(read(pkgPath));
const app = read(appPath);
const audit = exists(auditPath) ? read(auditPath) : '';
const index = exists(indexPath) ? read(indexPath) : '';
const propsBridge = exists(propsBridgePath) ? read(propsBridgePath) : '';
const appLines = app.split(/\r?\n/).length;

const expectedDependencyAuditKeys = [
  'propsBridge',
  'performanceCrisis',
  'burstDiagnostics',
  'materialTrack',
  'resonanceControl',
  'particleSystem',
];

const dependencyAuditFiles = {
  propsBridge: propsBridgePath,
  performanceCrisis: 'src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts',
  burstDiagnostics: 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts',
  materialTrack: 'src/features/xensonar/groove/buildAppMaterialTrackPanelBoundary.ts',
  resonanceControl: 'src/features/xensonar/rooms/buildAppResonanceControlPanelBoundary.ts',
  particleSystem: 'src/features/xensonar/rooms/buildAppParticleSystemPanelBoundary.ts',
};

const allowedValueImports = {
  propsBridge: [
    '../rooms/buildBurstDiagnosticsPanelProps',
    '../diagnostics/buildAppBurstDiagnosticsPanelBoundary',
    '../rooms/buildMaterialTrackPanelProps',
    '../groove/buildAppMaterialTrackPanelBoundary',
    '../rooms/buildParticleSystemProps',
    '../rooms/buildAppParticleSystemPanelBoundary',
    '../rooms/buildResonanceControlProps',
    '../rooms/buildAppResonanceControlPanelBoundary',
    '../performanceCrisis/performanceCrisisPanelProps',
    '../performanceCrisis/buildAppPerformanceCrisisPanelBoundary',
  ],
  performanceCrisis: ['../rootFollow/rootFollowGranularSettings'],
  burstDiagnostics: [],
  materialTrack: [
    '../../resonance/rhythmforge/bridges',
    '../domain/instrumentData',
  ],
  resonanceControl: [],
  particleSystem: ['../domain/instrumentData'],
};

const allowedTypeImports = {
  propsBridge: ['./appResonancePanelBoundaryIndex', './useAppResonancePanelPropsBoundaryTypes'],
  performanceCrisis: [
    '../rootFollow/rootFollowGranularSettings',
    './performanceCrisisPanelProps',
    './usePerformanceCrisisUiPolicyState',
  ],
  burstDiagnostics: [
    '../domain/instrumentData',
    '../domain/runtimeTypes',
    '../rooms/buildBurstDiagnosticsPanelProps',
  ],
  materialTrack: [
    '../rooms/buildMaterialTrackPanelProps',
    './buildAppMaterialTrackPanelBoundaryTypes',
  ],
  resonanceControl: ['./buildResonanceControlProps'],
  particleSystem: ['./buildParticleSystemProps', './buildAppParticleSystemPanelBoundaryTypes'],
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
];

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'playParticleNoiseAccentWithLifecycle(',
  'runParticleNexusToneOrchestrator(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'startQuantizedCollisionRuntime(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
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
  expectedFilesExist: [auditPath, indexPath, propsBridgePath, appPath, pkgPath].every(exists) &&
    Object.values(dependencyAuditFiles).every(exists),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-panel-boundary-dependency-audit'] ===
    'node tools/check-app-resonance-panel-boundary-dependency-audit.mjs',
  auditDeclaresExplicitDependencyMap:
    audit.includes('APP_RESONANCE_PANEL_BOUNDARY_DEPENDENCY_AUDIT') &&
    audit.includes('APP_RESONANCE_PANEL_BOUNDARY_DEPENDENCY_FORBIDDEN_IMPORT_FRAGMENTS') &&
    expectedDependencyAuditKeys.every((key) => audit.includes(`${key}: {`) || audit.includes(`'${key}'`)),
  auditDeclaresNonOwnershipFlags: [
    'mayImportReact: false',
    'mayImportApp: false',
    'mayImportAudioRuntime: false',
    'mayImportPackagePersistence: false',
    'runtimeOwned: false',
    'audioMutating: false',
  ].every((needle) => audit.includes(needle)),
  indexReExportsDependencyAudit:
    index.includes('APP_RESONANCE_PANEL_BOUNDARY_DEPENDENCY_AUDIT') &&
    index.includes('AppResonancePanelBoundaryDependencyAuditEntry'),
  propsBoundaryStillAvoidsExtraBridgeFile:
    propsBridge.includes('APP_RESONANCE_PANEL_BRIDGE_READINESS') &&
    propsBridge.includes('avoidsAdditionalPassThroughBridgeFile: true'),
  actualBoundaryImportsMatchAuditAllowlist: allDependencyFilesClean,
  dependencyAuditHasNoBackImportToIndex:
    !audit.includes("from './appResonancePanelBoundaryIndex'") &&
    audit.includes('AppResonancePanelBoundaryDependencyAuditKey'),
  noSubBoundaryImportsReactOrApp: Object.entries(dependencyFindings).every(([, finding]) =>
    !finding.valueImports.includes('react') &&
    !finding.typeImports.includes('react') &&
    finding.forbiddenImportHits.length === 0
  ),
  dependencyGuardListedInSanitySuiteContract:
    read('tools/check-xensonar-refactor-sanity-suite-contract.mjs').includes('xensonar:check-app-resonance-panel-boundary-dependency-audit'),
  dependencyGuardListedInRefactorSuiteRunner:
    read('tools/run-xensonar-refactor-sanity-suite.mjs').includes('Resonance panel boundary dependency audit') &&
    read('tools/run-xensonar-refactor-sanity-suite.mjs').includes('xensonar:check-app-resonance-panel-boundary-dependency-audit'),
  appStillOwnsRiskyNonMaterialPanelInputComposition: [
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
  ].every((needle) => app.includes(needle)) &&
    app.includes('materialTrack: {') &&
    app.includes('previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef }') &&
    !app.includes('materialTrack: buildAppMaterialTrackPanelBoundary({'),
  appLineCountWithinDependencyAuditRange: appLines <= 5540,
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
    'A static dependency audit contract for the existing resonance panel props bridge and five app resonance panel sub-boundaries',
    'A guard that compares actual import statements against the allowed type/value import map',
    'A sanity-suite hook so the boundary layer cannot silently start importing runtime/audio/package/App dependencies',
  ],
  explicitlyNotMoved: [
    'No App.tsx logic or line count was intentionally changed',
    'No additional bridge pass-through file was introduced',
    'No Root-Follow, Worklet, Granular, Materialspur, Paketstation, Partikel, Wellenstarter, Drum/Bass, or Room III behavior changed',
    'No runtime, audio mutation, scheduling policy, persistence policy, visible UI, or HTML output changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
