import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bridgePath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts');
const transportPath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowStableLanePlanTransport.ts');
const trafficPath = path.join(root, 'src/features/xensonar/audioTraffic/audioTrafficForensics.ts');
const perfPanelPath = path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const burstPanelPath = path.join(root, 'src/features/xensonar/rooms/ResonanceBurstDiagnosticsPanel.tsx');

const bridge = fs.readFileSync(bridgePath, 'utf8');
const transport = fs.readFileSync(transportPath, 'utf8');
const traffic = fs.readFileSync(trafficPath, 'utf8');
const perfPanel = fs.readFileSync(perfPanelPath, 'utf8');
const burstPanel = fs.readFileSync(burstPanelPath, 'utf8');

const requiredTransportMarkers = [
  "export type StableLanePlanTransportBackendKind = 'message-port' | 'sab-ringbuffer'",
  "STABLE_LANE_PLAN_TRANSPORT_ACTIVE_BACKEND_KIND: StableLanePlanTransportBackendKind = 'message-port'",
  "STABLE_LANE_PLAN_TRANSPORT_RESERVED_BACKEND_KIND: StableLanePlanTransportBackendKind = 'sab-ringbuffer'",
  'export type StableLanePlanTransportBackendAdapter',
  'createStableLaneMessagePortPlanTransportBackend',
  'createReservedStableLaneSabRingbufferPlanTransportBackend',
  'resolveStableLanePlanTransportBackend',
  "fallbackReason: 'sab-ringbuffer-backend-reserved-falling-back-to-message-port'",
  'stableLanePlanTransportBackendKind',
  'stableLanePlanTransportSabRingbufferReserved',
  'stableLanePlanTransportBackendFallbackReason',
  'backend: StableLanePlanTransportBackendAdapter',
  'args.backend.postMessage(args.message)',
];

const requiredBridgeMarkers = [
  'resolveStableLanePlanTransportBackend',
  'type StableLanePlanTransportBackendKind',
  'stableLanePlanTransportBackendKind: StableLanePlanTransportBackendKind',
  "stableLanePlanTransportBackendKind: 'message-port'",
  'stableLanePlanTransportSabRingbufferReserved: true',
  'stableLanePlanTransportBackendFallbackReason: null',
  'const stableLanePlanTransportBackend = resolveStableLanePlanTransportBackend({',
  'backend: stableLanePlanTransportBackend',
  'backendKind: handle.snapshot.stableLanePlanTransportBackendKind',
  'sabRingbufferReserved: handle.snapshot.stableLanePlanTransportSabRingbufferReserved',
  'backendFallbackReason: handle.snapshot.stableLanePlanTransportBackendFallbackReason',
];

const forbiddenBridgeMarkers = [
  'postMessage: (message) => handle.node?.port.postMessage(message),\n          publishState: (state) => publishStableLanePlanTransportState(handle, state),\n          message:',
  'postMessage: (message) => handle.node?.port.postMessage(message),\n          publishState: (state) => publishStableLanePlanTransportState(handle, state),\n        });',
];

const requiredTrafficMarkers = [
  'workletStableLanePlanTransportBackendKind',
  'workletStableLanePlanTransportSabRingbufferReserved',
  'workletStableLanePlanTransportBackendFallbackReason',
  "readNestedString(throughputRecord, ['stableLanePlanTransportBackendKind'])",
  "readNestedString(stableLanePlanTransportRecord, ['backendKind'])",
  "readNestedString(debugWorklet, ['stableLanePlanTransportBackendKind'])",
];

const requiredUiMarkers = [
  'workletStableLanePlanTransportBackendKind',
  'stableLanePlanTransportBackendKind',
  'browserResponsibilityReadout.planTransport',
];

const missing = [];
for (const marker of requiredTransportMarkers) if (!transport.includes(marker)) missing.push(`transport missing ${marker}`);
for (const marker of requiredBridgeMarkers) if (!bridge.includes(marker)) missing.push(`bridge missing ${marker}`);
for (const marker of forbiddenBridgeMarkers) if (bridge.includes(marker)) missing.push(`bridge still bypasses backend adapter marker ${marker}`);
for (const marker of requiredTrafficMarkers) if (!traffic.includes(marker)) missing.push(`traffic missing ${marker}`);
for (const marker of requiredUiMarkers) {
  if (!perfPanel.includes(marker) && !burstPanel.includes(marker)) missing.push(`ui missing ${marker}`);
}

if (missing.length) {
  console.error('[check-stable-lane-plan-transport-backend-adapter] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[check-stable-lane-plan-transport-backend-adapter] OK: stable-lane plan transport now goes through an explicit backend adapter, message-port is the only active backend, and sab-ringbuffer is reserved/diagnosed without activation.');
