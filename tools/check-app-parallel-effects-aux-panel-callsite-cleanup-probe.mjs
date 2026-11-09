#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const shapeAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryShapeAudit.ts';
const dependencyAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const boundary = ctx.readIfExists(boundaryPath, '');
const shapeAudit = ctx.readIfExists(shapeAuditPath, '');
const dependencyAudit = ctx.readIfExists(dependencyAuditPath, '');
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
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === inString) {
        inString = null;
      }
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

const parallelStart = app.indexOf('parallelEffects: {');
const parallelEnd = parallelStart >= 0 ? app.indexOf('grooveBass:', parallelStart) : -1;
const parallelCall = parallelStart >= 0 && parallelEnd > parallelStart
  ? app.slice(parallelStart, parallelEnd)
  : extractCallExpression(app, 'parallelEffects: buildAppParallelEffectsAuxPanelBoundary');
const requiredGroups = [
  'collectiveMemory',
  'sharedFormatters',
  'psychedelicSpiral',
  'enterHoldPsyFx',
  'schwarm',
  'runtimeMonitors',
  'liveMastering',
];

const pureValueTokens = [
  'collectiveMemoryEnabled',
  'setCollectiveMemoryEnabled',
  'collectiveMemoryWindow',
  'setCollectiveMemoryWindow',
  'collectiveMemoryUi',
  'updateCollectiveMemoryUi',
  'collectiveMemoryMonitor',
  'formatHzCompact',
  'psychedelicSpiralEnabled',
  'setPsychedelicSpiralEnabled',
  'psychedelicSpiralUi',
  'setPsychedelicSpiralUi',
  'psychedelicSpiralFollow',
  'setPsychedelicSpiralFollow',
  'updatePsychedelicSpiralSource',
  'psychedelicSpiralMonitor',
  'enterHoldPsyFxEnabled',
  'setEnterHoldPsyFxEnabled',
  'enterHoldPsyFxUi',
  'setEnterHoldPsyFxUi',
  'schwarmEnabled',
  'setSchwarmEnabled',
  'schwarmUi',
  'setSchwarmUi',
  'SCHWARM_MATERIAL_OPTIONS',
  'updateSchwarmSource',
  'schwarmMonitor',
  'controlPerfMonitor',
  'transientRuntimeMonitor',
  'liveMasteringEnabled',
  'setLiveMasteringEnabled',
  'liveMasteringStrength',
  'setLiveMasteringStrength',
  'liveMasteringGlue',
  'setLiveMasteringGlue',
  'liveMasteringAir',
  'setLiveMasteringAir',
  'liveMasterMonitor',
];

const forbiddenCallsiteTokens = [
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
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'updateLiveMasteringSystem(',
  'createPsychedelicSpiralDevice(',
  'updatePsychedelicSpiralDevice(',
  'createSchwarmdeuterDevice(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
];

const forbiddenBoundaryTokens = [
  ...forbiddenCallsiteTokens,
  'useState(',
  'useMemo(',
  'useRef(',
  'useEffect(',
  'AudioContext',
  'GainNode',
  'OscillatorNode',
  'AnalyserNode',
];

const checks = {
  packageVersionAtLeast134: /^3\.2\.91\.6\.9\.(13[4-9]|1[4-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-parallel-effects-aux-panel-callsite-cleanup-probe'] ===
    'node tools/check-app-parallel-effects-aux-panel-callsite-cleanup-probe.mjs',
  boundaryFileExists: ctx.exists(boundaryPath),
  boundaryDeclaresCleanupProbe:
    boundary.includes('APP_PARALLEL_EFFECTS_AUX_PANEL_CALLSITE_CLEANUP_PROBE') &&
    boundary.includes("currentRole: 'cleanup-probe-for-app-parallel-effects-aux-panel-callsite'") &&
    boundary.includes('canCollapseAppOwnedGroupAssembly: true') &&
    boundary.includes('requiresEffectDeviceOwnershipToStayOutsideBoundary: true') &&
    boundary.includes('runtimeOwned: false') &&
    boundary.includes('audioMutating: false') &&
    boundary.includes('dspMutating: false'),
  boundaryStillPureInputMontage:
    findForbiddenFragments(boundary, forbiddenBoundaryTokens).length === 0 &&
    requiredGroups.every((group) => boundary.includes(`...${group}`)),
  appUsesParallelEffectsBoundaryForProbeOrCleanup:
    (parallelCall.includes('buildAppParallelEffectsAuxPanelBoundary({') || app.includes('APP_RESONANCE_SCREEN_AUX_PANEL_SOURCE_CLEANUP') || app.includes('parallelEffects: {')) &&
    (requiredGroups.every((group) => parallelCall.includes(`${group}:`)) ||
      ['resonanceFxUiState', 'sharedFormatters: { formatHzCompact }', 'schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS', 'liveMastering: liveMasteringCallsiteBoundary'].every((token) => parallelCall.includes(token))),
  appParallelEffectsCallsiteIsPureValueAssembly:
    parallelCall.length > 0 &&
    findForbiddenFragments(parallelCall, forbiddenCallsiteTokens).length === 0 &&
    (pureValueTokens.every((token) => parallelCall.includes(token)) ||
      ['resonanceFxUiState', 'formatHzCompact', 'SCHWARM_MATERIAL_OPTIONS', 'liveMasteringCallsiteBoundary'].every((token) => parallelCall.includes(token))),
  appCleanupMayHaveCollapsedParallelEffects:
    !app.includes('parallelEffects: buildAppParallelEffectsAuxPanelBoundary(parallelEffects') &&
    !app.includes('parallelEffects: buildAppParallelEffectsAuxPanelBoundary(fx'),
  appRecordingTakeAlreadyCollapsedAsPriorGreenReference:
    (app.includes('recordingTake: buildAppRecordingTakeAuxPanelBoundary(recordingRuntime.recordingTake)') ||
      app.includes('recordingTake: recordingRuntime.recordingTake')) &&
    !app.includes('recordingTake: buildAppRecordingTakeAuxPanelBoundary({\n        source:'),
  shapeAuditStillNamesParallelEffectsAsAuxInputMontage:
    shapeAudit.includes('parallelEffects: {') &&
    shapeAudit.includes("currentRole: 'app-aux-panel-input-montage'") &&
    shapeAudit.includes("'collective memory runtime/effect behavior'") &&
    shapeAudit.includes("'live mastering DSP behavior'"),
  dependencyAuditStillCoversParallelEffectsBoundary:
    dependencyAudit.includes('buildAppParallelEffectsAuxPanelBoundary.ts') &&
    dependencyAudit.includes('parallelEffects: {') &&
    dependencyAudit.includes("boundary: 'parallelEffects'") &&
    dependencyAudit.includes('forbiddenImportFragments'),
  noPassThroughBridgeOrIndexCreated:
    !ctx.exists('src/features/xensonar/layout/appParallelEffectsAuxPanelBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appParallelEffectsAuxPanelBoundaryIndex.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppParallelEffectsAuxPanelBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Parallel effects aux panel callsite cleanup probe') &&
    suite.includes('xensonar:check-app-parallel-effects-aux-panel-callsite-cleanup-probe'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-parallel-effects-aux-panel-callsite-cleanup-probe'),
  appLineCountValidForProbeOrCleanup: appLines >= 5450 && appLines <= 5575,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  probeConclusion: failures.length === 0
    ? 'parallelEffects app-owned group assembly is pure enough; in follow-up cleanup patches the App.tsx callsite may already be collapsed'
    : 'parallelEffects cleanup probe found unresolved contract risks',
  requiredNextPatchConstraints: [
    'Do not move effect-device ensure functions into the aux-panel boundary',
    'Do not construct, connect, disconnect, start, or schedule audio inside buildAppParallelEffectsAuxPanelBoundary',
    'Keep updatePsychedelicSpiralSource and updateSchwarmSource as passed value callbacks only',
    'Keep runtime monitors and live mastering monitor state as passed props only',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
