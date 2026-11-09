import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from "react";
import { type InputLogEntry } from "../../shared/input/useRoomInput";
import { useStandaloneRoomRuntime } from "../runtime/useStandaloneRoomRuntime";
import { useRoomFirstRunHint } from "../runtime/useRoomFirstRunHint";
import { type Room } from "../../app/roomRegistry";
import { StandaloneRoomFrame } from "../../app/components/StandaloneRoomFrame";
import { RoomQuickStartCard } from "../../app/components/RoomQuickStartCard";
import { WorldSummaryHud } from "../../app/components/WorldSummaryHud";
import { commonsKeyLookup } from "./commonsKeymap";
import { clamp } from "../../shared/tuning/grid";
import { mapPointerEventToCanvasPoint } from "../../shared/input/canvasPointer";
import type { KeymapRegistryRef } from "../input/useInputRouter";
import type { EnsureAudio } from "../../shared/audio/audioInit";
import { CANVAS_WIDTH, CANVAS_HEIGHT_COMMONS } from "../../shared/canvasConstants";
import type { GlobalHarmonicContext } from "../resonance/config/stateSlices";
import type { HarmonicWorld, HarmonicWorldExport } from "../../domain/harmonicWorld";
import { RoomRecommendedWorldsStrip } from "../../app/components/RoomRecommendedWorldsStrip";
import { mapWorldToCommonsView } from "./harmonicAdapter";
import {
  type CommonsSimState,
  type SystemMode,
  createCommonsAgents,
  tickCommonsField,
} from "./commonsField";
import { drawCommonsFrame } from "./commonsDraw";

const WIDTH = CANVAS_WIDTH;
const HEIGHT = CANVAS_HEIGHT_COMMONS;

type ResonanceCommonsRoomProps = {
  room: Room;
  onBack: () => void;
  /** Optional navigation callback for world-aware HUD actions (e.g. recommended rooms). */
  onSelectRoom?: (room: Room) => void;
  onInputEvent?: (entry: InputLogEntry) => void;
  keymapRegistryRef?: KeymapRegistryRef;
  audioCtx?: AudioContext | null;
  onEnableAudio?: EnsureAudio;
  /** Optional shared harmonic context from Resonance; used only for HUD (root/tuning). */
  globalHarmonicContext?: GlobalHarmonicContext;
  /** Optional harmonic world view-model; used for world/tuning labels in the HUD. */
  harmonicWorld?: HarmonicWorld | null;
  /** Optional: load a harmonic world from the room (enables "Recommended for this room" strip). */
  onImportWorld?: (data: HarmonicWorldExport) => void;
  /** When set, first-run dismiss is routed via global keydown (vision §8). */
  firstRunDismissRef?: React.MutableRefObject<(() => void) | null>;
};

function createInitialSimState(): CommonsSimState {
  return {
    cursorX: WIDTH * 0.5,
    cursorY: HEIGHT * 0.76,
    wispX: WIDTH * 0.5,
    wispY: HEIGHT * 0.24,
    wispVx: 90,
    wispVy: 20,
    t: 0,
    score: 0,
    integrity: 100,
    pulses: [],
    bolts: [],
    agents: [],
    pulseAt: 0,
    boltAt: 0,
    clockAt: 0,
    queuedHits: [],
  };
}

export function ResonanceCommonsRoom({
  room,
  onBack,
  onSelectRoom,
  onInputEvent,
  keymapRegistryRef,
  audioCtx,
  onEnableAudio,
  globalHarmonicContext,
  harmonicWorld,
  onImportWorld,
  firstRunDismissRef,
}: ResonanceCommonsRoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { firstRunHint, showFirstRunHint } = useRoomFirstRunHint("COMMONS", {
    dismissOnGlobalInput: true,
    firstRunDismissRef,
  });
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<SystemMode>("ji");
  const [grooveOn, setGrooveOn] = useState(true);
  const [bpm, setBpm] = useState(96);
  const [pulsePower, setPulsePower] = useState(1);
  const [hud, setHud] = useState({ score: 0, integrity: 100, queued: 0, state: "Resonanz offen" });

  const simRef = useRef<CommonsSimState>(createInitialSimState());
  const audioRef = useRef<{
    ctx: AudioContext | null;
    droneA: OscillatorNode | null;
    droneB: OscillatorNode | null;
    droneFilter: BiquadFilterNode | null;
    droneGain: GainNode | null;
  }>({ ctx: null, droneA: null, droneB: null, droneFilter: null, droneGain: null });

  useEffect(() => {
    simRef.current.agents = createCommonsAgents(mode, WIDTH, HEIGHT);
    simRef.current.queuedHits = [];
  }, [mode]);

  const bootWithCtx = useCallback((ctx: AudioContext) => {
    if (audioRef.current.ctx) return;
    const droneA = ctx.createOscillator();
    const droneB = ctx.createOscillator();
    const droneFilter = ctx.createBiquadFilter();
    const droneGain = ctx.createGain();
    droneA.type = "triangle";
    droneB.type = "sine";
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 1200;
    droneGain.gain.value = 0.06;
    droneA.connect(droneFilter);
    droneB.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(ctx.destination);
    droneA.start();
    droneB.start();
    audioRef.current = { ctx, droneA, droneB, droneFilter, droneGain };
  }, []);

  useEffect(() => {
    if (active && audioCtx?.state === "running" && !audioRef.current.ctx) {
      bootWithCtx(audioCtx);
    }
  }, [active, audioCtx, bootWithCtx]);

  const playOneShot = useCallback((freq: number, volume = 0.1, dur = 0.14) => {
    const ctx = audioRef.current.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    osc.type = "triangle";
    osc2.type = "sine";
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(freq * 1.8, ctx.currentTime);
    bp.Q.setValueAtTime(2.8, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq * 2.01, ctx.currentTime);
    osc.connect(bp);
    osc2.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + dur + 0.03);
    osc2.stop(ctx.currentTime + dur + 0.03);
  }, []);

  const firePulse = useCallback(() => {
    const s = simRef.current;
    const now = performance.now();
    if (now - s.pulseAt < 80) return;
    s.pulseAt = now;
    s.pulses.push({ x: s.cursorX, y: s.cursorY, r: 8, life: 1 });
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const s = simRef.current;
      const action = commonsKeyLookup(e.key);
      if (!action) return;
      switch (action.type) {
        case "cursor":
          if (action.dir === "left") s.cursorX = clamp(s.cursorX - 18, 10, WIDTH - 10);
          if (action.dir === "right") s.cursorX = clamp(s.cursorX + 18, 10, WIDTH - 10);
          if (action.dir === "up") s.cursorY = clamp(s.cursorY - 18, 10, HEIGHT - 10);
          if (action.dir === "down") s.cursorY = clamp(s.cursorY + 18, 10, HEIGHT - 10);
          break;
        case "action":
          e.preventDefault();
          firePulse();
          break;
        case "agentToggle":
          if (s.agents[action.index]) s.agents[action.index].enabled = !s.agents[action.index].enabled;
          break;
      }
    },
    [firePulse],
  );

  const keymapHandlers = { onKeyDown };

  const update = useCallback(
    (dt: number, now?: number) => {
      const s = simRef.current;
      const nowMs = now ?? performance.now();
      const hud = tickCommonsField(s, dt, nowMs, { bpm, grooveOn, pulsePower, width: WIDTH, height: HEIGHT }, playOneShot);

      const audio = audioRef.current;
      if (audio.ctx && audio.droneA && audio.droneB && audio.droneFilter && audio.droneGain) {
        const yNorm = 1 - s.cursorY / HEIGHT;
        const base = 58 + yNorm * 280;
        const queueTension = clamp(s.queuedHits.length / 12, 0, 1);
        audio.droneA.frequency.setTargetAtTime(base, audio.ctx.currentTime, 0.04);
        audio.droneB.frequency.setTargetAtTime(base * (1.5 + queueTension * 0.2), audio.ctx.currentTime, 0.04);
        audio.droneFilter.frequency.setTargetAtTime(450 + (s.cursorX / WIDTH) * 2300, audio.ctx.currentTime, 0.06);
        audio.droneGain.gain.setTargetAtTime(0.03 + (s.integrity / 100) * 0.05, audio.ctx.currentTime, 0.08);
      }

      setHud(hud);
    },
    [bpm, grooveOn, pulsePower, playOneShot],
  );

  const draw = useCallback((ctx2d: CanvasRenderingContext2D) => {
    drawCommonsFrame(ctx2d, simRef.current, WIDTH, HEIGHT);
  }, []);

  useStandaloneRoomRuntime({
    room,
    roomId: "COMMONS",
    canvasRef,
    active,
    update,
    draw,
    inputHandlers: { onKeyDown },
    inputOptions: onInputEvent ? { onInputEvent, useRouter: !!keymapRegistryRef } : { useRouter: !!keymapRegistryRef },
    registerRaf: true,
    lifecycle: {
      onUnmount: () => {
        const a = audioRef.current;
        a.droneA?.stop();
        a.droneB?.stop();
        a.droneGain?.disconnect();
        audioRef.current = { ctx: null, droneA: null, droneB: null, droneFilter: null, droneGain: null };
      },
    },
    keymapRegistryRef,
    keymapHandlers,
  });

  const commonsView = mapWorldToCommonsView(harmonicWorld, mode);

  return (
    <StandaloneRoomFrame
      title="VI. Resonance Commons"
      description="Topologie + Arena + Instrument als ein kooperatives Feld: Echtzeit-Interaktion, rhythmische Entladung, lernbare Harmonik."
      onBack={onBack}
      primaryAction={
        <button
          type="button"
          onClick={async () => {
            if (!active && !audioCtx) await onEnableAudio?.();
            setActive((v) => !v);
          }}
          className="px-4 py-2 border border-violet-500 text-violet-100 hover:bg-violet-900/30"
        >
          {active ? "Pause" : "Start"}
        </button>
      }
    >
      {showFirstRunHint && firstRunHint && (
        <RoomQuickStartCard className="mb-3 text-neutral-300 border-violet-700/70 bg-violet-950/40">
          {firstRunHint}
        </RoomQuickStartCard>
      )}
      <WorldSummaryHud
        world={harmonicWorld}
        slice={{ quantizeOn: grooveOn, quantizeBpm: bpm, quantizeSubdivision: "16" }}
        rootHz={globalHarmonicContext?.baseFreq}
        tuningLabel={commonsView.tuningLabel}
        modeLabel={commonsView.modeLabel ?? (mode === "ji" ? "Just Intonation" : "12 EDO")}
        className="mb-3"
        onSelectRoom={onSelectRoom}
        worldHintChildren={
          <>
            Diese Commons-Oberflaeche spiegelt die aktuell laufende Welt wider: nutze Pulswellen und Agenten,
            um das gleiche harmonische Feld anders zu erkunden.
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
      <RoomQuickStartCard className="mb-3">
        <span className="font-semibold text-neutral-200 mr-1">Quick start:</span>
        Bewege den Cursor oder die Pfeiltasten, um das Feld zu erkunden, feuere mit{" "}
        <span className="text-neutral-200">Space oder Klick</span> Pulswellen ab, und schalte Agenten mit{" "}
        <span className="text-neutral-200">A–L</span> zu oder ab. Nutze den Groove-Schalter und das Tempo, um die Dichte
        der Resonanz-Impulse zu formen.
      </RoomQuickStartCard>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 text-xs">
        <div className="border border-neutral-800 bg-black/40 p-2">
          Score: <span className="text-pink-300">{hud.score}</span>
        </div>
        <div className="border border-neutral-800 bg-black/40 p-2">
          Integritaet: <span className="text-cyan-300">{hud.integrity}%</span>
        </div>
        <div className="border border-neutral-800 bg-black/40 p-2">
          Queue: <span className="text-violet-300">{hud.queued}</span>
        </div>
        <div className="border border-neutral-800 bg-black/40 p-2">
          Status: <span className="text-emerald-300">{hud.state}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 text-xs border border-neutral-800 p-3 bg-black/30">
        <div>
          <label className="block text-neutral-400 mb-1">Harmonik-System</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SystemMode)}
            className="w-full bg-neutral-950 border border-neutral-700 p-1 text-neutral-300"
          >
            <option value="ji">Just Intonation</option>
            <option value="edo12">12 EDO</option>
          </select>
        </div>
        <div>
          <label className="block text-neutral-400 mb-1">Rhythmus-Governance</label>
          <label className="flex items-center gap-2 text-neutral-300">
            <input type="checkbox" checked={grooveOn} onChange={(e) => setGrooveOn(e.target.checked)} />
            Queue auf 16tel entladen
          </label>
        </div>
        <div>
          <label className="block text-neutral-400 mb-1">Tempo: {bpm} BPM</label>
          <input
            type="range"
            min="60"
            max="170"
            step="1"
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-neutral-400 mb-1">Pulse-Staerke: {(pulsePower * 100).toFixed(0)}%</label>
          <input
            type="range"
            min="0.6"
            max="1.8"
            step="0.01"
            value={pulsePower}
            onChange={(e) => setPulsePower(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="w-full border border-neutral-800 bg-black cursor-crosshair touch-none"
        onPointerMove={(e) => {
          const { x, y } = mapPointerEventToCanvasPoint(e);
          simRef.current.cursorX = x;
          simRef.current.cursorY = y;
        }}
        onPointerDown={firePulse}
      />

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-400">
        <p>Maus oder Pfeile bewegen den Fokus. Klick/Space feuert Pulse. Das Irrlicht greift an, waehrend du Harmonie-Felder aktivierst.</p>
        <p>
          Agenten lassen sich mit <span className="text-neutral-200">A S D F G H J K L</span> muten. So wird aus der Arena ein spielbares
          Gegenstimmen-Instrument.
        </p>
      </div>
    </StandaloneRoomFrame>
  );
}
