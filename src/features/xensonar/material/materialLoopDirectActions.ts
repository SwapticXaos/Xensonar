import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { resolveMaterialLoopBrowseTargetIndex } from './materialLoopBrowserUtils';
import { formatMaterialLoopSelectionStatus, formatMaterialLoopToggleStatus, type MaterialLoopSelectionSource } from './materialLoopStatusText';

type UpdateNParams = (patch: { materialLoopId?: string; materialLoopActive?: boolean }) => void;

type SharedSelectionArgs = {
  entries: MaterialEntry[];
  updateNParams: UpdateNParams;
  setStatus: (status: string) => void;
  setBrowseArmed: (armed: boolean) => void;
};

export function selectMaterialLoopDirect(args: SharedSelectionArgs & {
  entryId: string;
  source?: MaterialLoopSelectionSource;
}) {
  const { entries, entryId, updateNParams, setStatus, setBrowseArmed, source = 'ui' } = args;
  const entry = entries.find((candidate) => candidate.id === entryId);
  if (!entry) return false;
  if (source !== 'browser') setBrowseArmed(false);
  updateNParams({ materialLoopId: entry.id, materialLoopActive: true });
  setStatus(formatMaterialLoopSelectionStatus(entry.name, entry.bars, source));
  return true;
}

export function toggleMaterialLoopDirect(args: {
  currentActive: boolean;
  updateNParams: UpdateNParams;
  setStatus: (status: string) => void;
  setBrowseArmed: (armed: boolean) => void;
}) {
  const { currentActive, updateNParams, setStatus, setBrowseArmed } = args;
  setBrowseArmed(false);
  const next = !currentActive;
  updateNParams({ materialLoopActive: next });
  setStatus(formatMaterialLoopToggleStatus(next));
  return next;
}

export function browseMaterialLoopWithState(args: SharedSelectionArgs & {
  currentId: string;
  key: 'ö' | 'ä';
  directCount: number;
  browseArmed: boolean;
}) {
  const { entries, currentId, key, directCount, browseArmed, updateNParams, setStatus, setBrowseArmed } = args;
  const targetIndex = resolveMaterialLoopBrowseTargetIndex({
    entries,
    currentId,
    browseArmed,
    key,
    directCount,
  });
  if (targetIndex < 0) {
    setStatus('Keine älteren Materialspur-Loops zum Durchschalten.');
    return false;
  }
  const target = entries[targetIndex];
  if (!target) return false;
  setBrowseArmed(true);
  updateNParams({ materialLoopId: target.id, materialLoopActive: true });
  const ordinal = targetIndex + 1;
  const directionLabel = key === 'ö' ? 'aufwärts' : 'abwärts';
  setStatus(`Materialspur-Browser ${directionLabel}: ${target.name} · Platz ${ordinal} von ${entries.length}.`);
  return true;
}
