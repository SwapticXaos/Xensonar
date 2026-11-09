import type { MaterialEntry, MaterialRole } from '../../../materialLibrary';
import { buildSpectralForgeSelectedEntryClass, formatSpectralForgeLocaleDate } from '../uiModel/spectralForgeUiModelShared';

export type MaterialLibrarySortMode = 'created-desc' | 'name-asc' | 'role';

export const MATERIAL_ROLE_LABELS: Record<MaterialRole, string> = {
  loop: 'Loop',
  waveMaterial: 'Wellenstarter-Material',
  particleExciter: 'Partikel-Exciter',
  droneTexture: 'Drone-Textur',
};

export function formatMaterialLibraryDate(value: number): string {
  return formatSpectralForgeLocaleDate(value);
}

export function sortMaterialLibraryEntries(
  entries: readonly MaterialEntry[],
  sortMode: MaterialLibrarySortMode,
): MaterialEntry[] {
  const next = [...entries];
  switch (sortMode) {
    case 'name-asc':
      next.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
      break;
    case 'role':
      next.sort((a, b) => a.role.localeCompare(b.role, 'de', { sensitivity: 'base' }) || b.createdAt - a.createdAt);
      break;
    case 'created-desc':
    default:
      next.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }
  return next;
}

export function resolveMaterialLibraryRoleBadge(entry: Pick<MaterialEntry, 'role'>): {
  label: string;
  className: string;
} {
  return entry.role === 'loop'
    ? { label: 'Room V', className: 'bg-cyan-950/40 text-cyan-300' }
    : { label: 'nur Forge', className: 'bg-neutral-900 text-neutral-400' };
}

export function formatMaterialLibrarySummary(entry: Pick<MaterialEntry, 'role' | 'bars' | 'bpm'>): string {
  return `${MATERIAL_ROLE_LABELS[entry.role]} · ${entry.bars} Takte · ${Math.round(entry.bpm)} BPM`;
}

export function formatMaterialLibrarySelectedMeta(entry: Pick<MaterialEntry, 'bars' | 'bpm' | 'role' | 'renderMode' | 'createdAt'>): string {
  return `${entry.bars} Takte · ${Math.round(entry.bpm)} BPM · ${MATERIAL_ROLE_LABELS[entry.role]} · ${entry.renderMode} · exportiert ${formatMaterialLibraryDate(entry.createdAt)}`;
}

export function resolveMaterialLibraryEntryClass(selected: boolean): string {
  return buildSpectralForgeSelectedEntryClass(selected);
}
