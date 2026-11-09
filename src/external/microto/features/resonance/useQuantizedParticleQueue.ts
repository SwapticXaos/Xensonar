import { type MutableRefObject, useEffect, useRef } from "react";
import { type Room } from "../../app/roomRegistry";
import { clamp } from "../../shared/tuning/grid";
import { type ResonanceState } from "./config/state";
import type { ParticlePreset } from "./config/types";
import { getQuantizedParticleSlice } from "./config/stateSlices";
import type { NexusRuntimeRefsRef, QuantizedParticleEvent } from "./resonanceRefs";

type UseQuantizedParticleQueueArgs = {
  room: Room;
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  nexusParamsRef: MutableRefObject<ResonanceState>;
  nexusRefs: NexusRuntimeRefsRef;
  updateNParams: (partial: Partial<ResonanceState>) => void;
};

export function useQuantizedParticleQueue({
  room,
  audioCtx,
  nexusActive,
  nexusParamsRef,
  nexusRefs,
  updateNParams,
}: UseQuantizedParticleQueueArgs) {
  const quantizedFlushTimerRef = useRef<number | null>(null);
  const quantizedMuteBackupRef = useRef<{ active: boolean; prevMute: boolean }>({ active: false, prevMute: false });

  const playQuantizedParticleTone = (
    ctx: AudioContext,
    freq: number,
    amp: number,
    preset: ParticlePreset,
    when: number,
  ) => {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, when);

    const safeAmp = clamp(amp, 0, 0.6);
    const f = clamp(freq, 40, 4000);

    if (preset === "woodblock") {
      const o = ctx.createOscillator();
      const f1 = ctx.createBiquadFilter();
      o.type = "square";
      o.frequency.setValueAtTime(f * 1.6, when);
      f1.type = "lowpass";
      f1.frequency.setValueAtTime(880, when);
      gain.gain.linearRampToValueAtTime(safeAmp * 0.9, when + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
      o.connect(f1);
      f1.connect(gain);
      o.start(when);
      o.stop(when + 0.12);
      return;
    }

    if (preset === "crystal_bowl") {
      const a = ctx.createOscillator();
      const b = ctx.createOscillator();
      a.type = "sine";
      b.type = "sine";
      a.frequency.setValueAtTime(f, when);
      b.frequency.setValueAtTime(f * 1.004, when);
      gain.gain.linearRampToValueAtTime(safeAmp * 0.75, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
      a.connect(gain);
      b.connect(gain);
      a.start(when);
      b.start(when);
      a.stop(when + 0.6);
      b.stop(when + 0.6);
      return;
    }

    const osc = ctx.createOscillator();
    osc.type = preset === "pizzicato" ? "sawtooth" : preset === "fm_bell" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(f, when);
    gain.gain.linearRampToValueAtTime(safeAmp, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
    osc.connect(gain);
    osc.start(when);
    osc.stop(when + 0.2);
  };

  useEffect(() => {
    if (room !== "RESONANCE" || !audioCtx || !nexusActive) return;

    const flushQueuedHits = () => {
      const q = getQuantizedParticleSlice(nexusParamsRef);
      const quantizeEnabled = !!(q.quantizeEvents ?? q.quantizeOn);
      const nexusSignalReady = !!nexusRefs.current.gain;

      if (!quantizeEnabled || !nexusSignalReady) {
        const now = audioCtx.currentTime;
        const queue = nexusRefs.current.quantizedHitQueue;
        if (queue.length > 0) {
          queue.sort((a, b) => a.dueTime - b.dueTime);
          while (queue.length && queue[0].dueTime <= now + 0.05) {
            const ev = queue.shift();
            if (!ev) break;
            playQuantizedParticleTone(audioCtx, ev.freq, ev.amp, ev.preset, ev.dueTime);
          }
        }
        if (quantizedMuteBackupRef.current.active) {
          const prev = quantizedMuteBackupRef.current.prevMute;
          quantizedMuteBackupRef.current.active = false;
          updateNParams({ particleMute: prev });
        }
        nexusRefs.current.quantizedHitQueue = [];
        nexusRefs.current.quantizedLastHitByAgent = [];
        return;
      }

      if (!quantizedMuteBackupRef.current.active) {
        quantizedMuteBackupRef.current = {
          active: true,
          prevMute: !!q.particleMute,
        };
        updateNParams({ particleMute: true });
      }

      const now = audioCtx.currentTime;
      const queue: QuantizedParticleEvent[] = nexusRefs.current.quantizedHitQueue;
      if (!queue.length) return;

      queue.sort((a, b) => a.dueTime - b.dueTime);
      while (queue.length && queue[0].dueTime <= now + 0.03) {
        const ev = queue.shift();
        if (!ev) break;
        playQuantizedParticleTone(audioCtx, ev.freq, ev.amp, ev.preset, ev.dueTime);
      }
    };

    flushQueuedHits();
    quantizedFlushTimerRef.current = window.setInterval(flushQueuedHits, 20);

    return () => {
      if (quantizedFlushTimerRef.current !== null) {
        window.clearInterval(quantizedFlushTimerRef.current);
        quantizedFlushTimerRef.current = null;
      }
      if (quantizedMuteBackupRef.current.active) {
        const prev = quantizedMuteBackupRef.current.prevMute;
        quantizedMuteBackupRef.current.active = false;
        updateNParams({ particleMute: prev });
      }
      nexusRefs.current.quantizedHitQueue = [];
      nexusRefs.current.quantizedLastHitByAgent = [];
    };
  }, [audioCtx, nexusActive, room, nexusParamsRef, nexusRefs, updateNParams]);
}
