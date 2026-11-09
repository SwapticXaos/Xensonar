#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const depAuditPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryDependencyAudit.ts';
const shapeIndexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const boundary = ctx.read(boundaryPath);
const depAudit = ctx.read(depAuditPath);
const shapeIndex = ctx.read(shapeIndexPath);
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

const propsCall = extractCallExpression(app, '} = useAppResonancePanelPropsBoundary');
const forbiddenSubBoundaryBuilders = [
  'buildAppBurstDiagnosticsPanelBoundary({',
  'buildAppPerformanceCrisisPanelBoundary({',
  'buildAppResonanceControlPanelBoundary({',
  'buildAppParticleSystemPanelBoundary({',
];
const requiredCallsiteKeys = [
  'materialTrack:',
  'burstDiagnostics:',
  'performanceCrisis:',
  'resonanceControl:',
  'particleSystem:',
];
const materialTrackTokens = [
  'nParamsUI',
  'updateNParams',
  'metronomePulse',
  'enterArenaWorkspace',
  'exportedDrumConfigs',
  'selectedExportedDrumConfig',
  'materialLoopPanelProps',
  'previewSource: { myceliumSnapshotRef, audioCtx, nexusRefs, rhythmForgeSeedRef }',
];
const riskyOwnershipTokensThatMustRemainAppOnly = [
  'gridAndTuning:',
  'trafficRefs:',
  'rootFollowRecoveryActions:',
  'myzelInstallation:',
  'agentActions:',
];
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

const checks = {
  packageVersionAtLeast138: /^3\.2\.91\.6\.9\.(?:13[8-9]|1[4-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-panel-props-callsite-cleanup-probe'] ===
    'node tools/check-app-resonance-panel-props-callsite-cleanup-probe.mjs',
  propsBoundaryDeclaresCleanupProbe:
    boundary.includes('APP_RESONANCE_PANEL_PROPS_CALLSITE_CLEANUP_PROBE') &&
    boundary.includes("currentAppCallsiteShape: 'app-owned-sub-boundary-input-assembly'") &&
    boundary.includes('canCollapseAllPanelInputsAtOnce: false') &&
    boundary.includes("recommendedFirstCleanupCandidate: 'materialTrack'") &&
    boundary.includes('canCollapseMaterialTrackFirst: true') &&
    boundary.includes("materialTrackCleanupCompletedIn: '3.2.91.6.9.139'") &&
    boundary.includes('appKeepsGridQuantizeTrafficOwnership: true') &&
    boundary.includes('appKeepsRootFollowRecoveryOwnership: true') &&
    boundary.includes('appKeepsParticleRuntimeOwnership: true') &&
    boundary.includes('bridgeOwnsRuntime: false') &&
    boundary.includes('bridgeMutatesAudio: false'),
  propsBoundaryStillOwnsPanelPropBuildOnly:
    boundary.includes('materialTrackPanelProps: buildMaterialTrackPanelProps(normalizeMaterialTrackPanelInput(materialTrack))') &&
    boundary.includes('burstDiagnosticsPanelProps: buildBurstDiagnosticsPanelProps(') &&
    boundary.includes('normalizeBurstDiagnosticsPanelInput(burstDiagnostics)') &&
    boundary.includes('performanceCrisisPanelProps: buildPerformanceCrisisPanelProps(') &&
    boundary.includes('normalizePerformanceCrisisPanelInput(performanceCrisis)') &&
    boundary.includes('resonanceControlRuntimeProps: buildResonanceControlProps(') &&
    boundary.includes('normalizeResonanceControlPanelInput(resonanceControl)') &&
    boundary.includes('particleSystemRuntimeProps: buildParticleSystemProps(') &&
    boundary.includes('normalizeParticleSystemPanelInput(particleSystem)'),
  appStillUsesSinglePropsBoundaryCall:
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1 && propsCall.length > 0,
  appStillOwnsAllRiskyNonMaterialSubBoundaryInputAssemblyAfterProbe:
    requiredCallsiteKeys.every((token) => propsCall.includes(token)) &&
    forbiddenSubBoundaryBuilders.every((token) => !propsCall.includes(token)) &&
    propsCall.includes('burstDiagnostics: {') &&
    propsCall.includes('audioBurstRuntime') &&
    propsCall.includes('rootFollowRecoveryActions:') &&
    propsCall.includes('performanceCrisis: {') &&
    propsCall.includes('rootFollowGranulationSource: { nParamsUI, updateNParams }') &&
    propsCall.includes('particleSystem: {') &&
    propsCall.includes('presetCatalogSource: { particlePresets: particleSoundMenuOptions }') &&
    propsCall.includes('resonanceControl: {') &&
    propsCall.includes('gridAndTuning:') &&
    propsCall.includes('trafficRefs:') &&
    propsCall.includes('toneActions:') &&
    propsCall.includes('myzelInstallation:'),
  appMaterialTrackCleanupCompletedAsPureCompactCandidate:
    propsCall.includes('materialTrack: {') &&
    !propsCall.includes('materialTrack: buildAppMaterialTrackPanelBoundary({') &&
    materialTrackTokens.every((token) => propsCall.includes(token)) &&
    findForbiddenFragments(propsCall.slice(propsCall.indexOf('materialTrack:'), propsCall.indexOf('burstDiagnostics:')), forbiddenRuntimeTokens).length === 0,
  appRiskyGroupsRemainExplicitInAppDuringProbe:
    riskyOwnershipTokensThatMustRemainAppOnly.every((token) => propsCall.includes(token)),
  propsCallHasNoRuntimeOrPersistenceTokens:
    findForbiddenFragments(propsCall, forbiddenRuntimeTokens).length === 0,
  dependencyAuditStillTreatsPropsBridgeAsStaticPanelPropBridge:
    depAudit.includes("boundary: 'propsBridge'") &&
    depAudit.includes("dependencyRole: 'static-panel-prop-bridge'") &&
    depAudit.includes('useAppResonancePanelPropsBoundary.ts') &&
    depAudit.includes('mayImportAudioRuntime: false') &&
    depAudit.includes('mayImportPackagePersistence: false'),
  shapeAuditStillMarksSubBoundariesAsInputMontage:
    ['materialTrack', 'burstDiagnostics', 'performanceCrisis', 'resonanceControl', 'particleSystem'].every((key) =>
      shapeIndex.includes(`${key}: {`) && shapeIndex.includes("currentRole: 'app-panel-input-montage'")
    ),
  noNewPassThroughBridgeCreated:
    !ctx.exists('src/features/xensonar/layout/appResonancePanelPropsBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppResonancePanelBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appResonancePanelPropsBoundaryIndex.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance panel props callsite cleanup probe') &&
    suite.includes('xensonar:check-app-resonance-panel-props-callsite-cleanup-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-panel-props-callsite-cleanup-probe'),
  appLineCountStableForProbe: appLines >= 5470 && appLines <= 5540,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  probeConclusion: failures.length === 0
    ? 'materialTrack cleanup completed and burstDiagnostics/performanceCrisis/particleSystem are now source-normalized through the panel props boundary; resonanceControl stays explicit'
    : 'resonance panel props callsite cleanup probe found unresolved ownership or guard risks',
  recommendedNextPatch: 'panel-source-normalization-completed-through-resonance-control; next-step-should-map-larger-app-partitions',
  requiredNextPatchConstraints: [
    'Keep prepared non-runtime panel sources normalized through the existing props boundary; keep resonanceControl groups visible rather than hidden',
    'Keep grid/tuning, quantize traffic refs, root-follow recovery action bodies, myzel installation, and particle agent action bodies App-owned for now',
    'Do not move Materialspur import/export, Root-Follow runtime, particle runtime, scheduling, audio node construction, or package persistence',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
