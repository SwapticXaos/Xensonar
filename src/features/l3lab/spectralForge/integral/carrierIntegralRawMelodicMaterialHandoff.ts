import type { CarrierIntegralMachineId } from "./carrierIntegralContracts";
import {
  CARRIER_INTEGRAL_GRANULAR_MATERIAL_WORKSPACE_ORIGIN,
  RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN,
} from "./carrierIntegralSendTargetContracts";
import type { CarrierIntegralTransferPlan } from "./carrierIntegralSendTargetContracts";
import {
  buildCarrierIntegralTransferPlan,
  type CarrierIntegralTransferPlanBuildContext,
} from "./carrierIntegralTransferPlanBuilder";

export const CARRIER_INTEGRAL_RAW_MELODIC_MATERIAL_HANDOFF_VERSION =
  "carrier-integral-raw-melodic-material-handoff-3.2.91.7.5.151-single-source";

export const CARRIER_INTEGRAL_RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_IDS = [
  "raw-darkpsy-oscillator",
  "harmonic-xplore-direct-carrier",
  "spektral-synthese-body",
] as const satisfies readonly CarrierIntegralMachineId[];

export type CarrierIntegralRawMelodicMaterialHandoffMachineId =
  (typeof CARRIER_INTEGRAL_RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_IDS)[number];

const RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_ID_SET: ReadonlySet<
  CarrierIntegralMachineId
> = new Set(CARRIER_INTEGRAL_RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_IDS);

export type CarrierIntegralRawMelodicMaterialHandoffSpec = {
  machineId: CarrierIntegralRawMelodicMaterialHandoffMachineId;
  materialEntryKind: CarrierIntegralTransferPlan["materialEntryKind"];
  sourceVersion: string;
  renderModePrefix: string;
  stableIdPrefix: string;
  workspaceOrigin: string;
  summary: string;
  guardrail: string;
  uiTitle: string;
  uiButtonLabel: string;
  uiPanelSummary: string;
  uiPanelDetail: string;
};

const RAW_MELODIC_MATERIAL_HANDOFF_SPECS: Record<
  CarrierIntegralRawMelodicMaterialHandoffMachineId,
  CarrierIntegralRawMelodicMaterialHandoffSpec
> = {
  "raw-darkpsy-oscillator": {
    machineId: "raw-darkpsy-oscillator",
    materialEntryKind: "raw-oscillator-material",
    sourceVersion:
      "spectralforge-pure-dieter-raw-melodic-material-3.2.91.7.5.77",
    renderModePrefix: "pure-dieter-raw-melodic-material",
    stableIdPrefix: "pure-dieter-raw-melodic-material",
    workspaceOrigin: RAW_CARRIER_MATERIAL_WORKSPACE_ORIGIN,
    summary:
      "Pure Dieter wird als gerenderter Rohmaterialkörper in die pinke Spur gereicht; keine Antonia/B/C-Umrechnung und kein Audio-Paint-Feldclip.",
    guardrail:
      "Pure Dieter darf in der pinken Spur nur als Raw-Audio-Materialkörper ankommen; kein synthetischer CarrierLoopBody-Adapter und keine Audio-Paint-Feldclip-Umdeutung.",
    uiTitle:
      "Pure Dieter wird als gerenderter Raw-Audio-Materialkörper an den Melodic Loop übergeben.",
    uiButtonLabel: "An Melodic Loop senden",
    uiPanelSummary:
      "öffnet das Melodic-Loop-Importmenü · Modus Raw Audio verfügbar",
    uiPanelDetail:
      "Pure Dieter geht als Raw-Audio-Materialkörper in die pinke Spur.",
  },
  "harmonic-xplore-direct-carrier": {
    machineId: "harmonic-xplore-direct-carrier",
    materialEntryKind: "carrier-granular-material",
    sourceVersion:
      "spectralforge-harmonic-xplore-raw-melodic-material-3.2.91.7.5.150",
    renderModePrefix: "harmonic-xplore-raw-melodic-material",
    stableIdPrefix: "harmonic-xplore-raw-melodic-material",
    workspaceOrigin: CARRIER_INTEGRAL_GRANULAR_MATERIAL_WORKSPACE_ORIGIN,
    summary:
      "HarmonicXplorE wird als der zuletzt gehörte Direct-Renderer-Klangkörper in die pinke Spur gereicht; kein Pure-Dieter-Fallback.",
    guardrail:
      "HarmonicXplorE-Melodic-Handoff muss den gehörten Ratio-/Klangkörper als Audio erhalten; keine synthetische Pinkspur-Umdeutung, kein Audio-Paint-Feldclip und kein Pure-Dieter-Rohpfad.",
    uiTitle:
      "HarmonicXplorE wird als zuletzt gehörter Raw-Audio-Materialkörper an den Melodic Loop übergeben.",
    uiButtonLabel: "An Melodic Loop senden",
    uiPanelSummary:
      "öffnet das Melodic-Loop-Importmenü · Modus Raw Audio verfügbar",
    uiPanelDetail:
      "HarmonicXplorE geht als gerenderter Raw-Audio-Materialkörper in die pinke Spur.",
  },
  "spektral-synthese-body": {
    machineId: "spektral-synthese-body",
    materialEntryKind: "carrier-granular-material",
    sourceVersion:
      "spectralforge-spektral-synthese-raw-melodic-material-3.2.91.7.7.8",
    renderModePrefix: "spektral-synthese-raw-melodic-material",
    stableIdPrefix: "spektral-synthese-raw-melodic-material",
    workspaceOrigin: CARRIER_INTEGRAL_GRANULAR_MATERIAL_WORKSPACE_ORIGIN,
    summary:
      "SpektralSynthese wird als der gehörte Descriptor-/Akzent-Klangkörper in die pinke Spur gereicht; kein HX- oder Pure-Dieter-Fallback.",
    guardrail:
      "SpektralSynthese-Melodic-Handoff muss den gerenderten Descriptor-Buffer als Audio erhalten; die Bilddeskriptor- und Akzent-Schicht darf nicht in einem generischen synthetischen Pinkspur-Adapter verschwinden.",
    uiTitle:
      "SpektralSynthese wird als zuletzt gehörter Raw-Audio-Materialkörper an den Melodic Loop übergeben.",
    uiButtonLabel: "An Melodic Loop senden",
    uiPanelSummary:
      "öffnet das Melodic-Loop-Importmenü · Modus Raw Audio verfügbar",
    uiPanelDetail:
      "SpektralSynthese geht als gerenderter Descriptor-/Akzent-Klangkörper in die pinke Spur.",
  },
};

export function isCarrierIntegralRawMelodicMaterialHandoffMachine(
  machineId: CarrierIntegralMachineId,
): machineId is CarrierIntegralRawMelodicMaterialHandoffMachineId {
  return RAW_MELODIC_MATERIAL_HANDOFF_MACHINE_ID_SET.has(machineId);
}

export function resolveCarrierIntegralRawMelodicMaterialHandoffSpec(
  machineId: CarrierIntegralMachineId,
): CarrierIntegralRawMelodicMaterialHandoffSpec | null {
  return isCarrierIntegralRawMelodicMaterialHandoffMachine(machineId)
    ? RAW_MELODIC_MATERIAL_HANDOFF_SPECS[machineId]
    : null;
}

export function buildCarrierIntegralRawMelodicMaterialHandoffPlan(
  context: CarrierIntegralTransferPlanBuildContext,
): CarrierIntegralTransferPlan {
  const spec = resolveCarrierIntegralRawMelodicMaterialHandoffSpec(
    context.machine.id,
  );
  if (!spec) {
    throw new Error(
      `Raw melodic material handoff is not defined for ${context.machine.id}.`,
    );
  }
  return buildCarrierIntegralTransferPlan(context, {
    materialEntryKind: spec.materialEntryKind,
    renderSource: "raw-spectral-buffer",
    rootFollowConfigKind: "none",
    melodicHandoffKind: "raw-material",
    usesAudioPaintImportDetail: true,
    clearsAudioPaintPendingHandoff: true,
    clearsRawMaterialPendingHandoff: false,
    sourceVersion: spec.sourceVersion,
    renderModePrefix: spec.renderModePrefix,
    stableIdPrefix: spec.stableIdPrefix,
    workspaceOrigin: spec.workspaceOrigin,
    projectionMode: "grained",
    rootFollowMembershipConfig: "none",
    requiresAudibleRenderedBody: true,
    summary: spec.summary,
    guardrail: spec.guardrail,
  });
}
