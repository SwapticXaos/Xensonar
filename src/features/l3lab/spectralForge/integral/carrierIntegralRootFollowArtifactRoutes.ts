import { extractSpectralSkeleton } from "../carrierV2/extractSpectralSkeleton";
import type { SpectralData } from "../audio/SpectralData";
import { buildDonatelloFormantPlan } from "./buildDonatelloFormantPlan";
import { buildCarrierIntegralSpectralWindowBodyPlan, describeCarrierIntegralSpectralWindowBodyDescriptor } from './carrierIntegralSpectralWindowBody';
import {
  buildDonatelloMaterialRootFollowEntryConfig,
  summarizeDonatelloRootFollowPlanAttachment,
} from "./donatelloRootFollowPlan";
import { buildCarrierIntegralTimbreSnapshot } from "./carrierIntegralSynthLab";
import type { CarrierIntegralAuditionContext } from "./carrierIntegralAuditionContext";
import type { CarrierIntegralAuditionCommonFields } from "./carrierIntegralAuditionCommonFields";
import { buildDieterV2EmbodimentRuntime } from "./carrierIntegralDieterV2EmbodimentRuntime";
import { buildCarrierIntegralSyntheticRootFollowBuild } from "./carrierIntegralSyntheticRootFollowBuild";
import {
  buildCarrierIntegralDieterV2RootFollowBuildArtifact,
  buildCarrierIntegralDonatelloRootFollowBuildArtifact,
  buildCarrierIntegralSpectralWindowBodyRootFollowBuildArtifact,
  buildCarrierIntegralRawRootFollowBuildArtifact,
  buildCarrierIntegralSyntheticRootFollowBuildArtifact,
  type CarrierIntegralRootFollowBuildArtifact,
} from "./carrierIntegralRootFollowBuildArtifact";
import {
  buildCarrierIntegralDonatelloFormantBodyModel,
  describeCarrierIntegralDonatelloFormantBodyModel,
} from "./carrierIntegralDonatelloFormantBodyModel";
import type { CarrierIntegralAuditionRequest } from "./carrierIntegralAuditionRequest";

export type CarrierIntegralRootFollowArtifactRouteArgs = {
  request: CarrierIntegralAuditionRequest;
  context: CarrierIntegralAuditionContext;
  commonFields: CarrierIntegralAuditionCommonFields;
  spectralData: SpectralData;
};

export function buildCarrierIntegralDonatelloRootFollowArtifactRoute(
  args: CarrierIntegralRootFollowArtifactRouteArgs,
): CarrierIntegralRootFollowBuildArtifact {
  const { request, context, commonFields, spectralData } = args;
  const { carrierIntegralParams, synthLab, durationSec } = context;
  const skeleton = extractSpectralSkeleton(spectralData, durationSec);
  const plan = buildDonatelloFormantPlan(skeleton, {
    rootReferenceHz: 110,
    durationBeats:
      Math.max(1, Math.round(request.snapshot.materialExport.bars || 1)) * 4,
    maxBands: Math.min(8, Math.max(1, carrierIntegralParams.maxWindows || 8)),
    safeGainCeiling: 0.86,
  });
  const config = buildDonatelloMaterialRootFollowEntryConfig({
    plan,
    timbre: buildCarrierIntegralTimbreSnapshot(synthLab),
  });
  const attachment = summarizeDonatelloRootFollowPlanAttachment(config);
  const formantBody = buildCarrierIntegralDonatelloFormantBodyModel({
    plan,
    rootFollowAttachment: attachment,
  });
  return buildCarrierIntegralDonatelloRootFollowBuildArtifact({
    ...commonFields,
    ok: formantBody.bandCount > 0 || formantBody.textureEnergy > 0,
    reason: `Donatello · Renderer Adapter 1: ${describeCarrierIntegralDonatelloFormantBodyModel(formantBody)}`,
    config,
    baseHz: formantBody.rootReferenceHz,
    bandCount: formantBody.bandCount,
  });
}

export function buildCarrierIntegralSpectralWindowBodyRootFollowArtifactRoute(
  args: CarrierIntegralRootFollowArtifactRouteArgs,
): CarrierIntegralRootFollowBuildArtifact {
  const { request, context, commonFields, spectralData } = args;
  const { carrierIntegralParams, synthLab, durationSec } = context;
  const { plan, descriptor } = buildCarrierIntegralSpectralWindowBodyPlan({
    spectralData,
    durationSec,
    options: {
      rootReferenceHz: 110,
      durationBeats: Math.max(1, Math.round(request.snapshot.materialExport.bars || 1)) * 4,
      maxBands: Math.min(5, Math.max(1, carrierIntegralParams.maxWindows || 5)),
      safeGainCeiling: 0.82,
      minEnergy: carrierIntegralParams.energyThreshold,
    },
  });
  const config = buildDonatelloMaterialRootFollowEntryConfig({
    plan,
    timbre: buildCarrierIntegralTimbreSnapshot(synthLab),
  });
  return buildCarrierIntegralSpectralWindowBodyRootFollowBuildArtifact({
    ...commonFields,
    ok: descriptor.bandCount > 0,
    reason: `Dieter Fensterkörper · ${describeCarrierIntegralSpectralWindowBodyDescriptor(descriptor)}; Root Follow erhält Materialkörper plus Fensterplan-Anhang, Pure Dieter bleibt Rohreferenz.`,
    config,
    baseHz: plan.rootReferenceHz,
    bandCount: descriptor.bandCount,
  });
}

export function buildCarrierIntegralRawRootFollowArtifactRoute(
  args: CarrierIntegralRootFollowArtifactRouteArgs,
): CarrierIntegralRootFollowBuildArtifact {
  return buildCarrierIntegralRawRootFollowBuildArtifact({
    ...args.commonFields,
    ok: true,
    reason:
      "Pure Dieter · Roh-Oszillator nutzt beim Senden den gerenderten Rohkörper; kein synthetischer Antonia/B/C-Pattern-Plan.",
    baseHz: 55,
  });
}

export function buildCarrierIntegralDieterV2RootFollowArtifactRoute(
  args: CarrierIntegralRootFollowArtifactRouteArgs,
): CarrierIntegralRootFollowBuildArtifact {
  const { request, context, commonFields, spectralData } = args;
  const {
    carrierIntegralParams,
    routeSignature,
    synthLab,
    previewBpm,
    durationSec,
  } = context;
  const v2 = buildDieterV2EmbodimentRuntime({
    spectralData,
    durationSec,
    previewBpm,
    bars: request.snapshot.materialExport.bars,
    carrierIntegralParams,
    routeSignature,
    synthLab,
  });
  return buildCarrierIntegralDieterV2RootFollowBuildArtifact({
    ...commonFields,
    ok: true,
    reason: `Dieter V2 · Actualization-Fundament: LatentForm ${v2.latentForm.topology.anchorCount ?? 0} Anker, Medium ${v2.actualizationMedium.kind}/${v2.actualizationMedium.readiness}; Root Follow erhält weiterhin gerenderten Materialkörper statt A/B/C-Synthplan.`,
    config: v2.rootFollowBuild.summary.eligible
      ? v2.rootFollowBuild.config
      : null,
    baseHz: v2.rootFollowBuild.summary.baseHz,
    trackCount: v2.latentForm.topology.anchorCount ?? 0,
  });
}

export function buildCarrierIntegralHarmonicXploreDirectRootFollowArtifactRoute(
  args: CarrierIntegralRootFollowArtifactRouteArgs,
): CarrierIntegralRootFollowBuildArtifact {
  const { request, context, commonFields, spectralData } = args;
  const { rootFollowBuild } = buildCarrierIntegralSyntheticRootFollowBuild({
    request,
    context,
    spectralData,
  });
  return buildCarrierIntegralSyntheticRootFollowBuildArtifact({
    ...commonFields,
    ok: rootFollowBuild.summary.eligible,
    reason: rootFollowBuild.summary.eligible
      ? `HarmonicXplorE Direkt · Root-Follow-Konfig mit eigenem Ratio-Timbre (${context.synthLab.presetId}).`
      : rootFollowBuild.summary.reason,
    config: rootFollowBuild.summary.eligible ? rootFollowBuild.config : null,
    baseHz: rootFollowBuild.summary.baseHz,
    summary: rootFollowBuild.summary,
  });
}

export function buildCarrierIntegralSyntheticRootFollowArtifactRoute(
  args: CarrierIntegralRootFollowArtifactRouteArgs,
): CarrierIntegralRootFollowBuildArtifact {
  const { request, context, commonFields, spectralData } = args;
  const { rootFollowBuild } = buildCarrierIntegralSyntheticRootFollowBuild({
    request,
    context,
    spectralData,
  });
  return buildCarrierIntegralSyntheticRootFollowBuildArtifact({
    ...commonFields,
    ok: rootFollowBuild.summary.eligible,
    reason: rootFollowBuild.summary.reason,
    config: rootFollowBuild.summary.eligible ? rootFollowBuild.config : null,
    baseHz: rootFollowBuild.summary.baseHz,
    summary: rootFollowBuild.summary,
  });
}
