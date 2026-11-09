/**
 * Shared deterministic identity helpers for SpectralForge Carrier Integral boundaries.
 *
 * This module intentionally contains only pure string/number normalisation helpers.
 * It must not import audio, UI, runtime, or store code.
 */

export function stableCarrierIntegralJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableCarrierIntegralJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableCarrierIntegralJson(record[key])}`).join(',')}}`;
}

export function carrierIntegralFnv1aShortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function carrierIntegralHash31(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

export function carrierIntegralRound3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function carrierIntegralFixed4(value: number): string {
  return Number(value || 0).toFixed(4);
}
