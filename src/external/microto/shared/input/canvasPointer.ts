import { clamp } from "../tuning/grid";

export type CanvasPoint = { x: number; y: number };

type CanvasPointerMapParams = {
  clientX: number;
  clientY: number;
  rectLeft: number;
  rectTop: number;
  rectWidth: number;
  rectHeight: number;
  canvasWidth: number;
  canvasHeight: number;
};

type CanvasTargetLike = {
  width: number;
  height: number;
  getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
};

/**
 * Maps a client-space pointer position into a canvas-space point.
 * Robust against zero-size DOM rects and clamps to the canvas bounds.
 */
export function mapClientPointToCanvasPoint({
  clientX,
  clientY,
  rectLeft,
  rectTop,
  rectWidth,
  rectHeight,
  canvasWidth,
  canvasHeight,
}: CanvasPointerMapParams): CanvasPoint {
  const safeRectW = Math.max(1, rectWidth);
  const safeRectH = Math.max(1, rectHeight);
  const safeCanvasW = Math.max(1, canvasWidth);
  const safeCanvasH = Math.max(1, canvasHeight);

  const rawX = ((clientX - rectLeft) / safeRectW) * safeCanvasW;
  const rawY = ((clientY - rectTop) / safeRectH) * safeCanvasH;

  return {
    x: clamp(rawX, 0, safeCanvasW),
    y: clamp(rawY, 0, safeCanvasH),
  };
}

/**
 * Convenience wrapper for PointerEvents where currentTarget is a canvas element.
 */
export function mapPointerEventToCanvasPoint(event: {
  clientX: number;
  clientY: number;
  currentTarget: CanvasTargetLike;
}): CanvasPoint {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  return mapClientPointToCanvasPoint({
    clientX: event.clientX,
    clientY: event.clientY,
    rectLeft: rect.left,
    rectTop: rect.top,
    rectWidth: rect.width,
    rectHeight: rect.height,
    canvasWidth: target.width,
    canvasHeight: target.height,
  });
}
