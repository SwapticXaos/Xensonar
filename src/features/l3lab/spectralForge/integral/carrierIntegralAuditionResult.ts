import type {
  CarrierIntegralBodySourceMode,
  CarrierIntegralMachineId,
} from './carrierIntegralContracts';
import type { CarrierIntegralAuditionCommonFields } from './carrierIntegralAuditionCommonFields';
import {
  formatCarrierIntegralAuditionValueSourceLabel,
  type CarrierIntegralAuditionValueSource,
} from './carrierIntegralAuditionContext';

export type CarrierIntegralAuditionTarget = 'root-follow-preview';

export type CarrierIntegralAuditionSummaryLike = {
  noteCount: number;
  trackCount: number;
  branchALineTrafficCount: number;
  b573WindowCount: number;
  b573VoiceCount: number;
  b573LocalFieldVoiceCount: number;
  intervalWindowCount: number;
  intervalWindowVoiceCount: number;
  spectralWindowMetaCount: number;
};

export type CarrierIntegralAuditionResult = {
  ok: boolean;
  played: boolean;
  target: CarrierIntegralAuditionTarget;
  projectName: string;
  machineId: CarrierIntegralMachineId;
  machineLabel: string;
  bodySourceMode: CarrierIntegralBodySourceMode;
  routeSummary: string;
  reason: string;
  noteCount: number;
  trackCount: number;
  branchALineTrafficCount: number;
  b573WindowCount: number;
  b573VoiceCount: number;
  b573LocalFieldVoiceCount: number;
  intervalWindowCount: number;
  intervalWindowVoiceCount: number;
  spectralWindowMetaCount: number;
  durationSec: number;
  previewDurationSec: number;
  valueSource: CarrierIntegralAuditionValueSource;
  valueSourceLabel: string;
  cacheHit?: boolean;
};

type CarrierIntegralAuditionResultBaseArgs = CarrierIntegralAuditionCommonFields & {
  played: boolean;
  reason: string;
  cacheHit?: boolean;
};

function buildCarrierIntegralAuditionResultBase(
  args: CarrierIntegralAuditionResultBaseArgs & {
    ok: boolean;
    noteCount: number;
    trackCount: number;
    branchALineTrafficCount: number;
    b573WindowCount: number;
    b573VoiceCount: number;
    b573LocalFieldVoiceCount: number;
    intervalWindowCount: number;
    intervalWindowVoiceCount: number;
    spectralWindowMetaCount: number;
  },
): CarrierIntegralAuditionResult {
  return {
    ok: args.ok,
    played: args.played,
    target: 'root-follow-preview',
    projectName: args.projectName,
    machineId: args.machineId,
    machineLabel: args.machineLabel,
    bodySourceMode: args.bodySourceMode,
    routeSummary: args.routeSummary,
    reason: args.reason,
    noteCount: args.noteCount,
    trackCount: args.trackCount,
    branchALineTrafficCount: args.branchALineTrafficCount,
    b573WindowCount: args.b573WindowCount,
    b573VoiceCount: args.b573VoiceCount,
    b573LocalFieldVoiceCount: args.b573LocalFieldVoiceCount,
    intervalWindowCount: args.intervalWindowCount,
    intervalWindowVoiceCount: args.intervalWindowVoiceCount,
    spectralWindowMetaCount: args.spectralWindowMetaCount,
    durationSec: args.durationSec,
    previewDurationSec: args.previewDurationSec,
    valueSource: args.valueSource,
    valueSourceLabel: formatCarrierIntegralAuditionValueSourceLabel(args.valueSource),
    cacheHit: args.cacheHit,
  };
}

export function buildCarrierIntegralRootFollowAuditionResult(args: CarrierIntegralAuditionResultBaseArgs & {
  ok: boolean;
  summary: CarrierIntegralAuditionSummaryLike;
}): CarrierIntegralAuditionResult {
  return buildCarrierIntegralAuditionResultBase({
    ...args,
    noteCount: args.summary.noteCount,
    trackCount: args.summary.trackCount,
    branchALineTrafficCount: args.summary.branchALineTrafficCount,
    b573WindowCount: args.summary.b573WindowCount,
    b573VoiceCount: args.summary.b573VoiceCount,
    b573LocalFieldVoiceCount: args.summary.b573LocalFieldVoiceCount,
    intervalWindowCount: args.summary.intervalWindowCount,
    intervalWindowVoiceCount: args.summary.intervalWindowVoiceCount,
    spectralWindowMetaCount: args.summary.spectralWindowMetaCount,
  });
}

export function buildCarrierIntegralRawRenderedAuditionResult(args: Omit<CarrierIntegralAuditionResultBaseArgs, 'previewDurationSec'>): CarrierIntegralAuditionResult {
  return buildCarrierIntegralAuditionResultBase({
    ...args,
    ok: args.played,
    previewDurationSec: args.durationSec,
    noteCount: args.played ? 1 : 0,
    trackCount: args.played ? 1 : 0,
    branchALineTrafficCount: 0,
    b573WindowCount: 0,
    b573VoiceCount: 0,
    b573LocalFieldVoiceCount: 0,
    intervalWindowCount: 0,
    intervalWindowVoiceCount: 0,
    spectralWindowMetaCount: 0,
  });
}

export function buildCarrierIntegralDonatelloAuditionResult(args: CarrierIntegralAuditionResultBaseArgs & {
  bandCount: number;
  automationCurveCount: number;
}): CarrierIntegralAuditionResult {
  return buildCarrierIntegralAuditionResultBase({
    ...args,
    ok: args.played,
    noteCount: 0,
    trackCount: args.bandCount,
    branchALineTrafficCount: 0,
    b573WindowCount: 0,
    b573VoiceCount: 0,
    b573LocalFieldVoiceCount: 0,
    intervalWindowCount: args.bandCount,
    intervalWindowVoiceCount: 0,
    spectralWindowMetaCount: args.automationCurveCount,
  });
}
