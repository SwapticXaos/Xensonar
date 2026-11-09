import { useEffect, useState } from "react";
import { loadForgeProject, type ForgeProjectMeta } from "../../projectLibrary";
import {
  auditionForgeProjectCarrierIntegral,
  type CarrierIntegralAuditionValueSource,
} from "../../integral/carrierIntegralAudition";
import type { CarrierIntegralMachineId } from "../../integral";
import { machinePreviewGain } from "./carrierIntegralMachineUi";
import {
  CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS,
  createCarrierIntegralAuditionKey,
  createCarrierIntegralAuditionRequest,
  resolveCarrierIntegralPreviewSessionActivation,
  shouldRefreshCarrierIntegralPreviewSession,
} from "./carrierIntegralPreviewSession";

export function useCarrierIntegralAuditionSession(args: {
  selectedProject: ForgeProjectMeta | null;
  selectedMachine: CarrierIntegralMachineId;
  selection: any;
  synthLab: any;
  harmonicXplore: any;
  auditionValueSource: CarrierIntegralAuditionValueSource;
  setAuditionValueSource: (value: CarrierIntegralAuditionValueSource) => void;
  setAuditionError: (value: string | null) => void;
  setSelectedProjectId: (value: string | null) => void;
  setProjectName: (value: string) => void;
  setCarrierIntegralSelection: (patch: any) => void;
}) {
  const [auditionBusyKey, setAuditionBusyKey] = useState<string | null>(null);
  const [lastPreviewMachineId, setLastPreviewMachineId] =
    useState<CarrierIntegralMachineId | null>(null);
  const [previewPitchSemitones, setPreviewPitchSemitones] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(0.82);
  const [previewBpm, setPreviewBpm] = useState(108);
  const [gesturePlayheadRatio, setGesturePlayheadRatio] = useState<number | null>(
    null,
  );

  const activeSignalMachine = lastPreviewMachineId ?? args.selectedMachine;

  const runAuditionAction = async (
    key: string,
    action: () => Promise<void>,
  ) => {
    setAuditionBusyKey(key);
    args.setAuditionError(null);
    try {
      await action();
    } catch (error) {
      args.setAuditionError(
        error instanceof Error
          ? error.message
          : "Vorhören konnte nicht gestartet werden",
      );
    } finally {
      setAuditionBusyKey(null);
    }
  };

  const auditionLibraryEntry = (
    entry: ForgeProjectMeta,
    machineId: CarrierIntegralMachineId,
    valueSource: CarrierIntegralAuditionValueSource = "right-override",
  ) =>
    void runAuditionAction(
      createCarrierIntegralAuditionKey({
        entryId: entry.id,
        machineId,
        valueSource,
      }),
      async () => {
        const snapshot = await loadForgeProject(entry.id);
        const result = await auditionForgeProjectCarrierIntegral(
          createCarrierIntegralAuditionRequest({
            projectName: entry.name,
            snapshot,
            machineId,
            valueSource,
            selection: args.selection,
            synthLab: args.synthLab,
            harmonicXplore: args.harmonicXplore,
            previewPitchSemitones,
            previewGain: machinePreviewGain(machineId, previewVolume),
            previewBpm,
            onAudioPosition: (pos) =>
              setGesturePlayheadRatio(Math.max(0, Math.min(1, pos))),
            onAudioEnd: () => setGesturePlayheadRatio(null),
          }),
        );
        args.setSelectedProjectId(entry.id);
        args.setProjectName(entry.name);
        args.setAuditionValueSource(valueSource);
        if (!result.played) args.setAuditionError(result.reason);
      },
    );

  const previewThroughMachine = (
    entry: ForgeProjectMeta,
    machineId: CarrierIntegralMachineId,
  ) => {
    const session = resolveCarrierIntegralPreviewSessionActivation({ machineId });
    args.setCarrierIntegralSelection(session.selectionPatch);
    setLastPreviewMachineId(session.lastPreviewMachineId);
    args.setAuditionValueSource(session.auditionValueSource);
    setGesturePlayheadRatio(null);
    auditionLibraryEntry(entry, machineId, session.auditionValueSource);
  };

  useEffect(() => {
    const selectedProject = args.selectedProject;
    if (!selectedProject || !lastPreviewMachineId) return undefined;
    const handle = window.setTimeout(() => {
      if (
        shouldRefreshCarrierIntegralPreviewSession({
          selectedProjectAvailable: true,
          lastPreviewMachineId,
          auditionBusyKey,
        })
      ) {
        auditionLibraryEntry(
          selectedProject,
          lastPreviewMachineId,
          "right-override",
        );
      }
    }, CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [
    previewPitchSemitones,
    previewVolume,
    previewBpm,
    args.synthLab.presetId,
    args.synthLab.paramsPatch,
    args.harmonicXplore.profileId,
    args.harmonicXplore.count,
    args.harmonicXplore.rolloff,
    args.harmonicXplore.registerFold,
    args.harmonicXplore.phase,
    args.harmonicXplore.detailDensity,
    args.harmonicXplore.detailMode,
  ]);

  return {
    auditionBusyKey,
    lastPreviewMachineId,
    activeSignalMachine,
    previewPitchSemitones,
    setPreviewPitchSemitones,
    previewVolume,
    setPreviewVolume,
    previewBpm,
    setPreviewBpm,
    gesturePlayheadRatio,
    setGesturePlayheadRatio,
    auditionLibraryEntry,
    previewThroughMachine,
  };
}
