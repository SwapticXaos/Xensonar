import type { ForgeProjectSnapshot } from '../../state/store';
import { buildCarrierIntegralSnapshotSpectralSignature, stableCarrierIntegralJson } from '../../integral';
import type { SpectralForgeBasisHearingOption } from './spectralForgeBasisHearingModes';

export type BasisHearingPreparedEntry = {
  cacheKey: string;
  rendered: boolean;
  machineId: string;
};

export function createBasisHearingPreparedEntry(
  prewarmResult: Pick<BasisHearingPreparedEntry, 'cacheKey' | 'rendered' | 'machineId'>,
): BasisHearingPreparedEntry {
  return {
    cacheKey: prewarmResult.cacheKey,
    rendered: prewarmResult.rendered,
    machineId: prewarmResult.machineId,
  };
}

export function buildBasisHearingStableRequestKey(args: {
  option: SpectralForgeBasisHearingOption;
  snapshot: ForgeProjectSnapshot;
  selection: unknown;
  synthLab: unknown;
  harmonicXplore: unknown;
  previewBpm: number;
  previewGain: number;
  previewPitchSemitones: number;
}): string {
  return stableCarrierIntegralJson({
    version: 'basis-hearing-stable-request-v1',
    optionId: args.option.id,
    machineId: args.option.machineId,
    harmonicXploreProfileId: args.option.harmonicXploreProfileId ?? null,
    spectralSignature: buildCarrierIntegralSnapshotSpectralSignature(args.snapshot),
    synthMode: args.snapshot.synthMode,
    waveformMix: args.snapshot.waveformMix,
    bars: args.snapshot.materialExport.bars,
    selection: stableSelectionForBasisHearing(args.selection, args.option.machineId),
    synthLab: stableSynthLabForBasisHearing(args.synthLab),
    harmonicXplore: stableHarmonicXploreForBasisHearing(args.harmonicXplore),
    previewBpm: Math.round(args.previewBpm * 10),
    previewGain: Math.round(args.previewGain * 10000),
    previewPitchSemitones: Math.round(args.previewPitchSemitones * 100),
  });
}

function stableSelectionForBasisHearing(selection: unknown, fallbackMachineId: string) {
  const value = selection as { machineId?: unknown; bodySourceMode?: unknown; presetId?: unknown; paramsPatch?: unknown };
  return {
    machineId: value?.machineId ?? fallbackMachineId,
    bodySourceMode: value?.bodySourceMode ?? null,
    presetId: value?.presetId ?? null,
    paramsPatch: value?.paramsPatch ?? {},
  };
}

function stableSynthLabForBasisHearing(synthLab: unknown) {
  const value = synthLab as { presetId?: unknown; paramsPatch?: unknown };
  return {
    presetId: value?.presetId ?? null,
    paramsPatch: value?.paramsPatch ?? {},
  };
}

function stableHarmonicXploreForBasisHearing(harmonicXplore: unknown) {
  const value = harmonicXplore as {
    profileId?: unknown;
    seriesType?: unknown;
    phase?: unknown;
    count?: unknown;
    rolloff?: unknown;
    registerFold?: unknown;
    detailDensity?: unknown;
    detailMode?: unknown;
  };
  return {
    profileId: value?.profileId ?? null,
    seriesType: value?.seriesType ?? null,
    phase: value?.phase ?? null,
    count: value?.count ?? null,
    rolloff: value?.rolloff ?? null,
    registerFold: value?.registerFold ?? null,
    detailDensity: value?.detailDensity ?? null,
    detailMode: value?.detailMode ?? null,
  };
}
