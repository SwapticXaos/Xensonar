export const STAMP_WHEEL_MIN_SCALE = 0.2;
export const STAMP_WHEEL_MAX_SCALE = 5;
export const STAMP_WHEEL_EVENT_DELTA_PX_MAX = 72;
export const STAMP_WHEEL_FRAME_DELTA_PX_MAX = 180;
export const STAMP_WHEEL_FACTOR_PER_PIXEL = 0.0011;
export const SPECTRAL_CANVAS_FIT_ZOOM_MIN = 0.1;
export const SPECTRAL_CANVAS_VIEWPORT_EPSILON = 0.001;
export const SPECTRAL_NAVIGATOR_EDGE_HIT_PX = 10;

export type SpectralNavigatorDragMode = 'move' | 'resize-left' | 'resize-right';

export type SpectralNavigatorWindowInput = {
  spectralWidth: number;
  mainCanvasWidth: number;
  containerWidth: number;
  offsetX: number;
  zoomX: number;
  minWidthPx?: number;
};

export type SpectralNavigatorWindow = {
  visibleWidth: number;
  leftPx: number;
  widthPx: number;
  rightPx: number;
};

export function getFullCanvasFitZoomX(canvasWidth: number, spectralWidth: number): number {
  if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) return 1;
  return Math.max(SPECTRAL_CANVAS_FIT_ZOOM_MIN, canvasWidth / Math.max(1, spectralWidth));
}

export function nearlyEqualViewportValue(
  a: number,
  b: number,
  epsilon = SPECTRAL_CANVAS_VIEWPORT_EPSILON,
): boolean {
  return Math.abs(a - b) <= epsilon;
}

export type SpectralCanvasHorizontalAutoFitDecision = {
  shouldFit: boolean;
  fitZoomX: number;
};

export function resolveSpectralCanvasHorizontalAutoFit(input: {
  canvasWidth: number;
  spectralWidth: number;
  offsetX: number;
  zoomX: number;
  lastAutoFitZoomX: number | null;
}): SpectralCanvasHorizontalAutoFitDecision {
  const fitZoomX = getFullCanvasFitZoomX(input.canvasWidth, input.spectralWidth);
  const atDefaultHorizontalView =
    nearlyEqualViewportValue(input.offsetX, 0) &&
    nearlyEqualViewportValue(input.zoomX, 1);
  const matchesPreviousAutoFit =
    input.lastAutoFitZoomX !== null &&
    nearlyEqualViewportValue(input.offsetX, 0) &&
    nearlyEqualViewportValue(input.zoomX, input.lastAutoFitZoomX, 0.01);
  return {
    shouldFit: atDefaultHorizontalView || matchesPreviousAutoFit,
    fitZoomX,
  };
}

export function clampStampWheelScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return Math.max(STAMP_WHEEL_MIN_SCALE, Math.min(STAMP_WHEEL_MAX_SCALE, scale));
}

export function normalizeStampWheelDeltaPx(event: Pick<WheelEvent, 'deltaMode' | 'deltaY'>): number {
  const rawDeltaPx = event.deltaMode === 1
    ? event.deltaY * 16
    : event.deltaMode === 2
      ? event.deltaY * 160
      : event.deltaY;
  if (!Number.isFinite(rawDeltaPx)) return 0;
  return Math.max(-STAMP_WHEEL_EVENT_DELTA_PX_MAX, Math.min(STAMP_WHEEL_EVENT_DELTA_PX_MAX, rawDeltaPx));
}

export function resolveSpectralNavigatorWindow(input: SpectralNavigatorWindowInput): SpectralNavigatorWindow {
  const spectralWidth = Math.max(1, input.spectralWidth);
  const visibleWidth = Math.max(1, Math.min(spectralWidth, input.mainCanvasWidth / input.zoomX));
  const leftPx = (input.offsetX / spectralWidth) * input.containerWidth;
  const widthPx = Math.max(input.minWidthPx ?? 10, (visibleWidth / spectralWidth) * input.containerWidth);
  return {
    visibleWidth,
    leftPx,
    widthPx,
    rightPx: leftPx + widthPx,
  };
}

export function clampSpectralNavigatorLeft(containerWidth: number, widthPx: number, leftPx: number): number {
  return Math.max(0, Math.min(containerWidth - widthPx, leftPx));
}

export type SpectralNavigatorViewportPatchInput = {
  mode?: SpectralNavigatorDragMode;
  pointerX: number;
  containerWidth: number;
  spectralWidth: number;
  mainCanvasWidth: number;
  offsetX: number;
  zoomX: number;
};

export type SpectralNavigatorViewportPatch = {
  offsetX?: number;
  zoomX?: number;
};

export function resolveSpectralNavigatorViewportPatch(
  input: SpectralNavigatorViewportPatchInput,
): SpectralNavigatorViewportPatch {
  const visibleWidth = Math.max(1, Math.min(input.spectralWidth, input.mainCanvasWidth / input.zoomX));
  const minVisibleWidth = Math.max(16, input.spectralWidth * 0.015);
  const currentLeft = input.offsetX;
  const currentRight = currentLeft + visibleWidth;
  const pointerDataX = input.pointerX / input.containerWidth * input.spectralWidth;

  if (input.mode === 'resize-left') {
    const nextLeft = Math.max(0, Math.min(pointerDataX, currentRight - minVisibleWidth));
    const nextWidth = Math.max(minVisibleWidth, currentRight - nextLeft);
    const nextZoomX = Math.max(0.1, Math.min(20, input.mainCanvasWidth / nextWidth));
    return { offsetX: nextLeft, zoomX: nextZoomX };
  }

  if (input.mode === 'resize-right') {
    const nextRight = Math.max(currentLeft + minVisibleWidth, Math.min(input.spectralWidth, pointerDataX));
    const nextWidth = Math.max(minVisibleWidth, nextRight - currentLeft);
    const nextZoomX = Math.max(0.1, Math.min(20, input.mainCanvasWidth / nextWidth));
    return { zoomX: nextZoomX };
  }

  const centeredOffset = pointerDataX - visibleWidth * 0.5;
  const maxOffsetX = Math.max(0, input.spectralWidth - visibleWidth);
  return { offsetX: Math.max(0, Math.min(maxOffsetX, centeredOffset)) };
}

export function resolveSpectralNavigatorDragMode(
  pointerX: number,
  navigatorWindow: Pick<SpectralNavigatorWindow, 'leftPx' | 'rightPx'>,
  edgeHit = SPECTRAL_NAVIGATOR_EDGE_HIT_PX,
): SpectralNavigatorDragMode {
  if (Math.abs(pointerX - navigatorWindow.leftPx) <= edgeHit) return 'resize-left';
  if (Math.abs(pointerX - navigatorWindow.rightPx) <= edgeHit) return 'resize-right';
  return 'move';
}
