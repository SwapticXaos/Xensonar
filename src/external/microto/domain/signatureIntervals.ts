/**
 * Signature intervals: user-pinned harmonic ratios for one-click recall in Resonance.
 * Vision §3 (harmonic first-class, expressive timbre); enables "my interval" / "signature chord" workflow.
 */

const STORAGE_KEY = "xensonar_signature_intervals";
const MAX_SLOTS = 3;
const RATIO_TOLERANCE = 0.002;

/** Normalize ratio to [1, 2) for storage and display. */
function normalizeRatio(r: number): number {
  if (!Number.isFinite(r) || r <= 0) return 1;
  let out = r;
  while (out >= 2) out /= 2;
  while (out < 1) out *= 2;
  return out;
}

/** Cents above root (1200 * log2(ratio)); for display in shell and Synth. */
export function ratioToCents(ratio: number): number {
  const r = normalizeRatio(ratio);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return 1200 * Math.log2(r);
}

/** Human-readable label for a ratio (common JI names or decimal). */
export function ratioToShortLabel(ratio: number): string {
  const r = normalizeRatio(ratio);
  const known: { ratio: number; label: string }[] = [
    { ratio: 1, label: "Root" },
    { ratio: 9 / 8, label: "9/8" },
    { ratio: 6 / 5, label: "6/5" },
    { ratio: 5 / 4, label: "5/4" },
    { ratio: 4 / 3, label: "4/3" },
    { ratio: 11 / 8, label: "11/8" },
    { ratio: 3 / 2, label: "3/2" },
    { ratio: 8 / 5, label: "8/5" },
    { ratio: 5 / 3, label: "5/3" },
    { ratio: 7 / 4, label: "7/4" },
    { ratio: 15 / 8, label: "15/8" },
    { ratio: 7 / 6, label: "7/6" },
    { ratio: 11 / 10, label: "11/10" },
  ];
  const logR = Math.log(r);
  for (const { ratio: k, label } of known) {
    if (Math.abs(Math.log(k) - logR) < RATIO_TOLERANCE) return label;
  }
  return r.toFixed(2);
}

export type SignatureInterval = { ratio: number };

function loadRaw(): number[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null || raw === "") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0)
      .map(normalizeRatio)
      .slice(0, MAX_SLOTS);
  } catch {
    return [];
  }
}

function saveRaw(ratios: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratios.slice(0, MAX_SLOTS)));
  } catch {
    // ignore
  }
}

/** Returns up to MAX_SLOTS signature intervals (ratio in [1, 2)). */
export function getSignatureIntervals(): SignatureInterval[] {
  return loadRaw().map((ratio) => ({ ratio }));
}

/** Replaces all signature intervals. */
export function setSignatureIntervals(intervals: SignatureInterval[]): void {
  saveRaw(intervals.map((i) => normalizeRatio(i.ratio)));
}

/** Appends a ratio (current interval) if under MAX_SLOTS; normalized to [1, 2). */
export function addSignatureInterval(ratio: number): boolean {
  const raw = loadRaw();
  if (raw.length >= MAX_SLOTS) return false;
  const r = normalizeRatio(ratio);
  if (r <= 0 || !Number.isFinite(r)) return false;
  raw.push(r);
  saveRaw(raw);
  return true;
}

/** Removes the interval at index. */
export function removeSignatureInterval(index: number): void {
  const raw = loadRaw();
  if (index < 0 || index >= raw.length) return;
  raw.splice(index, 1);
  saveRaw(raw);
}

/**
 * Discovery set: common JI ratios for "Surprise interval" (vision §3 exploratory harmonic navigation).
 * Same ratios as ratioToShortLabel; excludes root so surprise lands on a distinct interval.
 */
export const DISCOVERY_RATIOS: number[] = [
  9 / 8,
  6 / 5,
  5 / 4,
  4 / 3,
  11 / 8,
  3 / 2,
  8 / 5,
  5 / 3,
  7 / 4,
  15 / 8,
  7 / 6,
  11 / 10,
].map(normalizeRatio);

/** Picks a random ratio from the discovery set for Surprise-interval flow. */
export function getRandomDiscoveryRatio(): number {
  if (DISCOVERY_RATIOS.length === 0) return 1;
  return DISCOVERY_RATIOS[Math.floor(Math.random() * DISCOVERY_RATIOS.length)] ?? 1;
}

/**
 * Featured discovery: one interval per day with a short tip (vision §3 §5 discoverability).
 * Rotates by day-of-year so everyone sees the same "today's interval"; extensible for more entries or personalization.
 */
export type FeaturedDiscoveryEntry = { ratio: number; tip: string };

export const FEATURED_DISCOVERY: FeaturedDiscoveryEntry[] = [
  { ratio: normalizeRatio(3 / 2), tip: "Just fifth — the heart of harmony" },
  { ratio: normalizeRatio(5 / 4), tip: "Major third — bright and clear" },
  { ratio: normalizeRatio(4 / 3), tip: "Just fourth — open and stable" },
  { ratio: normalizeRatio(9 / 8), tip: "Whole tone — a step above root" },
  { ratio: normalizeRatio(6 / 5), tip: "Minor third — warm and close" },
  { ratio: normalizeRatio(7 / 4), tip: "Harmonic seventh — bold and open" },
  { ratio: normalizeRatio(11 / 8), tip: "11th harmonic — sharp and characterful" },
  { ratio: normalizeRatio(8 / 5), tip: "Minor sixth — melancholic lift" },
  { ratio: normalizeRatio(5 / 3), tip: "Major sixth — singing quality" },
  { ratio: normalizeRatio(15 / 8), tip: "Classic major seventh" },
  { ratio: normalizeRatio(7 / 6), tip: "Septimal minor third — soft colour" },
  { ratio: normalizeRatio(11 / 10), tip: "Undecimal neutral second" },
];

/** Returns today's featured interval (stable per calendar day; vision §3 §5 discoverability). */
export function getFeaturedDiscoveryInterval(): FeaturedDiscoveryEntry {
  if (FEATURED_DISCOVERY.length === 0) return { ratio: 1, tip: "Root" };
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const index = dayOfYear % FEATURED_DISCOVERY.length;
  return FEATURED_DISCOVERY[index] ?? { ratio: 1, tip: "Root" };
}
