import { getMaterialLibraryState } from '../../l3lab/materialLibrary';
import type { MaterialLibraryDeletedDetail, MaterialLibraryRegisteredDetail } from '../../l3lab/materialLibraryEventContract';
import { isRootFollowOnlyMaterialLoop } from './materialLoopRoleFilters';

type UpdateNParams = (patch: { materialLoopId?: string; materialLoopActive?: boolean }) => void;

export function createMaterialRegisteredHandler(args: {
  pendingRegisteredLoopIdRef: { current: string };
  updateNParams: UpdateNParams;
  setStatus: (status: string) => void;
}) {
  return (event: Event) => {
    const detail = (event as CustomEvent<MaterialLibraryRegisteredDetail>).detail;
    if (detail?.role === 'loop' && detail.id) {
      const registered = getMaterialLibraryState().entries.find((entry) => entry.id === detail.id);
      if (registered && isRootFollowOnlyMaterialLoop(registered)) {
        args.setStatus(`Root Follow vorbereitet: ${registered.name} · Materialspur-Auswahl bleibt unverändert.`);
        return;
      }
      args.pendingRegisteredLoopIdRef.current = detail.id;
      args.updateNParams({ materialLoopId: detail.id, materialLoopActive: true });
      if (registered) args.setStatus(`Neu importiert: ${registered.name} · ${registered.bars} Takte.`);
    }
  };
}

export function createMaterialDeletedHandler(args: {
  pendingRegisteredLoopIdRef: { current: string };
  currentMaterialLoopId: () => string;
  currentMaterialLoopActive: () => boolean;
  updateNParams: UpdateNParams;
  setStatus: (status: string) => void;
}) {
  return (event: Event) => {
    const detail = (event as CustomEvent<MaterialLibraryDeletedDetail>).detail;
    if (!detail?.id) return;
    if (args.pendingRegisteredLoopIdRef.current === detail.id) args.pendingRegisteredLoopIdRef.current = '';
    if (detail.id === args.currentMaterialLoopId()) {
      const fallback = getMaterialLibraryState().entries.find((entry) => entry.role === 'loop' && entry.id !== detail.id)?.id ?? '';
      args.updateNParams({ materialLoopId: fallback, materialLoopActive: fallback ? args.currentMaterialLoopActive() : false });
      if (!fallback) args.setStatus('Kein Materialspur-Loop mehr ausgewählt.');
    }
  };
}
