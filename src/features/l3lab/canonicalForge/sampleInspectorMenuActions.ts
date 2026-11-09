export type SampleInspectorSection = 'meta' | 'edit';
export type SampleEnvelopeEditorTarget = 'volume' | 'pitch';
export type SampleTempoModeDraft = 'linked' | 'decoupled';

function normalizeNumberDraft(value: string) {
  return value.trim().replace(',', '.');
}

export function parseOptionalPositiveHzDraft(value: string): number | null | undefined {
  const normalized = normalizeNumberDraft(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function parsePositiveSecondsDraft(value: string): number | null {
  const parsed = Number(normalizeNumberDraft(value));
  return Number.isFinite(parsed) && parsed > 0.01 ? parsed : null;
}


export function getSampleEnvelopeEditorCopy(target: SampleEnvelopeEditorTarget) {
  return target === 'volume'
    ? {
        fixedTarget: 'dynamic-fade' as const,
        title: 'Sample-Hüllkurve · Volume',
        description: 'Diese Kurve liegt direkt am Sample und wirkt deshalb in allen Projekten gleich, solange genau dieses Sample genutzt wird.',
        statusDescription: 'Die Lautstärke-Hüllkurve multipliziert sich mit eventuellen blockbezogenen Lautstärke-Feldern. Außerhalb der aktiven Bereiche bleibt das Sample unverändert.',
      }
    : {
        fixedTarget: 'pitch-elastic' as const,
        title: 'Sample-Hüllkurve · Pitch',
        description: 'Diese Pitch-Hüllkurve liegt direkt am Sample. Sie ist gut für wiederverwendbare Glissandi, Vibrati oder charakteristische Pitch-Bewegungen des Klangkörpers selbst.',
        statusDescription: 'Die Pitch-Hüllkurve addiert sich zu eventuellen blockbezogenen Pitch-Feldern. Dadurch bleibt Bibliothekscharakter vom Sample und projektbezogene Zusatzgeste sauber getrennt.',
      };
}
