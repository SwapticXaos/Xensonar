export type MaterialLoopSelectionSource = 'ui' | 'hotkey' | 'browser';

function formatLead(source: MaterialLoopSelectionSource) {
  if (source === 'hotkey') return 'Hotkey';
  if (source === 'browser') return 'Materialspur-Browser';
  return 'Materialspur';
}

export function formatMaterialLoopSelectionStatus(name: string, bars: number, source: MaterialLoopSelectionSource): string {
  return `${formatLead(source)}: ${name} · ${bars} Takte aktiv.`;
}

export function formatMaterialLoopToggleStatus(active: boolean): string {
  return active ? 'Materialspur per Hotkey aktiviert.' : 'Materialspur per Hotkey deaktiviert.';
}

export function formatManagedMaterialLoopStatus(name: string, index: number, total: number): string {
  return `Verwalten: ${name} · Platz ${index + 1} von ${total}.`;
}

export function formatMaterialLoopDeletedStatus(name: string): string {
  return `Materialspur gelöscht: ${name}`;
}

export function formatMaterialLoopRenamedStatus(name: string): string {
  return `Materialspur umbenannt: ${name}`;
}

export function formatMaterialLoopReorderedStatus(name: string): string {
  return `Reihenfolge getauscht: ${name}`;
}

export function formatMaterialLoopPlaylistShiftStatus(name: string, ordinal: number, total: number): string {
  return `Playlist verschoben: ${name} · Platz ${ordinal} von ${total}.`;
}
