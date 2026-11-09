export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

export const createMyzelNodeColorDriveCurve = () => {
  const samples = 512;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    const x = (i / (samples - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 2.15);
  }
  return curve;
};

export const createMyzelNoiseBuffer = (ctx: AudioContext) => {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.75)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x51f15e7;
  for (let i = 0; i < data.length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = (seed / 0xffffffff) * 2 - 1;
    const prev = i > 0 ? data[i - 1] : 0;
    data[i] = prev * 0.74 + white * 0.26;
  }
  return buffer;
};

export type NodeAuraSignature = {
  colorRatio: number;
  overtoneRatio: number;
  filterMul: number;
  qAdd: number;
  colorGain: number;
  noiseGain: number;
  drive: number;
  subBias: number;
  airBias: number;
  accentBias: number;
};

export const getNodeAuraSignature = (presetId: string | null | undefined): NodeAuraSignature => {
  switch (presetId) {
    case 'dreckecke':
      return { colorRatio: 1.48, overtoneRatio: 1.93, filterMul: 0.88, qAdd: 2.1, colorGain: 0.052, noiseGain: 0.022, drive: 0.72, subBias: 0.05, airBias: 0.02, accentBias: 0.9 };
    case 'metallcluster':
      return { colorRatio: 2.41, overtoneRatio: 2.76, filterMul: 1.62, qAdd: 3.1, colorGain: 0.046, noiseGain: 0.012, drive: 0.36, subBias: 0.03, airBias: 0.08, accentBias: 0.62 };
    case 'metall':
      return { colorRatio: 2.18, overtoneRatio: 2.45, filterMul: 1.44, qAdd: 2.5, colorGain: 0.038, noiseGain: 0.008, drive: 0.22, subBias: 0.02, airBias: 0.07, accentBias: 0.48 };
    case 'vokalecke':
      return { colorRatio: 1.01, overtoneRatio: 2.12, filterMul: 1.84, qAdd: 3.6, colorGain: 0.024, noiseGain: 0.004, drive: 0.08, subBias: 0.02, airBias: 0.06, accentBias: 0.44 };
    case 'vokal':
      return { colorRatio: 1.0, overtoneRatio: 2.0, filterMul: 1.68, qAdd: 3.0, colorGain: 0.02, noiseGain: 0.003, drive: 0.06, subBias: 0.02, airBias: 0.05, accentBias: 0.38 };
    case 'shimmerhof':
      return { colorRatio: 3.02, overtoneRatio: 3.31, filterMul: 2.42, qAdd: 0.7, colorGain: 0.028, noiseGain: 0.006, drive: 0.02, subBias: 0.0, airBias: 0.62, accentBias: 0.28 };
    case 'glas':
      return { colorRatio: 2.66, overtoneRatio: 3.02, filterMul: 2.08, qAdd: 1.1, colorGain: 0.032, noiseGain: 0.004, drive: 0.04, subBias: 0.0, airBias: 0.42, accentBias: 0.32 };
    case 'luft':
      return { colorRatio: 2.96, overtoneRatio: 3.54, filterMul: 2.28, qAdd: 0.4, colorGain: 0.018, noiseGain: 0.011, drive: 0.01, subBias: 0.0, airBias: 0.54, accentBias: 0.2 };
    case 'koernung':
      return { colorRatio: 1.73, overtoneRatio: 2.24, filterMul: 1.18, qAdd: 1.4, colorGain: 0.034, noiseGain: 0.024, drive: 0.2, subBias: 0.02, airBias: 0.16, accentBias: 0.58 };
    case 'subwurzel':
      return { colorRatio: 0.5, overtoneRatio: 1.25, filterMul: 0.62, qAdd: 1.0, colorGain: 0.018, noiseGain: 0.001, drive: 0.04, subBias: 0.68, airBias: 0.0, accentBias: 0.24 };
    case 'koerper':
      return { colorRatio: 1.25, overtoneRatio: 1.62, filterMul: 0.96, qAdd: 1.3, colorGain: 0.024, noiseGain: 0.003, drive: 0.06, subBias: 0.22, airBias: 0.04, accentBias: 0.36 };
    case 'custom':
      return { colorRatio: 1.5, overtoneRatio: 2.0, filterMul: 1.28, qAdd: 1.7, colorGain: 0.026, noiseGain: 0.006, drive: 0.12, subBias: 0.12, airBias: 0.12, accentBias: 0.4 };
    default:
      return { colorRatio: 1.5, overtoneRatio: 1.82, filterMul: 1.0, qAdd: 0.8, colorGain: 0.012, noiseGain: 0.001, drive: 0.03, subBias: 0.08, airBias: 0.04, accentBias: 0.2 };
  }
};

