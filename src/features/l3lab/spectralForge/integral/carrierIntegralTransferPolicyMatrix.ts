import type {
  CarrierIntegralMachineId,
  CarrierIntegralTargetId,
} from "./carrierIntegralContracts";
import { resolveCarrierIntegralMachine } from "./carrierIntegralRegistry";
import { resolveCarrierIntegralMachineCapability } from "./carrierIntegralMachineCapabilities";
import {
  CARRIER_INTEGRAL_AUDIO_PAINT_WORKSPACE_ORIGIN,
  CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN,
  RAW_CARRIER_MATERIAL_RENDER_PREFIX,
  RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN,
} from "./carrierIntegralSendTargetContracts";
import type {
  CarrierIntegralSendContract,
  CarrierIntegralSendDestination,
  CarrierIntegralTransferPlan,
} from "./carrierIntegralSendTargetContracts";

import { buildCarrierIntegralTransferPlan } from "./carrierIntegralTransferPlanBuilder";
import { buildCarrierIntegralRawMelodicMaterialHandoffPlan } from "./carrierIntegralRawMelodicMaterialHandoff";

export const CARRIER_INTEGRAL_TRANSFER_POLICY_SHADOW_VERSION =
  "carrier-integral-transfer-policy-shadow-6.8.53";
export const CARRIER_INTEGRAL_TRANSFER_POLICY_ACTIVATION_VERSION =
  "carrier-integral-transfer-policy-active-core-six-7.7.43";

export type CarrierIntegralTransferPolicyKind =
  | "raw-direct-body"
  | "synthetic-artifact-body";

export type CarrierIntegralTransferPolicyContext = {
  machine: ReturnType<typeof resolveCarrierIntegralMachine>;
  policyKind: CarrierIntegralTransferPolicyKind;
  targetId: CarrierIntegralTargetId;
  destination: CarrierIntegralSendDestination;
  contract: CarrierIntegralSendContract;
};

type CarrierIntegralTransferPolicyBuilder = (
  context: CarrierIntegralTransferPolicyContext,
) => CarrierIntegralTransferPlan;

type CarrierIntegralTransferPolicyMatrix = Record<
  CarrierIntegralTransferPolicyKind,
  Partial<Record<CarrierIntegralSendDestination, CarrierIntegralTransferPolicyBuilder>> & {
    default: CarrierIntegralTransferPolicyBuilder;
  }
>;

export const CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS = [
  "machineId",
  "targetId",
  "destination",
  "materialEntryKind",
  "renderSource",
  "rootFollowConfigKind",
  "melodicHandoffKind",
  "usesAudioPaintImportDetail",
  "clearsAudioPaintPendingHandoff",
  "clearsRawMaterialPendingHandoff",
  "sourceVersion",
  "renderModePrefix",
  "stableIdPrefix",
  "workspaceOrigin",
  "projectionMode",
  "rootFollowMembershipConfig",
  "requiresAudibleRenderedBody",
] as const satisfies readonly (keyof CarrierIntegralTransferPlan)[];

export type CarrierIntegralTransferPolicyParityMismatch = {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
  destination: CarrierIntegralSendDestination;
  field:
    | (typeof CARRIER_INTEGRAL_TRANSFER_PLAN_PARITY_FIELDS)[number]
    | "plan-presence";
  legacyValue: unknown;
  shadowValue: unknown;
};

export function classifyCarrierIntegralTransferPolicy(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralTransferPolicyKind {
  const capability = resolveCarrierIntegralMachineCapability(machineId);
  return capability.bodyKind === "raw-material-body"
    ? "raw-direct-body"
    : "synthetic-artifact-body";
}

function buildRawMelodicPinkLanePolicyPlan(
  context: CarrierIntegralTransferPolicyContext,
): CarrierIntegralTransferPlan {
  return buildCarrierIntegralRawMelodicMaterialHandoffPlan(context);
}

function buildAudioPaintMelodicPinkLanePolicyPlan(
  context: CarrierIntegralTransferPolicyContext,
): CarrierIntegralTransferPlan {
  const { machine } = context;
  return buildCarrierIntegralTransferPlan(context, {
    materialEntryKind: "audio-paint-field-clip",
    renderSource: "root-follow-config-buffer",
    rootFollowConfigKind: "none",
    melodicHandoffKind: "audio-paint-field",
    usesAudioPaintImportDetail: true,
    clearsAudioPaintPendingHandoff: false,
    clearsRawMaterialPendingHandoff: true,
    sourceVersion: "spectralforge-carrier-integral-audio-paint-core-six-7.7.43",
    renderModePrefix: "carrier-integral",
    stableIdPrefix: "carrier-integral",
    workspaceOrigin: CARRIER_INTEGRAL_AUDIO_PAINT_WORKSPACE_ORIGIN,
    projectionMode: "last-hearing",
    rootFollowMembershipConfig: "none",
    requiresAudibleRenderedBody: true,
    summary: `${machine.shortLabel} wird als Carrier-Integral-Feldclip in die pinke Spur übergeben; der Importdialog entscheidet die Variantenlesart.`,
    guardrail:
      "Audio-Paint-Feldclips dürfen nicht zusätzlich alte Raw-Material-Handoffs mitnehmen.",
  });
}

function buildMaterialRootFollowPolicyPlan(
  context: CarrierIntegralTransferPolicyContext,
): CarrierIntegralTransferPlan {
  const { machine } = context;
  const rawOscillator = machine.id === "raw-darkpsy-oscillator";
  return buildCarrierIntegralTransferPlan(context, {
    materialEntryKind: rawOscillator
      ? "raw-oscillator-material"
      : "carrier-rendered-material",
    renderSource: rawOscillator ? "raw-spectral-buffer" : "root-follow-config-buffer",
    rootFollowConfigKind: "material-flowing",
    melodicHandoffKind: "none",
    usesAudioPaintImportDetail: false,
    clearsAudioPaintPendingHandoff: false,
    clearsRawMaterialPendingHandoff: false,
    sourceVersion: rawOscillator
      ? "spectralforge-raw-carrier-material-6.8.39"
      : "spectralforge-carrier-integral-rendered-material-core-six-7.7.43",
    renderModePrefix: rawOscillator
      ? RAW_CARRIER_MATERIAL_RENDER_PREFIX
      : "carrier-integral-rendered-material",
    stableIdPrefix: rawOscillator
      ? RAW_CARRIER_MATERIAL_RENDER_PREFIX
      : "carrier-integral-rendered-material",
    workspaceOrigin: rawOscillator
      ? RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN
      : CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN,
    projectionMode: "grained",
    rootFollowMembershipConfig: "material-flowing",
    requiresAudibleRenderedBody: true,
    summary: `${machine.shortLabel} geht als Materialkörper in Root Follow; Root Follow liest ihn über Material-/Granular-Elastik.`,
    guardrail:
      "Materialkörper-Root-Follow darf nicht stillschweigend in den synthetischen Antonia/Bert/Cecilia-Plan wechseln.",
  });
}

function buildSyntheticRootFollowPolicyPlan(
  context: CarrierIntegralTransferPolicyContext,
): CarrierIntegralTransferPlan {
  const { machine } = context;
  return buildCarrierIntegralTransferPlan(context, {
    materialEntryKind: "carrier-rendered-material",
    renderSource: "root-follow-config-buffer",
    rootFollowConfigKind: "artifact-config",
    melodicHandoffKind: "none",
    usesAudioPaintImportDetail: false,
    clearsAudioPaintPendingHandoff: false,
    clearsRawMaterialPendingHandoff: false,
    sourceVersion: "spectralforge-carrier-integral-rendered-material-core-six-7.7.43",
    renderModePrefix: "carrier-integral-rendered-material",
    stableIdPrefix: "carrier-integral-rendered-material",
    workspaceOrigin: CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN,
    projectionMode: "grained",
    rootFollowMembershipConfig: "artifact-config",
    requiresAudibleRenderedBody: true,
    summary: `${machine.shortLabel} geht mit eigenem synthetischem Root-Follow-Plan in die Bank.`,
    guardrail:
      "Synthetische Carrier-Lesarten dürfen nicht als Raw-/Pure-Dieter-Materialkörper aliasen.",
  });
}

function buildStandardMaterialspurPolicyPlan(
  context: CarrierIntegralTransferPolicyContext,
): CarrierIntegralTransferPlan {
  const { machine } = context;
  const rawOscillator = machine.id === "raw-darkpsy-oscillator";
  return buildCarrierIntegralTransferPlan(context, {
    materialEntryKind: rawOscillator
      ? "raw-oscillator-material"
      : "carrier-rendered-material",
    renderSource: rawOscillator ? "raw-spectral-buffer" : "root-follow-config-buffer",
    rootFollowConfigKind: "none",
    melodicHandoffKind: "none",
    usesAudioPaintImportDetail: false,
    clearsAudioPaintPendingHandoff: false,
    clearsRawMaterialPendingHandoff: false,
    sourceVersion: rawOscillator
      ? "spectralforge-raw-carrier-material-6.8.39"
      : "spectralforge-carrier-integral-rendered-material-core-six-7.7.43",
    renderModePrefix: rawOscillator
      ? RAW_CARRIER_MATERIAL_RENDER_PREFIX
      : "carrier-integral-rendered-material",
    stableIdPrefix: rawOscillator
      ? RAW_CARRIER_MATERIAL_RENDER_PREFIX
      : "carrier-integral-rendered-material",
    workspaceOrigin: rawOscillator
      ? RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN
      : CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN,
    projectionMode: "grained",
    rootFollowMembershipConfig: "none",
    requiresAudibleRenderedBody: true,
    summary: `${machine.shortLabel} wird als hörbarer Materialspur-WAV-Körper registriert.`,
    guardrail:
      "Materialspur-Einträge aus der Labor-Bibliothek müssen hörbare WAV-Körper sein, keine leeren Audio-Paint-Hüllen.",
  });
}

function buildDefaultRenderedMaterialPolicyPlan(
  context: CarrierIntegralTransferPolicyContext,
): CarrierIntegralTransferPlan {
  const { machine } = context;
  return buildCarrierIntegralTransferPlan(context, {
    materialEntryKind: "carrier-rendered-material",
    renderSource: "root-follow-config-buffer",
    rootFollowConfigKind: "none",
    melodicHandoffKind: "none",
    usesAudioPaintImportDetail: false,
    clearsAudioPaintPendingHandoff: false,
    clearsRawMaterialPendingHandoff: false,
    sourceVersion: "spectralforge-carrier-integral-rendered-material-core-six-7.7.43",
    renderModePrefix: "carrier-integral-rendered-material",
    stableIdPrefix: "carrier-integral-rendered-material",
    workspaceOrigin: CARRIER_INTEGRAL_RENDERED_MATERIAL_WORKSPACE_ORIGIN,
    projectionMode: "grained",
    rootFollowMembershipConfig: "none",
    requiresAudibleRenderedBody: true,
    summary: `${machine.shortLabel} nutzt den gerenderten Materialkörper-Pfad.`,
    guardrail:
      "Nicht-explizite Ziele dürfen keine versteckten Melodic-/Root-Follow-Handoffs auslösen.",
  });
}

const CARRIER_INTEGRAL_TRANSFER_POLICY_MATRIX: CarrierIntegralTransferPolicyMatrix = {
  "raw-direct-body": {
    "melodic-pink-lane": buildRawMelodicPinkLanePolicyPlan,
    "root-follow-loop": buildMaterialRootFollowPolicyPlan,
    materialspur: buildStandardMaterialspurPolicyPlan,
    default: buildDefaultRenderedMaterialPolicyPlan,
  },
  "synthetic-artifact-body": {
    "melodic-pink-lane": buildAudioPaintMelodicPinkLanePolicyPlan,
    "root-follow-loop": buildSyntheticRootFollowPolicyPlan,
    materialspur: buildStandardMaterialspurPolicyPlan,
    default: buildDefaultRenderedMaterialPolicyPlan,
  },
};

export function resolveCarrierIntegralTransferPolicyPlanFromContext(args: {
  machineId: CarrierIntegralMachineId;
  targetId: CarrierIntegralTargetId;
  destination: CarrierIntegralSendDestination;
  contract: CarrierIntegralSendContract;
}): CarrierIntegralTransferPlan | null {
  const machine = resolveCarrierIntegralMachine(args.machineId);
  const policyKind = classifyCarrierIntegralTransferPolicy(machine.id);
  const context: CarrierIntegralTransferPolicyContext = {
    machine,
    policyKind,
    targetId: args.targetId,
    destination: args.destination,
    contract: args.contract,
  };
  const policy =
    CARRIER_INTEGRAL_TRANSFER_POLICY_MATRIX[policyKind][args.destination] ??
    CARRIER_INTEGRAL_TRANSFER_POLICY_MATRIX[policyKind].default;
  return policy(context);
}
