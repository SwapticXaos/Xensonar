import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineDefinition,
  CarrierIntegralMachineId,
  CarrierIntegralPresetDefinition,
  CarrierIntegralTargetId,
} from './carrierIntegralContracts';
import {
  CARRIER_INTEGRAL_PRESETS,
  listCarrierIntegralMachines,
  resolveCarrierIntegralMachine,
} from './carrierIntegralRegistry';
import {
  listCarrierIntegralRuntimeRootFollowRoutes,
  resolveCarrierIntegralRuntimeRootFollowRoute,
  type CarrierIntegralRuntimeRootFollowRouteStatus,
} from './carrierIntegralRuntimeRoutes';
import {
  listCarrierIntegralSendContracts,
  type CarrierIntegralSendContract,
} from './carrierIntegralSendTargets';
import { resolveCarrierIntegralBodySourceContract } from './carrierIntegralBodySources';

export type CarrierIntegralMenuGroupId =
  | 'direct'
  | 'abc-carrier-readings'
  | 'body-source'
  | 'render-donor'
  | 'formant-plan'
  | 'timbre-lab';

export type CarrierIntegralMenuMachineItem = {
  id: CarrierIntegralMachineId;
  label: string;
  shortLabel: string;
  groupId: CarrierIntegralMenuGroupId;
  sourceRole: '5.69-origin' | 'stage-1-reading' | '5.87-palette' | 'branch-b-stub' | 'integral-extension';
  runtimeStatus: CarrierIntegralRuntimeRootFollowRouteStatus;
  bodySourceModes: CarrierIntegralBodySourceMode[];
  targetIds: CarrierIntegralTargetId[];
  presetIds: string[];
  summary: string;
  guardrail: string;
};

export type CarrierIntegralMenuTargetItem = {
  targetId: CarrierIntegralTargetId;
  label: string;
  contract: CarrierIntegralSendContract | null;
};

export type CarrierIntegralMenuBodySourceItem = {
  mode: CarrierIntegralBodySourceMode;
  label: string;
  summary: string;
  guardrail: string;
};

export type CarrierIntegralMenuModel = {
  version: 'carrier-integral-menu-model-v1';
  machineItems: CarrierIntegralMenuMachineItem[];
  bodySourceItems: CarrierIntegralMenuBodySourceItem[];
  targetItemsByMachine: Record<CarrierIntegralMachineId, CarrierIntegralMenuTargetItem[]>;
  presetsByMachine: Record<CarrierIntegralMachineId, CarrierIntegralPresetDefinition[]>;
  abcPaletteMachineIds: CarrierIntegralMachineId[];
  legacyAReadingIdMap: Record<'line-window' | 'direct-body' | 'interval-body', CarrierIntegralMachineId[]>;
  reference587RecipeMap: Record<'branch-a-linienkoerper' | 'branch-b-spaltenenergie-koerper' | 'branch-c-intervallkoerper', CarrierIntegralMachineId>;
};

const TARGET_LABELS: Record<CarrierIntegralTargetId, string> = {
  'material-preview': 'Material hören',
  'root-follow-preview': 'Root hören',
  'materialspur-export': 'An Materialspur',
  'root-follow-export': 'An Root Follow Loop',
  'loop-track-direct-export': 'Roh in Loop-Spur',
  'melodic-pink-export': 'Pinke Spur',
  validation: 'Prüfen',
  'abc-root-comparison': 'A/B/C vergleichen',
};

const BODY_SOURCE_LABELS: Partial<Record<CarrierIntegralBodySourceMode, string>> = {
  raw_oscillator: 'Roh-Oszillator',
  harmonic_xplore: 'HarmonicXplorE Direkt',
  spektral_synthese: 'SpektralSynthese',
  neutral_pigment: 'Neutral-Pigment',
  audio_donor: 'Audio-Donor',
};

export function classifyCarrierIntegralMenuGroup(machine: CarrierIntegralMachineDefinition): CarrierIntegralMenuGroupId {
  if (machine.id === 'harmonic-xplore-direct-carrier' || machine.id === 'spektral-synthese-body') return 'timbre-lab';
  if (machine.id === 'raw-darkpsy-oscillator') return 'direct';
  if (machine.id === 'branch-a-line-traffic' || machine.id === 'branch-b573-synth-window' || machine.id === 'branch-c-interval-body') return 'abc-carrier-readings';
  return 'render-donor';
}

export function classifyCarrierIntegralSourceRole(machine: CarrierIntegralMachineDefinition): CarrierIntegralMenuMachineItem['sourceRole'] {
  if (machine.id === 'branch-a-line-traffic' || machine.id === 'branch-b573-synth-window' || machine.id === 'branch-c-interval-body') return 'stage-1-reading';
  if (machine.id === 'raw-darkpsy-oscillator' || machine.id === 'harmonic-xplore-direct-carrier' || machine.id === 'spektral-synthese-body') return 'integral-extension';
  return '5.87-palette';
}

export function buildCarrierIntegralMenuModel(): CarrierIntegralMenuModel {
  const machines = listCarrierIntegralMachines();
  const runtimeRoutes = new Map(listCarrierIntegralRuntimeRootFollowRoutes().map((route) => [route.machineId, route]));
  const presetsByMachine = Object.fromEntries(
    machines.map((machine) => [
      machine.id,
      CARRIER_INTEGRAL_PRESETS.filter((preset) => preset.machineId === machine.id),
    ]),
  ) as Record<CarrierIntegralMachineId, CarrierIntegralPresetDefinition[]>;

  const targetItemsByMachine = Object.fromEntries(
    machines.map((machine) => [
      machine.id,
      buildTargetItems(machine.id),
    ]),
  ) as Record<CarrierIntegralMachineId, CarrierIntegralMenuTargetItem[]>;

  return {
    version: 'carrier-integral-menu-model-v1',
    machineItems: machines.map((machine) => ({
      id: machine.id,
      label: machine.label,
      shortLabel: machine.shortLabel,
      groupId: classifyCarrierIntegralMenuGroup(machine),
      sourceRole: classifyCarrierIntegralSourceRole(machine),
      runtimeStatus: runtimeRoutes.get(machine.id)?.status ?? resolveCarrierIntegralRuntimeRootFollowRoute({
        machineId: machine.id,
        bodySourceMode: machine.bodySourceModes[0],
        antiBurstStrategy: machine.antiBurstStrategy,
        rootFollowRoute: machine.rootFollowRoute,
        materialRoute: machine.materialRoute,
        paramsHash: 'menu-model',
      }).status,
      bodySourceModes: machine.bodySourceModes,
      targetIds: Object.entries(machine.targetSupport)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([targetId]) => targetId as CarrierIntegralTargetId),
      presetIds: presetsByMachine[machine.id].map((preset) => preset.id),
      summary: machine.summary,
      guardrail: machine.guardrail,
    })),
    bodySourceItems: buildBodySourceItems(),
    targetItemsByMachine,
    presetsByMachine,
    abcPaletteMachineIds: ['branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'],
    legacyAReadingIdMap: {
      'line-window': ['branch-a-line-traffic'],
      'direct-body': ['raw-darkpsy-oscillator'],
      'interval-body': ['branch-c-interval-body', 'branch-b573-synth-window'],
    },
    reference587RecipeMap: {
      'branch-a-linienkoerper': 'branch-a-line-traffic',
      'branch-b-spaltenenergie-koerper': 'branch-b573-synth-window',
      'branch-c-intervallkoerper': 'branch-c-interval-body',
    },
  };
}

export function getCarrierIntegralMachineMenuItem(machineId: CarrierIntegralMachineId): CarrierIntegralMenuMachineItem {
  const model = buildCarrierIntegralMenuModel();
  return model.machineItems.find((item) => item.id === machineId) ?? model.machineItems[0];
}

export function resolveCarrierIntegralMenuMachine(machineId: CarrierIntegralMachineId): CarrierIntegralMachineDefinition {
  return resolveCarrierIntegralMachine(machineId);
}

function buildBodySourceItems(): CarrierIntegralMenuBodySourceItem[] {
  const modes: CarrierIntegralBodySourceMode[] = ['raw_oscillator', 'harmonic_xplore', 'spektral_synthese', 'neutral_pigment', 'audio_donor'];
  return modes.map((mode) => {
    const contract = resolveCarrierIntegralBodySourceContract(mode);
    return {
      mode,
      label: BODY_SOURCE_LABELS[mode] ?? 'Archivquelle',
      summary: contract.summary,
      guardrail: contract.guardrail,
    };
  });
}

function buildTargetItems(machineId: CarrierIntegralMachineId): CarrierIntegralMenuTargetItem[] {
  const contracts = listCarrierIntegralSendContracts(machineId);
  const byTarget = new Map(contracts.map((contract) => [contract.targetId, contract]));
  return (Object.keys(TARGET_LABELS) as CarrierIntegralTargetId[]).map((targetId) => ({
    targetId,
    label: TARGET_LABELS[targetId],
    contract: byTarget.get(targetId) ?? null,
  }));
}
