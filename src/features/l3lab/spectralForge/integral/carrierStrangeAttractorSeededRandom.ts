// Xensonar 3.2.91.7.5.98
// Tiny deterministic random source for Carrier → Schwarmkörper planning.

export type StrangeAttractorSeededRandom = {
  readonly seed: number;
  next(): number;
  range(min: number, max: number): number;
  signed(amount?: number): number;
};

export function hashStrangeAttractorSeed(seed: number | string | undefined): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return normalizeSeed(seed);
  }
  const text = String(seed ?? 'strange-attractor-schwarmkoerper-default-seed');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return normalizeSeed(hash);
}

export function createStrangeAttractorSeededRandom(seed: number | string | undefined): StrangeAttractorSeededRandom {
  let state = hashStrangeAttractorSeed(seed);
  const initialSeed = state;
  const next = (): number => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
  return {
    seed: initialSeed,
    next,
    range(min: number, max: number): number {
      return min + (max - min) * next();
    },
    signed(amount = 1): number {
      return (next() * 2 - 1) * amount;
    },
  };
}

function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0;
  return normalized === 0 ? 0x9e3779b9 : normalized;
}
