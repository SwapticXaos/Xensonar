import { useEffect, useState } from 'react';
import CarrierIntegralVerwaltenPanel from './CarrierIntegralVerwaltenPanel';
import { OPEN_CARRIER_INTEGRAL_EDITOR_EVENT, clearStashedCarrierIntegralEditorIntent, normalizeCarrierIntegralEditorIntent, readStashedCarrierIntegralEditorIntent, type CarrierIntegralEditorIntent } from '../../contracts/carrierIntegralEditorIntent';

export type CarrierIntegralPanelProps = {
  onOpenInSpectralForge?: () => void;
};

export default function CarrierIntegralPanel({ onOpenInSpectralForge }: CarrierIntegralPanelProps) {
  const [managerOpen, setManagerOpen] = useState(false);
  const [editorIntent, setEditorIntent] = useState<CarrierIntegralEditorIntent | null>(null);

  useEffect(() => {
    const openFromIntent = (value: unknown) => {
      const intent = normalizeCarrierIntegralEditorIntent(value) ?? readStashedCarrierIntegralEditorIntent();
      if (intent) setEditorIntent(intent);
      setManagerOpen(true);
    };
    const stashed = readStashedCarrierIntegralEditorIntent();
    if (stashed) {
      setEditorIntent(stashed);
      setManagerOpen(true);
    }
    const handleOpen = (event: Event) => openFromIntent((event as CustomEvent).detail);
    window.addEventListener(OPEN_CARRIER_INTEGRAL_EDITOR_EVENT, handleOpen as EventListener);
    return () => window.removeEventListener(OPEN_CARRIER_INTEGRAL_EDITOR_EVENT, handleOpen as EventListener);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setManagerOpen(true)}
        className="group flex w-full items-center gap-3 rounded border border-fuchsia-700/70 bg-fuchsia-950/20 px-3 py-2 text-left transition hover:border-fuchsia-400 hover:bg-fuchsia-900/25"
        data-xensonar-gesture-projects-button="true"
        data-xensonar-carrier-integral-panel="true"
        data-xensonar-gesture-projects-single-rainbow="true"
      >
        <span className="text-[28px] leading-none drop-shadow-[0_0_8px_rgba(217,70,239,0.45)]" aria-hidden="true">🌈</span>
        <span className="min-w-0">
          <span className="block text-[12px] font-black uppercase tracking-[0.16em] text-fuchsia-100 group-hover:text-white">GESTALT-PROJEKTE</span>
          <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-fuchsia-300/70">Labor-Bibliothek</span>
        </span>
      </button>
      {managerOpen ? (
        <CarrierIntegralVerwaltenPanel
          onClose={() => setManagerOpen(false)}
          onOpenInSpectralForge={onOpenInSpectralForge}
          initialFocusIntent={editorIntent}
          onInitialFocusConsumed={(token) => {
            clearStashedCarrierIntegralEditorIntent(token);
            setEditorIntent(null);
          }}
        />
      ) : null}
    </>
  );
}
