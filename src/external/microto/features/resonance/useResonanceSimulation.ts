import { type MutableRefObject, useCallback, useEffect, useRef, type RefObject } from "react";
import {
  PRESET_MAP,
} from "./config/presets";
import { DRONE_JI_OVERTONES } from "./config/overtones";
import { getParticleNodes } from "./config/particles";
import { type ResonanceState } from "./config/state";
import {
  getDroneSlice,
  getGridSlice,
  getQuantizeSlice,
  getQuantizedParticleSlice,
  getSimulationParamsSlice,
  getSimulationSlice,
  getWaveStartSlice,
} from "./config/stateSlices";
import { type Room } from "../../app/roomRegistry";
import { clamp, type GridTuning } from "../../shared/tuning/grid";
import { useSimulationLoop } from "../runtime/useSimulationLoop";
import { VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS } from "../runtime/visualRuntimeContract";
import { tickResonanceAgents } from "./resonanceAgentUpdate";
import { drawResonanceFrame } from "./resonanceCanvasDraw";
import type { NexusAgentToneCueInput } from "./resonanceAgentTones";
import type { NexusArrowRef, NexusRuntimeRefsRef } from "./resonanceRefs";
import { resolveResonanceCursorFrame } from "./resonanceCursorControl";
import { syncResonanceAudioFrame } from "./resonanceAudioFrameSync";
import { syncQuantizedParticleHits } from "./resonanceQuantizedParticleSync";
import { buildResonanceWaveTelemetry } from "./resonanceWaveTelemetry";
import { syncWavePerformanceState } from "./resonanceWavePerformance";
import { getCursorIntervalLabel } from "./cursorIntervalLabel";

/** Full ref so getGridSlice/getSimulationSlice (stateSlices) receive MutableRefObject<ResonanceState>. App passes full ref. */
type NexusParamsRef = MutableRefObject<ResonanceState>;

type UseResonanceSimulationArgs = {
  room: Room;
  nexusActive: boolean;
  audioCtx: AudioContext | null;
  nexusArrowRef: NexusArrowRef;
  nexusRefs: NexusRuntimeRefsRef;
  nexusParamsRef: NexusParamsRef;
  gameWidth: number;
  gameHeight: number;
  freqFromY: (y: number) => number;
  snapYToGrid: (y: number, base: number, tuning: GridTuning) => number;
  lockCursorToGrid: boolean;
  gridBase: number;
  gridTuning: GridTuning;
  droneVolume: number;
  nParamsParticleVolume: number;
  impactDecayOn: boolean;
  waveLaunchAtRef: MutableRefObject<number>;
  waveImpactDecayRef: MutableRefObject<number>;
  nexusCanvasRef: RefObject<HTMLCanvasElement | null>;
  applyRealtimeDroneOvertones: (mix?: Record<string, number>, timbreOverride?: number) => void;
  playNexusAgentTone: (
    freq: number,
    volume: number,
    targetDestination?: AudioNode,
    cue?: NexusAgentToneCueInput,
  ) => void;
  clampFreq: (f: number, min: number, max: number) => number;
  droneFreqFromY: (y: number, height: number) => number;
  yFromDroneFreq: (f: number, height: number) => number;
  /** When provided, called when the cursor interval label changes (for shell HUD — vision §5 discoverability). */
  onLiveCursorIntervalChange?: (label: string) => void;
};


export function useResonanceSimulation({
  room,
  nexusActive,
  audioCtx,
  nexusArrowRef,
  nexusRefs,
  nexusParamsRef,
  gameWidth,
  gameHeight,
  freqFromY,
  snapYToGrid,
  lockCursorToGrid,
  gridBase,
  gridTuning,
  droneVolume,
  nParamsParticleVolume,
  impactDecayOn,
  waveLaunchAtRef,
  waveImpactDecayRef,
  nexusCanvasRef,
  applyRealtimeDroneOvertones,
  playNexusAgentTone,
  clampFreq,
  droneFreqFromY,
  yFromDroneFreq,
  onLiveCursorIntervalChange,
}: UseResonanceSimulationArgs) {
  const tRef = useRef(0);
  const lastFrameNowRef = useRef(0);
  const lastCursorIntervalLabelRef = useRef("");
  const CURSOR_TRAIL_MAX = 20;
  const cursorTrailRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    resolveResonanceCursorFrame(nexusRefs.current, {
      lockCursorToGrid,
      gridBase,
      gridTuning,
      gameWidth,
      gameHeight,
      snapYToGrid,
    });
  }, [gameHeight, gameWidth, gridBase, gridTuning, lockCursorToGrid, snapYToGrid, nexusRefs]);

  const active = room === "RESONANCE" && nexusActive && !!audioCtx;

  // Clear cursor trail and live interval label when leaving Resonance
  useEffect(() => {
    if (!active) {
      cursorTrailRef.current = [];
      if (onLiveCursorIntervalChange && lastCursorIntervalLabelRef.current) {
        lastCursorIntervalLabelRef.current = "";
        onLiveCursorIntervalChange("");
      }
    }
  }, [active, onLiveCursorIntervalChange]);

  const update = useCallback(
    (dt: number, now?: number) => {
      const state = nexusRefs.current;
      const grid = getGridSlice(nexusParamsRef);
      const simParams = getSimulationParamsSlice(nexusParamsRef);
      const frameNow = now ?? performance.now();
      lastFrameNowRef.current = frameNow;
      tRef.current += dt;
      syncWavePerformanceState(state, dt, frameNow);

      // Cursor movement (formerly separate RAF); grid slice for speed + snap (vision §6 state slices)
      const speed = grid.cursorSpeed;
      if (nexusArrowRef.current.left) state.cursorX -= speed;
      if (nexusArrowRef.current.right) state.cursorX += speed;
      if (!grid.lockCursorToGrid) {
        if (nexusArrowRef.current.up) state.cursorY -= speed;
        if (nexusArrowRef.current.down) state.cursorY += speed;
      }
      resolveResonanceCursorFrame(state, {
        lockCursorToGrid: grid.lockCursorToGrid,
        gridBase: grid.gridBase,
        gridTuning: grid.gridTuning,
        gameWidth,
        gameHeight,
        snapYToGrid,
      });

      // Live cursor interval label for shell HUD (vision §5: harmonic feedback first-class)
      if (onLiveCursorIntervalChange) {
        const label =
          active && grid.gridOn
            ? getCursorIntervalLabel(grid.gridBase, grid.gridTuning, droneFreqFromY(state.cursorY, gameHeight))
            : "";
        if (label !== lastCursorIntervalLabelRef.current) {
          lastCursorIntervalLabelRef.current = label;
          onLiveCursorIntervalChange(label);
        }
      }

      // Cursor pitch trail (ring buffer of recent positions for visual path when grid is on)
      const trail = cursorTrailRef.current;
      trail.push({ x: state.cursorX, y: state.cursorY });
      if (trail.length > CURSOR_TRAIL_MAX) trail.splice(0, trail.length - CURSOR_TRAIL_MAX);

      // Wave impact decay (formerly separate RAF)
      const baseVol = nParamsParticleVolume;
      let effectiveParticleVolume = baseVol;
      if (impactDecayOn && waveLaunchAtRef.current > 0) {
        const audioNow = audioCtx?.currentTime ?? frameNow / 1000;
        const elapsed = Math.max(0, audioNow - waveLaunchAtRef.current);
        const scalar = clamp(1 - elapsed / 1.25, 0.2, 1);
        waveImpactDecayRef.current = scalar;
        effectiveParticleVolume = baseVol * scalar;
      } else {
        waveImpactDecayRef.current = 1;
        effectiveParticleVolume = baseVol;
      }

      const drone = getDroneSlice(nexusParamsRef);
      const quantize = getQuantizeSlice(nexusParamsRef);
      const quantizedParticles = getQuantizedParticleSlice(nexusParamsRef);
      const preset = PRESET_MAP[drone.dronePreset] ?? PRESET_MAP.warm_pad;
      const tParam = clamp(drone.droneTimbre, 0, 1);
      const profileMix = Math.pow(tParam, 1.15);
      const overtoneCents = Math.log2(preset.overtoneRatio) * 1200;
      const t = tRef.current;
      const targetFreq = droneFreqFromY(state.cursorY, gameHeight);
      const targetCutoff = preset.cutoffBase + (state.cursorX / gameWidth) * preset.cutoffSpan;
      state.wobble *= 0.975;
      state.wobblePhase += 0.15 + state.wobble * 0.25;
      const wobbleLFO = Math.sin(state.wobblePhase) * state.wobble;
      const vibratoRatio = Math.pow(2, (Math.sin(t * 5 * Math.PI * 2) * 50 * (drone.droneVibrato || 0)) / 1200);
      const finalBaseFreq = (targetFreq + wobbleLFO * 4) * vibratoRatio;

      const audioNow = audioCtx?.currentTime ?? frameNow / 1000;
      const osc = state.osc;
      const filter = state.filter;
      const gain = state.gain;
      if (osc && filter && gain) {
        if (osc.type !== preset.oscA) osc.type = preset.oscA;
        if (filter.type !== preset.filterType) filter.type = preset.filterType;
        osc.frequency.setTargetAtTime(finalBaseFreq, audioNow, 0.15);
        filter.frequency.setTargetAtTime(targetCutoff + wobbleLFO * 800, audioNow, 0.15);
        filter.Q.setTargetAtTime(preset.qBase + tParam * preset.qSpan, audioNow, 0.15);
        gain.gain.setTargetAtTime(preset.gainA + tParam * preset.gainASpan + wobbleLFO * 0.015, audioNow, 0.15);
        if (state.oscB && state.gainB) {
          if (state.oscB.type !== preset.oscB) state.oscB.type = preset.oscB;
          state.oscB.frequency.setTargetAtTime(finalBaseFreq, audioNow, 0.15);
          state.oscB.detune.setTargetAtTime(overtoneCents + profileMix * preset.overtoneDriftCents, audioNow, 0.15);
          state.gainB.gain.setTargetAtTime(preset.gainBBase + profileMix * preset.gainBProfile, audioNow, 0.15);
        }
        if (state.lfo && state.lfoGain) {
          state.lfo.frequency.setTargetAtTime(preset.lfoBase + tParam * preset.lfoSpan, audioNow, 0.15);
          state.lfoGain.gain.setTargetAtTime(2 + tParam * 10, audioNow, 0.15);
        }
        if (state.delayNode && state.delayFeedback) {
          state.delayNode.delayTime.setTargetAtTime(simParams.echoTempo / 1000, audioNow, 0.1);
          state.delayFeedback.gain.setTargetAtTime(simParams.echoOn ? 0.6 : 0, audioNow, 0.1);
        }
      }

      syncResonanceAudioFrame({
        refs: state,
        audioTime: audioNow,
        drone,
        quantize,
        droneVolume,
        baseFreq: targetFreq,
      });

      state.ripples = state.ripples.filter(r => r.life > 0);
      state.ripples.forEach(r => {
        r.radius += 2.5;
        r.life -= 0.015;
      });
      state.sectorPulses = state.sectorPulses.filter((pulse) => pulse.persistent || pulse.life > 0.01);
      state.sectorPulses.forEach(pulse => {
        const isPersistent = !!pulse.persistent;
        pulse.radius += isPersistent ? pulse.speed ?? 3.2 : 2.5;
        if (!isPersistent) {
          pulse.life -= 0.015;
        } else {
          const maxReach = Math.hypot(gameWidth, gameHeight) * 1.15;
          if (pulse.radius > maxReach) {
            pulse.radius = 0;
            pulse.hitAgents = [];
          }
        }
      });

      tickResonanceAgents(
        state,
        {
          particleMute: simParams.particleMute,
          agentEnabled: simParams.agentEnabled,
          agentVolumes: simParams.agentVolumes,
          echoOn: simParams.echoOn,
          clickSoundOnly: simParams.clickSoundOnly,
          swarmWildness: simParams.swarmWildness,
          cursorGravity: simParams.cursorGravity,
          particleVolume: effectiveParticleVolume,
        },
        {
          gameWidth,
          gameHeight,
          frameNow,
          t,
          targetFreq,
          playNexusAgentTone,
          clampFreq,
        },
      );

      syncQuantizedParticleHits({
        refs: state,
        quantized: quantizedParticles,
        audioTime: audioNow,
        frameNow,
        baseFreq: freqFromY(state.cursorY),
      });
    },
    [
      room,
      nexusActive,
      audioCtx,
      gameWidth,
      gameHeight,
      freqFromY,
      nexusArrowRef,
      nexusRefs,
      nexusParamsRef,
      snapYToGrid,
      nParamsParticleVolume,
      impactDecayOn,
      waveLaunchAtRef,
      waveImpactDecayRef,
      droneFreqFromY,
      clampFreq,
      playNexusAgentTone,
      droneVolume,
    ],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const state = nexusRefs.current;
      const t = tRef.current;
      const frameNow = lastFrameNowRef.current;
      const drone = getDroneSlice(nexusParamsRef);
      const waveStart = getWaveStartSlice(nexusParamsRef);
      drawResonanceFrame(
        ctx,
        {
          cursorX: state.cursorX,
          cursorY: state.cursorY,
          cursorTrail: cursorTrailRef.current,
          ripples: state.ripples,
          sectorPulses: state.sectorPulses,
          agents: state.agents,
          swarmCollapseUntil: state.swarmCollapseUntil,
          waveTelemetry: buildResonanceWaveTelemetry({
            refs: state,
            droneWaveform: drone.droneOvertoneWaveform,
            waveStartWaveform: waveStart.waveStartWaveform,
          }),
        },
        getGridSlice(nexusParamsRef),
        gameWidth,
        gameHeight,
        t,
        frameNow,
        yFromDroneFreq,
        droneFreqFromY,
      );
    },
    [nexusRefs, nexusParamsRef, gameWidth, gameHeight, yFromDroneFreq, droneFreqFromY],
  );

  useSimulationLoop({
    canvasRef: nexusCanvasRef,
    active,
    update,
    draw,
    registerRaf: true,
    roomId: "RESONANCE",
    maxFrameMs: VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS,
  });

  useEffect(() => {
    if (room !== "RESONANCE" || !nexusActive || !audioCtx) return;

    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.value = 110;
    filter.type = "lowpass";
    filter.frequency.value = 400;
    filter.Q.value = 2;
    gain.gain.value = 0.02;

    osc.connect(filter);
    filter.connect(gain);
    // Routing is deferred to applyRealtimeDroneOvertones
    // gain.connect(ctx.destination);
    osc.start();

    const delayNode = ctx.createDelay(3.0);
    const delayFeedback = ctx.createGain();
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayNode.connect(ctx.destination);

    nexusRefs.current.osc = osc;
    nexusRefs.current.filter = filter;
    nexusRefs.current.gain = gain;
    nexusRefs.current.delayNode = delayNode;
    nexusRefs.current.delayFeedback = delayFeedback;

    if (Object.keys(nexusRefs.current.jiOscs).length === 0) {
      DRONE_JI_OVERTONES.forEach(node => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        g.gain.value = 0;
        o.connect(g);
        g.connect(filter);
        o.start();
        nexusRefs.current.jiOscs[node.label] = o;
        nexusRefs.current.jiGains[node.label] = g;
      });
    }

    if (nexusRefs.current.agents.length === 0) {
      const sim = getSimulationSlice(nexusParamsRef);
      const nodes = getParticleNodes(sim.particleSystem, sim.swarmCount);
      nexusRefs.current.agents = nodes.map((node, idx) => ({
        x: gameWidth * (0.1 + Math.random() * 0.8),
        y: gameHeight * (0.1 + Math.random() * 0.8),
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2,
        ratio: node.ratio,
        label: node.label,
        phase: Math.random() * Math.PI * 2,
        lastHit: sim.agentEnabled[idx] ? 0 : Number.POSITIVE_INFINITY,
        history: [],
      }));
    }

    // Initialize routing properly
    applyRealtimeDroneOvertones();

    return () => {
      osc.stop();
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
      if (nexusRefs.current.delayNode) nexusRefs.current.delayNode.disconnect();
      if (nexusRefs.current.delayFeedback) nexusRefs.current.delayFeedback.disconnect();
      Object.values(nexusRefs.current.jiOscs).forEach(o => { o.stop(); o.disconnect(); });
      Object.values(nexusRefs.current.jiGains).forEach(g => g.disconnect());
      nexusRefs.current.jiOscs = {};
      nexusRefs.current.jiGains = {};
    };
  }, [room, nexusActive, audioCtx]);
}
