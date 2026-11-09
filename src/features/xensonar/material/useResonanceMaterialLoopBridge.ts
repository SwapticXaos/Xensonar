import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { MyzelPostFxGroupId } from '../architecture/machineRoomTypes';
import { formatMaterialLoopBars, getEffectiveMaterialLoopBars, getMaterialLoopReferenceBpm } from './materialLoopMath';
import { useMaterialLoopController } from './useMaterialLoopController';
import { useRootFollowLoopBankController } from './useRootFollowLoopBankController';
import { useResonanceMaterialLoopPanelProps } from './useResonanceMaterialLoopPanelProps';
import { resolveMaterialLoopMyzelGroupTarget } from './materialLoopEffectResolvers';
import { resolveMaterialLoopBrowseTargetIndex } from './materialLoopBrowserUtils';
import type { RootFollowGranularSettings } from '../rootFollow/rootFollowGranularSettings';
import type { RootFollowImpulseRasterClockMode } from '../rootFollow/rootFollowImpulseRasterPolicy';
import type { DrumPattern } from '../domain/instrumentData';
import { recordRootFollowPlaybackTruthEvent } from '../rootFollow/rootFollowPlaybackTruthProbe';

type MaterialLoopBridgeUiState = {
  materialLoopActive: boolean;
  materialLoopId: string;
  materialLoopSyncToBeat: boolean;
  materialLoopTimeMode: 'normal' | 'double' | 'half';
  materialLoopVolume: number;
  rootFollowLoopActive: boolean;
  rootFollowLoopId: string;
  rootFollowLoopTimeMode: 'normal' | 'double' | 'half';
  rootFollowLoopVolume: number;
  rootFollowLoopGranulationMode: 'flowing' | 'grainy';
  rootFollowGranularSettings: RootFollowGranularSettings;
  rootFollowImpulsRasterEvery: number;
  rootFollowImpulsRasterCycleDiv: number;
  rootFollowImpulsRasterClockMode: RootFollowImpulseRasterClockMode;
  rootFollowImpulsRasterPattern: number[];
  resonanceHotkeyMode: 'material' | 'root-follow' | 'particle-classic';
  quantizeBpm: number;
  drumActive: boolean;
  drumPattern: DrumPattern;
  drumConfigMode: 'preset' | 'exported';
  drumConfigId: string;
  drumVolume: number;
};

type MaterialLoopUiPatch = Partial<MaterialLoopBridgeUiState>;

type RootFollowPreviewSnapshot = Pick<
  MaterialLoopBridgeUiState,
  | 'rootFollowLoopActive'
  | 'resonanceHotkeyMode'
  | 'drumActive'
  | 'drumPattern'
  | 'drumConfigMode'
  | 'drumConfigId'
  | 'drumVolume'
> & { startedFallbackBeat: boolean };

type ValidMyzelGroup = {
  id: MyzelPostFxGroupId;
  label: string;
};

type UseResonanceMaterialLoopBridgeArgs = {
  nParamsUI: MaterialLoopBridgeUiState;
  getCurrentMaterialLoopId: () => string;
  getCurrentMaterialLoopActive: () => boolean;
  updateNParams: (patch: MaterialLoopUiPatch) => void;
  clampIndex: (value: number, min: number, max: number) => number;
  hotkeyCount: number;
  validGroups: readonly ValidMyzelGroup[];
  myzelFollowForgeHandoff: boolean;
  setMyzelPostFxGroup: Dispatch<SetStateAction<MyzelPostFxGroupId>>;
  hotkeyLabels: readonly string[];
  getCurrentRootFollowAnchorHz: () => number;
  getDefaultRootFollowAnchorHz: () => number;
  setRootFollowAuditionPitchHz: (hz: number) => void;
};

export function useResonanceMaterialLoopBridge({
  nParamsUI,
  getCurrentMaterialLoopId,
  getCurrentMaterialLoopActive,
  updateNParams,
  clampIndex,
  hotkeyCount,
  validGroups,
  myzelFollowForgeHandoff,
  setMyzelPostFxGroup,
  hotkeyLabels,
  getCurrentRootFollowAnchorHz,
  getDefaultRootFollowAnchorHz,
  setRootFollowAuditionPitchHz,
}: UseResonanceMaterialLoopBridgeArgs) {
  const controller = useMaterialLoopController({
    materialLoopId: nParamsUI.materialLoopId,
    materialLoopActive: nParamsUI.materialLoopActive,
    getCurrentMaterialLoopId,
    getCurrentMaterialLoopActive,
    updateNParams,
    clampIndex,
    hotkeyCount,
    validGroups,
  });

  const rootFollowController = useRootFollowLoopBankController({
    exportedLoopMaterials: controller.allLoopMaterials,
    rootFollowLoopId: nParamsUI.rootFollowLoopId,
    updateNParams,
    hotkeyCount,
    getCurrentRootFollowAnchorHz,
    getDefaultRootFollowAnchorHz,
  });

  const [rootFollowPreviewActive, setRootFollowPreviewActive] = useState(false);
  const rootFollowPreviewSnapshotRef = useRef<RootFollowPreviewSnapshot | null>(null);
  const latestPreviewStateRef = useRef(nParamsUI);
  const rootFollowLoopBrowseArmedRef = useRef(false);

  useEffect(() => {
    latestPreviewStateRef.current = nParamsUI;
  }, [nParamsUI]);

  const stopRootFollowPreview = useCallback(() => {
    const snapshot = rootFollowPreviewSnapshotRef.current;
    if (!snapshot) {
      recordRootFollowPlaybackTruthEvent({
        stage: 'preview-gate-change',
        rootFollowPreviewActive: false,
        effectivePlaybackGate: false,
        detail: { source: 'stopRootFollowPreview-empty-snapshot' },
      });
      setRootFollowPreviewActive(false);
      return;
    }
    rootFollowPreviewSnapshotRef.current = null;
    recordRootFollowPlaybackTruthEvent({
      stage: 'preview-gate-change',
      rootFollowPreviewActive: false,
      effectivePlaybackGate: false,
      detail: { source: 'stopRootFollowPreview' },
    });
    setRootFollowPreviewActive(false);
    updateNParams({
      rootFollowLoopActive: snapshot.rootFollowLoopActive,
      resonanceHotkeyMode: snapshot.resonanceHotkeyMode,
      ...(snapshot.startedFallbackBeat
        ? {
            drumActive: snapshot.drumActive,
            drumPattern: snapshot.drumPattern,
            drumConfigMode: snapshot.drumConfigMode,
            drumConfigId: snapshot.drumConfigId,
            drumVolume: snapshot.drumVolume,
          }
        : null),
    });
  }, [updateNParams]);

  const toggleRootFollowPreview = useCallback(() => {
    if (rootFollowPreviewSnapshotRef.current) {
      stopRootFollowPreview();
      return;
    }
    const snapshotSource = latestPreviewStateRef.current;
    const startedFallbackBeat = !snapshotSource.drumActive;
    rootFollowPreviewSnapshotRef.current = {
      rootFollowLoopActive: snapshotSource.rootFollowLoopActive,
      resonanceHotkeyMode: snapshotSource.resonanceHotkeyMode,
      drumActive: snapshotSource.drumActive,
      drumPattern: snapshotSource.drumPattern,
      drumConfigMode: snapshotSource.drumConfigMode,
      drumConfigId: snapshotSource.drumConfigId,
      drumVolume: snapshotSource.drumVolume,
      startedFallbackBeat,
    };
    recordRootFollowPlaybackTruthEvent({
      stage: 'preview-gate-change',
      rootFollowPreviewActive: true,
      effectivePlaybackGate: true,
      rootFollowLoopActive: true,
      selectedEntryExists: !!rootFollowController.selectedRootFollowLoop,
      detail: { source: 'toggleRootFollowPreview', loopId: rootFollowController.selectedRootFollowLoop?.id ?? null },
    });
    setRootFollowPreviewActive(true);
    updateNParams({
      rootFollowLoopActive: true,
      resonanceHotkeyMode: 'root-follow',
      ...(startedFallbackBeat
        ? {
            drumActive: true,
            drumPattern: 'four_on_floor',
            drumConfigMode: 'preset',
            drumConfigId: '',
            drumVolume: Math.max(0.36, snapshotSource.drumVolume || 0),
          }
        : null),
    });
  }, [stopRootFollowPreview, updateNParams]);

  useEffect(() => {
    return () => {
      stopRootFollowPreview();
    };
  }, [stopRootFollowPreview]);

  useEffect(() => {
    setMyzelPostFxGroup((prev) => resolveMaterialLoopMyzelGroupTarget({
      followForgeHandoff: myzelFollowForgeHandoff,
      materialLoopActive: nParamsUI.materialLoopActive,
      effectiveLoopMyzelGroup: controller.effectiveLoopMyzelGroup,
      currentGroup: prev,
    }) ?? prev);
  }, [controller.effectiveLoopMyzelGroup, myzelFollowForgeHandoff, nParamsUI.materialLoopActive, setMyzelPostFxGroup]);

  const selectRootFollowLoopDirect = (entryId: string) => {
    const entry = rootFollowController.rootFollowLoopEntries.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    rootFollowLoopBrowseArmedRef.current = false;
    updateNParams({ rootFollowLoopId: entry.id, rootFollowLoopActive: true });
  };

  const toggleRootFollowLoopDirect = () => {
    rootFollowLoopBrowseArmedRef.current = false;
    updateNParams({ rootFollowLoopActive: !nParamsUI.rootFollowLoopActive });
  };

  const browseRootFollowLoopWithUmlaut = (key: 'ö' | 'ä') => {
    const entries = rootFollowController.rootFollowLoopEntries;
    if (!entries.length) return;
    const targetIndex = resolveMaterialLoopBrowseTargetIndex({
      entries,
      currentId: nParamsUI.rootFollowLoopId,
      browseArmed: rootFollowLoopBrowseArmedRef.current,
      key,
      directCount: hotkeyCount,
    });
    if (targetIndex < 0) return;
    const target = entries[targetIndex];
    if (!target) return;
    rootFollowLoopBrowseArmedRef.current = true;
    updateNParams({ rootFollowLoopId: target.id, rootFollowLoopActive: true });
  };

  const materialLoopPanelProps = useResonanceMaterialLoopPanelProps({
    nParamsUI,
    controller: {
      exportedLoopMaterials: controller.exportedLoopMaterials,
      recentLoopHotkeyEntries: controller.recentLoopHotkeyEntries,
      rootFollowLoopEntries: rootFollowController.rootFollowLoopEntries,
      recentRootFollowHotkeyEntries: rootFollowController.recentRootFollowHotkeyEntries,
      selectedLoopMaterial: controller.selectedLoopMaterial,
      selectedRootFollowLoop: rootFollowController.selectedRootFollowLoop,
      managedLoopMaterial: controller.managedLoopMaterial,
      managedLoopIndex: controller.managedLoopIndex,
      managedRootFollowLoopMaterial: rootFollowController.managedRootFollowLoopMaterial,
      managedRootFollowLoopIndex: rootFollowController.managedRootFollowLoopIndex,
      managedLoopInRootFollowBank: controller.managedLoopMaterial ? rootFollowController.isEntryInRootFollowLoopBank(controller.managedLoopMaterial.id) : false,
      selectedLoopHandoffProfile: controller.selectedLoopHandoffProfile,
      effectiveLoopMyzelGroup: controller.effectiveLoopMyzelGroup,
      materialLoopUiStatus: controller.materialLoopUiStatus,
      rootFollowLoopUiStatus: rootFollowController.rootFollowLoopUiStatus,
      rootFollowPreviewActive,
      toggleRootFollowPreview,
      stopRootFollowPreview,
      setRootFollowAuditionPitchHz,
      materialLoopRenameDraft: controller.materialLoopRenameDraft,
      materialLoopDragId: controller.materialLoopDragId,
      materialLoopDropId: controller.materialLoopDropId,
      rootFollowLoopRenameDraft: rootFollowController.rootFollowLoopRenameDraft,
      rootFollowLoopDragId: rootFollowController.rootFollowLoopDragId,
      rootFollowLoopDropId: rootFollowController.rootFollowLoopDropId,
      setMaterialLoopRenameDraft: controller.setMaterialLoopRenameDraft,
      setRootFollowLoopRenameDraft: rootFollowController.setRootFollowLoopRenameDraft,
      selectMaterialLoopDirect: controller.selectMaterialLoopDirect,
      closeMaterialLoopManager: controller.closeMaterialLoopManager,
      openMaterialLoopManager: controller.openMaterialLoopManager,
      activateManagedMaterialLoop: controller.activateManagedMaterialLoop,
      saveMaterialLoopRename: () => {
        void controller.saveMaterialLoopRename();
      },
      browseManagedMaterialLoop: controller.browseManagedMaterialLoop,
      shiftMaterialLoopOrder: (direction) => {
        void controller.shiftMaterialLoopOrder(direction);
      },
      deleteMaterialLoopDirect: (entryId) => {
        void controller.deleteMaterialLoopDirect(entryId);
      },
      handleMaterialLoopDragStart: controller.handleMaterialLoopDragStart,
      handleMaterialLoopDragOver: controller.handleMaterialLoopDragOver,
      handleMaterialLoopDrop: (event, entryId, operation, visibleOrderIds, sessionDraggedId) => {
        void controller.handleMaterialLoopDrop(event, entryId, operation, visibleOrderIds, sessionDraggedId);
      },
      handleMaterialLoopDragEnd: controller.handleMaterialLoopDragEnd,
      uploadMaterialLoopFile: controller.uploadMaterialLoopFile,
      uploadRootFollowLoopFile: rootFollowController.uploadRootFollowLoopFile,
      setRootFollowLoopAnchor: rootFollowController.setRootFollowLoopAnchor,
      stampCurrentRootFollowLoopAnchor: rootFollowController.stampCurrentRootFollowLoopAnchor,
      closeRootFollowLoopManager: rootFollowController.closeRootFollowLoopManager,
      openRootFollowLoopManager: rootFollowController.openRootFollowLoopManager,
      activateManagedRootFollowLoop: rootFollowController.activateManagedRootFollowLoop,
      saveRootFollowLoopRename: rootFollowController.saveRootFollowLoopRename,
      browseManagedRootFollowLoop: rootFollowController.browseManagedRootFollowLoop,
      shiftRootFollowLoopOrder: rootFollowController.shiftRootFollowLoopOrder,
      deleteManagedRootFollowLoop: rootFollowController.deleteManagedRootFollowLoop,
      handleRootFollowLoopDragStart: rootFollowController.handleRootFollowLoopDragStart,
      handleRootFollowLoopDragOver: rootFollowController.handleRootFollowLoopDragOver,
      handleRootFollowLoopDrop: rootFollowController.handleRootFollowLoopDrop,
      handleRootFollowLoopDragEnd: rootFollowController.handleRootFollowLoopDragEnd,
      sendManagedMaterialLoopToRootFollow: (entryId) => rootFollowController.addToRootFollowLoopBank(entryId),
    },
    myzelGroups: validGroups,
    updateNParams,
    hotkeyLabels,
    referenceBpm: getMaterialLoopReferenceBpm(),
    formatMaterialLoopBars,
    getEffectiveMaterialLoopBars,
  });

  return {
    recentLoopHotkeyEntries: controller.recentLoopHotkeyEntries,
    recentRootFollowHotkeyEntries: rootFollowController.recentRootFollowHotkeyEntries,
    selectedLoopMaterial: controller.selectedLoopMaterial,
    selectedRootFollowLoop: rootFollowController.selectedRootFollowLoop,
    selectedRootFollowLoopConfig: rootFollowController.selectedRootFollowLoopConfig,
    managedLoopMaterial: controller.managedLoopMaterial,
    selectedLoopHandoffProfile: controller.selectedLoopHandoffProfile,
    rootFollowPreviewActive,
    materialLoopPanelProps,
    selectMaterialLoopDirect: controller.selectMaterialLoopDirect,
    toggleMaterialLoopDirect: controller.toggleMaterialLoopDirect,
    browseMaterialLoopWithUmlaut: controller.browseMaterialLoopWithUmlaut,
    selectRootFollowLoopDirect,
    toggleRootFollowLoopDirect,
    browseRootFollowLoopWithUmlaut,
  };
}
