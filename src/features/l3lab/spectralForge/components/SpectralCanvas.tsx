import * as React from 'react';
import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useStore, mergeToolSettings } from '../state/store';
import { colorMaps, buildColorLUT } from '../utils/colorMap';
import { yToFrequency, frequencyToNoteName } from '../audio/SpectralData';
import { audioEngine } from '../audio/AudioEngine';
import { DURATION } from '../state/store';
import { getForge3BodyField } from '../../forge3/bodyField';
import { buildBodyFromForgeMainPath } from '../body/mediatedAudioBodyFactory';
import { getBodyActiveVisibilityMask, getBodyTraceVisibilityMask } from '../body/mediatedAudioBodySelectors';
import type { AnchorBindingPreview, CarrierAnchor } from '../types/carrierDonorV2Types';
import { commitSpectralCanvasAudioEdit, type SpectralCanvasDirtyEdit } from './spectralCanvas/spectralCanvasEditCommit';
import { applySpectralCanvasPaintStroke } from './spectralCanvas/spectralCanvasPaintStroke';
import { renderSpectralCanvasFrame } from './spectralCanvas/spectralCanvasRenderer';
import { renderSpectralCanvasOverlay } from './spectralCanvas/spectralCanvasOverlayRenderer';
import { SpectralCanvasHoverInfo, SpectralCanvasStatusBadges, SpectralFrequencyLabels, SpectralNavigatorBar, StampPhaseIndicator } from './spectralCanvas/SpectralCanvasHud';
import {
  STAMP_WHEEL_FACTOR_PER_PIXEL,
  STAMP_WHEEL_FRAME_DELTA_PX_MAX,
  clampStampWheelScale,
  normalizeStampWheelDeltaPx,
} from './spectralCanvas/spectralCanvasViewportModel';
import { useSpectralCanvasNavigator } from './spectralCanvas/useSpectralCanvasNavigator';
import { useSpectralCanvasRenderLifecycle, useSpectralCanvasResizeLifecycle } from './spectralCanvas/useSpectralCanvasLifecycle';

type SpectralCanvasProps = {
  variant?: 'legacy' | 'forge3';
  forge3Lens?: 'body' | 'source' | 'hear';
  showTraceLayer?: boolean;
};

export default function SpectralCanvas({ variant = 'legacy', forge3Lens = 'body', showTraceLayer = false }: SpectralCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPaintingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const mousePosRef = useRef<{ sx: number; sy: number } | null>(null);
  const isStampSelectingRef = useRef(false);
  const stampSelEndRef = useRef<{ x: number; y: number } | null>(null);
  const guideDragRef = useRef<{ markerIndex: number; barIndex: number } | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{ freq: number; time: number; note: string } | null>(null);
  const [forge3Hover, setForge3Hover] = useState<string | null>(null);

  const spectralData = useStore(s => s.spectralData);
  const viewPort = useStore(s => s.viewPort);
  const setViewPort = useStore(s => s.setViewPort);
  const activeTool = useStore(s => s.activeTool);
  const toolSettings = useStore(s => s.toolSettings);
  const safeToolSettings = mergeToolSettings(activeTool, toolSettings);
  const renderVersion = useStore(s => s.renderVersion);
  const triggerRender = useStore(s => s.triggerRender);
  const setAudioBufferDirty = useStore(s => s.setAudioBufferDirty);
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
  const carrierDonorV2Skeleton = useStore(s => s.carrierDonorV2.skeleton);
  const carrierDonorV2ContinuityGraph = useStore(s => s.carrierDonorV2.continuityGraph);
  const carrierDonorV2BindingPreview = useStore(s => s.carrierDonorV2.bindingPreview);
  const showCarrierDonorV2Overlay = useStore(s => s.carrierDonorV2.overlayVisible);
  const showCarrierDonorV2ContinuityOverlay = useStore(s => s.carrierDonorV2.continuityOverlayVisible);
  const showCarrierDonorV2BindingOverlay = useStore(s => s.carrierDonorV2.bindingOverlayVisible);
  const carrierDonorV2Freshness = useStore(s => s.carrierDonorV2.freshness);
  const sourceAsset = useStore(s => s.sourceAsset);
  const forge3EditTarget = useStore(s => s.forge3EditTarget);

  const forge3Field = getForge3BodyField();

  const mainBody = useMemo(() => {
    if (variant !== 'forge3') return null;
    return buildBodyFromForgeMainPath(spectralData, forge3Field, sourceAsset);
  }, [variant, spectralData, forge3Field, sourceAsset]);

  const activeVisibilityMask = useMemo(() => {
    if (!mainBody) return null;
    return getBodyActiveVisibilityMask(mainBody);
  }, [mainBody]);

  const traceVisibilityMask = useMemo(() => {
    if (!mainBody) return null;
    return getBodyTraceVisibilityMask(mainBody);
  }, [mainBody]);

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

  useEffect(() => {
    if (variant === 'forge3') {
      forge3Field.ensureInitialized(spectralData, sourceAsset);
    }
  }, [variant, spectralData, sourceAsset, forge3Field]);

  const bodyLinkedMode = variant === 'forge3' && !!sourceAsset && forge3EditTarget === 'linked_body';

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

  // Render spectral data to canvas; pixel work lives outside the React interaction owner.
  const render = useCallback((viewPortOverride?: typeof viewPort) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderSpectralCanvasFrame({
      canvas,
      spectralData,
      viewPort: viewPortOverride ?? viewPort,
      colorLut: colorLUTRef.current,
      showGrain: showGrainLayer || synthMode === 'granular',
      variant,
      forge3Lens,
      forge3Field,
      activeVisibilityMask,
      traceVisibilityMask,
      showTraceLayer,
    });
  }, [spectralData, viewPort, showGrainLayer, synthMode, variant, forge3Lens, forge3Field, activeVisibilityMask, traceVisibilityMask, showTraceLayer]);

  const carrierAnchorMap = useMemo(() => {
    const map = new Map<string, CarrierAnchor>();
    if (!carrierDonorV2Skeleton) return map;
    for (const anchors of carrierDonorV2Skeleton.anchorsByTime) {
      for (const anchor of anchors) map.set(anchor.id, anchor);
    }
    return map;
  }, [carrierDonorV2Skeleton]);

  const carrierBindingMap = useMemo(() => {
    const map = new Map<string, AnchorBindingPreview>();
    for (const binding of carrierDonorV2BindingPreview) map.set(binding.carrierAnchorId, binding);
    return map;
  }, [carrierDonorV2BindingPreview]);

  const v2OverlayWarning = useMemo(() => {
    if (!showCarrierDonorV2Overlay) return '';
    if (carrierDonorV2Freshness.skeletonMeta.status === 'dirty') {
      return 'Carrier-Overlay zeigt noch die letzte Analyse – Aktualisierung läuft.';
    }
    if (showCarrierDonorV2BindingOverlay && carrierDonorV2Freshness.bindingMeta.status === 'dirty') {
      return 'Zuordnungsringe zeigen noch die letzte Zuordnung – Aktualisierung läuft.';
    }
    if (showCarrierDonorV2ContinuityOverlay && carrierDonorV2Freshness.continuityMeta.status === 'dirty') {
      return 'Kontinuitätslinien zeigen noch die letzte Carrier-Lesung – Aktualisierung läuft.';
    }
    return '';
  }, [
    showCarrierDonorV2Overlay,
    showCarrierDonorV2BindingOverlay,
    showCarrierDonorV2ContinuityOverlay,
    carrierDonorV2Freshness,
  ]);

  // Read the latest viewport for stamp-preview coordinate conversion without React-state lag.
  function screenToDataFromScreen(sx: number, sy: number): { x: number; y: number } {
    const vp = useStore.getState().viewPort;
    return {
      x: Math.floor(sx / vp.zoomX + vp.offsetX),
      y: Math.floor(sy / vp.zoomY + vp.offsetY),
    };
  }

  // Render overlay (playhead, grid, cursor, stamp preview) via pure canvas renderer.
  const renderOverlay = useCallback(() => {
    renderSpectralCanvasOverlay({
      canvas: overlayCanvasRef.current,
      viewPort,
      spectralData,
      activeTool,
      lineStart,
      toolSettings: safeToolSettings,
      stampPhase,
      stampSelStart,
      stampSelEnd: stampSelEndRef.current,
      stampData,
      stampScaleX,
      stampScaleY,
      stampRotation,
      stampFlipX,
      stampFlipY,
      mousePos: mousePosRef.current,
      guideDragMarkerIndex: guideDragRef.current?.markerIndex ?? null,
      guideLayout: getGuideLayout(),
      colorLut: colorLUTRef.current,
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
    });
  }, [viewPort, spectralData, activeTool, lineStart, safeToolSettings, stampPhase, stampSelStart, stampData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY, showGrainLayer, synthMode, getGuideLayout, showPlayheadMarker, isPlaying, playheadPosition, showCarrierDonorV2Overlay, showCarrierDonorV2ContinuityOverlay, showCarrierDonorV2BindingOverlay, carrierDonorV2Skeleton, carrierDonorV2ContinuityGraph, carrierAnchorMap, carrierBindingMap, v2OverlayWarning]);

  useSpectralCanvasRenderLifecycle({
    mainCanvasRef: canvasRef,
    spectralWidth: spectralData.width,
    viewPort,
    setViewPort,
    isPlaying,
    playheadPosition,
    renderVersion,
    renderMain: render,
    renderOverlay,
  });

  const { overviewWrapRef, overviewCanvasRef, onNavigatorMouseDown } = useSpectralCanvasNavigator({
    mainCanvasRef: canvasRef,
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
  });

  useSpectralCanvasResizeLifecycle({
    containerRef,
    mainCanvasRef: canvasRef,
    overlayCanvasRef,
    spectralWidth: spectralData.width,
    spectralHeight: spectralData.height,
    setViewPort,
    renderMain: render,
  });

  // Forge-3 sync keeps the body field aligned with the current workbench.
  // Ordinary workbench tools reseed local metadata from the visible field;
  // body-linked tools preserve their richer metadata but still scrub silent leftovers.
  const syncForge3Region = useCallback((x: number, y: number, radius: number, mode: 'reseed' | 'preserve' = 'reseed') => {
    if (variant !== 'forge3') return;
    forge3Field.syncRegionFromSpectralData(spectralData, x, y, radius, mode);
  }, [variant, forge3Field, spectralData]);

  const commitAudioEdit = useCallback((dirty?: SpectralCanvasDirtyEdit) => {
    commitSpectralCanvasAudioEdit({
      spectralData,
      activeTool,
      defaultBrushSize: safeToolSettings.brushSize ?? 1,
      dirty,
      ports: {
        invalidateAudioBuffer: () => audioEngine.invalidateBuffer(),
        setAudioBufferDirty,
        triggerRender,
      },
    });
  }, [activeTool, safeToolSettings.brushSize, spectralData, setAudioBufferDirty, triggerRender]);

  // Paint handler: dispatch is isolated from React gesture state; commit stays explicit.
  const handlePaint = useCallback((x: number, y: number) => {
    applySpectralCanvasPaintStroke({
      activeTool,
      spectralData,
      settings: safeToolSettings,
      forge3Mode: variant === 'forge3',
      bodyLinkedMode,
      sourceAsset,
      forge3Field,
      syncForge3Region,
      x,
      y,
    });
    commitAudioEdit({ x, y, radius: safeToolSettings.brushSize, reason: `spectral-forge-${activeTool}-paint` });
  }, [activeTool, bodyLinkedMode, forge3Field, sourceAsset, safeToolSettings, spectralData, syncForge3Region, commitAudioEdit, variant]);

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
        if (bodyLinkedMode) {
          forge3Field.pasteCapturedStampMetadata(spectralData, stampData, pos.x, pos.y, safeToolSettings.intensity, safeToolSettings.eraseMode, {
            scaleX: stampScaleX,
            scaleY: stampScaleY,
            rotation: stampRotation,
            flipX: stampFlipX,
            flipY: stampFlipY,
          });
          syncForge3Region(pos.x, pos.y, Math.max(stampData.width, stampData.height) * 0.6, 'preserve');
        } else {
          syncForge3Region(pos.x, pos.y, Math.max(stampData.width, stampData.height) * 0.6);
        }
        commitAudioEdit({
          x: pos.x,
          y: pos.y,
          radius: Math.max(stampData.width, stampData.height) * Math.max(stampScaleX, stampScaleY, 1) * 0.6,
          reason: 'spectral-forge-stamp-paste',
        });
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
        if (variant === 'forge3') syncForge3Region(pos.x, pos.y, brushSize);
        commitAudioEdit({
          x0: Math.min(lineStart.x, pos.x) - brushSize,
          x1: Math.max(lineStart.x, pos.x) + brushSize,
          y0: Math.min(lineStart.y, pos.y) - brushSize,
          y1: Math.max(lineStart.y, pos.y) + brushSize,
          reason: 'spectral-forge-line-edit',
        });
        setLineStart(null);
      }
      return;
    }

    if (activeTool === 'morph') {
      isPaintingRef.current = true;
      lastPosRef.current = pos;
      pushUndo();
      if (safeToolSettings.morphMode !== 'push') {
        if (variant === 'forge3' && sourceAsset) {
          forge3Field.applyMorph(spectralData, pos.x, pos.y, safeToolSettings.brushSize, safeToolSettings.intensity, safeToolSettings.morphMode, 0, 0);
          syncForge3Region(pos.x, pos.y, safeToolSettings.brushSize, 'preserve');
        } else {
          spectralData.applyMorph(pos.x, pos.y, safeToolSettings.brushSize, safeToolSettings.intensity, safeToolSettings.morphMode, 0, 0);
          if (variant === 'forge3') syncForge3Region(pos.x, pos.y, safeToolSettings.brushSize);
        }
        commitAudioEdit({ x: pos.x, y: pos.y, radius: safeToolSettings.brushSize, reason: 'spectral-forge-morph-edit' });
      }
      return;
    }

    if (activeTool === 'smudge') {
      isPaintingRef.current = true;
      lastPosRef.current = pos;
      pushUndo();
      spectralData.applySmudge(pos.x, pos.y, safeToolSettings.brushSize, safeToolSettings.intensity * 0.6, 0, 0, safeToolSettings.grainSize);
      if (variant === 'forge3') syncForge3Region(pos.x, pos.y, safeToolSettings.brushSize);
      commitAudioEdit({ x: pos.x, y: pos.y, radius: safeToolSettings.brushSize, reason: 'spectral-forge-smudge-edit' });
      return;
    }

    isPaintingRef.current = true;
    lastPosRef.current = pos;
    pushUndo();
    handlePaint(pos.x, pos.y);
  }, [screenToData, activeTool, bodyLinkedMode, lineStart, setLineStart, pushUndo, handlePaint, safeToolSettings, spectralData, commitAudioEdit, viewPort, stampPhase, stampData, stampScaleX, stampScaleY, stampRotation, stampFlipX, stampFlipY, setStampSelStart, setStampPhase, setStampData, detectGuideHandle, forge3Field, syncForge3Region, variant]);

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
    if (variant === 'forge3') {
      const description = forge3Field.describeCell(pos.x, pos.y);
      setForge3Hover(description ? `${forge3Lens === 'body' ? 'Körper' : forge3Lens === 'source' ? 'Quelle' : 'Hören'} · Klasse:${description.classLabel} · Quelle ${(description.sourceWeight * 100).toFixed(0)}% · t ${(description.sourceTime * 100).toFixed(0)} · b ${(description.sourceBand * 100).toFixed(0)}` : null);
    } else if (forge3Hover) {
      setForge3Hover(null);
    }

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
        if (bodyLinkedMode) {
          forge3Field.applyMorph(spectralData, pos.x, pos.y, brushSize, intensity, safeToolSettings.morphMode, dx, dy);
        } else {
          spectralData.applyMorph(pos.x, pos.y, brushSize, intensity, safeToolSettings.morphMode, dx, dy);
          if (variant === 'forge3') syncForge3Region(pos.x, pos.y, brushSize);
        }
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
            if (bodyLinkedMode && sourceAsset) forge3Field.applySourceTraceMetadata(spectralData, sourceAsset, px, py, brushSize, intensity, hardness, eraseMode);
          }
          syncForge3Region(pos.x, pos.y, brushSize);
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
        if (bodyLinkedMode) {
          for (let i = 0; i <= steps; i += stepStride) {
            const t = i / steps;
            const px = Math.round(last.x + ddx * t);
            const py = Math.round(last.y + ddy * t);
            forge3Field.applySteinmetz(spectralData, px, py, brushSize, intensity, eraseMode, grainSize);
          }
        } else {
          spectralData.drawLine(last.x, last.y, pos.x, pos.y, brushSize, intensity, 1.0, 'brush', eraseMode, sprayDensity, grainSize);
        }
      } else if (activeTool === 'spray') {
        spectralData.drawLine(last.x, last.y, pos.x, pos.y, brushSize, intensity, hardness, 'spray', eraseMode, sprayDensity, grainSize);
      } else {
        spectralData.drawLine(last.x, last.y, pos.x, pos.y, brushSize, intensity, hardness, 'brush', eraseMode, sprayDensity, grainSize);
      }

      if (variant === 'forge3') {
        const syncMode: 'reseed' | 'preserve' =
          (activeTool === 'morph' && bodyLinkedMode) ||
          (activeTool === 'sourceTrace' && bodyLinkedMode) ||
          (activeTool === 'hardBrush' && bodyLinkedMode)
            ? 'preserve'
            : 'reseed';
        syncForge3Region(pos.x, pos.y, brushSize, syncMode);
      }
      commitAudioEdit({
        x0: Math.min(last.x, pos.x) - brushSize,
        x1: Math.max(last.x, pos.x) + brushSize,
        y0: Math.min(last.y, pos.y) - brushSize,
        y1: Math.max(last.y, pos.y) + brushSize,
        reason: `spectral-forge-${activeTool}-drag`,
      });
    }
    lastPosRef.current = pos;
  }, [screenToData, viewPort, setViewPort, activeTool, bodyLinkedMode, sourceAsset, safeToolSettings, spectralData, commitAudioEdit, getGuideLayout, materialExport.guideSegments, setGuideMarker, forge3Field, syncForge3Region, variant, forge3Hover, forge3Lens]);

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
        if (bodyLinkedMode) forge3Field.captureStampMeta(x0, y0, w, h);
        const captured = safeToolSettings.eraseMode
          ? (() => {
              // Cut capture: remove selected content while capturing it for stamping.
              pushUndo();
              const cut = spectralData.cutRegion(x0, y0, w, h);
              if (bodyLinkedMode) forge3Field.excavateCapturedRegion(x0, y0, w, h);
              commitAudioEdit({ x0, x1: x0 + w, y0, y1: y0 + h, reason: 'spectral-forge-stamp-cut' });
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
  }, [activeTool, stampSelStart, spectralData, safeToolSettings.eraseMode, pushUndo, commitAudioEdit, setStampData, setStampScale, setStampPhase, setStampSelStart, screenToData, forge3Field, variant]);

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

  // Native wheel handler to properly prevent conflicts.
  // Wheel / two-finger gestures inside the canvas never drive viewport zoom here.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let pendingStampWheelDeltaPx = 0;
    let stampWheelFrame: number | null = null;

    const flushStampWheelScale = () => {
      stampWheelFrame = null;
      const deltaPx = Math.max(
        -STAMP_WHEEL_FRAME_DELTA_PX_MAX,
        Math.min(STAMP_WHEEL_FRAME_DELTA_PX_MAX, pendingStampWheelDeltaPx),
      );
      pendingStampWheelDeltaPx = 0;
      if (Math.abs(deltaPx) < 0.01) return;

      const state = useStore.getState();
      if (state.activeTool !== 'stamp' || state.stampPhase !== 'stamping') return;

      const scaleFactor = Math.exp(-deltaPx * STAMP_WHEEL_FACTOR_PER_PIXEL);
      state.setStampScale(
        clampStampWheelScale(state.stampScaleX * scaleFactor),
        clampStampWheelScale(state.stampScaleY * scaleFactor),
      );
    };

    const handleWheel = (e: WheelEvent) => {
      // Own the gesture inside the canvas before browser/page zoom or scroll can consume it.
      e.preventDefault();
      e.stopPropagation();

      const state = useStore.getState();

      if (state.activeTool === 'stamp' && state.stampPhase === 'stamping') {
        pendingStampWheelDeltaPx += normalizeStampWheelDeltaPx(e);
        if (stampWheelFrame === null) stampWheelFrame = window.requestAnimationFrame(flushStampWheelScale);
        return;
      }

      // Outside active stamping, SpectralForge keeps wheel/two-finger viewport zoom disabled here.
      // Horizontal view control belongs to the navigator bar below; this prevents accidental canvas zoom.
    };

    container.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => {
      container.removeEventListener('wheel', handleWheel, true);
      if (stampWheelFrame !== null) window.cancelAnimationFrame(stampWheelFrame);
    };
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

  return (
    <div className="grid flex-1 min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-black">
      <div className="relative min-h-[300px] overflow-hidden" ref={containerRef} style={{ touchAction: 'none', overscrollBehavior: 'contain' }}>
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
          style={{ cursor: 'none', touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
        />
        {/* Hover / status HUD */}
        <SpectralCanvasHoverInfo hoverInfo={hoverInfo} forge3Hover={forge3Hover} eraseMode={safeToolSettings.eraseMode} />
        <SpectralCanvasStatusBadges isPlaying={isPlaying} playheadPosition={playheadPosition} variant={variant} forge3Lens={forge3Lens} />
        <StampPhaseIndicator activeTool={activeTool} stampPhase={stampPhase} stampScaleX={stampScaleX} stampScaleY={stampScaleY} />
        <SpectralFrequencyLabels spectralHeight={spectralData.height} viewPort={viewPort} canvasHeight={canvasRef.current?.height} />
      </div>

      <SpectralNavigatorBar
        overviewWrapRef={overviewWrapRef}
        overviewCanvasRef={overviewCanvasRef}
        viewPort={viewPort}
        onNavigatorMouseDown={onNavigatorMouseDown}
      />
    </div>
  );
}
