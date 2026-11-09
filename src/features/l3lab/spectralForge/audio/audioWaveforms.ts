import type { WaveformMix } from "../state/storeTypes";

export function sawtoothWave(phase: number): number {
  const p = phase % (2 * Math.PI);
  return 2 * (p / (2 * Math.PI)) - 1;
}

export function squareWave(phase: number): number {
  return Math.sin(phase) >= 0 ? 1 : -1;
}

export function triangleWave(phase: number): number {
  const p = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return 2 * Math.abs(2 * (p / (2 * Math.PI)) - 1) - 1;
}

export function mixedWaveform(phase: number, mix: WaveformMix): number {
  const total = mix.sine + mix.sawtooth + mix.square + mix.triangle;
  if (total < 0.001) return 0;
  const norm = 1 / total;
  let out = 0;
  if (mix.sine > 0) out += mix.sine * norm * Math.sin(phase);
  if (mix.sawtooth > 0) out += mix.sawtooth * norm * sawtoothWave(phase);
  if (mix.square > 0) out += mix.square * norm * squareWave(phase);
  if (mix.triangle > 0) out += mix.triangle * norm * triangleWave(phase);
  return out;
}
