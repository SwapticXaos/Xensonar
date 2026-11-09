function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeHz(value: number | null | undefined): number | null {
  return value && Number.isFinite(value) && value > 24 ? clamp(value, 24, 6000) : null;
}

function alignHzToNearestOctave(anchorHz: number, targetHz: number): number {
  const safeAnchor = normalizeHz(anchorHz) ?? 220;
  const safeTarget = normalizeHz(targetHz) ?? safeAnchor;
  const octaveShift = Math.round(Math.log2(safeTarget / safeAnchor));
  return clamp(safeAnchor * Math.pow(2, octaveShift), 24, 6000);
}

export type ResolveParticleSampleAnchorArgs = {
  loadedBaseHz: number | null | undefined;
  loadedBaseHzSource?: 'estimated' | 'manual' | null;
  rootFreq?: number | null;
  baseFreq: number;
};

export type ResolvedParticleSampleAnchor = {
  anchorHz: number;
  source:
    | 'sample-manual'
    | 'sample-manual-octaved'
    | 'sample-estimated'
    | 'sample-estimated-octaved'
    | 'wave-root'
    | 'particle-freq';
};

export function resolveParticleSampleAnchorHz(args: ResolveParticleSampleAnchorArgs): ResolvedParticleSampleAnchor {
  const loadedBaseHz = normalizeHz(args.loadedBaseHz);
  const rootFreq = normalizeHz(args.rootFreq);
  const baseFreq = normalizeHz(args.baseFreq) ?? 220;
  const source = args.loadedBaseHzSource ?? (loadedBaseHz ? 'estimated' : null);

  if (loadedBaseHz && rootFreq) {
    const octavedAnchor = alignHzToNearestOctave(loadedBaseHz, rootFreq);
    if (source === 'manual') {
      return { anchorHz: octavedAnchor, source: 'sample-manual-octaved' };
    }
    const alignedDistance = Math.abs(Math.log2(octavedAnchor / rootFreq));
    if (alignedDistance <= 0.35) {
      return { anchorHz: octavedAnchor, source: 'sample-estimated-octaved' };
    }
    return { anchorHz: rootFreq, source: 'wave-root' };
  }

  if (loadedBaseHz) {
    return { anchorHz: loadedBaseHz, source: source === 'manual' ? 'sample-manual' : 'sample-estimated' };
  }

  if (rootFreq) {
    return { anchorHz: rootFreq, source: 'wave-root' };
  }

  return { anchorHz: baseFreq, source: 'particle-freq' };
}
