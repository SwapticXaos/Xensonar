import type { AppState, ToolSettings, ViewPort } from '../../state/store';
import type { AnchorBindingPreview, CarrierAnchor } from '../../types/carrierDonorV2Types';
import { anchorColor, bindingColor, continuityColor, frequencyToScreenY, grainToTint } from './spectralCanvasVisuals';

type GuideLayout = {
  safeBars: number;
  barWidthData: number;
  guideMarkers: number[];
};

type SpectralCanvasOverlayArgs = {
  canvas: HTMLCanvasElement | null;
  viewPort: ViewPort;
  spectralData: AppState['spectralData'];
  activeTool: AppState['activeTool'];
  lineStart: AppState['lineStart'];
  toolSettings: ToolSettings;
  stampPhase: AppState['stampPhase'];
  stampSelStart: AppState['stampSelStart'];
  stampSelEnd: { x: number; y: number } | null;
  stampData: AppState['stampData'];
  stampScaleX: number;
  stampScaleY: number;
  stampRotation: number;
  stampFlipX: boolean;
  stampFlipY: boolean;
  mousePos: { sx: number; sy: number } | null;
  guideDragMarkerIndex: number | null;
  guideLayout: GuideLayout;
  colorLut: Uint8Array;
  showGrainLayer: boolean;
  synthMode: AppState['synthMode'];
  showPlayheadMarker: boolean;
  isPlaying: boolean;
  playheadPosition: number;
  showCarrierDonorV2Overlay: boolean;
  showCarrierDonorV2ContinuityOverlay: boolean;
  showCarrierDonorV2BindingOverlay: boolean;
  carrierDonorV2Skeleton: AppState['carrierDonorV2']['skeleton'];
  carrierDonorV2ContinuityGraph: AppState['carrierDonorV2']['continuityGraph'];
  carrierAnchorMap: Map<string, CarrierAnchor>;
  carrierBindingMap: Map<string, AnchorBindingPreview>;
  v2OverlayWarning: string;
  screenToDataFromScreen: (sx: number, sy: number) => { x: number; y: number };
};

export function renderSpectralCanvasOverlay({
  canvas,
  viewPort,
  spectralData,
  activeTool,
  lineStart,
  toolSettings,
  stampPhase,
  stampSelStart,
  stampSelEnd,
  stampData,
  stampScaleX,
  stampScaleY,
  stampRotation,
  stampFlipX,
  stampFlipY,
  mousePos,
  guideDragMarkerIndex,
  guideLayout,
  colorLut,
  showGrainLayer,
  synthMode,
  showPlayheadMarker,
  isPlaying,
  playheadPosition,
  showCarrierDonorV2Overlay,
  showCarrierDonorV2ContinuityOverlay,
  showCarrierDonorV2BindingOverlay,
  carrierDonorV2Skeleton,
  carrierDonorV2ContinuityGraph,
  carrierAnchorMap,
  carrierBindingMap,
  v2OverlayWarning,
  screenToDataFromScreen,
}: SpectralCanvasOverlayArgs) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  const { offsetX, zoomX, offsetY, zoomY } = viewPort;

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

  const { safeBars, barWidthData, guideMarkers } = guideLayout;

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

      const activeGuide = guideDragMarkerIndex === markerIndex;
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

  if (showCarrierDonorV2Overlay && carrierDonorV2Skeleton) {
    if (showCarrierDonorV2ContinuityOverlay && carrierDonorV2ContinuityGraph && carrierAnchorMap.size > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const link of carrierDonorV2ContinuityGraph.links) {
        const from = carrierAnchorMap.get(link.fromAnchorId);
        const to = carrierAnchorMap.get(link.toAnchorId);
        if (!from || !to) continue;
        const fromX = (from.timeIndex - offsetX) * zoomX;
        const fromY = (from.centerBin - offsetY) * zoomY;
        const toX = (to.timeIndex - offsetX) * zoomX;
        const toY = (to.centerBin - offsetY) * zoomY;
        if ((fromX < -14 && toX < -14) || (fromX > cw + 14 && toX > cw + 14) || (fromY < -14 && toY < -14) || (fromY > ch + 14 && toY > ch + 14)) continue;
        ctx.strokeStyle = continuityColor(link);
        ctx.lineWidth = 0.8 + link.continuityScore * 1.5;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const anchors of carrierDonorV2Skeleton.anchorsByTime) {
      for (const anchor of anchors) {
        const sx = (anchor.timeIndex - offsetX) * zoomX;
        const sy = (anchor.centerBin - offsetY) * zoomY;
        if (sx < -10 || sx > cw + 10 || sy < -10 || sy > ch + 10) continue;
        const radius = Math.max(2, Math.min(6, 1.6 + anchor.energy * 6));
        const halfBandwidthPx = Math.max(1, (anchor.bandwidthBins * zoomY) / 2);
        const baseColor = anchorColor(anchor);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = anchor.regime === 'tonal' ? 1.4 : 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy - halfBandwidthPx);
        ctx.lineTo(sx, sy + halfBandwidthPx);
        ctx.stroke();
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (showCarrierDonorV2BindingOverlay) {
          const binding = carrierBindingMap.get(anchor.id);
          const color = bindingColor(binding);
          if (binding && color) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1 + binding.confidence * 2.2;
            ctx.beginPath();
            ctx.arc(sx, sy, radius + 2.6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }
    ctx.lineWidth = 1;
  }

  if (v2OverlayWarning) {
    ctx.save();
    ctx.font = '11px sans-serif';
    const paddingX = 8;
    const textWidth = ctx.measureText(v2OverlayWarning).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = 24;
    const x = Math.max(8, cw - boxWidth - 8);
    const y = 8;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeRect(x + 0.5, y + 0.5, boxWidth - 1, boxHeight - 1);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.95)';
    ctx.fillText(v2OverlayWarning, x + paddingX, y + 15);
    ctx.restore();
  }

  if (isPlaying || showPlayheadMarker) {
    const playX = (playheadPosition * spectralData.width - offsetX) * zoomX;
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

  if (activeTool === 'line' && lineStart) {
    const sx = (lineStart.x - offsetX) * zoomX;
    const sy = (lineStart.y - offsetY) * zoomY;
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (activeTool === 'stamp' && stampPhase === 'selecting' && stampSelStart && stampSelEnd) {
    const x0 = (Math.min(stampSelStart.x, stampSelEnd.x) - offsetX) * zoomX;
    const y0 = (Math.min(stampSelStart.y, stampSelEnd.y) - offsetY) * zoomY;
    const w = Math.abs(stampSelEnd.x - stampSelStart.x) * zoomX;
    const h = Math.abs(stampSelEnd.y - stampSelStart.y) * zoomY;
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x0, y0, w, h);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 255, 0, 0.05)';
    ctx.fillRect(x0, y0, w, h);
  }

  if (activeTool === 'stamp' && stampPhase === 'stamping' && stampData && mousePos) {
    const dataPos = screenToDataFromScreen(mousePos.sx, mousePos.sy);
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
            pdata[pIdx] = colorLut[lutIdx2];
            pdata[pIdx + 1] = colorLut[lutIdx2 + 1];
            pdata[pIdx + 2] = colorLut[lutIdx2 + 2];
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

  if (mousePos) {
    const { sx: mx, sy: my } = mousePos;
    const eraseMode = toolSettings.eraseMode;
    const brushR = toolSettings.brushSize;
    const radiusX = brushR * zoomX;
    const radiusY = brushR * zoomY;

    ctx.save();
    ctx.strokeStyle = eraseMode ? 'rgba(255, 80, 80, 0.7)' : 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;

    if (activeTool !== 'stamp' || stampPhase !== 'selecting') {
      ctx.beginPath();
      ctx.ellipse(mx, my, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const gapR = Math.max(radiusX, radiusY) + 6;
    const lineLen = 14;
    ctx.strokeStyle = eraseMode ? 'rgba(255, 100, 100, 0.9)' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(mx, my - gapR - lineLen);
    ctx.lineTo(mx, my - gapR);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx, my + gapR);
    ctx.lineTo(mx, my + gapR + lineLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx - gapR - lineLen, my);
    ctx.lineTo(mx - gapR, my);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mx + gapR, my);
    ctx.lineTo(mx + gapR + lineLen, my);
    ctx.stroke();

    ctx.fillStyle = eraseMode ? '#ff4444' : '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (eraseMode) {
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx - 4, my);
      ctx.lineTo(mx + 4, my);
      ctx.stroke();
    }

    if (synthMode === 'granular' || showGrainLayer) {
      const [gr, gg, gb] = grainToTint(toolSettings.grainSize);
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
}
