import { canonicalLoopNoteOctaveOffset, noteChannelIndex, type LoopComposerState, type LoopNoteEvent } from './loopDrumDomain';
import { isMaterialImportBody } from './loopImportExportContracts';

export function resolveMaterialGridHz(loopComposer: LoopComposerState, note: LoopNoteEvent) {
  const channelIndex = noteChannelIndex(loopComposer, note);
  const line = loopComposer.pitchLines?.[channelIndex];
  const step = loopComposer.pitchSteps[channelIndex] ?? loopComposer.pitchSteps[0];
  const baseHz = Math.max(30, Math.min(1200, Number.isFinite(loopComposer.baseHz) ? loopComposer.baseHz : 220));
  const lineHz = line?.hz ?? (baseHz * (step?.ratio ?? 1));
  const cents = ((line?.offsetCents ?? step?.offsetCents ?? 0)) / 1200;
  const repetitionRatio = loopComposer.repetitionModel === 'tritave' ? 3 : 2;
  const octave = canonicalLoopNoteOctaveOffset(note);
  return Math.max(1, lineHz * Math.pow(repetitionRatio, octave) * Math.pow(2, cents));
}

export function describeMaterialPitchDisplay(loopComposer: LoopComposerState, note: LoopNoteEvent) {
  if (!isMaterialImportBody(note)) return null;
  const targetHz = resolveMaterialGridHz(loopComposer, note);
  const sourceFixed = note.materialPitchMode === 'source-fixed';
  const anchorHz = sourceFixed
    ? targetHz
    : Number.isFinite(note.anchorHz) ? Math.max(1, Number(note.anchorHz)) : targetHz;
  const desiredRate = targetHz / Math.max(1, anchorHz);
  const pitchDistanceFromAnchorCents = sourceFixed ? Number.POSITIVE_INFINITY : Math.abs(1200 * Math.log2(Math.max(0.000001, desiredRate)));
  return {
    effectiveHz: targetHz,
    sourceFixed,
    rawAnchorPosition: !sourceFixed && note.pendingPitchAnchor !== true && pitchDistanceFromAnchorCents <= 6,
  };
}
