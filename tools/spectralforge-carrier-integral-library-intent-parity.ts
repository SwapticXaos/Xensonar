import type { CarrierIntegralMachineId } from '../src/features/l3lab/spectralForge/integral/carrierIntegralContracts';
import type { CarrierIntegralSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSelection';
import type { CarrierIntegralSynthLabSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab';
import {
  createCarrierIntegralSupportedMachineResolver,
  type CarrierIntegralLibraryEntryIntentMeta,
  type CarrierIntegralLibrarySnapshotIntent,
  resolveCarrierIntegralEditorLoadFlow,
  resolveCarrierIntegralSendTargetFlow,
  resolveCarrierIntegralStoredDeviceValuesFlow,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralLibraryIntent';

type Case = { name: string; actual: unknown; expected: unknown };

const machineIds: CarrierIntegralMachineId[] = [
  'raw-darkpsy-oscillator',
  'material-render-body',
  'legacy-supernote-5.69',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
  'donatello-formant-window-body',
];
const resolveMachine = createCarrierIntegralSupportedMachineResolver(machineIds);

const meta = (machineId?: string | null): CarrierIntegralLibraryEntryIntentMeta & { id: string; name: string; createdAt: number; updatedAt: number; bpm: number; bars: number; activeTool: 'brush' } => ({
  id: `entry-${machineId ?? 'none'}`,
  name: `Entry ${machineId ?? 'none'}`,
  createdAt: 10,
  updatedAt: 20,
  bpm: 120,
  bars: 4,
  activeTool: 'brush',
  carrierIntegral: machineId
    ? {
        machineId,
        bodySourceMode: 'carrier-integral-body',
        presetId: null,
        updatedAt: 20,
      }
    : null,
});

const storedSelection = (machineId: string): Partial<CarrierIntegralSelection> => ({
  version: 'carrier-integral-selection-v1',
  machineId: machineId as CarrierIntegralMachineId,
  bodySourceMode: 'carrier-integral-body' as CarrierIntegralSelection['bodySourceMode'],
  presetId: 'stored-preset',
  paramsPatch: { density: 0.42 } as Partial<CarrierIntegralSelection['paramsPatch']>,
  updatedAt: 11,
  source: 'project',
});

const storedSynthLab: Partial<CarrierIntegralSynthLabSelection> = {
  version: 'carrier-integral-synth-lab-v1',
  presetId: 'neutral-body',
  paramsPatch: { sine: 0.5 },
  updatedAt: 12,
  source: 'project',
};

const snapshot = (selection?: Partial<CarrierIntegralSelection> | null, synthLab?: Partial<CarrierIntegralSynthLabSelection> | null): CarrierIntegralLibrarySnapshotIntent => ({
  carrierIntegralSelection: selection,
  carrierIntegralSynthLab: synthLab,
});

function oldResolveMachine(value: unknown): CarrierIntegralMachineId | null {
  return typeof value === 'string' && machineIds.some((id) => id === value)
    ? (value as CarrierIntegralMachineId)
    : null;
}

function oldEditorFlow(args: {
  entry: CarrierIntegralLibraryEntryIntentMeta;
  snapshot: CarrierIntegralLibrarySnapshotIntent;
  intentMachineId?: string | null;
}) {
  const stored = args.snapshot.carrierIntegralSelection;
  const requestedMachine = oldResolveMachine(args.intentMachineId);
  const storedMachine = oldResolveMachine(stored?.machineId);
  const metaMachine = oldResolveMachine(args.entry.carrierIntegral?.machineId);
  const machineId = requestedMachine ?? storedMachine ?? metaMachine;
  return {
    machineId,
    requestedMachine,
    storedMachine,
    metaMachine,
    selectionPatch: machineId ? { ...(stored ?? {}), machineId, source: 'project' } : null,
    synthLabPatch: args.snapshot.carrierIntegralSynthLab ? { ...args.snapshot.carrierIntegralSynthLab, source: 'project' } : null,
    auditionValueSource: 'stored-entry',
    activeDeviceLayer: 'gestalt',
    showLesartLab: true,
    showSynthLab: true,
    scrollToMelodicPinkSend: true,
  };
}

function oldSendFlow(args: {
  valueSource: 'stored-entry' | 'right-override';
  currentMachine: CarrierIntegralMachineId;
  storedSelection?: Partial<CarrierIntegralSelection> | null;
  entryMeta?: CarrierIntegralLibraryEntryIntentMeta['carrierIntegral'] | null;
}) {
  const storedMachine = oldResolveMachine(args.storedSelection?.machineId) ?? oldResolveMachine(args.entryMeta?.machineId);
  const useStored = args.valueSource === 'stored-entry' && !!storedMachine;
  return {
    storedMachine,
    effectiveMachine: useStored ? storedMachine : args.currentMachine,
    effectiveValueSource: useStored ? 'stored-entry' : 'right-override',
  };
}

function oldStoredDeviceValues(args: {
  storedSelection?: Partial<CarrierIntegralSelection> | null;
  storedSynthLab?: Partial<CarrierIntegralSynthLabSelection> | null;
}) {
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
  };
}

function toComparable(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

const checked: Case[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  checked.push({ name, actual: toComparable(actual), expected: toComparable(expected) });
}

function editorActual(entry: CarrierIntegralLibraryEntryIntentMeta & { name: string }, snap: CarrierIntegralLibrarySnapshotIntent, machineId?: string | null) {
  return resolveCarrierIntegralEditorLoadFlow({
    entry,
    snapshot: snap,
    intent: { machineId: machineId ?? undefined },
    resolveMachine,
  });
}

check(
  'editor load prefers requested machine over stored and meta',
  editorActual(meta('branch-b573-synth-window'), snapshot(storedSelection('branch-c-interval-body'), storedSynthLab), 'raw-darkpsy-oscillator'),
  oldEditorFlow({ entry: meta('branch-b573-synth-window'), snapshot: snapshot(storedSelection('branch-c-interval-body'), storedSynthLab), intentMachineId: 'raw-darkpsy-oscillator' }),
);
check(
  'editor load falls back to stored machine',
  editorActual(meta('branch-b573-synth-window'), snapshot(storedSelection('branch-c-interval-body'), null), null),
  oldEditorFlow({ entry: meta('branch-b573-synth-window'), snapshot: snapshot(storedSelection('branch-c-interval-body'), null), intentMachineId: null }),
);
check(
  'editor load falls back to meta machine',
  editorActual(meta('branch-b573-synth-window'), snapshot(null, null), 'unsupported-machine'),
  oldEditorFlow({ entry: meta('branch-b573-synth-window'), snapshot: snapshot(null, null), intentMachineId: 'unsupported-machine' }),
);
check(
  'editor load can produce no machine when all sources are unsupported',
  editorActual(meta('unsupported-machine'), snapshot(storedSelection('unsupported-stored'), null), 'unsupported-request'),
  oldEditorFlow({ entry: meta('unsupported-machine'), snapshot: snapshot(storedSelection('unsupported-stored'), null), intentMachineId: 'unsupported-request' }),
);
check(
  'send flow uses stored machine when stored-entry and stored selection is supported',
  resolveCarrierIntegralSendTargetFlow({ valueSource: 'stored-entry', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('branch-c-interval-body'), entryMeta: meta('branch-b573-synth-window').carrierIntegral, resolveMachine }),
  oldSendFlow({ valueSource: 'stored-entry', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('branch-c-interval-body'), entryMeta: meta('branch-b573-synth-window').carrierIntegral }),
);
check(
  'send flow uses meta machine when stored selection is unsupported',
  resolveCarrierIntegralSendTargetFlow({ valueSource: 'stored-entry', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('unsupported-stored'), entryMeta: meta('branch-b573-synth-window').carrierIntegral, resolveMachine }),
  oldSendFlow({ valueSource: 'stored-entry', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('unsupported-stored'), entryMeta: meta('branch-b573-synth-window').carrierIntegral }),
);
check(
  'send flow falls back to right override when value source is right override',
  resolveCarrierIntegralSendTargetFlow({ valueSource: 'right-override', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('branch-c-interval-body'), entryMeta: meta('branch-b573-synth-window').carrierIntegral, resolveMachine }),
  oldSendFlow({ valueSource: 'right-override', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('branch-c-interval-body'), entryMeta: meta('branch-b573-synth-window').carrierIntegral }),
);
check(
  'send flow falls back to right override when stored-entry has no supported stored machine',
  resolveCarrierIntegralSendTargetFlow({ valueSource: 'stored-entry', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('unsupported-stored'), entryMeta: meta('unsupported-meta').carrierIntegral, resolveMachine }),
  oldSendFlow({ valueSource: 'stored-entry', currentMachine: 'branch-a-line-traffic', storedSelection: storedSelection('unsupported-stored'), entryMeta: meta('unsupported-meta').carrierIntegral }),
);
check(
  'stored device values clone selection and synth lab',
  resolveCarrierIntegralStoredDeviceValuesFlow({ storedSelection: storedSelection('branch-c-interval-body'), storedSynthLab }),
  oldStoredDeviceValues({ storedSelection: storedSelection('branch-c-interval-body'), storedSynthLab }),
);
check(
  'stored device values allow missing selection and synth lab',
  resolveCarrierIntegralStoredDeviceValuesFlow({ storedSelection: null, storedSynthLab: null }),
  oldStoredDeviceValues({ storedSelection: null, storedSynthLab: null }),
);

const failed = checked.filter((item) => JSON.stringify(item.actual) !== JSON.stringify(item.expected));
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
