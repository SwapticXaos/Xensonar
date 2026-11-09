import { listenXensonarEvent } from '../runtime/xensonarEventChannels';
import { useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react';
import { updateMaterialEntry, type MaterialEntry } from '../../l3lab/materialLibrary';
import { reportXensonarPromiseFailure } from '../diagnostics/runtimeIssueReporter';
import { registerUploadedAudioLoop } from './materialLoopUploadActions';
import { readPersistedRootFollowBank, writePersistedRootFollowBank, type PersistedRootFollowBank } from './rootFollowBankStorage';
import { DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG, normalizeRootFollowBankEntryConfig, rootFollowBankEntryConfigEquals, type RootFollowBankEntryConfig } from '../rootFollow/rootFollowTypes';
import { normalizeRootFollowAnchorHz } from '../rootFollow/rootFollowAnchorMode';
import { encodePlaylistDropTarget, playlistOrderEquals, reorderPlaylistIds, suppressNativePlaylistDragImage, type PlaylistDropOperation } from './playlistDropOperation';

function sameBankState(a: PersistedRootFollowBank, b: PersistedRootFollowBank) {
  return a.memberIds.length === b.memberIds.length
    && a.memberIds.every((id, index) => id === b.memberIds[index])
    && a.orderedIds.length === b.orderedIds.length
    && a.orderedIds.every((id, index) => id === b.orderedIds[index])
    && Object.keys(a.aliases).length === Object.keys(b.aliases).length
    && Object.entries(a.aliases).every(([id, value]) => b.aliases[id] === value)
    && Object.keys(a.entryConfigs).length === Object.keys(b.entryConfigs).length
    && Object.entries(a.entryConfigs).every(([id, value]) => {
      const candidate = b.entryConfigs[id];
      return candidate ? rootFollowBankEntryConfigEquals(candidate, value) : false;
    });
}


function moveEntry(ids: readonly string[], entryId: string, targetId: string, operation: PlaylistDropOperation) {
  return reorderPlaylistIds({ ids, draggedId: entryId, targetId, operation });
}


export type RootFollowLoopBankController = {
  rootFollowLoopEntries: MaterialEntry[];
  recentRootFollowHotkeyEntries: MaterialEntry[];
  selectedRootFollowLoop: MaterialEntry | null;
  selectedRootFollowLoopConfig: RootFollowBankEntryConfig | null;
  rootFollowLoopUiStatus: string;
  managedRootFollowLoopMaterial: MaterialEntry | null;
  managedRootFollowLoopIndex: number;
  rootFollowLoopRenameDraft: string;
  rootFollowLoopDragId: string;
  rootFollowLoopDropId: string;
  setRootFollowLoopRenameDraft: (value: string) => void;
  openRootFollowLoopManager: (entryId?: string) => void;
  closeRootFollowLoopManager: () => void;
  activateManagedRootFollowLoop: (entryId: string) => void;
  saveRootFollowLoopRename: () => void;
  browseManagedRootFollowLoop: (direction: -1 | 1) => void;
  shiftRootFollowLoopOrder: (direction: -1 | 1) => void;
  deleteManagedRootFollowLoop: (entryId: string) => void;
  handleRootFollowLoopDragStart: (event: ReactDragEvent<HTMLElement>, entryId: string) => void;
  handleRootFollowLoopDragOver: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation) => void;
  handleRootFollowLoopDrop: (event: ReactDragEvent<HTMLElement>, entryId: string, operation?: PlaylistDropOperation, visibleOrderIds?: readonly string[], sessionDraggedId?: string) => void;
  handleRootFollowLoopDragEnd: () => void;
  addToRootFollowLoopBank: (entryId: string) => void;
  uploadRootFollowLoopFile: (file: File, bars: number) => Promise<void>;
  setRootFollowLoopAnchor: (entryId: string, rootHz: number | null) => void;
  stampCurrentRootFollowLoopAnchor: (entryId: string) => void;
  isEntryInRootFollowLoopBank: (entryId: string) => boolean;
};

type UseRootFollowLoopBankControllerArgs = {
  exportedLoopMaterials: MaterialEntry[];
  rootFollowLoopId: string;
  updateNParams: (patch: { rootFollowLoopId?: string; rootFollowLoopActive?: boolean }) => void;
  hotkeyCount: number;
  getCurrentRootFollowAnchorHz: () => number;
  getDefaultRootFollowAnchorHz: () => number;
};

export function useRootFollowLoopBankController({
  exportedLoopMaterials,
  rootFollowLoopId,
  updateNParams,
  hotkeyCount,
  getCurrentRootFollowAnchorHz,
  getDefaultRootFollowAnchorHz,
}: UseRootFollowLoopBankControllerArgs): RootFollowLoopBankController {
  const [bankState, setBankState] = useState<PersistedRootFollowBank>(() => readPersistedRootFollowBank());
  const [rootFollowLoopUiStatus, setRootFollowLoopUiStatus] = useState('');
  const [manageId, setManageId] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [dragId, setDragId] = useState('');
  const [dropId, setDropId] = useState('');

  useEffect(() => {
    setBankState((prev) => {
      const preferredIds = exportedLoopMaterials.filter((entry) => entry.rootFollowPreferred).map((entry) => entry.id);
      const nextMemberIds = Array.from(new Set([...prev.memberIds, ...preferredIds]));
      const preservedIds = prev.orderedIds.filter((id) => nextMemberIds.includes(id));
      const appendedIds = nextMemberIds.filter((id) => !preservedIds.includes(id));
      const nextOrderedIds = [...preservedIds, ...appendedIds];
      const nextAliases = Object.fromEntries(Object.entries(prev.aliases).filter(([id]) => nextMemberIds.includes(id)));
      const nextEntryConfigs = Object.fromEntries(
        nextMemberIds.map((id) => [id, prev.entryConfigs[id] ?? DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG] as const),
      );
      if (
        nextMemberIds.length === prev.memberIds.length
        && nextMemberIds.every((id, index) => id === prev.memberIds[index])
        && nextOrderedIds.length === prev.orderedIds.length
        && nextOrderedIds.every((id, index) => id === prev.orderedIds[index])
        && Object.keys(nextAliases).length === Object.keys(prev.aliases).length
        && Object.entries(nextAliases).every(([id, value]) => prev.aliases[id] === value)
        && Object.keys(nextEntryConfigs).length === Object.keys(prev.entryConfigs).length
        && Object.entries(nextEntryConfigs).every(([id, value]) => {
          const candidate = prev.entryConfigs[id];
          return candidate ? rootFollowBankEntryConfigEquals(candidate, value) : false;
        })
      ) {
        return prev;
      }
      return { ...prev, memberIds: nextMemberIds, orderedIds: nextOrderedIds, aliases: nextAliases, entryConfigs: nextEntryConfigs };
    });
  }, [exportedLoopMaterials]);

  useEffect(() => {
    writePersistedRootFollowBank(bankState);
  }, [bankState]);

  useEffect(() => {
    return listenXensonarEvent('rootFollowBankSync', (detail) => {
      const nextState = detail ? detail : readPersistedRootFollowBank();
      setBankState((prev) => sameBankState(prev, nextState) ? prev : nextState);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = listenXensonarEvent('rootFollowBankMembership', (detail) => {
      const entryId = detail?.entryId;
      const enabled = detail?.enabled !== false;
      const configPatch = detail?.config ?? null;
      if (!entryId) return;
      setBankState((prev) => {
        const alreadyMember = prev.memberIds.includes(entryId);
        const currentConfig = prev.entryConfigs[entryId] ?? DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG;
        const nextConfig = configPatch
          ? normalizeRootFollowBankEntryConfig({ ...currentConfig, ...configPatch })
          : currentConfig;
        const nextMemberIds = enabled
          ? (alreadyMember ? prev.memberIds : [...prev.memberIds, entryId])
          : prev.memberIds.filter((id) => id !== entryId);
        const nextOrderedIds = enabled
          ? (alreadyMember ? prev.orderedIds : [...prev.orderedIds.filter((id) => id !== entryId), entryId])
          : prev.orderedIds.filter((id) => id !== entryId);
        const nextAliases = enabled
          ? prev.aliases
          : Object.fromEntries(Object.entries(prev.aliases).filter(([id]) => id !== entryId));
        const nextEntryConfigs = enabled
          ? { ...prev.entryConfigs, [entryId]: nextConfig }
          : Object.fromEntries(Object.entries(prev.entryConfigs).filter(([id]) => id !== entryId));
        if (
          nextMemberIds.length === prev.memberIds.length
          && nextMemberIds.every((id, index) => id === prev.memberIds[index])
          && nextOrderedIds.length === prev.orderedIds.length
          && nextOrderedIds.every((id, index) => id === prev.orderedIds[index])
          && Object.keys(nextAliases).length === Object.keys(prev.aliases).length
          && Object.entries(nextAliases).every(([id, value]) => prev.aliases[id] === value)
          && Object.keys(nextEntryConfigs).length === Object.keys(prev.entryConfigs).length
          && Object.entries(nextEntryConfigs).every(([id, value]) => {
            const candidate = prev.entryConfigs[id];
            return candidate ? rootFollowBankEntryConfigEquals(candidate, value) : false;
          })
        ) {
          return prev;
        }
        return {
          ...prev,
          memberIds: nextMemberIds,
          orderedIds: nextOrderedIds,
          aliases: nextAliases,
          entryConfigs: nextEntryConfigs,
        };
      });
      if (enabled && detail?.activate) updateNParams({ rootFollowLoopId: entryId, rootFollowLoopActive: true });
      setRootFollowLoopUiStatus(
        !enabled
          ? 'Loop aus Root Follow entfernt.'
          : configPatch?.sourceKind === 'synth'
            ? 'Synth-Loop als Root Follow vorbereitet.'
            : detail?.activate
              ? 'Loop als Root Follow geladen.'
              : 'Loop als Root Follow zugeordnet.',
      );
    });
    return unsubscribe;
  }, [updateNParams]);

  const entryMap = useMemo(() => new Map(exportedLoopMaterials.map((entry) => [entry.id, entry])), [exportedLoopMaterials]);

  const rootFollowLoopEntries = useMemo(() => {
    if (bankState.memberIds.length === 0) return [];
    const orderedIds = bankState.orderedIds.length
      ? bankState.orderedIds.filter((id) => bankState.memberIds.includes(id))
      : bankState.memberIds;
    const normalizedIds = [...orderedIds, ...bankState.memberIds.filter((id) => !orderedIds.includes(id))];
    return normalizedIds
      .map((id) => entryMap.get(id))
      .filter((entry): entry is MaterialEntry => Boolean(entry))
      .map((entry) => {
        const alias = bankState.aliases[entry.id]?.trim();
        return alias ? { ...entry, name: alias } : entry;
      });
  }, [bankState.aliases, bankState.memberIds, bankState.orderedIds, entryMap]);

  const recentRootFollowHotkeyEntries = useMemo(
    () => rootFollowLoopEntries.slice(0, hotkeyCount),
    [rootFollowLoopEntries, hotkeyCount],
  );


  useEffect(() => {
    if (!rootFollowLoopEntries.length) return;
    const hasSelected = rootFollowLoopEntries.some((entry) => entry.id === rootFollowLoopId);
    if (hasSelected) return;
    updateNParams({ rootFollowLoopId: rootFollowLoopEntries[0]?.id ?? '' });
  }, [rootFollowLoopEntries, rootFollowLoopId, updateNParams]);

  const selectedRootFollowLoop = useMemo(
    () => rootFollowLoopEntries.find((entry) => entry.id === rootFollowLoopId) ?? null,
    [rootFollowLoopEntries, rootFollowLoopId],
  );

  const selectedRootFollowLoopConfig = useMemo(
    () => selectedRootFollowLoop ? (bankState.entryConfigs[selectedRootFollowLoop.id] ?? DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG) : null,
    [bankState.entryConfigs, selectedRootFollowLoop],
  );

  const managedRootFollowLoopMaterial = useMemo(
    () => rootFollowLoopEntries.find((entry) => entry.id === manageId) ?? null,
    [rootFollowLoopEntries, manageId],
  );

  const managedRootFollowLoopIndex = useMemo(
    () => rootFollowLoopEntries.findIndex((entry) => entry.id === manageId),
    [rootFollowLoopEntries, manageId],
  );

  const closeRootFollowLoopManager = () => {
    setManageId('');
    setRenameDraft('');
    setDragId('');
    setDropId('');
  };

  const openRootFollowLoopManager = (entryId?: string) => {
    const requested = rootFollowLoopEntries.find((entry) => entry.id === entryId)
      ?? rootFollowLoopEntries.find((entry) => entry.id === rootFollowLoopId)
      ?? rootFollowLoopEntries[0]
      ?? null;
    if (!requested) {
      setRootFollowLoopUiStatus('Noch keine Root-Follow-Loop-Einträge vorhanden.');
      return;
    }
    setManageId(requested.id);
    setRenameDraft(requested.name);
  };

  const activateManagedRootFollowLoop = (entryId: string) => {
    const entry = rootFollowLoopEntries.find((candidate) => candidate.id === entryId);
    if (!entry) return;
    updateNParams({ rootFollowLoopId: entry.id, rootFollowLoopActive: true });
    setManageId(entry.id);
    setRenameDraft(entry.name);
    setRootFollowLoopUiStatus(`Root Follow Loop geladen: ${entry.name}`);
  };

  const saveRootFollowLoopRename = () => {
    if (!managedRootFollowLoopMaterial) return;
    const trimmed = renameDraft.trim();
    const sourceEntry = entryMap.get(managedRootFollowLoopMaterial.id);
    const sourceName = sourceEntry?.name ?? managedRootFollowLoopMaterial.name;
    setBankState((prev) => {
      const nextAliases = { ...prev.aliases };
      if (!trimmed || trimmed === sourceName) {
        delete nextAliases[managedRootFollowLoopMaterial.id];
      } else {
        nextAliases[managedRootFollowLoopMaterial.id] = trimmed;
      }
      return { ...prev, aliases: nextAliases };
    });
    const resolvedName = trimmed || sourceName;
    setRenameDraft(resolvedName);
    setRootFollowLoopUiStatus(`Root Follow Loop umbenannt: ${resolvedName}`);
  };

  const browseManagedRootFollowLoop = (direction: -1 | 1) => {
    if (!rootFollowLoopEntries.length) return;
    const safeIndex = managedRootFollowLoopIndex >= 0 ? managedRootFollowLoopIndex : Math.max(0, rootFollowLoopEntries.findIndex((entry) => entry.id === rootFollowLoopId));
    const nextIndex = Math.max(0, Math.min(rootFollowLoopEntries.length - 1, safeIndex + direction));
    const nextEntry = rootFollowLoopEntries[nextIndex];
    if (!nextEntry) return;
    updateNParams({ rootFollowLoopId: nextEntry.id, rootFollowLoopActive: true });
    setManageId(nextEntry.id);
    setRenameDraft(nextEntry.name);
    setRootFollowLoopUiStatus(`Root Follow Loop geladen: ${nextEntry.name}`);
  };

  const shiftRootFollowLoopOrder = (direction: -1 | 1) => {
    if (!managedRootFollowLoopMaterial) return;
    const targetIndex = managedRootFollowLoopIndex + direction;
    if (targetIndex < 0 || targetIndex >= rootFollowLoopEntries.length) return;
    setBankState((prev) => ({
      ...prev,
      orderedIds: moveEntry(rootFollowLoopEntries.map((entry) => entry.id), managedRootFollowLoopMaterial.id, rootFollowLoopEntries[targetIndex]?.id ?? managedRootFollowLoopMaterial.id, 'swap'),
    }));
    setRootFollowLoopUiStatus(`Root Follow Reihenfolge geändert: ${managedRootFollowLoopMaterial.name}`);
  };

  const deleteManagedRootFollowLoop = (entryId: string) => {
    const nextEntries = rootFollowLoopEntries.filter((entry) => entry.id !== entryId);
    setBankState((prev) => ({
      ...prev,
      memberIds: prev.memberIds.filter((id) => id !== entryId),
      orderedIds: prev.orderedIds.filter((id) => id !== entryId),
      aliases: Object.fromEntries(Object.entries(prev.aliases).filter(([id]) => id !== entryId)),
      entryConfigs: Object.fromEntries(Object.entries(prev.entryConfigs).filter(([id]) => id !== entryId)),
    }));
    const nextEntry = nextEntries[Math.max(0, managedRootFollowLoopIndex - 1)] ?? nextEntries[0] ?? null;
    if (rootFollowLoopId === entryId) {
      updateNParams({ rootFollowLoopId: nextEntry?.id ?? '', rootFollowLoopActive: nextEntry ? true : false });
    }
    if (nextEntry) {
      setManageId(nextEntry.id);
      setRenameDraft(nextEntry.name);
    } else {
      closeRootFollowLoopManager();
    }
    void updateMaterialEntry(entryId, { rootFollowPreferred: false }).catch(() => undefined);
    setRootFollowLoopUiStatus(`Root Follow Loop entfernt: ${managedRootFollowLoopMaterial?.name ?? entryId}`);
  };

  const handleRootFollowLoopDragStart = (event: ReactDragEvent<HTMLElement>, entryId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', entryId);
    suppressNativePlaylistDragImage(event.dataTransfer);
    setDragId(entryId);
    setDropId(entryId);
  };

  const handleRootFollowLoopDragOver = (event: ReactDragEvent<HTMLElement>, entryId: string, operation: PlaylistDropOperation = 'swap') => {
    event.preventDefault();
    const target = encodePlaylistDropTarget(operation, entryId);
    if (dropId !== target) setDropId(target);
  };

  const handleRootFollowLoopDrop = (event: ReactDragEvent<HTMLElement>, targetId: string, operation: PlaylistDropOperation = 'swap', visibleOrderIds?: readonly string[], sessionDraggedId?: string) => {
    event.preventDefault();
    const draggedId = sessionDraggedId || event.dataTransfer.getData('text/plain') || dragId;
    setDragId('');
    setDropId('');
    if (!draggedId || draggedId === targetId || !visibleOrderIds?.length) return;
    const entryIds = new Set(rootFollowLoopEntries.map((entry) => entry.id));
    const currentVisibleIds = visibleOrderIds.filter((id, index, all) => id && all.indexOf(id) === index && entryIds.has(id));
    const targetIndex = currentVisibleIds.indexOf(targetId);
    if (targetIndex < 0 || !currentVisibleIds.includes(draggedId)) return;
    setBankState((prev) => ({
      ...prev,
      orderedIds: (() => {
        const currentOrder = currentVisibleIds;
        const nextOrder = moveEntry(currentOrder, draggedId, targetId, operation);
        return playlistOrderEquals(currentOrder, nextOrder) ? prev.orderedIds : nextOrder;
      })(),
    }));
    const movedEntry = rootFollowLoopEntries.find((entry) => entry.id === draggedId);
    if (movedEntry) setRootFollowLoopUiStatus(`Root Follow Reihenfolge geändert: ${movedEntry.name}`);
  };

  const handleRootFollowLoopDragEnd = () => {
    setDragId('');
    setDropId('');
  };

  const resolveDefaultRootFollowAnchorHz = () => Math.max(1, getDefaultRootFollowAnchorHz());

  const addToRootFollowLoopBank = (entryId: string) => {
    const entry = entryMap.get(entryId);
    if (!entryId || !entry) return;
    let added = false;
    setBankState((prev) => {
      if (prev.memberIds.includes(entryId)) return prev;
      added = true;
      return {
        ...prev,
        memberIds: [...prev.memberIds, entryId],
        orderedIds: [...prev.orderedIds.filter((id) => id !== entryId), entryId],
        entryConfigs: {
          ...prev.entryConfigs,
          [entryId]: prev.entryConfigs[entryId] ?? DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG,
        },
      };
    });
    const name = entry.name ?? entryId;
    const defaultAnchorHz = resolveDefaultRootFollowAnchorHz();
    updateNParams({ rootFollowLoopId: entryId, rootFollowLoopActive: true });
    void updateMaterialEntry(entryId, {
      rootFollowPreferred: true,
      rootHz: Number.isFinite(entry.rootHz ?? NaN) ? entry.rootHz ?? null : defaultAnchorHz,
    }).catch((error) => reportXensonarPromiseFailure('root-follow', 'mark-root-follow-preferred', error, { entryId }));
    setRootFollowLoopUiStatus(added ? `Loop an Root Follow gesendet: ${name}` : `Loop bereits in Root Follow: ${name}`);
  };


  const setRootFollowLoopAnchor = (entryId: string, rootHz: number | null) => {
    const entry = entryMap.get(entryId) ?? rootFollowLoopEntries.find((candidate) => candidate.id === entryId) ?? null;
    if (!entry) return;
    const normalizedRootHz = normalizeRootFollowAnchorHz(rootHz);
    void updateMaterialEntry(entryId, { rootHz: normalizedRootHz }).then((updated) => {
      setRootFollowLoopUiStatus(normalizedRootHz === null
        ? `Tonaler Anker flexibel: ${updated.name}`
        : `Tonaler Anker gesetzt: ${updated.name} · ${normalizedRootHz.toFixed(1)} Hz`);
    }).catch((error) => {
      reportXensonarPromiseFailure('root-follow', 'set-root-follow-loop-anchor', error, { entryId, rootHz: normalizedRootHz });
      setRootFollowLoopUiStatus('Tonaler Anker konnte nicht geändert werden.');
    });
  };

  const stampCurrentRootFollowLoopAnchor = (entryId: string) => {
    const liveAnchorHz = Math.max(1, getCurrentRootFollowAnchorHz());
    setRootFollowLoopAnchor(entryId, liveAnchorHz);
  };

  const uploadRootFollowLoopFile = async (file: File, bars: number) => {
    try {
      setRootFollowLoopUiStatus('Root-Follow-Loop-Upload liest Audiodatei …');
      const defaultAnchorHz = resolveDefaultRootFollowAnchorHz();
      const entry = await registerUploadedAudioLoop({ file, bars, target: 'root-follow', rootHz: defaultAnchorHz });
      setBankState((prev) => ({
        ...prev,
        memberIds: prev.memberIds.includes(entry.id) ? prev.memberIds : [...prev.memberIds, entry.id],
        orderedIds: [...prev.orderedIds.filter((id) => id !== entry.id), entry.id],
        entryConfigs: {
          ...prev.entryConfigs,
          [entry.id]: prev.entryConfigs[entry.id] ?? DEFAULT_MATERIAL_ROOT_FOLLOW_ENTRY_CONFIG,
        },
      }));
      updateNParams({ rootFollowLoopId: entry.id, rootFollowLoopActive: true });
      setManageId(entry.id);
      setRenameDraft(entry.name);
      setRootFollowLoopUiStatus(`Root-Follow-Loop hochgeladen: ${entry.name} · ${entry.bars} Takte.`);
    } catch (error) {
      console.error('[xensonar][root-follow-upload]', error);
      setRootFollowLoopUiStatus(error instanceof Error ? error.message : 'Root-Follow-Loop-Upload fehlgeschlagen.');
    }
  };

  const isEntryInRootFollowLoopBank = (entryId: string) => bankState.memberIds.includes(entryId);

  return {
    rootFollowLoopEntries,
    recentRootFollowHotkeyEntries,
    selectedRootFollowLoop,
    selectedRootFollowLoopConfig,
    rootFollowLoopUiStatus,
    managedRootFollowLoopMaterial,
    managedRootFollowLoopIndex,
    rootFollowLoopRenameDraft: renameDraft,
    rootFollowLoopDragId: dragId,
    rootFollowLoopDropId: dropId,
    setRootFollowLoopRenameDraft: setRenameDraft,
    openRootFollowLoopManager,
    closeRootFollowLoopManager,
    activateManagedRootFollowLoop,
    saveRootFollowLoopRename,
    browseManagedRootFollowLoop,
    shiftRootFollowLoopOrder,
    deleteManagedRootFollowLoop,
    handleRootFollowLoopDragStart,
    handleRootFollowLoopDragOver,
    handleRootFollowLoopDrop,
    handleRootFollowLoopDragEnd,
    addToRootFollowLoopBank,
    uploadRootFollowLoopFile,
    setRootFollowLoopAnchor,
    stampCurrentRootFollowLoopAnchor,
    isEntryInRootFollowLoopBank,
  };
}
