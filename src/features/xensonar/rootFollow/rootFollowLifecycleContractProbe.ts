export type RootFollowLifecycleContinuity = 'idle' | 'open' | 'intact' | 'suspect';

export type RootFollowLifecycleSession = {
  id: string;
  token: number;
  loopId: string | null;
  loopName: string | null;
  sourceKind: string | null;
  renderMode: string | null;
  openedAtAudioSec: number | null;
  closedAtAudioSec: number | null;
  lastAudioSec: number | null;
  lastRootHz: number | null;
  lastTransportAnchorSec: number | null;
  lastNextSliceStartSec: number | null;
  retuneSamples: number;
  rootHzChanges: number;
  schedulerTicks: number;
};

export type RootFollowLifecycleContractSummary = {
  active: boolean;
  continuity: RootFollowLifecycleContinuity;
  currentSessionId: string | null;
  currentToken: number | null;
  currentLoopId: string | null;
  currentLoopName: string | null;
  sessionStarts: number;
  sessionStops: number;
  schedulerTicks: number;
  retuneSamples: number;
  retuneSamplesWithoutRestart: number;
  rootHzChangesWithinSession: number;
  sameLoopRestartSuspicions: number;
  tokenMismatchWarnings: number;
  transportAnchorWarnings: number;
  lastRootHz: number | null;
  lastRootDeltaCents: number | null;
  lastTransportAnchorSec: number | null;
  lastNextSliceStartSec: number | null;
  lastStage: string | null;
  warnings: string[];
};

type MutableProbeState = RootFollowLifecycleContractSummary & {
  currentSession: RootFollowLifecycleSession | null;
  sequence: number;
};

const MAX_WARNINGS = 8;
const ROOT_DELTA_CENTS_THRESHOLD = 0.35;
const TRANSPORT_ANCHOR_DRIFT_SEC = 0.0015;

function createEmptyState(): MutableProbeState {
  return {
    active: false,
    continuity: 'idle',
    currentSessionId: null,
    currentToken: null,
    currentLoopId: null,
    currentLoopName: null,
    sessionStarts: 0,
    sessionStops: 0,
    schedulerTicks: 0,
    retuneSamples: 0,
    retuneSamplesWithoutRestart: 0,
    rootHzChangesWithinSession: 0,
    sameLoopRestartSuspicions: 0,
    tokenMismatchWarnings: 0,
    transportAnchorWarnings: 0,
    lastRootHz: null,
    lastRootDeltaCents: null,
    lastTransportAnchorSec: null,
    lastNextSliceStartSec: null,
    lastStage: null,
    warnings: [],
    currentSession: null,
    sequence: 0,
  };
}

const state: MutableProbeState = createEmptyState();

function pushWarning(message: string) {
  state.warnings = [message, ...state.warnings.filter((entry) => entry !== message)].slice(0, MAX_WARNINGS);
  state.continuity = 'suspect';
}

function centsBetween(a: number | null, b: number | null) {
  if (!Number.isFinite(a ?? NaN) || !Number.isFinite(b ?? NaN) || !a || !b || a <= 0 || b <= 0) return null;
  return 1200 * Math.log2(b / a);
}

function makeSessionId(token: number, loopId: string | null) {
  state.sequence += 1;
  return `root-follow:${loopId ?? 'unknown'}:${token}:${state.sequence}`;
}

function syncPublicSession(session: RootFollowLifecycleSession | null) {
  state.active = !!session && session.closedAtAudioSec === null;
  state.currentSessionId = session?.id ?? null;
  state.currentToken = session?.token ?? null;
  state.currentLoopId = session?.loopId ?? null;
  state.currentLoopName = session?.loopName ?? null;
  state.lastRootHz = session?.lastRootHz ?? state.lastRootHz;
  state.lastTransportAnchorSec = session?.lastTransportAnchorSec ?? state.lastTransportAnchorSec;
  state.lastNextSliceStartSec = session?.lastNextSliceStartSec ?? state.lastNextSliceStartSec;
  if (state.continuity !== 'suspect') state.continuity = state.active ? 'open' : 'idle';
}

export function beginRootFollowLifecycleSession(args: {
  token: number;
  loopId: string | null;
  loopName: string | null;
  sourceKind: string | null;
  renderMode: string | null;
  audioNowSec: number | null;
  rootHz: number | null;
}) {
  if (state.currentSession && state.currentSession.closedAtAudioSec === null) {
    if (state.currentSession.loopId === args.loopId && state.currentSession.token !== args.token) {
      state.sameLoopRestartSuspicions += 1;
      pushWarning('Root-Follow-Session wurde für denselben Loop neu geöffnet, bevor die alte Session sichtbar geschlossen war.');
    }
  }
  const session: RootFollowLifecycleSession = {
    id: makeSessionId(args.token, args.loopId),
    token: args.token,
    loopId: args.loopId,
    loopName: args.loopName,
    sourceKind: args.sourceKind,
    renderMode: args.renderMode,
    openedAtAudioSec: args.audioNowSec,
    closedAtAudioSec: null,
    lastAudioSec: args.audioNowSec,
    lastRootHz: args.rootHz,
    lastTransportAnchorSec: null,
    lastNextSliceStartSec: null,
    retuneSamples: 0,
    rootHzChanges: 0,
    schedulerTicks: 0,
  };
  state.sessionStarts += 1;
  state.currentSession = session;
  state.lastStage = 'gate-open';
  if (state.continuity !== 'suspect') state.continuity = 'open';
  syncPublicSession(session);
}

export function closeRootFollowLifecycleSession(args: {
  token: number | null;
  loopId: string | null;
  audioNowSec: number | null;
  stage: string;
}) {
  const session = state.currentSession;
  if (session && session.closedAtAudioSec === null) {
    if (args.token !== null && session.token !== args.token) {
      state.tokenMismatchWarnings += 1;
      pushWarning('Root-Follow-Cleanup meldete einen anderen Token als die aktive Session.');
    }
    session.closedAtAudioSec = args.audioNowSec;
    session.lastAudioSec = args.audioNowSec;
    state.sessionStops += 1;
  }
  state.lastStage = args.stage;
  if (state.continuity !== 'suspect') state.continuity = 'idle';
  syncPublicSession(session ?? null);
}

export function markRootFollowLifecycleSchedulerTick(args: {
  token: number;
  loopId: string | null;
  audioNowSec: number | null;
  rootHz: number | null;
  transportAnchorSec: number | null;
  nextSliceStartSec: number | null;
  stage: string;
}) {
  state.schedulerTicks += 1;
  const session = state.currentSession;
  if (!session || session.closedAtAudioSec !== null) {
    state.tokenMismatchWarnings += 1;
    pushWarning('Root-Follow-Scheduler tickte ohne offene Lifecycle-Session.');
    state.lastStage = args.stage;
    return;
  }
  if (session.token !== args.token) {
    state.tokenMismatchWarnings += 1;
    pushWarning('Root-Follow-Scheduler tickte mit anderem Token als die aktive Session.');
  }
  session.schedulerTicks += 1;
  session.lastAudioSec = args.audioNowSec;
  const deltaCents = centsBetween(session.lastRootHz, args.rootHz);
  state.lastRootDeltaCents = deltaCents;
  if (deltaCents !== null && Math.abs(deltaCents) > ROOT_DELTA_CENTS_THRESHOLD) {
    session.rootHzChanges += 1;
    state.rootHzChangesWithinSession += 1;
    state.retuneSamples += 1;
    state.retuneSamplesWithoutRestart += 1;
    session.retuneSamples += 1;
    if (state.continuity !== 'suspect') state.continuity = 'intact';
  }
  if (Number.isFinite(args.rootHz ?? NaN) && args.rootHz !== null) {
    session.lastRootHz = args.rootHz;
  }
  if (Number.isFinite(args.transportAnchorSec ?? NaN) && args.transportAnchorSec !== null) {
    if (session.lastTransportAnchorSec !== null && Math.abs(session.lastTransportAnchorSec - args.transportAnchorSec) > TRANSPORT_ANCHOR_DRIFT_SEC) {
      state.transportAnchorWarnings += 1;
      pushWarning('Root-Follow-Transportanker driftete innerhalb derselben Session.');
    }
    session.lastTransportAnchorSec = args.transportAnchorSec;
  }
  if (Number.isFinite(args.nextSliceStartSec ?? NaN) && args.nextSliceStartSec !== null) {
    session.lastNextSliceStartSec = args.nextSliceStartSec;
  }
  state.lastStage = args.stage;
  syncPublicSession(session);
}

export function markRootFollowLifecycleRenderWindow(args: {
  token: number;
  mode: string;
  audioNowSec: number | null;
  targetHz: number | null;
  transportAnchorSec?: number | null;
  nextSliceStartSec?: number | null;
}) {
  markRootFollowLifecycleSchedulerTick({
    token: args.token,
    loopId: state.currentSession?.loopId ?? null,
    audioNowSec: args.audioNowSec,
    rootHz: args.targetHz,
    transportAnchorSec: args.transportAnchorSec ?? state.currentSession?.lastTransportAnchorSec ?? null,
    nextSliceStartSec: args.nextSliceStartSec ?? state.currentSession?.lastNextSliceStartSec ?? null,
    stage: `render:${args.mode}`,
  });
}

export function summarizeRootFollowLifecycleContractProbe(): RootFollowLifecycleContractSummary {
  const { currentSession: _session, sequence: _sequence, ...summary } = state;
  return {
    ...summary,
    warnings: [...summary.warnings],
  };
}

export function resetRootFollowLifecycleContractProbeForTests() {
  const next = createEmptyState();
  Object.assign(state, next);
}
