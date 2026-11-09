import type {
  CarrierIntegralMachineFamily,
  CarrierIntegralMachineId,
} from './carrierIntegralContracts';
import { listCarrierIntegralMachines, resolveCarrierIntegralMachine } from './carrierIntegralRegistry';
import type { CarrierLoopBodyCurveSourceKind } from './carrierLoopBodyCurveTypes';
import type {
  CarrierLoopBodyKind,
  CarrierLoopBodyPreviewBody,
  CarrierLoopBodyRenderStrategy,
  CarrierLoopBodySourceKind,
} from './carrierLoopBodyModel';

export const CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION =
  'carrier-integral-machine-capabilities-single-antonia-3.2.91-7.7.74';

export type CarrierIntegralMachineCapabilityLayer =
  | 'experimental-carrier-reading'
  | 'raw-material-body-reading'
  | 'harmonic-ratio-carrier-reading';

export type CarrierIntegralMachineAdapterCapability =
  | 'implemented-branch-c-carrier-loop-body-adapter'
  | 'implemented-branch-b573-window-prism-adapter'
  | 'planned-distinct-line-adapter'
  | 'direct-ratio-body-family'
  | 'not-applicable';

export type CarrierIntegralMachinePreviewCapability =
  | 'cecilia-version-preview-candidate'
  | 'bert-window-prism-preview-candidate'
  | 'future-adapter-preview-candidate'
  | 'separate-body-preview'
  | 'none';

export type CarrierIntegralMachineOwnershipCapability =
  | 'first-adapter-not-exclusive-owner'
  | 'future-adapter-peer'
  | 'separate-body-family-not-carrier-loop-body'
  | 'no-ownership';

export type CarrierIntegralMachineRendererReadiness =
  | 'ready'
  | 'candidate'
  | 'fallback-only'
  | 'unsupported';

export type CarrierIntegralMachineProgressContract =
  | 'cooperative'
  | 'blocking'
  | 'none';

export type CarrierIntegralMachinePreviewCacheContract =
  | 'content-addressed'
  | 'parameter-addressed'
  | 'none';

export type CarrierIntegralRootFollowParity =
  | 'timbre-partial'
  | 'ratio-only'
  | 'pitch-only'
  | 'none';

export type CarrierIntegralMachineCapability = {
  version: typeof CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION;
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  machineFamily: CarrierIntegralMachineFamily;
  bodyKind: CarrierLoopBodyKind;
  sourceKind: CarrierLoopBodySourceKind;
  renderStrategy: CarrierLoopBodyRenderStrategy;
  fallbackPreviewBody: CarrierLoopBodyPreviewBody;
  capabilityLayer: CarrierIntegralMachineCapabilityLayer;
  adapterCapability: CarrierIntegralMachineAdapterCapability;
  curveSourceKind: CarrierLoopBodyCurveSourceKind | null;
  previewCapability: CarrierIntegralMachinePreviewCapability;
  ownershipCapability: CarrierIntegralMachineOwnershipCapability;
  experimentalPeerGroupId: 'antonia-bert-cecilia-experimental-carrier-readings' | null;
  requiresMaterialBody: boolean;
  requiresFormantPlan: boolean;
  requiresDonorAtlas: boolean;
  requiresNeutralPigment: boolean;
  renderReady: boolean;
  contractOnly: boolean;
  rendererReadiness: CarrierIntegralMachineRendererReadiness;
  supportsPrewarm: boolean;
  supportsLoopPlayback: boolean;
  progressCallbacks: CarrierIntegralMachineProgressContract;
  previewCache: CarrierIntegralMachinePreviewCacheContract;
  cacheKeyVersion: string;
  rootFollowParity: CarrierIntegralRootFollowParity;
  supportsRootFollowSend: boolean;
  supportsMaterialTrackSend: boolean;
  supportsLoopTrackDirectSend: boolean;
  supportsMelodicDirectSend: boolean;
  compatibilitySummary: string;
  guardrail: string;
};

export const CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID =
  'antonia-bert-cecilia-experimental-carrier-readings' as const;

export const CARRIER_INTEGRAL_EXPERIMENTAL_READING_MACHINE_IDS = [
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
] as const satisfies readonly CarrierIntegralMachineId[];

export type CarrierIntegralExperimentalReadingMachineId =
  typeof CARRIER_INTEGRAL_EXPERIMENTAL_READING_MACHINE_IDS[number];

export function isCarrierIntegralExperimentalReadingMachine(
  machineId: CarrierIntegralMachineId,
): machineId is CarrierIntegralExperimentalReadingMachineId {
  return (CARRIER_INTEGRAL_EXPERIMENTAL_READING_MACHINE_IDS as readonly CarrierIntegralMachineId[]).includes(machineId);
}

export function carrierIntegralMachineBodyKindFor(
  machineId: CarrierIntegralMachineId,
): CarrierLoopBodyKind {
  if (machineId === 'raw-darkpsy-oscillator' || machineId === 'harmonic-xplore-direct-carrier' || machineId === 'spektral-synthese-body') {
    return 'raw-material-body';
  }
  if (isCarrierIntegralExperimentalReadingMachine(machineId)) {
    return 'synthetic-root-follow-config-body';
  }
  return 'unsupported-body';
}

export function carrierIntegralMachineSourceKindFor(
  bodyKind: CarrierLoopBodyKind,
): CarrierLoopBodySourceKind {
  switch (bodyKind) {
    case 'raw-material-body':
      return 'raw-oscillator-carrier';
    case 'synthetic-root-follow-config-body':
      return 'synthetic-root-follow-config';
    default:
      return 'unsupported-source';
  }
}

export function carrierIntegralMachineRenderStrategyFor(
  bodyKind: CarrierLoopBodyKind,
): CarrierLoopBodyRenderStrategy {
  switch (bodyKind) {
    case 'raw-material-body':
      return 'raw-rendered-audio-material';
    case 'synthetic-root-follow-config-body':
      return 'synthetic-root-follow-config';
    default:
      return 'unsupported';
  }
}

export function carrierIntegralMachineFallbackPreviewBodyFor(
  bodyKind: CarrierLoopBodyKind,
): CarrierLoopBodyPreviewBody {
  switch (bodyKind) {
    case 'raw-material-body':
      return 'raw-spectral-buffer';
    case 'synthetic-root-follow-config-body':
      return 'root-follow-config-buffer';
    default:
      return 'none';
  }
}

function capabilityLayerFor(machineId: CarrierIntegralMachineId): CarrierIntegralMachineCapabilityLayer {
  if (machineId === 'raw-darkpsy-oscillator') return 'raw-material-body-reading';
  if (machineId === 'harmonic-xplore-direct-carrier' || machineId === 'spektral-synthese-body') return 'harmonic-ratio-carrier-reading';
  return 'experimental-carrier-reading';
}

function adapterCapabilityFor(machineId: CarrierIntegralMachineId): CarrierIntegralMachineAdapterCapability {
  switch (machineId) {
    case 'branch-c-interval-body':
      return 'implemented-branch-c-carrier-loop-body-adapter';
    case 'branch-b573-synth-window':
      return 'implemented-branch-b573-window-prism-adapter';
    case 'branch-a-line-traffic':
      return 'planned-distinct-line-adapter';
    case 'legacy-supernote-5.69':
      return 'not-applicable';
    case 'harmonic-xplore-direct-carrier':
    case 'spektral-synthese-body':
      return 'direct-ratio-body-family';
    default:
      return 'not-applicable';
  }
}

function curveSourceKindFor(machineId: CarrierIntegralMachineId): CarrierLoopBodyCurveSourceKind | null {
  switch (machineId) {
    case 'branch-c-interval-body':
      return 'branch-c-interval-window-body-plan';
    case 'branch-b573-synth-window':
      return 'branch-b573-synth-window-body-plan';
    case 'branch-a-line-traffic':
      return 'branch-a-line-traffic-plan';
    case 'legacy-supernote-5.69':
      return null;
    case 'raw-darkpsy-oscillator':
    case 'harmonic-xplore-direct-carrier':
    case 'spektral-synthese-body':
      return 'raw-material-body';
    default:
      return null;
  }
}

function previewCapabilityFor(machineId: CarrierIntegralMachineId): CarrierIntegralMachinePreviewCapability {
  switch (machineId) {
    case 'branch-c-interval-body':
      return 'cecilia-version-preview-candidate';
    case 'branch-b573-synth-window':
      return 'bert-window-prism-preview-candidate';
    case 'branch-a-line-traffic':
      return 'future-adapter-preview-candidate';
    case 'legacy-supernote-5.69':
      return 'separate-body-preview';
    case 'raw-darkpsy-oscillator':
    case 'harmonic-xplore-direct-carrier':
    case 'spektral-synthese-body':
      return 'separate-body-preview';
    default:
      return 'none';
  }
}

function ownershipCapabilityFor(machineId: CarrierIntegralMachineId): CarrierIntegralMachineOwnershipCapability {
  switch (machineId) {
    case 'branch-c-interval-body':
      return 'first-adapter-not-exclusive-owner';
    case 'branch-a-line-traffic':
    case 'branch-b573-synth-window':
      return 'future-adapter-peer';
    case 'legacy-supernote-5.69':
      return 'separate-body-family-not-carrier-loop-body';
    case 'raw-darkpsy-oscillator':
    case 'harmonic-xplore-direct-carrier':
    case 'spektral-synthese-body':
      return 'separate-body-family-not-carrier-loop-body';
    default:
      return 'no-ownership';
  }
}

function compatibilitySummaryFor(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case 'branch-a-line-traffic':
      return 'Antonia uses the Branch-A line-traffic reading as the single active Antonia variance reference; it is not folded into Bert or Cecilia.';
    case 'branch-c-interval-body':
      return 'Cecilia remains the first CarrierLoopBody curve adapter/audition path; Antonia and Bert remain peer readings with their own strategies.';
    case 'legacy-supernote-5.69':
      return 'The 5.69 direct route remains legacy/compatibility material and is not exposed as the active Antonia.';
    case 'branch-b573-synth-window':
      return 'Bert remains a stretch/prism reading with its own LocalField window strategy.';
    case 'raw-darkpsy-oscillator':
      return 'Pure Dieter remains a raw material body family and is not folded into Antonia/Bert/Cecilia.';
    case 'harmonic-xplore-direct-carrier':
      return 'HarmonicXplorE remains a direct ratio/timbre renderer.';
    case 'spektral-synthese-body':
      return 'SpektralSynthese derives HX-compatible parameters from image descriptors.';
    default:
      return 'Archived/unsupported machine remains outside the active Core capability matrix.';
  }
}

function guardrailFor(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case 'branch-c-interval-body':
      return 'Keep Cecilia direct and versioned without UI meta-labels; do not route Antonia or Bert through the Cecilia adapter.';
    case 'branch-a-line-traffic':
      return 'Do not alias Antonia to 5.69 Legacy, Bert or Cecilia; Branch-A is the single active Antonia surface.';
    case 'legacy-supernote-5.69':
      return 'Do not re-expose 5.69 Legacy as active Antonia.';
    case 'branch-b573-synth-window':
      return 'Do not route this peer through another Core synthetic adapter; keep its own route explicit.';
    case 'raw-darkpsy-oscillator':
      return 'Do not route Pure Dieter through synthetic CarrierLoopBody adapters; keep raw-material-body identity and send Melodic Direct only as raw material handoff.';
    case 'harmonic-xplore-direct-carrier':
      return 'Do not reduce HarmonicXplorE Direct to a Synth-Labor preset lens; it is a separate direct ratio renderer and may sound foreign.';
    case 'spektral-synthese-body':
      return 'Do not auto-replace HarmonicXplorE or Pure Dieter with SpektralSynthese; keep it as an explicit descriptor-informed hearing option.';
    default:
      return resolveCarrierIntegralMachine(machineId).guardrail;
  }
}

function rendererReadinessFor(args: {
  bodyKind: CarrierLoopBodyKind;
  adapterCapability: CarrierIntegralMachineAdapterCapability;
}): CarrierIntegralMachineRendererReadiness {
  if (args.bodyKind === 'unsupported-body') return 'unsupported';
  if (args.adapterCapability === 'implemented-branch-c-carrier-loop-body-adapter' || args.adapterCapability === 'implemented-branch-b573-window-prism-adapter') return 'candidate';
  if (args.adapterCapability === 'planned-distinct-line-adapter') return 'fallback-only';
  return 'ready';
}

function progressCallbacksFor(machineId: CarrierIntegralMachineId): CarrierIntegralMachineProgressContract {
  return machineId === 'harmonic-xplore-direct-carrier' || machineId === 'spektral-synthese-body' ? 'cooperative' : 'blocking';
}

function previewCacheFor(machineId: CarrierIntegralMachineId): CarrierIntegralMachinePreviewCacheContract {
  return machineId === 'harmonic-xplore-direct-carrier' || machineId === 'spektral-synthese-body'
    ? 'content-addressed'
    : 'parameter-addressed';
}

function cacheKeyVersionFor(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case 'harmonic-xplore-direct-carrier':
      return 'hx-direct-content-key-7.6.12';
    case 'spektral-synthese-body':
      return 'spektral-synthese-descriptor-key-7.7.6';
    case 'raw-darkpsy-oscillator':
      return 'raw-darkpsy-parameter-key-7.6.12';
    case 'legacy-supernote-5.69':
      return 'legacy-supernote-key-7.7.74';
    case 'branch-a-line-traffic':
    case 'branch-b573-synth-window':
    case 'branch-c-interval-body':
      return 'experimental-carrier-reading-key-7.6.12';
    default:
      return 'unsupported-preview-key-7.6.12';
  }
}

function rootFollowParityFor(machineId: CarrierIntegralMachineId): CarrierIntegralRootFollowParity {
  switch (machineId) {
    case 'branch-c-interval-body':
    case 'branch-b573-synth-window':
    case 'spektral-synthese-body':
    case 'raw-darkpsy-oscillator':
      return 'timbre-partial';
    case 'legacy-supernote-5.69':
    case 'branch-a-line-traffic':
      return 'pitch-only';
    case 'harmonic-xplore-direct-carrier':
      return 'ratio-only';
    default:
      return 'none';
  }
}

export function resolveCarrierIntegralMachineCapability(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralMachineCapability {
  const machine = resolveCarrierIntegralMachine(machineId);
  const bodyKind = carrierIntegralMachineBodyKindFor(machine.id);
  const sourceKind = carrierIntegralMachineSourceKindFor(bodyKind);
  const renderStrategy = carrierIntegralMachineRenderStrategyFor(bodyKind);
  const adapterCapability = adapterCapabilityFor(machine.id);
  const contractOnly = bodyKind === 'unsupported-body';
  const renderReady = !contractOnly;
  return {
    version: CARRIER_INTEGRAL_MACHINE_CAPABILITIES_VERSION,
    machineId: machine.id,
    machineLabel: machine.shortLabel,
    machineFamily: machine.family,
    bodyKind,
    sourceKind,
    renderStrategy,
    fallbackPreviewBody: carrierIntegralMachineFallbackPreviewBodyFor(bodyKind),
    capabilityLayer: capabilityLayerFor(machine.id),
    adapterCapability,
    curveSourceKind: curveSourceKindFor(machine.id),
    previewCapability: previewCapabilityFor(machine.id),
    ownershipCapability: ownershipCapabilityFor(machine.id),
    experimentalPeerGroupId: isCarrierIntegralExperimentalReadingMachine(machine.id)
      ? CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID
      : null,
    requiresMaterialBody: false,
    requiresFormantPlan: false,
    requiresDonorAtlas: false,
    requiresNeutralPigment: false,
    renderReady,
    contractOnly,
    rendererReadiness: rendererReadinessFor({ bodyKind, adapterCapability }),
    supportsPrewarm: renderReady,
    supportsLoopPlayback: renderReady,
    progressCallbacks: progressCallbacksFor(machine.id),
    previewCache: previewCacheFor(machine.id),
    cacheKeyVersion: cacheKeyVersionFor(machine.id),
    rootFollowParity: rootFollowParityFor(machine.id),
    supportsRootFollowSend: Boolean(machine.targetSupport['root-follow-export']),
    supportsMaterialTrackSend: Boolean(machine.targetSupport['materialspur-export']),
    supportsLoopTrackDirectSend: Boolean(machine.targetSupport['loop-track-direct-export']),
    supportsMelodicDirectSend: Boolean(machine.targetSupport['melodic-pink-export']),
    compatibilitySummary: compatibilitySummaryFor(machine.id),
    guardrail: guardrailFor(machine.id),
  };
}

export function listCarrierIntegralMachineCapabilities(): CarrierIntegralMachineCapability[] {
  return listCarrierIntegralMachines().map((machine) => resolveCarrierIntegralMachineCapability(machine.id));
}

export function assertCarrierIntegralMachineCapabilities(): void {
  const capabilities = listCarrierIntegralMachineCapabilities();
  const byId = new Map(capabilities.map((capability) => [capability.machineId, capability]));
  const require = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  for (const machineId of ['raw-darkpsy-oscillator', 'harmonic-xplore-direct-carrier', 'spektral-synthese-body', 'branch-a-line-traffic', 'branch-b573-synth-window', 'branch-c-interval-body'] as const) {
    require(Boolean(byId.get(machineId)), `${machineId} capability missing.`);
  }
  require(byId.size === 6, `Core capability matrix must expose exactly six active machines with one Antonia, got ${byId.size}.`);
  require(byId.get('branch-c-interval-body')?.adapterCapability === 'implemented-branch-c-carrier-loop-body-adapter', 'Cecilia adapter capability mismatch.');
  require(byId.get('branch-b573-synth-window')?.adapterCapability === 'implemented-branch-b573-window-prism-adapter', 'Bert adapter capability mismatch.');
  require(byId.get('branch-a-line-traffic')?.renderStrategy === 'synthetic-root-follow-config', 'Antonia must remain the Branch-A synthetic Root-Follow preview route.');
  require(!byId.has('legacy-supernote-5.69'), '5.69 Legacy must not be exposed as the active Antonia capability.');
  require(byId.get('harmonic-xplore-direct-carrier')?.adapterCapability === 'direct-ratio-body-family', 'HarmonicXplorE adapter capability mismatch.');
}

export function inspectCarrierIntegralMachineCapabilities() {
  assertCarrierIntegralMachineCapabilities();
  return listCarrierIntegralMachineCapabilities();
}
