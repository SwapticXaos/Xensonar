#!/usr/bin/env node
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const appPath = 'src/App.tsx';
const propsBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const resonanceControlBoundaryPath = 'src/features/xensonar/rooms/buildAppResonanceControlPanelBoundary.ts';
const shapeIndexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const app = ctx.read(appPath);
const propsBoundary = ctx.read(propsBoundaryPath);
const resonanceControlBoundary = ctx.read(resonanceControlBoundaryPath);
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

function extractObjectPropertyBlock(source, propertyName, nextPropertyName) {
  const start = source.indexOf(`${propertyName}:`);
  if (start < 0) return '';
  const end = nextPropertyName ? source.indexOf(`${nextPropertyName}:`, start + propertyName.length) : -1;
  return source.slice(start, end > start ? end : undefined);
}

const propsCall = extractCallExpression(app, '} = useAppResonancePanelPropsBoundary');
const resonanceControlBlock = extractObjectPropertyBlock(propsCall, 'resonanceControl', 'particleSystem');

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  'new AudioContext(',
  '.connect(',
  '.disconnect(',
  '.start(',
  '.stop(',
  'requestAnimationFrame(',
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
  'localStorage.',
];

const checks = {
  packageVersionAtLeast159: /^3\.2\.91\.6\.9\.(?:159|1[6-9]\d|[2-9]\d{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-resonance-control-panel-source-normalization'] ===
    'node tools/check-app-resonance-control-panel-source-normalization.mjs',
  appUsesSinglePanelPropsBoundaryCall:
    (app.match(/useAppResonancePanelPropsBoundary\(/g) || []).length === 1 && propsCall.length > 0,
  appNoLongerImportsOrCallsResonanceControlSubBoundaryBuilder:
    !app.includes('buildAppResonanceControlPanelBoundary') &&
    !propsCall.includes('buildAppResonanceControlPanelBoundary({'),
  appPassesResonanceControlAsVisibleRiskGroupedSource:
    resonanceControlBlock.includes('resonanceControl: {') &&
    resonanceControlBlock.includes('state: { nParamsUI, droneVolume, transientDriveUi, quantizeGrid, gridTempoBpm, quantizeStepMs, myzelEnabled, myzelStep16ths, installationFieldConfig }') &&
    resonanceControlBlock.includes('gridAndTuning: { updateNParams, setChurchMode, changeGridTuning, setGridMode, getTuningSteps, commitResonanceCursorY, setQuantizeGrid, setGridTempoBpm: setGridTempoBpmWithTrafficReset }') &&
    resonanceControlBlock.includes('trafficRefs: { nexusRefs, quantizeAnchorRef, waveCollisionQueueRef, particleQuantizeSeenRef, particleQuantizeTimerRef }') &&
    resonanceControlBlock.includes('toneActions: { setDroneVolume, applyRealtimeDroneOvertones, updateTransientDriveSource }') &&
    resonanceControlBlock.includes('myzelInstallation: { toggleMyzelEnabled, setMyzelStep16ths, toggleInstallResidents, setInstallResidentVolumeLevel, setInstallResidentSystemValue, setInstallResidentModeValue, openInstallationTopologyRoom }'),
  appResonanceControlSourceBlockHasNoRuntimeOrPersistenceTokens:
    findForbiddenFragments(resonanceControlBlock, forbiddenRuntimeTokens).length === 0,
  propsBoundaryDeclaresAndNormalizesResonanceControlSource:
    propsBoundary.includes('AppResonancePanelPropsResonanceControlInput') &&
    propsBoundary.includes('AppResonanceControlPanelBoundaryArgs') &&
    propsBoundary.includes('normalizeResonanceControlPanelInput(resonanceControl)') &&
    propsBoundary.includes('buildAppResonanceControlPanelBoundary(input)') &&
    propsBoundary.includes('buildResonanceControlProps('),
  propsBoundaryStillKeepsResonanceControlRiskGroupsVisibleInMetadata:
    propsBoundary.includes("canCollapseResonanceControlLast: 'completed-as-source-normalization-with-grid-quantize-traffic-and-myzel-groups-still-visible'") &&
    propsBoundary.includes("resonanceControlSourceNormalizationCompletedIn: '3.2.91.6.9.159'") &&
    propsBoundary.includes('appKeepsGridQuantizeTrafficOwnership: true'),
  resonanceControlSubBoundaryStillOnlyFlattensGroups:
    resonanceControlBoundary.includes('export function buildAppResonanceControlPanelBoundary') &&
    resonanceControlBoundary.includes('...state') &&
    resonanceControlBoundary.includes('...gridAndTuning') &&
    resonanceControlBoundary.includes('...trafficRefs') &&
    resonanceControlBoundary.includes('...toneActions') &&
    resonanceControlBoundary.includes('...myzelInstallation') &&
    findForbiddenFragments(resonanceControlBoundary, forbiddenRuntimeTokens).length === 0,
  panelBoundaryShapeStillMarksResonanceControlRiskGroups:
    shapeIndex.includes("resonanceControl: {") &&
    shapeIndex.includes("builder: 'buildAppResonanceControlPanelBoundary'") &&
    shapeIndex.includes("'gridAndTuning'") &&
    shapeIndex.includes("'trafficRefs'") &&
    shapeIndex.includes("'toneActions'") &&
    shapeIndex.includes("'myzelInstallation'"),
  noNewPanelBridgeIntroduced:
    !ctx.exists('src/features/xensonar/layout/appResonancePanelSourceBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/useAppResonancePanelSourceBridge.ts') &&
    !ctx.exists('src/features/xensonar/layout/appResonanceControlSourceBridge.ts'),
  sanitySuiteIncludesGuard:
    suite.includes('Resonance control panel source normalization') &&
    suite.includes('xensonar:check-app-resonance-control-panel-source-normalization'),
  sanitySuiteContractIncludesGuard:
    suiteContract.includes('xensonar:check-app-resonance-control-panel-source-normalization'),
  appLineCountWithinExpectedRange: appLines <= 5495,
};

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  appLines,
  normalizedPanelSource: 'resonanceControl',
  preservedVisibleRiskGroups: [
    'state',
    'gridAndTuning',
    'trafficRefs',
    'toneActions',
    'myzelInstallation',
  ],
  movedScope: [
    'Moved the final resonance-control sub-boundary builder call out of App.tsx and into the existing panel-props boundary normalization layer.',
    'Kept all resonance-control risk groups visible at the App.tsx source callsite.',
    'Completed the current panel-source normalization arc without adding a new pass-through panel bridge.',
  ],
  explicitlyNotMoved: [
    'Grid/tuning action bodies',
    'Quantize/traffic refs ownership',
    'Tone actions and real-time drone/overtone behavior',
    'Myzel installation action bodies',
    'Root-Follow, Materialspur, Wellenstarter, Partikel runtime, Drum/Bass, Package, Room III, scheduling, or audio-node behavior',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
