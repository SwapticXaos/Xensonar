import type { CanonicalLoopComposerTuning } from './sessionTypes';
import { BP_13TET_RATIOS, JI_NODES } from '../../xensonar/constants';
import { getRasterDefinition, getRasterPeriodRatio, getRasterStepCents } from '../../xensonar/domain/instrumentData';
import {
  centeredRegisterOffsets,
  derivePitchStepsFromLines,
  effectiveLoopLineHz,
  getDefaultRepetitionModelForTuning,
  loopLineBaseLabel,
  noteChannelIndex,
  noteDurationUnits,
  noteStartUnit,
  remapLoopNotesToPitchLines,
  sortLoopPitchLinesDescending,
} from './loopGridKernel';
import type { LoopComposerState, LoopNoteEvent, LoopPitchLine } from './loopDrumDomainTypes';

export const LOOP_COMPOSER_MAX_VISIBLE_LINES = 96;

export function loopLineDisplayLabel(line: LoopPitchLine) {
  return `${loopLineBaseLabel(line)} (${effectiveLoopLineHz(line).toFixed(1)}Hz)`;
}

export function rebuildLoopComposerPitchField(state: Pick<LoopComposerState, 'tuning' | 'baseHz' | 'pitchLines' | 'notes' | 'selectedNoteId' | 'stepsPerBar' | 'beatsPerBar' | 'bars'>) {
  const rebuiltLines = createLoopPitchLinesFromTuning(state.tuning, state.baseHz);
  const preservedOffsets = new Map((state.pitchLines ?? []).map((line, index) => [index, line.offsetCents]));
  const nextPitchLines = rebuiltLines.map((line, index) => ({ ...line, offsetCents: preservedOffsets.get(index) ?? 0 }));
  const nextPitchSteps = derivePitchStepsFromLines(nextPitchLines, state.baseHz);
  const nextNotes = remapLoopNotesToPitchLines(state.notes, nextPitchLines, state);
  const validSelectedNoteId = nextNotes.some((note) => note.id === state.selectedNoteId) ? state.selectedNoteId : nextNotes[0]?.id ?? null;
  return { nextPitchLines, nextPitchSteps, nextNotes, validSelectedNoteId };
}


export function buildLoopLineLayout(state: Pick<LoopComposerState, 'pitchLines' | 'pitchSteps' | 'zoomY' | 'scrollY'>, height: number, headerH: number) {
  const lines = (state.pitchLines?.length ? state.pitchLines : (state.pitchSteps ?? []).map((step, index) => ({
    id: `line-${index}`,
    label: step.label,
    hz: 220 * Math.max(0.1, step.ratio || 1),
    ratio: step.ratio,
    cents: step.cents,
    offsetCents: step.offsetCents,
    muted: step.muted,
    presetIndex: index,
  } as LoopPitchLine)));
  const bodyTop = headerH + 18;
  const bodyBottom = Math.max(bodyTop + 40, height - 18);
  const usableHeight = Math.max(40, bodyBottom - bodyTop);
  if (!lines.length) {
    return {
      bodyTop,
      bodyBottom,
      lineYs: [] as number[],
      nearestLineIndex: (_y: number) => -1,
      bandTop: (_i: number) => bodyTop,
      bandBottom: (_i: number) => bodyBottom,
    };
  }
  const effectiveHz = lines.map((line) => Math.max(1, effectiveLoopLineHz(line)));
  const minLog = Math.log2(Math.min(...effectiveHz));
  const maxLog = Math.log2(Math.max(...effectiveHz));
  const range = Math.max(1e-6, maxLog - minLog);
  const zoomY = Math.max(1, Math.min(12, state.zoomY ?? 1));
  const visibleRatio = 1 / zoomY;
  const maxScrollRatio = Math.max(0, 1 - visibleRatio);
  const scrollRatio = Math.max(0, Math.min(maxScrollRatio, (state.scrollY ?? 0) * maxScrollRatio));
  const lineYs = effectiveHz.map((hz) => {
    const t = (Math.log2(hz) - minLog) / range;
    const remapped = (t - scrollRatio) / Math.max(1e-6, visibleRatio);
    return bodyBottom - remapped * usableHeight;
  });
  return {
    bodyTop,
    bodyBottom,
    lineYs,
    nearestLineIndex: (y: number) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < lineYs.length; i += 1) {
        const dist = Math.abs(lineYs[i] - y);
        if (dist < bestDist) {
          best = i;
          bestDist = dist;
        }
      }
      return best;
    },
    bandTop: (index: number) => {
      const safeIndex = Math.max(0, Math.min(lineYs.length - 1, index));
      const curr = lineYs[safeIndex];
      const prev = safeIndex > 0 ? lineYs[safeIndex - 1] : bodyTop;
      return safeIndex > 0 ? (prev + curr) * 0.5 : bodyTop;
    },
    bandBottom: (index: number) => {
      const safeIndex = Math.max(0, Math.min(lineYs.length - 1, index));
      const curr = lineYs[safeIndex];
      const next = safeIndex < lineYs.length - 1 ? lineYs[safeIndex + 1] : bodyBottom;
      return safeIndex < lineYs.length - 1 ? (curr + next) * 0.5 : bodyBottom;
    },
  };
}

export function getLoopNoteLineRect(layout: ReturnType<typeof buildLoopLineLayout>, lineIndex: number) {
  const lineY = layout.lineYs[lineIndex] ?? layout.bodyTop;
  const top = lineIndex > 0 ? (layout.lineYs[lineIndex - 1] + lineY) * 0.5 : layout.bodyTop;
  const bottom = lineIndex < layout.lineYs.length - 1 ? (lineY + layout.lineYs[lineIndex + 1]) * 0.5 : layout.bodyBottom;
  const channelH = Math.max(9, bottom - top);
  const noteH = Math.max(6, Math.min(14, channelH * 0.42));
  const hitPadY = Math.max(4, Math.min(10, channelH * 0.42));
  return { lineY, top, bottom, noteH, hitPadY, y: lineY - noteH * 0.5 };
}

export function getLoopNoteScreenRect(
  state: Pick<LoopComposerState, 'pitchSteps' | 'pitchLines' | 'stepsPerBar' | 'beatsPerBar' | 'bars'>,
  note: LoopNoteEvent,
  layout: ReturnType<typeof buildLoopLineLayout>,
  viewport: { gutterW: number; cellW: number; scrollStart: number; visibleSteps: number },
) {
  const lineIndex = noteChannelIndex(state, note);
  const noteStart = noteStartUnit(state, note);
  const noteEnd = noteStart + noteDurationUnits(state, note);
  const x = viewport.gutterW + (Math.max(noteStart, viewport.scrollStart) - viewport.scrollStart) * viewport.cellW;
  const visibleLength = Math.min(noteEnd, viewport.scrollStart + viewport.visibleSteps) - Math.max(noteStart, viewport.scrollStart);
  const w = Math.max(6, visibleLength * viewport.cellW);
  const lineRect = getLoopNoteLineRect(layout, lineIndex);
  const handleW = w >= 12 ? Math.min(12, Math.max(6, w * 0.18)) : 0;
  return { lineIndex, x, w, y: lineRect.y, noteH: lineRect.noteH, hitPadY: lineRect.hitPadY, lineRect, handleW };
}

export function createLoopPitchLinesFromTuning(
  tuning: CanonicalLoopComposerTuning,
  baseHz: number,
): LoopPitchLine[] {
  const safeBase = Math.max(30, Math.min(1200, Number.isFinite(baseHz) ? baseHz : 220));
  const repetitionModel = getDefaultRepetitionModelForTuning(tuning);
  const repetitionRatioValue = getRasterPeriodRatio(tuning);
  const repetitionCents = 1200 * Math.log2(repetitionRatioValue);

  const baseDegrees: Array<{ label: string; ratio: number; cents: number; presetIndex: number }> = (() => {
    if (tuning === 'ji') {
      return JI_NODES.map((node, index) => ({ label: node.label, ratio: node.ratio, cents: node.cents, presetIndex: index }));
    }
    const definition = getRasterDefinition(tuning);
    const centsValues = getRasterStepCents(tuning);
    if (tuning === 'bp') {
      return BP_13TET_RATIOS.map((ratio, index) => ({
        label: `BP ${index + 1}`,
        ratio,
        cents: 1200 * Math.log2(ratio),
        presetIndex: index,
      }));
    }
    return centsValues.map((cents, index) => ({
      label: tuning === 'gamelan' ? `Pelog ${index + 1}` : tuning === 'maqam' ? `Rast ${index + 1}` : `${definition?.label ?? tuning} ${index + 1}` ,
      ratio: Math.pow(2, cents / 1200),
      cents,
      presetIndex: index,
    }));
  })();

  const maxLines = LOOP_COMPOSER_MAX_VISIBLE_LINES;
  const scaleSize = Math.max(1, baseDegrees.length);
  const registerCount = Math.max(2, Math.min(5, Math.floor(maxLines / scaleSize) || 1));
  const registers = centeredRegisterOffsets(registerCount);
  const registerLabelPrefix = repetitionModel === 'tritave' ? 'T' : 'O';

  const lines = registers.flatMap((register) => baseDegrees.map((degree, degreeIndex) => {
    const registerRatio = Math.pow(repetitionRatioValue, register);
    const hz = safeBase * degree.ratio * registerRatio;
    return {
      id: `line-${register}-${degreeIndex}`,
      label: `${degree.label} · ${registerLabelPrefix}${register}`,
      hz,
      ratio: degree.ratio * registerRatio,
      cents: degree.cents + register * repetitionCents,
      offsetCents: 0,
      muted: false,
      presetIndex: degree.presetIndex + registers.indexOf(register) * scaleSize,
    } as LoopPitchLine;
  }));

  return sortLoopPitchLinesDescending(lines);
}
