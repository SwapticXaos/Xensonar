#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const performanceBoundaryPath = 'src/features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary.ts';
const particleBoundaryPath = 'src/features/xensonar/rooms/buildAppParticleSystemPanelBoundary.ts';
const burstBoundaryPath = 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts';
const resonanceControlBoundaryPath = 'src/features/xensonar/rooms/buildAppResonanceControlPanelBoundary.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const boundary = ctx.read(boundaryPath);
const performanceBoundary = ctx.read(performanceBoundaryPath);
const particleBoundary = ctx.read(particleBoundaryPath);
const burstBoundary = ctx.read(burstBoundaryPath);
const resonanceControlBoundary = ctx.read(resonanceControlBoundaryPath);
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
const burstDiagnosticsBlock = extractObjectPropertyBlock(propsCall, 'burstDiagnostics', 'performanceCrisis');
const performanceCrisisBlock = extractObjectPropertyBlock(propsCall, 'performanceCrisis', 'resonanceControl');
const resonanceControlBlock = extractObjectPropertyBlock(propsCall, 'resonanceControl', 'particleSystem');
const particleSystemBlock = extractObjectPropertyBlock(propsCall, 'particleSystem', '});');

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
  packageVersionAtLeast159: /^3\.2\.91\.6\.9\.(?:159|1[6-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-panel-source-boundary-normalization'] ===
    'node tools/check-app-resonance-panel-source-boundary-normalization.mjs',
  appStillUsesSinglePropsBoundaryCall:
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1 && propsCall.length > 0,
  appNoLongerImportsPreparedPanelSourceBuilders:
    !app.includes('buildAppBurstDiagnosticsPanelBoundary') &&
    !app.includes('buildAppPerformanceCrisisPanelBoundary') &&
    !app.includes('buildAppParticleSystemPanelBoundary') &&
    !app.includes('buildAppResonanceControlPanelBoundary'),
  appPassesResonanceControlAsVisibleSource:
    propsCall.includes('burstDiagnostics: {') &&
    propsCall.includes('resonanceControl: {') &&
    resonanceControlBlock.includes('state: { nParamsUI, droneVolume, transientDriveUi') &&
    resonanceControlBlock.includes('gridAndTuning:') &&
    resonanceControlBlock.includes('trafficRefs:') &&
    resonanceControlBlock.includes('toneActions:') &&
    resonanceControlBlock.includes('myzelInstallation:') &&
    !resonanceControlBlock.includes('buildAppResonanceControlPanelBoundary({'),
  appPassesBurstDiagnosticsAsOperationalSource:
    burstDiagnosticsBlock.includes('burstDiagnostics: {') &&
    burstDiagnosticsBlock.includes('audioBurstRuntime') &&
    burstDiagnosticsBlock.includes('exportContext: { room, liveMasteringEnabled, gridTempoBpm, quantizeGrid, materialLoopActive: nParamsUI.materialLoopActive, waveSoundEnabled }') &&
    burstDiagnosticsBlock.includes('rootFollowRecoveryActions:') &&
    !burstDiagnosticsBlock.includes('buildAppBurstDiagnosticsPanelBoundary({'),
  appPassesPerformanceCrisisAsSource:
    performanceCrisisBlock.includes('performanceCrisis: {') &&
    performanceCrisisBlock.includes('uiPolicyState: performanceCrisisUiPolicyState') &&
    performanceCrisisBlock.includes('rootFollowGranulationSource: { nParamsUI, updateNParams }') &&
    performanceCrisisBlock.includes('audioBurstRecorder') &&
    !performanceCrisisBlock.includes('buildAppPerformanceCrisisPanelBoundary({'),
  appPassesParticleSystemAsSource:
    particleSystemBlock.includes('particleSystem: {') &&
    particleSystemBlock.includes('selection: { setParticleSystem, activeParticleNodes }') &&
    particleSystemBlock.includes('presetCatalogSource: { particlePresets: particleSoundMenuOptions }') &&
    particleSystemBlock.includes('agentActions: { previewParticlePresetSelection: previewParticlePresetSelectionAction, toggleNexusAgent, setNexusAgentVolume }') &&
    !particleSystemBlock.includes('buildAppParticleSystemPanelBoundary({'),
  appPreparedSourceBlocksHaveNoRuntimeOrPersistenceTokens:
    findForbiddenFragments(burstDiagnosticsBlock + performanceCrisisBlock + resonanceControlBlock + particleSystemBlock, forbiddenRuntimeTokens).length === 0,
  propsBoundaryDeclaresPreparedSourceInputTypes:
    boundary.includes('AppResonancePanelPropsBurstDiagnosticsInput') &&
    boundary.includes('AppBurstDiagnosticsPanelBoundaryArgs') &&
    boundary.includes('AppResonancePanelPropsPerformanceCrisisInput') &&
    boundary.includes('AppResonancePanelPropsParticleSystemInput') &&
    boundary.includes('AppResonancePanelPropsResonanceControlInput') &&
    boundary.includes('AppPerformanceCrisisPanelBoundaryArgs') &&
    boundary.includes('AppParticleSystemPanelBoundaryArgs') &&
    boundary.includes('AppResonanceControlPanelBoundaryArgs'),
  propsBoundaryNormalizesPreparedSources:
    boundary.includes('normalizeBurstDiagnosticsPanelInput(burstDiagnostics)') &&
    boundary.includes('buildAppBurstDiagnosticsPanelBoundary(input)') &&
    boundary.includes('normalizePerformanceCrisisPanelInput(performanceCrisis)') &&
    boundary.includes('buildAppPerformanceCrisisPanelBoundary(input)') &&
    boundary.includes('normalizeParticleSystemPanelInput(particleSystem)') &&
    boundary.includes('buildAppParticleSystemPanelBoundary(input)') &&
    boundary.includes('normalizeResonanceControlPanelInput(resonanceControl)') &&
    boundary.includes('buildAppResonanceControlPanelBoundary(input)'),
  propsBoundaryKeepsPanelPropBuilderOwnership:
    boundary.includes('buildMaterialTrackPanelProps(normalizeMaterialTrackPanelInput(materialTrack))') &&
    boundary.includes('burstDiagnosticsPanelProps: buildBurstDiagnosticsPanelProps(') &&
    boundary.includes('normalizeBurstDiagnosticsPanelInput(burstDiagnostics)') &&
    boundary.includes('buildPerformanceCrisisPanelProps(') &&
    boundary.includes('buildResonanceControlProps(') &&
    boundary.includes('normalizeResonanceControlPanelInput(resonanceControl)') &&
    boundary.includes('buildParticleSystemProps('),
  propsBoundaryHasNoAudioOrSchedulingMutation:
    findForbiddenFragments(boundary, forbiddenRuntimeTokens).length === 0,
  performanceBoundaryStillOwnsOnlyPanelInputMapping:
    performanceBoundary.includes('buildAppPerformanceCrisisPanelBoundary') &&
    performanceBoundary.includes('resolveRootFollowGranulationSource(rootFollowGranulationSource)') &&
    performanceBoundary.includes('applyGranularRootFollowSettings: updateRootFollowGranularSettings') &&
    findForbiddenFragments(performanceBoundary, forbiddenRuntimeTokens).length === 0,
  burstBoundaryStillOwnsOnlyOperationalCallbackMapping:
    burstBoundary.includes('buildAppBurstDiagnosticsPanelBoundary') &&
    burstBoundary.includes('onStartAudioBurstRecorder: audioBurstRuntime.start') &&
    burstBoundary.includes('onExportAudioBurstRecorder: () => audioBurstRuntime.exportLog(exportContext)') &&
    burstBoundary.includes('...rootFollowRecoveryActions') &&
    findForbiddenFragments(burstBoundary, forbiddenRuntimeTokens).length === 0,
  resonanceControlBoundaryStillOwnsOnlyGroupFlattening:
    resonanceControlBoundary.includes('buildAppResonanceControlPanelBoundary') &&
    resonanceControlBoundary.includes('...state') &&
    resonanceControlBoundary.includes('...gridAndTuning') &&
    resonanceControlBoundary.includes('...trafficRefs') &&
    resonanceControlBoundary.includes('...toneActions') &&
    resonanceControlBoundary.includes('...myzelInstallation') &&
    findForbiddenFragments(resonanceControlBoundary, forbiddenRuntimeTokens).length === 0,
  particleBoundaryStillOwnsOnlyStaticCatalogMapping:
    particleBoundary.includes('buildAppParticleSystemPanelBoundary') &&
    particleBoundary.includes('particleGradientPresets: PARTICLE_GRADIENT_PRESETS') &&
    particleBoundary.includes('agentKeys: AGENT_KEYS') &&
    particleBoundary.includes('particleVolumeMax: PARTICLE_VOLUME_MAX') &&
    findForbiddenFragments(particleBoundary, forbiddenRuntimeTokens).length === 0,
  suiteIncludesGuard:
    suite.includes('Resonance panel source boundary normalization') &&
    suite.includes('xensonar:check-app-resonance-panel-source-boundary-normalization'),
  suiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-panel-source-boundary-normalization'),
  noNewPassThroughBridgeCreated:
    !ctx.exists('src/features/xensonar/layout/appResonancePanelSourceBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppResonancePanelSourceBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appResonancePanelSourceBoundary.ts'),
  appLineCountWithinExpectedRange: appLines <= 5495,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  normalizedSources: ['burstDiagnostics', 'performanceCrisis', 'resonanceControl', 'particleSystem'],
  keptExplicitInApp: [],
  movedScope: [
    'The existing panel-props boundary now normalizes Burst-Diagnostics, Performance-Crisis and Particle-System source groups before building panel props.',
    'App.tsx no longer calls the prepared Burst-Diagnostics, Performance-Crisis, Resonance-Control and Particle-System sub-boundary builders directly.',
    'Performance-Crisis policy/granular source and Particle-System agent actions remain visible as App-owned sources.',
  ],
  explicitlyNotMoved: [
    'Burst-Diagnostics recovery/export callbacks remain explicitly visible as App-owned sources, while callback mapping is boundary-owned.',
    'Resonance-Control grid/tuning, traffic refs, tone actions, and Myzel installation groups remain explicitly visible in App.tsx while boundary-owned normalization flattens them.',
    'No Root-Follow, Worklet, Materialspur, Partikel runtime, Wellenstarter, Drum/Bass, Package, Room III, scheduling, or audio-node behavior changed.',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
