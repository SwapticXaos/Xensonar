import type { MaterialEntry } from '../../l3lab/materialLibrary';

export function isRootFollowOnlyMaterialLoop(entry: MaterialEntry) {
  if (entry.role !== 'loop' || !entry.rootFollowPreferred) return false;
  return entry.workspaceOrigin === 'spectral-forge-cut-root-follow'
    || entry.renderMode === 'raw-root-follow-loop-selection'
    || entry.renderMode === 'direct-root-follow-loop-upload';
}

export function isVisibleMaterialLoopBankEntry(entry: MaterialEntry) {
  return entry.role === 'loop' && !isRootFollowOnlyMaterialLoop(entry);
}
