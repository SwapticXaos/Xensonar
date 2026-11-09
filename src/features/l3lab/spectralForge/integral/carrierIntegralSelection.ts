import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineId,
  CarrierIntegralMachineParams,
} from './carrierIntegralContracts';
import {
  CARRIER_INTEGRAL_PRESETS,
  mergeCarrierIntegralParams,
  resolveCarrierIntegralMachine,
} from './carrierIntegralRegistry';
import {
  canMachineUseCarrierIntegralBodySource,
  resolveDefaultCarrierIntegralBodySource,
} from './carrierIntegralBodySources';

export type CarrierIntegralSelectionSource = 'default' | 'user' | 'project' | 'system';

export type CarrierIntegralSelection = {
  version: 'carrier-integral-selection-v1';
  machineId: CarrierIntegralMachineId;
  bodySourceMode: CarrierIntegralBodySourceMode;
  presetId: string | null;
  paramsPatch: Partial<CarrierIntegralMachineParams>;
  updatedAt: number | null;
  source: CarrierIntegralSelectionSource;
};

export type CarrierIntegralSelectionPatch = Partial<Pick<CarrierIntegralSelection,
  | 'machineId'
  | 'bodySourceMode'
  | 'presetId'
  | 'paramsPatch'
  | 'source'
>>;

export function createDefaultCarrierIntegralSelection(): CarrierIntegralSelection {
  const machineId: CarrierIntegralMachineId = 'branch-a-line-traffic';
  const bodySourceMode = resolveDefaultCarrierIntegralBodySource(machineId);
  return {
    version: 'carrier-integral-selection-v1',
    machineId,
    bodySourceMode,
    presetId: resolveDefaultCarrierIntegralPresetId(machineId),
    paramsPatch: {},
    updatedAt: null,
    source: 'default',
  };
}

export function resolveDefaultCarrierIntegralPresetId(machineId: CarrierIntegralMachineId): string | null {
  return CARRIER_INTEGRAL_PRESETS.find((preset) => preset.machineId === machineId)?.id ?? null;
}

export function getCarrierIntegralPresetParams(presetId: string | null | undefined): Partial<CarrierIntegralMachineParams> {
  return CARRIER_INTEGRAL_PRESETS.find((preset) => preset.id === presetId)?.params ?? {};
}

export function normalizeCarrierIntegralSelection(
  incoming?: Partial<CarrierIntegralSelection> | null,
  fallback?: CarrierIntegralSelection,
): CarrierIntegralSelection {
  const base = fallback ?? createDefaultCarrierIntegralSelection();
  const candidateMachineId = incoming?.machineId ?? base.machineId;
  const machine = resolveCarrierIntegralMachine(candidateMachineId);
  const requestedBody = incoming?.bodySourceMode ?? base.bodySourceMode;
  const bodySourceMode = canMachineUseCarrierIntegralBodySource(machine.id, requestedBody)
    ? requestedBody
    : resolveDefaultCarrierIntegralBodySource(machine.id);
  const requestedPreset = incoming?.presetId ?? base.presetId;
  const presetId = CARRIER_INTEGRAL_PRESETS.some((preset) => preset.id === requestedPreset && preset.machineId === machine.id)
    ? requestedPreset
    : resolveDefaultCarrierIntegralPresetId(machine.id);

  return {
    version: 'carrier-integral-selection-v1',
    machineId: machine.id,
    bodySourceMode,
    presetId,
    paramsPatch: { ...(incoming?.paramsPatch ?? base.paramsPatch ?? {}) },
    updatedAt: typeof incoming?.updatedAt === 'number' ? incoming.updatedAt : base.updatedAt,
    source: incoming?.source ?? base.source,
  };
}

export function applyCarrierIntegralSelectionPatch(
  current: CarrierIntegralSelection,
  patch: CarrierIntegralSelectionPatch,
): CarrierIntegralSelection {
  const nextMachineId = patch.machineId ?? current.machineId;
  const machineChanged = nextMachineId !== current.machineId;
  const machine = resolveCarrierIntegralMachine(nextMachineId);
  const bodySourceMode = patch.bodySourceMode
    ? patch.bodySourceMode
    : machineChanged
      ? resolveDefaultCarrierIntegralBodySource(machine.id)
      : current.bodySourceMode;
  const presetId = patch.presetId !== undefined
    ? patch.presetId
    : machineChanged
      ? resolveDefaultCarrierIntegralPresetId(machine.id)
      : current.presetId;
  const paramsPatch = patch.paramsPatch !== undefined
    ? { ...patch.paramsPatch }
    : machineChanged
      ? {}
      : { ...current.paramsPatch };

  return normalizeCarrierIntegralSelection({
    ...current,
    machineId: machine.id,
    bodySourceMode,
    presetId,
    paramsPatch,
    updatedAt: Date.now(),
    source: patch.source ?? 'user',
  }, current);
}

export function resolveCarrierIntegralSelectionParams(selection: CarrierIntegralSelection): CarrierIntegralMachineParams {
  return mergeCarrierIntegralParams(selection.machineId, {
    ...getCarrierIntegralPresetParams(selection.presetId),
    ...selection.paramsPatch,
  });
}
