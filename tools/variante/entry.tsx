// Host of the "Xensonar Variante" in the room XENPOLAR (Full build: Familie + Spiele; here: the Variante only).
import { useEffect, useState } from "react";
import XensonarRefactorRoom from "./refactor/XensonarRefactorRoom";
import { XENSONAR_VARIANTE_ACTIVE_LABEL, XENSONAR_VARIANTE_FAMILY_SUMMARY, XENSONAR_VARIANTE_LABEL } from "./refactor/refucktorPresentation";

type Props = {
  requestedFamilyActive?: string | null;
  sharedFieldController?: any;
  onFamilyRequestConsumed?: () => void;
  onEnterResonance?: () => void;
};

export function XenpolarRoom({ requestedFamilyActive = null, sharedFieldController = null, onFamilyRequestConsumed, onEnterResonance }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (requestedFamilyActive === "melodieQuest") { setOpen(true); onFamilyRequestConsumed?.(); }
  }, [requestedFamilyActive, onFamilyRequestConsumed]);
  const back = (
    <button type="button" data-xen-variante-back="true" onClick={() => (open ? setOpen(false) : onEnterResonance?.())}
      className="rounded border border-cyan-700/60 bg-cyan-950/30 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100 hover:bg-cyan-900/40">
      {open ? "← Xensonar Familie" : "← Live Room"}
    </button>
  );
  if (open) {
    return (
      <div data-xen-variante-room="true" className="space-y-3">
        <div className="flex items-center">{back}</div>
        <XensonarRefactorRoom embedded title={XENSONAR_VARIANTE_ACTIVE_LABEL} sharedField={sharedFieldController} />
      </div>
    );
  }
  return (
    <div data-xen-variante-launcher="true" className="mx-auto max-w-3xl space-y-4 p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.34em] text-neutral-500">Xensonar Familie</div>
        {back}
      </div>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-amber-700/60 bg-amber-950/20 p-6 text-left text-amber-100 hover:bg-amber-900/30">
        <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-400">Ableger</div>
        <div className="mt-2 text-2xl font-semibold">{XENSONAR_VARIANTE_LABEL}</div>
        <div className="mt-2 text-sm opacity-90">{XENSONAR_VARIANTE_FAMILY_SUMMARY}</div>
      </button>
    </div>
  );
}
