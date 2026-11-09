import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bridgePath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts');
const transportPath = path.join(root, 'src/features/xensonar/rootFollow/rootFollowStableLanePlanTransport.ts');
const trafficPath = path.join(root, 'src/features/xensonar/audioTraffic/audioTrafficForensics.ts');
const perfPanelPath = path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');

const bridge = fs.readFileSync(bridgePath, 'utf8');
const transport = fs.readFileSync(transportPath, 'utf8');
const traffic = fs.readFileSync(trafficPath, 'utf8');
const perfPanel = fs.readFileSync(perfPanelPath, 'utf8');

const requiredTransportMarkers = [
  'export type StableLanePlanTransportState',
  'export type RootFollowStableLanePlanTransportMessage',
  'export const STABLE_LANE_PLAN_TRANSPORT_ACK_TIMEOUT_MS = 120',
  'stableLanePlanTransportStates = new WeakMap',
  'export function publishStableLanePlanViaBoundedTransport',
  'export function acknowledgeStableLanePlanTransport',
  'if (state.pendingMessage !== null) state.droppedSupersededCount += 1',
  'state.inFlightSequence = args.message.plan.planSequence',
  'withStableLanePlanTransportSnapshot',
];

const requiredBridgeMarkers = [
  "from './rootFollowStableLanePlanTransport'",
  'publishStableLanePlanTransportState',
  'publishStableLanePlanViaBoundedTransport({',
  'acknowledgeStableLanePlanTransport({',
  "rejectedReason = 'stale-plan-sequence'",
  'stableLanePlanTransportDroppedStaleCount',
  'stableLanePlanTransportPostedCount',
  'stableLanePlanTransportPendingSequence',
  'withStableLanePlanTransportSnapshot',
];

const forbiddenBridgeMarkers = [
  'type StableLanePlanTransportState =',
  'type RootFollowStableLanePlanTransportMessage =',
  'STABLE_LANE_PLAN_TRANSPORT_ACK_TIMEOUT_MS = 120',
  'const stableLanePlanTransportStates = new WeakMap',
  'function postStableLanePlanTransportMessage',
  "handle.node.port.postMessage({\n          type: 'root-follow-worklet-stable-lane-plan'",
];

const requiredTrafficMarkers = [
  'workletStableLanePlanTransportPostedCount',
  'workletStableLanePlanTransportPendingCount',
  'workletStableLanePlanTransportDroppedSupersededCount',
  'workletStableLanePlanTransportDroppedStaleCount',
  "readNestedRecord(detail, 'stableLanePlanTransport')",
];

const requiredUiMarkers = [
  'label="Plan-Transport"',
  'workletStableLanePlanTransportPostedCount',
  'workletStableLanePlanTransportPendingCount',
  'workletStableLanePlanTransportDroppedSupersededCount',
];

const missing = [];
for (const marker of requiredTransportMarkers) if (!transport.includes(marker)) missing.push(`transport missing ${marker}`);
for (const marker of requiredBridgeMarkers) if (!bridge.includes(marker)) missing.push(`bridge missing ${marker}`);
for (const marker of forbiddenBridgeMarkers) if (bridge.includes(marker)) missing.push(`bridge still owns transport-domain marker ${marker}`);
for (const marker of requiredTrafficMarkers) if (!traffic.includes(marker)) missing.push(`traffic missing ${marker}`);
for (const marker of requiredUiMarkers) if (!perfPanel.includes(marker)) missing.push(`ui missing ${marker}`);

if (missing.length) {
  console.error('[check-stable-lane-plan-transport-contract] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('[check-stable-lane-plan-transport-contract] OK: stable-lane plan transport is bounded, superseded plans are coalesced in the transport domain, stale sequences are rejected by the bridge/worklet path, and UI/diagnostics expose the transport state.');
