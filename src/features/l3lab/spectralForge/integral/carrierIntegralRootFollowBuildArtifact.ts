import type { RootFollowBankEntryConfig } from '../../../xensonar/rootFollow/rootFollowTypes';
import type { SpectralForgeV2RootFollowPlanSummary } from '../rootFollow/buildV2RootFollowEvent';
import type { CarrierIntegralAuditionCommonFields } from './carrierIntegralAuditionCommonFields';

export type CarrierIntegralRootFollowBuildArtifact = CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  config: RootFollowBankEntryConfig | null;
  baseHz: number | null;
  noteCount: number;
  trackCount: number;
  branchALineTrafficCount: number;
  b573WindowCount: number;
  intervalWindowCount: number;
};

type CarrierIntegralRootFollowBuildArtifactCounts = Pick<
  CarrierIntegralRootFollowBuildArtifact,
  'noteCount' | 'trackCount' | 'branchALineTrafficCount' | 'b573WindowCount' | 'intervalWindowCount'
>;

type CarrierIntegralRootFollowBuildArtifactBaseArgs = CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  config: RootFollowBankEntryConfig | null;
  baseHz: number | null;
  counts: CarrierIntegralRootFollowBuildArtifactCounts;
};

function buildCarrierIntegralRootFollowBuildArtifactBase(
  args: CarrierIntegralRootFollowBuildArtifactBaseArgs,
): CarrierIntegralRootFollowBuildArtifact {
  return {
    ok: args.ok,
    reason: args.reason,
    projectName: args.projectName,
    machineId: args.machineId,
    machineLabel: args.machineLabel,
    bodySourceMode: args.bodySourceMode,
    routeSummary: args.routeSummary,
    config: args.config,
    durationSec: args.durationSec,
    previewDurationSec: args.previewDurationSec,
    baseHz: args.baseHz,
    noteCount: args.counts.noteCount,
    trackCount: args.counts.trackCount,
    branchALineTrafficCount: args.counts.branchALineTrafficCount,
    b573WindowCount: args.counts.b573WindowCount,
    intervalWindowCount: args.counts.intervalWindowCount,
    valueSource: args.valueSource,
  };
}

export function buildCarrierIntegralDonatelloRootFollowBuildArtifact(args: CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  config: RootFollowBankEntryConfig | null;
  baseHz: number | null;
  bandCount: number;
}): CarrierIntegralRootFollowBuildArtifact {
  return buildCarrierIntegralRootFollowBuildArtifactBase({
    ...args,
    counts: {
      noteCount: 0,
      trackCount: args.bandCount,
      branchALineTrafficCount: 0,
      b573WindowCount: 0,
      intervalWindowCount: args.bandCount,
    },
  });
}

export function buildCarrierIntegralSpectralWindowBodyRootFollowBuildArtifact(args: CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  config: RootFollowBankEntryConfig | null;
  baseHz: number | null;
  bandCount: number;
}): CarrierIntegralRootFollowBuildArtifact {
  return buildCarrierIntegralRootFollowBuildArtifactBase({
    ...args,
    counts: {
      noteCount: 0,
      trackCount: args.bandCount,
      branchALineTrafficCount: 0,
      b573WindowCount: args.bandCount,
      intervalWindowCount: args.bandCount,
    },
  });
}

export function buildCarrierIntegralRawRootFollowBuildArtifact(args: CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  baseHz: number | null;
}): CarrierIntegralRootFollowBuildArtifact {
  return buildCarrierIntegralRootFollowBuildArtifactBase({
    ...args,
    config: null,
    counts: {
      noteCount: 0,
      trackCount: 0,
      branchALineTrafficCount: 0,
      b573WindowCount: 0,
      intervalWindowCount: 0,
    },
  });
}

export function buildCarrierIntegralDieterV2RootFollowBuildArtifact(args: CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  config: RootFollowBankEntryConfig | null;
  baseHz: number | null;
  trackCount: number;
}): CarrierIntegralRootFollowBuildArtifact {
  return buildCarrierIntegralRootFollowBuildArtifactBase({
    ...args,
    counts: {
      noteCount: 0,
      trackCount: args.trackCount,
      branchALineTrafficCount: 0,
      b573WindowCount: 0,
      intervalWindowCount: 0,
    },
  });
}

export function buildCarrierIntegralSyntheticRootFollowBuildArtifact(args: CarrierIntegralAuditionCommonFields & {
  ok: boolean;
  reason: string;
  config: RootFollowBankEntryConfig | null;
  baseHz: number | null;
  summary: Pick<SpectralForgeV2RootFollowPlanSummary,
    'noteCount' | 'trackCount' | 'branchALineTrafficCount' | 'b573WindowCount' | 'intervalWindowCount'
  >;
}): CarrierIntegralRootFollowBuildArtifact {
  return buildCarrierIntegralRootFollowBuildArtifactBase({
    ...args,
    counts: {
      noteCount: args.summary.noteCount,
      trackCount: args.summary.trackCount,
      branchALineTrafficCount: args.summary.branchALineTrafficCount,
      b573WindowCount: args.summary.b573WindowCount,
      intervalWindowCount: args.summary.intervalWindowCount,
    },
  });
}
