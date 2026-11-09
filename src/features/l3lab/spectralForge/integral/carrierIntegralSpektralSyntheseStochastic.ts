/**
 * carrierIntegralSpektralSyntheseStochastic — 3.2.91-7.7.12
 *
 * Explicit, seedable stochastic contract for future SpektralSynthese sound variation.
 * Default/off is fully deterministic and preserves current rendering. If enabled by
 * a caller, the seed and amount become part of the audio identity key.
 */
import { carrierIntegralHash31, carrierIntegralRound3 } from './carrierIntegralStableIdentity';

export type SpektralStochasticTarget = 'phase' | 'pan' | 'microDetune' | 'transientDust';

export type SpektralStochasticConfig = {
  enabled: boolean;
  seed: string;
  amount: number;
  target?: SpektralStochasticTarget;
};

export const SPEKTRAL_STOCHASTIC_POLICY_VERSION = 'spektral-stochastic-v1-seed-visible-contract' as const;

export const SPEKTRAL_STOCHASTIC_OFF: SpektralStochasticConfig = {
  enabled: false,
  seed: 'xensonar-spektral-off',
  amount: 0,
  target: 'phase',
};

export function sanitizeSpektralStochasticConfig(
  config: SpektralStochasticConfig | null | undefined,
): SpektralStochasticConfig {
  if (!config || !config.enabled) return SPEKTRAL_STOCHASTIC_OFF;
  const seed = String(config.seed ?? '').trim() || 'xensonar-spektral-seed';
  const amount = Math.max(0, Math.min(1, Number.isFinite(config.amount) ? config.amount : 0));
  return {
    enabled: amount > 0,
    seed,
    amount: carrierIntegralRound3(amount),
    target: config.target ?? 'phase',
  };
}

export function buildSpektralStochasticKey(config: SpektralStochasticConfig | null | undefined): string {
  const safe = sanitizeSpektralStochasticConfig(config);
  return carrierIntegralHash31([
    SPEKTRAL_STOCHASTIC_POLICY_VERSION,
    safe.enabled ? 'on' : 'off',
    safe.seed,
    safe.amount,
    safe.target ?? 'phase',
  ].join('|'));
}
