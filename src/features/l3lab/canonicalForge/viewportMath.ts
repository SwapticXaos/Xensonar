import {
  DRUM_LANE_COLORS,
  DRUM_LANE_LABELS,
  composerChannelCount,
  countActiveDrumSteps,
  totalComposerSteps,
  type DrumComputerState,
  type DrumViewportState,
  type LoopComposerState,
} from "./loopDrumDomain";
import {
  clampDrumSegmentsPerBar,
  getDrumBarSegmentEdges,
  globalRatioToStepIndex,
  sanitizeDrumSegmentMarkers,
  stepIndexToGlobalRatio,
} from "../../xensonar/drumGrid";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function getLoopComposerViewport(state: LoopComposerState) {
  const totalSteps = totalComposerSteps(state);
  const visibleSteps = Math.max(8, Math.min(totalSteps, Math.round(totalSteps / Math.max(1, state.zoom))));
  const maxScroll = Math.max(0, totalSteps - visibleSteps);
  const scrollStart = Math.round(clamp01(state.scrollX) * maxScroll);
  return { totalSteps, visibleSteps, scrollStart, scrollEnd: scrollStart + visibleSteps };
}

export function getLoopComposerViewportWindow(state: LoopComposerState) {
  const { totalSteps, visibleSteps, scrollStart, scrollEnd } = getLoopComposerViewport(state);
  const safeTotal = Math.max(1, totalSteps);
  return {
    totalSteps,
    visibleSteps,
    scrollStart,
    scrollEnd,
    startRatio: scrollStart / safeTotal,
    endRatio: scrollEnd / safeTotal,
    widthRatio: Math.max(0.04, visibleSteps / safeTotal),
  };
}

export function applyLoopComposerViewportWindow(draft: LoopComposerState, startUnit: number, visibleUnits: number) {
  const totalUnits = totalComposerSteps(draft);
  const minVisible = Math.min(totalUnits, 8);
  const safeVisible = Math.max(minVisible, Math.min(totalUnits, visibleUnits));
  const maxScroll = Math.max(0, totalUnits - safeVisible);
  const safeStart = Math.max(0, Math.min(maxScroll, startUnit));
  draft.zoom = Math.min(12, Math.max(1, totalUnits / Math.max(minVisible || 1, safeVisible)));
  draft.scrollX = maxScroll > 0 ? clamp01(safeStart / maxScroll) : 0;
}

export function getLoopComposerVerticalViewport(state: LoopComposerState) {
  const totalLines = Math.max(1, composerChannelCount(state));
  const visibleLines = Math.max(8, Math.min(totalLines, Math.round(totalLines / Math.max(1, state.zoomY || 1))));
  const maxScroll = Math.max(0, totalLines - visibleLines);
  const scrollStart = Math.round(clamp01(state.scrollY || 0) * maxScroll);
  return { totalLines, visibleLines, scrollStart, scrollEnd: scrollStart + visibleLines };
}

export function getLoopComposerVerticalViewportWindow(state: LoopComposerState) {
  const { totalLines, visibleLines, scrollStart, scrollEnd } = getLoopComposerVerticalViewport(state);
  const safeTotal = Math.max(1, totalLines);
  return {
    totalLines,
    visibleLines,
    scrollStart,
    scrollEnd,
    startRatio: Math.max(0, 1 - (scrollEnd / safeTotal)),
    endRatio: Math.max(0, 1 - (scrollStart / safeTotal)),
    heightRatio: Math.max(0.08, visibleLines / safeTotal),
  };
}

export function applyLoopComposerVerticalViewportWindow(draft: LoopComposerState, startLine: number, visibleLines: number) {
  const totalLines = Math.max(1, composerChannelCount(draft));
  const minVisible = Math.min(totalLines, 8);
  const safeVisible = Math.max(minVisible, Math.min(totalLines, visibleLines));
  const maxScroll = Math.max(0, totalLines - safeVisible);
  const safeStart = Math.max(0, Math.min(maxScroll, startLine));
  draft.zoomY = Math.min(12, Math.max(1, totalLines / Math.max(minVisible || 1, safeVisible)));
  draft.scrollY = maxScroll > 0 ? clamp01(safeStart / maxScroll) : 0;
}

export type DrumCanvasGeometry = {
  headerH: number;
  labelW: number;
  rowH: number;
  rows: number;
  totalSteps: number;
  timelineW: number;
  width: number;
  height: number;
  viewStartRatio: number;
  viewEndRatio: number;
  viewSpan: number;
};

export function getDrumViewportMinSpan(totalSteps: number) {
  return Math.max(0.035, Math.min(1, 10 / Math.max(1, totalSteps)));
}

export function sanitizeDrumViewport(viewport: DrumViewportState | undefined, totalSteps: number): DrumViewportState {
  const minSpan = getDrumViewportMinSpan(totalSteps);
  const fallback = { startRatio: 0, endRatio: 1 };
  if (!viewport) return fallback;
  let startRatio = clamp01(Number.isFinite(viewport.startRatio) ? viewport.startRatio : 0);
  let endRatio = clamp01(Number.isFinite(viewport.endRatio) ? viewport.endRatio : 1);
  if (endRatio - startRatio < minSpan) {
    const center = (startRatio + endRatio) * 0.5;
    startRatio = center - minSpan * 0.5;
    endRatio = center + minSpan * 0.5;
  }
  if (startRatio < 0) {
    endRatio = Math.min(1, endRatio - startRatio);
    startRatio = 0;
  }
  if (endRatio > 1) {
    startRatio = Math.max(0, startRatio - (endRatio - 1));
    endRatio = 1;
  }
  if (endRatio - startRatio < minSpan) {
    endRatio = Math.min(1, startRatio + minSpan);
    startRatio = Math.max(0, endRatio - minSpan);
  }
  return { startRatio, endRatio };
}

export function setDrumViewportStart(viewport: DrumViewportState, nextStartRatio: number, totalSteps: number) {
  const safe = sanitizeDrumViewport(viewport, totalSteps);
  const minSpan = getDrumViewportMinSpan(totalSteps);
  const startRatio = Math.max(0, Math.min(safe.endRatio - minSpan, nextStartRatio));
  return sanitizeDrumViewport({ startRatio, endRatio: safe.endRatio }, totalSteps);
}

export function setDrumViewportEnd(viewport: DrumViewportState, nextEndRatio: number, totalSteps: number) {
  const safe = sanitizeDrumViewport(viewport, totalSteps);
  const minSpan = getDrumViewportMinSpan(totalSteps);
  const endRatio = Math.min(1, Math.max(safe.startRatio + minSpan, nextEndRatio));
  return sanitizeDrumViewport({ startRatio: safe.startRatio, endRatio }, totalSteps);
}

export function panDrumViewport(viewport: DrumViewportState, deltaRatio: number, totalSteps: number) {
  const safe = sanitizeDrumViewport(viewport, totalSteps);
  const span = safe.endRatio - safe.startRatio;
  let startRatio = safe.startRatio + deltaRatio;
  let endRatio = safe.endRatio + deltaRatio;
  if (startRatio < 0) {
    endRatio -= startRatio;
    startRatio = 0;
  }
  if (endRatio > 1) {
    startRatio -= endRatio - 1;
    endRatio = 1;
  }
  if (endRatio - startRatio !== span) {
    endRatio = Math.min(1, startRatio + span);
    startRatio = Math.max(0, endRatio - span);
  }
  return sanitizeDrumViewport({ startRatio, endRatio }, totalSteps);
}

export function zoomDrumViewport(viewport: DrumViewportState, factor: number, anchorRatio: number, totalSteps: number) {
  const safe = sanitizeDrumViewport(viewport, totalSteps);
  const minSpan = getDrumViewportMinSpan(totalSteps);
  const span = safe.endRatio - safe.startRatio;
  const nextSpan = Math.max(minSpan, Math.min(1, span * factor));
  const anchor = clamp01(anchorRatio);
  const localAnchor = span > 0 ? (anchor - safe.startRatio) / span : 0.5;
  let startRatio = anchor - localAnchor * nextSpan;
  let endRatio = startRatio + nextSpan;
  if (startRatio < 0) {
    endRatio -= startRatio;
    startRatio = 0;
  }
  if (endRatio > 1) {
    startRatio -= endRatio - 1;
    endRatio = 1;
  }
  return sanitizeDrumViewport({ startRatio, endRatio }, totalSteps);
}

export function getDrumCanvasGeometry(canvas: HTMLCanvasElement | { width: number; height: number }, drumComputer: DrumComputerState, viewport: DrumViewportState): DrumCanvasGeometry {
  const width = canvas.width;
  const height = canvas.height;
  const headerH = 34;
  const labelW = 96;
  const rows = Math.max(1, drumComputer.laneOrder.length);
  const rowH = (height - headerH) / rows;
  const safeViewport = sanitizeDrumViewport(viewport, drumComputer.stepCount);
  return {
    headerH,
    labelW,
    rowH,
    rows,
    totalSteps: Math.max(1, drumComputer.stepCount),
    timelineW: Math.max(1, width - labelW),
    width,
    height,
    viewStartRatio: safeViewport.startRatio,
    viewEndRatio: safeViewport.endRatio,
    viewSpan: Math.max(1e-6, safeViewport.endRatio - safeViewport.startRatio),
  };
}

export function drumCanvasGlobalRatioToX(geometry: DrumCanvasGeometry, ratio: number) {
  const localRatio = (Math.max(0, Math.min(1, ratio)) - geometry.viewStartRatio) / geometry.viewSpan;
  return geometry.labelW + localRatio * geometry.timelineW;
}

export function drumCanvasXToGlobalRatio(geometry: DrumCanvasGeometry, x: number) {
  const localRatio = (x - geometry.labelW) / Math.max(1, geometry.timelineW);
  return clamp01(geometry.viewStartRatio + localRatio * geometry.viewSpan);
}

export function findDrumMarkerIndexAtPosition(localRatio: number, drumComputer: DrumComputerState, toleranceRatio = 0.018) {
  const markers = sanitizeDrumSegmentMarkers(drumComputer.segmentMarkers, drumComputer.segmentsPerBar);
  if (!markers.length) return null;
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  markers.forEach((marker, index) => {
    const distance = Math.abs(localRatio - marker);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestDistance <= toleranceRatio ? bestIndex : null;
}

function drawDownwardSegmentHandle(
  ctx: CanvasRenderingContext2D,
  x: number,
  tipY: number,
  options: {
    width?: number;
    height?: number;
    fillStyle?: string;
    strokeStyle?: string;
    lineWidth?: number;
  } = {},
) {
  const width = options.width ?? 14;
  const height = options.height ?? 10;
  const halfWidth = width / 2;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, tipY);
  ctx.lineTo(x - halfWidth, tipY - height);
  ctx.lineTo(x + halfWidth, tipY - height);
  ctx.closePath();
  ctx.fillStyle = options.fillStyle ?? 'rgba(103,232,249,0.86)';
  ctx.fill();
  if (options.strokeStyle) {
    ctx.lineWidth = options.lineWidth ?? 1;
    ctx.strokeStyle = options.strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDrumComputerCanvas(
  ctx: CanvasRenderingContext2D,
  drumComputer: DrumComputerState,
  options: { playheadRatio?: number | null; markerDragIndex?: number | null; viewport?: DrumViewportState } = {},
) {
  const geometry = getDrumCanvasGeometry(ctx.canvas, drumComputer, options.viewport ?? { startRatio: 0, endRatio: 1 });
  const { width, height, headerH, labelW, rowH, totalSteps, timelineW, viewStartRatio, viewEndRatio } = geometry;
  const safeBars = Math.max(1, drumComputer.bars);
  const safeSegments = clampDrumSegmentsPerBar(drumComputer.segmentsPerBar || 16);
  const markers = sanitizeDrumSegmentMarkers(drumComputer.segmentMarkers, safeSegments);
  const barEdges = getDrumBarSegmentEdges(safeSegments, markers);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#04070f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, labelW, height);
  ctx.fillStyle = 'rgba(236,254,255,0.86)';
  ctx.font = '11px ui-sans-serif, system-ui';
  ctx.fillText(`Drum Machine · ${drumComputer.useCustom ? 'Custom Grid' : 'Preset im Grid'} · ${countActiveDrumSteps(drumComputer)} Hits`, 10, 15);
  ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText(`${safeBars} Takte · ${safeSegments} Segmente/Takt · Sicht ${(viewStartRatio * 100).toFixed(0)}–${(viewEndRatio * 100).toFixed(0)} %`, 10, 28);

  for (let bar = 0; bar <= safeBars; bar += 1) {
    const ratio = bar / safeBars;
    const x = drumCanvasGlobalRatioToX(geometry, ratio);
    if (x < labelW - 2 || x > width + 2) continue;
    ctx.strokeStyle = bar === 0 || bar === safeBars ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.34)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, headerH - 2);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
    if (bar < safeBars && x < width - 18) {
      ctx.fillStyle = 'rgba(103,232,249,0.82)';
      ctx.fillText(`${bar + 1}`, Math.max(labelW + 4, x + 6), headerH - 12);
    }
  }

  for (let bar = 0; bar < safeBars; bar += 1) {
    barEdges.forEach((edge, index) => {
      const ratio = (bar + edge) / safeBars;
      const x = drumCanvasGlobalRatioToX(geometry, ratio);
      if (x < labelW - 10 || x > width + 10) return;
      if (index > 0 && index < barEdges.length - 1) {
        ctx.strokeStyle = 'rgba(148,163,184,0.22)';
        ctx.beginPath();
        ctx.moveTo(x + 0.5, headerH);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
        const isActiveMarker = options.markerDragIndex === index - 1;
        drawDownwardSegmentHandle(ctx, x, headerH - 1, {
          width: 16,
          height: 12,
          fillStyle: isActiveMarker ? 'rgba(103,232,249,0.98)' : 'rgba(103,232,249,0.84)',
          strokeStyle: isActiveMarker ? 'rgba(236,254,255,0.92)' : 'rgba(12,18,32,0.58)',
          lineWidth: isActiveMarker ? 1.2 : 1,
        });
      }
    });
  }

  drumComputer.laneOrder.forEach((laneId, rowIndex) => {
    const y = headerH + rowIndex * rowH;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(DRUM_LANE_LABELS[laneId], 10, y + rowH * 0.62);
    ctx.fillStyle = rowIndex % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.02)';
    ctx.fillRect(labelW, y, timelineW, rowH);
    ctx.strokeStyle = 'rgba(148,163,184,0.14)';
    ctx.beginPath();
    ctx.moveTo(labelW, y + rowH - 0.5);
    ctx.lineTo(width, y + rowH - 0.5);
    ctx.stroke();
    for (let step = 0; step < totalSteps; step += 1) {
      const startRatio = stepIndexToGlobalRatio(step, safeBars, safeSegments, markers, 'start');
      const endRatio = stepIndexToGlobalRatio(step, safeBars, safeSegments, markers, 'end');
      if (endRatio < viewStartRatio || startRatio > viewEndRatio) continue;
      const centerRatio = stepIndexToGlobalRatio(step, safeBars, safeSegments, markers, 'center');
      const xStart = drumCanvasGlobalRatioToX(geometry, startRatio);
      const xEnd = drumCanvasGlobalRatioToX(geometry, endRatio);
      const xCenter = drumCanvasGlobalRatioToX(geometry, centerRatio);
      const slotW = Math.max(4, xEnd - xStart);
      const value = drumComputer.laneSteps[laneId]?.[step] ?? 0;
      if (value > 0) {
        const alpha = value >= 0.95 ? 0.98 : value >= 0.8 ? 0.84 : 0.62;
        ctx.fillStyle = `${DRUM_LANE_COLORS[laneId]}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        const hitW = Math.max(6, Math.min(Math.max(6, slotW - 4), slotW * (value >= 0.95 ? 0.82 : value >= 0.8 ? 0.7 : 0.56)));
        const hitH = Math.max(8, rowH * (value >= 0.95 ? 0.6 : value >= 0.8 ? 0.5 : 0.42));
        const left = xCenter - hitW * 0.5;
        const top = y + (rowH - hitH) * 0.5;
        ctx.beginPath();
        ctx.roundRect(left, top, hitW, hitH, Math.min(8, hitH * 0.32));
        ctx.fill();
      }
    }
  });

  if (options.playheadRatio != null && Number.isFinite(options.playheadRatio)) {
    const ratio = clamp01(options.playheadRatio);
    if (ratio >= viewStartRatio && ratio <= viewEndRatio) {
      const x = drumCanvasGlobalRatioToX(geometry, ratio);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x - 1.25, headerH, 2.5, height - headerH);
    }
  }

  ctx.fillStyle = 'rgba(148,163,184,0.62)';
  ctx.font = '10px ui-sans-serif, system-ui';
  for (let step = 0; step < totalSteps; step += 1) {
    const startRatio = stepIndexToGlobalRatio(step, safeBars, safeSegments, markers, 'start');
    const endRatio = stepIndexToGlobalRatio(step, safeBars, safeSegments, markers, 'end');
    if (endRatio < viewStartRatio || startRatio > viewEndRatio) continue;
    const centerRatio = stepIndexToGlobalRatio(step, safeBars, safeSegments, markers, 'center');
    const x = drumCanvasGlobalRatioToX(geometry, centerRatio);
    if (x < labelW + 8 || x > width - 8) continue;
    const localIndex = step % safeSegments;
    ctx.fillText(String(localIndex + 1), x - 3, height - 6);
  }
}

export function hitDrumComputerCanvas(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number },
  drumComputer: DrumComputerState,
  viewport: DrumViewportState,
) {
  const rect = canvas.getBoundingClientRect();
  const px = (event.clientX - rect.left) / Math.max(1, rect.width);
  const py = (event.clientY - rect.top) / Math.max(1, rect.height);
  const geometry = getDrumCanvasGeometry(canvas, drumComputer, viewport);
  const x = px * geometry.width;
  const y = py * geometry.height;
  const safeBars = Math.max(1, drumComputer.bars);
  const safeSegments = clampDrumSegmentsPerBar(drumComputer.segmentsPerBar || 16);
  if (x < geometry.labelW) return null;
  const globalRatio = drumCanvasXToGlobalRatio(geometry, x);
  const barFloat = globalRatio * safeBars;
  const localRatio = barFloat - Math.floor(barFloat);
  if (y < geometry.headerH) {
    const markerIndex = findDrumMarkerIndexAtPosition(localRatio, drumComputer, 12 / Math.max(1, geometry.timelineW / safeBars));
    if (markerIndex == null) return null;
    return { kind: 'marker' as const, markerIndex, localRatio };
  }
  const rowIndex = Math.max(0, Math.min(geometry.rows - 1, Math.floor((y - geometry.headerH) / Math.max(1, geometry.rowH))));
  return {
    kind: 'step' as const,
    laneId: drumComputer.laneOrder[rowIndex],
    step: globalRatioToStepIndex(globalRatio, safeBars, safeSegments, drumComputer.segmentMarkers),
  };
}
