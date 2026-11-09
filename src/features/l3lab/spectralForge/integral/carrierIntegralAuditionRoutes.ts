import { audioEngine } from "../audio/AudioEngine";
import { renderCarrierIntegralHarmonicXploreDirectPreviewBuffer, resolveCarrierIntegralHarmonicXploreDirectSynthLab } from "./carrierIntegralHarmonicXploreDirectEngine";
import { buildCarrierIntegralBertHarmonicPolytracePreviewKey, renderCarrierIntegralBertHarmonicPolytracePreviewBuffer } from "./carrierIntegralBertHarmonicPolytracePreview";
import { buildSpektralSyntheseParamsHash, renderCarrierIntegralSpektralSynthesePreviewBuffer } from "./carrierIntegralSpektralSyntheseEngine";
import type { SpectralData } from "../audio/SpectralData";
import { DURATION } from "../spectralConstants";
import {
  buildCarrierIntegralRenderedPreviewCacheKey,
  getOrRenderCarrierIntegralRenderedPreviewBuffer,
  getOrRenderCarrierIntegralRenderedPreviewValue,
} from "./carrierIntegralRenderedPreviewCache";
import type { CarrierIntegralAuditionContext } from "./carrierIntegralAuditionContext";
import type { CarrierIntegralAuditionCommonFields } from "./carrierIntegralAuditionCommonFields";
import { buildCarrierIntegralSyntheticRootFollowBuild } from "./carrierIntegralSyntheticRootFollowBuild";
import {
  buildCarrierIntegralRawRenderedAuditionResult,
  buildCarrierIntegralRootFollowAuditionResult,
  type CarrierIntegralAuditionResult,
} from "./carrierIntegralAuditionResult";
import type { CarrierIntegralAuditionRequest } from "./carrierIntegralAuditionRequest";
import { stableCarrierIntegralJson } from "./carrierIntegralStableIdentity";
import { resolveCarrierIntegralDisplayAxisAnchorHz } from './carrierIntegralPitchAxisContract';

type CarrierIntegralAuditionRouteArgs = {
  request: CarrierIntegralAuditionRequest;
  context: CarrierIntegralAuditionContext;
  resultCommonFields: CarrierIntegralAuditionCommonFields;
  spectralData: SpectralData;
};

function buildStableHarmonicXplorePreviewParamsHash(context: CarrierIntegralAuditionContext): string {
  const harmonicXplore = context.harmonicXplore;
  return stableCarrierIntegralJson({
    route: 'harmonic-xplore-direct-preview-cache-v2-stable-musical-params',
    harmonicXplore: {
      version: harmonicXplore.version,
      profileId: harmonicXplore.profileId,
      seriesType: harmonicXplore.seriesType,
      phase: harmonicXplore.phase,
      count: harmonicXplore.count,
      rolloff: harmonicXplore.rolloff,
      registerFold: harmonicXplore.registerFold,
      detailDensity: harmonicXplore.detailDensity,
      detailMode: harmonicXplore.detailMode,
    },
    previewDurationMs: Math.round(context.previewDurationSec * 1000),
    previewGain: Math.round(context.previewGain * 10000),
    previewPitchRatio: Math.round(context.previewPitchRatio * 10000),
  });
}

export async function auditionCarrierIntegralRawRenderedRoute(
  args: CarrierIntegralAuditionRouteArgs,
): Promise<CarrierIntegralAuditionResult> {
  const { request, context, resultCommonFields, spectralData } = args;
  const { synthLab, previewBpm, previewGain, previewPitchRatio, durationSec } = context;
  const rawCacheKey = buildCarrierIntegralRenderedPreviewCacheKey({
    machineId: request.machineId,
    snapshot: request.snapshot,
    durationSec: DURATION,
    previewBpm,
    synthLab,
    paramsHash: "pure-dieter-raw-render",
  });
  const rawPreview = await getOrRenderCarrierIntegralRenderedPreviewBuffer(
    rawCacheKey,
    () => audioEngine.renderToBuffer(
      spectralData,
      request.snapshot.synthMode,
      request.snapshot.waveformMix,
      request.onRenderProgress,
    ),
  );
  await audioEngine.playRenderedAudioBufferPreview(rawPreview.buffer, {
    lifecycleMode: rawPreview.cacheHit
      ? "pure-dieter-cached-rendered-preview"
      : "pure-dieter-rendered-preview",
    playbackRate: (DURATION / Math.max(0.05, durationSec)) * previewPitchRatio,
    volume: previewGain,
    loopPreview: context.loopPreview,
    onPosition: request.onAudioPosition,
    onEnd: request.onAudioEnd,
  });

  return buildCarrierIntegralRawRenderedAuditionResult({
    played: true,
    ...resultCommonFields,
    reason: `Pure Dieter · Rohklang (${context.valueSourceLabel})`,
    cacheHit: rawPreview.cacheHit,
  });
}

export async function prewarmCarrierIntegralRawRenderedRoute(
  args: CarrierIntegralAuditionRouteArgs,
): Promise<{ cacheHit: boolean; cacheKey: string; rendered: boolean }> {
  const { request, context, spectralData } = args;
  const { synthLab, previewBpm } = context;
  const rawCacheKey = buildCarrierIntegralRenderedPreviewCacheKey({
    machineId: request.machineId,
    snapshot: request.snapshot,
    durationSec: DURATION,
    previewBpm,
    synthLab,
    paramsHash: "pure-dieter-raw-render",
  });
  const rawPreview = await getOrRenderCarrierIntegralRenderedPreviewBuffer(
    rawCacheKey,
    () => audioEngine.renderToBuffer(
      spectralData,
      request.snapshot.synthMode,
      request.snapshot.waveformMix,
      request.onRenderProgress,
    ),
  );
  return { cacheHit: rawPreview.cacheHit, cacheKey: rawCacheKey, rendered: !rawPreview.cacheHit };
}

export async function auditionCarrierIntegralHarmonicXploreDirectRoute(
  args: CarrierIntegralAuditionRouteArgs,
): Promise<CarrierIntegralAuditionResult> {
  const { request, context, resultCommonFields, spectralData } = args;
  const directSynthLab = resolveCarrierIntegralHarmonicXploreDirectSynthLab(context.synthLab);
  const isSpektralSynthese = request.machineId === 'spektral-synthese-body';
  const cacheKey = buildCarrierIntegralRenderedPreviewCacheKey({
    machineId: request.machineId,
    snapshot: request.snapshot,
    durationSec: context.durationSec,
    previewBpm: context.previewBpm,
    previewPitchSemitones: request.previewPitchSemitones ?? 0,
    synthLab: directSynthLab,
    paramsHash: isSpektralSynthese
      ? buildSpektralSyntheseParamsHash(spectralData)
      : buildStableHarmonicXplorePreviewParamsHash(context),
  });
  const renderedPreview = await getOrRenderCarrierIntegralRenderedPreviewValue(
    cacheKey,
    () => {
      const commonRenderArgs = {
        spectralData,
        synthLab: directSynthLab,
        harmonicXplore: context.harmonicXplore,
        durationSec: context.durationSec,
        previewDurationSec: context.loopPreview ? context.durationSec : context.previewDurationSec,
        rootHz: resolveCarrierIntegralDisplayAxisAnchorHz(spectralData, context.previewPitchRatio),
        gain: context.previewGain,
        onProgress: request.onRenderProgress,
        cooperative: Boolean(request.onRenderProgress),
      };
      return isSpektralSynthese
        ? renderCarrierIntegralSpektralSynthesePreviewBuffer(commonRenderArgs)
        : renderCarrierIntegralHarmonicXploreDirectPreviewBuffer(commonRenderArgs);
    },
  );
  const rendered = renderedPreview.value;
  await audioEngine.playRenderedAudioBufferPreview(rendered.buffer, {
    lifecycleMode: renderedPreview.cacheHit
      ? 'harmonic-xplore-direct-carrier-cached-preview'
      : 'harmonic-xplore-direct-carrier-rendered-preview',
    volume: context.previewGain,
    loopPreview: context.loopPreview,
    onPosition: request.onAudioPosition,
    onEnd: request.onAudioEnd,
  });
  return buildCarrierIntegralRootFollowAuditionResult({
    ok: true,
    played: true,
    ...resultCommonFields,
    reason: `${isSpektralSynthese ? 'SpektralSynthese' : 'HarmonicXplorE Direkt'} · ${rendered.summary.carrierReading} · ${rendered.summary.oscillatorCount} Partials · Serie ${rendered.summary.series.join(':')}`,
    summary: {
      noteCount: rendered.summary.oscillatorCount,
      trackCount: 1,
      branchALineTrafficCount: 0,
      b573WindowCount: 0,
      b573VoiceCount: 0,
      b573LocalFieldVoiceCount: 0,
      intervalWindowCount: 0,
      intervalWindowVoiceCount: 0,
      spectralWindowMetaCount: rendered.summary.series.length,
    },
    cacheHit: renderedPreview.cacheHit,
  });
}

export async function prewarmCarrierIntegralHarmonicXploreDirectRoute(
  args: CarrierIntegralAuditionRouteArgs,
): Promise<{ cacheHit: boolean; cacheKey: string; rendered: boolean }> {
  const { request, context, spectralData } = args;
  const directSynthLab = resolveCarrierIntegralHarmonicXploreDirectSynthLab(context.synthLab);
  const isSpektralSynthese = request.machineId === 'spektral-synthese-body';
  const cacheKey = buildCarrierIntegralRenderedPreviewCacheKey({
    machineId: request.machineId,
    snapshot: request.snapshot,
    durationSec: context.durationSec,
    previewBpm: context.previewBpm,
    previewPitchSemitones: request.previewPitchSemitones ?? 0,
    synthLab: directSynthLab,
    paramsHash: isSpektralSynthese
      ? buildSpektralSyntheseParamsHash(spectralData)
      : buildStableHarmonicXplorePreviewParamsHash(context),
  });
  const renderedPreview = await getOrRenderCarrierIntegralRenderedPreviewValue(
    cacheKey,
    () => {
      const commonRenderArgs = {
        spectralData,
        synthLab: directSynthLab,
        harmonicXplore: context.harmonicXplore,
        durationSec: context.durationSec,
        previewDurationSec: context.loopPreview ? context.durationSec : context.previewDurationSec,
        rootHz: resolveCarrierIntegralDisplayAxisAnchorHz(spectralData, context.previewPitchRatio),
        gain: context.previewGain,
        onProgress: request.onRenderProgress,
        cooperative: Boolean(request.onRenderProgress),
      };
      return isSpektralSynthese
        ? renderCarrierIntegralSpektralSynthesePreviewBuffer(commonRenderArgs)
        : renderCarrierIntegralHarmonicXploreDirectPreviewBuffer(commonRenderArgs);
    },
  );
  return { cacheHit: renderedPreview.cacheHit, cacheKey, rendered: !renderedPreview.cacheHit };
}

async function renderPolytracePreview(args: {
  request: CarrierIntegralAuditionRequest;
  context: CarrierIntegralAuditionContext;
  spectralData: SpectralData;
  baseHz: number;
  timbre: 'fm' | 'acid' | 'vocal';
  gain: number;
  maxVoices: number;
  cachePrefix: string;
}): Promise<{ cacheHit: boolean; cacheKey: string; rendered: boolean; buffer: AudioBuffer }> {
  const { request, context, spectralData } = args;
  const renderDurationSec = context.loopPreview ? context.durationSec : context.previewDurationSec;
  const sampleRate = 48000;
  const token = buildCarrierIntegralBertHarmonicPolytracePreviewKey({
    spectralData,
    durationSec: renderDurationSec,
    sampleRate,
    baseHz: args.baseHz,
    gain: args.gain,
    maxVoices: args.maxVoices,
    timbre: args.timbre,
  });
  const cacheKey = buildCarrierIntegralRenderedPreviewCacheKey({
    machineId: request.machineId,
    snapshot: request.snapshot,
    durationSec: context.durationSec,
    previewBpm: context.previewBpm,
    previewPitchSemitones: request.previewPitchSemitones ?? 0,
    synthLab: context.synthLab,
    paramsHash: `${args.cachePrefix}:${token}`,
  });
  const renderedPreview = await getOrRenderCarrierIntegralRenderedPreviewBuffer(
    cacheKey,
    async () => renderCarrierIntegralBertHarmonicPolytracePreviewBuffer({
      spectralData,
      durationSec: renderDurationSec,
      sampleRate,
      baseHz: args.baseHz,
      gain: args.gain,
      maxVoices: args.maxVoices,
      timbre: args.timbre,
    }).buffer,
  );
  return { cacheHit: renderedPreview.cacheHit, cacheKey, rendered: !renderedPreview.cacheHit, buffer: renderedPreview.buffer };
}


function resolveSyntheticPolytracePreviewBaseHz(rootFollowBaseHz: number): number {
  // Antonia/Bert/Cecilia are synthetic Root-Follow-derived polytrace previews.
  // They must stay anchored to the Root-Follow musical base, not to the display-axis
  // centroid. Using the display-axis anchor here pitches dense/high drawings upward
  // and collapses the audible timbre distance between the A/B/C readers.
  return Number.isFinite(rootFollowBaseHz) && rootFollowBaseHz > 0 ? rootFollowBaseHz : 110;
}

function resolveActiveSyntheticPolytraceSpec(machineId: string): null | {
  timbre: 'fm' | 'acid' | 'vocal';
  gain: number;
  maxVoices: number;
  cachePrefix: string;
  reasonSuffix: string;
} {
  if (machineId === 'branch-a-line-traffic') {
    return { timbre: 'fm', gain: 0.46, maxVoices: 12, cachePrefix: 'antonia-fm-polytrace', reasonSuffix: 'FM' };
  }
  if (machineId === 'branch-b573-synth-window') {
    return { timbre: 'acid', gain: 0.52, maxVoices: 14, cachePrefix: 'bert-harmonic-polytrace', reasonSuffix: 'H-PT' };
  }
  if (machineId === 'branch-c-interval-body') {
    return { timbre: 'vocal', gain: 0.48, maxVoices: 16, cachePrefix: 'cecilia-vocal-polytrace', reasonSuffix: 'WT-PT' };
  }
  return null;
}

export async function prewarmCarrierIntegralSyntheticRootFollowRoute(
  args: CarrierIntegralAuditionRouteArgs,
): Promise<{ cacheHit: boolean; cacheKey: string; rendered: boolean; playable: boolean }> {
  const { request, context, spectralData } = args;
  const rootFollowBuild = buildCarrierIntegralSyntheticRootFollowBuild({ request, context, spectralData }).rootFollowBuild;
  if (!rootFollowBuild.summary.eligible) {
    return {
      cacheHit: false,
      cacheKey: `${request.machineId}:not-eligible-for-hearing-preview`,
      rendered: false,
      playable: false,
    };
  }

  const polytraceSpec = resolveActiveSyntheticPolytraceSpec(String(request.machineId));
  if (polytraceSpec) {
    const renderedPreview = await renderPolytracePreview({
      request,
      context,
      spectralData,
      baseHz: resolveSyntheticPolytracePreviewBaseHz(rootFollowBuild.summary.baseHz),
      ...polytraceSpec,
    });
    return {
      cacheHit: renderedPreview.cacheHit,
      cacheKey: renderedPreview.cacheKey,
      rendered: renderedPreview.rendered,
      playable: true,
    };
  }

  return {
    cacheHit: true,
    cacheKey: `${request.machineId}:direct-root-follow-preview-ready:${Math.round(context.previewBpm * 10)}:${Math.round(context.previewGain * 1000)}:${Math.round(context.durationSec * 1000)}`,
    rendered: false,
    playable: true,
  };
}

export async function auditionCarrierIntegralSyntheticRootFollowRoute(
  args: CarrierIntegralAuditionRouteArgs,
): Promise<CarrierIntegralAuditionResult> {
  const { request, context, resultCommonFields, spectralData } = args;
  const { machine, previewBpm, previewGain, durationSec } = context;
  const rootFollowBuild = buildCarrierIntegralSyntheticRootFollowBuild({ request, context, spectralData }).rootFollowBuild;
  if (!rootFollowBuild.summary.eligible) {
    return buildCarrierIntegralRootFollowAuditionResult({
      ok: false,
      played: false,
      ...resultCommonFields,
      reason: rootFollowBuild.summary.reason,
      summary: rootFollowBuild.summary,
    });
  }

  const polytraceSpec = resolveActiveSyntheticPolytraceSpec(String(request.machineId));
  if (polytraceSpec) {
    const renderedPreview = await renderPolytracePreview({
      request,
      context,
      spectralData,
      baseHz: resolveSyntheticPolytracePreviewBaseHz(rootFollowBuild.summary.baseHz),
      ...polytraceSpec,
    });
    await audioEngine.playRenderedAudioBufferPreview(renderedPreview.buffer, {
      lifecycleMode: renderedPreview.cacheHit ? 'cached-rendered-buffer' : 'fresh-rendered-buffer',
      volume: previewGain,
      loopPreview: context.loopPreview,
      onPosition: request.onAudioPosition,
      onEnd: request.onAudioEnd,
    });
    return buildCarrierIntegralRootFollowAuditionResult({
      ok: true,
      played: true,
      ...resultCommonFields,
      reason: `${machine.shortLabel} · ${polytraceSpec.reasonSuffix} (${rootFollowBuild.summary.lineCount} Linien).`,
      summary: rootFollowBuild.summary,
      cacheHit: renderedPreview.cacheHit,
    });
  }

  await audioEngine.playRootFollowSynthPreview(rootFollowBuild.config, {
    label: machine.shortLabel,
    bpm: previewBpm,
    bars: request.snapshot.materialExport.bars,
    durationSec,
    previewDurationSec: context.previewDurationSec,
    rootHz: rootFollowBuild.summary.baseHz,
    loopPreview: context.loopPreview,
    onPosition: request.onAudioPosition,
    onEnd: request.onAudioEnd,
  });

  return buildCarrierIntegralRootFollowAuditionResult({
    ok: true,
    played: true,
    ...resultCommonFields,
    reason: rootFollowBuild.summary.reason,
    summary: rootFollowBuild.summary,
  });
}
