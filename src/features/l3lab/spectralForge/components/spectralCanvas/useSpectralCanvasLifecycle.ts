import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useStore, type ViewPort } from '../../state/store';
import {
  nearlyEqualViewportValue,
  resolveSpectralCanvasHorizontalAutoFit,
} from './spectralCanvasViewportModel';

type RenderLifecycleArgs = {
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  spectralWidth: number;
  viewPort: ViewPort;
  setViewPort: (patch: Partial<ViewPort>) => void;
  isPlaying: boolean;
  playheadPosition: number;
  renderVersion: number;
  renderMain: (viewPortOverride?: ViewPort) => void;
  renderOverlay: () => void;
};

export function useSpectralCanvasRenderLifecycle({
  mainCanvasRef,
  spectralWidth,
  viewPort,
  setViewPort,
  isPlaying,
  playheadPosition,
  renderVersion,
  renderMain,
  renderOverlay,
}: RenderLifecycleArgs) {
  const cursorRafRef = useRef<number | null>(null);
  const renderOverlayLatestRef = useRef<() => void>(() => undefined);

  // Keep the scan marker visible while playing by gently following the playhead.
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    const visibleWidth = Math.max(1, canvas.width / viewPort.zoomX);
    const maxOffsetX = Math.max(0, spectralWidth - visibleWidth);
    const playDataX = playheadPosition * spectralWidth;
    const playScreenX = (playDataX - viewPort.offsetX) * viewPort.zoomX;
    const margin = Math.max(36, canvas.width * 0.14);

    if (playScreenX < margin || playScreenX > canvas.width - margin) {
      const centeredOffset = playDataX - visibleWidth * 0.5;
      const nextOffsetX = Math.max(0, Math.min(maxOffsetX, centeredOffset));
      if (Math.abs(nextOffsetX - viewPort.offsetX) > 0.5) {
        setViewPort({ offsetX: nextOffsetX });
      }
    }
  }, [isPlaying, mainCanvasRef, playheadPosition, setViewPort, spectralWidth, viewPort.offsetX, viewPort.zoomX]);

  // Keep the RAF owner stable while playhead/view/hover dependencies change.
  // Restarting this effect on every playhead tick can cancel the next frame before it paints.
  useEffect(() => {
    renderOverlayLatestRef.current = renderOverlay;
  }, [renderOverlay]);

  useEffect(() => {
    let active = true;
    const animate = () => {
      if (!active) return;
      renderOverlayLatestRef.current();
      cursorRafRef.current = requestAnimationFrame(animate);
    };
    cursorRafRef.current = requestAnimationFrame(animate);
    return () => {
      active = false;
      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
      cursorRafRef.current = null;
    };
  }, []);

  useEffect(() => {
    renderMain();
  }, [renderMain, renderVersion]);
}

type ResizeLifecycleArgs = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  spectralWidth: number;
  spectralHeight: number;
  setViewPort: (patch: Partial<ViewPort>) => void;
  renderMain: (viewPortOverride?: ViewPort) => void;
};

export function useSpectralCanvasResizeLifecycle({
  containerRef,
  mainCanvasRef,
  overlayCanvasRef,
  spectralWidth,
  spectralHeight,
  setViewPort,
  renderMain,
}: ResizeLifecycleArgs) {
  const autoFitHorizontalViewportRef = useRef<{ lastZoomX: number | null; spectralWidth: number | null }>({
    lastZoomX: null,
    spectralWidth: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = mainCanvasRef.current;
    const overlay = overlayCanvasRef.current;
    if (!container || !canvas || !overlay) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.floor(width);
        const h = Math.floor(height);
        canvas.width = w;
        canvas.height = h;
        overlay.width = w;
        overlay.height = h;
        let viewportForThisFrame = useStore.getState().viewPort;
        if (w > 0 && h > 0) {
          const currentViewPort = viewportForThisFrame;
          const autoFit = autoFitHorizontalViewportRef.current;
          const autoFitDecision = resolveSpectralCanvasHorizontalAutoFit({
            canvasWidth: w,
            spectralWidth,
            offsetX: currentViewPort.offsetX,
            zoomX: currentViewPort.zoomX,
            lastAutoFitZoomX: autoFit.lastZoomX,
          });

          if (autoFitDecision.shouldFit) {
            viewportForThisFrame = {
              ...currentViewPort,
              offsetX: 0,
              zoomX: autoFitDecision.fitZoomX,
            };
            autoFit.lastZoomX = autoFitDecision.fitZoomX;
            autoFit.spectralWidth = spectralWidth;
            if (
              !nearlyEqualViewportValue(currentViewPort.offsetX, viewportForThisFrame.offsetX) ||
              !nearlyEqualViewportValue(currentViewPort.zoomX, viewportForThisFrame.zoomX)
            ) {
              setViewPort({ offsetX: 0, zoomX: autoFitDecision.fitZoomX });
            }
          }
        }
        renderMain(viewportForThisFrame);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, mainCanvasRef, overlayCanvasRef, renderMain, setViewPort, spectralHeight, spectralWidth]);
}
