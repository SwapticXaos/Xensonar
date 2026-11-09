import { clamp } from "../../shared/tuning/grid";
import {
  BAR_COUNT,
  buildCompletionArrangement,
  platformerPitchToFreq,
  type CompletionPattern,
  type MovementEvent,
  type PlatformerArrangementForm,
  type PlatformerArrangementMode,
  type PlatformerTuningMode,
} from "../../game/jumpRunSoundtrack/platformerArrangement";
import type { PlatformerSectionBias } from "../../game/jumpRunSoundtrack/platformerSectionBias";

export type RenderPlatformerLoopToWavInput = {
  bars: number;
  bpm: number;
  movementEvents: MovementEvent[];
  fallbackPhrase: number[];
  arrangementMode: PlatformerArrangementMode;
  formMode: PlatformerArrangementForm;
  sectionBias: PlatformerSectionBias;
  tuningMode: PlatformerTuningMode;
  evolutionDepth: number;
  masterVolume?: number;
  rootHz?: number | null;
  sampleRate?: number;
};

export type RenderPlatformerLoopToWavResult = {
  blob: Blob;
  durationSec: number;
  formLabel: string;
  targetBpm: number;
  complexity: number;
};

type SynthVoice = "sine" | "triangle" | "square" | "saw";

function encodeMonoPcm16Wav(samples: Float32Array, sampleRate: number) {
  const frameCount = samples.length;
  const channelCount = 1;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeAscii = (text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset, text.charCodeAt(index));
      offset += 1;
    }
  };

  writeAscii("RIFF");
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeAscii("WAVE");
  writeAscii("fmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channelCount, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bytesPerSample * 8, true); offset += 2;
  writeAscii("data");
  view.setUint32(offset, dataSize, true); offset += 4;

  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(offset, Math.round(sample * 32767), true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function sampleWave(voice: SynthVoice, phase: number) {
  const wrapped = phase - Math.floor(phase);
  if (voice === "sine") return Math.sin(wrapped * Math.PI * 2);
  if (voice === "triangle") return 1 - 4 * Math.abs(wrapped - 0.5);
  if (voice === "square") return wrapped < 0.5 ? 1 : -1;
  return wrapped * 2 - 1;
}

function addTone(
  buffer: Float32Array,
  sampleRate: number,
  startSec: number,
  durationSec: number,
  freq: number,
  gain: number,
  voice: SynthVoice,
  panBias = 0,
) {
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const attack = Math.max(8, Math.floor(length * 0.06));
  const release = Math.max(16, Math.floor(length * 0.18));
  const vibratoRate = 4.8 + panBias * 0.7;
  const vibratoDepth = 0.0018 + Math.abs(panBias) * 0.0008;

  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    const t = i / sampleRate;
    const envIn = i < attack ? i / attack : 1;
    const envOut = i > length - release ? (length - i) / release : 1;
    const env = Math.max(0, envIn * envOut);
    const wobble = 1 + Math.sin(t * Math.PI * 2 * vibratoRate) * vibratoDepth;
    const phase = t * freq * wobble;
    buffer[start + i] += sampleWave(voice, phase) * gain * env;
  }
}

function addKick(buffer: Float32Array, sampleRate: number, startSec: number, gain: number) {
  const length = Math.floor(sampleRate * 0.18);
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 24);
    const freq = 120 - t * 420;
    const sample = Math.sin(Math.max(20, freq) * t * Math.PI * 2) * env * gain;
    buffer[start + i] += sample;
  }
}

function addSnare(buffer: Float32Array, sampleRate: number, startSec: number, gain: number) {
  const length = Math.floor(sampleRate * 0.14);
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  let noiseState = 0x12345678;
  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    noiseState ^= noiseState << 13;
    noiseState ^= noiseState >>> 17;
    noiseState ^= noiseState << 5;
    const white = ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / sampleRate;
    const env = Math.exp(-t * 26);
    const tone = Math.sin(180 * t * Math.PI * 2) * Math.exp(-t * 18) * 0.22;
    buffer[start + i] += (white * 0.78 + tone) * env * gain;
  }
}

function addHat(buffer: Float32Array, sampleRate: number, startSec: number, gain: number) {
  const length = Math.floor(sampleRate * 0.045);
  const start = Math.max(0, Math.floor(startSec * sampleRate));
  let noiseState = 0x87654321;
  for (let i = 0; i < length && start + i < buffer.length; i += 1) {
    noiseState ^= noiseState << 13;
    noiseState ^= noiseState >>> 17;
    noiseState ^= noiseState << 5;
    const white = ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
    const t = i / sampleRate;
    const env = Math.exp(-t * 70);
    buffer[start + i] += white * env * gain;
  }
}

function addChordPad(
  buffer: Float32Array,
  sampleRate: number,
  startSec: number,
  durationSec: number,
  chord: number[],
  rootHz: number,
  tuningMode: PlatformerTuningMode,
  gain: number,
) {
  chord.slice(0, 3).forEach((semi, index) => {
    addTone(
      buffer,
      sampleRate,
      startSec + index * 0.012,
      durationSec,
      platformerPitchToFreq(rootHz * 1.6, semi - (index === 0 ? 12 : 0), tuningMode),
      gain * (index === 0 ? 1 : 0.82),
      index === 1 ? "saw" : "triangle",
      index - 1,
    );
  });
}

function selectSectionPattern(patterns: CompletionPattern[], order: number[], absoluteBar: number) {
  const sectionCycle = Math.floor(absoluteBar / BAR_COUNT);
  const orderIndex = order.length > 0 ? sectionCycle % order.length : 0;
  const sectionId = order[orderIndex] ?? 0;
  const pattern = patterns[sectionId] ?? patterns[0];
  return {
    pattern,
    barInSection: ((absoluteBar % BAR_COUNT) + BAR_COUNT) % BAR_COUNT,
  };
}

function voiceFromMode(mode: PlatformerArrangementMode, family: "lead" | "arp" | "bass") {
  if (family === "bass") return mode === "glitch" ? "square" : "sine";
  if (family === "arp") return mode === "cinematic" ? "triangle" : "square";
  if (mode === "cinematic") return "triangle";
  if (mode === "glitch") return "saw";
  return family === "lead" ? "saw" : "triangle";
}

export async function renderPlatformerLoopToWav(
  input: RenderPlatformerLoopToWavInput,
): Promise<RenderPlatformerLoopToWavResult> {
  const bars = Math.max(1, Math.min(16, Math.round(input.bars)));
  const bpm = clamp(Number.isFinite(input.bpm) ? input.bpm : 110, 50, 220);
  const sampleRate = Math.max(22050, Math.min(48000, Math.round(input.sampleRate ?? 44100)));
  const masterVolume = clamp(input.masterVolume ?? 0.58, 0.05, 1);
  const rootHz = clamp(input.rootHz ?? 110, 55, 220);
  const fallbackPhrase = input.fallbackPhrase.length > 0 ? input.fallbackPhrase : [0, 3, 7, 10];
  const movementEvents = input.movementEvents ?? [];
  const beatDur = 60 / bpm / 2;
  const arrangement = buildCompletionArrangement(
    movementEvents,
    fallbackPhrase,
    beatDur,
    input.arrangementMode,
    clamp(input.evolutionDepth, 0, 1),
    input.formMode,
    input.sectionBias,
  );
  const secondsPerBar = (60 / bpm) * 4;
  const secondsPerStep = secondsPerBar / 8;
  const durationSec = bars * secondsPerBar;
  const buffer = new Float32Array(Math.max(1, Math.floor(durationSec * sampleRate)));

  for (let absoluteBar = 0; absoluteBar < bars; absoluteBar += 1) {
    const { pattern, barInSection } = selectSectionPattern(arrangement.sections, arrangement.order, absoluteBar);
    const chord = pattern.barChords[barInSection] ?? [pattern.barRoots[barInSection] ?? 0, 7, 10];
    const barStartSec = absoluteBar * secondsPerBar;
    addChordPad(
      buffer,
      sampleRate,
      barStartSec,
      Math.min(secondsPerBar * 0.88, durationSec - barStartSec),
      chord,
      rootHz,
      input.tuningMode,
      0.014 * masterVolume * (0.82 + pattern.airRatio * 0.4),
    );

    for (let stepInBar = 0; stepInBar < 8; stepInBar += 1) {
      const stepIndex = barInSection * 8 + stepInBar;
      const at = barStartSec + stepInBar * secondsPerStep + (stepInBar % 2 === 1 ? secondsPerStep * pattern.swing : 0);
      const accent = pattern.accent[stepIndex] ?? 0.35;
      const leadSemi = pattern.lead[stepIndex] != null ? pattern.lead[stepIndex] as number : null;
      const arpSemi = pattern.arp[stepIndex] != null ? pattern.arp[stepIndex] as number : null;
      const bassSemi = pattern.bass[stepIndex] != null ? pattern.bass[stepIndex] as number : null;

      if (leadSemi != null) {
        addTone(
          buffer,
          sampleRate,
          at,
          Math.min(secondsPerStep * (0.86 + accent * 0.45), durationSec - at),
          platformerPitchToFreq(rootHz * 3.8, leadSemi, input.tuningMode),
          0.05 * masterVolume * (0.8 + accent * 0.9),
          voiceFromMode(input.arrangementMode, "lead"),
          0.35,
        );
      }
      if (arpSemi != null) {
        addTone(
          buffer,
          sampleRate,
          at + secondsPerStep * 0.08,
          Math.min(secondsPerStep * 0.6, durationSec - at),
          platformerPitchToFreq(rootHz * 5.2, arpSemi, input.tuningMode),
          0.028 * masterVolume * (0.74 + accent * 0.5),
          voiceFromMode(input.arrangementMode, "arp"),
          -0.2,
        );
      }
      if (bassSemi != null) {
        addTone(
          buffer,
          sampleRate,
          at,
          Math.min(secondsPerStep * 0.9, durationSec - at),
          platformerPitchToFreq(rootHz * 1.1, bassSemi - 12, input.tuningMode),
          0.07 * masterVolume * (0.75 + accent * 0.55),
          voiceFromMode(input.arrangementMode, "bass"),
          0,
        );
      }
      if (pattern.kick[stepIndex]) {
        addKick(buffer, sampleRate, at, 0.18 * masterVolume * (0.8 + accent * 0.4));
      }
      if (pattern.snare[stepIndex]) {
        addSnare(buffer, sampleRate, at, 0.12 * masterVolume * (0.75 + accent * 0.5));
      }
      if (pattern.hat[stepIndex]) {
        addHat(buffer, sampleRate, at + secondsPerStep * 0.02, 0.05 * masterVolume * (0.8 + pattern.density * 0.1));
      }
      if (pattern.ghost[stepIndex]) {
        addTone(
          buffer,
          sampleRate,
          at + secondsPerStep * 0.03,
          Math.min(secondsPerStep * 0.28, durationSec - at),
          1000 + accent * 320,
          0.012 * masterVolume,
          "square",
          -0.45,
        );
      }
    }
  }

  const fadeSamples = Math.min(Math.floor(sampleRate * 0.03), Math.floor(buffer.length / 8));
  for (let i = 0; i < fadeSamples; i += 1) {
    const inGain = i / Math.max(1, fadeSamples);
    const outGain = (fadeSamples - i) / Math.max(1, fadeSamples);
    buffer[i] *= inGain;
    buffer[buffer.length - 1 - i] *= outGain;
  }

  const normalizer = Math.max(0.22, buffer.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0));
  const target = 0.86;
  if (normalizer > 0) {
    const scale = Math.min(1.35, target / normalizer);
    for (let i = 0; i < buffer.length; i += 1) {
      buffer[i] *= scale;
    }
  }

  return {
    blob: encodeMonoPcm16Wav(buffer, sampleRate),
    durationSec,
    formLabel: arrangement.formLabel,
    targetBpm: arrangement.targetBpm,
    complexity: arrangement.complexity,
  };
}
