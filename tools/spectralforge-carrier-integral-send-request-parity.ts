import type { CarrierIntegralMachineId } from '../src/features/l3lab/spectralForge/integral/carrierIntegralContracts';
import type { CarrierIntegralSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSelection';
import { createDefaultCarrierIntegralSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab';
import { createDefaultCarrierIntegralSynthLabSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab';
import type { CarrierIntegralLibraryAuditionValueSource, CarrierIntegralSupportedMachineResolver } from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryIntent';
import type { CarrierIntegralExportTargetId } from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSignalButtonViewModel';
import {
  assertCarrierIntegralSendRequestAllowed,
  resolveCarrierIntegralSendRequestFlow,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralSendRequest';

type Case = { name: string; actual: unknown; expected: unknown };
const checked: Case[] = [];

function check(name: string, actual: unknown, expected: unknown) {
  checked.push({ name, actual, expected });
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${name}: expected ${e}, got ${a}`);
}

const supportedMachines: CarrierIntegralMachineId[] = [
  'raw-darkpsy-oscillator',
  'material-render-body',
  'legacy-supernote-5.69',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
  'donatello-formant-window-body',
];

const resolveMachine: CarrierIntegralSupportedMachineResolver = (value) =>
  typeof value === 'string' && supportedMachines.includes(value as CarrierIntegralMachineId)
    ? (value as CarrierIntegralMachineId)
    : null;

function selection(machineId: CarrierIntegralMachineId): CarrierIntegralSelection {
  return {
    ...createDefaultCarrierIntegralSelection(),
    machineId,
    paramsPatch: { densityCompression: 0.25 },
    source: 'user',
  } as CarrierIntegralSelection;
}

function storedSelection(machineId: unknown): Partial<CarrierIntegralSelection> {
  return {
    machineId: machineId as CarrierIntegralMachineId,
    paramsPatch: { densityCompression: 0.63 },
    source: 'project',
  };
}

function synthLab(): CarrierIntegralSynthLabSelection {
  return {
    ...createDefaultCarrierIntegralSynthLabSelection(),
    paramsPatch: { outputGain: 0.71 },
    source: 'user',
  };
}

function storedSynthLab(): Partial<CarrierIntegralSynthLabSelection> {
  return {
    presetId: 'darkpsy-edge',
    paramsPatch: { outputGain: 0.44 },
    source: 'project',
  };
}

function oldSendRequestFlow(args: {
  targetId: CarrierIntegralExportTargetId;
  valueSource: CarrierIntegralLibraryAuditionValueSource;
  currentMachine: CarrierIntegralMachineId;
  currentSelection: CarrierIntegralSelection;
  currentSynthLab: CarrierIntegralSynthLabSelection;
  storedSelection?: Partial<CarrierIntegralSelection> | null;
  storedSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
  entryMeta?: { machineId?: unknown } | null;
  previewBpm: number;
  previewVolume: number;
  previewPitchSemitones: number;
}) {
  const storedMachine = resolveMachine(args.storedSelection?.machineId) ?? resolveMachine(args.entryMeta?.machineId);
  const useStored = args.valueSource === 'stored-entry' && !!storedMachine;
  const effectiveMachine = useStored ? storedMachine : args.currentMachine;
  const effectiveValueSource = useStored ? 'stored-entry' : 'right-override';
  const blocked = false;
  return {
    effectiveMachine,
    effectiveValueSource,
    storedMachine,
    targetId: args.targetId,
    blocked,
    blockReason: null,
    selectionOverride:
      effectiveValueSource === 'right-override'
        ? {
            ...args.currentSelection,
            machineId: effectiveMachine,
            source: 'user' as const,
          }
        : null,
    synthLabOverride: effectiveValueSource === 'right-override' ? args.currentSynthLab : null,
    storedSynthLab: args.storedSynthLab,
    currentSynthLab: args.currentSynthLab,
    previewBpm: args.previewBpm,
    previewVolume: args.previewVolume,
    previewPitchSemitones: args.previewPitchSemitones,
  };
}

const currentSelection = selection('branch-a-line-traffic');
const currentSynthLab = synthLab();

const scenarios: Array<Parameters<typeof resolveCarrierIntegralSendRequestFlow>[0] & { name: string }> = [
  {
    name: 'right override materialspur uses current machine and overrides selection/synth',
    targetId: 'materialspur-export',
    valueSource: 'right-override',
    currentMachine: 'branch-a-line-traffic',
    currentSelection,
    currentSynthLab,
    storedSelection: storedSelection('branch-c-interval-body'),
    storedSynthLab: storedSynthLab(),
    entryMeta: { machineId: 'branch-b573-synth-window' },
    resolveMachine,
    previewBpm: 108,
    previewVolume: 0.82,
    previewPitchSemitones: 0,
  },
  {
    name: 'stored entry prefers stored selection machine',
    targetId: 'root-follow-export',
    valueSource: 'stored-entry',
    currentMachine: 'branch-a-line-traffic',
    currentSelection,
    currentSynthLab,
    storedSelection: storedSelection('branch-c-interval-body'),
    storedSynthLab: storedSynthLab(),
    entryMeta: { machineId: 'branch-b573-synth-window' },
    resolveMachine,
    previewBpm: 96,
    previewVolume: 0.5,
    previewPitchSemitones: -3,
  },
  {
    name: 'stored entry falls back to meta machine',
    targetId: 'root-follow-export',
    valueSource: 'stored-entry',
    currentMachine: 'branch-a-line-traffic',
    currentSelection,
    currentSynthLab,
    storedSelection: storedSelection('unsupported-machine'),
    storedSynthLab: null,
    entryMeta: { machineId: 'branch-b573-synth-window' },
    resolveMachine,
    previewBpm: 120,
    previewVolume: 1,
    previewPitchSemitones: 7,
  },
  {
    name: 'stored entry without stored/meta machine falls back to right override',
    targetId: 'materialspur-export',
    valueSource: 'stored-entry',
    currentMachine: 'donatello-formant-window-body',
    currentSelection: selection('donatello-formant-window-body'),
    currentSynthLab,
    storedSelection: storedSelection('unsupported-machine'),
    storedSynthLab: storedSynthLab(),
    entryMeta: { machineId: 'unsupported-meta' },
    resolveMachine,
    previewBpm: 111,
    previewVolume: 0.33,
    previewPitchSemitones: 12,
  },
  {
    name: 'pure dieter current machine allows melodic raw material in right override',
    targetId: 'melodic-pink-export',
    valueSource: 'right-override',
    currentMachine: 'raw-darkpsy-oscillator',
    currentSelection: selection('raw-darkpsy-oscillator'),
    currentSynthLab,
    storedSelection: storedSelection('branch-c-interval-body'),
    storedSynthLab: storedSynthLab(),
    entryMeta: { machineId: 'branch-c-interval-body' },
    resolveMachine,
    previewBpm: 108,
    previewVolume: 0.82,
    previewPitchSemitones: 0,
  },
  {
    name: 'pure dieter stored machine allows melodic raw material even when current machine differs',
    targetId: 'melodic-pink-export',
    valueSource: 'stored-entry',
    currentMachine: 'branch-c-interval-body',
    currentSelection: selection('branch-c-interval-body'),
    currentSynthLab,
    storedSelection: storedSelection('raw-darkpsy-oscillator'),
    storedSynthLab: storedSynthLab(),
    entryMeta: { machineId: 'branch-c-interval-body' },
    resolveMachine,
    previewBpm: 108,
    previewVolume: 0.82,
    previewPitchSemitones: 0,
  },
  {
    name: 'pure dieter remains allowed for root follow',
    targetId: 'root-follow-export',
    valueSource: 'stored-entry',
    currentMachine: 'branch-c-interval-body',
    currentSelection: selection('branch-c-interval-body'),
    currentSynthLab,
    storedSelection: storedSelection('raw-darkpsy-oscillator'),
    storedSynthLab: storedSynthLab(),
    entryMeta: { machineId: 'branch-c-interval-body' },
    resolveMachine,
    previewBpm: 108,
    previewVolume: 0.82,
    previewPitchSemitones: 0,
  },
];

for (const scenario of scenarios) {
  const { name, ...args } = scenario;
  check(name, resolveCarrierIntegralSendRequestFlow(args), oldSendRequestFlow(args));
}

const pureDieterMelodic = resolveCarrierIntegralSendRequestFlow(scenarios[4]);
let pureDieterMelodicResult = 'ok';
try {
  assertCarrierIntegralSendRequestAllowed(pureDieterMelodic);
} catch (error) {
  pureDieterMelodicResult = error instanceof Error ? error.message : String(error);
}
check('pure dieter melodic raw material request is allowed', pureDieterMelodicResult, 'ok');

const allowed = resolveCarrierIntegralSendRequestFlow(scenarios[6]);
let allowedResult = 'ok';
try {
  assertCarrierIntegralSendRequestAllowed(allowed);
} catch (error) {
  allowedResult = error instanceof Error ? error.message : String(error);
}
check('send request guard allows non blocked request', allowedResult, 'ok');

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
