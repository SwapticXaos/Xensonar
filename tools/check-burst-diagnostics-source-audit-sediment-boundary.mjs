#!/usr/bin/env node
import fs from 'node:fs';
import { XENSONAR_ARCHITECTURE_LINE } from './xensonar-project-line.mjs';
import {
  APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT,
  APP_BURST_DIAGNOSTICS_PANEL_CALLSITE_CLEANUP_PROBE,
} from './burst-diagnostics-boundary-audit-contract.mjs';
import {
  boolChecksToFailures,
  createGuardContext,
  findForbiddenFragments,
} from './xensonar-refactor-guard-utils.mjs';

const ctx = createGuardContext();
const boundaryPath = 'src/features/xensonar/diagnostics/buildAppBurstDiagnosticsPanelBoundary.ts';
const oldRoleAuditPath = 'src/features/xensonar/diagnostics/burstDiagnosticsMeasurementRoleAudit.ts';
const toolContractPath = 'tools/burst-diagnostics-boundary-audit-contract.mjs';
const runtimePath = 'src/features/xensonar/diagnostics/burstDiagnosticsRuntime.ts';
const panelPath = 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx';
const propsBoundaryPath = 'src/features/xensonar/layout/useAppResonancePanelPropsBoundary.ts';
const suitePath = 'tools/run-xensonar-refactor-sanity-suite.mjs';
const gateManifestPath = 'tools/current-line-gate-manifest.mjs';
const suiteContractPath = 'tools/check-xensonar-refactor-sanity-suite-contract.mjs';
const pkgPath = 'package.json';

const boundary = ctx.read(boundaryPath);
const toolContract = ctx.read(toolContractPath);
const runtime = ctx.read(runtimePath);
const panel = ctx.read(panelPath);
const propsBoundary = ctx.read(propsBoundaryPath);
const suite = ctx.read(suitePath);
const gateManifest = ctx.read(gateManifestPath);
const suiteContract = ctx.read(suiteContractPath);
const pkg = ctx.readJson(pkgPath);

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
  'playWaveStartSound(',
  'emitWaveStartSound(',
  'playParticleNoiseAccentWithLifecycle(',
  'saveWorkspacePackage',
  'loadWorkspacePackage',
  'downloadRecordingWav(',
];

const boundaryForbiddenMetaTokens = [
  'APP_BURST_DIAGNOSTICS_PANEL_CALLSITE_CLEANUP_PROBE',
  'APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT',
  'builderInvocationMovedIntoPropsBoundaryIn158',
  'sourceAuditSedimentExtractedIn',
  'primaryComparisonMeterMovedTo',
  'notPrimaryBurstProofBecause',
  'recommendedNextAction',
  'forbiddenCollapseScope',
];

const checks = {
  packageVersionMatchesArchitectureLine:
    String(pkg.version || '') === XENSONAR_ARCHITECTURE_LINE,
  packageScriptExists:
    pkg.scripts?.['xensonar:check-burst-diagnostics-source-audit-sediment-boundary'] ===
    'node tools/check-burst-diagnostics-source-audit-sediment-boundary.mjs',
  boundaryStillExportsOnlyPanelArgsAndBuilder:
    boundary.includes('export type AudioBurstExportContext') &&
    boundary.includes('export type AudioBurstRuntimePanelActions') &&
    boundary.includes('export type AppRootFollowRecoveryActionsBoundary') &&
    boundary.includes('export type AppBurstDiagnosticsPanelBoundaryArgs') &&
    boundary.includes('export function buildAppBurstDiagnosticsPanelBoundary') &&
    boundary.includes('onStartAudioBurstRecorder: audioBurstRuntime.start') &&
    boundary.includes('onStopAudioBurstRecorder: audioBurstRuntime.stop') &&
    boundary.includes('onClearAudioBurstRecorder: audioBurstRuntime.clear') &&
    boundary.includes('onExportAudioBurstRecorder: () => audioBurstRuntime.exportLog(exportContext)') &&
    boundary.includes('...rootFollowRecoveryActions'),
  boundaryContainsNoAuditSediment:
    boundaryForbiddenMetaTokens.every((token) => !boundary.includes(token)),
  oldSrcRoleAuditFileRemoved:
    !fs.existsSync(oldRoleAuditPath),
  toolingContractOwnsAuditSediment:
    toolContract.includes('APP_BURST_DIAGNOSTICS_PANEL_CALLSITE_CLEANUP_PROBE') &&
    toolContract.includes('APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT') &&
    toolContract.includes("sourceAuditSedimentExtractedIn: '3.2.91.7.5.137'") &&
    toolContract.includes('workletThroughputCountersWhenPresent') &&
    toolContract.includes('manual-backspace-marker-aligns-user-heard-crackle-with-runtime-snapshots') &&
    toolContract.includes('keep-operational-source-visible-and-do-not-hide-recovery-actions'),
  toolingContractHasMachineReadableRoleShape:
    APP_BURST_DIAGNOSTICS_PANEL_CALLSITE_CLEANUP_PROBE.runtimeOwned === false &&
    APP_BURST_DIAGNOSTICS_PANEL_CALLSITE_CLEANUP_PROBE.audioMutating === false &&
    APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT.currentRole === 'operational-recorder-and-recovery-panel' &&
    APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT.refactorDecision === 'retain-with-boundary-owned-panel-callback-mapping' &&
    APP_BURST_DIAGNICS_AUDIT_SAFE(),
  boundaryHasNoAudioOrSchedulingMutation:
    findForbiddenFragments(boundary, forbiddenRuntimeTokens).length === 0,
  runtimeStillOwnsRecorderMarkerExport:
    runtime.includes('recordAudioBurstMarkerRuntime') &&
    runtime.includes("marker: 'backspace'") &&
    runtime.includes('downloadAudioBurstRecorderLog') &&
    runtime.includes('appendAudioBurstSnapshotRuntime') &&
    runtime.includes('snapshotAudioTrafficForensics'),
  panelStillExposesRecorderAndRecovery:
    panel.includes('Aufzeichnung starten') &&
    panel.includes('Log herunterladen') &&
    panel.includes('Paartherapeut / Paket-Aktivierung') &&
    panel.includes('Paket-Root-Follow neu aktivieren') &&
    panel.includes('Browser-Auswahl löschen'),
  propsBoundaryStillBuildsBurstDiagnosticsPanelProps:
    propsBoundary.includes('buildAppBurstDiagnosticsPanelBoundary(input)') &&
    propsBoundary.includes("canCollapseBurstDiagnosticsAfterMaterialTrack: 'normalization-completed-operational-recorder-source-stays-explicit'") &&
    propsBoundary.includes("burstDiagnosticsSourceNormalizationCompletedIn: '3.2.91.6.9.158'"),
  suiteIncludesCurrentGate:
    suite.includes('CURRENT_LINE_GATE_SCRIPTS') &&
    gateManifest.includes('Burst diagnostics source audit sediment boundary') &&
    gateManifest.includes('xensonar:check-burst-diagnostics-source-audit-sediment-boundary'),
  suiteContractIncludesCurrentGate:
    suiteContract.includes('xensonar:check-burst-diagnostics-source-audit-sediment-boundary'),
};

function APP_BURST_DIAGNICS_AUDIT_SAFE() {
  return APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT.audioMutating === false &&
    APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT.schedulingOwned === false &&
    APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT.packagePersistenceOwned === false &&
    APP_BURST_DIAGNOSTICS_MEASUREMENT_ROLE_AUDIT.rootFollowRecoveryOwned === false;
}

const failures = boolChecksToFailures(checks);
const report = {
  ok: failures.length === 0,
  reportKind: 'xensonar-burst-diagnostics-source-audit-sediment-boundary',
  version: '3.2.91.7.5.138',
  conclusion: failures.length === 0
    ? 'Burst diagnostics source is cleanly limited to panel boundary arguments and callback mapping; audit/changelog sediment lives in tools instead of runtime-adjacent src.'
    : 'Burst diagnostics source/tools boundary still contains drift.',
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
