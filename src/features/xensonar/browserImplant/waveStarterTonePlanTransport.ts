import { TonePlanRecordEncoder, type TonePlanTransportValue } from "./protocol/tonePlanRecord";

type WaveformName = OscillatorType;
export type ResolvedWaveStarterCorePlanLike = {
  tones: readonly {
    frequencyHz: number;
    gain: number;
    delaySec: number;
    durationSec: number;
    waveform: WaveformName;
    resonance: number;
    cutoffHz: number;
  }[];
};

const WAVEFORM: Partial<Record<WaveformName, number>> = { sine: 0, triangle: 1, sawtooth: 2, square: 3 };

/** Pure membrane: existing Xensonar resolved plan -> browser transport record. */
export function encodeResolvedWaveStarterCoreForKernel(args: {
  plan: ResolvedWaveStarterCorePlanLike;
  sampleRate: number;
  epoch: number;
  frame: bigint | number;
  token: number;
  eventId?: number;
  encoder?: TonePlanRecordEncoder;
}): Uint32Array {
  const sr = args.sampleRate;
  if (!Number.isFinite(sr) || sr < 8000 || sr > 384000) throw new RangeError("sampleRate");
  const value: TonePlanTransportValue = {
    token: args.token,
    epoch: args.epoch,
    frame: args.frame,
    eventId: args.eventId,
    tones: args.plan.tones.map(t => {
      const waveform = WAVEFORM[t.waveform];
      if (waveform === undefined) throw new RangeError(`unsupported core waveform: ${t.waveform}`);
      return {
        frequencyHz: t.frequencyHz,
        gain: t.gain,
        cutoffHz: t.cutoffHz,
        resonance: t.resonance,
        delayFrames: Math.max(0, Math.round(t.delaySec * sr)),
        durationFrames: Math.max(2, Math.round(t.durationSec * sr)),
        waveform,
      };
    }),
  };
  return (args.encoder ?? new TonePlanRecordEncoder()).encode(value);
}
