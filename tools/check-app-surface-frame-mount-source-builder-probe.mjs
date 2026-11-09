#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const builderPath = 'src/features/xensonar/layout/appSurfaceFrameMountSourceBuilder.ts';
const auditPath = 'validation/contracts/xensonar/layout/appSurfaceFrameMountSourceReadinessAudit.ts';
const boundaryPath = 'src/features/xensonar/layout/useAppSurfaceFrameRuntimeBoundary.ts';
const appMainContentPath = 'src/features/xensonar/layout/AppMainContent.tsx';
const appShellFramePath = 'src/features/xensonar/layout/AppShellFrame.tsx';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const builder = exists(builderPath) ? read(builderPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const boundary = exists(boundaryPath) ? read(boundaryPath) : '';
const appMainContent = exists(appMainContentPath) ? read(appMainContentPath) : '';
const appShellFrame = exists(appShellFramePath) ? read(appShellFramePath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const builderLines = builder.split(/\r?\n/).length;

const sourceStart = app.indexOf('const appSurfaceFrameMountSource = buildAppSurfaceFrameMountSource({');
const callsiteStart = app.indexOf('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource);', sourceStart);
const sourceBlock = sourceStart >= 0 && callsiteStart > sourceStart ? app.slice(sourceStart, callsiteStart) : '';

const forbiddenRuntimeTokens = [
  'createOscillator(',
  'createGain(',
  '.connect(',
  '.start(',
  'safeApplyAttack(',
  'safeApplyExponentialRelease(',
  'requestAnimationFrame(',
  'setInterval(',
  'setTimeout(',
  'new AudioContext(',
  'ensureAudioReady(',
  'prewarmAudioRuntime(',
  'resetResonanceTransientState(',
  'shouldRenderResonancePanels(',
  '<AppRoomViewport',
  '<AppMainContent',
  'Level3LabRoomLazy',
  'data-package-station-keepalive',
  'localStorage.',
  '.current =',
  '.current=',
];

const builderRequiredMarkers = [
  'BuildAppSurfaceFrameMountSourceInput',
  'AppSurfaceFrameRoomGateSourceArgs',
  'AppSurfaceFrameResonanceScreenMountSourceArgs',
  'AppSurfaceFrameRoomSceneMountSourceArgs',
  'AppSurfaceFramePerformanceCrisisPanelMountSourceArgs',
  'APP_SURFACE_FRAME_MOUNT_SOURCE_BUILDER_PROBE',
  'export function buildAppSurfaceFrameMountSource({',
  'roomGate,',
  'resonanceScreenMount,',
  'roomSceneMount,',
  'performanceCrisisPanelMount,',
  '...roomGate',
  '...resonanceScreenMount',
  '...roomSceneMount',
  '...performanceCrisisPanelMount',
  'satisfies UseAppSurfaceFrameRuntimeBoundaryArgs',
];

const sourceGroupNeedles = [
  'roomGate: { room }',
  'resonanceScreenMount: { resonanceScreen: resonanceScreenRuntime }',
  'roomSceneMount: { roomScenes: appRoomScenes }',
  'performanceCrisisPanelMount: { performanceCrisisPanelProps }',
];

const checks = {
  expectedFilesExist: [
    appPath,
    builderPath,
    auditPath,
    boundaryPath,
    appMainContentPath,
    appShellFramePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast164: /^3\.2\.91\.6\.9\.(16[4-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(String(pkg.version || '')),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-surface-frame-mount-source-builder-probe'] ===
    'node tools/check-app-surface-frame-mount-source-builder-probe.mjs',
  appUsesSurfaceFrameMountSourceBuilder:
    app.includes('import { buildAppSurfaceFrameMountSource } from "./features/xensonar/layout/appSurfaceFrameMountSourceBuilder";') &&
    sourceStart >= 0 &&
    callsiteStart > sourceStart &&
    sourceGroupNeedles.every((needle) => sourceBlock.includes(needle)) &&
    app.includes('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource);'),
  appNoLongerUsesInlineSurfaceBoundaryObject:
    !app.includes('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary({') &&
    (app.match(/useAppSurfaceFrameRuntimeBoundary\(/g) || []).length === 1,
  builderDeclaresOnlySurfaceSourceGroupsAndFlattening:
    builderRequiredMarkers.every((needle) => builder.includes(needle)),
  builderImportsOnlyTypeContract:
    builder.includes("import type { UseAppSurfaceFrameRuntimeBoundaryArgs } from './useAppSurfaceFrameRuntimeBoundary';") &&
    !builder.includes('React') &&
    !builder.includes('useMemo') &&
    !builder.includes('import {'),
  builderDoesNotExecuteRuntimeOrMoveMountGates:
    forbiddenRuntimeTokens.every((needle) => !builder.includes(needle)),
  readinessAuditAcknowledgesBuilderProbe:
    audit.includes('APP_SURFACE_FRAME_MOUNT_SOURCE_READINESS_SUMMARY') &&
    audit.includes("dedicatedSurfaceFrameMountSourceBuilderIntroduced: true") &&
    audit.includes("sourceBuilderProbeIntroducedIn: '3.2.91.6.9.164'") &&
    audit.includes('useAppSurfaceFrameRuntimeBoundary final composition callsite now receives appSurfaceFrameMountSource'),
  boundaryStillOnlyComposesPreparedSurfaceInputs:
    boundary.includes('export function useAppSurfaceFrameRuntimeBoundary') &&
    boundary.includes('buildAppSurfaceFrameRuntimeEntry({') &&
    boundary.includes('...resonanceScreen,') &&
    boundary.includes('room,') &&
    boundary.includes('...roomScenes,') &&
    boundary.includes('performanceCrisisPanelProps,') &&
    !boundary.includes('shouldRenderResonancePanels') &&
    !boundary.includes('AppRoomViewport'),
  mainContentStillOwnsViewportAndMountGates:
    appMainContent.includes('<AppRoomViewport') &&
    appMainContent.includes('shouldRenderResonancePanels(props.room)') &&
    appMainContent.includes("props.room === 'COMMONS'") &&
    appMainContent.includes('Level3LabRoomLazy') &&
    appMainContent.includes('data-package-station-keepalive'),
  shellFrameStillOnlyFramesHeaderAndMainContent:
    appShellFrame.includes('<AppHeader {...props.appHeaderProps} />') &&
    appShellFrame.includes('<AppMainContent {...props.mainContentProps} />') &&
    !appShellFrame.includes('shouldRenderResonancePanels') &&
    !appShellFrame.includes('AppRoomViewport'),
  monolithMapAcknowledgesSurfaceBuilderProbe:
    monolithMap.includes("key: 'roomScreenSurfaceMount'") &&
    monolithMap.includes("status: 'source-builder-probed'") &&
    monolithMap.includes('buildAppSurfaceFrameMountSource plus useAppSurfaceFrameRuntimeBoundary') &&
    monolithMap.includes('no room lifecycle or viewport mount extraction') &&
    monolithMap.includes("strongestNextCandidate: 'globalInputAndMetronome'") &&
    (monolithMap.includes("firstSafeMove: 'global-input-and-metronome-source-readiness-audit'") ||
      monolithMap.includes("firstSafeMove: 'global-input-and-metronome-source-builder-probe'")),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-surface-frame-mount-source-builder-probe'),
  guardListedInRefactorSuiteRunner:
    suite.includes('Surface frame mount source builder probe') &&
    suite.includes('xensonar:check-app-surface-frame-mount-source-builder-probe'),
  appLineCountEnvelope: appLines <= 5525 && builderLines <= 120,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.164_app_surface_frame_mount_source_builder_probe',
  appLines,
  builderLines,
  role: 'Surface frame source builder probe only; no AppMainContent mount gate, AppRoomViewport, room lifecycle, audio, scheduling, or package behavior moved',
  sourceGroups: sourceGroupNeedles,
  checks,
  failures,
};

if (failures.length) {
  console.error('[check-app-surface-frame-mount-source-builder-probe] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[check-app-surface-frame-mount-source-builder-probe] ok');
console.log(JSON.stringify(report, null, 2));
