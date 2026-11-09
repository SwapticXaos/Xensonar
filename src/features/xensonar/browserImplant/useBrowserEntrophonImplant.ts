import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveMasterBusRuntimeRefs } from "../audio/liveMasterBusRuntimeBoundary";
import { getLiveMasterBusRuntime } from "../audio/liveMasterBusRuntimeBoundary";
import { EntrophonPlanRecordEncoder, type EntrophonPlanTransportValue } from "./protocol/entrophonVoiceRecord";
import { XensonarBrowserC11Host } from "./worklet/browserC11Host";
import { compileBrowserC11KernelModule, ensureBrowserC11WorkletRegistered } from "./useBrowserWaveStarterImplant";
import { recordBrowserImplantDiagnostic } from "./runtimeDiagnostics";
import { ENTROPHON_MAX_UNITS_PER_BODY, LIVE_TRANSPORT_LEAD_FRAMES } from "./protocol/renderAdmission";

export type BrowserEntrophonImplantState = "disabled" | "waiting-audio-context" | "initializing" | "ready" | "unavailable" | "owned-failed";
export type BrowserEntrophonImplantSnapshot = {
  enabled: boolean; state: BrowserEntrophonImplantState; ownsRenderClass: boolean;
  sampleRate: number; transport: string | null; lastError: string | null;
};

type RuntimeState = {
  host: XensonarBrowserC11Host | null;
  ready: boolean;
  owned: boolean;
  failedAfterOwnership: boolean;
  token: number;
  encoder: EntrophonPlanRecordEncoder;
  submitted: number;
  failed: number;
  legacyFallbacks: number;
  lastLegacyFallbackReason: string | null;
  routeSnapshotTimer: number | null;
  routeSnapshotDirty: boolean;
  updateUi?: (patch: Partial<BrowserEntrophonImplantSnapshot>) => void;
};

const runtimes = new WeakMap<AudioContext, RuntimeState>();
const ROUTE_SNAPSHOT_FLUSH_MS = 900;

export type BrowserEntrophonSubmission = Omit<EntrophonPlanTransportValue, "token" | "epoch" | "frame" | "auxRouteMask"> & {
  intendedStartTimeSec: number;
  auxTargets: Array<AudioNode | null | undefined>;
  reservationToken?: number;
  onEnded?: () => void;
};

export type BrowserEntrophonSubmitResult = {
  owned: boolean;
  submitted: boolean;
  token: number | null;
  reason: "not-ready" | "submitted" | "ingress-full" | "aux-route-capacity" | "owned-failed";
};

function enabledFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search);
    const explicit = q.get("browserEntrophon");
    if (explicit === "1") return true;
    if (explicit === "0") return false;
  } catch { /* build default */ }
  return import.meta.env.VITE_XENSONAR_BROWSER_IMPLANT_DEFAULT === "1";
}

function publishRouteSnapshot(ctx: AudioContext, state: RuntimeState): void {
  if (typeof window === "undefined") return;
  (window as any).__XENSONAR_ENTROPHON_ROUTE__ = {
    architecture: state.owned ? "browser-c11-wasm" : "legacy-webaudio",
    ready: state.ready,
    owned: state.owned,
    failedAfterOwnership: state.failedAfterOwnership,
    submitted: state.submitted,
    failed: state.failed,
    legacyFallbacks: state.legacyFallbacks,
    lastLegacyFallbackReason: state.lastLegacyFallbackReason,
    sampleRate: ctx.sampleRate,
    host: state.host?.diagnosticSnapshot() ?? null,
  };
}

function clearScheduledRouteSnapshot(state: RuntimeState): void {
  if (state.routeSnapshotTimer === null || typeof window === "undefined") return;
  window.clearTimeout(state.routeSnapshotTimer);
  state.routeSnapshotTimer = null;
}

function flushRouteSnapshotNow(ctx: AudioContext, state: RuntimeState): void {
  clearScheduledRouteSnapshot(state);
  state.routeSnapshotDirty = false;
  publishRouteSnapshot(ctx, state);
}

function scheduleRouteSnapshot(ctx: AudioContext, state: RuntimeState): void {
  state.routeSnapshotDirty = true;
  if (state.routeSnapshotTimer !== null || typeof window === "undefined") return;
  state.routeSnapshotTimer = window.setTimeout(() => {
    state.routeSnapshotTimer = null;
    if (!state.routeSnapshotDirty) return;
    state.routeSnapshotDirty = false;
    publishRouteSnapshot(ctx, state);
  }, ROUTE_SNAPSHOT_FLUSH_MS);
}

function transitionOwnedFailure(
  ctx: AudioContext,
  state: RuntimeState,
  error: unknown,
  diagnosticEvent: "owned-worklet-fault" | "owned-submit-failed" | "owned-readiness-lost",
): void {
  if (state.failedAfterOwnership) {
    scheduleRouteSnapshot(ctx, state);
    return;
  }
  state.failedAfterOwnership = true;
  state.ready = false;
  state.owned = true;
  flushRouteSnapshotNow(ctx, state);
  const message = error instanceof Error ? error.message : String(error);
  state.updateUi?.({ state: "owned-failed", ownsRenderClass: true, transport: state.host?.transportKind ?? null, lastError: message });
  recordBrowserImplantDiagnostic("entrophon-route", diagnosticEvent, { error: message });
}

export function noteBrowserEntrophonLegacyFallback(ctx: AudioContext, reason = "pre-ready"): void {
  const state = runtimes.get(ctx);
  if (!state) return;
  state.legacyFallbacks++;
  state.lastLegacyFallbackReason = reason;
  scheduleRouteSnapshot(ctx, state);
}

/** 0: not owned, -1: owned/rejected, positive: reserved before VoiceSpec work. */
export function reserveBrowserEntrophonVoice(ctx: AudioContext, intendedStartTimeSec: number): number {
  const state=runtimes.get(ctx);
  if(!state?.owned)return 0;
  const token=state.token++ >>> 0 || (state.token=1);
  // Scheduled-time offset, not DOM input age: keep its provenance explicit.
  state.host?.observeInputAge((ctx.currentTime - intendedStartTimeSec) * 1000);
  const targetFrame=Math.round(intendedStartTimeSec*ctx.sampleRate)+LIVE_TRANSPORT_LEAD_FRAMES;
  if(!state.ready || !state.host?.tryReserveAttack(token,targetFrame,ENTROPHON_MAX_UNITS_PER_BODY,1)) {
    state.failed++;scheduleRouteSnapshot(ctx,state);return -1;
  }
  return token;
}
export function cancelUnsubmittedBrowserEntrophonVoice(ctx: AudioContext, token: number): void {
  if(token>0)runtimes.get(ctx)?.host?.cancelUnsubmitted(token);
}

export function trySubmitBrowserEntrophonVoice(ctx: AudioContext, plan: BrowserEntrophonSubmission): BrowserEntrophonSubmitResult {
  const state = runtimes.get(ctx);
  if (!state || !state.ready || !state.host) {
    if (state?.owned) {
      state.failed++;
      transitionOwnedFailure(ctx, state, "Entrophon C11 host lost readiness after ownership", "owned-readiness-lost");
      return { owned: true, submitted: false, token: null, reason: "owned-failed" };
    }
    return { owned: false, submitted: false, token: null, reason: "not-ready" };
  }
  const host = state.host;
  const auxRouteMask = host.resolveAuxRouteMask(plan.auxTargets);
  if (auxRouteMask < 0) {
    state.failed++;
    scheduleRouteSnapshot(ctx, state);
    return { owned: true, submitted: false, token: null, reason: "aux-route-capacity" };
  }
  const token=plan.reservationToken ?? reserveBrowserEntrophonVoice(ctx,plan.intendedStartTimeSec);
  if(token<=0)return {owned:true,submitted:false,token:null,reason:"ingress-full"};
  const targetFrame=host.reservedFrame(token);
  if(plan.onEnded)host.onFinished(token,plan.onEnded);
  try {
    const record = state.encoder.encode({ ...plan, token, epoch: host.epoch, frame: targetFrame, auxRouteMask });
    const sent = host.trySubmitRecord(record);
    if (!sent) {
      state.failed++;
      scheduleRouteSnapshot(ctx, state);
      return { owned: true, submitted: false, token, reason: "ingress-full" };
    }
    state.submitted++;
    scheduleRouteSnapshot(ctx, state);
    return { owned: true, submitted: true, token, reason: "submitted" };
  } catch (error) {
    host.cancelUnsubmitted(token);
    state.failed++;
    transitionOwnedFailure(ctx, state, error, "owned-submit-failed");
    return { owned: true, submitted: false, token, reason: "owned-failed" };
  }
}

export function useBrowserEntrophonImplant(args: { audioCtx: AudioContext | null; liveMasterBusRuntimeRefs: LiveMasterBusRuntimeRefs }) {
  const enabled = useRef(enabledFromLocation()).current;
  const [snapshot, setSnapshot] = useState<BrowserEntrophonImplantSnapshot>({
    enabled, state: enabled ? "waiting-audio-context" : "disabled", ownsRenderClass: false,
    sampleRate: 0, transport: null, lastError: null,
  });
  const updateUi = useCallback((patch: Partial<BrowserEntrophonImplantSnapshot>) => {
    setSnapshot(prev => ({ ...prev, ...patch }));
  }, []);
  useEffect(() => {
    if (!enabled) return;
    if (!args.audioCtx) {
      updateUi({ state: "waiting-audio-context", ownsRenderClass: false, sampleRate: 0, transport: null });
      return;
    }
    const ctx = args.audioCtx;
    let cancelled = false;
    updateUi({ state: "initializing", ownsRenderClass: false, sampleRate: ctx.sampleRate, transport: null, lastError: null });
    const state: RuntimeState = {
      host: null, ready: false, owned: false, failedAfterOwnership: false,
      token: 1, encoder: new EntrophonPlanRecordEncoder(), submitted: 0, failed: 0, legacyFallbacks: 0, lastLegacyFallbackReason: null,
      routeSnapshotTimer: null, routeSnapshotDirty: false, updateUi,
    };
    runtimes.set(ctx, state); flushRouteSnapshotNow(ctx, state);
    void (async () => {
      let host: XensonarBrowserC11Host | null = null;
      try {
        await ensureBrowserC11WorkletRegistered(ctx);
        if (cancelled) return;
        const { bytes } = await compileBrowserC11KernelModule();
        if (cancelled) return;
        const destination = getLiveMasterBusRuntime(ctx, args.liveMasterBusRuntimeRefs, "main");
        host = new XensonarBrowserC11Host(ctx, destination, 1);
        host.onFault = (reason) => {
          if (cancelled) return;
          state.failed++;
          transitionOwnedFailure(ctx, state, reason, "owned-worklet-fault");
        };
        if (!await host.createNode({ wasmBytes: bytes })) throw new Error("Entrophon C11/WASM host did not become READY");
        if (cancelled) { host.destroy(); return; }
        state.host = host; state.ready = true; state.owned = true; host.unmute();
        flushRouteSnapshotNow(ctx, state);
        updateUi({ state: "ready", ownsRenderClass: true, sampleRate: ctx.sampleRate, transport: host.transportKind, lastError: null });
        recordBrowserImplantDiagnostic("entrophon-route", "ownership-cutover-ready", host.diagnosticSnapshot());
      } catch (error) {
        host?.destroy();
        if (cancelled) return;
        /* Before READY no migrated Entrophon event can have crossed admission. Legacy remains owner. */
        state.host = null; state.ready = false; state.owned = false;
        flushRouteSnapshotNow(ctx, state);
        updateUi({ state: "unavailable", ownsRenderClass: false, transport: null, lastError: error instanceof Error ? error.message : String(error) });
        recordBrowserImplantDiagnostic("entrophon-route", "bootstrap-unavailable-legacy-owner", { error });
      }
    })();
    return () => {
      cancelled = true;
      clearScheduledRouteSnapshot(state);
      state.host?.destroy(); state.host = null; state.ready = false;
      runtimes.delete(ctx);
    };
  }, [args.audioCtx, args.liveMasterBusRuntimeRefs, enabled, updateUi]);
  return { enabled, snapshot } as const;
}
