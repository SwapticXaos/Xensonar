import { buildSpectralDataFromProjectSnapshot } from "./carrierIntegralSnapshotSpectralData";
import { buildCarrierIntegralAuditionContext } from "./carrierIntegralAuditionContext";
import { buildCarrierIntegralAuditionCommonFields } from "./carrierIntegralAuditionCommonFields";
import { resolveCarrierIntegralAuditionRouteKind } from "./carrierIntegralAuditionRouteClassification";
import type { CarrierIntegralAuditionResult } from "./carrierIntegralAuditionResult";
import type { CarrierIntegralRootFollowBuildArtifact } from "./carrierIntegralRootFollowBuildArtifact";
import type { CarrierIntegralAuditionRequest } from "./carrierIntegralAuditionRequest";
import {
  auditionCarrierIntegralRawRenderedRoute,
  auditionCarrierIntegralHarmonicXploreDirectRoute,
  auditionCarrierIntegralSyntheticRootFollowRoute,
  prewarmCarrierIntegralHarmonicXploreDirectRoute,
  prewarmCarrierIntegralRawRenderedRoute,
  prewarmCarrierIntegralSyntheticRootFollowRoute,
} from "./carrierIntegralAuditionRoutes";
import {
  buildCarrierIntegralRawRootFollowArtifactRoute,
  buildCarrierIntegralHarmonicXploreDirectRootFollowArtifactRoute,
  buildCarrierIntegralSyntheticRootFollowArtifactRoute,
} from "./carrierIntegralRootFollowArtifactRoutes";

export type { CarrierIntegralAuditionValueSource } from "./carrierIntegralAuditionContext";
export type {
  CarrierIntegralAuditionResult,
  CarrierIntegralAuditionTarget,
} from "./carrierIntegralAuditionResult";
export type { CarrierIntegralRootFollowBuildArtifact } from "./carrierIntegralRootFollowBuildArtifact";
export type { CarrierIntegralAuditionRequest } from "./carrierIntegralAuditionRequest";

export function buildCarrierIntegralRootFollowArtifact(
  request: CarrierIntegralAuditionRequest,
): CarrierIntegralRootFollowBuildArtifact {
  const context = buildCarrierIntegralAuditionContext(request);
  const commonFields = buildCarrierIntegralAuditionCommonFields({
    projectName: request.projectName,
    machineId: request.machineId,
    machineLabel: context.machine.shortLabel,
    bodySourceMode: context.bodySourceMode,
    routeSummary: context.machine.summary,
    durationSec: context.durationSec,
    previewDurationSec: context.previewDurationSec,
    valueSource: context.valueSource,
  });
  const spectralData = buildSpectralDataFromProjectSnapshot(request.snapshot);
  const routeArgs = {
    request,
    context,
    commonFields,
    spectralData,
  };

  switch (resolveCarrierIntegralAuditionRouteKind(request.machineId)) {
    case "pure-dieter-raw-rendered":
      return buildCarrierIntegralRawRootFollowArtifactRoute(routeArgs);
    case "harmonic-xplore-direct":
      return buildCarrierIntegralHarmonicXploreDirectRootFollowArtifactRoute(routeArgs);
    case "synthetic-root-follow":
    default:
      return buildCarrierIntegralSyntheticRootFollowArtifactRoute(routeArgs);
  }
}


export type CarrierIntegralPreviewPrewarmResult = {
  warmed: boolean;
  cacheHit: boolean;
  cacheKey: string;
  rendered: boolean;
  reason: string;
};

export async function prewarmForgeProjectCarrierIntegralPreview(
  request: CarrierIntegralAuditionRequest,
): Promise<CarrierIntegralPreviewPrewarmResult> {
  const context = buildCarrierIntegralAuditionContext(request);
  const resultCommonFields = buildCarrierIntegralAuditionCommonFields({
    projectName: request.projectName,
    machineId: request.machineId,
    machineLabel: context.machine.shortLabel,
    bodySourceMode: context.bodySourceMode,
    routeSummary: context.machine.summary,
    durationSec: context.durationSec,
    previewDurationSec: context.previewDurationSec,
    valueSource: context.valueSource,
  });
  const spectralData = buildSpectralDataFromProjectSnapshot(request.snapshot);
  const routeArgs = {
    request,
    context,
    resultCommonFields,
    spectralData,
  };

  switch (resolveCarrierIntegralAuditionRouteKind(request.machineId)) {
    case "pure-dieter-raw-rendered": {
      const result = await prewarmCarrierIntegralRawRenderedRoute(routeArgs);
      return { warmed: true, reason: "Raw-material hearing preview warmed", ...result };
    }
    case "harmonic-xplore-direct": {
      const result = await prewarmCarrierIntegralHarmonicXploreDirectRoute(routeArgs);
      return { warmed: true, reason: "Ratio-carrier hearing preview warmed", ...result };
    }
    case "synthetic-root-follow":
    default: {
      const result = await prewarmCarrierIntegralSyntheticRootFollowRoute(routeArgs);
      return { warmed: result.playable, reason: "Synthetic hearing preview prepared", ...result };
    }
  }
}

export async function auditionForgeProjectCarrierIntegral(
  request: CarrierIntegralAuditionRequest,
): Promise<CarrierIntegralAuditionResult> {
  const context = buildCarrierIntegralAuditionContext(request);
  const resultCommonFields = buildCarrierIntegralAuditionCommonFields({
    projectName: request.projectName,
    machineId: request.machineId,
    machineLabel: context.machine.shortLabel,
    bodySourceMode: context.bodySourceMode,
    routeSummary: context.machine.summary,
    durationSec: context.durationSec,
    previewDurationSec: context.previewDurationSec,
    valueSource: context.valueSource,
  });
  const spectralData = buildSpectralDataFromProjectSnapshot(request.snapshot);
  const routeArgs = {
    request,
    context,
    resultCommonFields,
    spectralData,
  };

  switch (resolveCarrierIntegralAuditionRouteKind(request.machineId)) {
    case "pure-dieter-raw-rendered":
      return auditionCarrierIntegralRawRenderedRoute(routeArgs);
    case "harmonic-xplore-direct":
      return auditionCarrierIntegralHarmonicXploreDirectRoute(routeArgs);
    case "synthetic-root-follow":
    default:
      return auditionCarrierIntegralSyntheticRootFollowRoute(routeArgs);
  }
}
