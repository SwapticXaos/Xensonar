#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const boundaryPath = 'src/features/xensonar/layout/buildAppParallelEffectsAuxPanelBoundary.ts';
const depAuditPath = 'validation/contracts/xensonar/layout/appAuxPanelBoundaryDependencyAudit.ts';
const depGuardPath = 'tools/check-app-aux-panel-boundary-dependency-audit.mjs';
const sourceNormalizerPath = 'src/features/xensonar/layout/appResonanceAuxPanelSourceNormalizer.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const boundary = ctx.read(boundaryPath);
const depAudit = ctx.read(depAuditPath);
const depGuard = ctx.read(depGuardPath);
const suite = ctx.read(suitePath);
const sourceNormalizer = ctx.read(sourceNormalizerPath);
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

const parallelStart = app.indexOf('parallelEffects: {');
const parallelEnd = parallelStart >= 0 ? app.indexOf('grooveBass:', parallelStart) : -1;
const parallelCall = parallelStart >= 0 && parallelEnd > parallelStart ? app.slice(parallelStart, parallelEnd) : extractCallExpression(app, 'parallelEffects: buildAppParallelEffectsAuxPanelBoundary');
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

const groupedAppTokens = [
  'collectiveMemory:',
  'psychedelicSpiral:',
  'enterHoldPsyFx:',
  'runtimeMonitors:',
];

const checks = {
  packageVersionAtLeast135: /^3\.2\.91\.6\.9\.(?:13[5-9]|1[4-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-parallel-effects-aux-panel-callsite-cleanup'] ===
    'node tools/check-app-parallel-effects-aux-panel-callsite-cleanup.mjs',
  appKeepsResonanceFxUiStateHookAtOriginalCallsite:
    app.includes('const resonanceFxUiState = useResonanceFxUiState();') &&
    app.includes('} = resonanceFxUiState;') &&
    !app.includes('} = useResonanceFxUiState();'),
  appKeepsLiveMasteringCallsiteBoundaryAtOriginalCallsite:
    app.includes('const liveMasteringCallsiteBoundary = useAppLiveMasteringCallsiteBoundary();') &&
    app.includes('} = liveMasteringCallsiteBoundary;') &&
    !app.includes('} = useAppLiveMasteringCallsiteBoundary();'),
  appCollapsedParallelEffectsCallsite:
    parallelCall.includes('resonanceFxUiState') &&
    parallelCall.includes('sharedFormatters: { formatHzCompact }') &&
    parallelCall.includes('schwarmMaterialOptions: SCHWARM_MATERIAL_OPTIONS') &&
    parallelCall.includes('liveMastering: liveMasteringCallsiteBoundary') &&
    groupedAppTokens.every((token) => !parallelCall.includes(token)),
  appKeepsAuxPanelSiblingsUnchanged:
    app.includes('grooveBass: materialTrackPanelProps') &&
    app.includes('recordingTake: recordingRuntime.recordingTake') &&
    app.includes('burstDiagnostics: burstDiagnosticsPanelProps'),
  appParallelCallHasNoRuntimeTokens:
    parallelCall.length > 0 && findForbiddenFragments(parallelCall, forbiddenRuntimeTokens).length === 0,
  boundaryAcceptsCompactAndGroupedInput:
    boundary.includes('AppParallelEffectsAuxPanelCompactBoundaryInput') &&
    boundary.includes('AppParallelEffectsAuxPanelGroupedBoundaryInput') &&
    boundary.includes("if ('resonanceFxUiState' in input)") &&
    boundary.includes('expandCompactParallelEffectsInput') &&
    boundary.includes('normalizeParallelEffectsInput'),
  boundaryKeepsTypedGroupAssembly:
    [
      'collectiveMemory:',
      'sharedFormatters,',
      'psychedelicSpiral:',
      'enterHoldPsyFx:',
      'schwarm:',
      'runtimeMonitors:',
      'liveMastering,',
    ].every((token) => boundary.includes(token)) &&
    ['...collectiveMemory', '...sharedFormatters', '...psychedelicSpiral', '...enterHoldPsyFx', '...schwarm', '...runtimeMonitors', '...liveMastering'].every((token) => boundary.includes(token)),
  boundaryImportsOnlyTypesFromResonanceFxState:
    boundary.includes("import type { useResonanceFxUiState } from '../rooms/useResonanceFxUiState';") &&
    !boundary.includes("import { useResonanceFxUiState }"),
  boundaryHasNoRuntimeTokens:
    findForbiddenFragments(boundary, forbiddenRuntimeTokens).length === 0 &&
    !boundary.includes('useState(') &&
    !boundary.includes('useMemo(') &&
    !boundary.includes('useRef(') &&
    !boundary.includes('useEffect('),
  dependencyAuditAllowsTypeOnlyFxStateImport:
    depAudit.includes("allowedTypeImports: ['./appResonanceAuxPanelRuntimeArgs', '../rooms/useResonanceFxUiState']") &&
    depGuard.includes("parallelEffects: ['./appResonanceAuxPanelRuntimeArgs', '../rooms/useResonanceFxUiState']"),
  sourceNormalizerOwnsParallelEffectsBoundaryCall:
    sourceNormalizer.includes('normalizeParallelEffectsAuxPanelSource') &&
    sourceNormalizer.includes('buildAppParallelEffectsAuxPanelBoundary(input)'),
  noPassThroughBridgeOrIndexCreated:
    !ctx.exists('src/features/xensonar/layout/appParallelEffectsAuxPanelBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appParallelEffectsAuxPanelBoundaryIndex.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppParallelEffectsAuxPanelBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Parallel effects aux panel callsite cleanup') &&
    suite.includes('xensonar:check-app-parallel-effects-aux-panel-callsite-cleanup'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-parallel-effects-aux-panel-callsite-cleanup'),
  appLineCountShrankAgainst134: appLines <= 5500,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  callsiteCleanup: {
    role: 'collapse App.tsx-owned parallelEffects aux-panel group assembly into buildAppParallelEffectsAuxPanelBoundary',
    previousAppCallsiteShape: 'grouped-app-owned-input-montage',
    currentAppCallsiteShape: 'compact-boundary-owned-input-group-assembly',
    runtimeOwned: false,
    audioMutating: false,
    dspMutating: false,
    monitorRuntimeOwned: false,
  },
  explicitlyNotMoved: [
    'No effect-device ensure functions moved into the aux-panel boundary',
    'No audio node construction, graph connection, scheduling, DSP mutation, or monitor runtime ownership moved',
    'No Root-Follow, Worklet, Granular, Materialspur, Paketstation, Partikel, Wellenstarter, Drum/Bass, Room III, Recording, or visible UI behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
