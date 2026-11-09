import type { SpectralForgePreviewRouteKind } from './spectralForgePreviewSessionTypes';

export function previewRouteCanAutoAfterPaint(routeKind: SpectralForgePreviewRouteKind): boolean {
  return routeKind === 'spectral' || routeKind === 'basis-hearing';
}

export function previewRouteSupportsLoopPlayback(routeKind: SpectralForgePreviewRouteKind): boolean {
  return routeKind === 'spectral' || routeKind === 'basis-hearing';
}

export function previewRouteWaitingLabel(
  routeKind: SpectralForgePreviewRouteKind,
  pointerDown: boolean,
): string {
  if (routeKind === 'basis-hearing') {
    return pointerDown ? 'Hörweise wartet auf Regler-Freigabe' : 'Hörweise wartet auf ruhigen Reglerstand';
  }
  return pointerDown ? 'Vorschau wartet auf Werkzeug-Freigabe' : 'Vorschau wartet auf ruhigen Werkzeugmoment';
}
