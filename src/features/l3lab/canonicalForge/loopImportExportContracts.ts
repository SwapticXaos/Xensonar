import type { CarrierIntegralFieldClip, CarrierIntegralFieldVoiceEvent, LoopNoteEvent } from './loopDrumDomainTypes';

export const LOOP_IMPORT_TRACK_IDS = {
  materialBase: 'material-base',
  carrierPink: 'carrier-integral-pink',
} as const;

export type LoopImportBodyFamily = 'material' | 'carrier-field';

export function isMaterialImportTrackId(trackId: string | null | undefined): boolean {
  return typeof trackId === 'string' && (trackId === LOOP_IMPORT_TRACK_IDS.materialBase || trackId.startsWith(`${LOOP_IMPORT_TRACK_IDS.materialBase}:`));
}

export function isCarrierImportTrackId(trackId: string | null | undefined): boolean {
  return typeof trackId === 'string' && (trackId === LOOP_IMPORT_TRACK_IDS.carrierPink || trackId.startsWith(`${LOOP_IMPORT_TRACK_IDS.carrierPink}:`));
}

export function isLoopImportTrackId(trackId: string | null | undefined): boolean {
  return isMaterialImportTrackId(trackId) || isCarrierImportTrackId(trackId);
}

export function isMaterialImportBody(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId'> | null | undefined): boolean {
  return !!note && (isMaterialImportTrackId(note.trackId) || note.noteClass === 'material-base' || note.noteClass === 'material-fragment');
}

export function isMaterialImportFragment(note: Pick<LoopNoteEvent, 'noteClass'> | null | undefined): boolean {
  return note?.noteClass === 'material-fragment';
}

export function isCarrierFieldImportBody(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'> | null | undefined): boolean {
  return !!note && (
    isCarrierImportTrackId(note.trackId)
    || note.noteClass === 'carrier-field'
    || note.noteClass === 'carrier-fragment'
    || !!note.carrierIntegralField
  );
}

export function isCarrierFieldFragment(note: Pick<LoopNoteEvent, 'noteClass'> | null | undefined): boolean {
  return note?.noteClass === 'carrier-fragment';
}

export function isFragmentableLoopImportBody(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'> | null | undefined): boolean {
  return isMaterialImportBody(note) || isCarrierFieldImportBody(note);
}

export function loopImportBodyFamily(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'> | null | undefined): LoopImportBodyFamily | null {
  if (isCarrierFieldImportBody(note)) return 'carrier-field';
  if (isMaterialImportBody(note)) return 'material';
  return null;
}

export function loopImportBodyBaseNoteClass(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'>): LoopNoteEvent['noteClass'] {
  return loopImportBodyFamily(note) === 'carrier-field' ? 'carrier-field' : 'material-base';
}

export function loopImportBodyFragmentNoteClass(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'>): LoopNoteEvent['noteClass'] {
  return loopImportBodyFamily(note) === 'carrier-field' ? 'carrier-fragment' : 'material-fragment';
}

export function loopImportBodyLabel(note: Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'> | null | undefined): string {
  const family = loopImportBodyFamily(note);
  if (family === 'carrier-field') return isCarrierFieldFragment(note) ? 'Carrier-Fragment' : 'Carrier-Feldclip';
  if (family === 'material') return isMaterialImportFragment(note) ? 'Material-Fragment' : 'Materialbasis';
  return 'Importkörper';
}

export function loopImportBodyCountLabel(notes: readonly Pick<LoopNoteEvent, 'noteClass' | 'trackId' | 'carrierIntegralField'>[]): string {
  const materialCount = notes.filter(isMaterialImportBody).length;
  const carrierCount = notes.filter(isCarrierFieldImportBody).length;
  const parts: string[] = [];
  if (materialCount) parts.push(`${materialCount} Material`);
  if (carrierCount) parts.push(`${carrierCount} Carrier`);
  return parts.length ? parts.join(' · ') : '0 Importkörper';
}

export function sliceCarrierIntegralFieldClip(
  field: CarrierIntegralFieldClip | null | undefined,
  startRatio: number,
  endRatio: number,
): CarrierIntegralFieldClip | null {
  if (!field || field.schemaVersion !== 'carrier-integral-field-v1' || !Array.isArray(field.voices)) return null;
  const safeStart = Math.max(0, Math.min(1, Number.isFinite(startRatio) ? startRatio : 0));
  const safeEnd = Math.max(safeStart + 0.0001, Math.min(1, Number.isFinite(endRatio) ? endRatio : 1));
  const span = Math.max(0.0001, safeEnd - safeStart);
  const voices: CarrierIntegralFieldVoiceEvent[] = [];
  for (const voice of field.voices) {
    const voiceStart = Math.max(0, Math.min(1, voice.startRatio));
    const voiceEnd = Math.max(voiceStart, Math.min(1, voice.startRatio + Math.max(0.0001, voice.durationRatio)));
    const overlapStart = Math.max(voiceStart, safeStart);
    const overlapEnd = Math.min(voiceEnd, safeEnd);
    if (overlapEnd <= overlapStart + 0.0001) continue;
    voices.push({
      ...voice,
      id: `${voice.id || voice.voiceId || 'voice'}:slice:${safeStart.toFixed(4)}-${safeEnd.toFixed(4)}`,
      startRatio: Math.max(0, Math.min(1, (overlapStart - safeStart) / span)),
      durationRatio: Math.max(0.001, Math.min(1, (overlapEnd - overlapStart) / span)),
    });
  }
  return {
    ...field,
    label: `${field.label || 'Carrier'} · Fragment`,
    voices,
    totalBeats: Math.max(0.0001, (field.totalBeats || 1) * span),
  };
}
