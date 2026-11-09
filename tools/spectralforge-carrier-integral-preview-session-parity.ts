import type { CarrierIntegralMachineId } from '../src/features/l3lab/spectralForge/integral/carrierIntegralContracts';
import { createDefaultCarrierIntegralSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSelection';
import { createDefaultCarrierIntegralSynthLabSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab';
import {
  CARRIER_INTEGRAL_PREVIEW_MAX_DURATION_SEC,
  CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS,
  createCarrierIntegralAuditionKey,
  createCarrierIntegralAuditionOverrides,
  createCarrierIntegralAuditionRequest,
  resolveCarrierIntegralPreviewSessionActivation,
  shouldRefreshCarrierIntegralPreviewSession,
  type CarrierIntegralAuditionValueSource,
} from '../src/features/l3lab/spectralForge/components/carrierIntegralVerwalten/carrierIntegralPreviewSession';

type Case = { name: string; actual: unknown; expected: unknown };
const checked: Case[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  checked.push({ name, actual, expected });
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${name}: expected ${e}, got ${a}`);
}

const selection = {
  ...createDefaultCarrierIntegralSelection(),
  machineId: 'branch-a-line-traffic' as CarrierIntegralMachineId,
  paramsPatch: { density: 0.42 } as Record<string, number>,
  source: 'user' as const,
};
const synthLab = {
  ...createDefaultCarrierIntegralSynthLabSelection(),
  paramsPatch: { outputGain: 0.73 },
  source: 'user' as const,
};
const snapshot = {
  name: 'Preview Snapshot',
  createdAt: 1,
  updatedAt: 2,
  spectralSnapshot: [0.1, 0.2, 0.3],
  waveformMix: { sine: 1, triangle: 0, sawtooth: 0, square: 0 },
  synthMode: 'additive',
} as any;

function oldKey(entryId: string, machineId: CarrierIntegralMachineId, valueSource: CarrierIntegralAuditionValueSource) {
  return `${entryId}:${machineId}:${valueSource}`;
}

function oldOverrides(machineId: CarrierIntegralMachineId, valueSource: CarrierIntegralAuditionValueSource) {
  return valueSource === 'right-override'
    ? {
        valueSource,
        selectionOverride: {
          ...selection,
          machineId,
          source: 'user' as const,
        },
        synthLabOverride: synthLab,
      }
    : { valueSource };
}

check(
  'audition key for right override',
  createCarrierIntegralAuditionKey({ entryId: 'entry-a', machineId: 'branch-c-interval-body', valueSource: 'right-override' }),
  oldKey('entry-a', 'branch-c-interval-body', 'right-override'),
);
check(
  'audition key for stored entry',
  createCarrierIntegralAuditionKey({ entryId: 'entry-b', machineId: 'branch-a-line-traffic', valueSource: 'stored-entry' }),
  oldKey('entry-b', 'branch-a-line-traffic', 'stored-entry'),
);
check(
  'right override clones selection with requested machine and user source',
  createCarrierIntegralAuditionOverrides({ machineId: 'material-render-body', valueSource: 'right-override', selection, synthLab }),
  oldOverrides('material-render-body', 'right-override'),
);
check(
  'stored entry does not attach right side overrides',
  createCarrierIntegralAuditionOverrides({ machineId: 'branch-b573-synth-window', valueSource: 'stored-entry', selection, synthLab }),
  oldOverrides('branch-b573-synth-window', 'stored-entry'),
);

const request = createCarrierIntegralAuditionRequest({
  projectName: 'Project A',
  snapshot,
  machineId: 'branch-c-interval-body',
  valueSource: 'right-override',
  selection,
  synthLab,
  previewPitchSemitones: -3,
  previewGain: 0.37,
  previewBpm: 123,
});
check('request carries project and snapshot', { projectName: request.projectName, snapshot: request.snapshot }, { projectName: 'Project A', snapshot });
check('request carries selected machine and duration', { machineId: request.machineId, maxPreviewDurationSec: request.maxPreviewDurationSec }, { machineId: 'branch-c-interval-body', maxPreviewDurationSec: 6 });
check('request carries pitch and bpm controls', { previewPitchSemitones: request.previewPitchSemitones, previewBpm: request.previewBpm }, { previewPitchSemitones: -3, previewBpm: 123 });
check('request carries caller-computed preview gain', request.previewGain, 0.37);
check('request includes right override value source', (request as any).valueSource, 'right-override');
check('request includes synth lab override for right override', (request as any).synthLabOverride, synthLab);

const activation = resolveCarrierIntegralPreviewSessionActivation({ machineId: 'legacy-supernote-5.69', nowMs: 4242 });
check('preview activation selects machine as user override', activation.selectionPatch, { machineId: 'legacy-supernote-5.69', source: 'user' });
check('preview activation stores last machine', activation.lastPreviewMachineId, 'legacy-supernote-5.69');
check('preview activation sets right override source', activation.auditionValueSource, 'right-override');
check('preview activation stamps gesture playhead start', activation.gesturePlayheadStartedAt, 4242);

check('refresh allowed only with project machine and idle audition', shouldRefreshCarrierIntegralPreviewSession({ selectedProjectAvailable: true, lastPreviewMachineId: 'branch-a-line-traffic', auditionBusyKey: null }), true);
check('refresh blocked without project', shouldRefreshCarrierIntegralPreviewSession({ selectedProjectAvailable: false, lastPreviewMachineId: 'branch-a-line-traffic', auditionBusyKey: null }), false);
check('refresh blocked without last machine', shouldRefreshCarrierIntegralPreviewSession({ selectedProjectAvailable: true, lastPreviewMachineId: null, auditionBusyKey: null }), false);
check('refresh blocked while audition busy', shouldRefreshCarrierIntegralPreviewSession({ selectedProjectAvailable: true, lastPreviewMachineId: 'branch-a-line-traffic', auditionBusyKey: 'entry:branch-a-line-traffic:right-override' }), false);
check('max duration constant remains six seconds', CARRIER_INTEGRAL_PREVIEW_MAX_DURATION_SEC, 6);
check('reaudition delay constant remains 180ms', CARRIER_INTEGRAL_PREVIEW_REAUDITION_DELAY_MS, 180);

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
