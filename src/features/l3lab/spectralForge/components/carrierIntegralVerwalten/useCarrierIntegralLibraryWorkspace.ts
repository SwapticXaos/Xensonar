import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  deleteForgeProject,
  loadForgeProject,
  saveForgeProject,
  useForgeProjectLibrary,
  type ForgeProjectMeta,
} from "../../projectLibrary";
import {
  resolveLibraryDragOperation,
  type LibraryDragState,
  type LibrarySortMode,
} from "./carrierIntegralLibraryDrag";
import {
  createCarrierIntegralManualLibraryOrder,
  resolveCarrierIntegralLibraryDropOrder,
  sortCarrierIntegralLibraryEntries,
} from "./carrierIntegralLibraryOrder";
import { resolveCarrierIntegralStoredDeviceValuesFlow } from "./carrierIntegralLibraryIntent";
import {
  createCarrierIntegralLibraryActionErrorMessage,
  removeCarrierIntegralLibraryManualOrderId,
  resolveCarrierIntegralDeleteSuccessFlow,
  resolveCarrierIntegralLoadEntrySuccessFlow,
  resolveCarrierIntegralSaveSuccessFlow,
  resolveCarrierIntegralSelectEntryFlow,
} from "./carrierIntegralLibraryActionFlow";
import type { CarrierIntegralAuditionValueSource } from "../../integral/carrierIntegralAudition";

export function useCarrierIntegralLibraryWorkspace(args: {
  materialExportName: string;
  createProjectSnapshot: () => any;
  loadProjectSnapshot: (snapshot: any) => void;
  setCarrierIntegralSelection: (patch: any) => void;
  setCarrierIntegralSynthLab: (patch: any) => void;
  setCarrierIntegralHarmonicXplore: (patch: any) => void;
  setAuditionValueSource: (value: CarrierIntegralAuditionValueSource) => void;
  setAuditionError: (value: string | null) => void;
  onClose: () => void;
  onOpenInSpectralForge?: () => void;
}) {
  const libraryEntries = useForgeProjectLibrary((state) => state.entries);
  const [projectName, setProjectName] = useState(
    args.materialExportName || "spectral-forge-project",
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [librarySortMode, setLibrarySortMode] =
    useState<LibrarySortMode>("updated-desc");
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [manualLibraryOrder, setManualLibraryOrder] = useState<string[]>([]);
  const [libraryDrag, setLibraryDrag] = useState<LibraryDragState | null>(null);

  useEffect(() => {
    if (!selectedProjectId && args.materialExportName) {
      setProjectName(args.materialExportName);
    }
  }, [args.materialExportName, selectedProjectId]);

  const sortedLibraryEntries = useMemo(
    () =>
      sortCarrierIntegralLibraryEntries(
        libraryEntries,
        librarySortMode,
        manualLibraryOrder,
      ),
    [libraryEntries, librarySortMode, manualLibraryOrder],
  );
  const selectedProject = useMemo(
    () =>
      sortedLibraryEntries.find((entry) => entry.id === selectedProjectId) ??
      null,
    [selectedProjectId, sortedLibraryEntries],
  );

  const beginLibraryDrag = (entryId: string, event: DragEvent<HTMLElement>) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entryId);
    if (manualLibraryOrder.length === 0) {
      setManualLibraryOrder(
        createCarrierIntegralManualLibraryOrder(sortedLibraryEntries),
      );
    }
    setLibrarySortMode("manual");
    setLibraryDrag({ dragId: entryId, overId: null, operation: null });
  };

  const updateLibraryDragOver = (
    entryId: string,
    event: DragEvent<HTMLElement>,
  ) => {
    if (!libraryDrag) return;
    event.preventDefault();
    const operation = resolveLibraryDragOperation(event);
    event.dataTransfer.dropEffect = "move";
    setLibraryDrag((current) =>
      current
        ? { ...current, overId: entryId, operation }
        : { dragId: libraryDrag.dragId, overId: entryId, operation },
    );
  };

  const finishLibraryDrop = (
    entryId: string,
    event: DragEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    const dragId =
      libraryDrag?.dragId ?? event.dataTransfer.getData("text/plain");
    if (!dragId || dragId === entryId) {
      setLibraryDrag(null);
      return;
    }
    const operation =
      libraryDrag?.operation ?? resolveLibraryDragOperation(event);
    const nextOrder = resolveCarrierIntegralLibraryDropOrder({
      entries: sortedLibraryEntries,
      manualOrder: manualLibraryOrder,
      dragId,
      targetId: entryId,
      operation,
    });
    if (nextOrder) setManualLibraryOrder(nextOrder);
    setLibrarySortMode("manual");
    setLibraryDrag(null);
  };

  const runLibraryAction = async (
    action: () => Promise<void>,
  ): Promise<boolean> => {
    setLibraryBusy(true);
    setLibraryError(null);
    setLibraryMessage(null);
    try {
      await action();
      return true;
    } catch (error) {
      setLibraryError(createCarrierIntegralLibraryActionErrorMessage(error));
      return false;
    } finally {
      setLibraryBusy(false);
    }
  };

  const applyStoredDeviceValuesFromSnapshot = (
    snapshot: Awaited<ReturnType<typeof loadForgeProject>>,
  ) => {
    const deviceValuesFlow = resolveCarrierIntegralStoredDeviceValuesFlow({
      storedSelection: snapshot.carrierIntegralSelection,
      storedSynthLab: snapshot.carrierIntegralSynthLab,
      storedHarmonicXplore: snapshot.carrierIntegralHarmonicXplore,
    });
    if (deviceValuesFlow.selectionPatch)
      args.setCarrierIntegralSelection(deviceValuesFlow.selectionPatch);
    if (deviceValuesFlow.synthLabPatch)
      args.setCarrierIntegralSynthLab(deviceValuesFlow.synthLabPatch);
    if (deviceValuesFlow.harmonicXplorePatch)
      args.setCarrierIntegralHarmonicXplore(deviceValuesFlow.harmonicXplorePatch);
  };

  const saveAsNewProject = () =>
    runLibraryAction(async () => {
      const meta = await saveForgeProject({
        name: projectName,
        snapshot: args.createProjectSnapshot(),
      });
      const flow = resolveCarrierIntegralSaveSuccessFlow(meta);
      setSelectedProjectId(flow.selectedProjectId);
      setProjectName(flow.projectName);
      setLibraryMessage(flow.libraryMessage);
    });

  const deleteSelectedProject = () =>
    runLibraryAction(async () => {
      if (!selectedProjectId) return;
      const flow = resolveCarrierIntegralDeleteSuccessFlow({
        selectedProjectId,
        selectedProjectName: selectedProject?.name,
        projectName,
      });
      await deleteForgeProject(selectedProjectId);
      setManualLibraryOrder((ids) =>
        removeCarrierIntegralLibraryManualOrderId(ids, selectedProjectId),
      );
      setSelectedProjectId(flow.selectedProjectId);
      setLibraryMessage(flow.libraryMessage);
    });

  const selectLibraryEntry = (entry: ForgeProjectMeta) =>
    void runLibraryAction(async () => {
      const snapshot = await loadForgeProject(entry.id);
      applyStoredDeviceValuesFromSnapshot(snapshot);
      const flow = resolveCarrierIntegralSelectEntryFlow(entry);
      setSelectedProjectId(flow.selectedProjectId);
      setProjectName(flow.projectName);
      args.setAuditionValueSource(flow.auditionValueSource);
      args.setAuditionError(flow.auditionError);
      setLibraryMessage(flow.libraryMessage);
    });

  const loadLibraryEntry = async (entry: ForgeProjectMeta) => {
    const loaded = await runLibraryAction(async () => {
      const snapshot = await loadForgeProject(entry.id);
      args.loadProjectSnapshot(snapshot);
      applyStoredDeviceValuesFromSnapshot(snapshot);
      const flow = resolveCarrierIntegralLoadEntrySuccessFlow(entry);
      setSelectedProjectId(flow.selectedProjectId);
      setProjectName(flow.projectName);
      args.setAuditionValueSource("stored-entry");
      setLibraryMessage(`in SpectralForge geöffnet · ${entry.name}`);
    });
    if (loaded) {
      args.onClose();
      args.onOpenInSpectralForge?.();
    }
  };

  return {
    projectName,
    setProjectName,
    selectedProjectId,
    setSelectedProjectId,
    librarySortMode,
    setLibrarySortMode,
    libraryBusy,
    setLibraryBusy,
    libraryMessage,
    setLibraryMessage,
    libraryError,
    setLibraryError,
    manualLibraryOrder,
    libraryDrag,
    setLibraryDrag,
    sortedLibraryEntries,
    selectedProject,
    beginLibraryDrag,
    updateLibraryDragOver,
    finishLibraryDrop,
    runLibraryAction,
    applyStoredDeviceValuesFromSnapshot,
    saveAsNewProject,
    deleteSelectedProject,
    selectLibraryEntry,
    loadLibraryEntry,
  };
}
