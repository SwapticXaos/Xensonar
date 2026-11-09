#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const propsBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const materialBoundaryPath = 'src/features/xensonar/groove/buildAppMaterialTrackPanelBoundary.ts';
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const depAuditPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryDependencyAudit.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const propsBoundary = ctx.read(propsBoundaryPath);
const materialBoundary = ctx.read(materialBoundaryPath);
const index = ctx.read(indexPath);
const depAudit = ctx.read(depAuditPath);
const suite = ctx.read(suitePath);
const suiteContract = ctx.read(suiteContractPath);
const pkg = ctx.readJson(pkgPath);
const appLines = app.split(/\r?\n/).length;

function extractCallExpression(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) return '';
  const openParen = source.indexOf('(', start + marker.length);
  if (openParen < 0) return '';
  let depth = 0;
  let inString = null;
  let escape = false;
  for (let i = openParen; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

function extractObjectPropertyBlock(source, propertyName, nextPropertyName) {
  const start = source.indexOf(`${propertyName}:`);
  if (start < 0) return '';
  const end = nextPropertyName ? source.indexOf(`${nextPropertyName}:`, start + propertyName.length) : -1;
  return source.slice(start, end > start ? end : undefined);
}

const propsCall = extractCallExpression(app, '} = useAppResonancePanelPropsBoundary');
const materialTrackBlock = extractObjectPropertyBlock(propsCall, 'materialTrack', 'burstDiagnostics');
const nonMaterialRiskyBlocks = ['burstDiagnostics', 'performanceCrisis', 'resonanceControl', 'particleSystem'];
const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  'new AudioContext(',
  '.connect(',
  '.disconnect(',
  '.start(',
  '.stop(',
  'requestAnimationFrame(',
  'window.setInterval(',
  'window.setTimeout(',
  'setInterval(',
  'setTimeout(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'startQuantizedCollisionRuntime(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'playParticleNoiseAccentWithLifecycle(',
  'saveWorkspacePackage',
  'loadWorkspacePackage',
  'downloadRecordingWav(',
];

const materialTrackCallsiteTokens = [
  'nParamsUI',
  'updateNParams',
  'metronomePulse',
  'enterArenaWorkspace',
  'exportedDrumConfigs',
  'selectedExportedDrumConfig',
  'renameSelectedDrumConfig',
  'removeSelectedDrumConfig',
  'materialLoopPanelProps',
  'previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef }',
];

const checks = {
  packageVersionAtLeast139: /^3\.2\.91\.6\.9\.(?:13[9]|1[4-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-material-track-panel-callsite-cleanup'] ===
    'node tools/check-app-material-track-panel-callsite-cleanup.mjs',
  appStillUsesSingleResonancePanelPropsBoundaryCall:
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1 && propsCall.length > 0,
  appNoLongerImportsMaterialTrackSubBoundary:
    !app.includes('buildAppMaterialTrackPanelBoundary') &&
    !app.includes('./features/xensonar/groove/buildAppMaterialTrackPanelBoundary'),
  appMaterialTrackCallsiteCollapsedToCompactPreviewSource:
    materialTrackBlock.includes('materialTrack: {') &&
    !materialTrackBlock.includes('buildAppMaterialTrackPanelBoundary({') &&
    !materialTrackBlock.includes('preview: {') &&
    materialTrackCallsiteTokens.every((token) => materialTrackBlock.includes(token)),
  appMaterialTrackBlockHasNoRuntimeOrPersistenceTokens:
    findForbiddenFragments(materialTrackBlock, forbiddenRuntimeTokens).length === 0,
  appKeepsNonMaterialRiskyPanelGroupsExplicit:
    propsCall.includes('burstDiagnostics: buildAppBurstDiagnosticsPanelBoundary({') &&
    propsCall.includes('performanceCrisis: {') &&
    propsCall.includes('rootFollowGranulationSource: { nParamsUI, updateNParams }') &&
    propsCall.includes('resonanceControl: buildAppResonanceControlPanelBoundary({') &&
    propsCall.includes('particleSystem: {') &&
    propsCall.includes('rootFollowRecoveryActions:') &&
    propsCall.includes('gridAndTuning:') &&
    propsCall.includes('trafficRefs:') &&
    propsCall.includes('myzelInstallation:') &&
    propsCall.includes('agentActions:'),
  propsBoundaryNormalizesMaterialTrackInputOnly:
    propsBoundary.includes('AppResonancePanelPropsMaterialTrackInput') &&
    propsBoundary.includes('normalizeMaterialTrackPanelInput') &&
    propsBoundary.includes('buildAppMaterialTrackPanelBoundary(input)') &&
    propsBoundary.includes('buildMaterialTrackPanelProps(normalizeMaterialTrackPanelInput(materialTrack))') &&
    propsBoundary.includes('burstDiagnosticsPanelProps: buildBurstDiagnosticsPanelProps(burstDiagnostics)') &&
    propsBoundary.includes('normalizePerformanceCrisisPanelInput(performanceCrisis)') &&
    propsBoundary.includes('resonanceControlRuntimeProps: buildResonanceControlProps(resonanceControl)') &&
    propsBoundary.includes('normalizeParticleSystemPanelInput(particleSystem)'),
  materialBoundaryAcceptsCompactPreviewSourceAndKeepsGroupedPreviewCompatibility:
    materialBoundary.includes('AppMaterialTrackPanelCompactBoundaryArgs') &&
    materialBoundary.includes('previewSource: AppMaterialTrackPreviewSourceBoundaryArgs') &&
    materialBoundary.includes('resolveAppMaterialTrackPreviewBoundaryArgs') &&
    materialBoundary.includes('preservesGroupedPreviewInput: true') &&
    materialBoundary.includes('acceptsCompactPreviewSource: true') &&
    materialBoundary.includes("currentAppCallsiteShape: 'compact-preview-source-forwarding'"),
  materialBoundaryStillOwnsCatalogAndBassPreviewContextOnly:
    materialBoundary.includes('drumPatterns: DRUM_PATTERNS') &&
    materialBoundary.includes('drumKits: DRUM_KITS') &&
    materialBoundary.includes('bassPatterns: BASS_PATTERNS') &&
    materialBoundary.includes('bassPreviewContext: buildAppBassPreviewContext(preview)') &&
    materialBoundary.includes('grooveStateFromMycelium(myceliumSnapshot, currentTimeSec)'),
  materialBoundaryHasNoRuntimeOrPersistenceTokens:
    findForbiddenFragments(materialBoundary, forbiddenRuntimeTokens).length === 0,
  shapeAuditRecognizesMaterialTrackPreviewSource:
    index.includes("'previewSource'") &&
    index.includes("inputGroups: ['panelArgs', 'preview', 'previewSource']"),
  dependencyAuditAllowsPropsBridgeToImportMaterialTrackSubBoundary:
    depAudit.includes("'../groove/buildAppMaterialTrackPanelBoundary'") &&
    depAudit.includes("dependencyRole: 'static-panel-prop-bridge'"),
  probeMarksMaterialTrackCleanupCompleted:
    propsBoundary.includes("materialTrackCleanupCompletedIn: '3.2.91.6.9.139'"),
  noNewPassThroughBridgeCreated:
    !ctx.exists('src/features/xensonar/layout/appResonancePanelPropsBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppResonancePanelBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appResonancePanelPropsBoundaryIndex.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Material track panel callsite cleanup') &&
    suite.includes('xensonar:check-app-material-track-panel-callsite-cleanup'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-material-track-panel-callsite-cleanup'),
  materialTrackCallsiteRemainsCompact: materialTrackBlock.split(/\r?\n/).length <= 16,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  materialTrackBlockLines: materialTrackBlock.split(/\r?\n/).length,
  movedScope: [
    'Material Track panel preview value assembly moved from App.tsx into buildAppMaterialTrackPanelBoundary',
    'useAppResonancePanelPropsBoundary now normalizes the materialTrack input before the panel prop builder',
    'App.tsx keeps only compact materialTrack sources plus previewSource refs/context',
  ],
  explicitlyNotMoved: [
    'Burst Diagnostics, Performance Crisis, Resonance Control, and Particle System input assembly remain explicit in App.tsx',
    'No Materialspur import/export, MaterialLoop runtime, Root-Follow runtime, particle runtime, scheduling, audio node construction, or package persistence moved',
    'No additional resonance panel pass-through bridge/index was introduced',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
