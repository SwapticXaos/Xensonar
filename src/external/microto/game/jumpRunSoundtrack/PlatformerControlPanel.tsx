/**
 * Control panel for Jump Run Soundtrack: transport, preset I/O, composer sliders/selects.
 * Composes PlatformerTransportPanel and PlatformerTunerPanel for LOC discipline (vision §8).
 */

import type {
  PlatformerArrangementForm,
  PlatformerArrangementMode,
  PlatformerTuningMode,
} from "./platformerArrangement";
import type { PlatformerCompositionPresetItem, PlatformerPresetImportMode } from "./platformerPresetPersistence";
import type { PlatformerSectionBias } from "./platformerSectionBias";
import { PlatformerTransportPanel } from "./PlatformerTransportPanel";
import { PlatformerTunerPanel } from "./PlatformerTunerPanel";

export type PlatformerControlPanelProps = {
  running: boolean;
  onStartRun: () => Promise<void>;
  onPause: () => void;
  onResetRun: () => Promise<void>;
  presetName: string;
  onPresetNameChange: (name: string) => void;
  selectedPresetId: string;
  onSelectedPresetIdChange: (id: string) => void;
  presetItems: PlatformerCompositionPresetItem[];
  onSavePreset: (overwrite?: boolean) => void;
  onLoadPreset: (presetId?: string) => Promise<void>;
  onDeletePreset: () => void;
  onClearLibrary: () => void;
  libraryTransfer: string;
  onLibraryTransferChange: (value: string) => void;
  onExportLibrary: () => void;
  onCopyLibraryToClipboard: () => Promise<void>;
  onImportLibrary: (mode: PlatformerPresetImportMode) => void;
  bpm: number;
  onBpmChange: (value: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (value: number) => void;
  tuningMode: PlatformerTuningMode;
  onTuningModeChange: (value: PlatformerTuningMode) => void;
  arrangementMode: PlatformerArrangementMode;
  onArrangementModeChange: (value: PlatformerArrangementMode) => void;
  formMode: PlatformerArrangementForm;
  onFormModeChange: (value: PlatformerArrangementForm) => void;
  sectionBias: PlatformerSectionBias;
  onSectionBiasChange: (value: PlatformerSectionBias) => void;
  evolutionDepth: number;
  onEvolutionDepthChange: (value: number) => void;
  tempoFollow: number;
  onTempoFollowChange: (value: number) => void;
  composerOn: boolean;
  onComposerOnChange: (value: boolean) => void;
  xensonarExportBars: number;
  onXensonarExportBarsChange: (bars: number) => void;
  xensonarExportBusy: boolean;
  xensonarExportStatus: string;
  onExportLoopToXensonar: () => Promise<void>;
  onExportLoopToForge1?: () => Promise<void>;
  onExportLoopToForge2?: () => Promise<void>;
  onExportSeedToMelodicLoop?: () => Promise<void>;
  onDownloadAudio?: () => Promise<void>;
};

export function PlatformerControlPanel(props: PlatformerControlPanelProps) {
  const { running, onStartRun, onPause, onResetRun, presetName, onPresetNameChange, selectedPresetId, onSelectedPresetIdChange, presetItems, onSavePreset, onLoadPreset, onDeletePreset, onClearLibrary, libraryTransfer, onLibraryTransferChange, onExportLibrary, onCopyLibraryToClipboard, onImportLibrary } = props;
  const { bpm, onBpmChange, masterVolume, onMasterVolumeChange, tuningMode, onTuningModeChange, arrangementMode, onArrangementModeChange, formMode, onFormModeChange, sectionBias, onSectionBiasChange, evolutionDepth, onEvolutionDepthChange, tempoFollow, onTempoFollowChange, composerOn, onComposerOnChange, xensonarExportBars, onXensonarExportBarsChange, xensonarExportBusy, xensonarExportStatus, onExportLoopToXensonar, onExportLoopToForge1, onExportLoopToForge2, onExportSeedToMelodicLoop, onDownloadAudio } = props;

  return (
    <div className="mb-4 border border-neutral-800 bg-neutral-950/60 p-3 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-4">
        <PlatformerTransportPanel
          running={running}
          onStartRun={onStartRun}
          onPause={onPause}
          onResetRun={onResetRun}
          presetName={presetName}
          onPresetNameChange={onPresetNameChange}
          selectedPresetId={selectedPresetId}
          onSelectedPresetIdChange={onSelectedPresetIdChange}
          presetItems={presetItems}
          onSavePreset={onSavePreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
          onClearLibrary={onClearLibrary}
          libraryTransfer={libraryTransfer}
          onLibraryTransferChange={onLibraryTransferChange}
          onExportLibrary={onExportLibrary}
          onCopyLibraryToClipboard={onCopyLibraryToClipboard}
          onImportLibrary={onImportLibrary}
          xensonarExportBars={xensonarExportBars}
          onXensonarExportBarsChange={onXensonarExportBarsChange}
          xensonarExportBusy={xensonarExportBusy}
          xensonarExportStatus={xensonarExportStatus}
          onExportLoopToXensonar={onExportLoopToXensonar}
          onExportLoopToForge1={onExportLoopToForge1}
          onExportLoopToForge2={onExportLoopToForge2}
          onExportSeedToMelodicLoop={onExportSeedToMelodicLoop}
          onDownloadAudio={onDownloadAudio}
        />
        <PlatformerTunerPanel
          bpm={bpm}
          onBpmChange={onBpmChange}
          masterVolume={masterVolume}
          onMasterVolumeChange={onMasterVolumeChange}
          tuningMode={tuningMode}
          onTuningModeChange={onTuningModeChange}
          arrangementMode={arrangementMode}
          onArrangementModeChange={onArrangementModeChange}
          formMode={formMode}
          onFormModeChange={onFormModeChange}
          sectionBias={sectionBias}
          onSectionBiasChange={onSectionBiasChange}
          evolutionDepth={evolutionDepth}
          onEvolutionDepthChange={onEvolutionDepthChange}
          tempoFollow={tempoFollow}
          onTempoFollowChange={onTempoFollowChange}
          composerOn={composerOn}
          onComposerOnChange={onComposerOnChange}
        />
      </div>
      <div className="text-[11px] leading-snug text-neutral-400 border border-neutral-800/60 bg-neutral-900/60 rounded px-2 py-1.5">
        <p className="font-semibold text-neutral-300 mb-1">Quick start</p>
        <p>
          Press <span className="font-semibold">Start Run</span>, then move with{" "}
          <kbd className="bg-neutral-800 px-1 rounded">A/D</kbd> or{" "}
          <kbd className="bg-neutral-800 px-1 rounded">Arrow Left/Right</kbd> and jump with{" "}
          <kbd className="bg-neutral-800 px-1 rounded">Space</kbd>,{" "}
          <kbd className="bg-neutral-800 px-1 rounded">W</kbd>, or{" "}
          <kbd className="bg-neutral-800 px-1 rounded">Arrow Up</kbd>. Your path, coins, and obstacle hits
          are captured as movement DNA — reach <span className="font-semibold">FINISH</span> to hear the level
          rendered as an evolving suite, then use the right-hand panel to change tuning, form, and evolution.
        </p>
      </div>
    </div>
  );
}
