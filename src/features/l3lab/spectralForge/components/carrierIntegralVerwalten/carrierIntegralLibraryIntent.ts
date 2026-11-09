import type { CarrierIntegralMachineId } from '../../integral/carrierIntegralContracts';
import type { CarrierIntegralSelection } from '../../integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../../integral/carrierIntegralSynthLab';
import type { CarrierIntegralHarmonicXploreSelection } from '../../integral/carrierIntegralHarmonicXploreRenderConfig';
export type CarrierIntegralLibraryAuditionValueSource = 'stored-entry' | 'right-override';

export type CarrierIntegralSupportedMachineResolver = (value: unknown) => CarrierIntegralMachineId | null;

export type CarrierIntegralLibraryEntryIntentMeta = {
  carrierIntegral?: { machineId?: unknown; bodySourceMode?: unknown; presetId?: unknown; updatedAt?: unknown } | null;
};

export type CarrierIntegralLibrarySnapshotIntent = {
  carrierIntegralSelection?: Partial<CarrierIntegralSelection> | null;
  carrierIntegralSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  carrierIntegralHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
};

export type CarrierIntegralEditorMachineIntent = {
  machineId?: unknown;
};

export type CarrierIntegralEditorLoadFlow = {
  machineId: CarrierIntegralMachineId | null;
  requestedMachine: CarrierIntegralMachineId | null;
  storedMachine: CarrierIntegralMachineId | null;
  metaMachine: CarrierIntegralMachineId | null;
  selectionPatch: Partial<CarrierIntegralSelection> | null;
  synthLabPatch: Partial<CarrierIntegralSynthLabSelection> | null;
  harmonicXplorePatch: Partial<CarrierIntegralHarmonicXploreSelection> | null;
  auditionValueSource: CarrierIntegralLibraryAuditionValueSource;
  activeDeviceLayer: 'gestalt';
  showLesartLab: true;
  showSynthLab: true;
  scrollToMelodicPinkSend: true;
};

export type CarrierIntegralSendTargetFlow = {
  storedMachine: CarrierIntegralMachineId | null;
  effectiveMachine: CarrierIntegralMachineId;
  effectiveValueSource: CarrierIntegralLibraryAuditionValueSource;
};

export type CarrierIntegralStoredDeviceValuesFlow = {
  selectionPatch: Partial<CarrierIntegralSelection> | null;
  synthLabPatch: Partial<CarrierIntegralSynthLabSelection> | null;
  harmonicXplorePatch: Partial<CarrierIntegralHarmonicXploreSelection> | null;
};

export function createCarrierIntegralSupportedMachineResolver(
  machineIds: readonly CarrierIntegralMachineId[],
): CarrierIntegralSupportedMachineResolver {
  const supported = new Set<CarrierIntegralMachineId>(machineIds);
  return (value: unknown): CarrierIntegralMachineId | null =>
    typeof value === 'string' && supported.has(value as CarrierIntegralMachineId)
      ? (value as CarrierIntegralMachineId)
      : null;
}

export function resolveCarrierIntegralEditorLoadFlow(args: {
  entry: CarrierIntegralLibraryEntryIntentMeta;
  snapshot: CarrierIntegralLibrarySnapshotIntent;
  intent: CarrierIntegralEditorMachineIntent;
  resolveMachine: CarrierIntegralSupportedMachineResolver;
}): CarrierIntegralEditorLoadFlow {
  const storedSelection = args.snapshot.carrierIntegralSelection;
  const requestedMachine = args.resolveMachine(args.intent.machineId);
  const storedMachine = args.resolveMachine(storedSelection?.machineId);
  const metaMachine = args.resolveMachine(args.entry.carrierIntegral?.machineId);
  const machineId = requestedMachine ?? storedMachine ?? metaMachine;

  return {
    machineId,
    requestedMachine,
    storedMachine,
    metaMachine,
    selectionPatch: machineId
      ? {
          ...(storedSelection ?? {}),
          machineId,
          source: 'project',
        }
      : null,
    synthLabPatch: args.snapshot.carrierIntegralSynthLab
      ? {
          ...args.snapshot.carrierIntegralSynthLab,
          source: 'project',
        }
      : null,
    harmonicXplorePatch: args.snapshot.carrierIntegralHarmonicXplore
      ? {
          ...args.snapshot.carrierIntegralHarmonicXplore,
          source: 'project',
        }
      : null,
    auditionValueSource: 'stored-entry',
    activeDeviceLayer: 'gestalt',
    showLesartLab: true,
    showSynthLab: true,
    scrollToMelodicPinkSend: true,
  };
}

export function resolveCarrierIntegralSendTargetFlow(args: {
  valueSource: CarrierIntegralLibraryAuditionValueSource;
  currentMachine: CarrierIntegralMachineId;
  storedSelection?: Partial<CarrierIntegralSelection> | null;
  entryMeta?: CarrierIntegralLibraryEntryIntentMeta['carrierIntegral'] | null;
  resolveMachine: CarrierIntegralSupportedMachineResolver;
}): CarrierIntegralSendTargetFlow {
  const storedMachine =
    args.resolveMachine(args.storedSelection?.machineId) ??
    args.resolveMachine(args.entryMeta?.machineId);
  const useStored = args.valueSource === 'stored-entry' && !!storedMachine;
  return {
    storedMachine,
    effectiveMachine: useStored ? storedMachine : args.currentMachine,
    effectiveValueSource: useStored ? 'stored-entry' : 'right-override',
  };
}

export function resolveCarrierIntegralStoredDeviceValuesFlow(args: {
  storedSelection?: Partial<CarrierIntegralSelection> | null;
  storedSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  storedHarmonicXplore?: Partial<CarrierIntegralHarmonicXploreSelection> | null;
}): CarrierIntegralStoredDeviceValuesFlow {
  return {
    selectionPatch: args.storedSelection
      ? {
          machineId: args.storedSelection.machineId,
          bodySourceMode: args.storedSelection.bodySourceMode,
          presetId: args.storedSelection.presetId,
          paramsPatch: { ...args.storedSelection.paramsPatch },
          source: 'project',
        }
      : null,
    synthLabPatch: args.storedSynthLab
      ? {
          presetId: args.storedSynthLab.presetId,
          paramsPatch: { ...args.storedSynthLab.paramsPatch },
          source: 'project',
        }
      : null,
    harmonicXplorePatch: args.storedHarmonicXplore
      ? {
          ...args.storedHarmonicXplore,
          source: 'project',
        }
      : null,
  };
}
