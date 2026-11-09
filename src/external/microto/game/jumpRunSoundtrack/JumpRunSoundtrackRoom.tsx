import * as React from 'react';
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { RoomRecommendedWorldsStrip } from "../../app/components/RoomRecommendedWorldsStrip";
import { StandaloneRoomFrame } from "../../app/components/StandaloneRoomFrame";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";
import { type Room } from "../../app/roomRegistry";
import type { HarmonicWorld,HarmonicWorldExport } from "../../domain/harmonicWorld";
import type { KeymapRegistryRef } from "../../features/input/useInputRouter";
import type { UseKeymapRegistrationHandlers } from "../../features/input/useKeymapRegistration";
import type { GlobalHarmonicContext } from "../../features/resonance/config/stateSlices";
import { useRoomFirstRunHint } from "../../features/runtime/useRoomFirstRunHint";
import { useStandaloneRoomRuntime } from "../../features/runtime/useStandaloneRoomRuntime";
import { buildPlatformerLoopExport,buildPlatformerMelodicLoopSeedExport } from "../../integrations/xensonar/microtoLoopExport";
import type { MicrotoMelodicLoopSeedExportHandler,MicrotoXensonarLoopExportHandler } from "../../integrations/xensonar/types";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { type InputLogEntry } from "../../shared/input/useRoomInput";
import type {
MovementEvent,
PlatformerArrangementForm,
PlatformerArrangementMode,
PlatformerTuningMode
} from "./platformerArrangement";
import { BAR_COUNT } from "./platformerArrangement";
import { createPlatformerAudioApi,type MusicState,type PlatformerAudioApi } from "./platformerAudio";
import { emptyPlatformerComposerPreview,type PlatformerComposerPreview } from "./platformerComposerPreview";
import { PlatformerControlPanel } from "./PlatformerControlPanel";
import { drawPlatformerFrame } from "./platformerDraw";
import { mapWorldToPlatformerView } from "./platformerHarmonicAdapter";
import { PlatformerHUDGrid } from "./PlatformerHUDGrid";
import { createResetPlatformerHud } from "./platformerHudHelpers";
import { platformerKeyLookup } from "./platformerKeymap";
import { PlatformerLivePreview } from "./PlatformerLivePreview";
import { listPlatformerCompositionPresets,type PlatformerCompositionPresetItem } from "./platformerPresetPersistence";
import { formatPlatformerSectionBias,type PlatformerSectionBias } from "./platformerSectionBias";
import {
createCoins,
createComposerObstacles,
createInitialState,
createPlatforms,
VIEW_H,
VIEW_W,
type SimState,
} from "./platformerState";
import { tickPlatformer } from "./platformerTick";
import { usePlatformerPresetHandlers } from "./usePlatformerPresetHandlers";

export type JumpRunSoundtrackRoomProps = {
  room: Room;
  onBack: () => void;
  /** When provided, the room uses this context instead of creating its own (vision: one enable from any room). */
  audioCtx?: AudioContext | null;
  /** When provided and no running context yet, called to enable audio (e.g. App’s initAudio). Returned context is used. */
  onEnableAudio?: EnsureAudio;
  /** Optional: log input events for session capture (exploratory instrument). */
  onInputEvent?: (entry: InputLogEntry) => void;
  /** When provided, PLATFORMER registers with global input router (vision §8). */
  keymapRegistryRef?: KeymapRegistryRef;
  /** Optional shared harmonic context for HUD (root/tuning from Resonance). */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional shared harmonic world view-model for HUD and future tuning integration. */
  harmonicWorld?: HarmonicWorld | null;
  /** Optional: load a harmonic world (enables "Recommended for this room" strip). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** Optional bridge for the external Xensonar slot. When absent, export falls back to WAV download. */
  onExportLoopToXensonar?: MicrotoXensonarLoopExportHandler;
  /** Optional bridge into SpectralForge. Legacy callback name retained for compatibility. */
  onExportLoopToForge1?: MicrotoXensonarLoopExportHandler;
  /** Optional bridge into SyntheticForge wave/material flow. Legacy callback name retained for compatibility. */
  onExportLoopToForge2?: MicrotoXensonarLoopExportHandler;
  /** Optional seed bridge into SyntheticForge · Melodic Loop. */
  onExportSeedToMelodicLoop?: MicrotoMelodicLoopSeedExportHandler;
  /** When set, first-run dismiss is routed via global keydown (vision §8). */
  firstRunDismissRef?: React.MutableRefObject<(() => void) | null>;
};

const EMPTY_COMPOSER_PREVIEW: PlatformerComposerPreview = emptyPlatformerComposerPreview();

export function JumpRunSoundtrackRoom({
  room,
  onBack,
  audioCtx,
  onEnableAudio,
  onInputEvent,
  keymapRegistryRef,
  globalHarmonicContext,
  harmonicWorld,
  onImportWorld,
  onExportLoopToXensonar,
  onExportLoopToForge1,
  onExportLoopToForge2,
  onExportSeedToMelodicLoop,
  firstRunDismissRef,
}: JumpRunSoundtrackRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { firstRunHint, showFirstRunHint } = useRoomFirstRunHint("PLATFORMER", {
    dismissOnGlobalInput: true,
    firstRunDismissRef,
  });
  const platforms = useMemo(() => createPlatforms(), []);
  const baseCoins = useMemo(() => createCoins(platforms), [platforms]);
  const baseComposerObstacles = useMemo(() => createComposerObstacles(platforms), [platforms]);

  const simRef = useRef<SimState>(createInitialState(baseCoins, baseComposerObstacles, platforms));
  const apiRef = useRef<PlatformerAudioApi | null>(null);
  const musicRef = useRef<MusicState>({
    ctx: null,
    master: null,
    filter: null,
    phrase: [0, 3, 7, 10],
    nextComposerAt: 0,
    composerStep: 0,
    lastFootAt: 0,
    completionPhrase: [],
    nextCompletionAt: 0,
    completionStep: 0,
    completionLoopArmed: false,
    completionTheme: null,
    completionIntroPattern: null,
    nextCompletionIntroAt: 0,
    completionIntroStep: 0,
    completionIntroComplete: false,
    nextMotionSampleAt: 0,
    motionSampleIndex: 0,
    lastMovementTime: 0,
    lastMotionDir: 0,
    eventOrdinal: 0,
    movementEvents: [] as MovementEvent[],
    completionPattern: null,
    completionArrangement: null,
    completionCyclePattern: null,
    completionCycleKey: "",
    lastLevelMemory: null,
    lastLevelMemoryCapturedAt: undefined,
  });

  const [running, setRunning] = useState(false);
  const [bpm, setBpm] = useState(110);
  const [masterVolume, setMasterVolume] = useState(0.58);
  const [tuningMode, setTuningMode] = useState<PlatformerTuningMode>("12edo");
  const [arrangementMode, setArrangementMode] = useState<PlatformerArrangementMode>("balanced");
  const [formMode, setFormMode] = useState<PlatformerArrangementForm>("auto");
  const [sectionBias, setSectionBias] = useState<PlatformerSectionBias>("auto");
  const [evolutionDepth, setEvolutionDepth] = useState(0.68);
  const [tempoFollow, setTempoFollow] = useState(0.62);
  const [composerOn, setComposerOn] = useState(true);
  const [presetName, setPresetName] = useState("Session Loop");
  const [libraryTransfer, setLibraryTransfer] = useState("");
  const [presetItems, setPresetItems] = useState<PlatformerCompositionPresetItem[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [composerPreview, setComposerPreview] = useState<PlatformerComposerPreview>(EMPTY_COMPOSER_PREVIEW);
  const [xensonarExportBars, setXensonarExportBars] = useState(BAR_COUNT);
  const [completionPromptVisible, setCompletionPromptVisible] = useState(false);
  const completionPromptShownRef = useRef(false);
  const [xensonarExportBusy, setXensonarExportBusy] = useState(false);
  const [xensonarExportStatus, setXensonarExportStatus] = useState("Noch kein Xensonar-Loop exportiert.");
  const [hud, setHud] = useState(() =>
    createResetPlatformerHud({
      totalCoins: baseCoins.length,
      sectionBias: "AUTO",
      tuning: "12edo",
      arrangement: "balanced",
      formMode: "auto",
      evolution: 0.68,
      tempoFollow: 0.62,
      status: "Runner bereit",
    }),
  );

  const platformerApi = useMemo(
    () =>
      createPlatformerAudioApi({
        musicRef,
        masterVolume,
        tuningMode,
        arrangementMode,
        formMode,
        sectionBias,
        evolutionDepth,
        tempoFollow,
        audioCtx,
        onEnableAudio,
      }),
    [masterVolume, tuningMode, arrangementMode, formMode, sectionBias, evolutionDepth, tempoFollow, audioCtx, onEnableAudio],
  );

  useEffect(() => {
    apiRef.current = platformerApi;
  }, [platformerApi]);

  useEffect(() => {
    setComposerPreview(platformerApi.getComposerPreview(bpm));
  }, [platformerApi, bpm]);

  const refreshPresetLibrary = useCallback(() => {
    const items = listPlatformerCompositionPresets();
    setPresetItems(items);
    setSelectedPresetId((prev) => {
      if (items.length === 0) return "";
      if (prev && items.some((item) => item.id === prev)) return prev;
      return items[0].id;
    });
  }, []);

  useEffect(() => {
    refreshPresetLibrary();
  }, [refreshPresetLibrary]);

  const {
    saveCompositionPreset,
    loadCompositionPreset,
    deleteSelectedCompositionPreset,
    clearCompositionPresetLibrary,
    exportCompositionLibrary,
    copyCompositionLibraryToClipboard,
    importCompositionLibrary,
  } = usePlatformerPresetHandlers({
    simRef,
    musicRef,
    apiRef,
    baseCoins,
    baseComposerObstacles,
    platforms,
    presetName,
    selectedPresetId,
    presetItems,
    libraryTransfer,
    tuningMode,
    arrangementMode,
    formMode,
    sectionBias,
    evolutionDepth,
    tempoFollow,
    bpm,
    masterVolume,
    composerOn,
    setHud,
    setComposerPreview: (preview: unknown) => setComposerPreview(preview as PlatformerComposerPreview),
    setRunning,
    setPresetName,
    setSelectedPresetId,
    setPresetItems,
    setLibraryTransfer,
    setTuningMode,
    setArrangementMode,
    setFormMode,
    setSectionBias,
    setEvolutionDepth,
    setTempoFollow,
    setBpm,
    setMasterVolume,
    setComposerOn,
  });

  const startRun = async () => {
    await platformerApi.ensureAudio();
    if (simRef.current.t <= 0.001) {
      platformerApi.resetCompositionCapture();
      setComposerPreview(EMPTY_COMPOSER_PREVIEW);
    }
    setRunning(true);
    setHud((prev) => ({ ...prev, status: "Run aktiv" }));
  };

  const startGameHero = async () => {
    if (simRef.current.win) {
      await resetRun();
    }
    await startRun();
  };

  const resetRun = async () => {
    await platformerApi.ensureAudio();
    simRef.current = createInitialState(baseCoins, baseComposerObstacles, platforms);
    platformerApi.resetCompositionCapture();
    musicRef.current.phrase = [0, 3, 7, 10];
    musicRef.current.composerStep = 0;
    musicRef.current.nextComposerAt = 0;
    setHud(
      createResetPlatformerHud({
        totalCoins: baseCoins.length,
        sectionBias: formatPlatformerSectionBias(sectionBias),
        tuning: tuningMode,
        arrangement: arrangementMode,
        formMode,
        evolution: evolutionDepth,
        tempoFollow,
      }),
    );
    completionPromptShownRef.current = false;
    setCompletionPromptVisible(false);
    setXensonarExportBars(BAR_COUNT);
    setComposerPreview(EMPTY_COMPOSER_PREVIEW);
  };

  const auditionSection = async (section: "A" | "B" | "C") => {
    await platformerApi.ensureAudio();
    const scheduled = platformerApi.auditionPreviewSection(section, bpm);
    setHud((prev) => ({
      ...prev,
      status: scheduled
        ? `Preview audition ${section}`
        : "Keine Preview-DNA fuer Audition",
    }));
  };

  const harmonicView = useMemo(
    () => mapWorldToPlatformerView(harmonicWorld, bpm),
    [harmonicWorld, bpm],
  );

  const auditionForm = async () => {
    await platformerApi.ensureAudio();
    const scheduled = platformerApi.auditionPreviewForm(bpm);
    setHud((prev) => ({
      ...prev,
      status: scheduled
        ? "Preview form audition"
        : "Keine Preview-DNA fuer Audition",
    }));
  };

  const buildCurrentLoopPayload = async () => buildPlatformerLoopExport({
    name: (presetName || "Jump Run Loop").trim() || "Jump Run Loop",
    bars: xensonarExportBars,
    bpm,
    movementEvents: musicRef.current.movementEvents,
    fallbackPhrase: musicRef.current.completionPhrase.length > 0
      ? musicRef.current.completionPhrase
      : musicRef.current.phrase,
    arrangementMode,
    formMode,
    sectionBias,
    tuningMode,
    evolutionDepth,
    masterVolume,
    harmonicWorld,
    rootHz: globalHarmonicContext?.baseFreq ?? harmonicWorld?.baseFreq ?? 110,
  });

  const downloadLoopPayload = async (payload: Awaited<ReturnType<typeof buildCurrentLoopPayload>>) => {
    const safeName = payload.name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-") || "jump-run-loop";
    const url = URL.createObjectURL(payload.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName}.wav`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };

  const exportLoopToXensonar = async () => {
    setXensonarExportBusy(true);
    try {
      const payload = await buildCurrentLoopPayload();

      if (onExportLoopToXensonar) {
        await onExportLoopToXensonar(payload);
        setXensonarExportStatus(`An Xensonar gesendet: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
      } else {
        await downloadLoopPayload(payload);
        setXensonarExportStatus(`Standalone-Bounce gespeichert: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
      }
    } catch (error) {
      setXensonarExportStatus(error instanceof Error ? error.message : "Xensonar-Export fehlgeschlagen.");
    } finally {
      setXensonarExportBusy(false);
    }
  };

  const exportLoopToForge1 = async () => {
    setXensonarExportBusy(true);
    try {
      const payload = await buildCurrentLoopPayload();
      if (onExportLoopToForge1) {
        await onExportLoopToForge1(payload);
        setXensonarExportStatus(`SpectralForge geöffnet: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
      } else {
        await downloadLoopPayload(payload);
        setXensonarExportStatus(`SpectralForge-Handoff nicht verfügbar. WAV gespeichert: ${payload.name}`);
      }
    } catch (error) {
      setXensonarExportStatus(error instanceof Error ? error.message : 'SpectralForge-Export fehlgeschlagen.');
    } finally {
      setXensonarExportBusy(false);
    }
  };

  const exportLoopToForge2 = async () => {
    setXensonarExportBusy(true);
    try {
      const payload = await buildCurrentLoopPayload();
      if (onExportLoopToForge2) {
        await onExportLoopToForge2(payload);
        setXensonarExportStatus(`SyntheticForge geöffnet: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
      } else {
        await downloadLoopPayload(payload);
        setXensonarExportStatus(`SyntheticForge-Handoff nicht verfügbar. WAV gespeichert: ${payload.name}`);
      }
    } catch (error) {
      setXensonarExportStatus(error instanceof Error ? error.message : 'SyntheticForge-Export fehlgeschlagen.');
    } finally {
      setXensonarExportBusy(false);
    }
  };

  const exportSeedToMelodicLoop = async () => {
    setXensonarExportBusy(true);
    try {
      const payload = buildPlatformerMelodicLoopSeedExport({
        name: (presetName || "Jump Run Loop").trim() || "Jump Run Loop",
        bars: xensonarExportBars,
        movementEvents: musicRef.current.movementEvents,
        fallbackPhrase: musicRef.current.completionPhrase.length > 0
          ? musicRef.current.completionPhrase
          : musicRef.current.phrase,
        arrangementMode,
        formMode,
        sectionBias,
        tuningMode,
        evolutionDepth,
        harmonicWorld,
        rootHz: globalHarmonicContext?.baseFreq ?? harmonicWorld?.baseFreq ?? 110,
      });
      if (onExportSeedToMelodicLoop) {
        await onExportSeedToMelodicLoop(payload);
        setXensonarExportStatus(`Melodic Loop geöffnet: ${payload.name} · ${payload.bars} Host-Bars · ${payload.movementEvents.length} Events`);
      } else {
        setXensonarExportStatus('Melodic-Loop-Seed ist nur im Xensonar-Dock aktiv.');
      }
    } catch (error) {
      setXensonarExportStatus(error instanceof Error ? error.message : 'Melodic-Loop-Export fehlgeschlagen.');
    } finally {
      setXensonarExportBusy(false);
    }
  };

  const downloadAudioLoop = async () => {
    setXensonarExportBusy(true);
    try {
      const payload = await buildCurrentLoopPayload();
      await downloadLoopPayload(payload);
      setXensonarExportStatus(`Audio gespeichert: ${payload.name} · ${payload.bars} Host-Bars · ${payload.durationSec.toFixed(2)} s`);
    } catch (error) {
      setXensonarExportStatus(error instanceof Error ? error.message : 'Audio-Download fehlgeschlagen.');
    } finally {
      setXensonarExportBusy(false);
    }
  };

  const confirmCompletionExport = async () => {
    await exportLoopToXensonar();
    setCompletionPromptVisible(false);
  };

  const confirmCompletionForge1Export = async () => {
    await exportLoopToForge1();
    setCompletionPromptVisible(false);
  };

  const confirmCompletionForge2Export = async () => {
    await exportLoopToForge2();
    setCompletionPromptVisible(false);
  };

  const confirmCompletionMelodicLoopExport = async () => {
    await exportSeedToMelodicLoop();
    setCompletionPromptVisible(false);
  };

  const confirmCompletionAudioDownload = async () => {
    await downloadAudioLoop();
    setCompletionPromptVisible(false);
  };

  useEffect(() => {
    const m = musicRef.current;
    // Rebuild arrangement from movement DNA when macro style controls change.
    m.completionArrangement = null;
    m.completionPattern = null;
    m.completionTheme = null;
    m.completionIntroPattern = null;
    m.nextCompletionIntroAt = 0;
    m.completionIntroStep = 0;
    m.completionIntroComplete = false;
    m.completionCyclePattern = null;
    m.completionCycleKey = "";
    m.nextCompletionAt = 0;
  }, [arrangementMode, formMode, sectionBias, evolutionDepth, tempoFollow]);

  useEffect(() => {
    if (!musicRef.current.master || !musicRef.current.ctx) return;
    musicRef.current.master.gain.setTargetAtTime(
      masterVolume,
      musicRef.current.ctx.currentTime,
      0.03,
    );
  }, [masterVolume]);

  const onKeyDown = (event: KeyboardEvent) => {
    const s = simRef.current;
    const action = platformerKeyLookup(event.key, event.code);
    if (!action) return;
    if (action === "left") s.keys.left = true;
    if (action === "right") s.keys.right = true;
    if (action === "jump") {
      s.keys.jump = true;
      s.player.jumpQueued = true;
      event.preventDefault();
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const s = simRef.current;
    const action = platformerKeyLookup(event.key, event.code);
    if (!action) return;
    if (action === "left") s.keys.left = false;
    if (action === "right") s.keys.right = false;
    if (action === "jump") s.keys.jump = false;
  };

  const update = useCallback(
    (dt: number) => {
      const wasWin = simRef.current.win;
      tickPlatformer(dt, {
        simRef,
        apiRef,
        musicRef,
        platforms,
        bpm,
        composerOn,
        tuningMode,
        arrangementMode,
        formMode,
        sectionBias,
        evolutionDepth,
        tempoFollow,
        onHudUpdate: setHud,
        onComposerPreview: setComposerPreview,
      });
      if (!wasWin && simRef.current.win && !completionPromptShownRef.current) {
        completionPromptShownRef.current = true;
        setXensonarExportBars(BAR_COUNT);
        setCompletionPromptVisible(true);
        setXensonarExportStatus(`FINISH erreicht: die Suite arbeitet in ${BAR_COUNT}-Takt-Abschnitten. Du kannst diesen Abschnitt jetzt direkt an Xensonar, zu SpectralForge, zu SyntheticForge oder als WAV senden.`);
      }
    },
    [platforms, bpm, composerOn, tuningMode, arrangementMode, formMode, sectionBias, evolutionDepth, tempoFollow],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      drawPlatformerFrame(ctx, simRef.current, platforms, composerPreview);
    },
    [platforms, composerPreview],
  );

  const keymapHandlers: UseKeymapRegistrationHandlers = { onKeyDown, onKeyUp };

  useStandaloneRoomRuntime({
    room,
    roomId: "PLATFORMER",
    canvasRef,
    active: running,
    keymapActive: room === "PLATFORMER",
    update,
    draw,
    inputHandlers: { onKeyDown, onKeyUp },
    inputOptions: onInputEvent ? { onInputEvent, useRouter: !!keymapRegistryRef } : { useRouter: !!keymapRegistryRef },
    registerRaf: true,
    inputActive: room === "PLATFORMER",
    lifecycle: { onUnmount: () => platformerApi.teardown() },
    keymapRegistryRef,
    keymapHandlers,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <StandaloneRoomFrame
        title="IV Xenpolar · Xenpolar 3"
        description="Run and jump through the level to sketch a harmonic route. Red coins fire major triads, blue coins answer in minor, mushrooms rotate the current mode, animal NPCs toss note-orbs from their own scale worlds, and a resonance gate turns the room into a compact metroidvania logic puzzle. Tarot-animal NPCs now mirror your telemetry through Loom-like draft verbs, while live playback folds the previous completed run back into the current score as a local generative echo before FINISH renders the full suite."
        onBack={onBack}
        backLabel="Zurueck zu Resonance"
        sectionClassName="border border-neutral-800 bg-black p-5"
        backButtonClassName="px-3 py-1 text-sm border border-neutral-700 text-neutral-200 hover:bg-neutral-900"
        titleClassName="text-2xl text-cyan-100"
        descriptionClassName="text-xs text-neutral-400 mt-1"
      >
        {showFirstRunHint && firstRunHint && (
          <p className="mb-3 text-sm text-neutral-300 border border-neutral-700 p-2 rounded">
            {firstRunHint}
          </p>
        )}
        <div className="mb-4 rounded-2xl border border-cyan-800/50 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(34,211,238,0.12),rgba(15,23,42,0.88))] p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Xenpolar zuerst</div>
              <div className="text-xl font-semibold text-cyan-50">Starte erst das Spiel, dann erst die Feinsteuerung.</div>
              <div className="text-sm leading-relaxed text-cyan-100/80">
                Dieser Raum wird schnell dicht. Darum liegt der Einstieg jetzt vorne: Run starten, kurz spielen, FINISH erreichen, dann den gebauten Soundtrack als 8-Takt-Körper an Xensonar schicken oder danach im kleinen Exportfeld weiterfeilen.
              </div>
            </div>
            <div className="flex min-w-[240px] flex-col gap-2 rounded-xl border border-cyan-700/50 bg-slate-950/70 p-3">
              <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400">Quick Start</div>
              <button
                type="button"
                onClick={() => void startGameHero()}
                className={`rounded-xl border px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-[1.01] ${running ? 'border-emerald-400 bg-emerald-700/50' : 'border-cyan-300 bg-cyan-500/80 hover:bg-cyan-400/90 animate-pulse'}`}
              >
                {running ? 'Run läuft' : 'Start Game'}
              </button>
              <div className="text-[11px] leading-relaxed text-cyan-100/75">
                FINISH baut die Suite. Der Transportbereich darunter bleibt für Presets, Export-Takte und spätere Korrekturen.
              </div>
            </div>
          </div>
        </div>

        <WorldSummaryHud
          world={harmonicWorld}
          slice={harmonicView.quantizeSlice}
          rootHz={globalHarmonicContext?.baseFreq}
          tuningLabel={harmonicView.tuningLabel}
          modeLabel={harmonicView.modeLabel}
          className="mb-2"
          worldHintChildren={
            <>
              Die Sprung-Route komponiert ihre Phrasen im aktiven Welt-Gitter: Coins, NPC-Orbs und Puzzle-Gates lesen
              dieselbe Harmonik wie Resonance und Topology, nur als Level-Soundtrack.
            </>
          }
        />
        <RoomRecommendedWorldsStrip
          room={room}
          onImportWorld={onImportWorld}
          harmonicWorld={harmonicWorld}
          limit={5}
          className="mb-2"
        />
        <div className="border border-neutral-800 bg-neutral-950 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={VIEW_W}
            height={VIEW_H}
            className="w-full h-auto block touch-none"
            onPointerDown={() => {
              void platformerApi.ensureAudio();
              if (!running) {
                setRunning(true);
              }
              simRef.current.player.jumpQueued = true;
            }}
          />
        </div>

        <PlatformerLivePreview
          composerPreview={composerPreview}
          onAuditionForm={auditionForm}
          onAuditionSection={auditionSection}
        />

        <PlatformerHUDGrid hud={hud} />

        {completionPromptVisible ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4 text-sm text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.3em] text-emerald-300">Soundtrack gebaut</div>
                <div className="text-lg font-semibold">Wohin soll der fertige Abschnitt jetzt gehen?</div>
                <div className="text-sm leading-relaxed text-emerald-100/80">
                  Die Finish-Suite läuft hier aus festen {BAR_COUNT} Taktabschnitten. Genau diese Spannweite ist jetzt als Default gesetzt. Du kannst denselben Abschnitt direkt an Xensonar senden, als Audio nach SpectralForge, als Audio oder Synth-Loop nach SyntheticForge weitergeben oder als WAV herunterladen.
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[42rem] lg:justify-end">
                <button
                  type="button"
                  onClick={() => void confirmCompletionExport()}
                  disabled={xensonarExportBusy}
                  className="rounded-xl border border-emerald-300 bg-emerald-400/90 px-4 py-2 font-semibold text-slate-950 shadow hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {xensonarExportBusy ? 'Bouncing…' : 'Direkt an Xensonar senden'}
                </button>
                <button
                  type="button"
                  onClick={() => void confirmCompletionForge1Export()}
                  disabled={xensonarExportBusy}
                  className="rounded-xl border border-sky-300 bg-sky-300/90 px-4 py-2 font-semibold text-slate-950 shadow hover:bg-sky-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {xensonarExportBusy ? 'Öffne…' : 'Zu SpectralForge'}
                </button>
                <button
                  type="button"
                  onClick={() => void confirmCompletionForge2Export()}
                  disabled={xensonarExportBusy}
                  className="rounded-xl border border-indigo-300 bg-indigo-300/90 px-4 py-2 font-semibold text-slate-950 shadow hover:bg-indigo-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {xensonarExportBusy ? 'Öffne…' : 'Zu SyntheticForge · Audio'}
                </button>
                {onExportSeedToMelodicLoop ? (
                  <button
                    type="button"
                    onClick={() => void confirmCompletionMelodicLoopExport()}
                    disabled={xensonarExportBusy}
                    className="rounded-xl border border-fuchsia-300 bg-fuchsia-300/90 px-4 py-2 font-semibold text-slate-950 shadow hover:bg-fuchsia-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {xensonarExportBusy ? 'Öffne…' : 'Zu SyntheticForge · Synth Loop'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void confirmCompletionAudioDownload()}
                  disabled={xensonarExportBusy}
                  className="rounded-xl border border-amber-300 bg-amber-300/90 px-4 py-2 font-semibold text-slate-950 shadow hover:bg-amber-200 disabled:cursor-wait disabled:opacity-60"
                >
                  {xensonarExportBusy ? 'Bouncing…' : 'Audio download'}
                </button>
                <button
                  type="button"
                  onClick={() => setCompletionPromptVisible(false)}
                  className="rounded-xl border border-emerald-700/70 px-4 py-2 text-emerald-100 hover:bg-emerald-950/40"
                >
                  Später
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <PlatformerControlPanel
          running={running}
          onStartRun={startRun}
          onPause={() => setRunning(false)}
          onResetRun={resetRun}
          presetName={presetName}
          onPresetNameChange={setPresetName}
          selectedPresetId={selectedPresetId}
          onSelectedPresetIdChange={setSelectedPresetId}
          presetItems={presetItems}
          onSavePreset={saveCompositionPreset}
          onLoadPreset={loadCompositionPreset}
          onDeletePreset={deleteSelectedCompositionPreset}
          onClearLibrary={clearCompositionPresetLibrary}
          libraryTransfer={libraryTransfer}
          onLibraryTransferChange={setLibraryTransfer}
          onExportLibrary={exportCompositionLibrary}
          onCopyLibraryToClipboard={copyCompositionLibraryToClipboard}
          onImportLibrary={importCompositionLibrary}
          bpm={bpm}
          onBpmChange={setBpm}
          masterVolume={masterVolume}
          onMasterVolumeChange={setMasterVolume}
          tuningMode={tuningMode}
          onTuningModeChange={setTuningMode}
          arrangementMode={arrangementMode}
          onArrangementModeChange={setArrangementMode}
          formMode={formMode}
          onFormModeChange={setFormMode}
          sectionBias={sectionBias}
          onSectionBiasChange={setSectionBias}
          evolutionDepth={evolutionDepth}
          onEvolutionDepthChange={setEvolutionDepth}
          tempoFollow={tempoFollow}
          onTempoFollowChange={setTempoFollow}
          composerOn={composerOn}
          onComposerOnChange={setComposerOn}
          xensonarExportBars={xensonarExportBars}
          onXensonarExportBarsChange={setXensonarExportBars}
          xensonarExportBusy={xensonarExportBusy}
          xensonarExportStatus={xensonarExportStatus}
          onExportLoopToXensonar={exportLoopToXensonar}
          onExportLoopToForge1={exportLoopToForge1}
          onExportLoopToForge2={exportLoopToForge2}
          onExportSeedToMelodicLoop={exportSeedToMelodicLoop}
          onDownloadAudio={downloadAudioLoop}
        />

        <div className="mt-4 border border-neutral-800 bg-black/40 p-3 text-xs text-neutral-400">
          <p className="mb-1">Controls: <kbd className="bg-neutral-800 px-1 rounded">A/D</kbd> or <kbd className="bg-neutral-800 px-1 rounded">Arrow Left/Right</kbd> move, <kbd className="bg-neutral-800 px-1 rounded">Space</kbd>/<kbd className="bg-neutral-800 px-1 rounded">W</kbd>/<kbd className="bg-neutral-800 px-1 rounded">Arrow Up</kbd> jump.</p>
          <p>
            Musical mapping: footsteps = groove pulses, jump = lead accent, landing = bass thump, red coins = Dur-dreiklaenge,
            blue coins = Moll-dreiklaenge, mushrooms = mode shifts, and animal NPCs throw scale-specific note-orbs whose pickup order becomes the live melody. The resonance pedestals read your last melodic action in sequence; solve major {"->"} minor {"->"} NPC to open the Echo Gate and turn the room into a compact logic-puzzle/metroidvania flow. NPCs now read your recent telemetry as a mirror-state and fuse that with tarot roles plus Loom-like draft verbs: Cat opens or seals, Panda mends or frays, Owl reveals or veils, Fox tempts or releases, Wolf severs or bridges with tritone pressure, Camel weaves or unweaves foreign ladders, Crane balances or tilts, and Frog leaps or stalls. The last completed run is cached as local movement memory, so the live composer can answer the current attempt with motifs and cadences from the previous level instead of starting from silence. Camel routes speak Maqam Hijaz, panda orbs lean Chinese pentatonic, owl/crane/frog/wolf/cat voices color other modal lanes, while continuous movement is still sampled into loop rhythm. Green Sync Gates write denser rhythmic accents, Phase Vines bias A/B/C form focus, Tuning Crystals bend harmonic contour, Chord Forks commit you to actual low/high branch routes with different traversal arcs, and Silence Fields carve gaps into the finish arrangement. Reach FINISH to hear the generated arrangement map run phases, pickups, puzzle solves, obstacle hits, NPC draft pressure, and last-level echoes into evolving form cycles. Arrangement Mode and Evolution Depth steer harmonic/drum mutation behavior. Save New/Overwrite write named movement-DNA presets locally; Load Loop replays any saved slot instantly; Library Transfer JSON enables offline backup and sharing between sessions/devices.
          </p>
          <p className="mt-2">
            Advanced controls: 19-EDO and 22-EDO add alternate equal-step intonation grids beside 12-EDO, JI, and BP. Form Engine can stay movement-adaptive or lock the finish suite into AABA / ABAB / ABCA / ABCB / ABAC. Section Bias lets you explicitly promote A, B, or C inside the auto-form engine before FINISH. Target Tempo Follow sets how strongly the post-finish playback follows the run-derived composed BPM instead of the manual transport BPM. The telemetry boxes now expose puzzle progress, gate state, and action-drive beside groove pressure, form focus, tuning skew, harmonic branch bias, route commitments, and rest-field count so you can read how the room is composing the suite while you play.
          </p>
          <p className="mt-2">
            Live suite preview: the overlay on the canvas and the section cards under it use the same arrangement builder that powers FINISH playback. That means the visible A/B/C slot order, rest density, motif sizes, and section pressure are not decorative telemetry; they are the current post-finish suite draft. Audition Form / A / B / C lets you hear those sections directly before finishing the run.
          </p>
        </div>
      </StandaloneRoomFrame>
    </div>
  );
}
