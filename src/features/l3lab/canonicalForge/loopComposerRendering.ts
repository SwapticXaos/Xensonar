import {
  LOOP_COMPOSER_GUTTER_W,
  LOOP_COMPOSER_HEADER_H,
  canonicalLoopNoteOctaveOffset,
  buildLoopLineLayout,
  composerChannelCount,
  composerTrackById,
  getLoopNoteScreenRect,
  getLoopTimeGuides,
  isLoopEditableFragmentCutMarker,
  loopLineDisplayLabel,
  loopUnitToLabel,
  noteChannelIndex,
  noteDurationUnits,
  noteFadeInUnits,
  noteFadeOutUnits,
  noteStartUnit,
  resolveLoopNoteSampleId,
  loopUnitsPerBeat,
  type LoopComposerState,
  type LoopGhostNote,
  type LoopNoteEvent,
  type LoopNoteSelectionBox,
} from './loopDrumDomain';
import { getLoopComposerViewport } from './viewportMath';
import { isMaterialImportBody, isFragmentableLoopImportBody, loopImportBodyFamily } from './loopImportExportContracts';
import type { MelodicSampleAmplitudePreview } from './melodicSampleAmplitudePreview';


function materialElasticVisualInfo(state: LoopComposerState, note: LoopNoteEvent) {
  if (!isMaterialImportBody(note)) return null;
  const channelIndex = noteChannelIndex(state, note);
  const line = state.pitchLines?.[channelIndex];
  const step = state.pitchSteps[channelIndex] ?? state.pitchSteps[0];
  const baseHz = Math.max(30, Math.min(1200, Number.isFinite(state.baseHz) ? state.baseHz : 220));
  const lineHz = line?.hz ?? (baseHz * (step?.ratio ?? 1));
  const cents = ((line?.offsetCents ?? step?.offsetCents ?? 0)) / 1200;
  const octave = canonicalLoopNoteOctaveOffset(note);
  const repetitionRatio = state.repetitionModel === 'tritave' ? 3 : 2;
  const targetHz = lineHz * Math.pow(repetitionRatio, octave) * Math.pow(2, cents);
  const sourceFixed = (note as any).materialPitchMode === 'source-fixed';
  const anchorHz = sourceFixed
    ? targetHz
    : Number.isFinite((note as any).anchorHz) ? Math.max(1, Number((note as any).anchorHz)) : targetHz;
  const desiredRate = targetHz / Math.max(1, anchorHz);
  const pitchDistanceFromAnchorCents = sourceFixed ? Number.POSITIVE_INFINITY : Math.abs(1200 * Math.log2(Math.max(0.000001, desiredRate)));
  return {
    effectiveHz: targetHz,
    sourceFixed,
    rawAnchorPosition: !sourceFixed && note.pendingPitchAnchor !== true && pitchDistanceFromAnchorCents <= 6,
  };
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.max(0, Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function noteAmplitudeAt(args: {
  preview: MelodicSampleAmplitudePreview | null;
  note: LoopNoteEvent;
  progress: number;
  fadeInRatio: number;
  fadeOutRatio: number;
}) {
  const progress = Math.max(0, Math.min(1, args.progress));
  let sourceAmplitude = 0.72;
  if (args.preview?.peaks?.length) {
    const sourceDuration = Math.max(0.001, args.preview.durationSec);
    const offsetSec = Math.max(0, Math.min(sourceDuration, Number.isFinite(args.note.sampleOffsetSec ?? NaN) ? Number(args.note.sampleOffsetSec) : 0));
    const availableDuration = Math.max(0.001, sourceDuration - offsetSec);
    const requestedDuration = Number.isFinite(args.note.samplePlaybackDurationSec ?? NaN)
      ? Math.max(0.001, Number(args.note.samplePlaybackDurationSec))
      : availableDuration;
    const segmentDuration = Math.min(availableDuration, requestedDuration);
    const sourceRatio = Math.max(0, Math.min(1, (offsetSec + progress * segmentDuration) / sourceDuration));
    const peakIndex = Math.max(0, Math.min(args.preview.peaks.length - 1, Math.round(sourceRatio * Math.max(0, args.preview.peaks.length - 1))));
    sourceAmplitude = Math.pow(Math.max(0, Math.min(1, args.preview.peaks[peakIndex] ?? 0)), 0.62);
  }
  const velocity = Math.max(0, Math.min(1, Number.isFinite(args.note.velocity) ? args.note.velocity : 0.72));
  const fadeInGain = args.fadeInRatio > 0 ? Math.min(1, progress / args.fadeInRatio) : 1;
  const fadeOutGain = args.fadeOutRatio > 0 ? Math.min(1, (1 - progress) / args.fadeOutRatio) : 1;
  return Math.max(0, Math.min(1, sourceAmplitude * velocity * fadeInGain * fadeOutGain));
}

function drawNoteAmplitudeThumbnail(ctx: CanvasRenderingContext2D, args: {
  note: LoopNoteEvent;
  preview: MelodicSampleAmplitudePreview | null;
  x: number;
  y: number;
  width: number;
  height: number;
  fadeInWidth: number;
  fadeOutWidth: number;
  muted: boolean;
}) {
  if (args.width < 8 || args.height < 6) return;
  const insetX = 2;
  const usableWidth = Math.max(2, args.width - insetX * 2);
  const midY = args.y + args.height * 0.5;
  const amplitudeHeight = Math.max(2.5, args.height * 0.43);
  const pointCount = Math.max(8, Math.min(72, Math.floor(usableWidth / 2)));
  const fadeInRatio = Math.max(0, Math.min(1, args.fadeInWidth / Math.max(1, args.width)));
  const fadeOutRatio = Math.max(0, Math.min(1, args.fadeOutWidth / Math.max(1, args.width)));
  const points: Array<{ x: number; amp: number }> = [];
  for (let index = 0; index < pointCount; index += 1) {
    const progress = pointCount <= 1 ? 0 : index / (pointCount - 1);
    points.push({
      x: args.x + insetX + progress * usableWidth,
      amp: noteAmplitudeAt({ preview: args.preview, note: args.note, progress, fadeInRatio, fadeOutRatio }),
    });
  }
  ctx.save();
  roundedRectPath(ctx, args.x + 1, args.y + 1, Math.max(1, args.width - 2), Math.max(1, args.height - 2), Math.min(3.5, args.height * 0.22));
  ctx.clip();
  ctx.beginPath();
  points.forEach((point, index) => {
    const py = midY - point.amp * amplitudeHeight;
    if (index === 0) ctx.moveTo(point.x, py); else ctx.lineTo(point.x, py);
  });
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    ctx.lineTo(point.x, midY + point.amp * amplitudeHeight);
  }
  ctx.closePath();
  ctx.fillStyle = args.muted ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.38)';
  ctx.fill();
  ctx.strokeStyle = args.muted ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 1.05;
  ctx.stroke();
  ctx.restore();
}

export function drawGrooveGrid(
  ctx: CanvasRenderingContext2D,
  options: {
    steps?: number;
    rows?: number;
    bars?: number;
    exportBars?: number;
    drumPattern?: string;
    bassPattern?: string;
    showGrid?: boolean;
  } = {},
) {
  const { steps = 16, rows = 3, bars = 4, exportBars = 4, drumPattern = '', bassPattern = '', showGrid = true } = options;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, width, height);
  const rowH = height / rows;
  const safeBars = Math.max(1, bars);
  const stepsPerBar = Math.max(1, steps / safeBars);
  for (let row = 0; row < rows; row++) {
    for (let step = 0; step < steps; step++) {
      const x = (step / steps) * width;
      const y = row * rowH;
      const barBoundary = step % Math.max(1, Math.round(stepsPerBar)) === 0;
      const strongBeat = step % 4 === 0;
      ctx.strokeStyle = barBoundary
        ? 'rgba(34,211,238,0.42)'
        : strongBeat
          ? 'rgba(34,211,238,0.22)'
          : 'rgba(148,163,184,0.14)';
      ctx.strokeRect(x + 0.5, y + 0.5, width / steps - 1, rowH - 1);
    }
  }
  if (showGrid) {
    ctx.fillStyle = 'rgba(236,254,255,0.82)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Kick / Snare / Bass', 10, 14);
    ctx.fillStyle = 'rgba(34,211,238,0.86)';
    ctx.fillText(`${safeBars} Raster-Takte · Export ${exportBars} · ${drumPattern} · ${bassPattern}`, 10, height - 8);
  } else {
    ctx.fillStyle = 'rgba(148,163,184,0.66)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Raster verborgen – Interpretation bleibt aktiv', 10, 14);
  }
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

export function drawLoopComposerCanvas(
  ctx: CanvasRenderingContext2D,
  state: LoopComposerState,
  options: {
    selectedTrackId?: string;
    selectedNoteId?: string | null;
    selectedNoteIds?: string[];
    hoverChannelIndex?: number | null;
    hoverGridUnit?: number | null;
    playheadStep?: number | null;
    drumPattern?: string;
    exportBars?: number;
    selectionBox?: LoopNoteSelectionBox | null;
    ghostNotes?: LoopGhostNote[];
    materialGuideHighlightActive?: boolean;
    animationTimeMs?: number;
    sampleAmplitudePreviews?: ReadonlyMap<string, MelodicSampleAmplitudePreview>;
  } = {},
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, width, height);
  const gutterW = LOOP_COMPOSER_GUTTER_W;
  const headerH = LOOP_COMPOSER_HEADER_H;
  const lineCount = composerChannelCount(state);
  const { visibleSteps, scrollStart } = getLoopComposerViewport(state);
  const cellW = (width - gutterW) / Math.max(1, visibleSteps);
  const lineLayout = buildLoopLineLayout(state, height, headerH);

  ctx.fillStyle = 'rgba(148,163,184,0.72)';
  ctx.font = '11px sans-serif';
  ctx.fillText('Tonlinien / Zeit', 12, 17);
  if (options.drumPattern) {
    ctx.fillStyle = 'rgba(34,211,238,0.84)';
    ctx.fillText(`Groove · ${options.drumPattern} · Export ${options.exportBars ?? state.bars} T`, 12, 33);
  }
  ctx.fillStyle = 'rgba(99,102,241,0.46)';
  const repetitionHint = state.repetitionModel === 'tritave' ? 'Tritave' : 'Oktave';
  ctx.fillText(`Hz-Feld zuerst · Raster-Preset ${state.tuning} · Wiederholung ${repetitionHint}`, 12, 47);

  const guides = getLoopTimeGuides(state);
  const barMarkers = guides.filter((marker) => marker.kind === 'bar');
  const softMarkers = guides.filter((marker) => marker.kind === 'guide');
  const materialGuideHighlightActive = options.materialGuideHighlightActive === true;

  ctx.fillStyle = 'rgba(5,8,20,0.92)';
  ctx.fillRect(gutterW, lineLayout.bodyTop, width - gutterW, Math.max(1, lineLayout.bodyBottom - lineLayout.bodyTop));

  for (const marker of [...barMarkers, ...softMarkers]) {
    const unit = marker.beat * loopUnitsPerBeat(state);
    if (unit < scrollStart - 0.001 || unit > scrollStart + visibleSteps + 0.001) continue;
    const x = gutterW + (unit - scrollStart) * cellW;
    const isBar = marker.kind === 'bar';
    ctx.save();
    ctx.lineWidth = isBar ? 1.15 : 0.9;
    ctx.strokeStyle = isBar ? 'rgba(34,211,238,0.22)' : 'rgba(250,204,21,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, headerH - (isBar ? 8 : 0));
    ctx.lineTo(x + 0.5, lineLayout.bodyTop);
    ctx.stroke();
    ctx.strokeStyle = isBar ? 'rgba(34,211,238,0.22)' : 'rgba(250,204,21,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, lineLayout.bodyTop);
    ctx.lineTo(x + 0.5, lineLayout.bodyBottom);
    ctx.stroke();
    ctx.restore();
    if (isBar) {
      ctx.fillStyle = materialGuideHighlightActive && isLoopEditableFragmentCutMarker(state, marker)
        ? 'rgba(244,114,182,0.92)'
        : 'rgba(103,232,249,0.86)';
      ctx.fillText(loopUnitToLabel(state, unit), x + 4, 16);
      if (!(materialGuideHighlightActive && isLoopEditableFragmentCutMarker(state, marker))) {
        continue;
      }
    }
    if (!isBar && Math.abs(unit - Math.round(unit)) < 0.001) {
      ctx.fillStyle = 'rgba(203,213,225,0.56)';
      ctx.fillText(loopUnitToLabel(state, unit), x + 4, 16);
    }
    drawDownwardSegmentHandle(ctx, x, headerH - 1, {
      width: 18,
      height: 12,
      fillStyle: materialGuideHighlightActive
        ? (marker.muted ? 'rgba(244,114,182,0.32)' : 'rgba(244,114,182,0.9)')
        : (marker.muted ? 'rgba(103,232,249,0.3)' : 'rgba(103,232,249,0.88)'),
      strokeStyle: materialGuideHighlightActive
        ? (marker.muted ? 'rgba(76,5,25,0.4)' : 'rgba(131,24,67,0.7)')
        : (marker.muted ? 'rgba(8,15,30,0.45)' : 'rgba(12,18,32,0.62)'),
      lineWidth: 1,
    });
  }

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const line = state.pitchLines[lineIndex] ?? null;
    const y = lineLayout.lineYs[lineIndex] ?? lineLayout.bodyTop;
    ctx.strokeStyle = line?.muted ? 'rgba(113,113,122,0.22)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
    const pointX = gutterW - 8;
    const baseX = gutterW - 22;
    const halfH = 7;
    ctx.beginPath();
    ctx.moveTo(pointX, y);
    ctx.lineTo(baseX, y - halfH);
    ctx.lineTo(baseX, y + halfH);
    ctx.closePath();
    ctx.fillStyle = line?.muted ? 'rgba(113,113,122,0.45)' : 'rgba(125,211,252,0.95)';
    ctx.fill();
    ctx.fillStyle = line?.muted ? 'rgba(113,113,122,0.72)' : 'rgba(226,232,240,0.92)';
    ctx.font = '12px sans-serif';
    if (line) {
      ctx.fillText(loopLineDisplayLabel(line), 12, y - 6);
      if ((line.offsetCents ?? 0) !== 0) {
        ctx.fillStyle = 'rgba(125,211,252,0.78)';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${(line.offsetCents ?? 0) > 0 ? '+' : ''}${Math.round(line.offsetCents ?? 0)}c`, 12, y + 10);
      }
    }
  }

  const activeNotes = state.notes.filter((note) => state.activeTrackIds.includes(note.trackId));

  const drawNoteBlock = (note: LoopNoteEvent, dashed = false) => {
    const lineIndex = noteChannelIndex(state, note);
    if (lineIndex < 0 || lineIndex >= lineCount) return;
    const noteStart = noteStartUnit(state, note);
    const noteEnd = noteStart + noteDurationUnits(state, note);
    if (noteEnd < scrollStart || noteStart > scrollStart + visibleSteps) return;
    const track = composerTrackById(state, note.trackId);
    const rect = getLoopNoteScreenRect(state, note, lineLayout, { gutterW, cellW, scrollStart, visibleSteps });
    const { x, w, y, noteH, handleW } = rect;
    if (dashed) {
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = track.color;
      roundedRectPath(ctx, x + 0.5, y + 0.5, Math.max(2, w - 1), Math.max(2, noteH - 1), Math.min(3.5, noteH * 0.22));
      ctx.stroke();
      ctx.restore();
      return;
    }
    const selected = note.id === options.selectedNoteId || Boolean(options.selectedNoteIds?.includes(note.id));
    const pendingPitchAnchor = note.pendingPitchAnchor === true;
    const materialInfo = materialElasticVisualInfo(state, note);
    if (materialInfo?.rawAnchorPosition && loopImportBodyFamily(note) === 'material') {
      const lineY = lineLayout.lineYs[lineIndex] ?? (y + noteH / 2);
      const contactLength = Math.max(6, Math.min(10, noteH * 0.62));
      const fadeLength = Math.max(12, Math.min(22, noteH * 1.35));
      const leftCoreStart = Math.max(gutterW, x - contactLength);
      const leftFadeStart = Math.max(gutterW, leftCoreStart - fadeLength);
      const rightCoreEnd = Math.min(width, x + w + contactLength);
      const rightFadeEnd = Math.min(width, rightCoreEnd + fadeLength);
      ctx.save();
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(52,211,153,0.96)';
      ctx.beginPath();
      ctx.moveTo(leftCoreStart, lineY + 0.5);
      ctx.lineTo(Math.max(gutterW, x - 1.5), lineY + 0.5);
      ctx.moveTo(Math.min(width, x + w + 1.5), lineY + 0.5);
      ctx.lineTo(rightCoreEnd, lineY + 0.5);
      ctx.stroke();
      if (leftFadeStart < leftCoreStart) {
        const leftFade = ctx.createLinearGradient(leftFadeStart, 0, leftCoreStart, 0);
        leftFade.addColorStop(0, 'rgba(52,211,153,0)');
        leftFade.addColorStop(1, 'rgba(52,211,153,0.68)');
        ctx.strokeStyle = leftFade;
        ctx.beginPath();
        ctx.moveTo(leftFadeStart, lineY + 0.5);
        ctx.lineTo(leftCoreStart, lineY + 0.5);
        ctx.stroke();
      }
      if (rightCoreEnd < rightFadeEnd) {
        const rightFade = ctx.createLinearGradient(rightCoreEnd, 0, rightFadeEnd, 0);
        rightFade.addColorStop(0, 'rgba(52,211,153,0.68)');
        rightFade.addColorStop(1, 'rgba(52,211,153,0)');
        ctx.strokeStyle = rightFade;
        ctx.beginPath();
        ctx.moveTo(rightCoreEnd, lineY + 0.5);
        ctx.lineTo(rightFadeEnd, lineY + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    if (pendingPitchAnchor) {
      const phase = 0.5 + 0.5 * Math.sin((options.animationTimeMs ?? 0) / 170);
      ctx.globalAlpha = 0.38 + phase * 0.62;
      ctx.shadowColor = track.color;
      ctx.shadowBlur = 8 + phase * 14;
    }
    const blockX = x + 0.5;
    const blockW = Math.max(4, w - 1);
    const trackMuted = !track.enabled;
    const blockRadius = Math.min(4, Math.max(2, noteH * 0.2));
    ctx.fillStyle = trackMuted
      ? 'rgba(82, 82, 91, 0.52)'
      : track.color + (track.id === options.selectedTrackId ? 'dd' : '99');
    roundedRectPath(ctx, blockX, y, blockW, noteH, blockRadius);
    ctx.fill();
    ctx.save();
    roundedRectPath(ctx, blockX + 1, y + 1, Math.max(1, blockW - 2), Math.max(1, noteH - 2), Math.max(1, blockRadius - 1));
    ctx.clip();
    ctx.fillStyle = trackMuted ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.10)';
    ctx.fillRect(blockX + 1, y + 1, Math.max(1, blockW - 2), Math.max(1, noteH * 0.38));
    ctx.restore();
    const fadeInW = Math.min(blockW * 0.4, noteFadeInUnits(note) * cellW);
    const fadeOutW = Math.min(blockW * 0.4, noteFadeOutUnits(note) * cellW);
    const sampleId = resolveLoopNoteSampleId(state, note);
    drawNoteAmplitudeThumbnail(ctx, {
      note,
      preview: sampleId ? options.sampleAmplitudePreviews?.get(sampleId) ?? null : null,
      x: blockX,
      y,
      width: blockW,
      height: noteH,
      fadeInWidth: fadeInW,
      fadeOutWidth: fadeOutW,
      muted: trackMuted,
    });
    if (fadeInW > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(blockX, y + noteH);
      ctx.lineTo(blockX + fadeInW, y + noteH);
      ctx.lineTo(blockX + fadeInW, y);
      ctx.closePath();
      ctx.fill();
    }
    if (fadeOutW > 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(blockX + blockW, y + noteH);
      ctx.lineTo(blockX + blockW - fadeOutW, y + noteH);
      ctx.lineTo(blockX + blockW - fadeOutW, y);
      ctx.closePath();
      ctx.fill();
    }
    if (handleW > 0) {
      const handleColor = selected ? 'rgba(255,255,255,0.94)' : 'rgba(226,232,240,0.72)';
      ctx.fillStyle = handleColor;
      ctx.fillRect(blockX + 1, y + 1, handleW, Math.max(4, noteH - 2));
      ctx.fillRect(blockX + blockW - handleW - 1, y + 1, handleW, Math.max(4, noteH - 2));
    }
    if (isFragmentableLoopImportBody(note) && blockW > 12) {
      const fragmentLabel = ((note as any).noteClass === 'material-fragment' || (note as any).noteClass === 'carrier-fragment') && Number.isFinite((note as any).fragmentIndex)
        ? String((note as any).fragmentIndex)
        : loopImportBodyFamily(note) === 'carrier-field' ? 'F' : '';
      const label = fragmentLabel;
      if (label) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = `${Math.max(10, Math.min(14, noteH - 4))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, blockX + blockW / 2, y + noteH / 2 + 0.5);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
      }
    }
    ctx.strokeStyle = selected
      ? 'rgba(255,255,255,0.92)'
      : (trackMuted ? 'rgba(161,161,170,0.72)' : track.color);
    ctx.lineWidth = selected ? 1.8 : 1;
    roundedRectPath(ctx, blockX, y, blockW, noteH, blockRadius);
    ctx.stroke();
    if (pendingPitchAnchor) {
      ctx.shadowBlur = 0;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,0.96)';
      ctx.lineWidth = 1.6;
      roundedRectPath(ctx, blockX + 1, y + 1, Math.max(2, blockW - 2), Math.max(2, noteH - 2), Math.max(1, blockRadius - 1));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  activeNotes.forEach((note) => drawNoteBlock(note));
  options.ghostNotes?.forEach((note) => drawNoteBlock(note as LoopNoteEvent, true));

  if (options.selectionBox) {
    const x = gutterW + (options.selectionBox.startUnit - scrollStart) * cellW;
    const startLine = Math.max(0, Math.min(lineCount - 1, options.selectionBox.startChannelIndex));
    const endLine = Math.max(0, Math.min(lineCount - 1, options.selectionBox.endChannelIndex));
    const y = lineLayout.bandTop(startLine);
    const h = Math.max(0, lineLayout.bandBottom(endLine) - lineLayout.bandTop(startLine));
    const w = Math.max(0, (options.selectionBox.endUnit - options.selectionBox.startUnit + 1) * cellW);
    ctx.fillStyle = 'rgba(34,211,238,0.08)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(34,211,238,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
    ctx.setLineDash([]);
  }

  if (options.playheadStep != null) {
    const playX = gutterW + (options.playheadStep - scrollStart) * cellW;
    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playX + 0.5, headerH - 10);
    ctx.lineTo(playX + 0.5, height);
    ctx.stroke();
  }
}
