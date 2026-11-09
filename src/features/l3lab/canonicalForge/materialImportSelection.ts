import type { MaterialImportEntrySummary } from './materialImportChannel';

export function pickPreferredMaterialImportEntry(entries: MaterialImportEntrySummary[]): MaterialImportEntrySummary | null {
  return entries.find((entry) => entry.transferReady && entry.lane === 'audio-paint')
    ?? entries.find((entry) => entry.transferReady && entry.lane === 'raw-audio')
    ?? entries[0]
    ?? null;
}

export function resolveSelectedMaterialImportEntry(
  entries: MaterialImportEntrySummary[],
  selectedId: string,
): MaterialImportEntrySummary | null {
  if (!selectedId) return pickPreferredMaterialImportEntry(entries);
  return entries.find((entry) => entry.id === selectedId) ?? pickPreferredMaterialImportEntry(entries);
}
