#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const app = read('src/App.tsx');
const indexPath = 'validation/contracts/xensonar/layout/appResonancePanelBoundaryIndex.ts';
const index = exists(indexPath) ? read(indexPath) : '';
const appLines = app.split(/\r?\n/).length;

const directAppBoundaryImports = [
  './features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary',
  './features/xensonar/groove/buildAppMaterialTrackPanelBoundary',
  './features/xensonar/performanceCrisis/buildAppPerformanceCrisisPanelBoundary',
  './features/xensonar/rooms/buildAppParticleSystemPanelBoundary',
  './features/xensonar/rooms/buildAppResonanceControlPanelBoundary',
];

const exportedBuilders = [
  'buildAppBurstDiagnosticsPanelBoundary',
  'buildAppMaterialTrackPanelBoundary',
  'buildAppPerformanceCrisisPanelBoundary',
  'buildAppParticleSystemPanelBoundary',
  'buildAppResonanceControlPanelBoundary',
];

const manifestKeys = [
  'performanceCrisis',
  'burstDiagnostics',
  'materialTrack',
  'resonanceControl',
  'particleSystem',
];

const forbiddenRuntimeMoves = [
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
];

const checks = {
  boundaryIndexExists: exists(indexPath),
  appImportsBoundaryIndex: app.includes('./features/xensonar/layout/appResonancePanelBoundaryIndex'),
  appNoLongerImportsSubBoundariesDirectly: directAppBoundaryImports.every((needle) => !app.includes(needle)),
  boundaryIndexReExportsAllSubBoundaries: [
    "../diagnostics/buildAppBurstDiagnosticsPanelBoundary",
    "../groove/buildAppMaterialTrackPanelBoundary",
    "../performanceCrisis/buildAppPerformanceCrisisPanelBoundary",
    "../rooms/buildAppParticleSystemPanelBoundary",
    "../rooms/buildAppResonanceControlPanelBoundary",
  ].every((needle) => index.includes(needle)) && exportedBuilders.every((needle) => index.includes(needle)),
  boundaryIndexDeclaresStableKeyList: [
    'APP_RESONANCE_PANEL_BOUNDARY_KEYS',
    'AppResonancePanelBoundaryKey',
    'AppResonancePanelBoundaryManifestEntry',
    'APP_RESONANCE_PANEL_BOUNDARY_MANIFEST',
  ].every((needle) => index.includes(needle)) && manifestKeys.every((needle) => index.includes(`'${needle}'`) || index.includes(`${needle}:`)),
  boundaryIndexMarksSubBoundariesAsNonRuntimeNonAudioMutating:
    manifestKeys.every((key) => index.includes(`${key}: {`)) &&
    (index.match(/runtimeOwned: false/g) || []).length >= manifestKeys.length &&
    (index.match(/audioMutating: false/g) || []).length >= manifestKeys.length,
  boundaryIndexDoesNotMoveAudioOrSchedulingRuntime: forbiddenRuntimeMoves.every((needle) => !index.includes(needle)),
  appStillUsesAllSubBoundaryBuildersInsidePanelProps: [
    'materialTrack: buildAppMaterialTrackPanelBoundary({',
    'burstDiagnostics: buildAppBurstDiagnosticsPanelBoundary({',
    'performanceCrisis: buildAppPerformanceCrisisPanelBoundary({',
    'resonanceControl: buildAppResonanceControlPanelBoundary({',
    'particleSystem: buildAppParticleSystemPanelBoundary({',
  ].every((needle) => app.includes(needle)),
  appStillKeepsPanelPropsBoundaryOwnership: app.includes('} = useAppResonancePanelPropsBoundary({'),
  appLineCountWithinIndexCleanupRange: appLines <= 5530,
};

const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
const report = {
  ok: failures.length === 0,
  appLines,
  movedScope: [
    'Central App resonance panel sub-boundary import/index seam',
    'A manifest naming the existing Performance Crisis, Burst Diagnostics, Material Track, Resonance Control, and Particle System sub-boundaries',
    'Direct App.tsx sub-boundary imports replaced by one layout-level boundary index import',
  ],
  explicitlyNotMoved: [
    'No panel input shape was changed',
    'No runtime or audio behavior was moved into the index',
    'No Root-Follow, Materialspur, Partikel, Wellenstarter, Drum/Bass, Worklet, Paketstation, or Room III behavior changed',
  ],
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
