import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';

export type DonorTimbreDescriptor = {
  spectralCentroid: number;
  spectralFlatness: number;
  harmonicity: number;
  transientDensity: number;
  brightness: number;
  donorTimbreKey: string;
};

export const FALLBACK_DONOR_TIMBRE_DESCRIPTOR: DonorTimbreDescriptor = {
  spectralCentroid: 0.42,
  spectralFlatness: 0.28,
  harmonicity: 0.6,
  transientDensity: 0.22,
  brightness: 0.45,
  donorTimbreKey: 'donor-timbre/no-donor',
};

const clamp01 = (value: number): number => (!Number.isFinite(value) ? 0 : value < 0 ? 0 : value > 1 ? 1 : value);
const r3 = (value: number): number => carrierIntegralRound3(clamp01(value));
const finish = (prefix: string, d: Omit<DonorTimbreDescriptor, 'donorTimbreKey'>): DonorTimbreDescriptor => ({
  ...d,
  donorTimbreKey: carrierIntegralHash31(`${prefix}|${d.spectralCentroid}|${d.spectralFlatness}|${d.harmonicity}|${d.transientDensity}|${d.brightness}`),
});

export function extractDonorTimbreFromAudioBuffer(buffer: AudioBuffer): DonorTimbreDescriptor {
  const { length, numberOfChannels } = buffer;
  if (length < 64 || numberOfChannels < 1) return FALLBACK_DONOR_TIMBRE_DESCRIPTOR;

  const stride = Math.max(1, Math.floor(length / 32768));
  let energy = 0, diffEnergy = 0, absSum = 0, prev = 0, signFlips = 0, transients = 0, count = 0;
  for (let i = 0; i < length; i += stride) {
    let sample = 0;
    for (let ch = 0; ch < numberOfChannels; ch += 1) sample += buffer.getChannelData(ch)[i] ?? 0;
    sample /= numberOfChannels;
    const abs = Math.abs(sample);
    const diff = sample - prev;
    energy += sample * sample;
    diffEnergy += diff * diff;
    absSum += abs;
    if ((sample < 0) !== (prev < 0)) signFlips += 1;
    if (Math.abs(diff) > 0.18 && abs > 0.02) transients += 1;
    prev = sample;
    count += 1;
  }
  if (energy < 1e-12 || count < 2) return FALLBACK_DONOR_TIMBRE_DESCRIPTOR;

  const zeroCross = signFlips / count;
  const roughness = Math.sqrt(diffEnergy / energy);
  const spectralCentroid = r3(zeroCross * 2.8 + roughness * 0.18);
  const spectralFlatness = r3(roughness * 0.42 + (absSum / count) * 0.9);
  const harmonicity = r3(1 - spectralFlatness * 0.72 - zeroCross * 0.7);
  const transientDensity = r3((transients / count) * 9);
  const brightness = r3(spectralCentroid * 1.12 + spectralFlatness * 0.06);
  return finish('donor-timbre', { spectralCentroid, spectralFlatness, harmonicity, transientDensity, brightness });
}

export function buildDonorTimbreDescriptorFromSynthLab(synthLab: {
  sine?: number;
  sawtooth?: number;
  sub?: number;
  overtone?: number;
  filterFrequency?: number;
  transientGain?: number;
  harmonicSpread?: number;
}): DonorTimbreDescriptor {
  const sine = clamp01(synthLab.sine ?? 0.48);
  const saw = clamp01(synthLab.sawtooth ?? 0.14);
  const sub = clamp01(synthLab.sub ?? 0.12);
  const overtone = clamp01(synthLab.overtone ?? 0.16);
  const harmonicSpread = clamp01(synthLab.harmonicSpread ?? 0.18);
  const spectralCentroid = r3(saw * 0.55 + overtone * 0.35 - sub * 0.25 + 0.35);
  const spectralFlatness = r3(saw * 0.55 + harmonicSpread * 0.3);
  const harmonicity = r3(sine * 0.7 - harmonicSpread * 0.2 + 0.3);
  const transientDensity = r3((synthLab.transientGain ?? 0.1) * 2.2);
  const brightness = r3(((synthLab.filterFrequency ?? 1650) - 400) / 6800);
  return finish('donor-timbre-synthlab', { spectralCentroid, spectralFlatness, harmonicity, transientDensity, brightness });
}
