export interface ExternalLoopOffer {
  name: string;
  blob: Blob;
  bars: number;
  durationSec: number;
  bpm?: number;
  loopStartSec?: number;
  loopEndSec?: number;
  guideSegments?: number;
  guideMarkers?: number[];
  rootHz?: number | null;
  sourceDevice?: string;
  sourceVersion?: string;
  renderMode?: string;
  notes?: string;
  preferredMyzelGroup?: string;
  workspaceOrigin?: string;
  transitionGuard?: string;
  balanceCarrier?: string;
  routeSummary?: string;
  stabilizeBy?: string;
}

export function sanitizeExternalBars(value: number, fallback = 4) {
  if (!Number.isFinite(value)) return Math.max(1, Math.round(fallback));
  return Math.max(1, Math.round(value));
}

export function sanitizeExternalGuideSegments(value: number | undefined, fallback = 4) {
  if (!Number.isFinite(value)) return Math.max(1, Math.round(fallback));
  return Math.max(1, Math.round(value as number));
}
