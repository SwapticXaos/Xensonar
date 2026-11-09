import { createInitialCarrierDonorV2State } from '../src/features/l3lab/spectralForge/state/storeCarrierDonorV2Boundary';
import { collectCarrierDonorV2InvalidationArtifacts } from '../src/features/l3lab/spectralForge/state/storeCarrierDonorV2FreshnessGraph';
import type { CarrierDonorV2State, V2Fingerprint, V2StageStatus } from '../src/features/l3lab/spectralForge/state/storeCarrierDonorV2Types';
import {
  beginBindingBuildState,
  beginCarrierSkeletonBuildState,
  beginDonorAnalysisBuildState,
  beginDonorAtlasBuildState,
  beginGestaltFieldBuildState,
  beginMaterialAllocationBuildState,
  beginMaterialFieldBuildState,
  failBindingBuildState,
  failMaterialAllocationBuildState,
  finishBindingBuildState,
  finishCarrierSkeletonBuildState,
  finishDonorAnalysisBuildState,
  finishDonorAtlasBuildState,
  finishGestaltFieldBuildState,
  finishMaterialAllocationBuildState,
  finishMaterialFieldBuildState,
  markCarrierV2DirtyState,
  markDonorV2DirtyState,
  setCarrierDonorTransferMacroAxesState,
  setCarrierDonorTransferPresetState,
  setCarrierDonorV2DonorUseModeState,
} from '../src/features/l3lab/spectralForge/state/storeCarrierDonorV2Lifecycle';

type ScenarioResult = {
  name: string;
  ok: true;
  canPreviewV2: boolean;
  reason: string;
};

const results: ScenarioResult[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function fp(key: string): V2Fingerprint {
  return { key, updatedAt: 1_700_000_000_000 };
}

function assertPreview(state: CarrierDonorV2State, expected: boolean, name: string): void {
  const actual = state.freshness.renderEligibility.canPreviewV2;
  assert(
    actual === expected,
    `${name}: expected canPreviewV2=${expected}, got ${actual} (${state.freshness.renderEligibility.reason})`
  );
  results.push({
    name,
    ok: true,
    canPreviewV2: actual,
    reason: state.freshness.renderEligibility.reason,
  });
}

function assertStage(state: CarrierDonorV2State, key: keyof CarrierDonorV2State['freshness'], status: V2StageStatus, name: string): void {
  const meta = state.freshness[key];
  assert(meta && typeof meta === 'object' && 'status' in meta, `${name}: ${String(key)} is not a stage meta`);
  assert(meta.status === status, `${name}: expected ${String(key)}=${status}, got ${meta.status}`);
}

function buildSyntheticReadyState(): CarrierDonorV2State {
  const carrierFp = fp('carrier:ready:4');
  const donorFp = fp('donor:ready:asset');
  let state = createInitialCarrierDonorV2State();

  state = beginCarrierSkeletonBuildState(state, carrierFp);
  assertPreview(state, false, 'carrier begin blocks preview');

  state = finishCarrierSkeletonBuildState(
    state,
    carrierFp,
    { anchors: [] } as any,
    { anchorCount: 1 } as any,
    { nodes: [], edges: [] } as any,
    { edgeCount: 0 } as any
  );
  assertPreview(state, false, 'carrier finish still needs gestalt and donor');

  state = beginGestaltFieldBuildState(state);
  assertPreview(state, false, 'gestalt begin blocks preview');

  state = finishGestaltFieldBuildState(
    state,
    { cells: [] } as any,
    { cellCount: 0 } as any
  );
  assertStage(state, 'gestaltFieldMeta', 'ready', 'gestalt finish marks gestalt ready');
  assertPreview(state, false, 'gestalt finish still needs donor and binding');

  state = beginDonorAnalysisBuildState(state, donorFp);
  assertPreview(state, false, 'donor analysis begin blocks preview');

  state = finishDonorAnalysisBuildState(
    state,
    donorFp,
    [] as any,
    { anchors: [] } as any,
    { anchorCount: 0 } as any
  );
  assertPreview(state, false, 'donor analysis finish still needs atlas and binding');

  state = beginDonorAtlasBuildState(state);
  assertPreview(state, false, 'donor atlas begin blocks preview');

  state = finishDonorAtlasBuildState(
    state,
    { anchors: [] } as any,
    { anchorCount: 0 } as any
  );
  assertStage(state, 'donorAtlasMeta', 'ready', 'donor atlas finish marks atlas ready');
  assertPreview(state, false, 'donor atlas finish still needs binding');

  state = beginBindingBuildState(state);
  assertPreview(state, false, 'binding begin blocks preview');

  state = finishBindingBuildState(
    state,
    [] as any,
    { bindingCount: 0 } as any
  );
  assertStage(state, 'bindingMeta', 'ready', 'binding finish marks binding ready');
  assertPreview(state, true, 'synthetic pigment ready path enables preview');

  return state;
}

function addRawMaterialReadyState(input: CarrierDonorV2State): CarrierDonorV2State {
  let state = setCarrierDonorV2DonorUseModeState(input, 'raw_texture_overlay');
  assertPreview(state, false, 'raw mode requires material field before preview');

  state = beginMaterialFieldBuildState(state);
  assertPreview(state, false, 'material field begin blocks raw preview');

  state = finishMaterialFieldBuildState(
    state,
    { bands: [] } as any,
    { bandCount: 0 } as any
  );
  assertStage(state, 'materialFieldMeta', 'ready', 'material field finish marks field ready');
  assertPreview(state, false, 'material field ready still needs allocation in raw mode');

  state = beginMaterialAllocationBuildState(state);
  assertPreview(state, false, 'material allocation begin blocks raw preview');

  state = finishMaterialAllocationBuildState(
    state,
    { allocations: [] } as any,
    { allocationCount: 0 } as any
  );
  assertStage(state, 'materialAllocationMeta', 'ready', 'material allocation finish marks allocation ready');
  assertPreview(state, true, 'raw texture overlay ready path enables preview after allocation');

  return state;
}


const carrierInvalidationTree = collectCarrierDonorV2InvalidationArtifacts('carrierInput');
assert(
  JSON.stringify(carrierInvalidationTree) === JSON.stringify(['skeleton', 'continuity', 'binding', 'gestaltField', 'materialAllocation']),
  `carrier invalidation graph drifted: ${carrierInvalidationTree.join(',')}`
);
const donorInvalidationTree = collectCarrierDonorV2InvalidationArtifacts('donorInput');
assert(
  JSON.stringify(donorInvalidationTree) === JSON.stringify(['donorAnalysis', 'donorAtlas', 'binding', 'materialField', 'materialAllocation']),
  `donor invalidation graph drifted: ${donorInvalidationTree.join(',')}`
);

const syntheticReady = buildSyntheticReadyState();

let modeState = setCarrierDonorV2DonorUseModeState(syntheticReady, 'raw_texture_overlay');
assertPreview(modeState, false, 'switching synthetic ready state to raw mode blocks preview until material is ready');
modeState = setCarrierDonorV2DonorUseModeState(modeState, 'synthetic_pigment');
assertPreview(modeState, true, 'switching back to synthetic pigment restores preview without material allocation');

const rawReady = addRawMaterialReadyState(syntheticReady);

let failedBinding = failBindingBuildState(rawReady, 'synthetic binding failure');
assertStage(failedBinding, 'bindingMeta', 'error', 'binding failure marks binding error');
assertPreview(failedBinding, false, 'binding failure blocks preview');

let rebuiltBinding = beginBindingBuildState(failedBinding);
assertPreview(rebuiltBinding, false, 'binding rebuild begin keeps preview blocked');
rebuiltBinding = finishBindingBuildState(rebuiltBinding, [] as any, { bindingCount: 0 } as any);
assertPreview(rebuiltBinding, true, 'binding rebuild finish restores raw preview');

const failedAllocation = failMaterialAllocationBuildState(rawReady, 'material allocation failure');
assertStage(failedAllocation, 'materialAllocationMeta', 'error', 'material allocation failure marks allocation error');
assertPreview(failedAllocation, false, 'material allocation failure blocks raw preview');

const carrierDirty = markCarrierV2DirtyState(rawReady, fp('carrier:dirty:5'), 'Werkbank wurde verändert.');
assertStage(carrierDirty, 'skeletonMeta', 'dirty', 'carrier dirty marks skeleton dirty');
assertPreview(carrierDirty, false, 'carrier dirty blocks preview');

const donorDirty = markDonorV2DirtyState(rawReady, fp('donor:dirty:asset'), 'Donorquelle wurde verändert.');
assertStage(donorDirty, 'donorAnalysisMeta', 'dirty', 'donor dirty marks donor analysis dirty');
assertPreview(donorDirty, false, 'donor dirty blocks preview');

const presetChanged = setCarrierDonorTransferPresetState(rawReady, 'noisy_cluster');
assertStage(presetChanged, 'materialAllocationMeta', 'dirty', 'transfer preset change marks material allocation dirty');
assertPreview(presetChanged, false, 'transfer preset change blocks raw preview until allocation is rebuilt');

const macroChanged = setCarrierDonorTransferMacroAxesState(rawReady, { donorLoad: 0.67 });
assert(macroChanged.transferPresetId === 'custom', 'transfer macro patch must switch preset to custom');
assertStage(macroChanged, 'materialAllocationMeta', 'dirty', 'transfer macro change marks material allocation dirty');
assertPreview(macroChanged, false, 'transfer macro change blocks raw preview until allocation is rebuilt');

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: results.length,
  results,
}, null, 2));
