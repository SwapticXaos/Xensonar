import type { RefObject } from 'react';
import { LogicModeCards } from './microtonalLogicPanels';
import type { CanonicalForgeWorkspace, CanonicalLogicView } from './sessionTypes';

export type CanonicalForgeHeaderProps = {
  activeWorkspace: CanonicalForgeWorkspace;
  hideTopLogicSwitch: boolean;
  logicView: CanonicalLogicView;
  currentDrumPatternLabel: string;
  currentDrumKitLabel: string;
  currentMelodicPresetLabel: string;
  onSelectLogicView: (view: CanonicalLogicView) => void;
  onBack: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImportFile: (file: File) => void;
};

export function CanonicalForgeHeader({
  activeWorkspace,
  hideTopLogicSwitch,
  logicView,
  currentDrumPatternLabel,
  currentDrumKitLabel,
  currentMelodicPresetLabel,
  onSelectLogicView,
  onBack,
  fileInputRef,
  onImportFile,
}: CanonicalForgeHeaderProps) {
  if (hideTopLogicSwitch) return null;
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border border-neutral-800 bg-neutral-950/70 p-3">
      {activeWorkspace === 'microtonal-logic' && !hideTopLogicSwitch ? (
        <LogicModeCards
          logicView={logicView}
          currentDrumPatternLabel={currentDrumPatternLabel}
          currentDrumKitLabel={currentDrumKitLabel}
          currentMelodicPresetLabel={currentMelodicPresetLabel}
          onSelectLogicView={onSelectLogicView}
        />
      ) : (
        <div className="text-sm text-neutral-200">SyntheticForge</div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-900">← Zurück zu Xensonar</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImportFile(file);
            event.currentTarget.value = '';
          }}
        />
      </div>
    </div>
  );
}

export type WaveMaterialArchivePanelsProps = {
  activeWorkspace: CanonicalForgeWorkspace;
};

export function WaveMaterialArchivePanels({ activeWorkspace }: WaveMaterialArchivePanelsProps) {
  if (activeWorkspace !== 'wave-material') return null;
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400">
          Dieser archivierte Wave-/Bild-Bereich bleibt nur als Referenz im Code erhalten und ist in SyntheticForge aktuell nicht direkt freigeschaltet.
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-3 border border-neutral-800 bg-neutral-950/70 p-3">
          <div className="rounded border border-neutral-800 bg-neutral-950/40 p-3 text-xs text-neutral-400">
            Die archivierten Wave-/Bild-Werkzeuge bleiben nur als Referenz im ZIP erhalten und sind in SyntheticForge aktuell nicht direkt freigeschaltet.
          </div>
        </div>
      </div>
    </>
  );
}
