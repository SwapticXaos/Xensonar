import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { SpectralData } from '../../audio/SpectralData';
import { useStore, type ViewPort } from '../../state/store';
import { grainToTint } from './spectralCanvasVisuals';
import {
  clampSpectralNavigatorLeft,
  resolveSpectralNavigatorDragMode,
  resolveSpectralNavigatorViewportPatch,
  resolveSpectralNavigatorWindow,
  type SpectralNavigatorDragMode,
} from './spectralCanvasViewportModel';

type UseSpectralCanvasNavigatorArgs = {
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  colorLUTRef: { current: Uint8Array };
  spectralData: SpectralData;
  viewPort: ViewPort;
  setViewPort: (patch: Partial<ViewPort>) => void;
  renderVersion: number;
  showGrainLayer: boolean;
  synthMode: string;
  playheadPosition: number;
  isPlaying: boolean;
  showPlayheadMarker: boolean;
};

export function useSpectralCanvasNavigator({
  mainCanvasRef,
  colorLUTRef,
  spectralData,
  viewPort,
  setViewPort,
  renderVersion,
  showGrainLayer,
  synthMode,
  playheadPosition,
  isPlaying,
  showPlayheadMarker,
}: UseSpectralCanvasNavigatorArgs) {
  const overviewWrapRef = useRef<HTMLDivElement>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const navigatorDragRef = useRef<{
    mode: SpectralNavigatorDragMode;
    grabOffsetPx: number;
    startLeftPx: number;
    startRightPx: number;
    rectWidth: number;
    pointerDownX: number;
    moved: boolean;
  } | null>(null);

  const renderOverview = useCallback(() => {
    const canvas = overviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const lut = colorLUTRef.current;
    const showGrain = showGrainLayer || synthMode === 'granular';
    const stepX = spectralData.width / cw;
    const stepY = spectralData.height / ch;

    const imageData = ctx.createImageData(cw, ch);
    const pixels = imageData.data;

    for (let sy = 0; sy < ch; sy++) {
      const y0 = Math.floor(sy * stepY);
      const y1 = Math.min(spectralData.height, Math.ceil((sy + 1) * stepY));
      for (let sx = 0; sx < cw; sx++) {
        const x0 = Math.floor(sx * stepX);
        const x1 = Math.min(spectralData.width, Math.ceil((sx + 1) * stepX));

        let peak = 0;
        let grainPeak = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const amp = spectralData.get(x, y);
            if (amp > peak) {
              peak = amp;
              grainPeak = spectralData.getGrain(x, y);
            }
          }
        }

        const lutIdx = Math.round(Math.max(0, Math.min(1, peak)) * 255) * 3;
        const pIdx = (sy * cw + sx) * 4;
        if (showGrain && peak > 0.01) {
          const [tr, tg, tb] = grainToTint(grainPeak);
          const blend = 0.36;
          pixels[pIdx] = Math.round(lut[lutIdx] * (1 - blend) + tr * blend);
          pixels[pIdx + 1] = Math.round(lut[lutIdx + 1] * (1 - blend) + tg * blend);
          pixels[pIdx + 2] = Math.round(lut[lutIdx + 2] * (1 - blend) + tb * blend);
        } else {
          pixels[pIdx] = lut[lutIdx];
          pixels[pIdx + 1] = lut[lutIdx + 1];
          pixels[pIdx + 2] = lut[lutIdx + 2];
        }
        pixels[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const navigatorWindow = resolveSpectralNavigatorWindow({
      spectralWidth: spectralData.width,
      mainCanvasWidth: mainCanvasRef.current?.width ?? spectralData.width,
      containerWidth: cw,
      offsetX: viewPort.offsetX,
      zoomX: viewPort.zoomX,
    });
    const { widthPx } = navigatorWindow;
    const clampedLeft = clampSpectralNavigatorLeft(cw, widthPx, navigatorWindow.leftPx);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, clampedLeft, ch);
    ctx.fillRect(clampedLeft + widthPx, 0, cw - (clampedLeft + widthPx), ch);

    const grad = ctx.createLinearGradient(clampedLeft, 0, clampedLeft + widthPx, 0);
    grad.addColorStop(0, 'rgba(34, 211, 238, 0.18)');
    grad.addColorStop(0.5, 'rgba(34, 211, 238, 0.08)');
    grad.addColorStop(1, 'rgba(34, 211, 238, 0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(clampedLeft, 0, widthPx, ch);

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(clampedLeft + 0.5, 0.5, Math.max(1, widthPx - 1), ch - 1);

    ctx.fillStyle = 'rgba(103, 232, 249, 0.95)';
    ctx.fillRect(clampedLeft - 1, 2, 4, ch - 4);
    ctx.fillRect(clampedLeft + widthPx - 3, 2, 4, ch - 4);

    if (isPlaying || showPlayheadMarker) {
      const playX = playheadPosition * cw;
      ctx.strokeStyle = 'rgba(0,255,136,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, ch);
      ctx.stroke();
    }
  }, [colorLUTRef, isPlaying, mainCanvasRef, playheadPosition, showGrainLayer, showPlayheadMarker, spectralData, synthMode, viewPort]);

  const updateViewportFromNavigator = useCallback((clientX: number, mode?: SpectralNavigatorDragMode) => {
    const wrap = overviewWrapRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!wrap || !mainCanvas) return;

    const rect = wrap.getBoundingClientRect();
    const pointerX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setViewPort(resolveSpectralNavigatorViewportPatch({
      mode,
      pointerX,
      containerWidth: rect.width,
      spectralWidth: spectralData.width,
      mainCanvasWidth: mainCanvas.width,
      offsetX: viewPort.offsetX,
      zoomX: viewPort.zoomX,
    }));
  }, [mainCanvasRef, setViewPort, spectralData.width, viewPort.offsetX, viewPort.zoomX]);

  useEffect(() => {
    renderOverview();
  }, [renderOverview, renderVersion]);

  const onNavigatorMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = overviewWrapRef.current;
    const mainCanvas = mainCanvasRef.current;
    if (!wrap || !mainCanvas) return;

    const rect = wrap.getBoundingClientRect();
    const pointerX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const navigatorWindow = resolveSpectralNavigatorWindow({
      spectralWidth: spectralData.width,
      mainCanvasWidth: mainCanvas.width,
      containerWidth: rect.width,
      offsetX: viewPort.offsetX,
      zoomX: viewPort.zoomX,
    });
    const { leftPx } = navigatorWindow;
    const mode = resolveSpectralNavigatorDragMode(pointerX, navigatorWindow);

    navigatorDragRef.current = {
      mode,
      grabOffsetPx: pointerX - leftPx,
      startLeftPx: leftPx,
      startRightPx: navigatorWindow.rightPx,
      rectWidth: rect.width,
      pointerDownX: e.clientX,
      moved: false,
    };
  }, [mainCanvasRef, spectralData.width, viewPort.offsetX, viewPort.zoomX]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = navigatorDragRef.current;
      if (!drag) return;
      if (!drag.moved && Math.abs(e.clientX - drag.pointerDownX) > 3) drag.moved = true;
      if (drag.moved) updateViewportFromNavigator(e.clientX, drag.mode);
    };

    const onUp = (e: MouseEvent) => {
      const drag = navigatorDragRef.current;
      if (drag && !drag.moved && drag.mode === 'move') {
        const wrap = overviewWrapRef.current;
        if (wrap) {
          const rect = wrap.getBoundingClientRect();
          const pointerX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const normalized = rect.width > 0 ? pointerX / rect.width : 0;
          useStore.getState().setPlayheadPosition(Math.max(0, Math.min(1, normalized)));
          useStore.getState().setShowPlayheadMarker(true);
        }
      }
      navigatorDragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updateViewportFromNavigator]);

  return {
    overviewWrapRef,
    overviewCanvasRef,
    onNavigatorMouseDown,
  };
}
