// Host of the "Xensonar Variante" in the room XENPOLAR (Full build: Familie + Spiele; here: the Variante only).
// There is no family launcher in this build: the Variante opens directly, "Live Room" leads back.
import { useEffect } from "react";
import XensonarRefactorRoom from "./refactor/XensonarRefactorRoom";
import { XENSONAR_VARIANTE_ACTIVE_LABEL } from "./refactor/refucktorPresentation";

type Props = {
  requestedFamilyActive?: string | null;
  sharedFieldController?: any;
  onFamilyRequestConsumed?: () => void;
  onEnterResonance?: () => void;
};

export function XenpolarRoom({ requestedFamilyActive = null, sharedFieldController = null, onFamilyRequestConsumed, onEnterResonance }: Props) {
  // A pending room request from the Nodal Center is answered by simply being open; only consume it.
  useEffect(() => {
    if (requestedFamilyActive === "melodieQuest") onFamilyRequestConsumed?.();
  }, [requestedFamilyActive, onFamilyRequestConsumed]);
  return (
    <div data-xen-variante-room="true" className="space-y-3">
      <div className="flex items-center">
        <button type="button" data-xen-variante-back="true" onClick={() => onEnterResonance?.()}
          className="rounded border border-cyan-700/60 bg-cyan-950/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-900/40">
          ← Live Room
        </button>
      </div>
      <XensonarRefactorRoom embedded title={XENSONAR_VARIANTE_ACTIVE_LABEL} sharedField={sharedFieldController} />
    </div>
  );
}
