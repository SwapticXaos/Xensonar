import type { SyntheticForgeLogicView } from '../../../l3lab/canonicalForge/sessionTypes';
import type { ForgeMode } from '../../../l3lab/contracts/level3LabContracts';

type Level3LabWorkspaceSelectorProps = {
  mode: ForgeMode;
  syntheticForgeLogicView: SyntheticForgeLogicView;
  modeHint: string;
  onModeChange: (mode: ForgeMode) => void;
  onSyntheticForgeLogicViewChange: (view: SyntheticForgeLogicView) => void;
};

export function Level3LabWorkspaceSelector({
  mode,
  syntheticForgeLogicView,
  modeHint,
  onModeChange,
  onSyntheticForgeLogicViewChange,
}: Level3LabWorkspaceSelectorProps) {
  return (
    <div className="space-y-3 border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-400">
      <div className="uppercase tracking-[0.2em] text-neutral-500">II Materialschmiede</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
        <button
          type="button"
          onClick={() => onModeChange('experimental')}
          className={`rounded-2xl border px-5 py-4 text-left transition ${mode === 'experimental' ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100 shadow-[0_0_0_1px_rgba(6,182,212,0.15)]' : 'border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-900'}`}
        >
          <div className="text-lg font-semibold uppercase tracking-[0.22em] text-cyan-200 md:text-xl">SpectralForge</div>
          <div className="mt-1 text-lg font-semibold">Raw Audio · Bild · Körperwerkstatt</div>
          <div className="mt-1 text-[11px] leading-relaxed text-neutral-400">Aktueller Fokusraum für Audio- und Bild-Import, spektrale Körperarbeit und die vermittelte Schicht zwischen Material und Werkzeug.</div>
        </button>
        <button
          type="button"
          onClick={() => onModeChange('canonical')}
          className={`rounded-2xl border px-5 py-4 text-left transition ${mode === 'canonical' ? 'border-violet-500 bg-violet-950/40 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]' : 'border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-900'}`}
        >
          <div className="text-lg font-semibold uppercase tracking-[0.22em] text-violet-200 md:text-xl">SyntheticForge</div>
          <div className="mt-1 text-lg font-semibold">Drum Machine · Synth Loop</div>
          <div className="mt-1 text-[11px] leading-relaxed text-neutral-400">Direktwahl zwischen Beat- und Synth-Loop-Arbeit. Ältere Wave-/Material-Implementierungen bleiben nur noch als technische Referenz im Archiv.</div>
        </button>
      </div>
      {mode === 'canonical' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div />
          <div className="flex flex-wrap gap-3 rounded-2xl border border-violet-700/40 bg-violet-950/15 p-3">
            <button
              type="button"
              onClick={() => onSyntheticForgeLogicViewChange('drums')}
              className={`min-w-[14rem] rounded-xl border px-5 py-3 text-left transition ${syntheticForgeLogicView === 'drums' ? 'border-cyan-500 bg-cyan-950/35 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]' : 'border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-900'}`}
            >
              <div className="text-sm font-semibold">Drum Machine</div>
            </button>
            <button
              type="button"
              onClick={() => onSyntheticForgeLogicViewChange('melodic')}
              className={`min-w-[14rem] rounded-xl border px-5 py-3 text-left transition ${syntheticForgeLogicView === 'melodic' ? 'border-violet-500 bg-violet-950/35 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.12)]' : 'border-neutral-700 bg-neutral-950/70 text-neutral-200 hover:bg-neutral-900'}`}
            >
              <div className="text-sm font-semibold">Melodic Loop</div>
            </button>
          </div>
        </div>
      ) : null}
      {mode === 'external' ? (
        <div className="rounded border border-cyan-900/40 bg-cyan-950/15 p-3 text-[11px] leading-relaxed text-cyan-100">
          Xenpolar nutzt denselben technischen Slot, aber der Adapter-Dock-Pfad gehört nicht mehr zur sichtbaren Materialschmiede-Navigation. Wechsle bei Bedarf zurück zu SpectralForge oder SyntheticForge.
        </div>
      ) : null}
      <div className="text-neutral-500">{modeHint}</div>
    </div>
  );
}
