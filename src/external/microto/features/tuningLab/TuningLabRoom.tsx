/**
 * Tuning Lab room (TUNINGLAB) per NEW-ROOM-TEMPLATE-v1.md.
 * Cursor-driven pitch exploration: Y position maps to frequency; click or Space to play.
 * Vision: exploratory instrument; harmonic systems as first-class interaction.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { InputLogEntry } from "../../shared/input/useRoomInput";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import { useStandaloneRoomRuntime } from "../runtime/useStandaloneRoomRuntime";
import type { UseKeymapRegistrationHandlers } from "../input/useKeymapRegistration";
import { type Room } from "../../app/roomRegistry";
import { StandaloneRoomFrame } from "../../app/components/StandaloneRoomFrame";
import { RoomQuickStartCard } from "../../app/components/RoomQuickStartCard";
import { createTonePlayer } from "../audio";
import { clampFreq } from "../../shared/tuning/grid";
import { mapPointerEventToCanvasPoint } from "../../shared/input/canvasPointer";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../shared/canvasConstants";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import { tuningLabKeyLookup } from "./tuningLabKeymap";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import type { QuantizeSliceLike } from "../../shared/tuning/quantizeLabel";
import { snapToNearestJiNode } from "../../shared/tuning/jiSnap";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import { mapWorldToTuningLabView } from "./harmonicAdapter";
import { RoomRecommendedWorldsStrip } from "../../app/components/RoomRecommendedWorldsStrip";
import { formatGridTuningLabel } from "../../shared/tuning/tuningLabels";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";

const TUNINGLAB_PITCH_MIN = 55;
const TUNINGLAB_PITCH_MAX = 520;

type JiBase = "low" | "mid" | "high";

const JI_BASE_CONFIG: Record<
  JiBase,
  {
    baseFreq: number;
    label: string;
  }
> = {
  low: { baseFreq: 55, label: "55 Hz (A1)" },
  mid: { baseFreq: 110, label: "110 Hz (A2)" },
  high: { baseFreq: 220, label: "220 Hz (A3)" },
};

type PitchRange = "low" | "mid" | "high";

const RANGE_CONFIG: Record<PitchRange, { base: number; span: number }> = {
  low: { base: 55, span: 240 }, // ~55–295 Hz
  mid: { base: 80, span: 400 }, // ~80–480 Hz (previous behavior)
  high: { base: 225, span: 295 }, // ~225–520 Hz
};

type TuningLabRoomProps = {
  room: Room;
  onBack: () => void;
  onInputEvent?: (entry: InputLogEntry) => void;
  keymapRegistryRef?: KeymapRegistryRef;
  audioCtx?: AudioContext | null;
  onEnableAudio?: EnsureAudio;
  /** Optional shared harmonic context from Resonance; used for HUD only. */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional callback to set the global harmonic root in Hz via App/updateNParams. */
  setGlobalRootHz?: (hz: number) => void;
  /** Optional harmonic world view-model; used for world/tuning labels in the HUD. */
  harmonicWorld?: HarmonicWorld | null;
  /** Optional: load a harmonic world (enables "Recommended for this room" strip). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
};

export function TuningLabRoom({
  room,
  onBack,
  onInputEvent,
  keymapRegistryRef,
  audioCtx,
  onEnableAudio,
  globalHarmonicContext,
  setGlobalRootHz,
  harmonicWorld,
  onImportWorld,
}: TuningLabRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
  const { firstRunHint, showFirstRunHint, dismissHint } = useRoomFirstRunHint("TUNINGLAB");
  const [range, setRange] = useState<PitchRange>("mid");
  const [jiGridOn, setJiGridOn] = useState(false);
  const [jiBase, setJiBase] = useState<JiBase>("mid");
  const [useWorldRootJiBase, setUseWorldRootJiBase] = useState(false);

  const active = room === "TUNINGLAB";

  const playScheduledTone = useMemo(() => createTonePlayer(() => audioCtx ?? null), [audioCtx]);

  const getCursorFreq = useCallback(() => {
    const { y } = cursorRef.current;
    const { base, span } = RANGE_CONFIG[range];
    const rawFreq = (1 - y / CANVAS_HEIGHT) * span + base;
    const clamped = clampFreq(rawFreq, TUNINGLAB_PITCH_MIN, TUNINGLAB_PITCH_MAX);
    const jiBaseFreq =
      useWorldRootJiBase && globalHarmonicContext
        ? globalHarmonicContext.baseFreq
        : JI_BASE_CONFIG[jiBase].baseFreq;
    const snapped = jiGridOn
      ? snapToNearestJiNode(clamped, {
          baseFreq: jiBaseFreq,
          minFreq: TUNINGLAB_PITCH_MIN,
          maxFreq: TUNINGLAB_PITCH_MAX,
        }).freq
      : clamped;
    return snapped;
  }, [range, jiGridOn, jiBase, useWorldRootJiBase, globalHarmonicContext]);

  const playAtCursor = useCallback(async () => {
    if (onEnableAudio && !audioCtx) await onEnableAudio();
    const freq = getCursorFreq();
    playScheduledTone(freq, 0, 0.25, "sine", 0.2);
  }, [audioCtx, onEnableAudio, playScheduledTone, getCursorFreq]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = mapPointerEventToCanvasPoint(e);
    cursorRef.current.x = x;
    cursorRef.current.y = y;
  }, []);

  const handleClick = useCallback(async () => {
    dismissHint();
    await playAtCursor();
  }, [dismissHint, playAtCursor]);

  const handleSetWorldRootFromCursor = useCallback(
    async () => {
      if (!setGlobalRootHz) return;
      if (onEnableAudio && !audioCtx) await onEnableAudio();
      const freq = getCursorFreq();
      setGlobalRootHz(freq);
    },
    [audioCtx, getCursorFreq, onEnableAudio, setGlobalRootHz],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const action = tuningLabKeyLookup(e.key);
      if (action?.type === "play") {
        dismissHint();
        e.preventDefault();
        void playAtCursor();
      } else if (action?.type === "toggleJiGrid") {
        e.preventDefault();
        setJiGridOn((prev) => !prev);
      }
    },
    [dismissHint, playAtCursor],
  );

  const update = useCallback(() => {}, []);
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const { x, y } = cursorRef.current;
      const { base, span } = RANGE_CONFIG[range];
      const rawFreq = (1 - y / CANVAS_HEIGHT) * span + base;
      const clamped = clampFreq(rawFreq, TUNINGLAB_PITCH_MIN, TUNINGLAB_PITCH_MAX);
      const jiBaseFreq =
        useWorldRootJiBase && globalHarmonicContext
          ? globalHarmonicContext.baseFreq
          : JI_BASE_CONFIG[jiBase].baseFreq;
      const snapped = jiGridOn
        ? snapToNearestJiNode(clamped, {
            baseFreq: jiBaseFreq,
            minFreq: TUNINGLAB_PITCH_MIN,
            maxFreq: TUNINGLAB_PITCH_MAX,
          })
        : { freq: clamped, label: "" };
      const freq = snapped.freq;
      ctx.fillStyle = "#238636";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7ee787";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#8b949e";
      ctx.font = "14px monospace";
      ctx.textAlign = "left";
      const labelSuffix = snapped.label ? ` · ${snapped.label}` : "";
      ctx.fillText(`${freq.toFixed(1)} Hz${labelSuffix}`, x + 18, y + 5);
    },
    [range, jiGridOn, jiBase, useWorldRootJiBase, globalHarmonicContext],
  );

  const keymapHandlers: UseKeymapRegistrationHandlers = { onKeyDown };

  const harmonicSlice: QuantizeSliceLike =
    globalHarmonicContext
      ? {
          quantizeOn: globalHarmonicContext.quantizeOn,
          quantizeBpm: globalHarmonicContext.quantizeBpm,
          quantizeSubdivision: globalHarmonicContext.quantizeSubdivision,
        }
      : {
          quantizeOn: false,
          quantizeBpm: 120,
          quantizeSubdivision: "16",
        };

  const labView = mapWorldToTuningLabView(harmonicWorld);
  const tuningLabel =
    labView.tuningLabel ?? formatGridTuningLabel(globalHarmonicContext?.gridTuning);
  const modeLabel =
    labView.modeLabel ?? (jiGridOn ? "JI-Gitter" : "Frei");

  useStandaloneRoomRuntime({
    room,
    roomId: "TUNINGLAB",
    canvasRef,
    active,
    update,
    draw,
    inputHandlers: { onKeyDown, onKeyUp: () => {} },
    inputOptions: onInputEvent ? { useRouter: !!keymapRegistryRef, onInputEvent } : { useRouter: !!keymapRegistryRef },
    registerRaf: true,
    lifecycle: { onUnmount: () => {} },
    keymapRegistryRef,
    keymapHandlers,
  });

  return (
    <StandaloneRoomFrame
      title="X. Tuning Lab"
      description="Move the cursor vertically to scan pitch; click or Space to play. Toggle JI grid to snap to just-intonation ratios (G or button)."
      onBack={onBack}
    >
      <WorldSummaryHud
        world={harmonicWorld}
        slice={harmonicSlice}
        rootHz={globalHarmonicContext?.baseFreq}
        tuningLabel={tuningLabel}
        modeLabel={modeLabel}
        className="mb-2"
        onSelectRoom={onBack}
        worldHintChildren={
          <>
            Dieses Lab zeigt das aktive Welt-Gitter als nacktes Cursor-Feld; bewege den Zeiger, um Intervalle und
            Root der aktuellen Welt im Detail zu hoeren. Aktiviere optional &quot;World root&quot;, um die JI-Snap-Basis
            auf die aktuelle Weltwurzel zu legen.
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
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-300">
        <span className="text-neutral-500">Range:</span>
        {(["low", "mid", "high"] as PitchRange[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={`px-2 py-0.5 rounded border text-[11px] ${
              range === value
                ? "bg-emerald-700/70 border-emerald-400 text-emerald-50"
                : "bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/80"
            }`}
          >
            {value}
          </button>
        ))}
        <span className="text-neutral-500 ml-2">JI grid:</span>
        <button
          type="button"
          onClick={() => setJiGridOn((prev) => !prev)}
          className={`px-2 py-0.5 rounded border text-[11px] ${
            jiGridOn
              ? "bg-teal-700/70 border-teal-400 text-teal-50"
              : "bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/80"
          }`}
        >
          {jiGridOn ? "On" : "Off"}
        </button>
        <span className="text-neutral-500 ml-2">Root:</span>
        {(["low", "mid", "high"] as JiBase[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setJiBase(value)}
            disabled={useWorldRootJiBase}
            className={`px-2 py-0.5 rounded border text-[11px] ${
              jiBase === value && !useWorldRootJiBase
                ? "bg-sky-700/70 border-sky-400 text-sky-50"
                : "bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/80 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {JI_BASE_CONFIG[value].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setUseWorldRootJiBase((prev) => !prev)}
          disabled={!globalHarmonicContext}
          className={`ml-2 px-2 py-0.5 rounded border text-[11px] ${
            useWorldRootJiBase
              ? "bg-indigo-700/70 border-indigo-400 text-indigo-50"
              : "bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/80 disabled:opacity-40 disabled:cursor-not-allowed"
          }`}
          title={
            globalHarmonicContext
              ? "Snap JI grid around the active world's root frequency"
              : "Requires an active harmonic world/root from the synth"
          }
        >
          World root
        </button>
        {setGlobalRootHz && (
          <>
            <button
              type="button"
              onClick={() => setGlobalRootHz(JI_BASE_CONFIG[jiBase].baseFreq)}
              className="ml-3 px-3 py-0.5 rounded border text-[11px] border-amber-500 text-amber-100 bg-amber-900/40 hover:bg-amber-800/60"
            >
              Apply JI base as world root
            </button>
            <button
              type="button"
              onClick={() => void handleSetWorldRootFromCursor()}
              className="px-3 py-0.5 rounded border text-[11px] border-emerald-500 text-emerald-100 bg-emerald-900/40 hover:bg-emerald-800/60"
            >
              Cursor → world root
            </button>
          </>
        )}
      </div>
      <RoomQuickStartCard className="mb-2">
        <span className="font-semibold text-neutral-200 mr-1">Quick start:</span>
        Der Y-Wert des Cursors wird direkt in eine Frequenz im gewählten Bereich gemappt. Starte in der mittleren Range,
        bewege den Cursor langsam nach oben/unten und wechsle dann die Range. Schalte das <strong>JI-Gitter</strong> ein
        (Button oder Taste G), um auf reine Stimmung (Just Intonation) zu snappen und Ratio-Labels zu sehen.
      </RoomQuickStartCard>
      {showFirstRunHint && firstRunHint && (
        <p className="text-sm text-emerald-200/90 bg-emerald-950/50 border border-emerald-700/60 px-3 py-2 rounded mb-2" role="status">
          {firstRunHint}
        </p>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full max-w-full border border-neutral-700 touch-none cursor-crosshair"
        style={{ maxHeight: "70vh" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => {}}
        onClick={handleClick}
      />
    </StandaloneRoomFrame>
  );
}
