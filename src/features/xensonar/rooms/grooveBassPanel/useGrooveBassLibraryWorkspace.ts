import { useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react';
import { listenDrumPatternPlaylistUpdated } from '../../drumPatternPlaylistEventContract';
import type { DrumConfigEntry } from '../../drumConfigLibraryTypes';
import { encodePlaylistDropTarget, suppressNativePlaylistDragImage, type PlaylistDropOperation } from '../../material/playlistDropOperation';
import {
  hideDrumPlaylistEntry,
  moveDrumPlaylistEntryFromVisibleOrder,
  patchForDrumPlaylistEntry,
  readDrumPlaylistState,
  resolveActiveDrumPlaylistEntry,
  resolveDrumPlaylistEntries,
  updateDrumPlaylistAlias,
} from '../../drumPatternPlaylist';
import type { DrumPlaylistEntry } from '../../drumPatternPlaylistTypes';
import type { BassClip } from '../../groove/bassPatternEvents';
import {
  moveBassClip,
  readBassClipLibraryState,
  removeBassClip,
  renameBassClip,
  resolveBassClipLibraryClips,
  saveBassClipWorkcopy,
  updateBassClip,
} from '../../groove/bassClipLibrary';
import type { GrooveBassPanelNParams, UpdateResonanceNParams } from '../resonancePanelTypedContracts';
import type { PlaylistDragHudState } from '../PlaylistDragActionHud';
import { OPEN_BASS_PATTERN_MANAGER_EVENT, OPEN_DRUM_PATTERN_MANAGER_EVENT } from './grooveBassPanelWorkspaceIntent';

export function useGrooveBassLibraryWorkspace(args: {
  nParamsUI: GrooveBassPanelNParams;
  updateNParams: UpdateResonanceNParams;
  exportedDrumConfigs: DrumConfigEntry[];
  drumPatterns: Array<{ value: string; label: string }>;
  bassPatterns: Array<{ value: string; label: string }>;
}) {
  const { nParamsUI, updateNParams, exportedDrumConfigs, drumPatterns, bassPatterns } = args;
  const [drumPlaylistState, setDrumPlaylistState] = useState(() => readDrumPlaylistState());
  const [drumManagerOpen, setDrumManagerOpen] = useState(false);
  const [bassManagerOpen, setBassManagerOpen] = useState(false);
  const [bassClipLibraryState, setBassClipLibraryState] = useState(() => readBassClipLibraryState());
  const [bassDragId, setBassDragId] = useState('');
  const [bassDropId, setBassDropId] = useState('');
  const [bassDragHud, setBassDragHud] = useState<PlaylistDragHudState | null>(null);
  const [drumDragId, setDrumDragId] = useState('');
  const [drumDropId, setDrumDropId] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setDrumPlaylistState(readDrumPlaylistState());
    const openDrum = () => {
      sync();
      setDrumManagerOpen(true);
    };
    const openBass = () => setBassManagerOpen(true);
    const unlistenPlaylist = listenDrumPatternPlaylistUpdated(sync as EventListener);
    window.addEventListener(OPEN_DRUM_PATTERN_MANAGER_EVENT, openDrum);
    window.addEventListener(OPEN_BASS_PATTERN_MANAGER_EVENT, openBass);
    window.addEventListener('storage', sync);
    return () => {
      unlistenPlaylist();
      window.removeEventListener(OPEN_DRUM_PATTERN_MANAGER_EVENT, openDrum);
      window.removeEventListener(OPEN_BASS_PATTERN_MANAGER_EVENT, openBass);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const drumPlaylistEntries = useMemo(() => resolveDrumPlaylistEntries({
    drumPatterns,
    exportedDrumConfigs,
    state: drumPlaylistState,
  }), [drumPatterns, exportedDrumConfigs, drumPlaylistState]);

  const activeDrumEntry = useMemo(() => resolveActiveDrumPlaylistEntry({
    entries: drumPlaylistEntries,
    drumConfigMode: nParamsUI.drumConfigMode,
    drumPattern: nParamsUI.drumPattern,
    drumConfigId: nParamsUI.drumConfigId,
  }), [drumPlaylistEntries, nParamsUI.drumConfigMode, nParamsUI.drumPattern, nParamsUI.drumConfigId]);

  const activeBassEntry = bassPatterns.find((entry) => entry.value === nParamsUI.bassPattern) ?? null;
  const bassClipEntries = useMemo(() => resolveBassClipLibraryClips(bassClipLibraryState), [bassClipLibraryState]);

  const selectDrumEntry = (entry: DrumPlaylistEntry | null) => {
    if (entry) updateNParams(patchForDrumPlaylistEntry(entry));
  };
  const refreshDrumPlaylistState = () => setDrumPlaylistState(readDrumPlaylistState());
  const handleRenameDrumEntry = (entryId: string, name: string) => {
    updateDrumPlaylistAlias(entryId, name);
    refreshDrumPlaylistState();
  };
  const handleDeleteDrumEntry = (entryId: string) => {
    hideDrumPlaylistEntry(entryId);
    const nextState = readDrumPlaylistState();
    setDrumPlaylistState(nextState);
    const nextEntries = resolveDrumPlaylistEntries({ drumPatterns, exportedDrumConfigs, state: nextState });
    const fallback = nextEntries[0] ?? null;
    if (fallback && activeDrumEntry?.id === entryId) selectDrumEntry(fallback);
  };
  const handleDrumDragStart = (event: ReactDragEvent<HTMLElement>, entryId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entryId);
    suppressNativePlaylistDragImage(event.dataTransfer);
    setDrumDragId(entryId);
    setDrumDropId('');
  };
  const handleDrumDragOver = (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDrumDropId(encodePlaylistDropTarget(operation, entryId));
  };
  const handleDrumDrop = (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation, visibleOrderIds?: readonly string[], sessionDraggedId?: string) => {
    event.preventDefault();
    const draggedId = sessionDraggedId || drumDragId || event.dataTransfer.getData('text/plain');
    setDrumDragId('');
    setDrumDropId('');
    if (!draggedId || draggedId === entryId || !visibleOrderIds?.length) return;
    moveDrumPlaylistEntryFromVisibleOrder({ draggedId, targetId: entryId, operation, currentIds: visibleOrderIds });
    refreshDrumPlaylistState();
  };
  const handleDrumDragEnd = () => {
    setDrumDragId('');
    setDrumDropId('');
  };

  const refreshBassClipLibrary = () => setBassClipLibraryState(readBassClipLibraryState());
  const handleSaveBassClip = (clip: BassClip) => {
    const workcopy = saveBassClipWorkcopy(clip);
    refreshBassClipLibrary();
    return workcopy;
  };
  const handleUpdateBassClip = (clip: BassClip) => {
    updateBassClip(clip);
    refreshBassClipLibrary();
  };
  const handleRenameBassClip = (id: string, name: string) => {
    renameBassClip(id, name);
    refreshBassClipLibrary();
  };
  const handleRemoveBassClip = (id: string) => {
    removeBassClip(id);
    refreshBassClipLibrary();
    if (nParamsUI.bassClipId === id) updateNParams({ bassPatternMode: 'preset', bassClipId: '' });
  };
  const handleSelectBassPreset = (pattern: string) => updateNParams({ bassPatternMode: 'preset', bassClipId: '', bassPattern: pattern });
  const handleSelectBassClip = (clip: BassClip) => updateNParams({ bassPatternMode: 'clip', bassClipId: clip.id });
  const handleBassClipDragStart = (event: ReactDragEvent<HTMLElement>, entryId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entryId);
    suppressNativePlaylistDragImage(event.dataTransfer);
    setBassDragId(entryId);
    setBassDropId('');
  };
  const handleBassClipDragOver = (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation) => {
    if (!bassDragId || bassDragId === entryId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setBassDropId(encodePlaylistDropTarget(operation, entryId));
  };
  const handleBassClipDrop = (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation) => {
    event.preventDefault();
    const draggedId = bassDragId || event.dataTransfer.getData('text/plain');
    setBassDragId('');
    setBassDropId('');
    if (!draggedId || draggedId === entryId) return;
    moveBassClip({ draggedId, targetId: entryId, operation });
    refreshBassClipLibrary();
  };
  const handleBassClipDragEnd = () => {
    setBassDragId('');
    setBassDropId('');
  };

  return {
    drumManagerOpen, setDrumManagerOpen,
    bassManagerOpen, setBassManagerOpen,
    drumPlaylistEntries, activeDrumEntry,
    activeBassEntry, bassClipEntries,
    drumDragId, drumDropId,
    bassDragId, bassDropId,
    bassDragHud, setBassDragHud,
    selectDrumEntry,
    handleRenameDrumEntry,
    handleDeleteDrumEntry,
    handleDrumDragStart,
    handleDrumDragOver,
    handleDrumDrop,
    handleDrumDragEnd,
    handleSaveBassClip,
    handleUpdateBassClip,
    handleRenameBassClip,
    handleRemoveBassClip,
    handleSelectBassPreset,
    handleSelectBassClip,
    handleBassClipDragStart,
    handleBassClipDragOver,
    handleBassClipDrop,
    handleBassClipDragEnd,
  };
}
