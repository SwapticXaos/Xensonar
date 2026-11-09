/**
 * carrierIntegralSpektralSyntheseRenderModifiers — 3.2.91-7.7.13
 *
 * DescriptorAwareRenderModifiers: small, pure policy layer for translating a SpektralSynthese image descriptor
 * into concrete renderer/post-render parameters. Project-method language stays
 * in the toolkit; this file only contains musical/audio contracts.
 */
import type { CarrierIntegralHarmonicXploreProfile } from './carrierIntegralHarmonicXploreLens';
import type { SpektralSyntheseDescriptor } from './carrierIntegralSpektralSyntheseDescriptor';
import {
  buildSpektralStochasticKey,
  sanitizeSpektralStochasticConfig,
  type SpektralStochasticConfig,
} from './carrierIntegralSpektralSyntheseStochastic';
import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';

export const SPEKTRAL_SYNTHESE_RENDER_MODIFIER_POLICY_VERSION = 'spektral-render-modifiers-v1-descriptor-body' as const;

export type SpektralSyntheseRenderLimits = {
  maxVoiceCount: number;
  minAttackMs: number;
  maxAttackMs: number;
  minReleaseMs: number;
  maxReleaseMs: number;
};

export type SpektralSyntheseRenderModifiers = {
  policyVersion: typeof SPEKTRAL_SYNTHESE_RENDER_MODIFIER_POLICY_VERSION;
  modifierKey: string;
  hasMaterial: boolean;
  voiceCountBias: number;
  gainSpread: number;
  gainExponent: number;
  columnContrastAmount: number;
  attackMs: number;
  releaseMs: number;
  accentAmount: number;
  accentWidthMs: number;
  densitySpreadStrength: number;
  densityShadowLayers: number;
  densityShadowGain: number;
  swarmExtra: number;
  registerTilt: number;
  stochasticKey: string;
  stochasticEnabled: boolean;
  stochasticAmount: number;
  stochasticTarget: string;
};

const DEFAULT_LIMITS: SpektralSyntheseRenderLimits = {
  maxVoiceCount: 16,
  minAttackMs: 4,
  maxAttackMs: 128,
  minReleaseMs: 48,
  maxReleaseMs: 620,
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const clamp01 = (value: number): number => clamp(value, 0, 1);

const round = (value: number): number => carrierIntegralRound3(value);

function buildModifierKey(parts: Omit<SpektralSyntheseRenderModifiers, 'modifierKey'>): string {
  return carrierIntegralHash31([
    parts.policyVersion,
    parts.hasMaterial ? 'material' : 'silent',
    parts.voiceCountBias,
    parts.gainSpread,
    parts.gainExponent,
    parts.columnContrastAmount,
    parts.attackMs,
    parts.releaseMs,
    parts.accentAmount,
    parts.accentWidthMs,
    parts.densitySpreadStrength,
    parts.densityShadowLayers,
    parts.densityShadowGain,
    parts.swarmExtra,
    parts.registerTilt,
    parts.stochasticKey,
    parts.stochasticEnabled ? 'stochastic-on' : 'stochastic-off',
    parts.stochasticAmount,
    parts.stochasticTarget,
  ].join('|'));
}

export function deriveSpektralSyntheseRenderModifiers(args: {
  descriptor: SpektralSyntheseDescriptor;
  profile: CarrierIntegralHarmonicXploreProfile;
  limits?: Partial<SpektralSyntheseRenderLimits> | null;
  stochastic?: SpektralStochasticConfig | null;
}): SpektralSyntheseRenderModifiers {
  const descriptor = args.descriptor;
  const limits: SpektralSyntheseRenderLimits = {
    ...DEFAULT_LIMITS,
    ...(args.limits ?? {}),
  };
  const stochastic = sanitizeSpektralStochasticConfig(args.stochastic);
  const stochasticKey = buildSpektralStochasticKey(stochastic);

  if (!descriptor.hasMaterial) {
    const silent: Omit<SpektralSyntheseRenderModifiers, 'modifierKey'> = {
      policyVersion: SPEKTRAL_SYNTHESE_RENDER_MODIFIER_POLICY_VERSION,
      hasMaterial: false,
      voiceCountBias: 0,
      gainSpread: 1,
      gainExponent: 1,
      columnContrastAmount: 0,
      attackMs: limits.maxAttackMs,
      releaseMs: limits.minReleaseMs,
      accentAmount: 0,
      accentWidthMs: 0,
      densitySpreadStrength: 0,
      densityShadowLayers: 0,
      densityShadowGain: 0,
      swarmExtra: 0,
      registerTilt: 0,
      stochasticKey,
      stochasticEnabled: false,
      stochasticAmount: 0,
      stochasticTarget: stochastic.target ?? 'phase',
    };
    return { ...silent, modifierKey: buildModifierKey(silent) };
  }

  const density = clamp01(descriptor.density);
  const contrast = clamp01(descriptor.contrast);
  const edge = clamp01(descriptor.edgeDensity);
  const entropy = clamp01(descriptor.entropy);
  const horizontal = clamp01(descriptor.horizontality);
  const registerSpan = clamp01(descriptor.registerSpan);
  const vertCenter = clamp01(descriptor.vertCenter);

  // Density is allowed to suggest texture depth, but the profile/renderer still
  // owns the hard voice cap. This stays a bias rather than a second renderer.
  const voiceCountBias = Math.round(clamp((density - 0.22) * 8 + registerSpan * 2, -2, 6));

  // Contrast becomes foreground/background inside the rendered body.  It is not
  // a hidden loudness boost; post-passes preserve the previous peak ceiling.
  const gainSpread = round(1 + contrast * 1.55);
  const gainExponent = round(clamp(0.82 + contrast * 1.88, 0.72, 2.7));
  const columnContrastAmount = round(clamp((contrast - 0.10) / 0.76, 0, 1));

  // Edges speak faster; horizontal structures breathe longer.
  const attackMs = round(clamp(limits.maxAttackMs - edge * (limits.maxAttackMs - limits.minAttackMs), limits.minAttackMs, limits.maxAttackMs));
  const releaseMs = round(clamp(limits.minReleaseMs + horizontal * (limits.maxReleaseMs - limits.minReleaseMs), limits.minReleaseMs, limits.maxReleaseMs));

  // Accent pass remains deterministic and gain-envelope-only for now: no dust,
  // no modal resonator, no random source.
  const accentAmount = round(clamp(edge * (0.12 + contrast * 0.34), 0, 0.36));
  const accentWidthMs = round(clamp(10 + (1 - edge) * 40 + horizontal * 18, 8, 68));

  const densitySpreadStrength = round(clamp((density - 0.20) / 0.74, 0, 1));
  const densityShadowLayers = densitySpreadStrength > 0.78 ? 3 : densitySpreadStrength > 0.42 ? 2 : densitySpreadStrength > 0.08 ? 1 : 0;
  const densityShadowGain = round(clamp(0.018 + densitySpreadStrength * 0.074 + entropy * 0.016, 0, 0.12));

  const swarmExtra = round(clamp(entropy * 0.28 + edge * 0.06 + density * 0.04, 0, 0.42));
  const registerTilt = round(clamp((vertCenter - 0.5) * 1.4, -0.7, 0.7));

  const base: Omit<SpektralSyntheseRenderModifiers, 'modifierKey'> = {
    policyVersion: SPEKTRAL_SYNTHESE_RENDER_MODIFIER_POLICY_VERSION,
    hasMaterial: true,
    voiceCountBias,
    gainSpread,
    gainExponent,
    columnContrastAmount,
    attackMs,
    releaseMs,
    accentAmount,
    accentWidthMs,
    densitySpreadStrength,
    densityShadowLayers,
    densityShadowGain,
    swarmExtra,
    registerTilt,
    stochasticKey,
    stochasticEnabled: stochastic.enabled,
    stochasticAmount: stochastic.amount,
    stochasticTarget: stochastic.target ?? 'phase',
  };

  return {
    ...base,
    modifierKey: buildModifierKey(base),
  };
}
