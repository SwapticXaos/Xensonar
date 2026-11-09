import type {
  CarrierDonorV2FreshnessState,
  CarrierDonorV2State,
  V2StageMeta,
} from './storeCarrierDonorV2Types';

export type CarrierDonorV2DerivedArtifact =
  | 'skeleton'
  | 'continuity'
  | 'donorAnalysis'
  | 'donorAtlas'
  | 'binding'
  | 'gestaltField'
  | 'materialField'
  | 'materialAllocation';

export type CarrierDonorV2FreshnessRoot =
  | 'carrierInput'
  | 'donorInput'
  | 'transferProfile'
  | CarrierDonorV2DerivedArtifact;

const META_KEY_BY_ARTIFACT: Record<
  CarrierDonorV2DerivedArtifact,
  keyof Pick<
    CarrierDonorV2FreshnessState,
    | 'skeletonMeta'
    | 'continuityMeta'
    | 'donorAnalysisMeta'
    | 'donorAtlasMeta'
    | 'bindingMeta'
    | 'gestaltFieldMeta'
    | 'materialFieldMeta'
    | 'materialAllocationMeta'
  >
> = {
  skeleton: 'skeletonMeta',
  continuity: 'continuityMeta',
  donorAnalysis: 'donorAnalysisMeta',
  donorAtlas: 'donorAtlasMeta',
  binding: 'bindingMeta',
  gestaltField: 'gestaltFieldMeta',
  materialField: 'materialFieldMeta',
  materialAllocation: 'materialAllocationMeta',
};

/**
 * Semantic derivation graph only. It deliberately does not encode render
 * eligibility or payload clearing; lifecycle transitions keep those decisions
 * explicit. The graph answers one question: which derived artifacts become
 * stale when a source/derived node changes?
 */
export const CARRIER_DONOR_V2_DERIVATION_GRAPH: Readonly<
  Record<CarrierDonorV2FreshnessRoot, readonly CarrierDonorV2DerivedArtifact[]>
> = Object.freeze({
  carrierInput: ['skeleton', 'continuity'],
  donorInput: ['donorAnalysis'],
  transferProfile: ['materialAllocation'],
  skeleton: ['binding', 'gestaltField'],
  continuity: [],
  donorAnalysis: ['donorAtlas'],
  donorAtlas: ['binding', 'materialField'],
  binding: [],
  gestaltField: ['materialAllocation'],
  materialField: ['materialAllocation'],
  materialAllocation: [],
});

export function collectCarrierDonorV2InvalidationArtifacts(
  root: CarrierDonorV2FreshnessRoot,
): CarrierDonorV2DerivedArtifact[] {
  const ordered: CarrierDonorV2DerivedArtifact[] = [];
  const seen = new Set<CarrierDonorV2DerivedArtifact>();
  const queue: CarrierDonorV2FreshnessRoot[] = [root];

  while (queue.length) {
    const node = queue.shift()!;
    for (const artifact of CARRIER_DONOR_V2_DERIVATION_GRAPH[node]) {
      if (seen.has(artifact)) continue;
      seen.add(artifact);
      ordered.push(artifact);
      queue.push(artifact);
    }
  }

  return ordered;
}

function hasDerivedArtifactPayload(
  state: CarrierDonorV2State,
  artifact: CarrierDonorV2DerivedArtifact,
): boolean {
  switch (artifact) {
    case 'skeleton': return !!state.skeleton;
    case 'continuity': return !!state.continuityGraph;
    case 'donorAnalysis': return !!state.donorTensor;
    case 'donorAtlas': return !!state.donorAtlas;
    case 'binding': return state.bindingPreview.length > 0;
    case 'gestaltField': return !!state.gestaltField;
    case 'materialField': return !!state.materialField;
    case 'materialAllocation': return !!state.materialAllocationPreview;
  }
}

export type CarrierDonorV2InvalidationReasonMap = Partial<
  Record<CarrierDonorV2DerivedArtifact, string>
>;

/**
 * Marks an entire derivation subtree dirty/missing while preserving each
 * stage fingerprint. This matches the previous markCarrier/markDonor behavior:
 * a stale artifact retains the fingerprint that explains what it was built
 * from, but eligibility is recomputed by the caller after the transition.
 */
export function invalidateCarrierDonorV2FreshnessTree(
  state: CarrierDonorV2State,
  root: CarrierDonorV2FreshnessRoot,
  reasons: CarrierDonorV2InvalidationReasonMap,
): CarrierDonorV2FreshnessState {
  const freshness: CarrierDonorV2FreshnessState = { ...state.freshness };

  for (const artifact of collectCarrierDonorV2InvalidationArtifacts(root)) {
    const metaKey = META_KEY_BY_ARTIFACT[artifact];
    const currentMeta = freshness[metaKey] as V2StageMeta;
    freshness[metaKey] = {
      ...currentMeta,
      status: hasDerivedArtifactPayload(state, artifact) ? 'dirty' : 'missing',
      reason: reasons[artifact] ?? currentMeta.reason,
      lastError: null,
    } as never;
  }

  return freshness;
}
