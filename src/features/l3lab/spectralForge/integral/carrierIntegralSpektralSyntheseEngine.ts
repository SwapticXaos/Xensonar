/**
 * carrierIntegralSpektralSyntheseEngine — 3.2.91-7.7.13
 *
 * Descriptor-informierte Hörweise: Bildmetriken modulieren ein dynamisches
 * HX-Profil. Optional werden wenige deterministische Akzenthüllkurven auf den
 * Buffer gelegt. Es gibt keine Random-Schicht und keine Pure-Dieter-Pixelrender-
 * Schleife; der Klang ist absichtlich eine neue SpektralSynthese-Interpretation,
 * nicht bit-identisch zu HarmonicXplorE.
 */
import type { SpectralData } from '../audio/SpectralData';
import type { CarrierIntegralSynthLabSelection } from './carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreSelection } from './carrierIntegralHarmonicXploreRenderConfig';
import {
  renderCarrierIntegralHarmonicXploreDirectPreviewBuffer,
  type CarrierIntegralHarmonicXploreDirectBuffer,
} from './carrierIntegralHarmonicXploreDirectEngine';
import {
  computeSpektralSyntheseDescriptor,
  type SpektralSyntheseDescriptor,
} from './carrierIntegralSpektralSyntheseDescriptor';
import { deriveSpektralSyntheseProfile } from './carrierIntegralSpektralSyntheseProfile';
import {
  deriveSpektralSyntheseRenderModifiers,
  type SpektralSyntheseRenderModifiers,
} from './carrierIntegralSpektralSyntheseRenderModifiers';
import { carrierIntegralHash31 } from './carrierIntegralStableIdentity';
import {
  buildSpektralStochasticKey,
  sanitizeSpektralStochasticConfig,
  type SpektralStochasticConfig,
} from './carrierIntegralSpektralSyntheseStochastic';

export const SPEKTRAL_SYNTHESE_MACHINE_ID = 'spektral-synthese-body' as const;

type SpektralSyntheseProfile = ReturnType<typeof deriveSpektralSyntheseProfile>;

export type SpektralSyntheseBodyRenderVariant = {
  label?: string;
  presetPrefix?: string;
  identityParts?: readonly (string | number | boolean | null | undefined)[];
  profileTransform?: (profile: SpektralSyntheseProfile, descriptor: SpektralSyntheseDescriptor) => SpektralSyntheseProfile;
  modifiersTransform?: (modifiers: SpektralSyntheseRenderModifiers, descriptor: SpektralSyntheseDescriptor, profile: SpektralSyntheseProfile) => SpektralSyntheseRenderModifiers;
};

export type RenderCarrierIntegralSpektralSyntheseArgs = {
  spectralData?: SpectralData | null;
  synthLab: CarrierIntegralSynthLabSelection;
  harmonicXplore?: CarrierIntegralHarmonicXploreSelection | null;
  durationSec: number;
  previewDurationSec: number;
  rootHz: number;
  gain: number;
  sampleRate?: number;
  onProgress?: (progress: number) => void;
  cooperative?: boolean;
  stochastic?: SpektralStochasticConfig | null;
  bodyVariant?: SpektralSyntheseBodyRenderVariant | null;
};


const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

function applyRenderModifiersToProfile(
  profile: ReturnType<typeof deriveSpektralSyntheseProfile>,
  modifiers: SpektralSyntheseRenderModifiers,
): ReturnType<typeof deriveSpektralSyntheseProfile> {
  if (!modifiers.hasMaterial) return profile;
  const count = Math.max(3, Math.min(16, profile.count + modifiers.voiceCountBias));
  const swarmDispersion = clamp((profile.swarmDispersion ?? 0) + modifiers.swarmExtra * 0.38, 0, 0.92);
  const formantFocus = clamp((profile.formantFocus ?? 0.5) + modifiers.registerTilt * 0.18, 0, 1);
  return {
    ...profile,
    count,
    swarmDispersion,
    formantFocus,
    summary: `${profile.summary} · Spreizung ${modifiers.gainSpread.toFixed(2)} · Attack ${modifiers.attackMs.toFixed(0)}ms`,
  };
}



export function applyDescriptorContrastDynamicsPass(
  buffer: AudioBuffer,
  spectralData: SpectralData | null | undefined,
  modifiers: SpektralSyntheseRenderModifiers,
): void {
  if (!spectralData || spectralData.width < 2 || spectralData.height < 1) return;
  const contrastStrength = modifiers.columnContrastAmount;
  if (contrastStrength <= 0.02) return;

  const width = spectralData.width;
  const height = spectralData.height;
  const columnEnergy = new Float32Array(width);
  let maxEnergy = 0;
  let sumEnergy = 0;
  for (let x = 0; x < width; x += 1) {
    let energy = 0;
    for (let y = 0; y < height; y += 1) {
      energy += Math.max(0, spectralData.get(x, y));
    }
    columnEnergy[x] = energy;
    maxEnergy = Math.max(maxEnergy, energy);
    sumEnergy += energy;
  }
  if (maxEnergy <= 1e-9) return;

  const meanEnergy = (sumEnergy / width) / maxEnergy;
  for (let x = 0; x < width; x += 1) {
    columnEnergy[x] = Math.max(0, Math.min(1, columnEnergy[x] / maxEnergy));
  }

  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const peakBefore = readPeakCeiling(buffer);

  const spread = 0.12 + (modifiers.gainSpread - 1) * 0.42;
  const gamma = modifiers.gainExponent;
  const sampleCount = Math.max(1, buffer.length);
  const meanDenom = Math.max(0.12, 1 - Math.min(0.92, meanEnergy));

  for (let i = 0; i < sampleCount; i += 1) {
    const xFloat = (i / Math.max(1, sampleCount - 1)) * (width - 1);
    const x0 = Math.max(0, Math.min(width - 1, Math.floor(xFloat)));
    const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
    const t = xFloat - x0;
    const e0 = columnEnergy[x0] ?? 0;
    const e1 = columnEnergy[x1] ?? e0;
    const localEnergy = e0 + (e1 - e0) * t;
    const shapedEnergy = Math.pow(localEnergy, gamma);
    const shapedMean = Math.pow(meanEnergy, gamma);
    const centered = (shapedEnergy - shapedMean) / meanDenom;
    const envelope = Math.max(0.42, Math.min(1.42, 1 + centered * spread * contrastStrength));
    if (Math.abs(envelope - 1) < 0.003) continue;
    for (const channel of channels) {
      channel[i] = Math.max(-1, Math.min(1, (channel[i] ?? 0) * envelope));
    }
  }

  preservePeakCeiling(buffer, peakBefore);
}

function preservePeakCeiling(buffer: AudioBuffer, peakBefore: number): void {
  if (peakBefore <= 1e-6) return;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  let peakAfter = 0;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) {
      peakAfter = Math.max(peakAfter, Math.abs(channel[i] ?? 0));
    }
  }
  if (peakAfter <= peakBefore) return;
  const trim = peakBefore / peakAfter;
  for (const channel of channels) {
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = (channel[i] ?? 0) * trim;
    }
  }
}

function readPeakCeiling(buffer: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const channel = buffer.getChannelData(ch);
    for (let i = 0; i < channel.length; i += 1) {
      peak = Math.max(peak, Math.abs(channel[i] ?? 0));
    }
  }
  return peak;
}

/**
 * Density/Voice-Spread pass — 7.7.11
 *
 * SpektralSynthese's profile already increases the HX partial count for denser
 * images, but the audible difference can remain subtle because the shared HX
 * renderer still normalises and smooths strongly. This post-pass gives dense
 * images a deterministic, local "more bodies in the room" texture by mixing a
 * few short, low-gain delayed shadows of the rendered body back into itself.
 *
 * Musical contract:
 * - dense images may become wider/thicker;
 * - sparse images are left almost untouched, preserving air/emptiness;
 * - no random source is used;
 * - the previous peak ceiling is preserved, so this is texture spread rather
 *   than a hidden loudness boost;
 * - existing HX/Pure-Dieter/Direct-Renderer paths are not touched.
 */
export function applyDescriptorDensityVoiceSpreadPass(
  buffer: AudioBuffer,
  descriptor: SpektralSyntheseDescriptor,
  modifiers: SpektralSyntheseRenderModifiers,
): void {
  const densityStrength = modifiers.densitySpreadStrength;
  if (densityStrength <= 0.035 || buffer.length < 8 || buffer.numberOfChannels < 1) return;

  const peakBefore = readPeakCeiling(buffer);
  if (peakBefore <= 1e-6) return;

  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const source = channels.map((channel) => new Float32Array(channel));
  const sampleRate = buffer.sampleRate;

  const layerCount = modifiers.densityShadowLayers;
  if (layerCount < 1) return;
  const entropy = Math.max(0, Math.min(1, descriptor.entropy));
  const register = Math.max(0, Math.min(1, descriptor.registerSpan));
  const horizontal = Math.max(0, Math.min(1, descriptor.horizontality));
  const baseDelayMs = 5.5 + densityStrength * 10.5;
  const delaySpreadMs = 4.0 + entropy * 9.0 + register * 7.5;
  const bodyGain = modifiers.densityShadowGain;
  const crossGain = channels.length > 1 ? (0.012 + entropy * 0.026 + (1 - horizontal) * 0.018) * densityStrength : 0;

  for (let layer = 0; layer < layerCount; layer += 1) {
    const layerRatio = (layer + 1) / layerCount;
    const delaySamples = Math.max(1, Math.round((baseDelayMs + delaySpreadMs * layerRatio) * sampleRate / 1000));
    const layerGain = bodyGain * (1 - layer * 0.23);
    const polarity = layer % 2 === 0 ? 1 : -1;
    for (let i = delaySamples; i < buffer.length; i += 1) {
      const srcIndex = i - delaySamples;
      for (let ch = 0; ch < channels.length; ch += 1) {
        const dryShadow = source[ch]![srcIndex] ?? 0;
        const other = source.length > 1 ? (source[(ch + 1) % source.length]![srcIndex] ?? 0) : 0;
        const addition = dryShadow * layerGain + other * crossGain * polarity;
        channels[ch]![i] = Math.max(-1, Math.min(1, (channels[ch]![i] ?? 0) + addition));
      }
    }
  }

  preservePeakCeiling(buffer, peakBefore);
}

export function applyDescriptorAccentPass(
  buffer: AudioBuffer,
  descriptor: SpektralSyntheseDescriptor,
  modifiers: SpektralSyntheseRenderModifiers,
): void {
  if (modifiers.accentAmount <= 0.005 || descriptor.transientPositions.length < 1) return;
  const width = Math.max(48, Math.round(buffer.sampleRate * modifiers.accentWidthMs / 1000));
  const gain = modifiers.accentAmount;
  if (gain <= 0.005) return;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  for (const position of descriptor.transientPositions) {
    const center = Math.round(position * Math.max(1, buffer.length - 1));
    const lo = Math.max(0, center - width);
    const hi = Math.min(buffer.length - 1, center + width);
    for (let i = lo; i <= hi; i += 1) {
      const distance = Math.abs(i - center) / width;
      const envelope = gain * (1 - distance) * (1 - distance);
      if (envelope <= 0) continue;
      for (const channel of channels) {
        channel[i] = Math.max(-1, Math.min(1, (channel[i] ?? 0) * (1 + envelope)));
      }
    }
  }
}

function resolveSpektralSyntheseRenderState(args: {
  spectralData?: SpectralData | null;
  stochastic?: SpektralStochasticConfig | null;
  bodyVariant?: SpektralSyntheseBodyRenderVariant | null;
}) {
  const descriptor = computeSpektralSyntheseDescriptor(args.spectralData);
  const stochastic = sanitizeSpektralStochasticConfig(args.stochastic);
  const stochasticKey = buildSpektralStochasticKey(stochastic);
  const variant = args.bodyVariant ?? null;
  const baseProfile = deriveSpektralSyntheseProfile(descriptor);
  const variantProfile = variant?.profileTransform?.(baseProfile, descriptor) ?? baseProfile;
  const baseModifiers = deriveSpektralSyntheseRenderModifiers({ descriptor, profile: variantProfile, stochastic });
  const modifiers = variant?.modifiersTransform?.(baseModifiers, descriptor, variantProfile) ?? baseModifiers;
  return {
    descriptor,
    stochastic,
    stochasticKey,
    variant,
    modifiers,
    derivedProfile: applyRenderModifiersToProfile(variantProfile, modifiers),
  };
}

function buildSpektralSyntheseIdentityParts(args: {
  descriptor: SpektralSyntheseDescriptor;
  stochasticKey: string;
  modifiers: SpektralSyntheseRenderModifiers;
  derivedProfile: SpektralSyntheseProfile;
  variant?: SpektralSyntheseBodyRenderVariant | null;
}): string[] {
  const { descriptor, stochasticKey, modifiers, derivedProfile, variant } = args;
  return [
    'spektral-synthese-route-v6-shared-render-state',
    descriptor.descriptorKey,
    descriptor.spectralStructureKey,
    descriptor.hasMaterial ? 'material' : 'silent',
    stochasticKey,
    modifiers.policyVersion,
    modifiers.modifierKey,
    descriptor.density,
    descriptor.contrast,
    descriptor.vertCenter,
    descriptor.horizontality,
    descriptor.edgeDensity,
    descriptor.entropy,
    descriptor.grainTexture,
    descriptor.registerSpan,
    descriptor.transientPositions.join(','),
    derivedProfile.seriesType,
    derivedProfile.phase,
    derivedProfile.count,
    derivedProfile.timbreFlavor ?? 'plain',
    derivedProfile.swarmDispersion ?? 0,
    derivedProfile.formantFocus ?? 0,
    modifiers.voiceCountBias,
    modifiers.gainSpread,
    modifiers.gainExponent,
    modifiers.attackMs,
    modifiers.releaseMs,
    modifiers.accentAmount,
    modifiers.densitySpreadStrength,
    modifiers.swarmExtra,
    modifiers.registerTilt,
    ...(variant?.identityParts ?? []).map((part) => String(part ?? '')),
  ].map(String);
}

export function buildSpektralSyntheseParamsHash(
  spectralData: SpectralData | null | undefined,
  stochastic?: SpektralStochasticConfig | null,
  bodyVariant?: SpektralSyntheseBodyRenderVariant | null,
): string {
  return carrierIntegralHash31(buildSpektralSyntheseIdentityParts(resolveSpektralSyntheseRenderState({
    spectralData,
    stochastic,
    bodyVariant,
  })).join('|'));
}

export async function renderCarrierIntegralSpektralSynthesePreviewBuffer(
  args: RenderCarrierIntegralSpektralSyntheseArgs,
): Promise<CarrierIntegralHarmonicXploreDirectBuffer> {
  const { descriptor, stochastic, stochasticKey, variant, modifiers, derivedProfile } = resolveSpektralSyntheseRenderState(args);
  const rendered = await renderCarrierIntegralHarmonicXploreDirectPreviewBuffer({
    ...args,
    derivedProfile,
  });
  applyDescriptorContrastDynamicsPass(rendered.buffer, args.spectralData, modifiers);
  applyDescriptorDensityVoiceSpreadPass(rendered.buffer, descriptor, modifiers);
  applyDescriptorAccentPass(rendered.buffer, descriptor, modifiers);

  const label = variant?.label ?? 'SpektralSynthese';
  const presetPrefix = variant?.presetPrefix ?? 'spektral-synthese';
  const variantIdentity = (variant?.identityParts ?? []).map((part) => String(part ?? '')).join('|');

  return {
    buffer: rendered.buffer,
    summary: {
      ...rendered.summary,
      presetId: `${presetPrefix}×${descriptor.descriptorKey}`,
      carrierReading: `${rendered.summary.carrierReading} · ${label}`,
      directEngineKey: carrierIntegralHash31([
        rendered.summary.directEngineKey,
        'spektral-synthese-audio-identity-v7-shared-render-state',
        label,
        variantIdentity,
        ...buildSpektralSyntheseIdentityParts({ descriptor, stochasticKey, modifiers, derivedProfile, variant }),
        stochastic.enabled ? 'stochastic-on' : 'stochastic-off',
        stochastic.target ?? 'phase',
        stochastic.amount,
      ].join('|')),
    },
  };
}
