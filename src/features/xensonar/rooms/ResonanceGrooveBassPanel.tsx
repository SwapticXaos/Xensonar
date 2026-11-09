import type { ComponentProps } from 'react';
import type { DrumKit } from '../domain/instrumentData';
import type { DrumConfigEntry } from '../drumConfigLibraryTypes';
import { ResonanceMaterialLoopPanel } from './ResonanceMaterialLoopPanel';
import { BassPatternManagerDialog } from './grooveBassPanel/BassPatternManagerDialog';
import type { GrooveBassPanelNParams, UpdateResonanceNParams } from './resonancePanelTypedContracts';
import { DrumManagerControls } from './grooveBassPanel/DrumManagerControls';
import { DrumPatternManagerDialog } from './grooveBassPanel/DrumPatternManagerDialog';
import { GrooveHeaderVolumeControl } from './grooveBassPanel/GrooveHeaderVolumeControl';
import { primeDrumMachineWorkspaceIntent } from './grooveBassPanel/grooveBassPanelWorkspaceIntent';
import { useGrooveBassLibraryWorkspace } from './grooveBassPanel/useGrooveBassLibraryWorkspace';

type ResonanceGrooveBassPanelProps = {
  nParamsUI: GrooveBassPanelNParams;
  updateNParams: UpdateResonanceNParams;
  metronomePulse: number;
  onOpenTempWorkspace: () => void;
  exportedDrumConfigs: DrumConfigEntry[];
  selectedExportedDrumConfig: DrumConfigEntry | null;
  renameSelectedDrumConfig: () => Promise<void> | void;
  removeSelectedDrumConfig: () => Promise<void> | void;
  drumPatterns: Array<{ value: string; label: string }>;
  drumKits: Array<{ value: DrumKit; label: string }>;
  bassPatterns: Array<{ value: string; label: string }>;
  bassPreviewContext?: { seed?: number; barIndex?: number; descriptors?: Record<string, number> };
  materialLoopPanelProps: ComponentProps<typeof ResonanceMaterialLoopPanel>;
};

export function ResonanceGrooveBassPanel({
  nParamsUI,
  updateNParams,
  onOpenTempWorkspace,
  exportedDrumConfigs,
  drumPatterns,
  drumKits,
  bassPatterns,
  bassPreviewContext,
  materialLoopPanelProps,
}: ResonanceGrooveBassPanelProps) {
  const workspace = useGrooveBassLibraryWorkspace({
    nParamsUI,
    updateNParams,
    exportedDrumConfigs,
    drumPatterns,
    bassPatterns,
  });
  const drumLaneKitOverrides = nParamsUI.drumLaneKits ?? {};
  const drumManagerControls = (
    <DrumManagerControls nParamsUI={nParamsUI} updateNParams={updateNParams} drumKits={drumKits} drumLaneKitOverrides={drumLaneKitOverrides} />
  );

  return (
    <>
      <ResonanceMaterialLoopPanel {...materialLoopPanelProps} />
      {workspace.drumManagerOpen ? (
        <DrumPatternManagerDialog
          entries={workspace.drumPlaylistEntries}
          activeEntry={workspace.activeDrumEntry}
          dragId={workspace.drumDragId}
          dropId={workspace.drumDropId}
          headerControl={<GrooveHeaderVolumeControl label="Drum Lautstärke" value={nParamsUI.drumVolume} onChange={(value) => updateNParams({ drumVolume: value })} />}
          detailControls={drumManagerControls}
          onClose={() => workspace.setDrumManagerOpen(false)}
          onSelectEntry={workspace.selectDrumEntry}
          onRenameEntry={workspace.handleRenameDrumEntry}
          onDeleteEntry={workspace.handleDeleteDrumEntry}
          onDragStart={workspace.handleDrumDragStart}
          onDragOver={workspace.handleDrumDragOver}
          onDrop={workspace.handleDrumDrop}
          onDragEnd={workspace.handleDrumDragEnd}
          onOpenDrumMachine={() => {
            primeDrumMachineWorkspaceIntent();
            workspace.setDrumManagerOpen(false);
            onOpenTempWorkspace();
          }}
        />
      ) : null}
      {workspace.bassManagerOpen ? (
        <BassPatternManagerDialog
          activeName={workspace.activeBassEntry?.label ?? 'Kein Bass Pattern'}
          nParamsUI={nParamsUI}
          updateNParams={updateNParams}
          bassPatterns={bassPatterns}
          bassPreviewContext={bassPreviewContext}
          bassClips={workspace.bassClipEntries}
          dragId={workspace.bassDragId}
          dropId={workspace.bassDropId}
          dragHud={workspace.bassDragHud}
          setDragHud={workspace.setBassDragHud}
          onDragStart={workspace.handleBassClipDragStart}
          onDragOver={workspace.handleBassClipDragOver}
          onDrop={workspace.handleBassClipDrop}
          onDragEnd={workspace.handleBassClipDragEnd}
          onSaveClip={workspace.handleSaveBassClip}
          onUpdateClip={workspace.handleUpdateBassClip}
          onRenameClip={workspace.handleRenameBassClip}
          onRemoveClip={workspace.handleRemoveBassClip}
          onSelectPreset={workspace.handleSelectBassPreset}
          onSelectClip={workspace.handleSelectBassClip}
          onClose={() => workspace.setBassManagerOpen(false)}
        />
      ) : null}
    </>
  );
}
