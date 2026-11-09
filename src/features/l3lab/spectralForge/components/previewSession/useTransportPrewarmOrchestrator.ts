/**
 * useTransportPrewarmOrchestrator — 7.6.36
 *
 * Transport-specific companion hook for useSpectralForgePreviewSession.
 * It owns serial prewarm flight control, schedule tokens, timers, the
 * transport prepared-payload slot, and the transport UI prewarm state.
 * The parent session hook remains responsible for the preview-session
 * machine, request identity, generation guards, prepared-entry cache,
 * inflight de-duplication, and the public driver contract.
 */
import { useCallback, useRef, useState } from "react";

export type SpectralForgeTransportPrewarmState = {
  preparedRequestKey: string | null;
  prewarmRendering: boolean;
  prewarmProgress: number;
};

export type SpectralForgeTransportPreparedPayload = {
  requestKey: string;
  payload: unknown;
};

export type UseTransportPrewarmOrchestratorResult = {
  transportPrewarmState: SpectralForgeTransportPrewarmState;
  // Prepared payload slot: one active transport payload, guarded by requestKey.
  getTransportPreparedPayload: <Payload>(requestKey: string) => Payload | null;
  rememberTransportPreparedPayload: <Payload>(
    requestKey: string,
    payload: Payload,
  ) => void;
  clearTransportPreparedPayload: (requestKey?: string) => void;
  // UI state setters: drive the transport prewarm fill without owning playback.
  setTransportPreparedRequestKey: (
    requestKey: string | null | ((current: string | null) => string | null),
  ) => void;
  setTransportPrewarmRendering: (rendering: boolean) => void;
  setTransportPrewarmProgress: (progress: number) => void;
  // Serial flight control: one active run, one coalesced rerun request.
  isSerialPrewarmInFlight: () => boolean;
  beginTransportSerialPrewarmRun: () => boolean;
  finishTransportSerialPrewarmRun: () => boolean;
  requestTransportSerialPrewarmRerun: () => void;
  requestTransportSerialPrewarmRerunIfInFlight: () => boolean;
  hasSerialPrewarmRerun: () => boolean;
  consumeSerialPrewarmRerun: () => boolean;
  // Schedule token: monotonically increasing stale-async guard.
  beginTransportPrewarmSchedule: () => number;
  isCurrentTransportPrewarmSchedule: (token: number) => boolean;
  // Timer ownership remains local to the transport orchestrator.
  setTransportPrewarmTimer: (timer: number | null) => void;
  clearTransportPrewarmTimer: () => void;
};

export function useTransportPrewarmOrchestrator(): UseTransportPrewarmOrchestratorResult {
  const [transportPrewarmState, setTransportPrewarmState] =
    useState<SpectralForgeTransportPrewarmState>({
      preparedRequestKey: null,
      prewarmRendering: false,
      prewarmProgress: 0,
    });
  const serialPrewarmInFlightRef = useRef(false);
  const serialPrewarmRerunRequestedRef = useRef(false);
  const transportPrewarmScheduleTokenRef = useRef(0);
  const transportPrewarmTimerRef = useRef<number | null>(null);
  const transportPreparedPayloadRef =
    useRef<SpectralForgeTransportPreparedPayload | null>(null);

  // ── Prepared payload ───────────────────────────────────────────────────────
  const getTransportPreparedPayload = useCallback(
    <Payload>(requestKey: string): Payload | null => {
      const entry = transportPreparedPayloadRef.current;
      return entry?.requestKey === requestKey
        ? (entry.payload as Payload)
        : null;
    },
    [],
  );

  const rememberTransportPreparedPayload = useCallback(
    <Payload>(requestKey: string, payload: Payload) => {
      transportPreparedPayloadRef.current = { requestKey, payload };
    },
    [],
  );

  const clearTransportPreparedPayload = useCallback((requestKey?: string) => {
    if (
      !requestKey ||
      transportPreparedPayloadRef.current?.requestKey === requestKey
    ) {
      transportPreparedPayloadRef.current = null;
    }
  }, []);

  // ── UI state setters ───────────────────────────────────────────────────────
  const setTransportPreparedRequestKey = useCallback(
    (
      requestKey: string | null | ((current: string | null) => string | null),
    ) => {
      setTransportPrewarmState((current) => {
        const preparedRequestKey = typeof requestKey === "function"
          ? requestKey(current.preparedRequestKey) : requestKey;
        return current.preparedRequestKey === preparedRequestKey
          ? current : { ...current, preparedRequestKey };
      });
    },
    [],
  );

  const setTransportPrewarmRendering = useCallback(
    (prewarmRendering: boolean) => {
      setTransportPrewarmState((current) => current.prewarmRendering === prewarmRendering ? current : { ...current, prewarmRendering });
    },
    [],
  );

  const setTransportPrewarmProgress = useCallback((prewarmProgress: number) => {
    setTransportPrewarmState((current) => Object.is(current.prewarmProgress, prewarmProgress) ? current : { ...current, prewarmProgress });
  }, []);

  // ── Serial flight control ──────────────────────────────────────────────────
  const isSerialPrewarmInFlight = useCallback(
    () => serialPrewarmInFlightRef.current,
    [],
  );

  const requestTransportSerialPrewarmRerun = useCallback(() => {
    serialPrewarmRerunRequestedRef.current = true;
  }, []);

  const beginTransportSerialPrewarmRun = useCallback(() => {
    if (serialPrewarmInFlightRef.current) {
      serialPrewarmRerunRequestedRef.current = true;
      return false;
    }
    serialPrewarmInFlightRef.current = true;
    return true;
  }, []);

  const finishTransportSerialPrewarmRun = useCallback(() => {
    serialPrewarmInFlightRef.current = false;
    return serialPrewarmRerunRequestedRef.current;
  }, []);

  const requestTransportSerialPrewarmRerunIfInFlight = useCallback(() => {
    if (!serialPrewarmInFlightRef.current) return false;
    serialPrewarmRerunRequestedRef.current = true;
    return true;
  }, []);

  const hasSerialPrewarmRerun = useCallback(
    () => serialPrewarmRerunRequestedRef.current,
    [],
  );

  const consumeSerialPrewarmRerun = useCallback(() => {
    const requested = serialPrewarmRerunRequestedRef.current;
    serialPrewarmRerunRequestedRef.current = false;
    return requested;
  }, []);

  // ── Schedule token ─────────────────────────────────────────────────────────
  const beginTransportPrewarmSchedule = useCallback(() => {
    transportPrewarmScheduleTokenRef.current += 1;
    return transportPrewarmScheduleTokenRef.current;
  }, []);

  const isCurrentTransportPrewarmSchedule = useCallback(
    (token: number) => transportPrewarmScheduleTokenRef.current === token,
    [],
  );

  // ── Timer ──────────────────────────────────────────────────────────────────
  const clearTransportPrewarmTimer = useCallback(() => {
    if (transportPrewarmTimerRef.current !== null) {
      window.clearTimeout(transportPrewarmTimerRef.current);
      transportPrewarmTimerRef.current = null;
    }
  }, []);

  const setTransportPrewarmTimer = useCallback((timer: number | null) => {
    if (
      transportPrewarmTimerRef.current !== null &&
      transportPrewarmTimerRef.current !== timer
    ) {
      window.clearTimeout(transportPrewarmTimerRef.current);
    }
    transportPrewarmTimerRef.current = timer;
  }, []);

  return {
    transportPrewarmState,
    getTransportPreparedPayload,
    rememberTransportPreparedPayload,
    clearTransportPreparedPayload,
    setTransportPreparedRequestKey,
    setTransportPrewarmRendering,
    setTransportPrewarmProgress,
    isSerialPrewarmInFlight,
    beginTransportSerialPrewarmRun,
    finishTransportSerialPrewarmRun,
    requestTransportSerialPrewarmRerun,
    requestTransportSerialPrewarmRerunIfInFlight,
    hasSerialPrewarmRerun,
    consumeSerialPrewarmRerun,
    beginTransportPrewarmSchedule,
    isCurrentTransportPrewarmSchedule,
    setTransportPrewarmTimer,
    clearTransportPrewarmTimer,
  };
}
