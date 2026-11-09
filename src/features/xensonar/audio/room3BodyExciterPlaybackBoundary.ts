import type { AudioPressureEventKind, AudioPressureSource } from "@/core/audio/audioPressureMap";
import type { Room3BodyControls } from "@/features/resonance/timbreModel";
import type { Room3ExciterProfile, Room3ModalBodyState } from "@/features/resonance/modalBody";
import { clamp, foldFreqIntoRange } from "@/features/xensonar/rooms/resonanceRuntimeMath";

export interface Room3BodyVoiceLease {
  gainScale: number;
  release: () => void;
}

export interface Room3BodyExciterPlaybackOptions {
  voiceBudget?: number;
  bodyScale?: number;
  /** Reserve each resonant source before allocating its Web Audio graph. */
  acquireVoice?: () => Room3BodyVoiceLease | null;
}

export interface Room3BodyExciterPlaybackRuntime {
  audioCtx: AudioContext | null;
  enabled: boolean;
  bodyEnabled: boolean;
  topologyMode: string;
  destination: GainNode | null;
  noiseBuffer: AudioBuffer | null;
  modal: Room3ModalBodyState;
  controls: Room3BodyControls;
  recordAudioPressureCount: (source: AudioPressureSource, action: AudioPressureEventKind, count?: number) => void;
}

const disconnectNodes = (nodes: Array<AudioNode | null | undefined>) => {
  nodes.forEach((node) => {
    try {
      node?.disconnect();
    } catch {}
  });
};

export function triggerRoom3BodyExciterPlayback(
  runtime: Room3BodyExciterPlaybackRuntime,
  profile: Room3ExciterProfile,
  freq: number,
  intensity: number,
  options?: Room3BodyExciterPlaybackOptions,
): void {
  if (!runtime.audioCtx || !runtime.enabled || !runtime.bodyEnabled || runtime.topologyMode === "installation") return;
  const destination = runtime.destination;
  if (!destination) return;

  const ctx = runtime.audioCtx;
  const now = ctx.currentTime;
  const bodyScale = clamp(options?.bodyScale ?? 1, 0, 1.25);
  const safeIntensity = clamp(intensity * bodyScale, 0, 1.4);
  if (safeIntensity <= 0.001) return;

  const { modal, controls } = runtime;
  const bodyScalar = 0.28 + controls.coupling * 0.72;
  const baseFreq = modal.modes[1]?.freq ?? modal.modes[0]?.freq ?? freq;

  const connectVoiceChain = (
    source: AudioNode,
    base: number,
    level: number,
    startAt: number,
    owned: AudioNode[],
  ) => {
    const own = <T extends AudioNode>(node: T): T => { owned.push(node); return node; };
    const bandpass = own(ctx.createBiquadFilter());
    const highpass = own(ctx.createBiquadFilter());
    const lowpass = own(ctx.createBiquadFilter());
    const gain = own(ctx.createGain());
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(foldFreqIntoRange(base * 0.78 + baseFreq * 0.22, 70, 6200), startAt);
    bandpass.Q.setValueAtTime(profile.q, startAt);
    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(profile.highpassHz, startAt);
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(profile.lowpassHz, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, level), startAt + profile.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + profile.duration);
    source.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(destination);
  };

  const startOwnedSource = (
    createSource: () => OscillatorNode | AudioBufferSourceNode,
    configure: (source: OscillatorNode | AudioBufferSourceNode) => void,
    base: number,
    level: number,
    startAt: number,
    stopAt: number,
    pressureKind: "oscillator-start" | "buffer-source-start",
  ) => {
    const lease = options?.acquireVoice
      ? options.acquireVoice()
      : { gainScale: 1, release: () => undefined };
    if (!lease) return false;
    const owned: AudioNode[] = [];
    let source: OscillatorNode | AudioBufferSourceNode | null = null;
    let started = false;
    let released = false;
    const cleanup = () => {
      if (released) return;
      released = true;
      disconnectNodes(owned);
      lease.release();
    };
    try {
      source = createSource();
      owned.push(source);
      configure(source);
      connectVoiceChain(source, base, level * lease.gainScale, startAt, owned);
      source.onended = cleanup;
      source.start(startAt);
      started = true;
      source.stop(stopAt);
      runtime.recordAudioPressureCount("room3-body-exciter", pressureKind, 1);
      return true;
    } catch {
      if (started) {
        try { source?.stop(); } catch {}
      }
      cleanup();
      return false;
    }
  };

  const selectedVoices = profile.voices.slice(0, Math.max(1, options?.voiceBudget ?? profile.voices.length));
  for (const voice of selectedVoices) {
    const startAt = now + (voice.delay ?? 0);
    const base = foldFreqIntoRange(freq * voice.ratio, 50, 4200);
    startOwnedSource(
      () => ctx.createOscillator(),
      (source) => {
        const osc = source as OscillatorNode;
        osc.type = voice.type;
        osc.frequency.setValueAtTime(base, startAt);
        if (voice.detuneCents) osc.detune.setValueAtTime(voice.detuneCents, startAt);
      },
      base,
      safeIntensity * bodyScalar * profile.bodyGain * voice.gain,
      startAt,
      startAt + profile.duration + 0.06,
      "oscillator-start",
    );
  }

  if (profile.noiseGain > 0 && runtime.noiseBuffer) {
    startOwnedSource(
      () => ctx.createBufferSource(),
      (source) => { (source as AudioBufferSourceNode).buffer = runtime.noiseBuffer; },
      baseFreq * 1.4,
      safeIntensity * bodyScalar * profile.bodyGain * profile.noiseGain,
      now,
      now + profile.duration + 0.04,
      "buffer-source-start",
    );
  }

}
