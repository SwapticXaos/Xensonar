import type { SpectralData } from '../audio/SpectralData';
import { computeSpektralSyntheseDescriptor } from './carrierIntegralSpektralSyntheseDescriptor';
import { carrierIntegralRootRelativePolytraceLogHzFromY } from './carrierIntegralPitchAxisContract';
import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';

export const CARRIER_INTEGRAL_BERT_HARMONIC_POLYTRACE_VERSION =
  'bpt35-root-relative-restore';


type BertPolytracePeak = {
  logHz: number;
  energy: number;
  grain: number;
};

export type CarrierIntegralPolytraceTimbre = 'acid' | 'fm' | 'vocal';

function resolveCarrierIntegralPolytraceTimbre(options: { fm?: boolean; timbre?: CarrierIntegralPolytraceTimbre }): CarrierIntegralPolytraceTimbre {
  return options.timbre ?? (options.fm ? 'fm' : 'acid');
}

export type CarrierIntegralBertHarmonicPolytraceRenderOptions = {
  spectralData: SpectralData;
  durationSec: number;
  sampleRate?: number;
  baseHz: number;
  gain?: number;
  maxVoices?: number;
  /** @deprecated use timbre: 'fm' for Antonia; kept for older call-sites. */
  fm?: boolean;
  timbre?: CarrierIntegralPolytraceTimbre;
};

export type CarrierIntegralBertHarmonicPolytraceRenderResult = {
  buffer: AudioBuffer;
  audioIdentityKey: string;
  activeColumnRatio: number;
  maxSimultaneousPeaks: number;
  peak: number;
};

const DEFAULT_SAMPLE_RATE = 48000;
const DEFAULT_GAIN = 0.46;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function slewCoef(ms: number, sampleRate: number): number {
  return 1 - Math.exp(-1 / Math.max(1, sampleRate * Math.max(0.001, ms / 1000)));
}

function seededSignedUnit(seed: string, a: number, b: number): number {
  let hash = 2166136261;
  const key = `${seed}|${a}|${b}`;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return (hash / 0xffffffff) * 2 - 1;
}

function safeTriangleFromPhase(phase: number): number {
  const normalized = ((phase / (Math.PI * 2)) % 1 + 1) % 1;
  return 1 - 4 * Math.abs(normalized - 0.5);
}

function logBell(hz: number, centerHz: number, widthOctaves: number): number {
  const d = Math.log2(clamp(hz, 1, 24000) / Math.max(1, centerHz));
  return Math.exp(-(d * d) / Math.max(0.001, 2 * widthOctaves * widthOctaves));
}

function peakToRelativeLogHz(y: number, specHeight: number, anchorRootHz: number): number {
  // Regression guard: Antonia, Bert and Cecilia are musical carrier readings,
  // not direct copies of the visible 20 Hz–20 kHz paint axis. The 7.7.43+ display-axis
  // unification pitched dense/high drawings upward and collapsed the audible distance
  // between FM, acid/prism and vocal polytrace. Restore the 7.7.35 root-relative
  // reading: painted height bends around the Root-Follow base instead of replacing it.
  return carrierIntegralRootRelativePolytraceLogHzFromY(y, specHeight, anchorRootHz);
}

function buildColumnPeaks(args: {
  spectralData: SpectralData;
  x: number;
  baseHz: number;
  detailBoost: number;
  maxVoices: number;
}): { peaks: BertPolytracePeak[]; energy: number; activeBinRatio: number } {
  const { spectralData, x, detailBoost } = args;
  const height = spectralData.height;
  const activeThreshold = 0.010 - detailBoost * 0.003;
  const peakThreshold = 0.024 - detailBoost * 0.010;
  const contrastThreshold = 0.012 - detailBoost * 0.005;
  const filledBandThreshold = 0.055 - detailBoost * 0.018;
  const raw: BertPolytracePeak[] = [];
  let energy = 0;
  let activeBins = 0;
  for (let y = 0; y < height; y += 1) {
    const val = clamp(spectralData.get(x, y), 0, 1);
    energy += val;
    if (val > activeThreshold) activeBins += 1;
    const below = y > 0 ? clamp(spectralData.get(x, y - 1), 0, 1) : 0;
    const above = y < height - 1 ? clamp(spectralData.get(x, y + 1), 0, 1) : 0;
    const localContrast = val - 0.5 * (below + above);
    const localPeak = val >= below && val >= above;
    const contourPeak = localPeak && val > activeThreshold && localContrast > contrastThreshold;
    const filledBand = detailBoost > 0.38
      && val > filledBandThreshold
      && Math.abs(above - below) < 0.020 + detailBoost * 0.018
      && (y % Math.max(2, Math.round(5 - detailBoost * 2)) === 0);
    if ((localPeak && val > peakThreshold) || contourPeak || filledBand) {
      raw.push({
        logHz: peakToRelativeLogHz(y, height, args.baseHz),
        energy: clamp(val + Math.max(0, localContrast) * (0.7 + detailBoost * 0.8) + (filledBand ? 0.04 : 0), 0, 1),
        grain: clamp(spectralData.getGrain(x, y), 0, 1),
      });
    }
  }
  raw.sort((a, b) => b.energy - a.energy);
  const selected: BertPolytracePeak[] = [];
  const seedDistance = 0.075 - detailBoost * 0.025;
  const maxPeaks = Math.max(args.maxVoices, Math.min(height, args.maxVoices * 2));

  // Preserve painted simultaneity: first reserve distinct registers, then fill by energy.
  for (const peak of raw) {
    if (selected.length >= args.maxVoices) break;
    if (selected.some((entry) => Math.abs(entry.logHz - peak.logHz) < seedDistance)) continue;
    selected.push(peak);
  }
  for (const peak of raw) {
    if (selected.length >= maxPeaks) break;
    if (selected.includes(peak)) continue;
    selected.push(peak);
  }
  selected.length = Math.min(selected.length, args.maxVoices);
  return { peaks: selected, energy, activeBinRatio: activeBins / Math.max(1, height) };
}

function buildAudioBuffer(channelData: Float32Array, sampleRate: number): AudioBuffer {
  const buffer = new AudioBuffer({ numberOfChannels: 1, length: channelData.length, sampleRate });
  buffer.getChannelData(0).set(channelData as unknown as ArrayLike<number>);
  return buffer;
}



export function buildCarrierIntegralBertHarmonicPolytracePreviewKey(args: {
  spectralData: SpectralData;
  durationSec: number;
  sampleRate: number;
  baseHz: number;
  gain: number;
  maxVoices: number;
  timbre?: CarrierIntegralPolytraceTimbre;
}): string {
  const descriptor = computeSpektralSyntheseDescriptor(args.spectralData);
  return carrierIntegralHash31([
    CARRIER_INTEGRAL_BERT_HARMONIC_POLYTRACE_VERSION,
    descriptor.descriptorKey,
    descriptor.spectralStructureKey,
    descriptor.hasMaterial ? 'material' : 'silent',
    Math.round(args.durationSec * 1000),
    Math.round(args.sampleRate),
    Math.round(args.baseHz * 100),
    Math.round(args.gain * 1000),
    args.maxVoices,
    args.timbre ?? 'acid',
  ].join('|'));
}


export function renderCarrierIntegralBertHarmonicPolytracePreviewBuffer(
  options: CarrierIntegralBertHarmonicPolytraceRenderOptions,
): CarrierIntegralBertHarmonicPolytraceRenderResult {
  const spectralData = options.spectralData;
  const sampleRate = Math.max(8000, Math.round(options.sampleRate ?? DEFAULT_SAMPLE_RATE));
  const durationSec = Math.max(0.005, options.durationSec);
  const sampleCount = Math.max(1, Math.ceil(durationSec * sampleRate));
  const timbre = resolveCarrierIntegralPolytraceTimbre(options);
  const fm = timbre === 'fm';
  const vocal = timbre === 'vocal';
  const maxVoices = Math.max(4, Math.min(20, Math.round(options.maxVoices ?? (fm ? 12 : vocal ? 16 : 14))));
  const baseHz = clamp(options.baseHz, 16, 20000);
  const gain = clamp(options.gain ?? DEFAULT_GAIN, 0, 1);
  const channelData = new Float32Array(sampleCount);

  const descriptor = computeSpektralSyntheseDescriptor(spectralData);
  const audioIdentityKey = buildCarrierIntegralBertHarmonicPolytracePreviewKey({
    spectralData,
    durationSec,
    sampleRate,
    baseHz,
    gain,
    maxVoices,
    timbre,
  });

  if (!descriptor.hasMaterial || spectralData.width < 1 || spectralData.height < 1) {
    return { buffer: buildAudioBuffer(channelData, sampleRate), audioIdentityKey, activeColumnRatio: 0, maxSimultaneousPeaks: 0, peak: 0 };
  }

  const phases = new Float64Array(maxVoices * 4);
  const voiceLogHz = new Float64Array(maxVoices).fill(Math.log2(baseHz));
  const targetLogHz = new Float64Array(maxVoices).fill(Math.log2(baseHz));
  const velocityLog = new Float64Array(maxVoices);
  const voiceGain = new Float64Array(maxVoices);
  const targetGain = new Float64Array(maxVoices);
  const voiceGrain = new Float64Array(maxVoices).fill(0.5);
  const matchedVoice = new Uint8Array(maxVoices);
  const matchedPeak = new Uint8Array(maxVoices * 2);
  for (let index = 0; index < phases.length; index += 1) {
    phases[index] = (seededSignedUnit(audioIdentityKey, index, 31) + 1) * Math.PI;
  }

  const ratios = [1, 2, 3, 5];
  const partialGains = [1.0, 0.18, 0.085, 0.045];
  const twoPi = Math.PI * 2;
  const detailBoost = clamp(descriptor.density * 0.45 + descriptor.registerSpan * 0.26 + descriptor.edgeDensity * 0.29, 0, 1);
  const attack = slewCoef(vocal ? 8.5 + (1 - descriptor.edgeDensity) * 7.5 : 4.8 + (1 - descriptor.edgeDensity) * 3.4, sampleRate);
  const release = slewCoef(26 + descriptor.horizontality * 18, sampleRate);
  const vocalReleaseActive = slewCoef(58 + descriptor.horizontality * 36, sampleRate);
  const vocalReleaseSilence = slewCoef(18, sampleRate);
  const pitchSlewFast = slewCoef(vocal ? 8.5 + descriptor.grainTexture * 6.5 : 5.6 + descriptor.grainTexture * 4.8, sampleRate);
  const grainSlew = slewCoef(22, sampleRate * Math.max(1, spectralData.width) / Math.max(1, sampleCount));
  let lastX = -1;
  let peak = 0;
  let activeColumns = 0;
  let maxSimultaneousPeaks = 0;
  let currentColumnEnergy = 0;
  let currentActiveRatio = 0;
  let currentColumnStillPainted = false;
  let filterState = 0;

  for (let i = 0; i < sampleCount; i += 1) {
    const ratio = i / Math.max(1, sampleCount - 1);
    const x = Math.min(spectralData.width - 1, Math.floor(ratio * spectralData.width));
    if (x !== lastX) {
      lastX = x;
      const column = buildColumnPeaks({ spectralData, x, baseHz, detailBoost, maxVoices });
      currentColumnEnergy = column.energy;
      currentActiveRatio = column.activeBinRatio;
      if (column.peaks.length > 0) activeColumns += 1;
      maxSimultaneousPeaks = Math.max(maxSimultaneousPeaks, column.peaks.length);
      matchedVoice.fill(0);
      matchedPeak.fill(0);

      for (let v = 0; v < maxVoices; v += 1) {
        if (voiceGain[v] > 0.002) targetLogHz[v] = voiceLogHz[v] + velocityLog[v];
      }

      const matchLimit = 0.54 - detailBoost * 0.18;
      for (let iter = 0; iter < Math.min(maxVoices, column.peaks.length); iter += 1) {
        let bestVoice = -1;
        let bestPeak = -1;
        let bestDistance = Infinity;
        for (let v = 0; v < maxVoices; v += 1) {
          if (matchedVoice[v] || voiceGain[v] <= 0.002) continue;
          for (let p = 0; p < column.peaks.length; p += 1) {
            if (matchedPeak[p]) continue;
            const distance = Math.abs((targetLogHz[v] ?? voiceLogHz[v]) - column.peaks[p]!.logHz);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestVoice = v;
              bestPeak = p;
            }
          }
        }
        if (bestVoice !== -1 && bestPeak !== -1 && bestDistance < matchLimit) {
          const peakData = column.peaks[bestPeak]!;
          matchedVoice[bestVoice] = 1;
          matchedPeak[bestPeak] = 1;
          velocityLog[bestVoice] = (peakData.logHz - voiceLogHz[bestVoice]) * 0.30;
          targetLogHz[bestVoice] = peakData.logHz;
          targetGain[bestVoice] = Math.pow(peakData.energy, 1.15) * (0.78 + detailBoost * 0.22);
          voiceGrain[bestVoice] += (peakData.grain - voiceGrain[bestVoice]) * grainSlew;
        }
      }

      for (let p = 0; p < column.peaks.length; p += 1) {
        if (matchedPeak[p]) continue;
        let voice = -1;
        let quietest = Infinity;
        for (let v = 0; v < maxVoices; v += 1) {
          if (matchedVoice[v]) continue;
          const score = Math.max(voiceGain[v], targetGain[v]);
          if (score < quietest) {
            quietest = score;
            voice = v;
          }
        }
        if (voice === -1) continue;
        const peakData = column.peaks[p]!;
        matchedVoice[voice] = 1;
        matchedPeak[p] = 1;
        targetLogHz[voice] = peakData.logHz;
        if (voiceGain[voice] < 0.03) voiceLogHz[voice] = peakData.logHz;
        velocityLog[voice] = 0;
        targetGain[voice] = Math.pow(peakData.energy, 1.15) * (0.78 + detailBoost * 0.22);
        voiceGrain[voice] = peakData.grain;
      }

      currentColumnStillPainted = currentColumnEnergy > spectralData.height * 0.012 || currentActiveRatio > 0.018;
      for (let v = 0; v < maxVoices; v += 1) {
        if (!matchedVoice[v]) targetGain[v] = currentColumnStillPainted ? targetGain[v] * (vocal ? 0.74 : 0.58) : 0;
      }
    }

    const columnBody = clamp(currentColumnEnergy / Math.max(1, spectralData.height * 0.18), 0, 1);
    const prismaticColor = clamp(descriptor.contrast * 0.26 + descriptor.entropy * 0.32 + currentActiveRatio * 0.22 + descriptor.edgeDensity * 0.2, 0, 1);
    const voiceNorm = 1 / Math.sqrt(Math.max(1, maxVoices * (0.35 + columnBody * 0.65)));
    let out = 0;
    let liveVoices = 0;

    for (let v = 0; v < maxVoices; v += 1) {
      const gSlew = targetGain[v] > voiceGain[v] ? attack : (vocal ? (currentColumnStillPainted ? vocalReleaseActive : vocalReleaseSilence) : release);
      voiceGain[v] += (targetGain[v] - voiceGain[v]) * gSlew;
      if (voiceGain[v] <= 0.0008) continue;
      liveVoices += 1;
      voiceLogHz[v] += (targetLogHz[v] - voiceLogHz[v]) * pitchSlewFast;
      const grain = clamp(voiceGrain[v], 0, 1);
      const voiceHz = Math.pow(2, voiceLogHz[v]);
      const panlessWeight = voiceGain[v] * voiceNorm;
      for (let o = 0; o < ratios.length; o += 1) {
        const phaseIndex = v * ratios.length + o;
        const detuneCents = (o === 0 ? 0 : seededSignedUnit(audioIdentityKey, v, o) * (1 - grain) * (3.5 + prismaticColor * 7));
        const hz = clamp(voiceHz * ratios[o]! * Math.pow(2, detuneCents / 1200), 10, sampleRate * 0.45);
        phases[phaseIndex] += (twoPi * hz) / sampleRate;
        if (phases[phaseIndex] > twoPi) phases[phaseIndex] -= twoPi * Math.floor(phases[phaseIndex] / twoPi);
        const phase = phases[phaseIndex];
        const sine = Math.sin(phase);
        const folded = Math.tanh(sine * (1 + prismaticColor * 0.82 + (1 - grain) * 0.38));
        const saw = (phase / twoPi) * 2 - 1;
        const acid = Math.tanh((saw * 0.68 + sine * 0.42) * (1.05 + prismaticColor * 1.15));
        const f1 = 360 + columnBody * 320 + (1 - grain) * 70;
        const f2 = 820 + descriptor.vertCenter * 950 + prismaticColor * 260;
        const f3 = 2350 + descriptor.edgeDensity * 520 + grain * 180;
        const formant = vocal
          ? 0.22 + 0.70 * logBell(hz, f1, 0.34) + 0.62 * logBell(hz, f2, 0.28) + 0.34 * logBell(hz, f3, 0.22)
          : 1;
        const glottal = Math.tanh((sine * 0.76 + safeTriangleFromPhase(phase) * 0.18 + folded * 0.13) * (0.96 + prismaticColor * 0.24));
        const wave = fm
          ? Math.sin(phase + (0.4 + prismaticColor) * sine)
          : vocal
            ? glottal
            : sine * (0.72 - prismaticColor * 0.06) + folded * (0.10 + prismaticColor * 0.13) + acid * (0.13 + prismaticColor * 0.14);
        const baseTilt = fm ? (o ? 0.08 / o : 1) : (vocal ? ([1.0, 0.52, 0.34, 0.20][o] ?? partialGains[o]!) : partialGains[o]!);
        const tilt = baseTilt * (o === 0 ? 1 : (0.68 + columnBody * 0.18 + prismaticColor * 0.08)) * formant;
        out += wave * panlessWeight * tilt;
      }
    }

    if (liveVoices === 0) {
      filterState *= 0.35;
      channelData[i] = 0;
    } else {
      const filterCoef = vocal ? clamp(0.026 + columnBody * 0.024 + prismaticColor * 0.025, 0.022, 0.085) : clamp(0.050 + columnBody * 0.045 + prismaticColor * 0.055, 0.035, 0.17);
      filterState += (out - filterState) * filterCoef;
      const smoothed = filterState + (out - filterState) * (vocal ? 0.075 + descriptor.edgeDensity * 0.08 : 0.16 + descriptor.edgeDensity * 0.18);
      const shaped = Math.tanh(smoothed * gain * (0.98 + descriptor.registerSpan * 0.14));
      channelData[i] = shaped;
      peak = Math.max(peak, Math.abs(shaped));
    }
  }

  // Short edge fade only; this is not a sustaining ground tone.
  const fadeSamples = Math.max(1, Math.round(sampleRate * 0.004));
  for (let i = 0; i < Math.min(fadeSamples, sampleCount); i += 1) {
    const f = i / fadeSamples;
    channelData[i] *= f;
    channelData[sampleCount - 1 - i] *= f;
  }

  return {
    buffer: buildAudioBuffer(channelData, sampleRate),
    audioIdentityKey,
    activeColumnRatio: carrierIntegralRound3(activeColumns / Math.max(1, spectralData.width)),
    maxSimultaneousPeaks,
    peak: carrierIntegralRound3(peak),
  };
}




