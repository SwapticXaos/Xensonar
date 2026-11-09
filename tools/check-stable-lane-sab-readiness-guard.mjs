import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readinessPath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowSharedArrayBufferReadiness.ts');
const bridgePath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts');
const trafficPath = path.join(root, 'src/features/xensonar/audioTraffic/audioTrafficForensics.ts');
const perfPanelPath = path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const burstPanelPath = path.join(root, 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx');

const readiness = fs.readFileSync(readinessPath, 'utf8');
const bridge = fs.readFileSync(bridgePath, 'utf8');
const traffic = fs.readFileSync(trafficPath, 'utf8');
const perfPanel = fs.readFileSync(perfPanelPath, 'utf8');
const burstPanel = fs.readFileSync(burstPanelPath, 'utf8');

const requiredReadinessMarkers = [
  "export type StableLaneSabTransportReadiness = 'available' | 'blocked' | 'unknown'",
  'STABLE_LANE_SAB_REQUIRED_COOP',
  'STABLE_LANE_SAB_REQUIRED_COEP',
  'detectStableLaneSabTransportReadiness',
  "typeof (globalThis as Record<string, unknown>).SharedArrayBuffer === 'function'",
  "readGlobalBoolean('crossOriginIsolated')",
  "readGlobalBoolean('isSecureContext')",
  "reason = 'cross-origin-isolation-missing'",
  'stableLaneSabTransportSingleFileHtmlLikelyBlocked',
  'withStableLaneSabTransportReadiness',
];

const requiredBridgeMarkers = [
  "from './rootFollowSharedArrayBufferReadiness'",
  'stableLaneSabTransportReadiness: StableLaneSabTransportReadiness',
  'stableLaneSabTransportReady: boolean',
  'stableLaneSabTransportReadinessReason: StableLaneSabTransportReadinessReason',
  'stableLaneSabTransportSharedArrayBufferAvailable: boolean',
  'stableLaneSabTransportCrossOriginIsolated: boolean',
  'stableLaneSabTransportSecureContext: boolean',
  'stableLaneSabTransportSingleFileHtmlLikelyBlocked: boolean',
  'const sabReadiness = detectStableLaneSabTransportReadiness()',
  'const nextSnapshot = withStableLaneSabTransportReadiness(snapshot)',
  'stableLaneSabTransportReadiness: snapshot.stableLaneSabTransportReadiness',
];

const requiredTrafficMarkers = [
  'workletStableLaneSabTransportReadiness',
  'workletStableLaneSabTransportReady',
  'workletStableLaneSabTransportReadinessReason',
  "readNestedString(throughputRecord, ['stableLaneSabTransportReadiness'])",
  "readNestedBoolean(debugWorklet, ['stableLaneSabTransportCrossOriginIsolated'])",
];

const requiredUiMarkers = [
  'label="SAB-Readiness"',
  'detectStableLaneSabTransportReadiness',
  'liveSabReadiness',
  'data-root-follow-live-sab-readiness',
  'runtime-probe-pending',
  '__XENSONAR_STABLE_LANE_SAB_READINESS__',
  'WindowWithXensonarStableLaneSabReadiness',
];

const forbiddenMarkers = [
  'preferredBackendKind: \'sab-ringbuffer\'',
  "STABLE_LANE_PLAN_TRANSPORT_ACTIVE_BACKEND_KIND: StableLanePlanTransportBackendKind = 'sab-ringbuffer'",
];

const missing = [];
for (const marker of requiredReadinessMarkers) if (!readiness.includes(marker)) missing.push(`readiness missing ${marker}`);
for (const marker of requiredBridgeMarkers) if (!bridge.includes(marker)) missing.push(`bridge missing ${marker}`);
for (const marker of requiredTrafficMarkers) if (!traffic.includes(marker)) missing.push(`traffic missing ${marker}`);
for (const marker of requiredUiMarkers) {
  if (!perfPanel.includes(marker) && !burstPanel.includes(marker)) missing.push(`ui missing ${marker}`);
}

const crossOriginIndex = readiness.indexOf("reason = 'cross-origin-isolation-missing'");
const sharedArrayBufferIndex = readiness.indexOf("reason = 'shared-array-buffer-missing'");
if (crossOriginIndex < 0 || sharedArrayBufferIndex < 0 || crossOriginIndex > sharedArrayBufferIndex) {
  missing.push('readiness should prefer cross-origin-isolation-missing before shared-array-buffer-missing, because browsers may hide SharedArrayBuffer when isolation is missing');
}

if (perfPanel.includes("value={`${stressComparison?.workletStableLaneSabTransportReadiness ?? 'unknown'} · ${stressComparison?.workletStableLaneSabTransportReadinessReason ?? 'not-in-browser-runtime'}")) {
  missing.push('ui still renders SAB readiness only from stressComparison fallback instead of live browser runtime probe');
}

for (const marker of forbiddenMarkers) {
  if (bridge.includes(marker) || readiness.includes(marker)) missing.push(`forbidden SAB activation marker present ${marker}`);
}

if (missing.length) {
  console.error('[check-stable-lane-sab-readiness-guard] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[check-stable-lane-sab-readiness-guard] OK: SAB/cross-origin-isolation readiness is detected and surfaced without activating sab-ringbuffer transport.');
