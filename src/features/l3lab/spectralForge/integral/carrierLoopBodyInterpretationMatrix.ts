import type {
  CarrierIntegralMachineFamily,
  CarrierIntegralMachineId,
} from './carrierIntegralContracts';
import { CARRIER_INTEGRAL_MACHINES } from './carrierIntegralRegistry';
import {
  CARRIER_INTEGRAL_EXPERIMENTAL_READING_MACHINE_IDS,
  CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID,
  isCarrierIntegralExperimentalReadingMachine,
  resolveCarrierIntegralMachineCapability,
} from './carrierIntegralMachineCapabilities';
import { carrierLoopBodyMachineDisplayName } from './carrierLoopBodyTransferExecutionPlan';
import type { CarrierLoopBodyKind } from './carrierLoopBodyModel';
import type { CarrierLoopBodyCurveSourceKind } from './carrierLoopBodyCurveTypes';

export const CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION =
  'carrier-loop-body-interpretation-matrix-core-six-7.7.43';

export const CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID =
  CARRIER_INTEGRAL_EXPERIMENTAL_READING_PEER_GROUP_ID;

export type CarrierLoopBodyInterpretationLayer =
  | 'experimental-carrier-reading'
  | 'raw-material-body-reading'
  | 'harmonic-ratio-carrier-reading';

export type CarrierLoopBodyAdapterStatus =
  | 'implemented'
  | 'planned-distinct-line-adapter'
  | 'direct-ratio-body-family'
  | 'not-applicable';

export type CarrierLoopBodyPreviewSupport =
  | 'cecilia-version-preview-candidate'
  | 'bert-window-prism-preview-candidate'
  | 'future-adapter-preview-candidate'
  | 'separate-body-preview'
  | 'none';

export type CarrierLoopBodyOwnershipClaim =
  | 'first-adapter-not-exclusive-owner'
  | 'future-adapter-peer'
  | 'separate-body-family-not-carrier-loop-body'
  | 'no-ownership';

export type CarrierLoopBodyInterpretationEntry = {
  version: typeof CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION;
  machineId: CarrierIntegralMachineId;
  displayName: string;
  machineFamily: CarrierIntegralMachineFamily;
  bodyKind: CarrierLoopBodyKind;
  interpretationLayer: CarrierLoopBodyInterpretationLayer;
  peerGroupId: string | null;
  peerStatus: 'equal-experimental-peer' | 'not-in-experimental-peer-group';
  adapterStatus: CarrierLoopBodyAdapterStatus;
  curveSourceKind: CarrierLoopBodyCurveSourceKind | null;
  previewSupport: CarrierLoopBodyPreviewSupport;
  previewRequestFlag: 'cecilia-default-version-path' | 'bert-default-window-prism-path' | null;
  ownershipClaim: CarrierLoopBodyOwnershipClaim;
  compatibilitySummary: string;
  guardrail: string;
};

const EXPERIMENTAL_PEER_IDS = CARRIER_INTEGRAL_EXPERIMENTAL_READING_MACHINE_IDS;

export type CarrierLoopBodyExperimentalPeerMachineId = typeof EXPERIMENTAL_PEER_IDS[number];

export function isCarrierLoopBodyExperimentalPeerMachine(
  machineId: CarrierIntegralMachineId,
): machineId is CarrierLoopBodyExperimentalPeerMachineId {
  return isCarrierIntegralExperimentalReadingMachine(machineId);
}

function adapterStatusForCapability(capability: ReturnType<typeof resolveCarrierIntegralMachineCapability>): CarrierLoopBodyAdapterStatus {
  switch (capability.adapterCapability) {
    case 'implemented-branch-c-carrier-loop-body-adapter':
    case 'implemented-branch-b573-window-prism-adapter':
      return 'implemented';
    case 'planned-distinct-line-adapter':
      return 'planned-distinct-line-adapter';
    case 'direct-ratio-body-family':
      return 'direct-ratio-body-family';
    default:
      return 'not-applicable';
  }
}

export function resolveCarrierLoopBodyInterpretationEntry(
  machineId: CarrierIntegralMachineId,
): CarrierLoopBodyInterpretationEntry {
  const capability = resolveCarrierIntegralMachineCapability(machineId);
  const peer = isCarrierLoopBodyExperimentalPeerMachine(machineId);
  return {
    version: CARRIER_LOOP_BODY_INTERPRETATION_MATRIX_VERSION,
    machineId,
    displayName: carrierLoopBodyMachineDisplayName(machineId),
    machineFamily: capability.machineFamily,
    bodyKind: capability.bodyKind,
    interpretationLayer: capability.capabilityLayer,
    peerGroupId: peer ? CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID : null,
    peerStatus: peer ? 'equal-experimental-peer' : 'not-in-experimental-peer-group',
    adapterStatus: adapterStatusForCapability(capability),
    curveSourceKind: capability.curveSourceKind,
    previewSupport: capability.previewCapability,
    previewRequestFlag: machineId === 'branch-c-interval-body'
      ? 'cecilia-default-version-path'
      : machineId === 'branch-b573-synth-window'
        ? 'bert-default-window-prism-path'
        : null,
    ownershipClaim: capability.ownershipCapability,
    compatibilitySummary: capability.compatibilitySummary,
    guardrail: capability.guardrail,
  };
}

export function listCarrierLoopBodyInterpretationMatrix(): CarrierLoopBodyInterpretationEntry[] {
  return CARRIER_INTEGRAL_MACHINES.map((machine) => resolveCarrierLoopBodyInterpretationEntry(machine.id));
}

export function assertCarrierLoopBodyInterpretationMatrix(): void {
  const matrix = listCarrierLoopBodyInterpretationMatrix();
  const byId = new Map(matrix.map((entry) => [entry.machineId, entry]));
  const require = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };

  for (const machineId of EXPERIMENTAL_PEER_IDS) {
    const entry = byId.get(machineId);
    require(Boolean(entry), `${machineId} interpretation entry missing.`);
    require(entry?.peerGroupId === CARRIER_LOOP_BODY_EXPERIMENTAL_PEER_GROUP_ID, `${machineId} must remain in the Antonia/Bert/Cecilia equal peer group.`);
    require(entry?.peerStatus === 'equal-experimental-peer', `${machineId} must remain an equal experimental peer.`);
  }
  require(matrix.length === 6, `Core interpretation matrix should expose six active Carrier readings, got ${matrix.length}.`);
}
