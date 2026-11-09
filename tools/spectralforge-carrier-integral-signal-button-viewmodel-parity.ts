import type { CarrierIntegralMachineId } from '../src/features/l3lab/spectralForge/integral/carrierIntegralContracts';
import {
  createCarrierIntegralSignalButtonViewModel,
  DEFAULT_SIGNAL_SEND_TITLE,
  type CarrierIntegralExportTargetId,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSignalButtonViewModel';
import { resolveCarrierIntegralRawMelodicMaterialHandoffSpec } from '../src/features/l3lab/spectralForge/integral/carrierIntegralRawMelodicMaterialHandoff';

type Case = { name: string; actual: unknown; expected: unknown };

function oldSignalButtonViewModel(args: {
  selectedMachine: CarrierIntegralMachineId;
  targetId: CarrierIntegralExportTargetId;
  selectedProjectAvailable: boolean;
  libraryBusy: boolean;
  label: string;
  contractSummary?: string | null;
}) {
  const rawMelodicMaterialSpec =
    args.targetId === 'melodic-pink-export'
      ? resolveCarrierIntegralRawMelodicMaterialHandoffSpec(args.selectedMachine)
      : null;
  const rawMelodicMaterial = Boolean(rawMelodicMaterialSpec);
  return {
    disabled: !args.selectedProjectAvailable || args.libraryBusy,
    rawMelodicMaterial,
    rawMelodicMaterialSpec,
    title: rawMelodicMaterialSpec?.uiTitle ?? args.contractSummary ?? DEFAULT_SIGNAL_SEND_TITLE,
    label: rawMelodicMaterialSpec?.uiButtonLabel ?? args.label,
    rawMaterialDataFlag: rawMelodicMaterial ? 'true' : undefined,
    rawMaterialMachineId: rawMelodicMaterialSpec?.machineId,
  };
}

const checked: Case[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  checked.push({ name, actual, expected });
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${name}: expected ${e}, got ${a}`);
}

const scenarios: Array<Parameters<typeof createCarrierIntegralSignalButtonViewModel>[0] & { name: string }> = [
  {
    name: 'root follow enabled with contract summary',
    selectedMachine: 'branch-c-interval-body',
    targetId: 'root-follow-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Root Follow senden',
    contractSummary: 'Root summary',
  },
  {
    name: 'materialspur enabled with default summary fallback',
    selectedMachine: 'branch-a-line-traffic',
    targetId: 'materialspur-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Materialspur senden',
    contractSummary: null,
  },
  {
    name: 'melodic enabled for non raw material body',
    selectedMachine: 'material-render-body',
    targetId: 'melodic-pink-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Melodic Loop senden',
    contractSummary: 'Melodic summary',
  },
  {
    name: 'pure dieter melodic raw material enabled with project',
    selectedMachine: 'raw-darkpsy-oscillator',
    targetId: 'melodic-pink-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Melodic Loop senden',
    contractSummary: 'ignored summary',
  },
  {
    name: 'harmonic xplore melodic raw material enabled with project',
    selectedMachine: 'harmonic-xplore-direct-carrier',
    targetId: 'melodic-pink-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Melodic Loop senden',
    contractSummary: 'ignored summary',
  },
  {
    name: 'pure dieter root follow remains normal target',
    selectedMachine: 'raw-darkpsy-oscillator',
    targetId: 'root-follow-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Root Follow senden',
    contractSummary: 'Root summary',
  },
  {
    name: 'harmonic xplore materialspur remains normal target',
    selectedMachine: 'harmonic-xplore-direct-carrier',
    targetId: 'materialspur-export',
    selectedProjectAvailable: true,
    libraryBusy: false,
    label: 'An Materialspur senden',
    contractSummary: 'Material summary',
  },
  {
    name: 'disabled without selected project',
    selectedMachine: 'branch-b573-synth-window',
    targetId: 'root-follow-export',
    selectedProjectAvailable: false,
    libraryBusy: false,
    label: 'An Root Follow senden',
    contractSummary: 'Root summary',
  },
  {
    name: 'disabled while library busy',
    selectedMachine: 'branch-b573-synth-window',
    targetId: 'materialspur-export',
    selectedProjectAvailable: true,
    libraryBusy: true,
    label: 'An Materialspur senden',
    contractSummary: 'Material summary',
  },
  {
    name: 'raw melodic material keeps busy disabled but raw label',
    selectedMachine: 'harmonic-xplore-direct-carrier',
    targetId: 'melodic-pink-export',
    selectedProjectAvailable: false,
    libraryBusy: true,
    label: 'An Melodic Loop senden',
    contractSummary: 'ignored summary',
  },
];

for (const scenario of scenarios) {
  const { name, ...args } = scenario;
  check(name, createCarrierIntegralSignalButtonViewModel(args), oldSignalButtonViewModel(args));
}

check('default title constant', DEFAULT_SIGNAL_SEND_TITLE, oldSignalButtonViewModel(scenarios[1]).title);

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
