import { useMemo, type ComponentProps, type DragEvent as ReactDragEvent } from 'react';
import type { PlaylistDropOperation } from './playlistDropOperation';
import type { MachineRoomHandoffProfile, MyzelPostFxGroupId } from '../architecture/machineRoomTypes';
import { ResonanceMaterialLoopPanel } from '../rooms/ResonanceMaterialLoopPanel';
import type { MaterialEntry } from '../../l3lab/materialLibrary';
import { AUDIO_CUT_UPLOAD_SOURCES, createAudioCutUploadEntryRequest, dispatchAudioCutUploadEntryRequest } from '../domain/audioCutUploadEntryRequest';
import { markCutUploadHandoffWindowScrollRestoreSuppressed } from '../domain/cutUploadHandoffWindowScroll';
import { buildRootFollowPanelProps } from './buildRootFollowPanelProps';
import type { MaterialLoopLaneUiState, RootFollowLoopLaneUiState } from './loopLaneUiState';

type MyzelGroupOption = {
  id: MyzelPostFxGroupId;
  label: string;
};

type ResonanceHotkeyMode = 'material' | 'root-follow' | 'particle-classic';

type MaterialLoopPanelUiState = {
  materialLoopActive: MaterialLoopLaneUiState['active'];
  materialLoopId: MaterialLoopLaneUiState['id'];
  materialLoopSyncToBeat: MaterialLoopLaneUiState['syncToBeat'];
  materialLoopTimeMode: MaterialLoopLaneUiState['timeMode'];
  materialLoopVolume: MaterialLoopLaneUiState['volume'];
  rootFollowLoopActive: RootFollowLoopLaneUiState['active'];
  rootFollowLoopId: RootFollowLoopLaneUiState['id'];
  rootFollowLoopTimeMode: RootFollowLoopLaneUiState['timeMode'];
  rootFollowLoopVolume: RootFollowLoopLaneUiState['volume'];
  rootFollowLoopGranulationMode: RootFollowLoopLaneUiState['granulationMode'];
  rootFollowGranularSettings: RootFollowLoopLaneUiState['granularSettings'];
  rootFollowImpulsRasterEvery: RootFollowLoopLaneUiState['impulsRasterEvery'];
  rootFollowImpulsRasterCycleDiv: RootFollowLoopLaneUiState['impulsRasterCycleDiv'];
  rootFollowImpulsRasterClockMode: RootFollowLoopLaneUiState['impulsRasterClockMode'];
  rootFollowImpulsRasterPattern: RootFollowLoopLaneUiState['impulsRasterPattern'];
  resonanceHotkeyMode: ResonanceHotkeyMode;
  quantizeBpm: number;
};

type MaterialLoopUiPatch = Partial<MaterialLoopPanelUiState>;

type MaterialLoopControllerBindings = {
  exportedLoopMaterials: MaterialEntry[];
  recentLoopHotkeyEntries: MaterialEntry[];
  rootFollowLoopEntries: MaterialEntry[];
  recentRootFollowHotkeyEntries: MaterialEntry[];
  selectedLoopMaterial: MaterialEntry | null;
  selectedRootFollowLoop: MaterialEntry | null;
  managedLoopMaterial: MaterialEntry | null;
  managedLoopIndex: number;
  managedRootFollowLoopMaterial: MaterialEntry | null;
  managedRootFollowLoopIndex: number;
  managedLoopInRootFollowBank: boolean;
  selectedLoopHandoffProfile: MachineRoomHandoffProfile | null;
  effectiveLoopMyzelGroup: MyzelPostFxGroupId | null;
  materialLoopUiStatus: string;
  rootFollowLoopUiStatus: string;
  rootFollowPreviewActive: boolean;
  toggleRootFollowPreview: () => void;
  stopRootFollowPreview: () => void;
  setRootFollowAuditionPitchHz: (hz: number) => void;
  materialLoopRenameDraft: string;
  materialLoopDragId: string;
  materialLoopDropId: string;
  rootFollowLoopRenameDraft: string;
  rootFollowLoopDragId: string;
  rootFollowLoopDropId: string;
  setMaterialLoopRenameDraft: (value: string) => void;
  setRootFollowLoopRenameDraft: (value: string) => void;
  selectMaterialLoopDirect: (entryId: string) => void;
  closeMaterialLoopManager: () => void;
  openMaterialLoopManager: (entryId?: string) => void;
  activateManagedMaterialLoop: (entryId: string) => void;
  saveMaterialLoopRename: () => void;
  browseManagedMaterialLoop: (direction: -1 | 1) => void;
  shiftMaterialLoopOrder: (direction: -1 | 1) => void;
  deleteMaterialLoopDirect: (entryId: string) => void;
  handleMaterialLoopDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  handleMaterialLoopDragOver: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation) => void;
  handleMaterialLoopDrop: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation, visibleOrderIds?: readonly string[], sessionDraggedId?: string) => void;
  handleMaterialLoopDragEnd: () => void;
  closeRootFollowLoopManager: () => void;
  openRootFollowLoopManager: (entryId?: string) => void;
  activateManagedRootFollowLoop: (entryId: string) => void;
  saveRootFollowLoopRename: () => void;
  browseManagedRootFollowLoop: (direction: -1 | 1) => void;
  shiftRootFollowLoopOrder: (direction: -1 | 1) => void;
  deleteManagedRootFollowLoop: (entryId: string) => void;
  handleRootFollowLoopDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  handleRootFollowLoopDragOver: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation) => void;
  handleRootFollowLoopDrop: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation, visibleOrderIds?: readonly string[], sessionDraggedId?: string) => void;
  handleRootFollowLoopDragEnd: () => void;
  sendManagedMaterialLoopToRootFollow: (entryId: string) => void;
  uploadMaterialLoopFile: (file: File, bars: number) => Promise<void>;
  uploadRootFollowLoopFile: (file: File, bars: number) => Promise<void>;
  setRootFollowLoopAnchor: (entryId: string, rootHz: number | null) => void;
  stampCurrentRootFollowLoopAnchor: (entryId: string) => void;
};

type UseResonanceMaterialLoopPanelPropsArgs = {
  nParamsUI: MaterialLoopPanelUiState;
  controller: MaterialLoopControllerBindings;
  myzelGroups: readonly MyzelGroupOption[];
  updateNParams: (patch: MaterialLoopUiPatch) => void;
  hotkeyLabels: readonly string[];
  referenceBpm: number;
  formatMaterialLoopBars: (bars: number | null | undefined) => string;
  getEffectiveMaterialLoopBars: (entry: { bars: number } | null, mode: 'normal' | 'double' | 'half') => number;
};

export function useResonanceMaterialLoopPanelProps({
  nParamsUI,
  controller,
  myzelGroups,
  updateNParams,
  hotkeyLabels,
  referenceBpm,
  formatMaterialLoopBars,
  getEffectiveMaterialLoopBars,
}: UseResonanceMaterialLoopPanelPropsArgs): ComponentProps<typeof ResonanceMaterialLoopPanel> {
  return useMemo(() => {
    const effectiveLoopMyzelGroupLabel = controller.effectiveLoopMyzelGroup
      ? (myzelGroups.find((entry) => entry.id === controller.effectiveLoopMyzelGroup)?.label ?? controller.effectiveLoopMyzelGroup)
      : '—';

    const selectedLoopRouteSummary =
      controller.selectedLoopMaterial?.routeSummary
      ?? controller.selectedLoopHandoffProfile?.routeSummary
      ?? 'Noch keine explizite Handoff-Summary vorhanden.';

    const selectedLoopStabilizeBy =
      controller.selectedLoopMaterial?.stabilizeBy
      ?? controller.selectedLoopHandoffProfile?.stabilizeBy
      ?? '';

    return {
      materialLoopActive: nParamsUI.materialLoopActive,
      materialLoopId: nParamsUI.materialLoopId,
      materialLoopSyncToBeat: nParamsUI.materialLoopSyncToBeat,
      materialLoopTimeMode: nParamsUI.materialLoopTimeMode,
      materialLoopVolume: nParamsUI.materialLoopVolume,
      ...buildRootFollowPanelProps({ nParamsUI, controller, updateNParams }),
      quantizeBpm: nParamsUI.quantizeBpm,
      exportedLoopMaterials: controller.exportedLoopMaterials,
      recentLoopHotkeyEntries: controller.recentLoopHotkeyEntries,
      materialLoopUiStatus: controller.materialLoopUiStatus,
      managedLoopMaterial: controller.managedLoopMaterial,
      managedLoopIndex: controller.managedLoopIndex,
      managedLoopInRootFollowBank: controller.managedLoopInRootFollowBank,
      materialLoopRenameDraft: controller.materialLoopRenameDraft,
      materialLoopDragId: controller.materialLoopDragId,
      materialLoopDropId: controller.materialLoopDropId,
      selectedLoopMaterial: controller.selectedLoopMaterial,
      effectiveLoopMyzelGroupLabel,
      selectedLoopRouteSummary,
      selectedLoopStabilizeBy,
      hotkeyLabels,
      referenceBpm,
      onMaterialLoopActiveChange: (value) => updateNParams({ materialLoopActive: value }),
      onOpenMaterialLoopManager: controller.openMaterialLoopManager,
      onMaterialLoopIdChange: (value) => updateNParams({ materialLoopId: value }),
      onMaterialLoopSyncToBeatChange: (value) => updateNParams({ materialLoopSyncToBeat: value }),
      onMaterialLoopTimeModeChange: (value) => updateNParams({ materialLoopTimeMode: value }),
      onMaterialLoopVolumeChange: (value) => updateNParams({ materialLoopVolume: value }),
      onSelectMaterialLoopDirect: controller.selectMaterialLoopDirect,
      onUploadMaterialLoopFile: controller.uploadMaterialLoopFile,
      onUploadRootFollowLoopFile: controller.uploadRootFollowLoopFile,
      onAudioUploadAndCutFile: (file, source = AUDIO_CUT_UPLOAD_SOURCES.MATERIAL_TRACK_MANAGER) => {
        const request = createAudioCutUploadEntryRequest(file, source);
        markCutUploadHandoffWindowScrollRestoreSuppressed();
        controller.closeMaterialLoopManager();
        controller.closeRootFollowLoopManager();
        window.requestAnimationFrame(() => {
          dispatchAudioCutUploadEntryRequest(request);
        });
      },
      onCloseMaterialLoopManager: controller.closeMaterialLoopManager,
      onActivateManagedMaterialLoop: controller.activateManagedMaterialLoop,
      onBrowseManagedMaterialLoop: controller.browseManagedMaterialLoop,
      onMaterialLoopRenameDraftChange: controller.setMaterialLoopRenameDraft,
      onSaveMaterialLoopRename: controller.saveMaterialLoopRename,
      onShiftMaterialLoopOrder: controller.shiftMaterialLoopOrder,
      onDeleteManagedMaterialLoop: controller.deleteMaterialLoopDirect,
      onMaterialLoopDragStart: controller.handleMaterialLoopDragStart,
      onMaterialLoopDragOver: controller.handleMaterialLoopDragOver,
      onMaterialLoopDrop: controller.handleMaterialLoopDrop,
      onMaterialLoopDragEnd: controller.handleMaterialLoopDragEnd,
      formatMaterialLoopBars,
      getEffectiveMaterialLoopBars,
    };
  }, [
    controller,
    formatMaterialLoopBars,
    getEffectiveMaterialLoopBars,
    hotkeyLabels,
    myzelGroups,
    nParamsUI,
    referenceBpm,
    updateNParams,
  ]);
}
