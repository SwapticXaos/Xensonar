import type { SpectralForgePreviewRouteKind } from './spectralForgePreviewSessionTypes';

export type SpectralForgeTransportPrewarmStatusPhase =
  | 'start'
  | 'stale'
  | 'ready'
  | 'unprepared'
  | 'failed';

export type SpectralForgeTransportPrewarmStatusInput = {
  routeKind: SpectralForgePreviewRouteKind;
  phase: SpectralForgeTransportPrewarmStatusPhase;
  rendered?: boolean;
};

export function resolveSpectralForgeTransportPrewarmStatus(
  input: SpectralForgeTransportPrewarmStatusInput,
): string {
  const isBasisHearing = input.routeKind === 'basis-hearing';

  switch (input.phase) {
    case 'start':
      return isBasisHearing
        ? 'Hörweise wird fertig vorgerechnet'
        : 'Vorschau wird fertig vorgerechnet';
    case 'stale':
      return isBasisHearing
        ? 'Hörweise wartet auf den neuesten Reglerstand'
        : 'Vorschau wartet auf den neuesten Stand';
    case 'ready':
      if (isBasisHearing) {
        return input.rendered ? 'Hörweise fertig vorgerechnet' : 'Hörweise aus Cache bereit';
      }
      return input.rendered ? 'Vorschau fertig vorgerechnet' : 'Vorschau aus Cache bereit';
    case 'unprepared':
      return isBasisHearing ? 'Hörweise noch nicht vorbereitbar' : 'Vorschau noch nicht vorbereitbar';
    case 'failed':
      return isBasisHearing ? 'Hörweise konnte nicht vorbereitet werden' : 'Vorschau konnte nicht vorbereitet werden';
    default:
      return isBasisHearing ? 'Hörweise wird vorbereitet' : 'Vorschau wird vorbereitet';
  }
}

export function resolveSpectralForgePlaybackCacheStatus(input: { cacheHit: boolean }): string {
  return input.cacheHit ? 'Vorschau aus Cache' : 'Vorschau gerendert';
}
