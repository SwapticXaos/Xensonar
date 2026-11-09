import {
  buildCarrierLoopBodyAudioPaintImportDetail,
  buildCarrierLoopBodyMaterialEntryStableId,
  carrierLoopBodyDurationSecForBars,
  carrierLoopBodyMachineDisplayName,
  carrierLoopBodyPreviewGain,
  carrierLoopBodySourceBars,
  resolveCarrierLoopBodyTransferExecutionPlan,
} from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan';
import { resolveCarrierIntegralTransferPlan } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSendTargets';
import type { CarrierIntegralSynthLabSelection } from '../src/features/l3lab/spectralForge/integral/carrierIntegralSynthLab';
import type { CarrierLoopBodyRootFollowArtifactSummary } from '../src/features/l3lab/spectralForge/integral/carrierLoopBodyTransferExecutionPlan';

const checked: string[] = [];
function check(name: string, condition: boolean, detail?: unknown) {
  checked.push(name);
  if (!condition) throw new Error(`${name}: ${JSON.stringify(detail)}`);
}

const synthLab: CarrierIntegralSynthLabSelection = {
  version: 'carrier-integral-synth-lab-v1',
  presetId: 'neutral-body',
  paramsPatch: { sine: 0.25, outputGain: 0.7 },
  updatedAt: 1,
  source: 'user',
};
const storedSynthLab: Partial<CarrierIntegralSynthLabSelection> = {
  presetId: 'darkpsy-edge',
  paramsPatch: { sawtooth: 0.5 },
  source: 'project',
};
const snapshot = {
  materialExport: {
    bars: 2.4,
    guideSegments: 4,
    guideMarkers: [],
    beatGuideVolume: 0.25,
  },
};
const entry = { id: 'entry-alpha', name: 'Carrier Alpha' };

check('Pure Dieter display name preserved', carrierLoopBodyMachineDisplayName('raw-darkpsy-oscillator') === 'Pure Dieter');
check('Dieter V2 display name comes from render body registry', carrierLoopBodyMachineDisplayName('material-render-body') === 'Dieter V2');
check('Donatello display name comes from render body registry', carrierLoopBodyMachineDisplayName('donatello-formant-window-body') === 'Donatello');
check('Branch B display name preserved', carrierLoopBodyMachineDisplayName('branch-b573-synth-window') === 'Bert');

check('Raw preview gain keeps old 0.16 balance', Math.abs(carrierLoopBodyPreviewGain('raw-darkpsy-oscillator', 0.5) - 0.08) < 1e-9);
check('Raw preview gain clamps to minimum', carrierLoopBodyPreviewGain('raw-darkpsy-oscillator', 0.01) === 0.04);
check('Rendered preview gain keeps old 0.92 balance', Math.abs(carrierLoopBodyPreviewGain('material-render-body', 0.5) - 0.46) < 1e-9);
check('Rendered preview gain clamps to maximum', carrierLoopBodyPreviewGain('material-render-body', 2) === 1);
check('Duration follows bars * four beats at bpm', Math.abs(carrierLoopBodyDurationSecForBars(2, 120) - 4) < 1e-9);
check('Duration clamps to at least one bar and positive bpm', carrierLoopBodyDurationSecForBars(0, 0) > 0);
check('Source bars round and clamp', carrierLoopBodySourceBars(snapshot) === 2);
check('Stable id uses prefix target and base36 timestamp', buildCarrierLoopBodyMaterialEntryStableId({ stableIdPrefix: 'body', targetId: 'root-follow-export', timestampMs: 123456 }) === 'body-root-follow-export-2n9c');

const purePlan = resolveCarrierLoopBodyTransferExecutionPlan({
  entry,
  snapshot,
  machineId: 'raw-darkpsy-oscillator',
  targetId: 'root-follow-export',
  targetLabel: 'Root Follow',
  valueSource: 'right-override',
  selectionOverride: { machineId: 'raw-darkpsy-oscillator' },
  currentSynthLab: synthLab,
  previewBpm: 120,
  previewVolume: 0.5,
  previewPitchSemitones: 3,
  timestampMs: 123456,
});
check('Right override plan keeps current synth lab', purePlan.activeSynthLab === synthLab, purePlan.activeSynthLab);
check('Pure plan does not claim render-body cache', purePlan.materialBodyPreviewCacheKey === null, purePlan);
check('Pure plan target name preserves machine label', purePlan.targetName === 'Carrier Alpha · Pure Dieter', purePlan.targetName);
check('Pure plan forwards deterministic stable id', purePlan.materialEntryStableId === 'raw-oscillator-material-root-follow-export-2n9c', purePlan.materialEntryStableId);

const dieterPlan = resolveCarrierLoopBodyTransferExecutionPlan({
  entry,
  snapshot,
  machineId: 'material-render-body',
  targetId: 'materialspur-export',
  targetLabel: 'Materialspur',
  valueSource: 'stored-entry',
  storedSynthLab,
  currentSynthLab: synthLab,
  previewBpm: 108,
  previewVolume: 0.75,
  previewPitchSemitones: -2,
  timestampMs: 987654,
});
check('Stored-entry plan normalizes stored synth lab', dieterPlan.activeSynthLab.source === 'project', dieterPlan.activeSynthLab);
check('Dieter V2 plan exposes render-body registry id', dieterPlan.registeredRenderBodyId === 'dieter-v2-rendered-material-body', dieterPlan);
check('Dieter V2 plan builds cache key', typeof dieterPlan.materialBodyPreviewCacheKey === 'string' && dieterPlan.materialBodyPreviewCacheKey.includes('material-body-preview:material-render-body:materialspur-export'), dieterPlan.materialBodyPreviewCacheKey);

const unsupportedError = (() => {
  try {
    resolveCarrierLoopBodyTransferExecutionPlan({
      entry,
      snapshot,
      machineId: 'raw-darkpsy-oscillator',
      targetId: 'abc-root-comparison' as any,
      targetLabel: 'ABC-Vergleich',
      valueSource: 'right-override',
      currentSynthLab: synthLab,
      previewBpm: 120,
      previewVolume: 0.5,
      previewPitchSemitones: 0,
      timestampMs: 1,
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
})();
check('Unsupported machine error keeps old label form', unsupportedError === 'Pure Dieter unterstützt ABC-Vergleich nicht.', unsupportedError);

const transferPlan = resolveCarrierIntegralTransferPlan({ machineId: 'branch-c-interval-body', targetId: 'melodic-pink-export' });
check('Fixture transfer plan exists for audio paint detail', Boolean(transferPlan), transferPlan);
const artifact: CarrierLoopBodyRootFollowArtifactSummary = {
  reason: 'fixture',
  config: {
    sourceKind: 'synth',
    renderMode: 'flowing',
    anchorGridStep: null,
    synthPattern: null,
    synthPatch: { carrierIntegralTimbre: { presetId: 'fixture' } } as any,
    formantWindowPlan: null,
  },
  baseHz: 110,
  noteCount: 5,
  trackCount: 1,
  branchALineTrafficCount: 0,
  b573WindowCount: 0,
  intervalWindowCount: 3,
};
const detail = buildCarrierLoopBodyAudioPaintImportDetail({
  materialEntryStableId: 'stable-1',
  targetName: 'Carrier Alpha · Cecilia',
  entryId: entry.id,
  machineId: 'branch-c-interval-body',
  machineLabel: 'Cecilia',
  sourceBars: 2,
  previewBpm: 120,
  durationSec: 4,
  targetId: 'melodic-pink-export',
  transferPlan: transferPlan!,
  artifact,
});
check('Audio paint detail preserves target id', detail.targetId === 'melodic-pink-export', detail);
check('Audio paint detail preserves carrier project id', detail.carrierProjectId === entry.id, detail);
check('Audio paint detail forwards interval counts', detail.intervalWindowCount === 3, detail);
check('Audio paint detail only includes config when plan requests it', (transferPlan!.usesAudioPaintImportDetail ? detail.config !== null : detail.config === null), detail.config);

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length }, null, 2));
