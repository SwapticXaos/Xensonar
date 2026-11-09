import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import { listenMaterialLibraryEvent } from '../../l3lab/materialLibraryEventContract';
import type { MyzelPostFxGroupId } from '../architecture/machineRoomTypes';
import { useMaterialLoopLibraryState } from './useMaterialLoopLibraryState';
import {
  browseMaterialLoopWithState as browseMaterialLoopWithStateAction,
  selectMaterialLoopDirect as selectMaterialLoopDirectAction,
  toggleMaterialLoopDirect as toggleMaterialLoopDirectAction,
} from './materialLoopDirectActions';
import {
  activateManagedMaterialLoop as activateManagedMaterialLoopAction,
  browseManagedMaterialLoop as browseManagedMaterialLoopAction,
  closeMaterialLoopManager as closeMaterialLoopManagerAction,
  deleteMaterialLoopDirect as deleteMaterialLoopDirectAction,
  moveMaterialLoopToIndex as moveMaterialLoopToIndexAction,
  openMaterialLoopManager as openMaterialLoopManagerAction,
  saveMaterialLoopRename as saveMaterialLoopRenameAction,
  shiftMaterialLoopOrder as shiftMaterialLoopOrderAction,
} from './materialLoopManagerActions';
import {
  handleMaterialLoopDragEnd as handleMaterialLoopDragEndAction,
  handleMaterialLoopDragOver as handleMaterialLoopDragOverAction,
  handleMaterialLoopDragStart as handleMaterialLoopDragStartAction,
  handleMaterialLoopDrop as handleMaterialLoopDropAction,
} from './materialLoopDragWorkflow';
import { createMaterialDeletedHandler, createMaterialRegisteredHandler } from './materialLoopLibraryEvents';
import { resolveMaterialLoopRenameDraftValue } from './materialLoopEffectResolvers';
import { resolveMaterialLoopSelectionPatch } from './materialLoopPlaybackWorkflow';
import { registerUploadedAudioLoop } from './materialLoopUploadActions';
import type { PlaylistDropOperation } from './playlistDropOperation';

type MaterialLoopPatch = {
  materialLoopId?: string;
  materialLoopActive?: boolean;
};

type ValidMyzelGroup = { id: MyzelPostFxGroupId };

type UseMaterialLoopControllerArgs = {
  materialLoopId: string;
  materialLoopActive: boolean;
  getCurrentMaterialLoopId: () => string;
  getCurrentMaterialLoopActive: () => boolean;
  updateNParams: (patch: MaterialLoopPatch) => void;
  clampIndex: (value: number, min: number, max: number) => number;
  hotkeyCount: number;
  validGroups: readonly ValidMyzelGroup[];
};

export function useMaterialLoopController(args: UseMaterialLoopControllerArgs) {
  const {
    materialLoopId,
    materialLoopActive,
    getCurrentMaterialLoopId,
    getCurrentMaterialLoopActive,
    updateNParams,
    clampIndex,
    hotkeyCount,
    validGroups,
  } = args;

  const [materialLoopUiStatus, setMaterialLoopUiStatus] = useState('');
  const [materialLoopManageId, setMaterialLoopManageId] = useState('');
  const [materialLoopRenameDraft, setMaterialLoopRenameDraft] = useState('');
  const [materialLoopDragId, setMaterialLoopDragId] = useState('');
  const [materialLoopDropId, setMaterialLoopDropId] = useState('');

  const materialLoopBrowseArmedRef = useRef(false);
  const pendingRegisteredLoopIdRef = useRef('');

  const {
    allLoopMaterials,
    exportedLoopMaterials,
    recentLoopHotkeyEntries,
    selectedLoopMaterial,
    managedLoopMaterial,
    managedLoopIndex,
    selectedLoopHandoffProfile,
    effectiveLoopMyzelGroup,
  } = useMaterialLoopLibraryState({
    materialLoopId,
    manageId: materialLoopManageId,
    hotkeyCount,
    validGroups,
  });

  const selectMaterialLoopDirect = (entryId: string, source: 'ui' | 'hotkey' | 'browser' = 'ui') => {
    const didSelect = selectMaterialLoopDirectAction({
      entries: exportedLoopMaterials,
      entryId,
      source,
      updateNParams,
      setStatus: setMaterialLoopUiStatus,
      setBrowseArmed: (armed) => {
        materialLoopBrowseArmedRef.current = armed;
      },
    });
    if (!didSelect || !materialLoopManageId) return;
    const selectedEntry = exportedLoopMaterials.find((entry) => entry.id === entryId);
    if (!selectedEntry) return;
    setMaterialLoopManageId(selectedEntry.id);
    setMaterialLoopRenameDraft(resolveMaterialLoopRenameDraftValue(selectedEntry));
  };

  const toggleMaterialLoopDirect = () => {
    toggleMaterialLoopDirectAction({
      currentActive: getCurrentMaterialLoopActive(),
      updateNParams,
      setStatus: setMaterialLoopUiStatus,
      setBrowseArmed: (armed) => {
        materialLoopBrowseArmedRef.current = armed;
      },
    });
  };

  const closeMaterialLoopManager = () => {
    closeMaterialLoopManagerAction({
      setManageId: setMaterialLoopManageId,
      setRenameDraft: setMaterialLoopRenameDraft,
      setDragId: setMaterialLoopDragId,
      setDropId: setMaterialLoopDropId,
    });
  };

  const openMaterialLoopManager = (entryId?: string) => {
    openMaterialLoopManagerAction({
      entries: exportedLoopMaterials,
      requestedId: entryId,
      activeId: getCurrentMaterialLoopId(),
      setters: {
        setManageId: setMaterialLoopManageId,
        setRenameDraft: setMaterialLoopRenameDraft,
      },
    });
  };

  const activateManagedMaterialLoop = (entryId: string) => {
    activateManagedMaterialLoopAction({
      entries: exportedLoopMaterials,
      entryId,
      setters: {
        setManageId: setMaterialLoopManageId,
        setRenameDraft: setMaterialLoopRenameDraft,
        setStatus: setMaterialLoopUiStatus,
      },
      onSelect: (id) => selectMaterialLoopDirect(id, 'browser'),
    });
  };

  const saveMaterialLoopRename = async () => {
    await saveMaterialLoopRenameAction({
      managedLoopMaterial,
      renameDraft: materialLoopRenameDraft,
      setters: {
        setRenameDraft: setMaterialLoopRenameDraft,
        setStatus: setMaterialLoopUiStatus,
      },
    });
  };

  const browseManagedMaterialLoop = (direction: -1 | 1) => {
    browseManagedMaterialLoopAction({
      entries: exportedLoopMaterials,
      managedIndex: managedLoopIndex,
      activeId: getCurrentMaterialLoopId(),
      direction,
      setters: {
        setManageId: setMaterialLoopManageId,
        setRenameDraft: setMaterialLoopRenameDraft,
        setStatus: setMaterialLoopUiStatus,
      },
      onSelect: (id) => selectMaterialLoopDirect(id, 'browser'),
    });
  };

  const shiftMaterialLoopOrder = async (direction: -1 | 1) => {
    await shiftMaterialLoopOrderAction({
      managedLoopMaterial,
      direction,
      setters: {
        setManageId: setMaterialLoopManageId,
        setRenameDraft: setMaterialLoopRenameDraft,
        setStatus: setMaterialLoopUiStatus,
      },
      onSelect: (id) => selectMaterialLoopDirect(id, 'browser'),
    });
  };

  const moveMaterialLoopToIndex = async (entryId: string, targetIndex: number, operation: PlaylistDropOperation = 'insert-before', visibleOrderIds?: readonly string[]) => {
    await moveMaterialLoopToIndexAction({
      entryId,
      targetIndex,
      operation,
      visibleOrderIds,
      clampIndex,
      setters: {
        setManageId: setMaterialLoopManageId,
        setRenameDraft: setMaterialLoopRenameDraft,
        setStatus: setMaterialLoopUiStatus,
      },
      onSelect: (id) => selectMaterialLoopDirect(id, 'browser'),
    });
  };

  const deleteMaterialLoopDirect = async (entryId: string) => {
    await deleteMaterialLoopDirectAction({
      entries: exportedLoopMaterials,
      entryId,
      setters: {
        setManageId: setMaterialLoopManageId,
        setRenameDraft: setMaterialLoopRenameDraft,
        setDragId: setMaterialLoopDragId,
        setDropId: setMaterialLoopDropId,
        setStatus: setMaterialLoopUiStatus,
      },
      onSelect: (id) => selectMaterialLoopDirect(id, 'browser'),
    });
  };

  const handleMaterialLoopDragStart = (event: ReactDragEvent<HTMLElement>, entryId: string) => {
    handleMaterialLoopDragStartAction({
      event,
      entryId,
      setDragId: setMaterialLoopDragId,
      setDropId: setMaterialLoopDropId,
    });
  };

  const handleMaterialLoopDragOver = (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation = 'swap') => {
    handleMaterialLoopDragOverAction({
      event,
      entryId,
      operation,
      dropId: materialLoopDropId,
      setDropId: setMaterialLoopDropId,
    });
  };

  const handleMaterialLoopDrop = async (event: ReactDragEvent<HTMLElement>, targetId: string, operation: PlaylistDropOperation = 'swap', visibleOrderIds?: readonly string[], sessionDraggedId?: string) => {
    await handleMaterialLoopDropAction({
      event,
      targetId,
      operation,
      dragId: materialLoopDragId,
      sessionDraggedId,
      setDragId: setMaterialLoopDragId,
      setDropId: setMaterialLoopDropId,
      visibleOrderIds,
      onMoveToIndex: moveMaterialLoopToIndex,
    });
  };

  const handleMaterialLoopDragEnd = () => {
    handleMaterialLoopDragEndAction({
      setDragId: setMaterialLoopDragId,
      setDropId: setMaterialLoopDropId,
    });
  };

  const uploadMaterialLoopFile = async (file: File, bars: number) => {
    try {
      setMaterialLoopUiStatus('Loop-Upload liest Audiodatei …');
      const entry = await registerUploadedAudioLoop({ file, bars, target: 'material' });
      updateNParams({ materialLoopId: entry.id, materialLoopActive: true });
      setMaterialLoopManageId(entry.id);
      setMaterialLoopRenameDraft(entry.name);
      setMaterialLoopUiStatus(`Loop hochgeladen: ${entry.name} · ${entry.bars} Takte.`);
    } catch (error) {
      console.error('[xensonar][material-loop-upload]', error);
      setMaterialLoopUiStatus(error instanceof Error ? error.message : 'Loop-Upload fehlgeschlagen.');
    }
  };

  const browseMaterialLoopWithUmlaut = (key: 'ö' | 'ä') => {
    browseMaterialLoopWithStateAction({
      entries: exportedLoopMaterials,
      currentId: getCurrentMaterialLoopId(),
      key,
      directCount: hotkeyCount,
      browseArmed: materialLoopBrowseArmedRef.current,
      updateNParams,
      setStatus: setMaterialLoopUiStatus,
      setBrowseArmed: (armed) => {
        materialLoopBrowseArmedRef.current = armed;
      },
    });
  };

  useEffect(() => {
    const nextDraft = resolveMaterialLoopRenameDraftValue(managedLoopMaterial);
    if (!nextDraft) return;
    setMaterialLoopRenameDraft(nextDraft);
  }, [managedLoopMaterial]);

  useEffect(() => {
    const selectionState = resolveMaterialLoopSelectionPatch({
      entries: exportedLoopMaterials,
      currentId: getCurrentMaterialLoopId(),
      currentActive: getCurrentMaterialLoopActive(),
      pendingRegisteredId: pendingRegisteredLoopIdRef.current,
    });
    if (selectionState.clearPendingRegisteredId) pendingRegisteredLoopIdRef.current = '';
    if (selectionState.patch) updateNParams(selectionState.patch);
  }, [exportedLoopMaterials, materialLoopActive, materialLoopId, updateNParams]);

  useEffect(() => {
    const handleRegistered = createMaterialRegisteredHandler({
      pendingRegisteredLoopIdRef,
      updateNParams,
      setStatus: setMaterialLoopUiStatus,
    });
    const handleDeleted = createMaterialDeletedHandler({
      pendingRegisteredLoopIdRef,
      currentMaterialLoopId: getCurrentMaterialLoopId,
      currentMaterialLoopActive: getCurrentMaterialLoopActive,
      updateNParams,
      setStatus: setMaterialLoopUiStatus,
    });
    const unlistenRegistered = listenMaterialLibraryEvent('registered', (_detail, event) => handleRegistered(event));
    const unlistenDeleted = listenMaterialLibraryEvent('deleted', (_detail, event) => handleDeleted(event));
    return () => {
      unlistenRegistered();
      unlistenDeleted();
    };
  }, [materialLoopActive, materialLoopId, updateNParams]);

  return {
    materialLoopUiStatus,
    materialLoopRenameDraft,
    materialLoopDragId,
    materialLoopDropId,
    allLoopMaterials,
    exportedLoopMaterials,
    recentLoopHotkeyEntries,
    selectedLoopMaterial,
    managedLoopMaterial,
    managedLoopIndex,
    selectedLoopHandoffProfile,
    effectiveLoopMyzelGroup,
    setMaterialLoopRenameDraft,
    selectMaterialLoopDirect,
    toggleMaterialLoopDirect,
    closeMaterialLoopManager,
    openMaterialLoopManager,
    activateManagedMaterialLoop,
    saveMaterialLoopRename,
    browseManagedMaterialLoop,
    shiftMaterialLoopOrder,
    deleteMaterialLoopDirect,
    uploadMaterialLoopFile,
    handleMaterialLoopDragStart,
    handleMaterialLoopDragOver,
    handleMaterialLoopDrop,
    handleMaterialLoopDragEnd,
    browseMaterialLoopWithUmlaut,
  };
}
