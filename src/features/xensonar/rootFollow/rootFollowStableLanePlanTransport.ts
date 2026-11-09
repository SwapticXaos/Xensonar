export type RootFollowStableLanePlanTransportMessage = {
  type: 'root-follow-worklet-stable-lane-plan';
  active: true;
  audioNowSec: number;
  bridgeSessionId: number;
  processorGeneration: number;
  bufferGeneration: number;
  probeKind?: 'stable-lane-synthetic-silent-plan';
  plan: {
    entryId: string;
    planSequence: number;
    loopStartSec: number;
    loopEndSec: number;
    sourceOffsetSec: number;
    playbackRate: number;
    targetHz: number;
    anchorHz: number;
    gain: number;
    densityScale: number;
    stableLaneBlend?: number;
    legacyBlend?: number;
    bufferGeneration: number;
    probeKind?: 'stable-lane-synthetic-silent-plan';
  };
};

export type StableLanePlanTransportBackendKind = 'message-port' | 'sab-ringbuffer';

export const STABLE_LANE_PLAN_TRANSPORT_ACTIVE_BACKEND_KIND: StableLanePlanTransportBackendKind = 'message-port';
export const STABLE_LANE_PLAN_TRANSPORT_RESERVED_BACKEND_KIND: StableLanePlanTransportBackendKind = 'sab-ringbuffer';

export type StableLanePlanTransportBackendAdapter = {
  kind: StableLanePlanTransportBackendKind;
  active: boolean;
  reserved: boolean;
  fallbackReason: string | null;
  postMessage: (message: RootFollowStableLanePlanTransportMessage) => void;
};

export function createStableLaneMessagePortPlanTransportBackend(
  postMessage: (message: RootFollowStableLanePlanTransportMessage) => void,
): StableLanePlanTransportBackendAdapter {
  return {
    kind: 'message-port',
    active: true,
    reserved: false,
    fallbackReason: null,
    postMessage,
  };
}

export function createReservedStableLaneSabRingbufferPlanTransportBackend(): StableLanePlanTransportBackendAdapter {
  return {
    kind: 'sab-ringbuffer',
    active: false,
    reserved: true,
    fallbackReason: 'sab-ringbuffer-backend-reserved-not-active',
    postMessage: () => {
      throw new Error('Stable-lane SAB ringbuffer transport backend is reserved but not active.');
    },
  };
}

export function resolveStableLanePlanTransportBackend(args: {
  preferredBackendKind?: StableLanePlanTransportBackendKind;
  postMessage: (message: RootFollowStableLanePlanTransportMessage) => void;
}): StableLanePlanTransportBackendAdapter {
  if (args.preferredBackendKind === 'sab-ringbuffer') {
    return {
      ...createStableLaneMessagePortPlanTransportBackend(args.postMessage),
      fallbackReason: 'sab-ringbuffer-backend-reserved-falling-back-to-message-port',
    };
  }
  return createStableLaneMessagePortPlanTransportBackend(args.postMessage);
}

export type StableLanePlanTransportState = {
  backendKind: StableLanePlanTransportBackendKind;
  sabRingbufferBackendReserved: boolean;
  backendFallbackReason: string | null;
  inFlightSequence: number | null;
  pendingMessage: RootFollowStableLanePlanTransportMessage | null;
  postedCount: number;
  pendingCount: number;
  droppedSupersededCount: number;
  forcedPostCount: number;
  ackCount: number;
  lastPostedAtMs: number | null;
};

export type StableLanePlanTransportSnapshotTarget = {
  stableLanePlanTransportBackendKind: StableLanePlanTransportBackendKind;
  stableLanePlanTransportSabRingbufferReserved: boolean;
  stableLanePlanTransportBackendFallbackReason: string | null;
  stableLanePlanTransportInFlightSequence: number | null;
  stableLanePlanTransportPendingSequence: number | null;
  stableLanePlanTransportPostedCount: number;
  stableLanePlanTransportPendingCount: number;
  stableLanePlanTransportDroppedSupersededCount: number;
  stableLanePlanTransportForcedPostCount: number;
  stableLanePlanTransportAckCount: number;
  stableLanePlanTransportLastPostedAtMs: number | null;
};

export type StableLanePlanTransportResult = {
  posted: boolean;
  pending: boolean;
  forced: boolean;
};

export const STABLE_LANE_PLAN_TRANSPORT_ACK_TIMEOUT_MS = 120;

const stableLanePlanTransportStates = new WeakMap<BaseAudioContext, StableLanePlanTransportState>();

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function getStableLanePlanTransportState(ctx: BaseAudioContext): StableLanePlanTransportState {
  const existing = stableLanePlanTransportStates.get(ctx);
  if (existing) return existing;
  const created: StableLanePlanTransportState = {
    backendKind: STABLE_LANE_PLAN_TRANSPORT_ACTIVE_BACKEND_KIND,
    sabRingbufferBackendReserved: true,
    backendFallbackReason: null,
    inFlightSequence: null,
    pendingMessage: null,
    postedCount: 0,
    pendingCount: 0,
    droppedSupersededCount: 0,
    forcedPostCount: 0,
    ackCount: 0,
    lastPostedAtMs: null,
  };
  stableLanePlanTransportStates.set(ctx, created);
  return created;
}

export function withStableLanePlanTransportSnapshot<T extends StableLanePlanTransportSnapshotTarget>(
  snapshot: T,
  state: StableLanePlanTransportState,
): T {
  return {
    ...snapshot,
    stableLanePlanTransportBackendKind: state.backendKind,
    stableLanePlanTransportSabRingbufferReserved: state.sabRingbufferBackendReserved,
    stableLanePlanTransportBackendFallbackReason: state.backendFallbackReason,
    stableLanePlanTransportInFlightSequence: state.inFlightSequence,
    stableLanePlanTransportPendingSequence: state.pendingMessage?.plan.planSequence ?? null,
    stableLanePlanTransportPostedCount: state.postedCount,
    stableLanePlanTransportPendingCount: state.pendingCount,
    stableLanePlanTransportDroppedSupersededCount: state.droppedSupersededCount,
    stableLanePlanTransportForcedPostCount: state.forcedPostCount,
    stableLanePlanTransportAckCount: state.ackCount,
    stableLanePlanTransportLastPostedAtMs: state.lastPostedAtMs,
  };
}

function postStableLanePlanTransportMessage(args: {
  state: StableLanePlanTransportState;
  message: RootFollowStableLanePlanTransportMessage;
  forced: boolean;
  backend: StableLanePlanTransportBackendAdapter;
  publishState: (state: StableLanePlanTransportState) => void;
}) {
  args.state.backendKind = args.backend.kind;
  args.state.sabRingbufferBackendReserved = true;
  args.state.backendFallbackReason = args.backend.fallbackReason;
  args.backend.postMessage(args.message);
  args.state.inFlightSequence = args.message.plan.planSequence;
  args.state.postedCount += 1;
  if (args.forced) args.state.forcedPostCount += 1;
  args.state.lastPostedAtMs = nowMs();
  args.publishState(args.state);
}

export function publishStableLanePlanViaBoundedTransport(args: {
  ctx: BaseAudioContext;
  message: RootFollowStableLanePlanTransportMessage;
  backend: StableLanePlanTransportBackendAdapter;
  publishState: (state: StableLanePlanTransportState) => void;
}): StableLanePlanTransportResult {
  const state = getStableLanePlanTransportState(args.ctx);
  state.backendKind = args.backend.kind;
  state.sabRingbufferBackendReserved = true;
  state.backendFallbackReason = args.backend.fallbackReason;
  const ageMs = state.lastPostedAtMs === null ? Number.POSITIVE_INFINITY : nowMs() - state.lastPostedAtMs;
  const canPostImmediately = state.inFlightSequence === null || ageMs >= STABLE_LANE_PLAN_TRANSPORT_ACK_TIMEOUT_MS;
  if (canPostImmediately) {
    const forced = state.inFlightSequence !== null && ageMs >= STABLE_LANE_PLAN_TRANSPORT_ACK_TIMEOUT_MS;
    postStableLanePlanTransportMessage({
      state,
      message: args.message,
      forced,
      backend: args.backend,
      publishState: args.publishState,
    });
    return { posted: true, pending: false, forced };
  }

  if (state.pendingMessage !== null) state.droppedSupersededCount += 1;
  state.pendingMessage = args.message;
  state.pendingCount = 1;
  args.publishState(state);
  return { posted: false, pending: true, forced: false };
}

export function acknowledgeStableLanePlanTransport(args: {
  ctx: BaseAudioContext;
  planSequence: number;
  canPostPending: boolean;
  backend: StableLanePlanTransportBackendAdapter;
  publishState: (state: StableLanePlanTransportState) => void;
}): boolean {
  const state = getStableLanePlanTransportState(args.ctx);
  state.ackCount += 1;
  if (state.inFlightSequence === null || args.planSequence >= state.inFlightSequence) {
    state.inFlightSequence = null;
  }
  args.publishState(state);
  const pending = state.pendingMessage;
  if (!pending || !args.canPostPending) return false;
  state.pendingMessage = null;
  state.pendingCount = 0;
  postStableLanePlanTransportMessage({
    state,
    message: pending,
    forced: false,
    backend: args.backend,
    publishState: args.publishState,
  });
  return true;
}
