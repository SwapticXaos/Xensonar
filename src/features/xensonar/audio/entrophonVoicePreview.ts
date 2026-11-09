import {
  makeXensonarEngineDriveCurve,
  resolveXensonarMicrotonalVoice,
  type EntrophonSurfaceSoundConfig,
} from "../../../core/audio/xensonarMicrotonalSoundEngine";
import { createScheduledToneGraph } from "./scheduledToneLifecycle";

type PreviewSession = { graph: ReturnType<typeof createScheduledToneGraph>; master: GainNode };

/** Audition owns one context. Repeated clicks retire the previous graph with a short fade. */
export function createEntrophonVoicePreview(
  createContext = (): AudioContext | null => {
    const Constructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Constructor ? new Constructor() : null;
  },
) {
  let context: AudioContext | null = null;
  let session: PreviewSession | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  const retiring = new Map<ReturnType<typeof setTimeout>, PreviewSession>();
  const report = (error: unknown) => console.error("[Entrophon preview]", error);
  const dispose = () => {
    if (closeTimer !== null) clearTimeout(closeTimer);
    closeTimer = null;
    session?.graph.dispose();
    session = null;
    for (const [timer, previous] of retiring) {
      clearTimeout(timer);
      previous.graph.dispose();
    }
    retiring.clear();
    const previousContext = context;
    context = null;
    if (previousContext && previousContext.state !== "closed") void previousContext.close().catch(report);
  };
  return {
    dispose,
    play(cfg: EntrophonSurfaceSoundConfig, previewFreq = 196): void {
      if (!Number.isFinite(previewFreq) || previewFreq <= 0 || !Number.isFinite(cfg.volume)) return;
      if (closeTimer !== null) clearTimeout(closeTimer);
      const graph = createScheduledToneGraph();
      try {
        if (!context || context.state === "closed") context = createContext();
        if (!context) return;
        const ctx = context;
        if (ctx.state === "suspended") void ctx.resume().catch(report);
        if (session) {
          const previous = session;
          previous.master.gain.cancelScheduledValues(ctx.currentTime);
          previous.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.004);
          const timer = setTimeout(() => {
            previous.graph.dispose();
            retiring.delete(timer);
          }, 24);
          retiring.set(timer, previous);
          // Repeated programmatic clicks cannot retain an unbounded stack of fade-outs.
          if (retiring.size > 4) {
            const oldest = retiring.entries().next().value!;
            clearTimeout(oldest[0]);
            oldest[1].graph.dispose();
            retiring.delete(oldest[0]);
          }
          session = null;
        }
        const now = ctx.currentTime + 0.02;
        const voice = resolveXensonarMicrotonalVoice({ surface: "wave", freq: previewFreq });
        const master = graph.own(ctx.createGain());
        const filter = graph.own(ctx.createBiquadFilter());
        const drive = graph.own(ctx.createWaveShaper());
        const gain = graph.own(ctx.createGain());
        filter.type = voice.filterType;
        filter.frequency.setValueAtTime(voice.filterFreq, now);
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(80, voice.filterFreq * (0.55 + cfg.filterEnvAmount * 0.35)),
          now + Math.max(0.02, cfg.filterDecay),
        );
        filter.Q.setValueAtTime(voice.filterQ, now);
        drive.curve = makeXensonarEngineDriveCurve(voice.drive);
        drive.oversample = "2x";
        master.gain.setValueAtTime(0.7, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.18 * cfg.volume), now + Math.max(0.001, cfg.attack));
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, 0.18 * cfg.volume * cfg.sustain),
          now + Math.max(0.005, cfg.attack + cfg.decay),
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + cfg.release * 0.4);
        gain.connect(filter);
        filter.connect(drive);
        drive.connect(master);
        if (cfg.delayAmount > 0.001) {
          const delay = graph.own(ctx.createDelay(1.5));
          const delayGain = graph.own(ctx.createGain());
          const fb = graph.own(ctx.createGain());
          delay.delayTime.setValueAtTime(0.095, now);
          delayGain.gain.setValueAtTime(cfg.delayAmount * 0.18, now);
          fb.gain.setValueAtTime(cfg.delayAmount * 0.28, now);
          drive.connect(delay);
          delay.connect(fb);
          fb.connect(delay);
          delay.connect(delayGain);
          delayGain.connect(master);
        }
        master.connect(ctx.destination);
        const allFreqs = [...voice.oscillatorFreqs, ...voice.colorFreqs];
        allFreqs.forEach((freq, index) => {
          const osc = graph.own(ctx.createOscillator());
          const vg = graph.own(ctx.createGain());
          osc.type = index < voice.oscillatorFreqs.length ? voice.waveform : "square";
          osc.frequency.setValueAtTime(freq, now);
          if (Math.abs(cfg.pitchBend) > 0.001) {
            osc.frequency.exponentialRampToValueAtTime(
              Math.max(10, freq * Math.pow(2, cfg.pitchBend / 12)),
              now + cfg.pitchBendTime,
            );
          }
          const level =
            index < voice.oscillatorFreqs.length ? 1 : (voice.colorGains[index - voice.oscillatorFreqs.length] ?? 0.12);
          vg.gain.setValueAtTime(level / Math.max(1, allFreqs.length * 0.65), now);
          osc.connect(vg);
          vg.connect(gain);
          osc.start(now);
          osc.stop(now + 0.36 + cfg.release * 0.5);
        });
        session = { graph, master };
        closeTimer = setTimeout(dispose, 900 + cfg.release * 600);
      } catch (error) {
        graph.dispose();
        dispose();
        report(error);
      }
    },
  };
}
