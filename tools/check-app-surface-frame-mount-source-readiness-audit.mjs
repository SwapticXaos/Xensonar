#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const appPath = 'src/App.tsx';
const auditPath = 'validation/contracts/xensonar/layout/appSurfaceFrameMountSourceReadinessAudit.ts';
const surfaceBoundaryPath = 'src/features/xensonar/layout/useAppSurfaceFrameRuntimeBoundary.ts';
const surfaceBuilderPath = 'src/features/xensonar/layout/appSurfaceFrameMountSourceBuilder.ts';
const appMainContentPath = 'src/features/xensonar/layout/AppMainContent.tsx';
const appShellFramePath = 'src/features/xensonar/layout/AppShellFrame.tsx';
const monolithMapPath = 'src/features/xensonar/layout/appMonolithPartitionMap.ts';
const pkgPath = 'package.json';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';

const app = exists(appPath) ? read(appPath) : '';
const audit = exists(auditPath) ? read(auditPath) : '';
const surfaceBoundary = exists(surfaceBoundaryPath) ? read(surfaceBoundaryPath) : '';
const surfaceBuilder = exists(surfaceBuilderPath) ? read(surfaceBuilderPath) : '';
const appMainContent = exists(appMainContentPath) ? read(appMainContentPath) : '';
const appShellFrame = exists(appShellFramePath) ? read(appShellFramePath) : '';
const monolithMap = exists(monolithMapPath) ? read(monolithMapPath) : '';
const pkg = exists(pkgPath) ? JSON.parse(read(pkgPath)) : { version: '', scripts: {} };
const suite = exists(suitePath) ? read(suitePath) : '';
const suiteContract = exists(suiteContractPath) ? read(suiteContractPath) : '';

const appLines = app.split(/\r?\n/).length;
const auditLines = audit.split(/\r?\n/).length;

const groupNames = [
  'surfaceRoomGate',
  'resonanceScreenMountSource',
  'roomSceneMountSource',
  'performanceCrisisPanelMountSource',
  'surfaceFrameCallsite',
  'mainContentMountGates',
];

const appCallsiteStart = app.indexOf('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary({');
const appCallsiteEnd = appCallsiteStart >= 0 ? app.indexOf('});', appCallsiteStart) : -1;
const appCallsiteBlock = appCallsiteStart >= 0 && appCallsiteEnd > appCallsiteStart
  ? app.slice(appCallsiteStart, appCallsiteEnd + 3)
  : '';

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
  'startRecording(',
  'stopRecording(',
  'downloadRecordingWav(',
  'downloadRecordingCropWav(',
  'scheduleBassClipStep(',
  'scheduleClassicBassPatternStep(',
  'scheduleExportedDrumConfigStep(',
  'runParticleNexusToneOrchestrator(',
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'startQuantizedCollisionRuntime(',
  'updateRoom3NodeDeviceAudioFrame(',
  'updatePsychedelicSpiralDevice(',
  'updateLiveMasteringSystem(',
  'advanceMyzelSynthRoom3Runtime(',
  'renderMyzelSynthRoom3RuntimeCanvas(',
  'localStorage.',
  '.current =',
  '.current=',
];

const groupCoverage = Object.fromEntries(groupNames.map((group) => {
  const start = audit.indexOf(`  ${group}: {\n    key: '${group}',`);
  const laterStarts = groupNames
    .filter((other) => other !== group)
    .map((other) => audit.indexOf(`  ${other}: {\n    key: '${other}',`, start + 1))
    .filter((idx) => idx > start);
  const end = laterStarts.length ? Math.min(...laterStarts) : audit.indexOf('} as const satisfies Record', start);
  const block = start >= 0 ? audit.slice(start, end > start ? end : undefined) : '';
  return [group, {
    declared: start >= 0,
    hasNonOwnershipFlags: [
      'sourceOwnerStillApp: true',
      'readinessOnly: true',
      'mayExtractBeforeDedicatedBuilder: false',
      "candidateBuilderName: 'buildAppSurfaceFrameMountSource'",
      'ownsRuntime: false',
      'ownsAudio: false',
      'ownsScheduling: false',
      'ownsRoomLifecycle: false',
      'ownsPackagePersistence: false',
      'ownsViewportSelection: false',
      'ownsResonancePanelGate: false',
      'visibleUiChangedByAudit: false',
    ].every((needle) => block.includes(needle)),
    hasExtractionWarning: block.includes('extractionWarning:'),
  }];
}));

const checks = {
  expectedFilesExist: [
    appPath,
    auditPath,
    surfaceBoundaryPath,
    surfaceBuilderPath,
    appMainContentPath,
    appShellFramePath,
    monolithMapPath,
    pkgPath,
    suitePath,
    suiteContractPath,
  ].every(exists),
  packageVersionAtLeast163: /^3\.2\.91\.6\.9\.(16[3-9]|1[7-9][0-9]|[2-9][0-9]{2,})$/.test(pkg.version),
  packageScriptExists:
    pkg.scripts?.['xensonar:check-app-surface-frame-mount-source-readiness-audit'] ===
    'node tools/check-app-surface-frame-mount-source-readiness-audit.mjs',
  auditDeclaresReadinessKeys:
    audit.includes('APP_SURFACE_FRAME_MOUNT_SOURCE_READINESS_KEYS') &&
    groupNames.every((group) => audit.includes(`'${group}'`)),
  auditDeclaresInputMapAndProbe:
    audit.includes('AppSurfaceFrameMountSourceReadinessInputMap') &&
    audit.includes('APP_SURFACE_FRAME_MOUNT_SOURCE_READINESS_AUDIT') &&
    audit.includes('APP_SURFACE_FRAME_MOUNT_SOURCE_READINESS_SUMMARY') &&
    audit.includes('APP_SURFACE_FRAME_MOUNT_SOURCE_READINESS_PROBE'),
  auditGroupsHaveNonOwnershipFlags:
    Object.values(groupCoverage).every((coverage) => coverage.declared && coverage.hasNonOwnershipFlags && coverage.hasExtractionWarning),
  auditNamesSurfaceInputsAndPreparedByChains:
    [
      'room',
      'resonanceScreenRuntime',
      'appRoomScenes',
      'performanceCrisisPanelProps',
      'useAppResonanceScreenRuntimeAssembly',
      'buildAppRoomSceneRuntimeSource',
      'useAppRoomSceneRuntimeBoundary',
      'useAppResonancePanelPropsBoundary',
    ].every((needle) => audit.includes(needle)),
  auditExplicitlyKeepsMountGatesOutOfBuilder:
    audit.includes('shouldRenderResonancePanels') &&
    audit.includes('COMMONS direct mount') &&
    audit.includes('L3LAB / Materialschmiede lazy keepalive mount') &&
    audit.includes('AppRoomViewport room selection'),
  appFinalSurfaceCallsiteStillOwnedByApp:
    (
      appCallsiteBlock.includes('useAppSurfaceFrameRuntimeBoundary({') &&
      appCallsiteBlock.includes('room,') &&
      appCallsiteBlock.includes('resonanceScreen: resonanceScreenRuntime,') &&
      appCallsiteBlock.includes('roomScenes: appRoomScenes,') &&
      appCallsiteBlock.includes('performanceCrisisPanelProps,')
    ) || (
      app.includes('const appSurfaceFrameMountSource = buildAppSurfaceFrameMountSource({') &&
      app.includes('const appShellFrameProps = useAppSurfaceFrameRuntimeBoundary(appSurfaceFrameMountSource);')
    ),
  appSurfaceSourceBuilderIsThinWhenPresent:
    !exists(surfaceBuilderPath) || (
      surfaceBuilder.includes('export function buildAppSurfaceFrameMountSource({') &&
      surfaceBuilder.includes('...roomGate') &&
      surfaceBuilder.includes('...resonanceScreenMount') &&
      surfaceBuilder.includes('...roomSceneMount') &&
      surfaceBuilder.includes('...performanceCrisisPanelMount') &&
      forbiddenRuntimeTokens.every((needle) => !surfaceBuilder.includes(needle))
    ),
  surfaceBoundaryStillOnlyComposesPreparedSurfaceInputs:
    surfaceBoundary.includes('export function useAppSurfaceFrameRuntimeBoundary') &&
    surfaceBoundary.includes('buildAppSurfaceFrameRuntimeEntry({') &&
    surfaceBoundary.includes('...resonanceScreen,') &&
    surfaceBoundary.includes('room,') &&
    surfaceBoundary.includes('...roomScenes,') &&
    surfaceBoundary.includes('performanceCrisisPanelProps,') &&
    !surfaceBoundary.includes('shouldRenderResonancePanels') &&
    !surfaceBoundary.includes('AppRoomViewport'),
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
  auditDoesNotMoveRuntimeOrScheduling: forbiddenRuntimeTokens.every((needle) => !audit.includes(needle)),
  monolithMapUpdatedForSurfaceReadiness:
    (monolithMap.includes("status: 'source-readiness-audited'") || monolithMap.includes("status: 'source-builder-probed'")) &&
    (monolithMap.includes("strongestNextCandidate: 'roomScreenSurfaceMount'") || monolithMap.includes("strongestNextCandidate: 'globalInputAndMetronome'")) &&
    (monolithMap.includes("firstSafeMove: 'surface-frame-mount-source-builder-probe'") || monolithMap.includes("firstSafeMove: 'global-input-and-metronome-source-readiness-audit'")) &&
    monolithMap.includes('surface mount source builder that moves AppMainContent mount gates or room lifecycle'),
  guardListedInSanitySuiteContract:
    suiteContract.includes('xensonar:check-app-surface-frame-mount-source-readiness-audit'),
  guardListedInRefactorSuiteRunner:
    suite.includes('Surface frame mount source readiness audit') &&
    suite.includes('xensonar:check-app-surface-frame-mount-source-readiness-audit'),
  appLineCountUnaffectedBySurfaceReadinessAudit: appLines <= 5520,
};

const failures = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

const report = {
  ok: failures.length === 0,
  patch: '3.2.91.6.9.163_app_surface_frame_mount_source_readiness_audit',
  appLines,
  auditLines,
  groupCoverage,
  analysis: {
    viableNextMove: exists(surfaceBuilderPath) ? 'surface frame mount source builder probe complete' : 'buildAppSurfaceFrameMountSource as a thin source builder only',
    notYetAllowed: [
      'moving AppMainContent mount gates',
      'moving shouldRenderResonancePanels',
      'moving COMMONS or L3LAB keepalive rendering',
      'owning room lifecycle or room navigation',
      'owning Room III, resonance screen, or performance-crisis behavior',
    ],
  },
  checks,
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
