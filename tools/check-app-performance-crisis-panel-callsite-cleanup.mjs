#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const propsBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const performanceBoundaryPath = 'src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts';
const depAuditPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryDependencyAudit.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const propsBoundary = ctx.read(propsBoundaryPath);
const performanceBoundary = ctx.read(performanceBoundaryPath);
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
const performanceCrisisBlock = extractObjectPropertyBlock(propsCall, 'performanceCrisis', 'resonanceControl');
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

const oldInlineGranulationBlock = `rootFollowGranulation: {
        mode: nParamsUI.rootFollowLoopGranulationMode,
        settings: nParamsUI.rootFollowGranularSettings,
      }`;
const oldInlineCallbackBlock = `updateRootFollowGranularSettings: (
        rootFollowGranularSettings,
        rootFollowLoopGranulationMode,
      ) => updateNParams({ rootFollowGranularSettings, rootFollowLoopGranulationMode })`;

const checks = {
  packageVersionAtLeast142: /^3\.2\.91\.6\.9\.(?:14[2-9]|1[5-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-performance-crisis-panel-callsite-cleanup'] ===
    'node tools/check-app-performance-crisis-panel-callsite-cleanup.mjs',
  packageDoesNotExposeContradictoryProbeScript:
    !pkg.scripts?.['xensonar:check-app-performance-crisis-panel-callsite-cleanup-probe'],
  appStillUsesSingleResonancePanelPropsBoundaryCall:
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1 && propsCall.length > 0,
  appPassesPerformanceCrisisSourceIntoPropsBoundary:
    performanceCrisisBlock.includes('performanceCrisis: {') &&
    !performanceCrisisBlock.includes('buildAppPerformanceCrisisPanelBoundary({') &&
    performanceCrisisBlock.includes('uiPolicyState: performanceCrisisUiPolicyState') &&
    performanceCrisisBlock.includes('rootFollowGranulationSource: { nParamsUI, updateNParams }') &&
    performanceCrisisBlock.includes('audioBurstRecorder'),
  appRemovedOldInlineGranulationAssembly:
    !performanceCrisisBlock.includes(oldInlineGranulationBlock) &&
    !performanceCrisisBlock.includes('mode: nParamsUI.rootFollowLoopGranulationMode') &&
    !performanceCrisisBlock.includes('settings: nParamsUI.rootFollowGranularSettings'),
  appRemovedOldInlineGranularUpdateCallback:
    !performanceCrisisBlock.includes(oldInlineCallbackBlock) &&
    !performanceCrisisBlock.includes('updateRootFollowGranularSettings:'),
  appPerformanceCrisisBlockHasNoAudioOrSchedulingMutation:
    findForbiddenFragments(performanceCrisisBlock, forbiddenRuntimeTokens).length === 0,
  appKeepsRiskierPanelGroupsExplicit:
    propsCall.includes('burstDiagnostics: buildAppBurstDiagnosticsPanelBoundary({') &&
    propsCall.includes('resonanceControl: buildAppResonanceControlPanelBoundary({') &&
    propsCall.includes('particleSystem: {') &&
    propsCall.includes('rootFollowRecoveryActions:') &&
    propsCall.includes('gridAndTuning:') &&
    propsCall.includes('trafficRefs:') &&
    propsCall.includes('myzelInstallation:') &&
    propsCall.includes('agentActions:'),
  performanceBoundaryDeclaresCleanup:
    performanceBoundary.includes('APP_PERFORMANCE_CRISIS_PANEL_CALLSITE_CLEANUP') &&
    performanceBoundary.includes("currentAppCallsiteShape: 'boundary-owned-root-follow-granulation-source-assembly'") &&
    performanceBoundary.includes("previousAppCallsiteShape: 'app-owned-performance-crisis-panel-boundary-args-assembly'") &&
    performanceBoundary.includes("cleanupCompletedIn: '3.2.91.6.9.142'") &&
    performanceBoundary.includes("movedIntoBoundary: 'root-follow-granulation-value-and-update-callback-shaping'") &&
    performanceBoundary.includes('keepsUiPolicyStateAppOwned: true') &&
    performanceBoundary.includes('keepsAudioBurstRecorderOwnershipOutsideBoundary: true') &&
    performanceBoundary.includes('keepsRootFollowGranulationRuntimeOutsideBoundary: true') &&
    performanceBoundary.includes('keepsUpdateNParamsOwnershipOutsideBoundary: true') &&
    performanceBoundary.includes('runtimeOwned: false') &&
    performanceBoundary.includes('audioMutating: false') &&
    performanceBoundary.includes('rootFollowRuntimeOwned: false') &&
    performanceBoundary.includes('performanceCrisisPolicyOwned: false'),
  performanceBoundaryOwnsGranulationSourceAssembly:
    performanceBoundary.includes('AppPerformanceCrisisRootFollowGranulationSource') &&
    performanceBoundary.includes('rootFollowGranulationSource: AppPerformanceCrisisRootFollowGranulationSource') &&
    performanceBoundary.includes('resolveRootFollowGranulationSource(rootFollowGranulationSource)') &&
    performanceBoundary.includes('mode: nParamsUI.rootFollowLoopGranulationMode') &&
    performanceBoundary.includes('settings: nParamsUI.rootFollowGranularSettings') &&
    performanceBoundary.includes('updateNParams({ rootFollowGranularSettings, rootFollowLoopGranulationMode })'),
  performanceBoundaryStillOnlyMapsUiPolicyAndGranularPanelInputs:
    performanceBoundary.includes('activePresetId: uiPolicyState.performanceCrisisPresetId') &&
    performanceBoundary.includes('rootFollowVoiceEngineMode: uiPolicyState.rootFollowVoiceEngineMode') &&
    performanceBoundary.includes('currentGranularMode: rootFollowGranulation.mode') &&
    performanceBoundary.includes('currentGranularSettings: normalizeRootFollowGranularSettings(') &&
    performanceBoundary.includes('applyGranularRootFollowSettings: updateRootFollowGranularSettings'),
  performanceBoundaryHasNoAudioOrSchedulingMutation:
    findForbiddenFragments(performanceBoundary, forbiddenRuntimeTokens).length === 0,
  propsBoundaryMarksPerformanceCrisisCleanupCompleted:
    propsBoundary.includes("canCollapsePerformanceCrisisAfterDiagnostics: 'cleanup-completed-boundary-owned-root-follow-granulation-source'") &&
    propsBoundary.includes("performanceCrisisProbeCompletedIn: '3.2.91.6.9.141'") &&
    propsBoundary.includes("performanceCrisisCleanupCompletedIn: '3.2.91.6.9.142'") &&
    propsBoundary.includes("panelSourceBoundaryNormalizationCompletedIn: '3.2.91.6.9.156'") &&
    propsBoundary.includes('normalizePerformanceCrisisPanelInput(performanceCrisis)'),
  dependencyAuditStillTreatsPerformanceCrisisAsInputMontage:
    depAudit.includes("boundary: 'performanceCrisis'") &&
    depAudit.includes("dependencyRole: 'static-panel-input-boundary'") &&
    depAudit.includes('buildAppPerformanceCrisisPanelBoundary.ts') &&
    depAudit.includes('mayImportAudioRuntime: false') &&
    depAudit.includes('mayImportRootFollowRuntime: false'),
  noNewPassThroughBridgeCreated:
    !ctx.exists('src/features/xensonar/layout/appPerformanceCrisisPanelBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppPerformanceCrisisPanelBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appResonancePanelPropsBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Performance crisis panel callsite cleanup') &&
    suite.includes('xensonar:check-app-performance-crisis-panel-callsite-cleanup') &&
    !suite.includes('Performance crisis panel callsite cleanup probe') &&
    !suite.includes('xensonar:check-app-performance-crisis-panel-callsite-cleanup-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-performance-crisis-panel-callsite-cleanup') &&
    !suiteContract.includes('xensonar:check-app-performance-crisis-panel-callsite-cleanup-probe'),
  performanceCrisisCallsiteRemainsCompact:
    performanceCrisisBlock.includes('rootFollowGranulationSource: { nParamsUI, updateNParams }') &&
    performanceCrisisBlock.split(/\r?\n/).length <= 8,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  lineDeltaFrom141Probe: appLines - 5481,
  performanceCrisisBlockLines: performanceCrisisBlock.split(/\r?\n/).length,
  cleanupConclusion: failures.length === 0
    ? 'performanceCrisis now uses a boundary-owned root-follow granulation source; App.tsx no longer assembles granular mode/settings or the update callback inline, while policy, recorder, and runtime ownership stay outside the boundary'
    : 'performanceCrisis callsite cleanup found unresolved ownership, guard, or regression risks',
  recommendedNextPatch: 'reassess App.tsx callsite candidates; particleSystem remains plausible but needs an agent-action probe, while resonanceControl remains too entangled for direct collapse',
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
