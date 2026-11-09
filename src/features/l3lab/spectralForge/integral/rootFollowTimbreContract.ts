import type { CarrierIntegralMachineId } from './carrierIntegralContracts';
import { resolveCarrierIntegralMachineCapability } from './carrierIntegralMachineCapabilities';

export const ROOT_FOLLOW_TIMBRE_CONTRACT_VERSION =
  'root-follow-timbre-contract-3.2.91-7.6.13';

export type RootFollowPreviewTimbreSource =
  | 'audio-buffer'
  | 'direct-synth'
  | 'carrier-descriptor'
  | 'contract-only'
  | 'unknown';

export type RootFollowTimbreTransfer =
  | 'full'
  | 'ratio-and-envelope'
  | 'pitch-only'
  | 'descriptor-only'
  | 'none';

export type RootFollowTimbreRecommendation =
  | 'raw-audio-buffer'
  | 'live-root-follow'
  | 'manual-choice'
  | 'not-supported';

export type RootFollowTimbreContract = {
  version: typeof ROOT_FOLLOW_TIMBRE_CONTRACT_VERSION;
  machineId: CarrierIntegralMachineId;
  previewTimbreSource: RootFollowPreviewTimbreSource;
  rootFollowTransfer: RootFollowTimbreTransfer;
  recommendedTransfer: RootFollowTimbreRecommendation;
  knownLosses: string[];
  summary: string;
};

function previewTimbreSourceFor(machineId: CarrierIntegralMachineId): RootFollowPreviewTimbreSource {
  switch (machineId) {
    case 'harmonic-xplore-direct-carrier':
    case 'raw-darkpsy-oscillator':
    case 'material-render-body':
    case 'strange-attractor-schwarmkoerper':
    case 'dieter-window-body':
    case 'donatello-formant-window-body':
      return 'carrier-descriptor';
    case 'legacy-supernote-5.69':
    case 'branch-a-line-traffic':
    case 'branch-b573-synth-window':
    case 'branch-c-interval-body':
      return 'direct-synth';
    case 'donor-timbre-embodiment':
      return 'contract-only';
    default:
      return 'unknown';
  }
}

function transferFor(machineId: CarrierIntegralMachineId): RootFollowTimbreTransfer {
  switch (machineId) {
    case 'branch-c-interval-body':
      return 'ratio-and-envelope';
    case 'harmonic-xplore-direct-carrier':
      return 'descriptor-only';
    case 'legacy-supernote-5.69':
    case 'branch-a-line-traffic':
    case 'branch-b573-synth-window':
      return 'pitch-only';
    case 'raw-darkpsy-oscillator':
    case 'material-render-body':
    case 'strange-attractor-schwarmkoerper':
    case 'dieter-window-body':
    case 'donatello-formant-window-body':
      return 'descriptor-only';
    default:
      return 'none';
  }
}

function recommendedTransferFor(machineId: CarrierIntegralMachineId): RootFollowTimbreRecommendation {
  switch (machineId) {
    case 'branch-c-interval-body':
    case 'legacy-supernote-5.69':
    case 'branch-a-line-traffic':
    case 'branch-b573-synth-window':
      return 'live-root-follow';
    case 'harmonic-xplore-direct-carrier':
    case 'raw-darkpsy-oscillator':
    case 'material-render-body':
    case 'strange-attractor-schwarmkoerper':
    case 'dieter-window-body':
    case 'donatello-formant-window-body':
      return 'manual-choice';
    default:
      return 'not-supported';
  }
}

function knownLossesFor(machineId: CarrierIntegralMachineId): string[] {
  switch (machineId) {
    case 'harmonic-xplore-direct-carrier':
      return [
        'Preview-Buffer kann HarmonicXplorE-Flavor-Tilts, Schwarm-Drift und Formant-/Metallic-Färbung enthalten.',
        'Live Root-Follow übernimmt zunächst Verhältnis-/Descriptor-Anteile; die Preview-Färbung ist nicht automatisch vollständig paritätisch.',
      ];
    case 'raw-darkpsy-oscillator':
      return [
        'Raw-Audio-/Buffer-Charakter ist als gerenderter Materialkörper verlässlicher als als Live-Root-Follow-Synth-Plan.',
      ];
    case 'strange-attractor-schwarmkoerper':
      return [
        'Attractor-Schwarmbewegung kann in Live Root-Follow nur reduziert als Steuer-/Descriptor-Information ankommen.',
      ];
    case 'material-render-body':
    case 'dieter-window-body':
      return [
        'Material-/Formantkörper sind im Preview-Buffer vollständiger als in einem reduzierten Live-Root-Follow-Steuerplan.',
      ];
    case 'donatello-formant-window-body':
      return [
        'Donatello Preview: Carrier-Descriptor plus Donor-Färbung; Live Root-Follow bleibt reduzierter Descriptor-Transfer.',
      ];
    case 'branch-a-line-traffic':
    case 'branch-b573-synth-window':
      return [
        'Experimental-Branch-Lesart besitzt noch keinen vollwertigen eigenen Root-Follow-Timbre-Adapter.',
      ];
    case 'donor-timbre-embodiment':
      return [
        'Donor-Timbre-Embodiment ist contract-only und kein direkt renderbarer Root-Follow-Klangkörper.',
      ];
    default:
      return [];
  }
}

function summaryFor(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case 'harmonic-xplore-direct-carrier':
      return 'HarmonicXplorE Preview enthält mehr Flavor als Live-Root-Follow.';
    case 'branch-c-interval-body':
      return 'Cecilia/Branch C ist derzeit der stärkste Live-Root-Follow-nahe Carrier-Body-Pfad.';
    case 'donor-timbre-embodiment':
      return 'Contract-only: beschreibt Timbre-Absicht, ist aber kein direkter Root-Follow-Renderer.';
    default:
      return 'Root-Follow-Timbre ist deklariert, nicht automatisch vollparitätisch.';
  }
}

export function resolveRootFollowTimbreContract(
  machineId: CarrierIntegralMachineId,
): RootFollowTimbreContract {
  const capability = resolveCarrierIntegralMachineCapability(machineId);
  const transfer = transferFor(machineId);
  return {
    version: ROOT_FOLLOW_TIMBRE_CONTRACT_VERSION,
    machineId,
    previewTimbreSource: previewTimbreSourceFor(machineId),
    rootFollowTransfer: transfer,
    recommendedTransfer: recommendedTransferFor(machineId),
    knownLosses: knownLossesFor(machineId),
    summary: capability.supportsRootFollowSend
      ? summaryFor(machineId)
      : 'Diese Maschine unterstützt aktuell keinen Root-Follow-Send als stabilen Zielvertrag.',
  };
}
