import type { SpectralData } from './SpectralData';

export const SPECTRAL_FORGE_PREVIEW_DIRTY_REGION_VERSION =
  'spectral-forge-preview-dirty-region-seed-7.5.157' as const;

export type SpectralForgePreviewDirtyRegion = {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  reason: string;
};

export type SpectralForgePreviewDirtyRegionSummary = {
  version: typeof SPECTRAL_FORGE_PREVIEW_DIRTY_REGION_VERSION;
  count: number;
  x0: number | null;
  x1: number | null;
  y0: number | null;
  y1: number | null;
  reasons: string[];
};

const dirtyRegions: SpectralForgePreviewDirtyRegion[] = [];

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function markSpectralForgePreviewDirtyRegion(args: {
  spectralData: Pick<SpectralData, 'width' | 'height'>;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  reason: string;
}): SpectralForgePreviewDirtyRegion | null {
  const width = Math.max(1, args.spectralData.width);
  const height = Math.max(1, args.spectralData.height);
  const x0 = clampInteger(Math.min(args.x0, args.x1), 0, width - 1);
  const x1 = clampInteger(Math.max(args.x0, args.x1), 0, width - 1);
  const y0 = clampInteger(Math.min(args.y0, args.y1), 0, height - 1);
  const y1 = clampInteger(Math.max(args.y0, args.y1), 0, height - 1);
  if (x1 < x0 || y1 < y0) return null;
  const region: SpectralForgePreviewDirtyRegion = {
    x0,
    x1,
    y0,
    y1,
    reason: args.reason || 'spectral-forge-edit',
  };
  dirtyRegions.push(region);
  while (dirtyRegions.length > 96) dirtyRegions.shift();
  return region;
}

export function markSpectralForgePreviewDirtyCircle(args: {
  spectralData: Pick<SpectralData, 'width' | 'height'>;
  x: number;
  y: number;
  radius: number;
  reason: string;
}): SpectralForgePreviewDirtyRegion | null {
  const radius = Math.max(1, Number.isFinite(args.radius) ? args.radius : 1);
  return markSpectralForgePreviewDirtyRegion({
    spectralData: args.spectralData,
    x0: args.x - radius,
    x1: args.x + radius,
    y0: args.y - radius,
    y1: args.y + radius,
    reason: args.reason,
  });
}

export function summarizeSpectralForgePreviewDirtyRegions(): SpectralForgePreviewDirtyRegionSummary {
  if (!dirtyRegions.length) {
    return {
      version: SPECTRAL_FORGE_PREVIEW_DIRTY_REGION_VERSION,
      count: 0,
      x0: null,
      x1: null,
      y0: null,
      y1: null,
      reasons: [],
    };
  }
  let x0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  const reasons = new Set<string>();
  for (const region of dirtyRegions) {
    x0 = Math.min(x0, region.x0);
    x1 = Math.max(x1, region.x1);
    y0 = Math.min(y0, region.y0);
    y1 = Math.max(y1, region.y1);
    reasons.add(region.reason);
  }
  return {
    version: SPECTRAL_FORGE_PREVIEW_DIRTY_REGION_VERSION,
    count: dirtyRegions.length,
    x0,
    x1,
    y0,
    y1,
    reasons: Array.from(reasons).slice(0, 16),
  };
}

export function consumeSpectralForgePreviewDirtyRegions(): SpectralForgePreviewDirtyRegionSummary {
  const summary = summarizeSpectralForgePreviewDirtyRegions();
  dirtyRegions.length = 0;
  return summary;
}

export function clearSpectralForgePreviewDirtyRegions(): void {
  dirtyRegions.length = 0;
}
