import { prepareRootFollowSynthPlayback } from '../../../xensonar/rootFollow/rootFollowSamplePreparation';
import type { DonorProjectionModel } from '../donorV2/donorProjection';
import { SpectralData, yToFrequency } from './SpectralData';
import type { AudioSourceAsset } from './AudioImporter';
import type { Forge3PreviewField } from '../../forge3/bodyField';
import type { MediatedAudioBody } from '../body/mediatedAudioBodyTypes';
import type { AnchorBindingPreview, CarrierSpectralSkeleton, DonorTimbreAtlas } from '../types/carrierDonorV2Types';
import type { MaterialAllocationPreview, MaterialField } from '../types/gestaltMaterialField';
import type { TransferProfile } from '../types/transferProfile';
import { shouldRenderCarrierDonorV2RawTextureOverlay, type CarrierDonorV2DonorUseMode } from '../types/carrierDonorV2RenderPolicy';
import { DURATION } from '../spectralConstants';
import { buildDefaultGuideMarkers } from '../state/storeMaterialExport';
import type { MaterialEntry } from '../../materialLibrary';
import { scheduleRootFollowSynthWindow } from '../../../xensonar/rootFollow/rootFollowSynthFacade';
import { cloneRootFollowGranularPreset } from '../../../xensonar/rootFollow/rootFollowGranularSettings';
import type { RootFollowBankEntryConfig } from '../../../xensonar/rootFollow/rootFollowTypes';
import type { RootFollowDynamicRefs, RootFollowPlaybackRefs } from '../../../xensonar/rootFollow/rootFollowRendererTypes';
import { getAudioNowSec, getTransportPosition, type TransportClockSpec } from '../../../../core/time/unifiedTime';
import type { SynthMode, WaveformMix } from '../state/storeTypes';
import {
  markSpectralForgePreviewAnimationFrameReleased,
  markSpectralForgePreviewAudioSourceReleased,
  registerSpectralForgePreviewAnimationFrame,
  registerSpectralForgePreviewAudioSource,
} from '../lifecycle/spectralForgePreviewLifecycleRegistry';
import { mixedWaveform } from './audioWaveforms';
import { scheduleBeatGuideClicks } from './beatGuideScheduler';
import { encodeMonoFloat32ToWavBlob } from './wavEncoding';
import { mixMonoAudioBuffersWeighted, resampleMonoAudioBufferToLength } from './audioBufferMath';
import { CarrierDonorBodyRenderer } from './CarrierDonorBodyRenderer';
import { SpectralBufferRenderer } from './SpectralBufferRenderer';
import { Forge3BodyRenderer } from './Forge3BodyRenderer';
import {
  buildSpectralForgePreviewRenderCacheKey,
  getOrRenderSpectralForgePreviewBuffer,
  hasSpectralForgePreviewBuffer,
  prewarmSpectralForgePreviewBuffer,
} from './spectralPreviewRenderCache';

interface BeatGuideOptions {
  beatGuideAudible?: boolean;
  beatGuideVolume?: number;
  bars?: number;
  guideSegments?: number;
  guideMarkers?: number[];
  loopPreview?: boolean;
  loopDurationSec?: number;
  playbackRate?: number;
  previewVolume?: number;
}

// Waveform generator functions
export type SpectralForgePreviewPlaybackResult = {
  cacheHit: boolean;
  cacheKey: string;
};

export type SpectralForgePreviewPrewarmResult = {
  cacheHit: boolean;
  cacheKey: string;
  rendered: boolean;
};

/**
 * AudioEngine - Converts spectral data to sound using Web Audio API
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private startOffset = 0;
  private onPositionUpdate: ((pos: number) => void) | null = null;
  private animFrameId: number | null = null;
  private renderedBuffer: AudioBuffer | null = null;
  private renderedBufferCacheKey: string | null = null;
  private playToken = 0;
  private currentBufferCleanup: (() => void) | null = null;
  private donorPreviewOnStop: (() => void) | null = null;
  private guideNodes: Array<OscillatorNode | GainNode> = [];
  private rootFollowPreviewCleanup: (() => void) | null = null;
  private readonly carrierDonorBodyRenderer = new CarrierDonorBodyRenderer(() => this.getContext());
  private readonly spectralBufferRenderer = new SpectralBufferRenderer(() => this.getContext());
  private readonly forge3BodyRenderer = new Forge3BodyRenderer(() => this.getContext());

  constructor() {}

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 44100 });
    }
    return this.ctx;
  }

  /**
   * Render spectral data to an AudioBuffer
   */
  async renderToBuffer(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void
  ): Promise<AudioBuffer> {
    const buffer = await this.spectralBufferRenderer.renderToBuffer(spectralData, synthMode, waveformMix, onProgress);
    this.renderedBuffer = buffer;
    this.renderedBufferCacheKey = null;
    return buffer;
  }
  private async playBufferInternal(
    buffer: AudioBuffer,
    durationSec: number,
    fromPosition: number,
    onPosition?: (pos: number) => void,
    onEnd?: () => void,
    options?: {
      playbackRate?: number;
      loopPreview?: boolean;
      beatGuide?: BeatGuideOptions;
      lifecycleMode?: string;
      volume?: number;
    }
  ): Promise<boolean> {
    this.stop();
    const startToken = this.playToken;

    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (this.playToken !== startToken) return false;
    this.onPositionUpdate = onPosition || null;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const outputGain = ctx.createGain();
    outputGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, options?.volume ?? options?.beatGuide?.previewVolume ?? 1)),
      ctx.currentTime,
    );
    source.connect(outputGain);
    outputGain.connect(ctx.destination);
    const cleanup = () => {
      source.onended = null;
      try { source.disconnect(); } catch {}
      try { outputGain.disconnect(); } catch {}
      if (this.currentBufferCleanup === cleanup) this.currentBufferCleanup = null;
    };
    this.currentBufferCleanup = cleanup;

    const playbackRate = Math.max(0.05, options?.playbackRate ?? 1);
    const loopPreview = !!options?.loopPreview;
    source.playbackRate.setValueAtTime(playbackRate, ctx.currentTime);
    source.loop = loopPreview;
    source.loopStart = 0;
    source.loopEnd = durationSec;

    this.startOffset = Math.max(0, Math.min(durationSec, fromPosition * durationSec));
    this.startTime = getAudioNowSec(ctx);
    this.isPlaying = true;
    this.currentSource = source;
    const lifecycleMode = options?.lifecycleMode ?? 'audio-engine-buffer';
    registerSpectralForgePreviewAudioSource({
      mode: lifecycleMode,
      durationSec,
      playbackRate,
      loopPreview,
    });
    const token = ++this.playToken;
    const clockSpec: TransportClockSpec = {
      startTimeSec: this.startTime,
      startOffsetSec: this.startOffset,
      durationSec,
      playbackRate,
      loop: loopPreview,
    };

    this.onPositionUpdate?.(fromPosition);
    try { source.start(0, this.startOffset); } catch (error) { this.stop(); throw error; }

    if (options?.beatGuide?.beatGuideAudible) {
      this.scheduleBeatGuide(
        ctx,
        this.startTime,
        this.startOffset,
        options.beatGuide.bars ?? 4,
        options.beatGuide.guideSegments ?? 4,
        options.beatGuide.guideMarkers ?? buildDefaultGuideMarkers(4),
        Math.max(0.05, options.beatGuide.loopDurationSec ?? (durationSec / playbackRate)),
        loopPreview,
        Math.max(0, Math.min(1, options.beatGuide.beatGuideVolume ?? 0.35))
      );
    }

    source.onended = () => {
      if (token !== this.playToken) return;
      this.isPlaying = false;
      markSpectralForgePreviewAudioSourceReleased('spectral-forge-preview-source-ended');
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        markSpectralForgePreviewAnimationFrameReleased('spectral-forge-preview-raf-ended');
      }
      this.animFrameId = null;
      this.onPositionUpdate?.(1);
      this.currentSource = null;
      cleanup();
      this.stopBeatGuide();
      onEnd?.();
    };

    const updatePosition = () => {
      if (!this.isPlaying || token !== this.playToken) return;
      const pos = getTransportPosition(clockSpec, getAudioNowSec(ctx));
      this.onPositionUpdate?.(pos);
      if (!loopPreview && pos >= 1) {
        return;
      }
      this.animFrameId = requestAnimationFrame(updatePosition);
    };
    this.animFrameId = requestAnimationFrame(updatePosition);
    registerSpectralForgePreviewAnimationFrame({ mode: lifecycleMode, loopPreview });
    return true;
  }

  buildPreviewCacheKey(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
  ): string {
    const ctx = this.getContext();
    return buildSpectralForgePreviewRenderCacheKey({
      spectralData,
      synthMode,
      waveformMix,
      sampleRate: ctx.sampleRate,
      durationSec: DURATION,
    });
  }

  hasPreviewBufferFor(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
  ): boolean {
    const previewCacheKey = this.buildPreviewCacheKey(spectralData, synthMode, waveformMix);
    return (!!this.renderedBuffer && this.renderedBufferCacheKey === previewCacheKey)
      || hasSpectralForgePreviewBuffer(previewCacheKey);
  }

  async prewarmPreviewRender(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void,
  ): Promise<SpectralForgePreviewPrewarmResult> {
    const previewCacheKey = this.buildPreviewCacheKey(spectralData, synthMode, waveformMix);
    if (this.renderedBuffer && this.renderedBufferCacheKey === previewCacheKey) {
      onProgress?.(1);
      return { cacheHit: true, cacheKey: previewCacheKey, rendered: false };
    }

    const rendered = await prewarmSpectralForgePreviewBuffer(
      previewCacheKey,
      () => this.renderToBuffer(spectralData, synthMode, waveformMix, onProgress),
    );
    this.renderedBuffer = rendered.buffer;
    this.renderedBufferCacheKey = previewCacheKey;
    return {
      cacheHit: rendered.cacheHit,
      cacheKey: previewCacheKey,
      rendered: !rendered.cacheHit,
    };
  }

  /**
   * Play from a position (0-1)
   */
  async play(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    fromPosition: number = 0,
    onPosition?: (pos: number) => void,
    onEnd?: () => void,
    onProgress?: (progress: number) => void,
    beatGuide?: BeatGuideOptions
  ): Promise<SpectralForgePreviewPlaybackResult> {
    this.stop();
    const requestToken = this.playToken;
    const previewCacheKey = this.buildPreviewCacheKey(spectralData, synthMode, waveformMix);

    let previewBuffer = this.renderedBuffer;
    let cacheHit = !!previewBuffer && this.renderedBufferCacheKey === previewCacheKey;

    if (!cacheHit || !previewBuffer) {
      const rendered = await getOrRenderSpectralForgePreviewBuffer(
        previewCacheKey,
        () => this.renderToBuffer(spectralData, synthMode, waveformMix, onProgress),
      );
      previewBuffer = rendered.buffer;
      cacheHit = rendered.cacheHit;
      this.renderedBuffer = previewBuffer;
      this.renderedBufferCacheKey = previewCacheKey;
    } else {
      onProgress?.(1);
    }

    if (requestToken !== this.playToken) return { cacheHit, cacheKey: previewCacheKey };
    await this.playBufferInternal(
      previewBuffer,
      DURATION,
      fromPosition,
      onPosition,
      onEnd,
      {
        playbackRate: Math.max(0.05, beatGuide?.playbackRate ?? 1),
        loopPreview: !!beatGuide?.loopPreview,
        beatGuide,
        lifecycleMode: cacheHit ? 'spectral-data-cached-preview' : 'spectral-data-rendered-preview',
        volume: beatGuide?.previewVolume,
      }
    );
    return { cacheHit, cacheKey: previewCacheKey };
  }

  async playSourceAsset(
    sourceAsset: AudioSourceAsset,
    previewMode: 'window' | 'full' = 'window',
    fromPosition: number = 0,
    onPosition?: (pos: number) => void,
    onEnd?: () => void,
  ): Promise<void> {
    const ctx = this.getContext();
    const sampleRate = sourceAsset.sampleRate;
    const startSec = previewMode === 'full' ? 0 : sourceAsset.importStartSec;
    const durationSec = previewMode === 'full'
      ? Math.max(0.05, sourceAsset.originalDuration)
      : Math.max(0.05, sourceAsset.importDurationSec);
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const sampleLength = Math.max(1, Math.min(sourceAsset.monoSamples.length - startSample, Math.floor(durationSec * sampleRate)));
    const buffer = ctx.createBuffer(1, sampleLength, sampleRate);
    buffer.copyToChannel(Float32Array.from(sourceAsset.monoSamples.subarray(startSample, startSample + sampleLength)), 0, 0);
    await this.playBufferInternal(buffer, sampleLength / sampleRate, fromPosition, onPosition, onEnd, { playbackRate: 1, loopPreview: false, lifecycleMode: `source-asset-${previewMode}` });
  }

  renderForge3BodyPreviewToBuffer(
    sourceAsset: AudioSourceAsset,
    spectralData: SpectralData,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
  ): AudioBuffer {
    return this.forge3BodyRenderer.renderForge3BodyPreviewToBuffer(sourceAsset, spectralData, forge3Field, loopDurationSec);
  }



  private renderCarrierDonorV2TextureOverlayToBuffer(
    skeleton: CarrierSpectralSkeleton,
    materialAllocationPreview: MaterialAllocationPreview,
    materialField: MaterialField,
    donorSourceAsset: AudioSourceAsset,
    loopDurationSec: number,
    transferProfile: TransferProfile,
  ): AudioBuffer {
    return this.carrierDonorBodyRenderer.renderCarrierDonorV2TextureOverlayToBuffer(
      skeleton,
      materialAllocationPreview,
      materialField,
      donorSourceAsset,
      loopDurationSec,
      transferProfile,
    );
  }

  renderFromMediatedAudioBodyToBuffer(
    body: MediatedAudioBody,
    options: {
      sourceAsset?: AudioSourceAsset | null,
      loopDurationSec: number,
      donorSourceAsset?: AudioSourceAsset | null,
      renderMode?: 'source_first_preview' | 'body_contract_preview',
    },
  ): AudioBuffer {
    return this.carrierDonorBodyRenderer.renderFromMediatedAudioBodyToBuffer(body, options);
  }

  renderCarrierDonorV2PreviewToBuffer(
    skeleton: CarrierSpectralSkeleton,
    bindingPreview: AnchorBindingPreview[],
    donorAtlas: DonorTimbreAtlas,
    loopDurationSec: number,
    transferProfile: TransferProfile,
  ): AudioBuffer {
    return this.carrierDonorBodyRenderer.renderCarrierDonorV2PreviewToBuffer(
      skeleton,
      bindingPreview,
      donorAtlas,
      loopDurationSec,
      transferProfile,
    );
  }

  async renderDonorBodyToBuffer(
    spectralData: SpectralData,
    source: AudioSourceAsset,
    durationSec: number,
    isCancelled: () => boolean = () => false,
  ): Promise<AudioBuffer> {
    return this.carrierDonorBodyRenderer.renderDonorBodyToBuffer(spectralData, source, durationSec, isCancelled);
  }

  async renderDonorProofToBuffer(
    source: AudioSourceAsset,
    model: DonorProjectionModel,
    kind: 'original' | 'reconstruction' | 'transposed',
    isCancelled: () => boolean = () => false,
  ): Promise<AudioBuffer> {
    return this.carrierDonorBodyRenderer.renderDonorProofToBuffer(source, model, kind, isCancelled);
  }

  async playDonorProofPreview(
    source: AudioSourceAsset, model: DonorProjectionModel,
    kind: 'original' | 'reconstruction' | 'transposed',
    onEnd?: () => void, isCancelled: () => boolean = () => false,
  ) {
    this.stop();
    const token = this.playToken, ctx = this.getContext();
    if (ctx.state === 'suspended') await ctx.resume();
    if (this.playToken !== token || isCancelled()) return false;
    const buffer = await this.renderDonorProofToBuffer(source, model, kind, isCancelled);
    if (this.playToken !== token || isCancelled()) return false;
    return this.playBufferInternal(buffer, buffer.duration, 0, undefined, onEnd, { lifecycleMode: `donor-proof-${kind}`, volume: 1, loopPreview: false });
  }

  async playDonorBodyPreview(spectralData: SpectralData, source: AudioSourceAsset, durationSec: number, onEnd?: () => void, options?: { loopPreview?: boolean; onPosition?: (position: number) => void; isCancelled?: () => boolean }): Promise<boolean> {
    this.stop();
    const token = this.playToken;
    const ctx = this.getContext();
    // Resume in the initiating gesture, before the expensive cooperative render.
    if (ctx.state === 'suspended') await ctx.resume();
    const cancelled = () => this.playToken !== token || !!options?.isCancelled?.();
    if (cancelled()) return false;
    try {
      const buffer = await this.renderDonorBodyToBuffer(spectralData, source, durationSec, cancelled);
      if (cancelled()) return false;
      const finish = () => {
        if (this.donorPreviewOnStop === finish) this.donorPreviewOnStop = null;
        onEnd?.();
      };
      const started = await this.playBufferInternal(buffer, durationSec, 0, options?.onPosition, finish, { lifecycleMode: 'donor-projection', volume: 1, loopPreview: options?.loopPreview });
      if (!started) return false;
      this.donorPreviewOnStop = finish;
      return true;
    } catch (error) {
      if (cancelled() || (error instanceof Error && error.name === 'AbortError')) return false;
      throw error;
    }
  }

  async renderCarrierDonorV2CompositeToBuffer(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    skeleton: CarrierSpectralSkeleton,
    bindingPreview: AnchorBindingPreview[],
    donorAtlas: DonorTimbreAtlas,
    materialField: MaterialField | null,
    materialAllocationPreview: MaterialAllocationPreview | null,
    donorSourceAsset: AudioSourceAsset | null,
    transferProfile: TransferProfile,
    loopDurationSec: number,
    donorUseMode: CarrierDonorV2DonorUseMode = 'synthetic_pigment',
  ): Promise<AudioBuffer> {
    const ctx = this.getContext();
    const targetSamples = Math.max(1, Math.round(Math.max(0.05, loopDurationSec) * ctx.sampleRate));

    if (donorUseMode === 'timbre_projection') {
      if (!donorSourceAsset) throw new Error('Donor-Projektion braucht ein extrahiertes Audiosample.');
      return this.renderDonorBodyToBuffer(spectralData, donorSourceAsset, loopDurationSec);
    }

    const previousRenderedBuffer = this.renderedBuffer;
    const renderedCarrier = await this.renderToBuffer(spectralData, synthMode, waveformMix);
    this.renderedBuffer = previousRenderedBuffer;

    const baseBuffer = resampleMonoAudioBufferToLength(this.getContext(), renderedCarrier, targetSamples);
    const structureBuffer = this.renderCarrierDonorV2PreviewToBuffer(skeleton, bindingPreview, donorAtlas, loopDurationSec, transferProfile);

    const carrierWeight = 0.54 + transferProfile.detail.verticalFidelity * 0.16 + transferProfile.detail.sparseRespect * 0.08;
    const structureWeight = 0.14
      + transferProfile.detail.anchorFocus * 0.12
      + transferProfile.detail.polyAnchorBlend * 0.08
      + transferProfile.detail.resonanceLoad * 0.06
      + transferProfile.detail.residualLoad * 0.04;
    const layers: Array<{ buffer: AudioBuffer; gain: number }> = [
      { buffer: baseBuffer, gain: carrierWeight },
      { buffer: structureBuffer, gain: structureWeight },
    ];

    if (
      shouldRenderCarrierDonorV2RawTextureOverlay(donorUseMode) &&
      donorSourceAsset &&
      materialField &&
      materialAllocationPreview &&
      materialAllocationPreview.allocations.length > 0
    ) {
      const textureBuffer = this.renderCarrierDonorV2TextureOverlayToBuffer(
        skeleton,
        materialAllocationPreview,
        materialField,
        donorSourceAsset,
        loopDurationSec,
        transferProfile,
      );
      const textureWeight = 0.16
        + transferProfile.detail.resonanceLoad * 0.12
        + transferProfile.detail.residualLoad * 0.14
        + transferProfile.detail.transientLoad * 0.1
        + transferProfile.detail.microModulationLoad * 0.06;
      layers.push({ buffer: textureBuffer, gain: textureWeight });
    }

    return mixMonoAudioBuffersWeighted(this.getContext(), layers, 0.95);
  }

  async playCarrierDonorV2Preview(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    skeleton: CarrierSpectralSkeleton,
    bindingPreview: AnchorBindingPreview[],
    donorAtlas: DonorTimbreAtlas,
    materialField: MaterialField | null,
    materialAllocationPreview: MaterialAllocationPreview | null,
    donorSourceAsset: AudioSourceAsset | null,
    transferProfile: TransferProfile,
    loopDurationSec: number,
    donorUseMode: CarrierDonorV2DonorUseMode = 'synthetic_pigment',
    fromPosition: number = 0,
    onPosition?: (pos: number) => void,
    onEnd?: () => void,
  ): Promise<void> {
    this.stop();
    const requestToken = this.playToken;
    const buffer = await this.renderCarrierDonorV2CompositeToBuffer(
      spectralData,
      synthMode,
      waveformMix,
      skeleton,
      bindingPreview,
      donorAtlas,
      materialField,
      materialAllocationPreview,
      donorSourceAsset,
      transferProfile,
      loopDurationSec,
      donorUseMode,
    );
    if (requestToken !== this.playToken) return;
    await this.playBufferInternal(buffer, buffer.length / buffer.sampleRate, fromPosition, onPosition, onEnd, { playbackRate: 1, loopPreview: false, lifecycleMode: `carrier-donor-v2-${donorUseMode}` });
  }


  async playRenderedAudioBufferPreview(
    buffer: AudioBuffer,
    options: {
      lifecycleMode: string;
      fromPosition?: number;
      onPosition?: (pos: number) => void;
      onEnd?: () => void;
      playbackRate?: number;
      volume?: number;
      loopPreview?: boolean;
    },
  ): Promise<void> {
    await this.playBufferInternal(
      buffer,
      buffer.length / Math.max(1, buffer.sampleRate),
      options.fromPosition ?? 0,
      options.onPosition,
      options.onEnd,
      {
        playbackRate: Math.max(0.05, options.playbackRate ?? 1),
        loopPreview: !!options.loopPreview,
        lifecycleMode: options.lifecycleMode,
        volume: options.volume,
      },
    );
  }


  async playRootFollowSynthPreview(
    entryConfig: RootFollowBankEntryConfig,
    options: {
      label?: string;
      bpm: number;
      bars: number;
      durationSec: number;
      previewDurationSec?: number;
      rootHz?: number | null;
      volume?: number;
      loopPreview?: boolean;
      onPosition?: (pos: number) => void;
      onEnd?: () => void;
    },
  ): Promise<void> {
    this.stop();
    const ctx = this.getContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const totalDurationSec = Math.max(0.25, options.durationSec || 1);
    const previewDurationSec = Math.max(0.25, Math.min(totalDurationSec, options.previewDurationSec ?? totalDurationSec));
    const rootHz = Math.max(20, Math.min(12000, options.rootHz ?? entryConfig.synthPattern?.baseHz ?? entryConfig.synthPatch?.baseHz ?? 110));
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, options.volume ?? 0.72)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    const activeNodes = new Set<AudioNode>();
    const activeSynthVoices = new Map();
    const refs: RootFollowPlaybackRefs = {
      cacheRef: { current: new Map() },
      gainRef: { current: masterGain },
      tokenRef: { current: 0 },
      timerRef: { current: null },
      activeNodesRef: { current: activeNodes },
      activeSynthVoicesRef: { current: activeSynthVoices },
    };
    const dynamicRefs: RootFollowDynamicRefs = {
      volumeRef: { current: Math.max(0, Math.min(1, options.volume ?? 0.72)) },
      getRhythmBusRef: { current: () => ctx.destination },
      ensureMyzelPostFxRouterRef: { current: () => undefined },
      getForgeSendRef: { current: () => null },
      getCurrentRootHzRef: { current: () => rootHz },
      granulationModeRef: { current: 'flowing' },
      granularSettingsRef: { current: cloneRootFollowGranularPreset('flowing') },
    };

    const entry: MaterialEntry = {
      id: 'carrier-integral-audition-' + Date.now().toString(36),
      name: options.label ?? 'Carrier-Integral Vorhören',
      role: 'loop',
      bpm: Math.max(1, options.bpm || 108),
      bars: Math.max(1, Math.round(options.bars || 4)),
      guideSegments: 4,
      guideMarkers: buildDefaultGuideMarkers(4),
      loopStartSec: 0,
      loopEndSec: totalDurationSec,
      rootHz,
      sourceVersion: 'spectralforge-carrier-integral-audition-v1',
      renderMode: 'carrier-integral-root-follow-preview',
      durationSec: totalDurationSec,
      intendedLoopDurationSec: totalDurationSec,
      blob: new Blob([], { type: 'audio/wav' }),
      blobUrl: '',
      createdAt: Date.now(),
    };

    const token = ++this.playToken;
    this.isPlaying = true;
    this.currentSource = null;
    this.onPositionUpdate = options.onPosition ?? null;
    this.startOffset = 0;
    this.startTime = getAudioNowSec(ctx);
    this.onPositionUpdate?.(0);
    const loopPreview = !!options.loopPreview;
    const visualCycleDurationSec = loopPreview ? totalDurationSec : previewDurationSec;
    registerSpectralForgePreviewAudioSource({
      mode: 'carrier-integral-root-follow-preview',
      durationSec: visualCycleDurationSec,
      playbackRate: 1,
      loopPreview,
    });
    registerSpectralForgePreviewAnimationFrame({
      mode: 'carrier-integral-root-follow-preview',
      loopPreview,
    });

    let transportAnchor = ctx.currentTime + 0.026;
    let nextSliceStart = transportAnchor;
    let sessionAnchorHz: number | null = null;
    let schedulingBusy = false;
    let released = false;

    const cleanup = () => {
      if (released) return;
      released = true;
      if (refs.timerRef.current !== null) {
        window.clearInterval(refs.timerRef.current);
        refs.timerRef.current = null;
      }
      activeNodes.forEach((node) => {
        if (node instanceof AudioScheduledSourceNode) {
          try { node.stop(); } catch {}
        }
        try { node.disconnect(); } catch {}
      });
      activeNodes.clear();
      activeSynthVoices.clear();
      try { masterGain.disconnect(); } catch {}
      markSpectralForgePreviewAudioSourceReleased('carrier-integral-root-follow-preview-ended');
    };
    this.rootFollowPreviewCleanup = cleanup;

    const scheduleWindow = async () => {
      if (schedulingBusy || token !== this.playToken || !this.isPlaying) return;
      if (!loopPreview && ctx.currentTime >= transportAnchor + previewDurationSec + 0.1) return;
      schedulingBusy = true;
      try {
        const next = await scheduleRootFollowSynthWindow({
          ctx,
          entry,
          entryConfig,
          quantizeBpm: entry.bpm,
          refs,
          dynamicRefs,
          transportAnchor,
          nextSliceStart,
          sessionAnchorHz,
        });
        nextSliceStart = next.nextSliceStart;
        sessionAnchorHz = next.sessionAnchorHz;
      } finally {
        schedulingBusy = false;
      }
    };

    await prepareRootFollowSynthPlayback(ctx, entryConfig, refs);
    if (released || token !== this.playToken || !this.isPlaying) return;
    transportAnchor = ctx.currentTime + 0.026;
    this.startTime = transportAnchor;
    nextSliceStart = transportAnchor;
    await scheduleWindow();
    if (released || token !== this.playToken || !this.isPlaying) return;
    refs.timerRef.current = window.setInterval(() => {
      void scheduleWindow().catch((error) => {
        console.warn('[xensonar][carrier-integral-audition]', error);
      });
    }, 24);

    const update = () => {
      if (token !== this.playToken || !this.isPlaying) return;
      const elapsed = Math.max(0, ctx.currentTime - transportAnchor);
      const pos = loopPreview
        ? (elapsed % visualCycleDurationSec) / visualCycleDurationSec
        : Math.max(0, Math.min(1, elapsed / previewDurationSec));
      this.onPositionUpdate?.(pos);
      if (!loopPreview && pos >= 1) {
        this.stop();
        options.onEnd?.();
        return;
      }
      this.animFrameId = requestAnimationFrame(update);
    };
    this.animFrameId = requestAnimationFrame(update);
  }




  async exportMediatedAudioBodyWAV(
    body: MediatedAudioBody,
    options: {
      sourceAsset?: AudioSourceAsset | null,
      loopDurationSec: number,
      donorSourceAsset?: AudioSourceAsset | null,
      renderMode?: 'source_first_preview' | 'body_contract_preview',
    },
  ): Promise<Blob> {
    const buffer = this.renderFromMediatedAudioBodyToBuffer(body, options);
    return this.encodeWAV(buffer.getChannelData(0), buffer.sampleRate);
  }

  async playFromMediatedAudioBody(
    body: MediatedAudioBody,
    options: {
      sourceAsset?: AudioSourceAsset | null,
      loopDurationSec: number,
      donorSourceAsset?: AudioSourceAsset | null,
      fromPosition?: number,
      onPosition?: (pos: number) => void,
      onEnd?: () => void,
      renderMode?: 'source_first_preview' | 'body_contract_preview',
    },
  ): Promise<void> {
    const buffer = this.renderFromMediatedAudioBodyToBuffer(body, options);
    await this.playBufferInternal(buffer, buffer.length / buffer.sampleRate, options.fromPosition ?? 0, options.onPosition, options.onEnd, { playbackRate: 1, loopPreview: false, lifecycleMode: options.renderMode ?? 'mediated-audio-body-preview' });
  }


  renderForge3BodyDrivenPreviewToBuffer(
    sourceAsset: AudioSourceAsset,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
  ): AudioBuffer {
    return this.forge3BodyRenderer.renderForge3BodyDrivenPreviewToBuffer(sourceAsset, forge3Field, loopDurationSec);
  }

  async exportForge3BodyPreviewWAV(
    sourceAsset: AudioSourceAsset,
    spectralData: SpectralData,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
  ): Promise<Blob> {
    const buffer = this.renderForge3BodyPreviewToBuffer(sourceAsset, spectralData, forge3Field, loopDurationSec);
    return this.encodeWAV(buffer.getChannelData(0), buffer.sampleRate);
  }

  async exportForge3BodyDrivenPreviewWAV(
    sourceAsset: AudioSourceAsset,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
  ): Promise<Blob> {
    const buffer = this.renderForge3BodyDrivenPreviewToBuffer(sourceAsset, forge3Field, loopDurationSec);
    return this.encodeWAV(buffer.getChannelData(0), buffer.sampleRate);
  }

  async playForge3BodyPreview(
    sourceAsset: AudioSourceAsset,
    spectralData: SpectralData,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
    fromPosition: number = 0,
    onPosition?: (pos: number) => void,
    onEnd?: () => void,
  ): Promise<void> {
    const buffer = this.renderForge3BodyPreviewToBuffer(sourceAsset, spectralData, forge3Field, loopDurationSec);
    await this.playBufferInternal(buffer, buffer.length / buffer.sampleRate, fromPosition, onPosition, onEnd, { playbackRate: 1, loopPreview: false, lifecycleMode: 'forge3-body-preview' });
  }

  async playForge3BodyDrivenPreview(
    sourceAsset: AudioSourceAsset,
    forge3Field: Forge3PreviewField,
    loopDurationSec: number,
    fromPosition: number = 0,
    onPosition?: (pos: number) => void,
    onEnd?: () => void,
  ): Promise<void> {
    const buffer = this.renderForge3BodyDrivenPreviewToBuffer(sourceAsset, forge3Field, loopDurationSec);
    await this.playBufferInternal(buffer, buffer.length / buffer.sampleRate, fromPosition, onPosition, onEnd, { playbackRate: 1, loopPreview: false, lifecycleMode: 'forge3-body-driven-preview' });
  }

  stop(): void {
    this.playToken++;
    const donorEnded = this.donorPreviewOnStop;
    this.donorPreviewOnStop = null;
    if (donorEnded) { try { donorEnded(); } catch { /* UI cleanup must not prevent stop. */ } }
    if (this.rootFollowPreviewCleanup) {
      const cleanup = this.rootFollowPreviewCleanup;
      this.rootFollowPreviewCleanup = null;
      cleanup();
    }
    this.stopBeatGuide();
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* noop */ }
      markSpectralForgePreviewAudioSourceReleased('spectral-forge-preview-source-stopped');
      this.currentSource = null;
    }
    this.currentBufferCleanup?.();
    this.onPositionUpdate = null;
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      markSpectralForgePreviewAnimationFrameReleased('spectral-forge-preview-raf-cancelled');
      this.animFrameId = null;
    }
  }

  /** Invalidate rendered buffer when data changes */
  invalidateBuffer(): void {
    this.renderedBuffer = null;
    this.renderedBufferCacheKey = null;
  }

  private stopBeatGuide(): void {
    for (const node of this.guideNodes) {
      try { node.disconnect(); } catch {}
      if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
        try { (node as OscillatorNode).stop(); } catch {}
      }
    }
    this.guideNodes = [];
  }

  private scheduleBeatGuide(ctx: AudioContext, startTime: number, startOffset: number, bars: number, guideSegments: number, guideMarkers: number[], loopDurationSec: number, loopPreview: boolean, guideVolume: number): void {
    this.stopBeatGuide();
    this.guideNodes = scheduleBeatGuideClicks(
      ctx,
      startTime,
      startOffset,
      bars,
      guideSegments,
      guideMarkers,
      loopDurationSec,
      loopPreview,
      guideVolume,
    );
  }


  /** Play a short preview of a specific column with waveform mix */
  async previewColumn(
    spectralData: SpectralData,
    columnX: number,
    waveformMix: WaveformMix,
    durationMs: number = 200
  ): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const height = spectralData.height;
    const now = ctx.currentTime;
    const dur = durationMs / 1000;

    const sampleRate = ctx.sampleRate;
    const numSamples = Math.round(dur * sampleRate);
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const output = buffer.getChannelData(0);

    // Collect active frequencies
    const freqAmps: { freq: number; amp: number }[] = [];
    for (let y = 0; y < height; y++) {
      const amp = spectralData.get(columnX, y);
      if (amp < 0.02) continue;
      const freq = yToFrequency(y, height);
      if (freq < 20 || freq > 20000) continue;
      freqAmps.push({ freq, amp });
      if (freqAmps.length >= 64) break;
    }

    // Render mixed waveform
    for (const fa of freqAmps) {
      const phaseInc = (2 * Math.PI * fa.freq) / sampleRate;
      let phase = 0;
      for (let i = 0; i < numSamples; i++) {
        // Envelope: fade out
        const env = 1 - (i / numSamples);
        output[i] += mixedWaveform(phase, waveformMix) * fa.amp * 0.03 * env;
        phase += phaseInc;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(now);
    source.stop(now + dur + 0.05);
  }

  /**
   * Export to WAV file
   */
  async exportWAV(
    spectralData: SpectralData,
    synthMode: SynthMode,
    waveformMix: WaveformMix,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const buffer = await this.renderToBuffer(spectralData, synthMode, waveformMix, onProgress);
    const channelData = buffer.getChannelData(0);
    return this.encodeWAV(channelData, buffer.sampleRate);
  }

  encodeSamplesToWAV(samples: Float32Array, sampleRate: number): Blob {
    return this.encodeWAV(samples, sampleRate);
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    return encodeMonoFloat32ToWavBlob(samples, sampleRate);
  }
}

// Singleton
export const audioEngine = new AudioEngine();
