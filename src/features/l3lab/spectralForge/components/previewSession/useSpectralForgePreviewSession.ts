/**
 * useSpectralForgePreviewSession — preview-session machine + driver boundary.
 *
 * Owns the generic Spectral Forge preview session: reducer-backed session
 * state, current request identity, generation guard, prepared-entry cache,
 * inflight de-duplication, and the driver used by transport/basis-hearing
 * routes. Transport-specific prewarm timers and payload plumbing live in
 * useTransportPrewarmOrchestrator and are re-exposed here for API continuity.
 */
import { useCallback, useMemo, useRef } from "react";
import { reduceSpectralForgePreviewSession } from "./spectralForgePreviewSessionMachine";
import {
  useTransportPrewarmOrchestrator,
  type SpectralForgeTransportPrewarmState,
} from "./useTransportPrewarmOrchestrator";
import type {
  SpectralForgePreviewRequest,
  SpectralForgePreviewRequestIdentity,
  SpectralForgePreviewScheduleRequest,
  SpectralForgePreviewSessionEvent,
  SpectralForgePreviewSessionState,
} from "./spectralForgePreviewSessionTypes";

export type {
  SpectralForgeTransportPreparedPayload,
  SpectralForgeTransportPrewarmState,
} from "./useTransportPrewarmOrchestrator";

export type SpectralForgePreviewPreparedEntry = {
  cacheKey: string;
  rendered: boolean;
  machineId: string;
};

export const SPECTRAL_FORGE_PREVIEW_PREPARED_CACHE_MAX_ENTRIES = 48;

function trimPreparedPreviewCache<Entry>(
  cache: Map<string, Entry>,
  maxEntries: number,
): void {
  while (cache.size > maxEntries) {
    const first = cache.keys().next().value;
    if (!first) break;
    cache.delete(first);
  }
}

export type UseSpectralForgePreviewSessionOptions = {
  maxPreparedEntries?: number;
};

export type SpectralForgePreviewSessionDriver = {
  getState: () => SpectralForgePreviewSessionState;
  getCurrentRequest: () => SpectralForgePreviewRequest | null;
  isCurrentRequest: (request: SpectralForgePreviewRequest) => boolean; schedule: (request: SpectralForgePreviewRequest) => void;
  beginPrewarm: (request: SpectralForgePreviewRequest) => boolean;
  reportProgress: (
    request: SpectralForgePreviewRequest,
    progress: number,
  ) => void;
  markReady: (request: SpectralForgePreviewRequest, cacheHit: boolean) => void;
  markStale: (request: SpectralForgePreviewRequest) => void;
  markError: (request: SpectralForgePreviewRequest, message: string) => void;
  canPlay: (request: SpectralForgePreviewRequest) => boolean;
  markPlaying: (request: SpectralForgePreviewRequest) => void;
  markPlayEnded: (request: SpectralForgePreviewRequest) => void;
};

export type UseSpectralForgePreviewSessionResult<
  PreparedEntry extends SpectralForgePreviewPreparedEntry,
  PrewarmResult = unknown,
> = {
  recordEvent: (event: SpectralForgePreviewSessionEvent) => void;
  scheduleRequest: (request: SpectralForgePreviewScheduleRequest) => void;
  markPrewarmStart: (request: SpectralForgePreviewRequestIdentity) => void;
  markPrewarmProgress: (
    request: SpectralForgePreviewRequestIdentity & { progress: number },
  ) => void;
  markReady: (
    request: SpectralForgePreviewRequestIdentity & { cacheHit: boolean },
  ) => void;
  markStale: (request: {
    previousKey: string;
    currentKey: string;
    routeKind: SpectralForgePreviewSessionEvent["routeKind"];
  }) => void;
  markError: (request: {
    requestKey?: string;
    routeKind: SpectralForgePreviewSessionEvent["routeKind"];
    message: string;
  }) => void;
  markPlaying: (
    request: SpectralForgePreviewRequestIdentity & { loop: boolean },
  ) => void;
  markPlayEnded: (request: SpectralForgePreviewRequestIdentity) => void;
  previewSessionDriver: SpectralForgePreviewSessionDriver;
  getSessionState: () => SpectralForgePreviewSessionState;
  transportPrewarmState: SpectralForgeTransportPrewarmState;
  getTransportPreparedPayload: <Payload>(requestKey: string) => Payload | null;
  rememberTransportPreparedPayload: <Payload>(
    requestKey: string,
    payload: Payload,
  ) => void;
  clearTransportPreparedPayload: (requestKey?: string) => void;
  setTransportPreparedRequestKey: (
    requestKey: string | null | ((current: string | null) => string | null),
  ) => void;
  setTransportPrewarmRendering: (rendering: boolean) => void;
  setTransportPrewarmProgress: (progress: number) => void;
  isSerialPrewarmInFlight: () => boolean;
  beginTransportSerialPrewarmRun: () => boolean;
  finishTransportSerialPrewarmRun: () => boolean;
  requestTransportSerialPrewarmRerun: () => void;
  requestTransportSerialPrewarmRerunIfInFlight: () => boolean;
  hasSerialPrewarmRerun: () => boolean;
  consumeSerialPrewarmRerun: () => boolean;
  beginTransportPrewarmSchedule: () => number;
  isCurrentTransportPrewarmSchedule: (token: number) => boolean;
  setTransportPrewarmTimer: (timer: number | null) => void;
  clearTransportPrewarmTimer: () => void;
  beginGeneration: () => number;
  isCurrentGeneration: (generation: number) => boolean;
  getPreparedEntry: (requestKey: string) => PreparedEntry | null;
  rememberPreparedEntry: (requestKey: string, entry: PreparedEntry) => void;
  getOrStartInflight: (
    requestKey: string,
    startPrewarm: () => Promise<PrewarmResult>,
    onStart?: () => void,
  ) => Promise<PrewarmResult>;
};

export function useSpectralForgePreviewSession<
  PreparedEntry extends SpectralForgePreviewPreparedEntry =
    SpectralForgePreviewPreparedEntry,
  PrewarmResult = unknown,
>(
  options: UseSpectralForgePreviewSessionOptions = {},
): UseSpectralForgePreviewSessionResult<PreparedEntry, PrewarmResult> {
  const maxPreparedEntries =
    options.maxPreparedEntries ??
    SPECTRAL_FORGE_PREVIEW_PREPARED_CACHE_MAX_ENTRIES;
  const sessionStateRef = useRef<SpectralForgePreviewSessionState>({
    kind: "idle",
  });
  const currentRequestRef = useRef<SpectralForgePreviewRequest | null>(null);
  const {
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
  } = useTransportPrewarmOrchestrator();
  const generationRef = useRef(0);
  const preparedByRequestKeyRef = useRef(new Map<string, PreparedEntry>());
  const inflightByRequestKeyRef = useRef(
    new Map<string, Promise<PrewarmResult>>(),
  );

  const recordEvent = useCallback((event: SpectralForgePreviewSessionEvent) => {
    sessionStateRef.current = reduceSpectralForgePreviewSession(
      sessionStateRef.current,
      event,
    );
  }, []);

  const getSessionState = useCallback(() => sessionStateRef.current, []);
  const getCurrentRequest = useCallback(() => currentRequestRef.current, []);

  const scheduleRequest = useCallback(
    (request: SpectralForgePreviewScheduleRequest) => {
      recordEvent({
        type: "schedule",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
        reason: request.reason,
      });
    },
    [recordEvent],
  );

  const markPrewarmStart = useCallback(
    (request: SpectralForgePreviewRequestIdentity) => {
      recordEvent({
        type: "prewarmStart",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
      });
    },
    [recordEvent],
  );

  const markPrewarmProgress = useCallback(
    (request: SpectralForgePreviewRequestIdentity & { progress: number }) => {
      recordEvent({
        type: "prewarmProgress",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
        progress: request.progress,
      });
    },
    [recordEvent],
  );

  const markReady = useCallback(
    (request: SpectralForgePreviewRequestIdentity & { cacheHit: boolean }) => {
      recordEvent({
        type: "ready",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
        cacheHit: request.cacheHit,
      });
    },
    [recordEvent],
  );

  const markStale = useCallback(
    (request: {
      previousKey: string;
      currentKey: string;
      routeKind: SpectralForgePreviewSessionEvent["routeKind"];
    }) => {
      recordEvent({
        type: "staleResult",
        previousKey: request.previousKey,
        currentKey: request.currentKey,
        routeKind: request.routeKind,
      });
    },
    [recordEvent],
  );

  const markError = useCallback(
    (request: {
      requestKey?: string;
      routeKind: SpectralForgePreviewSessionEvent["routeKind"];
      message: string;
    }) => {
      recordEvent({
        type: "error",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
        message: request.message,
      });
    },
    [recordEvent],
  );

  const markPlaying = useCallback(
    (request: SpectralForgePreviewRequestIdentity & { loop: boolean }) => {
      recordEvent({
        type: "playStart",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
        loop: request.loop,
      });
    },
    [recordEvent],
  );

  const markPlayEnded = useCallback(
    (request: SpectralForgePreviewRequestIdentity) => {
      recordEvent({
        type: "playEnd",
        requestKey: request.requestKey,
        routeKind: request.routeKind,
      });
    },
    [recordEvent],
  );

  const beginGeneration = useCallback(() => {
    generationRef.current += 1;
    return generationRef.current;
  }, []);

  const isCurrentGeneration = useCallback(
    (generation: number) => generationRef.current === generation,
    [],
  );

  const getPreparedEntry = useCallback(
    (requestKey: string) =>
      preparedByRequestKeyRef.current.get(requestKey) ?? null,
    [],
  );

  const rememberPreparedEntry = useCallback(
    (requestKey: string, entry: PreparedEntry) => {
      preparedByRequestKeyRef.current.set(requestKey, entry);
      trimPreparedPreviewCache(
        preparedByRequestKeyRef.current,
        maxPreparedEntries,
      );
    },
    [maxPreparedEntries],
  );

  const getOrStartInflight = useCallback(
    (
      requestKey: string,
      startPrewarm: () => Promise<PrewarmResult>,
      onStart?: () => void,
    ) => {
      const existing = inflightByRequestKeyRef.current.get(requestKey);
      if (existing) return existing;

      onStart?.();
      const started = startPrewarm().finally(() => {
        inflightByRequestKeyRef.current.delete(requestKey);
      });
      inflightByRequestKeyRef.current.set(requestKey, started);
      return started;
    },
    [],
  );

  const requestMatchesCurrent = useCallback(
    (request: SpectralForgePreviewRequest) => {
      const current = currentRequestRef.current;
      return (
        !!current &&
        current.identity.requestKey === request.identity.requestKey &&
        current.identity.routeKind === request.identity.routeKind
      );
    },
    [],
  );

  const previewSessionDriver = useMemo<SpectralForgePreviewSessionDriver>(
    () => ({
      getState: getSessionState,
      getCurrentRequest,
      isCurrentRequest: requestMatchesCurrent,
      schedule: (request: SpectralForgePreviewRequest) => {
        currentRequestRef.current = request;
        scheduleRequest({ ...request.identity, reason: request.reason });
      },
      beginPrewarm: (request: SpectralForgePreviewRequest) => {
        if (!requestMatchesCurrent(request)) {
          const current = currentRequestRef.current;
          if (current) {
            markStale({
              previousKey: request.identity.requestKey,
              currentKey: current.identity.requestKey,
              routeKind: request.identity.routeKind,
            });
          }
          return false;
        }
        markPrewarmStart(request.identity);
        return true;
      },
      reportProgress: (
        request: SpectralForgePreviewRequest,
        progress: number,
      ) => {
        if (!requestMatchesCurrent(request)) return;
        markPrewarmProgress({ ...request.identity, progress });
      },
      markReady: (request: SpectralForgePreviewRequest, cacheHit: boolean) => {
        if (!requestMatchesCurrent(request)) return;
        markReady({ ...request.identity, cacheHit });
      },
      markStale: (request: SpectralForgePreviewRequest) => {
        const current = currentRequestRef.current;
        if (!current) return;
        markStale({
          previousKey: request.identity.requestKey,
          currentKey: current.identity.requestKey,
          routeKind: request.identity.routeKind,
        });
      },
      markError: (request: SpectralForgePreviewRequest, message: string) => {
        if (!requestMatchesCurrent(request)) return;
        markError({ ...request.identity, message });
      },
      canPlay: (request: SpectralForgePreviewRequest) => {
        const state = getSessionState();
        return (
          requestMatchesCurrent(request) &&
          (state.kind === "ready" || state.kind === "playing") &&
          state.routeKind === request.identity.routeKind &&
          state.requestKey === request.identity.requestKey
        );
      },
      markPlaying: (request: SpectralForgePreviewRequest) => {
        if (!requestMatchesCurrent(request)) return;
        markPlaying({ ...request.identity, loop: request.loopPreview });
      },
      markPlayEnded: (request: SpectralForgePreviewRequest) => {
        if (!requestMatchesCurrent(request)) return;
        markPlayEnded(request.identity);
      },
    }),
    [
      getCurrentRequest,
      getSessionState,
      markError,
      markPlaying,
      markPlayEnded,
      markPrewarmProgress,
      markPrewarmStart,
      markReady,
      markStale,
      requestMatchesCurrent,
      scheduleRequest,
    ],
  );

  return {
    recordEvent,
    scheduleRequest,
    markPrewarmStart,
    markPrewarmProgress,
    markReady,
    markStale,
    markError,
    markPlaying,
    markPlayEnded,
    previewSessionDriver,
    getSessionState,
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
    beginGeneration,
    isCurrentGeneration,
    getPreparedEntry,
    rememberPreparedEntry,
    getOrStartInflight,
  };
}
