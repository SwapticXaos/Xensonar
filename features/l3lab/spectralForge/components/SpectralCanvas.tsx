import { useRef, useEffect, useCallback, useState } from 'react';
import { useStore, mergeToolSettings } from '../state/store';
import { colorMaps, buildColorLUT } from '../utils/colorMap';
import { yToFrequency, frequencyToNoteName } from '../audio/SpectralData';
import { audioEngine } from '../audio/AudioEngine';
import { DURATION } from '../state/store';

// Grain size → hue tint (short=warm/red, long=cool/blue)
function grainToTint(grain: number): [number, number, number] {
  // 0 = warm red-orange, 0.5 = neutral (no tint), 1 = cool cyan-blue
  if (grain < 0.5) {
    const t = grain / 0.5; // 0 to 1
    return [
      Math.round(255 * (1 - t)),     // R: high→0
      Math.round(80 * t),            // G: 0→80
      Math.round(40 * t),            // B: 0→40
    ];
  } else {
    const t = (grain - 0.5) / 0.5; // 0 to 1
    return [
      0,                              // R: 0
      Math.round(80 + 120 * t),      // G: 80→200
      Math.round(40 + 215 * t),      // B: 40→255
    ];
  }
}

export default function SpectralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overviewWrapRef = useRef<HTMLDivElement>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const isPaintingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const mousePosRef = useRef<{ sx: number; sy: number } | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const isStampSelectingRef = useRef(false);
  const stampSelEndRef = useRef<{ x: number; y: number } | null>(null);
  const guideDragRef = useRef<{ markerIndex: number; barIndex: number } | null>(null);
  const navigatorDragRef = useRef<{
    mode: 'move' | 'resize-left' | 'resize-right';
    grabOffsetPx: number;
    startLeftPx: number;
    startRightPx: number;
    rectWidth: number;
    pointerDownX: number;
    moved: boolean;
  } | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{ freq: number; time: number; note: string } | null>(null);

  const spectralData = useStore(s => s.spectralData);
  const viewPort = useStore(s => s.viewPort);
  const setViewPort = useStore(s => s.setViewPort);
  const activeTool = useStore(s => s.activeTool);
  const toolSettings = useStore(s => s.toolSettings);
  const safeToolSettings = mergeToolSettings(activeTool, toolSettings);
  const renderVersion = useStore(s => s.renderVersion);
  const triggerRender = useStore(s => s.triggerRender);
  const pushUndo = useStore(s => s.pushUndo);
  const colorMapName = useStore(s => s.colorMapName);
  const playheadPosition = useStore(s => s.playheadPosition);
  const isPlaying = useStore(s => s.isPlaying);
  const showPlayheadMarker = useStore(s => s.showPlayheadMarker);
  const lineStart = useStore(s => s.lineStart);
  const setLineStart = useStore(s => s.setLineStart);
  const waveformMix = useStore(s => s.waveformMix);
  const showGrainLayer = useStore(s => s.showGrainLayer);
  const synthMode = useStore(s => s.synthMode);
  const materialExport = useStore(s => s.materialExport);
  const sourceAsset = useStore(s => s.sourceAsset);

  // Stamp tool
  const stampData = useStore(s => s.stampData);
  const stampScaleX = useStore(s => s.stampScaleX);
  const stampScaleY = useStore(s => s.stampScaleY);
  const stampRotation = useStore(s => s.stampRotation);
  const stampFlipX = useStore(s => s.stampFlipX);
  const stampFlipY = useStore(s => s.stampFlipY);
  const stampPhase = useStore(s => s.stampPhase);
  const setStampData = useStore(s => s.setStampData);
  const setStampScale = useStore(s => s.setStampScale);
  const setStampPhase = useStore(s => s.setStampPhase);
  const stampSelStart = useStore(s => s.stampSelStart);
  const setStampSelStart = useStore(s => s.setStampSelStart);
  const setGuideMarker = useStore(s => s.setGuideMarker);

  const colorLUTRef = useRef<Uint8Array>(buildColorLUT(colorMaps[colorMapName]));

  useEffect(() => {
    colorLUTRef.current = buildColorLUT(colorMaps[colorMapName]);
  }, [colorMapName]);

  // Screen coords → data coords
  const screenToData = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const dataX = Math.floor(sx / viewPort.zoomX + viewPort.offsetX);
    const dataY = Math.floor(sy / viewPort.zoomY + viewPort.offsetY);
    return { x: dataX, y: dataY };
  }, [viewPort]);

  const getGuideLayout = useCallback(() => {
    const safeBars = Math.max(1, materialExport.bars || 1);
    const barWidthData = spectralData.width / safeBars;
    const guideMarkers = (materialExport.guideMarkers || []).filter((marker) => Number.isFinite(marker));
    return { safeBars, barWidthData, guideMarkers };
  }, [materialExport.bars, materialExport.guideMarkers, spectralData.width]);

  const detectGuideHandle = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    if (sy < 0 || sy > 18) return null;
    const { safeBars, barWidthData, guideMarkers } = getGuideLayout();
    if (guideMarkers.length === 0) return null;
    let best: { markerIndex: number; barIndex: number; distance: number } | null = null;
    for (let barIndex = 0; barIndex < safeBars; barIndex++) {
      const barStart = barIndex * barWidthData;
      for (let markerIndex = 0; markerIndex < guideMarkers.length; markerIndex++) {
        const dataX = barStart + guideMarkers[markerIndex] * barWidthData;
        const markerScreenX = (dataX - viewPort.offsetX) * viewPort.zoomX;
        const distance = Math.abs(markerScreenX - sx);
        if (distance > 10) continue;
        if (!best || distance < best.distance) best = { markerIndex, barIndex, distance };
      }
    }
    return best;
  }, [getGuideLayout, viewPort.offsetX, viewPort.zoomX]);

  // Render spectral data to canvas (with optional grain layer overlay)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const lut = colorLUTRef.current;

    const imageData = ctx.createImageData(cw, ch);
    const pixels = imageData.data;

    const { offsetX, offsetY, zoomX, zoomY } = viewPort;
      const showGrain = showGrainLayer || synthMode === 'granular';

    for (let sy = 0; sy < ch; sy++) {
      const dataY = Math.floor(sy / zoomY + offsetY);
      for (let sx = 0; sx < cw; sx++) {
        const dataX = Math.floor(sx / zoomX + offsetX);
        const amp = spectralData.get(dataX, dataY);

        const lutIdx = Math.round(amp * 255) * 3;
        const pIdx = (sy * cw + sx) * 4;

        if (showGrain && amp > 0.01) {
          // Blend colormap with grain tint
          const grain = spectralData.getGrain(dataX, dataY);
          const [tr, tg, tb] = grainToTint(grain);
          const baseR = lut[lutIdx];
          const baseG = lut[lutIdx + 1];
          const baseB = lut[lutIdx + 2];
          // Blend: 60% base color + 40% grain tint
          const blend = 0.4;
          pixels[pIdx] = Math.round(baseR * (1 - blend) + tr * blend);
          pixels[pIdx + 1] = Math.round(baseG * (1 - blend) + tg * blend);
          pixels[pIdx + 2] = Math.round(baseB * (1 - blend) + tb * blend);
        } else {
          pixels[pIdx] = lut[lutIdx];
          pixels[pIdx + 1] = lut[lutIdx + 1];
          pixels[pIdx + 2] = lut[lutIdx + 2];
        }
        pixels[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [spectralData, viewPort, showGrainLayer, synthMode]);

  function frequencyToScreenY(freq: number, totalHeight: number): number {
    const normalized = Math.log(freq / 20) / Math.log(20000 / 20);
    return (1 - normalized) * totalHeight;
  }

  // Render overlay (playhead, grid, cursor, stamp preview)
  const renderOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    const { offsetX, zoomX, offsetY, zoomY } = viewPort;
    const playing = isPlaying;
    const playhead = playheadPosition;

    // Grid lines for note frequencies
    const noteFreqs = [
      55, 110, 220, 440, 880, 1760, 3520, 7040, 14080,
      65.41, 130.81, 261.63, 523.25, 1046.5, 2093, 4186, 8372,
    ];
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (const freq of noteFreqs) {
      const dataY = frequencyToScreenY(freq, spectralData.height);
      const sy = (dataY - offsetY) * zoomY;
      if (sy < 0 || sy > ch) continue;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(cw, sy);
      ctx.stroke();
    }

    // Material guide lines inside the painting field
    const { safeBars, barWidthData, guideMarkers } = getGuideLayout();

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.14)';
    ctx.lineWidth = 1;
    for (let bar = 0; bar < safeBars; bar++) {
      const barStart = bar * barWidthData;
      for (let markerIndex = 0; markerIndex < guideMarkers.length; markerIndex++) {
        const dataX = barStart + guideMarkers[markerIndex] * barWidthData;
        const sx = (dataX - offsetX) * zoomX;
        if (sx < 0 || sx > cw) continue;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, ch);
        ctx.stroke();

        const activeGuide = guideDragRef.current?.markerIndex === markerIndex;
        const triY = 3;
        const triHalf = 4;
        ctx.fillStyle = activeGuide ? 'rgba(34, 211, 238, 0.95)' : 'rgba(125, 211, 252, 0.82)';
        ctx.beginPath();
        ctx.moveTo(sx, triY + 7);
        ctx.lineTo(sx - triHalf, triY);
        ctx.lineTo(sx + triHalf, triY);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.30)';
    ctx.lineWidth = 1.3;
    for (let bar = 0; bar <= safeBars; bar++) {
      const dataX = bar * barWidthData;
      const sx = (dataX - offsetX) * zoomX;
      if (sx < 0 || sx > cw) continue;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, ch);
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Playhead / scan indicator directly over the spectral image
    // Show the scan marker while playing (and also while scrubbing in-range).
    if (playing || showPlayheadMarker) {
      const playX = (playhead * spectralData.width - offsetX) * zoomX;
      const scanBandWidth = Math.max(24, zoomX * 10);
      const bandLeft = playX - scanBandWidth * 0.5;
      const bandRight = playX + scanBandWidth * 0.5;

      if (bandRight >= 0 && bandLeft <= cw) {
        const clippedLeft = Math.max(0, bandLeft);
        const clippedRight = Math.min(cw, bandRight);
        const grad = ctx.createLinearGradient(clippedLeft, 0, clippedRight, 0);
        grad.addColorStop(0, 'rgba(0, 255, 136, 0.00)');
        grad.addColorStop(0.12, 'rgba(0, 255, 136, 0.18)');
        grad.addColorStop(0.5, 'rgba(90, 255, 180, 0.40)');
        grad.addColorStop(0.88, 'rgba(0, 255, 136, 0.18)');
        grad.addColorStop(1, 'rgba(0, 255, 136, 0.00)');
        ctx.fillStyle = grad;
        ctx.fillRect(clippedLeft, 0, Math.max(0, clippedRight - clippedLeft), ch);

        ctx.strokeStyle = 'rgba(0,255,136,0.34)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(clippedLeft + 0.5, 0.5, Math.max(0, clippedRight - clippedLeft - 1), ch - 1);
      }

      if (playX >= 0 && playX <= cw) {
        ctx.save();
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.moveTo(playX, 0);
        ctx.lineTo(playX, ch);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#7dffbf';
        ctx.beginPath();
        ctx.moveTo(playX - 6, 0);
        ctx.lineTo(playX + 6, 0);
        ctx.lineTo(playX, 10);
        ctx.closePath();
        ctx.fill();
      } else {
        const edgeX = playX < 0 ? 0 : cw;
        const dir = playX < 0 ? 1 : -1;
        ctx.fillStyle = 'rgba(0,255,136,0.9)';
        ctx.beginPath();
        ctx.moveTo(edgeX, 18);
        ctx.lineTo(edgeX + dir * 10, 12);
        ctx.lineTo(edgeX + dir * 10, 24);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Line tool preview
    if (activeTool === 'line' && lineStart) {
      const sx = (lineStart.x - offsetX) * zoomX;
      const sy = (lineStart.y - offsetY) * zoomY;
      ctx.fillStyle = '#ff0';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stamp selection rectangle
    if (activeTool === 'stamp' && stampPhase === 'selecting' && stampSelStart && stampSelEndRef.current) {
      const x0 = (Math.min(stampSelStart.x, stampSelEndRef.current.x) - offsetX) * zoomX;
      const y0 = (Math.min(stampSelStart.y, stampSelEndRef.current.y) - offsetY) * zoomY;
      const w = Math.abs(stampSelEndRef.current.x - stampSelStart.x) * zoomX;
      const h = Math.abs(stampSelEndRef.current.y - stampSelStart.y) * zoomY;
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x0, y0, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.05)';
      ctx.fillRect(x0, y0, w, h);
    }

    // Stamp preview ghost at cursor
    if (activeTool === 'stamp' && stampPhase === 'stamping' && stampData && mousePosRef.current) {
      const mpos = mousePosRef.current;
      const dataPos = screenToDataFromScreen(mpos.sx, mpos.sy);
      const bounds = spectralData.getStampBounds(stampData, {
        scaleX: stampScaleX,
        scaleY: stampScaleY,
        rotation: stampRotation,
        flipX: stampFlipX,
        flipY: stampFlipY,
      });
      const { halfW, halfH, outW, outH } = bounds;
      const sx0 = (dataPos.x - halfW - offsetX) * zoomX;
      const sy0 = (dataPos.y - halfH - offsetY) * zoomY;
      const sw = outW * zoomX;
      const sh = outH * zoomY;

      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(sx0, sy0, sw, sh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(0, 255, 255, 0.08)';
      ctx.fillRect(sx0, sy0, sw, sh);

      // Draw transformed stamp content as preview using data-space resolution and scale it to screen.
      const lut = colorLUTRef.current;
      const transform = {
        scaleX: stampScaleX,
        scaleY: stampScaleY,
        rotation: stampRotation,
        flipX: stampFlipX,
        flipY: stampFlipY,
      };
      if (sw > 1 && sh > 1 && outW > 1 && outH > 1) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = outW;
        previewCanvas.height = outH;
        const pctx = previewCanvas.getContext('2d');
        if (pctx) {
          const previewImage = pctx.createImageData(outW, outH);
          const pdata = previewImage.data;
          for (let dy = 0; dy < outH; dy++) {
            for (let dx = 0; dx < outW; dx++) {
              const sample = spectralData.sampleStampTransformed(stampData, dx - halfW, dy - halfH, transform);
              const val = sample.amp;
              if (val <= 0.01) continue;
              const lutIdx2 = Math.round(val * 255) * 3;
              const pIdx = (dy * outW + dx) * 4;
              pdata[pIdx] = lut[lutIdx2];
              pdata[pIdx + 1] = lut[lutIdx2 + 1];
              pdata[pIdx + 2] = lut[lutIdx2 + 2];
              pdata[pIdx + 3] = 115;
            }
          }
          pctx.putImageData(previewImage, 0, 0);
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(previewCanvas, sx0, sy0, sw, sh);
          ctx.restore();
        }
      }
    }

    // Cursor crosshair
    if (mousePosRef.current) {
      const { sx: mx, sy: my } = mousePosRef.current;
      const eraseMode = safeToolSettings.eraseMode;
      const brushR = safeToolSettings.brushSize;

      // Brush size circle (elliptical due to zoom)
      const radiusX = brushR * zoomX;
      const radiusY = brushR * zoomY;

      ctx.save();
      ctx.strokeStyle = eraseMode ? 'rgba(255, 80, 80, 0.7)' : 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;

      // Brush circle
      if (activeTool !== 'stamp' || stampPhase !== 'selecting') {
        ctx.beginPath();
        ctx.ellipse(mx, my, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crosshair lines with gap
      const gapR = Math.max(radiusX, radiusY) + 6;
      const lineLen = 14;
      ctx.strokeStyle = eraseMode ? 'rgba(255, 100, 100, 0.9)' : 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;

      // Top
      ctx.beginPath();
      ctx.moveTo(mx, my - gapR - lineLen);
      ctx.lineTo(mx, my - gapR);
      ctx.stroke();
      // Bottom
      ctx.beginPath();
      ctx.moveTo(mx, my + gapR);
      ctx.lineTo(mx, my + gapR + lineLen);
      ctx.stroke();
      // Left
      ctx.beginPath();
      ctx.moveTo(mx - gapR - lineLen, my);
      ctx.lineTo(mx - gapR, my);
      ctx.stroke();
      // Right
      ctx.beginPath();
      ctx.moveTo(mx + gapR, my);
      ctx.lineTo(mx + gapR + lineLen, my);
      ctx.stroke();

      // Center dot
      ctx.fillStyle = eraseMode ? '#ff4444' : '#ffffff';
      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Erase indicator
      if (eraseMode) {
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx - 4, my);
        ctx.lineTo(mx + 4, my);
        ctx.stroke();
      }

      // Grain size indicator (small colored dot below cursor)
      if (synthMode === 'granular' || showGrainLayer) {
        const [gr, gg, gb] = grainToTint(safeToolSettings.grainSize);
        ctx.fillStyle = `rgb(${gr}, ${gg}, ${gb})`;
        ctx.beginPath();
        ctx.arc(mx + gapR + 4, my + gapR + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [viewPort, spectralData, activeTool, lineStart, safeToolSettings, stampPhase, stampSelStart, stampData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY, screenToData, showGrainLayer, synthMode, materialExport, getGuideLayout, showPlayheadMarker, isPlaying, playheadPosition]);

  // Keep the scan marker visible while playing by gently following the playhead.
  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const visibleWidth = Math.max(1, canvas.width / viewPort.zoomX);
    const maxOffsetX = Math.max(0, spectralData.width - visibleWidth);
    const playDataX = playheadPosition * spectralData.width;
    const playScreenX = (playDataX - viewPort.offsetX) * viewPort.zoomX;
    const margin = Math.max(36, canvas.width * 0.14);

    if (playScreenX < margin || playScreenX > canvas.width - margin) {
      const centeredOffset = playDataX - visibleWidth * 0.5;
      const nextOffsetX = Math.max(0, Math.min(maxOffsetX, centeredOffset));
      if (Math.abs(nextOffsetX - viewPort.offsetX) > 0.5) {
        setViewPort({ offsetX: nextOffsetX });
      }
    }
  }, [isPlaying, playheadPosition, viewPort.offsetX, viewPort.zoomX, spectralData.width, setViewPort]);

  // Helper to get data coords from screen coords without going through React state
  function screenToDataFromScreen(sx: number, sy: number): { x: number; y: number } {
    const vp = useStore.getState().viewPort;
    const dataX = Math.floor(sx / vp.zoomX + vp.offsetX);
    const dataY = Math.floor(sy / vp.zoomY + vp.offsetY);
    return { x: dataX, y: dataY };
  }

  // Cursor animation loop
  useEffect(() => {
    const animate = () => {
      renderOverlay();
      cursorRafRef.current = requestAnimationFrame(animate);
    };
    cursorRafRef.current = requestAnimationFrame(animate);
    return () => {
      if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
    };
  }, [renderOverlay]);

  // Main render effect
  useEffect(() => {
    render();
  }, [render, renderVersion]);

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

    const visibleWidth = Math.max(1, Math.min(spectralData.width, canvasRef.current ? canvasRef.current.width / viewPort.zoomX : spectralData.width));
    const leftPx = (viewPort.offsetX / spectralData.width) * cw;
    const widthPx = Math.max(10, (visibleWidth / spectralData.width) * cw);
    const clampedLeft = Math.max(0, Math.min(cw - widthPx, leftPx));

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
  }, [spectralData, viewPort, showGrainLayer, synthMode, playheadPosition, isPlaying, showPlayheadMarker]);

  const updateViewportFromNavigator = useCallback((clientX: number, mode?: 'move' | 'resize-left' | 'resize-right') => {
    const wrap = overviewWrapRef.current;
    const mainCanvas = canvasRef.current;
    if (!wrap || !mainCanvas) return;

    const rect = wrap.getBoundingClientRect();
    const pointerX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const visibleWidth = Math.max(1, Math.min(spectralData.width, mainCanvas.width / viewPort.zoomX));
    const minVisibleWidth = Math.max(16, spectralData.width * 0.015);
    const currentLeft = viewPort.offsetX;
    const currentRight = currentLeft + visibleWidth;

    if (mode === 'resize-left') {
      const nextLeft = Math.max(0, Math.min(pointerX / rect.width * spectralData.width, currentRight - minVisibleWidth));
      const nextWidth = Math.max(minVisibleWidth, currentRight - nextLeft);
      const nextZoomX = Math.max(0.1, Math.min(20, mainCanvas.width / nextWidth));
      setViewPort({ offsetX: nextLeft, zoomX: nextZoomX });
      return;
    }

    if (mode === 'resize-right') {
      const nextRight = Math.max(currentLeft + minVisibleWidth, Math.min(spectralData.width, pointerX / rect.width * spectralData.width));
      const nextWidth = Math.max(minVisibleWidth, nextRight - currentLeft);
      const nextZoomX = Math.max(0.1, Math.min(20, mainCanvas.width / nextWidth));
      setViewPort({ zoomX: nextZoomX });
      return;
    }

    const centeredOffset = (pointerX / rect.width) * spectralData.width - visibleWidth * 0.5;
    const maxOffsetX = Math.max(0, spectralData.width - visibleWidth);
    setViewPort({ offsetX: Math.max(0, Math.min(maxOffsetX, centeredOffset)) });
  }, [spectralData.width, viewPort.offsetX, viewPort.zoomX, setViewPort]);

  useEffect(() => {
    renderOverview();
  }, [renderOverview, renderVersion]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
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
        render();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [render]);

  // Paint handler
  const handlePaint = useCallback((x: number, y: number) => {
    const { brushSize, intensity, hardness, numHarmonics, harmonicDecay, sprayDensity, eraseMode, grainSize } = safeToolSettings;

    switch (activeTool) {
      case 'brush':
        spectralData.applyBrush(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
        break;
      case 'hardBrush':
        spectralData.applyBrush(x, y, brushSize, intensity, 1.0, eraseMode, grainSize);
        break;
      case 'harmonicBrush':
        spectralData.applyHarmonicBrush(x, y, brushSize, intensity, hardness, numHarmonics, harmonicDecay, spectralData.height, eraseMode, grainSize);
        break;
      case 'noiseBrush':
        spectralData.applyNoiseBrush(x, y, brushSize, intensity, eraseMode, grainSize);
        break;
      case 'spray':
        spectralData.applySpray(x, y, brushSize, intensity, sprayDensity, eraseMode, grainSize);
        break;
      case 'smudge':
        spectralData.applySmudge(x, y, brushSize, intensity, 0, 0, grainSize);
        break;
      case 'dodgeBurn':
        spectralData.applyDodgeBurn(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
        break;
      case 'blurSharpen':
        spectralData.applyBlurSharpen(x, y, brushSize, intensity, hardness, eraseMode);
        break;
      case 'delaySmear':
        spectralData.applyDelaySmear(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
        break;
      case 'threshold':
        spectralData.applyThresholdBrush(x, y, brushSize, intensity, hardness, eraseMode, grainSize);
        break;
      case 'sourceTrace': {
        const analysis = sourceAsset?.analysisCache;
        if (analysis) {
          spectralData.applySourceTrace(x, y, brushSize, intensity, hardness, analysis.data, analysis.width, analysis.height, analysis.transientEnvelope, eraseMode, grainSize);
        }
        break;
      }
      case 'formant':
        spectralData.applyFormantStamp(x, y, safeToolSettings.formantVowel, intensity, spectralData.height, brushSize, eraseMode, grainSize);
        break;
    }

    audioEngine.invalidateBuffer();
    triggerRender();
  }, [activeTool, sourceAsset, safeToolSettings, spectralData, triggerRender]);

  // Mouse events
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      const guideHandle = detectGuideHandle(e.clientX, e.clientY);
      if (guideHandle) {
        guideDragRef.current = { markerIndex: guideHandle.markerIndex, barIndex: guideHandle.barIndex };
        return;
      }
    }

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX, y: e.clientY,
        ox: viewPort.offsetX, oy: viewPort.offsetY
      };
      return;
    }

    if (e.button !== 0) return;

    const pos = screenToData(e.clientX, e.clientY);

    // Stamp tool
    if (activeTool === 'stamp') {
      if (stampPhase === 'idle' || stampPhase === 'selecting') {
        // Start selecting region
        setStampSelStart(pos);
        setStampPhase('selecting');
        isStampSelectingRef.current = true;
        stampSelEndRef.current = pos;
        return;
      }
      if (stampPhase === 'stamping' && stampData) {
        // Paste stamp
        pushUndo();
        spectralData.pasteStamp(pos.x, pos.y, stampData, safeToolSettings.intensity, safeToolSettings.eraseMode, {
          scaleX: stampScaleX,
          scaleY: stampScaleY,
          rotation: stampRotation,
          flipX: stampFlipX,
          flipY: stampFlipY,
        });
        audioEngine.invalidateBuffer();
        triggerRender();
        return;
      }
      return;
    }

    // Line tool
    if (activeTool === 'line') {
      if (!lineStart) {
        setLineStart(pos);
      } else {
        pushUndo();
        const { brushSize, intensity, hardness, eraseMode, grainSize } = safeToolSettings;
        spectralData.drawLine(
          lineStart.x, lineStart.y, pos.x, pos.y,
          brushSize, intensity, hardness, 'brush', eraseMode, 0.3, grainSize
        );
        audioEngine.invalidateBuffer();
        triggerRender();
        setLineStart(null);
      }
      return;
    }

    if (activeTool === 'morph') {
      isPaintingRef.current = true;
      lastPosRef.current = pos;
      pushUndo();
      if (safeToolSettings.morphMode !== 'push') {
        spectralData.applyMorph(pos.x, pos.y, safeToolSettings.brushSize, safeToolSettings.intensity, safeToolSettings.morphMode, 0, 0);
        audioEngine.invalidateBuffer();
        triggerRender();
      }
      return;
    }

    if (activeTool === 'smudge') {
      isPaintingRef.current = true;
      lastPosRef.current = pos;
      pushUndo();
      spectralData.applySmudge(pos.x, pos.y, safeToolSettings.brushSize, safeToolSettings.intensity * 0.6, 0, 0, safeToolSettings.grainSize);
      audioEngine.invalidateBuffer();
      triggerRender();
      return;
    }

    isPaintingRef.current = true;
    lastPosRef.current = pos;
    pushUndo();
    handlePaint(pos.x, pos.y);
  }, [screenToData, activeTool, lineStart, setLineStart, pushUndo, handlePaint, safeToolSettings, spectralData, triggerRender, viewPort, stampPhase, stampData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY, setStampSelStart, setStampPhase, setStampData, detectGuideHandle]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePosRef.current = {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top
    };

    const pos = screenToData(e.clientX, e.clientY);

    // Update hover info
    const freq = yToFrequency(pos.y, spectralData.height);
    const time = (pos.x / spectralData.width) * DURATION;
    setHoverInfo({
      freq: Math.round(freq * 10) / 10,
      time: Math.round(time * 1000) / 1000,
      note: frequencyToNoteName(freq),
    });

    // Drag guide markers at the top edge of the painting field.
    if (guideDragRef.current) {
      const { barWidthData, guideMarkers } = getGuideLayout();
      const drag = guideDragRef.current;
      const barStart = drag.barIndex * barWidthData;
      const rawFraction = (pos.x - barStart) / Math.max(1, barWidthData);
      const prev = drag.markerIndex === 0 ? 0 : guideMarkers[drag.markerIndex - 1] ?? 0;
      const next = drag.markerIndex === guideMarkers.length - 1 ? 1 : guideMarkers[drag.markerIndex + 1] ?? 1;
      const minGap = 1 / (Math.max(1, materialExport.guideSegments) * 8);
      const clamped = Math.max(prev + minGap, Math.min(next - minGap, rawFraction));
      setGuideMarker(drag.markerIndex, clamped);
      return;
    }

    // Stamp selection drag
    if (isStampSelectingRef.current && activeTool === 'stamp') {
      stampSelEndRef.current = pos;
      return;
    }

    if (isPanningRef.current && panStartRef.current) {
      const dx = (e.clientX - panStartRef.current.x) / viewPort.zoomX;
      const dy = (e.clientY - panStartRef.current.y) / viewPort.zoomY;
      setViewPort({
        offsetX: Math.max(0, panStartRef.current.ox - dx),
        offsetY: Math.max(0, panStartRef.current.oy - dy),
      });
      return;
    }

    if (!isPaintingRef.current) return;

    const last = lastPosRef.current;
    if (last) {
      const { brushSize, intensity, hardness, eraseMode, sprayDensity, grainSize } = safeToolSettings;
      const ddx = pos.x - last.x;
      const ddy = pos.y - last.y;
      const steps = Math.max(Math.abs(ddx), Math.abs(ddy), 1);
      const stepStride = Math.max(1, Math.floor(Math.max(1, brushSize) * 0.35));

      if (activeTool === 'morph') {
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        spectralData.applyMorph(pos.x, pos.y, brushSize, intensity, safeToolSettings.morphMode, dx, dy);
      } else if (activeTool === 'smudge') {
        const dx = pos.x - last.x;
        const dy = pos.y - last.y;
        spectralData.applySmudge(pos.x, pos.y, brushSize, intensity, dx, dy, grainSize);
      } else if (activeTool === 'dodgeBurn') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyDodgeBurn(px, py, brushSize, intensity, hardness, eraseMode, grainSize);
        }
      } else if (activeTool === 'blurSharpen') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyBlurSharpen(px, py, brushSize, intensity, hardness, eraseMode);
        }
      } else if (activeTool === 'delaySmear') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyDelaySmear(px, py, brushSize, intensity, hardness, eraseMode, grainSize);
        }
      } else if (activeTool === 'threshold') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyThresholdBrush(px, py, brushSize, intensity, hardness, eraseMode, grainSize);
        }
      } else if (activeTool === 'sourceTrace') {
        const analysis = sourceAsset?.analysisCache;
        if (analysis) {
          for (let i = 0; i <= steps; i += stepStride) {
            const t = i / steps;
            const px = Math.round(last.x + ddx * t);
            const py = Math.round(last.y + ddy * t);
            spectralData.applySourceTrace(px, py, brushSize, intensity, hardness, analysis.data, analysis.width, analysis.height, analysis.transientEnvelope, eraseMode, grainSize);
          }
        }
      } else if (activeTool === 'harmonicBrush') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyHarmonicBrush(
            px, py, brushSize, intensity * 0.5, hardness,
            safeToolSettings.numHarmonics, safeToolSettings.harmonicDecay, spectralData.height,
            eraseMode, grainSize
          );
        }
      } else if (activeTool === 'formant') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyFormantStamp(
            px, py, safeToolSettings.formantVowel, intensity, spectralData.height,
            brushSize, eraseMode, grainSize
          );
        }
      } else if (activeTool === 'noiseBrush') {
        for (let i = 0; i <= steps; i += stepStride) {
          const t = i / steps;
          const px = Math.round(last.x + ddx * t);
          const py = Math.round(last.y + ddy * t);
          spectralData.applyNoiseBrush(px, py, brushSize, intensity, eraseMode, grainSize);
        }
      } else if (activeTool === 'hardBrush') {
        spectralData.drawLine(last.x, last.y, pos.x, pos.y, brushSize, intensity, 1.0, 'brush', eraseMode, sprayDensity, grainSize);
      } else if (activeTool === 'spray') {
        spectralData.drawLine(last.x, last.y, pos.x, pos.y, brushSize, intensity, hardness, 'spray', eraseMode, sprayDensity, grainSize);
      } else {
        spectralData.drawLine(last.x, last.y, pos.x, pos.y, brushSize, intensity, hardness, 'brush', eraseMode, sprayDensity, grainSize);
      }

      audioEngine.invalidateBuffer();
      triggerRender();
    }
    lastPosRef.current = pos;
  }, [screenToData, viewPort, setViewPort, activeTool, sourceAsset, safeToolSettings, spectralData, triggerRender, getGuideLayout, materialExport.guideSegments, setGuideMarker]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    // Stamp selection complete
    if (isStampSelectingRef.current && activeTool === 'stamp' && stampSelStart) {
      isStampSelectingRef.current = false;
      const pos = screenToData(e.clientX, e.clientY);
      const x0 = Math.min(stampSelStart.x, pos.x);
      const y0 = Math.min(stampSelStart.y, pos.y);
      const w = Math.abs(pos.x - stampSelStart.x);
      const h = Math.abs(pos.y - stampSelStart.y);
      if (w > 1 && h > 1) {
        const captured = safeToolSettings.eraseMode
          ? (() => {
              // Cut capture: remove selected content while capturing it for stamping.
              pushUndo();
              const cut = spectralData.cutRegion(x0, y0, w, h);
              audioEngine.invalidateBuffer();
              triggerRender();
              return cut;
            })()
          : spectralData.copyRegion(x0, y0, w, h);

        setStampData(captured);
        setStampScale(1.0, 1.0);
        setStampPhase('stamping');
      } else {
        setStampPhase('idle');
      }
      setStampSelStart(null);
      stampSelEndRef.current = null;
    }

    guideDragRef.current = null;
    isPaintingRef.current = false;
    lastPosRef.current = null;
    isPanningRef.current = false;
    panStartRef.current = null;
  }, [activeTool, stampSelStart, spectralData, safeToolSettings.eraseMode, pushUndo, triggerRender, setStampData, setStampScale, setStampPhase, setStampSelStart, screenToData]);

  const onMouseLeave = useCallback(() => {
    mousePosRef.current = null;
    guideDragRef.current = null;
    isPaintingRef.current = false;
    lastPosRef.current = null;
    isPanningRef.current = false;
    panStartRef.current = null;
    if (isStampSelectingRef.current) {
      isStampSelectingRef.current = false;
      stampSelEndRef.current = null;
      useStore.getState().setStampSelStart(null);
      useStore.getState().setStampPhase('idle');
    }
  }, []);

  // Native wheel handler to properly prevent conflicts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Aggressively own wheel/pinch gestures inside the canvas area
      e.preventDefault();
      e.stopPropagation();

      // Get current state directly from store (avoids stale closures)
      const state = useStore.getState();

      // STAMP TOOL: wheel / two-finger pinch only affects stamp scale, never viewport zoom.
      // This also captures ctrl+wheel pinch events many browsers emit on touchpads.
      if (state.activeTool === 'stamp' && state.stampPhase === 'stamping') {
        const deltaBase = e.deltaMode === 1 ? 0.06 : 0.1;
        const delta = e.deltaY < 0 ? deltaBase : -deltaBase;
        state.setStampScale(state.stampScaleX + delta, state.stampScaleY + delta);
        return;
      }

      // Ignore browser page zoom semantics and reinterpret gesture locally as canvas zoom.
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const vp = state.viewPort;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

      // Shift = only Y zoom, Ctrl/meta pinch = uniform local zoom, default = both axes
      const newZoomX = e.shiftKey
        ? vp.zoomX
        : Math.max(0.1, Math.min(20, vp.zoomX * zoomFactor));
      const newZoomY = e.shiftKey
        ? Math.max(0.1, Math.min(20, vp.zoomY * zoomFactor))
        : Math.max(0.1, Math.min(20, vp.zoomY * zoomFactor));

      const dataXBefore = mouseX / vp.zoomX + vp.offsetX;
      const dataYBefore = mouseY / vp.zoomY + vp.offsetY;
      const newOffsetX = Math.max(0, dataXBefore - mouseX / newZoomX);
      const newOffsetY = Math.max(0, dataYBefore - mouseY / newZoomY);

      state.setViewPort({
        zoomX: newZoomX,
        zoomY: newZoomY,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      });
    };

    // Use capture + passive:false so we intercept before the page/browser zoom handlers
    container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => container.removeEventListener('wheel', handleWheel, true);
  }, []); // No dependencies needed - reads from store directly

  // Double click to preview column
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = screenToData(e.clientX, e.clientY);
    useStore.getState().setShowPlayheadMarker(false);
    audioEngine.previewColumn(spectralData, pos.x, waveformMix, 300);
  }, [screenToData, spectralData, waveformMix]);

  // Right click cancels stamp / line
  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (activeTool === 'stamp') {
      setStampPhase('idle');
      setStampData(null);
      setStampSelStart(null);
      stampSelEndRef.current = null;
      isStampSelectingRef.current = false;
    }
    if (activeTool === 'line' && lineStart) {
      setLineStart(null);
    }
  }, [activeTool, setStampPhase, setStampData, setStampSelStart, lineStart, setLineStart]);

  const onNavigatorMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const wrap = overviewWrapRef.current;
    const mainCanvas = canvasRef.current;
    if (!wrap || !mainCanvas) return;

    const rect = wrap.getBoundingClientRect();
    const pointerX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const visibleWidth = Math.max(1, Math.min(spectralData.width, mainCanvas.width / viewPort.zoomX));
    const leftPx = (viewPort.offsetX / spectralData.width) * rect.width;
    const widthPx = Math.max(10, (visibleWidth / spectralData.width) * rect.width);
    const rightPx = leftPx + widthPx;
    const edgeHit = 10;

    let mode: 'move' | 'resize-left' | 'resize-right' = 'move';
    if (Math.abs(pointerX - leftPx) <= edgeHit) mode = 'resize-left';
    else if (Math.abs(pointerX - rightPx) <= edgeHit) mode = 'resize-right';

    navigatorDragRef.current = {
      mode,
      grabOffsetPx: pointerX - leftPx,
      startLeftPx: leftPx,
      startRightPx: rightPx,
      rectWidth: rect.width,
      pointerDownX: e.clientX,
      moved: false,
    };
  }, [spectralData.width, viewPort.offsetX, viewPort.zoomX, updateViewportFromNavigator]);

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

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black">
      <div className="relative flex-1 overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ imageRendering: 'pixelated' }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none"
        />
        {/* Interactive overlay — no onWheel here, handled natively */}
        <div
          className="absolute inset-0"
          style={{ cursor: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
        {/* Hover info */}
        {hoverInfo && (
          <div className="absolute bottom-1 right-1 bg-black/70 text-xs text-gray-300 px-2 py-1 rounded font-mono pointer-events-none">
            {hoverInfo.note} ({hoverInfo.freq} Hz) | {hoverInfo.time.toFixed(3)}s
            {safeToolSettings.eraseMode && <span className="ml-2 text-red-400">⊖ RADIEREN</span>}
          </div>
        )}
        {isPlaying && (
          <div className="absolute top-2 right-3 bg-black/65 text-[10px] text-emerald-300 px-2 py-1 rounded pointer-events-none font-mono">
            Scan {Math.max(0, Math.min(100, playheadPosition * 100)).toFixed(1)}%
          </div>
        )}
        {/* Stamp phase indicator */}
        {activeTool === 'stamp' && (
          <div className="absolute top-2 left-14 bg-black/80 text-xs text-cyan-300 px-3 py-1.5 rounded pointer-events-none">
            {stampPhase === 'idle' && '📋 Ziehe ein Rechteck um den gewünschten Bereich'}
            {stampPhase === 'selecting' && '📋 Bereich auswählen... (loslassen zum Bestätigen)'}
            {stampPhase === 'stamping' && `📋 Klick = Stempeln | Scroll = Uniform Scale | Pfeiltasten = Stretch | X:${(stampScaleX * 100).toFixed(0)}% Y:${(stampScaleY * 100).toFixed(0)}%`}
          </div>
        )}
        {/* Frequency labels on left */}
        <div className="absolute left-0 top-0 bottom-0 w-12 pointer-events-none flex flex-col justify-between py-1">
          {[20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20].map(f => {
            const dataY = frequencyToScreenY(f, spectralData.height);
            const sy = (dataY - viewPort.offsetY) * viewPort.zoomY;
            const canvas = canvasRef.current;
            if (!canvas || sy < 0 || sy > canvas.height) return null;
            return (
              <div
                key={f}
                className="absolute text-[9px] text-gray-500 font-mono"
                style={{ top: sy, left: 2 }}
              >
                {f >= 1000 ? `${f / 1000}k` : f}
              </div>
            );
          })}
          <div className="absolute left-1 bottom-1 text-[9px] text-gray-500 font-mono">Hz</div>
        </div>
      </div>

      <div className="border-t border-gray-800 bg-gray-950 px-3 py-2 shrink-0">
        <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-1.5">
          <span className="text-cyan-300 font-semibold">Navigator</span>
          <span>Ziehen = verschieben</span>
          <span>Ränder ziehen = Zeit-Zoom</span>
          <span className="ml-auto font-mono text-gray-400">X {viewPort.zoomX.toFixed(1)}x</span>
        </div>
        <div
          ref={overviewWrapRef}
          className="relative h-14 rounded-md overflow-hidden border border-gray-800 bg-black cursor-ew-resize"
          onMouseDown={onNavigatorMouseDown}
        >
          <canvas
            ref={overviewCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </div>
  );
}
