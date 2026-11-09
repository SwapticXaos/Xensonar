import type { AudioSourceAsset } from '../src/features/l3lab/spectralForge/audio/AudioImporterTypes';
import type { CommitDomain, SourceAssetContext } from '../src/features/l3lab/spectralForge/model/forge3Layers';
import {
  createInitialSourcePreviewCommitState,
  createSourcePreviewCommitStoreActions,
  setForge3EditTargetState,
  setLastCommitDomainState,
  setSourceAssetState,
  setSourcePreviewModeState,
  type SourcePreviewCommitState,
} from '../src/features/l3lab/spectralForge/state/storeSourcePreviewCommitActions';
import type {
  Forge3EditTarget,
  SourcePreviewMode,
} from '../src/features/l3lab/spectralForge/state/storeTypes';

function makeAsset(label = 'sample'): AudioSourceAsset {
  const samples = new Float32Array([0, 0.25, -0.25, 0.5]);
  return {
    kind: 'audio',
    fileName: `${label}.wav`,
    monoSamples: samples,
    leftSamples: samples,
    rightSamples: samples,
    midSamples: samples,
    sideSamples: samples,
    sampleRate: 44100,
    originalDuration: 4,
    channelCount: 2,
    importStartSec: 0,
    importDurationSec: 4,
    waveformPreview: new Float32Array([0, 0.5]),
    stereoWidthPreview: new Float32Array([0.2, 0.4]),
  };
}

function oldSetSourceAssetState(
  state: SourcePreviewCommitState,
  asset: AudioSourceAsset | null,
  context?: SourceAssetContext,
): Partial<SourcePreviewCommitState> {
  return {
    sourceAsset: asset,
    sourceAssetContext: asset ? (context ?? 'forge3_main') : 'none',
    sourcePreviewMode: asset ? state.sourcePreviewMode : 'forge',
  };
}

function oldSetSourcePreviewModeState(
  _state: SourcePreviewCommitState,
  mode: SourcePreviewMode,
): Partial<SourcePreviewCommitState> {
  return { sourcePreviewMode: mode };
}

function oldSetLastCommitDomainState(
  _state: SourcePreviewCommitState,
  domain: CommitDomain,
): Partial<SourcePreviewCommitState> {
  return { lastCommitDomain: domain };
}

function oldSetForge3EditTargetState(
  _state: SourcePreviewCommitState,
  target: Forge3EditTarget,
): Partial<SourcePreviewCommitState> {
  return { forge3EditTarget: target };
}

function normalize(value: unknown): unknown {
  if (value instanceof Float32Array) return Array.from(value).map((entry) => Number(entry.toFixed(12)));
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
  }
  return value;
}

function assertEqual(label: string, actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(normalize(actual));
  const expectedJson = JSON.stringify(normalize(expected));
  if (actualJson !== expectedJson) {
    throw new Error(`${label} mismatch\nactual:   ${actualJson}\nexpected: ${expectedJson}`);
  }
}

function applyPatch<T extends SourcePreviewCommitState>(state: T, patch: Partial<T>): T {
  return { ...state, ...patch };
}

function runStoreActionScenario(
  label: string,
  prepare: (state: SourcePreviewCommitState) => SourcePreviewCommitState,
  run: (actions: ReturnType<typeof createSourcePreviewCommitStoreActions<SourcePreviewCommitState>>) => void,
  expected: SourcePreviewCommitState,
): void {
  let state = prepare(createInitialSourcePreviewCommitState());
  const set = (partial: Partial<SourcePreviewCommitState> | ((state: SourcePreviewCommitState) => Partial<SourcePreviewCommitState>)) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = applyPatch(state, patch);
  };
  const actions = createSourcePreviewCommitStoreActions<SourcePreviewCommitState>(set);
  run(actions);
  assertEqual(label, state, expected);
}

const checked: string[] = [];
function check(label: string, actual: unknown, expected: unknown): void {
  assertEqual(label, actual, expected);
  checked.push(label);
}

const base = createInitialSourcePreviewCommitState();
const assetA = makeAsset('carrier-source');
const assetB = makeAsset('donor-source');
const sourceWindowState = applyPatch(base, oldSetSourcePreviewModeState(base, 'sourceWindow'));
const loadedDefaultContext = applyPatch(sourceWindowState, oldSetSourceAssetState(sourceWindowState, assetA));
const loadedCarrierDonorContext = applyPatch(sourceWindowState, oldSetSourceAssetState(sourceWindowState, assetB, 'carrier_donor_lab'));
const committedHybrid = applyPatch(loadedCarrierDonorContext, oldSetLastCommitDomainState(loadedCarrierDonorContext, 'hybrid_body'));

check('initial source preview commit state', createInitialSourcePreviewCommitState(), {
  sourceAsset: null,
  sourceAssetContext: 'none',
  sourcePreviewMode: 'forge',
  lastCommitDomain: 'none',
  forge3EditTarget: 'linked_body',
});
check('setSourceAsset keeps existing preview mode for non-null asset', setSourceAssetState(sourceWindowState, assetA), oldSetSourceAssetState(sourceWindowState, assetA));
check('setSourceAsset defaults context to forge3_main', applyPatch(sourceWindowState, setSourceAssetState(sourceWindowState, assetA)), loadedDefaultContext);
check('setSourceAsset preserves explicit carrier_donor_lab context', setSourceAssetState(sourceWindowState, assetB, 'carrier_donor_lab'), oldSetSourceAssetState(sourceWindowState, assetB, 'carrier_donor_lab'));
check('setSourceAsset null clears context and forces forge preview', setSourceAssetState(loadedCarrierDonorContext, null), oldSetSourceAssetState(loadedCarrierDonorContext, null));
check('setSourcePreviewMode only changes preview mode', setSourcePreviewModeState(base, 'sourceFull'), oldSetSourcePreviewModeState(base, 'sourceFull'));
check('setLastCommitDomain only changes commit domain', setLastCommitDomainState(loadedCarrierDonorContext, 'source_derived_body'), oldSetLastCommitDomainState(loadedCarrierDonorContext, 'source_derived_body'));
check('setForge3EditTarget only changes edit target', setForge3EditTargetState(committedHybrid, 'workbench'), oldSetForge3EditTargetState(committedHybrid, 'workbench'));

runStoreActionScenario(
  'store action setSourceAsset matches old inline update',
  (state) => applyPatch(state, oldSetSourcePreviewModeState(state, 'sourceWindow')),
  (actions) => actions.setSourceAsset(assetA),
  loadedDefaultContext,
);
checked.push('store action setSourceAsset matches old inline update');

runStoreActionScenario(
  'store action setSourceAsset null matches old inline update',
  (state) => loadedCarrierDonorContext,
  (actions) => actions.setSourceAsset(null),
  applyPatch(loadedCarrierDonorContext, oldSetSourceAssetState(loadedCarrierDonorContext, null)),
);
checked.push('store action setSourceAsset null matches old inline update');

runStoreActionScenario(
  'store action setSourcePreviewMode matches old inline update',
  (state) => state,
  (actions) => actions.setSourcePreviewMode('sourceFull'),
  applyPatch(base, oldSetSourcePreviewModeState(base, 'sourceFull')),
);
checked.push('store action setSourcePreviewMode matches old inline update');

runStoreActionScenario(
  'store action setLastCommitDomain matches old inline update',
  (state) => loadedCarrierDonorContext,
  (actions) => actions.setLastCommitDomain('form_derived_body'),
  applyPatch(loadedCarrierDonorContext, oldSetLastCommitDomainState(loadedCarrierDonorContext, 'form_derived_body')),
);
checked.push('store action setLastCommitDomain matches old inline update');

runStoreActionScenario(
  'store action setForge3EditTarget matches old inline update',
  (state) => committedHybrid,
  (actions) => actions.setForge3EditTarget('workbench'),
  applyPatch(committedHybrid, oldSetForge3EditTargetState(committedHybrid, 'workbench')),
);
checked.push('store action setForge3EditTarget matches old inline update');

console.log(JSON.stringify({ ok: true, checkedScenarios: checked.length, checked }, null, 2));
