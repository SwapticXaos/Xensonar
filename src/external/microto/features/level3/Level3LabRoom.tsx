import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type InputLogEntry } from "../../shared/input/useRoomInput";
import { level3KeyDownLookup, level3KeyUpLookup } from "./level3Keymap";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import { useStandaloneRoomRuntime } from "../runtime/useStandaloneRoomRuntime";
import { StandaloneRoomFrame } from "../../app/components/StandaloneRoomFrame";
import { RoomQuickStartCard } from "../../app/components/RoomQuickStartCard";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";
import { createTonePlayer } from "../audio";
import { mapPointerEventToCanvasPoint } from "../../shared/input/canvasPointer";
import { type Room } from "../../app/roomRegistry";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../shared/canvasConstants";
import {
  createInitialLevel3State,
  createInitialWisps,
  type Level3State,
} from "./level3State";
import { addPulse, tickLevel3Field } from "./level3Field";
import { drawLevel3Frame } from "./level3Draw";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import { mapWorldToLevel3View } from "./harmonicAdapter";
import { RoomRecommendedWorldsStrip } from "../../app/components/RoomRecommendedWorldsStrip";

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

type Level3LabRoomProps = {
  room: Room;
  onBack: () => void;
  onInputEvent?: (entry: InputLogEntry) => void;
  keymapRegistryRef?: KeymapRegistryRef;
  audioCtx?: AudioContext | null;
  onEnableAudio?: EnsureAudio;
  /** Optional shared harmonic context from Resonance; used for HUD (root/tuning). */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional harmonic world view-model; used for world/tuning labels in the HUD. */
  harmonicWorld?: HarmonicWorld | null;
  /** Optional: load a harmonic world (enables "Recommended for this room" strip). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
};

export function Level3LabRoom({
  room,
  onBack,
  onInputEvent,
  keymapRegistryRef,
  audioCtx,
  onEnableAudio,
  globalHarmonicContext,
  harmonicWorld,
  onImportWorld,
}: Level3LabRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(6);
  const [bpm, setBpm] = useState(104);
  const [status, setStatus] = useState("L3-Lab bereit");
  const { firstRunHint, showFirstRunHint, dismissHint } = useRoomFirstRunHint("L3LAB");
  const onEnableAudioRef = useRef(onEnableAudio);
  const hasTriedEnableAudioRef = useRef(false);
  onEnableAudioRef.current = onEnableAudio;

  const stateRef = useRef<Level3State>(createInitialLevel3State(W, H));

  const stepDur = useMemo(() => 60 / Math.max(40, bpm) / 4, [bpm]);

  useEffect(() => {
    stateRef.current.wisps = createInitialWisps(W, H);
  }, []);

  const playScheduledTone = useMemo(() => createTonePlayer(() => audioCtx ?? null), [audioCtx]);

  const ping = useCallback(
    (freq: number, gain = 0.1, dur = 0.24) => {
      playScheduledTone(freq, 0, dur, "triangle", gain);
    },
    [playScheduledTone],
  );

  const noiseHit = useCallback(() => {
    const ctx = audioCtx ?? null;
    if (!ctx) return;
    const now = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.14);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = b;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(now);
    src.stop(now + 0.16);
  }, [audioCtx]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      dismissHint();
      const action = level3KeyDownLookup(e.key);
      if (!action) return;
      if (action.type === "move") {
        stateRef.current.keys[action.dir] = true;
      } else {
        if (e.repeat) return;
        addPulse(stateRef.current, action.dir);
      }
    },
    [dismissHint],
  );

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    const dir = level3KeyUpLookup(e.key);
    if (dir) stateRef.current.keys[dir] = false;
  }, []);

  const update = useCallback(
    (dt: number) => {
      const s = stateRef.current;
      const { events, hud } = tickLevel3Field(s, dt, { stepDur, width: W, height: H });

      const tryEnableAudio = () => {
        if (!audioCtx && onEnableAudioRef.current && !hasTriedEnableAudioRef.current) {
          hasTriedEnableAudioRef.current = true;
          void onEnableAudioRef.current();
        }
      };

      for (const ev of events) {
        if (ev.type === "wisp_resonant" || ev.type === "wisp_nonresonant") {
          tryEnableAudio();
          void ping(ev.freq, ev.vol, ev.dur);
        } else if (ev.type === "bolt_hit") {
          tryEnableAudio();
          noiseHit();
        } else if (ev.type === "game_over" || ev.type === "won") {
          setStatus(hud.status);
          setHp(hud.hp);
          setScore(hud.score);
          setRunning(false);
        }
      }

      if (s.uiTimer >= 0.1) {
        s.uiTimer = 0;
        setScore(hud.score);
        setHp(hud.hp);
        setStatus(hud.status);
      }
    },
    [audioCtx, stepDur, ping, noiseHit],
  );

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    drawLevel3Frame(ctx, stateRef.current, W, H);
  }, []);

  useStandaloneRoomRuntime({
    room,
    roomId: "L3LAB",
    canvasRef,
    active: running,
    update,
    draw,
    inputHandlers: { onKeyDown, onKeyUp },
    inputOptions: onInputEvent ? { onInputEvent, useRouter: !!keymapRegistryRef } : { useRouter: !!keymapRegistryRef },
    registerRaf: true,
    lifecycle: { onUnmount: () => {} },
    keymapRegistryRef,
    keymapHandlers: { onKeyDown, onKeyUp },
  });

  const restart = useCallback(() => {
    Object.assign(stateRef.current, createInitialLevel3State(W, H));
    stateRef.current.wisps = createInitialWisps(W, H);
    setScore(0);
    setHp(6);
    setStatus("L3-Lab bereit");
  }, []);

  const worldView = mapWorldToLevel3View(harmonicWorld);

  return (
    <StandaloneRoomFrame
      title="VII. Resonance Commons - L3 Workspace"
      description="Resonanz-Chor: drei Irrlichter, gated Angriffe, Trefferfenster in Resonanzphase."
      onBack={onBack}
      sectionClassName="border border-neutral-800 bg-black/70 p-6 space-y-4"
      backButtonClassName="px-3 py-2 border border-neutral-600 hover:border-neutral-300"
      titleClassName="text-2xl text-cyan-200"
      primaryAction={
        <button
          type="button"
          onClick={() => {
            restart();
            setRunning((v) => !v);
          }}
          className="px-3 py-2 border border-cyan-600 text-cyan-200 hover:bg-cyan-950/40"
        >
          {running ? "Pause" : "Start"}
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="border border-neutral-800 p-3">
          Score: <span className="text-cyan-200 font-semibold">{score}</span> / 18
        </div>
        <div className="border border-neutral-800 p-3">
          Integritaet: <span className="text-amber-200 font-semibold">{hp}</span> / 6
        </div>
        <div className="border border-neutral-800 p-3">Tempo (16tel): {bpm} BPM</div>
        <div className="border border-neutral-800 p-3 text-neutral-300">{status}</div>
      </div>

      <WorldSummaryHud
        world={harmonicWorld}
        slice={{ quantizeOn: true, quantizeBpm: bpm, quantizeSubdivision: "16" }}
        rootHz={globalHarmonicContext?.baseFreq}
        tuningLabel={worldView.tuningLabel}
        modeLabel={worldView.modeLabel}
        className="mb-3"
        worldHintChildren={
          <>
            Dieses L3-Lab uebt Sektorwellen und Trefferfenster genau im aktiven Welt-Gitter; nutze es als
            Kampf-Trainingsflaeche fuer dieselbe Harmonik, die du in Resonance und Arena spielst.
          </>
        }
      />
      <RoomRecommendedWorldsStrip
        room={room}
        onImportWorld={onImportWorld}
        harmonicWorld={harmonicWorld}
        limit={5}
        className="mb-3"
      />
      <div>
        <label className="block text-xs text-neutral-400 mb-1">16tel Tempo</label>
        <input
          type="range"
          min="70"
          max="170"
          step="1"
          value={bpm}
          onChange={(e) => setBpm(parseInt(e.target.value, 10))}
          className="w-full"
        />
      </div>

      {showFirstRunHint && firstRunHint && (
        <p className="text-sm text-cyan-200/90 bg-cyan-950/50 border border-cyan-700/60 px-3 py-2 rounded" role="status">
          {firstRunHint}
        </p>
      )}
      <div className="border border-neutral-800 bg-neutral-950/60 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto block cursor-crosshair touch-none"
          onPointerMove={(e) => {
            dismissHint();
            const { x, y } = mapPointerEventToCanvasPoint(e);
            stateRef.current.cursorX = x;
            stateRef.current.cursorY = y;
          }}
        />
      </div>

      <RoomQuickStartCard>
        <span className="font-semibold text-neutral-200 mr-1">Quick start:</span>
        Steuerung: Maus oder Pfeiltasten bewegen den Fokus. Sektorwellen:{" "}
        <span className="text-neutral-200">Y (links), X (rechts), C (oben), V (unten)</span>. Resonante
        Trefferfenster sind die hellen Phasen der Irrlichter.
      </RoomQuickStartCard>
    </StandaloneRoomFrame>
  );
}
