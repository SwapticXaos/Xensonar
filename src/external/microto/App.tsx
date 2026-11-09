import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./app/AppShell";
import { AppRoomContent } from "./app/AppRoomContent";
import { DiagnosticsHUD } from "./app/components/DiagnosticsHUD";
import { type Room, TOP_NAV_ROOMS } from "./app/roomRegistry";
import type { InputLogEntry } from "./shared/input/useRoomInput";
import type { EnsureAudio } from "./shared/audio/audioInit";
import { AUDIO_INIT_FAILED } from "./app/copy";
import { clampFreq, createBoundGridHelpers } from "./shared/tuning/grid";
import { createTonePlayer } from "./features/audio";
import { createTuningGridConfig, type ResonanceState } from "./features/resonance/runtimeConfig";
import { getQuantizeSlice } from "./features/resonance/config/stateSlices";
import { findQuantizeMacroPresetForParams } from "./features/resonance/config/quantizePresets";
import { consumeWorldShareHash } from "./domain/harmonicWorldShareLink";
import {
  loadWorldSetlist,
  WORLD_SETLIST_STORAGE_KEY,
  type WorldSetlist,
} from "./domain/worldSetlist";
import { useResonanceStateAPI } from "./features/resonance/useResonanceStateAPI";
import { usePresetHandlers } from "./features/resonance/usePresetHandlers";
import { useResonance } from "./features/resonance/useResonance";
import { useArenaLoop } from "./features/arena/useArenaLoop";
import { useInputRouter, type KeymapRegistryRef, type KeymapRegistryEntry, type GlobalShortcutHandler } from "./features/input/useInputRouter";
import { useGlobalShortcuts } from "./features/input/useGlobalShortcuts";
import { getPerformanceRecorder } from "./features/runtime/performanceRecorder";
import { installDevNodeCounter } from "./features/runtime/audioNodeCount";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./shared/canvasConstants";
import { useHarmonicWorldRuntime } from "./features/harmonicWorldRuntime";
import { setLastContentRoom } from "./app/sessionMemory";
import { useAppHarmonicWorldHandlers } from "./app/useAppHarmonicWorldHandlers";
import type { CopyWorldRef } from "./app/components/AppShellHarmonicWorldHud";
import { useStorageKeyListener } from "./shared/browser/useStorageKeyListener";
import { getRandomDiscoveryRatio } from "./domain/signatureIntervals";

/** Room runtimes follow the lifecycle contract in roomLifecycle.ts and docu/Room-lifecycle-contract-v1.md (init/mount/unmount/cleanup). */

/** Single logger for room input events; passed to all rooms that support onInputEvent. Shape must match what useRoomInput emits and performanceRecorder.logEvent expects. */
const logInputEvent = (entry: InputLogEntry) => getPerformanceRecorder().logEvent(entry);

export function App() {
  const [room, setRoom] = useState<Room>("MAIN");
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [toast, setToast] = useState<null | { message: string; kind?: "info" | "success" | "error" }>(null);
  const showToast = useCallback((message: string, kind?: "success" | "error" | "info") => {
    setToast({ message, kind });
  }, []);

  const gridHelpers = useMemo(
    () => createBoundGridHelpers(createTuningGridConfig(CANVAS_HEIGHT)),
    [],
  );

  /** Resonance state facade: single entry point for read (snapshot) + write (update) with constraints. */
  const resonanceStateAPI = useResonanceStateAPI();
  const { nexusParamsRef, nParamsUI, update: updateNParams } = resonanceStateAPI;

  const { savePreset, loadPreset } = usePresetHandlers({ nexusParamsRef, update: updateNParams });

  /** Narrow ref for Topology only (quantize slice); keeps topology decoupled from full resonance state. */
  const topologyQuantizeRef = useRef<Pick<ResonanceState, "quantizeOn" | "quantizeBpm" | "quantizeSubdivision">>(
    (() => {
      const q = getQuantizeSlice(nexusParamsRef);
      return { quantizeOn: q.quantizeOn, quantizeBpm: q.quantizeBpm, quantizeSubdivision: q.quantizeSubdivision };
    })(),
  );
  useEffect(() => {
    const q = getQuantizeSlice(nexusParamsRef);
    topologyQuantizeRef.current = { quantizeOn: q.quantizeOn, quantizeBpm: q.quantizeBpm, quantizeSubdivision: q.quantizeSubdivision };
  }, [nParamsUI]);

  const initAudio: EnsureAudio = async () => {
    try {
      setAudioError(null);
      if (!audioCtx) {
        const ctx = new window.AudioContext();
        installDevNodeCounter(ctx);
        await ctx.resume();
        setAudioCtx(ctx);
        return ctx;
      }
      if (audioCtx.state !== "running") {
        await audioCtx.resume();
      }
      return audioCtx;
    } catch {
      setAudioError(AUDIO_INIT_FAILED);
      return null;
    }
  };

  const playScheduledTone = useMemo(
    () => createTonePlayer(() => audioCtx),
    [audioCtx],
  );

  /** Single input router: one key/pointer listener; global shortcuts run first via ref, then room handlers (vision §8). */
  const keymapRegistryRef: KeymapRegistryRef = useRef<Partial<Record<Room, KeymapRegistryEntry>>>({});
  const globalShortcutHandlerRef = useRef<GlobalShortcutHandler | null>(null);
  const legendToggleRef = useRef<(() => void) | null>(null);
  const firstRunDismissRef = useRef<(() => void) | null>(null);
  useInputRouter(room, keymapRegistryRef, { onInputEvent: logInputEvent, globalShortcutHandlerRef });

  /** Ref for global Copy world shortcut; HUD sets it when mounted (vision §3 §5). */
  const copyWorldRef = useRef<CopyWorldRef>(null);
  /** Ref for global Surprise me shortcut (Ctrl+Shift+S); HUD sets it when mounted (vision §5). */
  const surpriseWorldRef = useRef<(() => void) | null>(null);
  const signatureShortcutRef = useRef<{ goToSignatureIndex: (i: number) => void; goToRatio?: (ratio: number) => void } | null>(null);
  /** When user clicks "Go to interval" in shell while not in Synth, we switch to RESONANCE and run go-to after mount. */
  const pendingSignatureRef = useRef<number | null>(null);
  /** When user clicks "Surprise interval" while not in Synth, we switch to RESONANCE and apply this ratio after mount. */
  const pendingSurpriseRatioRef = useRef<number | null>(null);

  /** Session memory: persist last-visited content room so user can resume in one click (vision §5 discoverability). */
  useEffect(() => {
    setLastContentRoom(room);
  }, [room]);

  /** Performance setlist: ordered list of worlds for next/prev during a set (vision §2 §3). */
  const [setlist, setSetlist] = useState<WorldSetlist>(() => loadWorldSetlist());

  useStorageKeyListener(WORLD_SETLIST_STORAGE_KEY, () => setSetlist(loadWorldSetlist()));

  const { gameActive, gameHud, gameCanvasRef, startGameRun, enterArenaWorkspace } = useArenaLoop({
    room,
    setRoom,
    initAudio,
    playScheduledTone,
    clampFreq,
    gameWidth: CANVAS_WIDTH,
    gameHeight: CANVAS_HEIGHT,
    onInputEvent: logInputEvent,
    keymapRegistryRef,
  });

  const { resonanceRoomProps, liveCursorInterval } = useResonance({
    room,
    setRoom,
    audioCtx,
    nexusParamsRef,
    nParamsUI,
    updateNParams,
    savePreset,
    loadPreset,
    initAudio,
    enterArenaWorkspace,
    gameWidth: CANVAS_WIDTH,
    gameHeight: CANVAS_HEIGHT,
    logInputEvent,
    gridHelpers,
    keymapRegistryRef,
    signatureShortcutRef,
    pendingSignatureRef,
    pendingSurpriseRatioRef,
  });

  /** Shell "Go to interval" (vision §3 §5): if in Synth run immediately; else open Synth and run after mount. */
  const handleRequestSignatureGo = useCallback(
    (index: number) => {
      if (room === "RESONANCE") {
        signatureShortcutRef.current?.goToSignatureIndex(index);
        return;
      }
      initAudio()
        .then(() => {
          setRoom("RESONANCE");
          pendingSignatureRef.current = index;
        })
        .catch(() => {
          showToast("Could not start audio", "error");
        });
    },
    [room, setRoom, initAudio, showToast],
  );

  /** Shell "Surprise interval" (vision §3 exploratory): jump to a random discovery ratio; opens Synth if needed. */
  const handleSurpriseInterval = useCallback(() => {
    const ratio = getRandomDiscoveryRatio();
    if (room === "RESONANCE") {
      signatureShortcutRef.current?.goToRatio?.(ratio);
      return;
    }
    initAudio()
      .then(() => {
        pendingSurpriseRatioRef.current = ratio;
        setRoom("RESONANCE");
      })
      .catch(() => {
        showToast("Could not start audio", "error");
      });
  }, [room, setRoom, initAudio, showToast]);

  /** Shell "Featured interval" Go: jump to a given ratio; opens Synth if needed (vision §3 §5 discoverability). */
  const handleGoToInterval = useCallback(
    (ratio: number) => {
      if (room === "RESONANCE") {
        signatureShortcutRef.current?.goToRatio?.(ratio);
        return;
      }
      initAudio()
        .then(() => {
          pendingSurpriseRatioRef.current = ratio;
          setRoom("RESONANCE");
        })
        .catch(() => {
          showToast("Could not start audio", "error");
        });
    },
    [room, setRoom, initAudio, showToast],
  );
  const {
    globalHarmonicContext,
    currentScene,
    harmonicWorld,
    selectScene,
    importWorld,
  } = useHarmonicWorldRuntime({
    nexusParamsRef,
    nParamsUI,
    updateNParams,
  });

  /** Current quantize/groove preset label for shell HUD (vision §5 discoverability; reflects Ctrl+Q cycle). */
  const currentQuantizePresetLabel = useMemo(() => {
    const s = nexusParamsRef.current;
    const preset = findQuantizeMacroPresetForParams({
      quantizeSubdivision: s.quantizeSubdivision,
      quantizeMicroTightness: s.quantizeMicroTightness,
      harmonyCascadeSteps: s.harmonyCascadeSteps,
    });
    return preset?.label ?? null;
  }, [nParamsUI, nexusParamsRef]);

  const handlers = useAppHarmonicWorldHandlers({
    setRoom,
    initAudio,
    selectScene,
    importWorld,
    currentScene,
    nexusParamsRef,
    updateNParams,
    setlist,
    setSetlist,
    showToast,
    audioCtx,
    playScheduledTone,
    harmonicWorld,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash ?? "";
    const isShareHash = hash.startsWith("#world=");
    const result = consumeWorldShareHash(hash);
    if (result.ok) {
      handlers.handleImportWorldRef.current(result.data);
      setToast({ message: "Loaded shared world", kind: "success" });
    } else if (isShareHash) {
      setToast({ message: "Invalid share link", kind: "error" });
    } else return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, [handlers.handleImportWorldRef]);

  useGlobalShortcuts({
    handlerRef: globalShortcutHandlerRef,
    topNavRooms: TOP_NAV_ROOMS,
    setRoom,
    legendToggleRef,
    firstRunDismissRef,
    copyWorldRef,
    surpriseWorldRef,
    onSurpriseScene: handlers.handleSurpriseScene,
    onSurpriseSimilarScene: handlers.handleSurpriseSimilarScene,
    onSurpriseGoal: handlers.handleSurpriseGoal,
    onSurpriseFlow: handlers.handleSurpriseFlow,
    setlistNext: handlers.handleSetlistNext,
    setlistPrev: handlers.handleSetlistPrev,
    onAddCurrentToSetlistRef: handlers.addCurrentToSetlistRef,
    onCycleQuantizeNext: () => handlers.cycleQuantizePreset("next"),
    onCycleQuantizePrev: () => handlers.cycleQuantizePreset("prev"),
    onNextInGoal: handlers.handleNextInGoal,
    onNextScene: handlers.handleNextScene,
    onPrevScene: handlers.handlePrevScene,
    signatureShortcutRef,
    onSceneJumpByIndex: handlers.handleSceneJumpByIndex,
  });

  /** Explicit global-root API for rooms like Tuning Lab: clamp to a reasonable range and delegate to updateNParams. */
  const setGlobalRootHz = (hz: number) => {
    const clamped = clampFreq(hz, 16, 4096);
    updateNParams({ gridBase: clamped });
  };

  return (
    <AppShell
      room={room}
      onSelectRoom={setRoom}
      audioCtx={audioCtx}
      onEnableAudio={initAudio}
      audioError={audioError}
      toast={toast}
      onDismissToast={() => setToast(null)}
      onShowToast={showToast}
      globalHarmonicContext={globalHarmonicContext}
      onSetBaseFreq={setGlobalRootHz}
      currentSceneId={currentScene?.id}
      currentSceneLabel={currentScene?.label}
      scenePosition={handlers.scenePosition}
      harmonicWorld={harmonicWorld}
      onPreviewWorldTone={handlers.handlePreviewWorldTone}
      onSelectResonanceScene={handlers.handleSelectResonanceScene}
      onImportWorld={handlers.handleImportWorld}
      copyWorldRef={copyWorldRef}
      surpriseWorldRef={surpriseWorldRef}
      onSurpriseScene={handlers.handleSurpriseScene}
      onSurpriseSimilarScene={handlers.handleSurpriseSimilarScene}
      setlist={setlist}
      onSetlistNext={handlers.handleSetlistNext}
      onSetlistPrev={handlers.handleSetlistPrev}
      onAddCurrentToSetlist={handlers.handleAddCurrentToSetlist}
      onRemoveFromSetlist={handlers.handleRemoveFromSetlist}
      onSetlistSlotSelect={handlers.handleSetlistSlotSelect}
      liveCursorInterval={liveCursorInterval}
      currentQuantizePresetLabel={currentQuantizePresetLabel}
      legendToggleRef={legendToggleRef}
      onRequestSignatureGo={handleRequestSignatureGo}
      onSurpriseInterval={handleSurpriseInterval}
      onRequestFeaturedGo={handleGoToInterval}
      onPreviewInterval={handlers.handlePreviewInterval}
    >
      <AppRoomContent
        room={room}
        setRoom={setRoom}
        logInputEvent={logInputEvent}
        keymapRegistryRef={keymapRegistryRef}
        firstRunDismissRef={firstRunDismissRef}
        audioCtx={audioCtx}
        initAudio={initAudio}
        topologyQuantizeRef={topologyQuantizeRef}
        globalHarmonicContext={globalHarmonicContext}
        harmonicWorld={harmonicWorld}
        setGlobalRootHz={setGlobalRootHz}
        onSelectResonanceScene={handlers.handleSelectResonanceScene}
        onImportWorld={handlers.handleImportWorld}
        onPreviewWorldTone={handlers.handlePreviewWorldTone}
        gameActive={gameActive}
        gameHud={gameHud}
        startGameRun={startGameRun}
        gameCanvasRef={gameCanvasRef}
        gameWidth={CANVAS_WIDTH}
        gameHeight={CANVAS_HEIGHT}
        resonanceRoomProps={resonanceRoomProps}
      />
      <DiagnosticsHUD room={room} audioCtx={audioCtx} />
    </AppShell>
  );
}
