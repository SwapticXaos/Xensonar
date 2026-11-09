import type { MutableRefObject } from 'react';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { AudioEngine } from '../spectralForge/audio/AudioEngine';
import type { CanonicalAnalysisBundle, CanonicalSourceView } from './analysis';
import { buildSpectralDataFromComposite } from './analysis';
import {
  buildAuditionMixedLoopBuffer,
  buildAuditionSelectionBuffer,
  buildDirectSourceSelectionBuffer,
  type DestructiveAudioProfile,
  type SynthMode,
  type WarpAudioProfile,
  type WaveformMix,
} from './selectionAudioTransfer';

export type PreviewAudioRefs = {
  audioPreviewRef: MutableRefObject<HTMLAudioElement | null>;
};

export type SourceAuditionRefs = {
  sourceAuditionCtxRef: MutableRefObject<AudioContext | null>;
  sourceAuditionSourceRef: MutableRefObject<AudioBufferSourceNode | null>;
  sourceAuditionGainRef: MutableRefObject<GainNode | null>;
  sourceAuditionStartTimeRef: MutableRefObject<number>;
  sourceAuditionDurationRef: MutableRefObject<number>;
  sourceAuditionAnimationRef: MutableRefObject<number | null>;
  sourceAuditionModeRef: MutableRefObject<'sourceWindow' | 'sourceFull' | null>;
};

export type SelectionLoopPreviewRefs = {
  selectionLoopPreviewCtxRef: MutableRefObject<AudioContext | null>;
  selectionLoopPreviewSourceRef: MutableRefObject<AudioBufferSourceNode | null>;
  selectionLoopPreviewGainRef: MutableRefObject<GainNode | null>;
  selectionLoopPreviewStartTimeRef: MutableRefObject<number>;
  selectionLoopPreviewDurationRef: MutableRefObject<number>;
  selectionLoopPreviewAnimationRef: MutableRefObject<number | null>;
};

export function stopPreviewAudio(refs: PreviewAudioRefs) {
  if (refs.audioPreviewRef.current) {
    refs.audioPreviewRef.current.pause();
    refs.audioPreviewRef.current = null;
  }
}

export function stopSourceAuditionPreview(params: {
  refs: SourceAuditionRefs;
  setPlayheadPosition: (value: number) => void;
  resetPlayhead?: boolean;
}) {
  const { refs, setPlayheadPosition, resetPlayhead = true } = params;
  if (refs.sourceAuditionAnimationRef.current != null) {
    cancelAnimationFrame(refs.sourceAuditionAnimationRef.current);
    refs.sourceAuditionAnimationRef.current = null;
  }
  if (refs.sourceAuditionSourceRef.current) {
    try { refs.sourceAuditionSourceRef.current.stop(); } catch {}
    try { refs.sourceAuditionSourceRef.current.disconnect(); } catch {}
    refs.sourceAuditionSourceRef.current = null;
  }
  if (refs.sourceAuditionGainRef.current) {
    try { refs.sourceAuditionGainRef.current.disconnect(); } catch {}
    refs.sourceAuditionGainRef.current = null;
  }
  refs.sourceAuditionModeRef.current = null;
  if (resetPlayhead) setPlayheadPosition(0);
}

export function stopSelectionLoopPreview(params: {
  refs: SelectionLoopPreviewRefs;
  setSelectionLoopPreviewPlaying: (value: boolean) => void;
  setSelectionLoopPreviewPlayheadSec: (value: number | null) => void;
}) {
  const { refs, setSelectionLoopPreviewPlaying, setSelectionLoopPreviewPlayheadSec } = params;
  if (refs.selectionLoopPreviewAnimationRef.current != null) {
    cancelAnimationFrame(refs.selectionLoopPreviewAnimationRef.current);
    refs.selectionLoopPreviewAnimationRef.current = null;
  }
  if (refs.selectionLoopPreviewSourceRef.current) {
    try { refs.selectionLoopPreviewSourceRef.current.stop(); } catch {}
    try { refs.selectionLoopPreviewSourceRef.current.disconnect(); } catch {}
    refs.selectionLoopPreviewSourceRef.current = null;
  }
  if (refs.selectionLoopPreviewGainRef.current) {
    try { refs.selectionLoopPreviewGainRef.current.disconnect(); } catch {}
    refs.selectionLoopPreviewGainRef.current = null;
  }
  setSelectionLoopPreviewPlaying(false);
  setSelectionLoopPreviewPlayheadSec(null);
}

export async function startSelectionLoopPreview(params: {
  rawSourceAsset: AudioSourceAsset | null;
  effectiveLoopPreviewSelection: { startSec: number; durationSec: number; isDetail: boolean };
  stopAllForge2Preview: (statusMessage?: string) => void;
  refs: SelectionLoopPreviewRefs;
  bundle: CanonicalAnalysisBundle | null;
  auditionView: CanonicalSourceView | 'none';
  audioEngine: AudioEngine;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  auditionBlendAmount: number;
  destructiveAudioProfile: DestructiveAudioProfile | null;
  warpAudioProfile: WarpAudioProfile | null;
  selectionSeamScore: number;
  setSelectionLoopPreviewPlayheadSec: (value: number | null) => void;
  setSelectionLoopPreviewPlaying: (value: boolean) => void;
  setStatus: (value: string) => void;
  sourceViewOptions: Array<{ id: CanonicalSourceView; label: string }>;
}) {
  const {
    rawSourceAsset,
    effectiveLoopPreviewSelection,
    stopAllForge2Preview,
    refs,
    bundle,
    auditionView,
    audioEngine,
    synthMode,
    waveformMix,
    auditionBlendAmount,
    destructiveAudioProfile,
    warpAudioProfile,
    selectionSeamScore,
    setSelectionLoopPreviewPlayheadSec,
    setSelectionLoopPreviewPlaying,
    setStatus,
    sourceViewOptions,
  } = params;
  if (!rawSourceAsset) {
    setStatus('Keine Rohquelle für die Loop-Vorschau geladen.');
    return;
  }
  try {
    const previewRange = effectiveLoopPreviewSelection;
    stopAllForge2Preview('Starte Loop-Vorhörer ...');
    const ctx = refs.selectionLoopPreviewCtxRef.current ?? new AudioContext({ sampleRate: rawSourceAsset.sampleRate });
    refs.selectionLoopPreviewCtxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();
    const overlay = bundle && auditionView !== 'none'
      ? { audioEngine, spectralData: buildSpectralDataFromComposite(bundle, auditionView, 'none', 0), synthMode, waveformMix, amount: auditionBlendAmount }
      : null;
    const buffer = await buildAuditionMixedLoopBuffer(ctx, rawSourceAsset, previewRange.startSec, previewRange.durationSec, overlay, destructiveAudioProfile, warpAudioProfile);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.02);
    source.start();
    refs.selectionLoopPreviewSourceRef.current = source;
    refs.selectionLoopPreviewGainRef.current = gain;
    refs.selectionLoopPreviewStartTimeRef.current = ctx.currentTime;
    refs.selectionLoopPreviewDurationRef.current = Math.max(0.05, previewRange.durationSec);
    const updatePlayhead = () => {
      if (!refs.selectionLoopPreviewSourceRef.current || !refs.selectionLoopPreviewCtxRef.current) return;
      const duration = Math.max(0.05, refs.selectionLoopPreviewDurationRef.current);
      const elapsed = Math.max(0, refs.selectionLoopPreviewCtxRef.current.currentTime - refs.selectionLoopPreviewStartTimeRef.current);
      const phase = duration > 0 ? (elapsed % duration) / duration : 0;
      setSelectionLoopPreviewPlayheadSec(previewRange.startSec + phase * duration);
      refs.selectionLoopPreviewAnimationRef.current = requestAnimationFrame(updatePlayhead);
    };
    if (refs.selectionLoopPreviewAnimationRef.current != null) cancelAnimationFrame(refs.selectionLoopPreviewAnimationRef.current);
    refs.selectionLoopPreviewAnimationRef.current = requestAnimationFrame(updatePlayhead);
    source.onended = () => {
      if (refs.selectionLoopPreviewSourceRef.current === source) {
        stopSelectionLoopPreview({ refs, setSelectionLoopPreviewPlaying, setSelectionLoopPreviewPlayheadSec });
      }
    };
    setSelectionLoopPreviewPlaying(true);
    setStatus(`Loop-Vorhörer läuft${previewRange.isDetail ? ' auf Feinauswahl' : ''} · Naht ${(selectionSeamScore * 100).toFixed(0)}%${destructiveAudioProfile ? ' · destruktive Pegelmaske aktiv' : ''}${warpAudioProfile ? ' · Morph-Warp folgt der Quelle' : ''}${auditionView !== 'none' && auditionBlendAmount > 0 ? ` · ${sourceViewOptions.find((entry) => entry.id === auditionView)?.label ?? auditionView} ${(auditionBlendAmount * 100).toFixed(0)}% beigemischt` : ''} · Crossfade 24ms.`);
  } catch (error) {
    console.error('[xensonar][forge2][selection-loop-preview]', error);
    stopSelectionLoopPreview({ refs, setSelectionLoopPreviewPlaying, setSelectionLoopPreviewPlayheadSec });
    setStatus(`Loop-Vorhörer fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function toggleSelectionLoopPreview(params: {
  selectionLoopPreviewPlaying: boolean;
  stopSelectionLoopPreview: () => void;
  startSelectionLoopPreview: () => Promise<void>;
  setStatus: (value: string) => void;
}) {
  const { selectionLoopPreviewPlaying, stopSelectionLoopPreview, startSelectionLoopPreview, setStatus } = params;
  if (selectionLoopPreviewPlaying) {
    stopSelectionLoopPreview();
    setStatus('Loop-Vorhörer gestoppt.');
    return;
  }
  await startSelectionLoopPreview();
}

export async function startSourceAuditionPreview(params: {
  previewMode: 'sourceWindow' | 'sourceFull';
  fromPosition?: number;
  rawSourceAsset: AudioSourceAsset | null;
  refs: SourceAuditionRefs;
  stopPreviewAudio: () => void;
  stopSelectionLoopPreview: () => void;
  stopSourceAuditionPreview: (resetPlayhead?: boolean) => void;
  bundle: CanonicalAnalysisBundle | null;
  auditionView: CanonicalSourceView | 'none';
  audioEngine: AudioEngine;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  auditionBlendAmount: number;
  selectionStartSec: number;
  selectionDurationSec: number;
  destructiveAudioProfile: DestructiveAudioProfile | null;
  warpAudioProfile: WarpAudioProfile | null;
  setPlayheadPosition: (value: number) => void;
  setIsPlaying: (value: boolean) => void;
}) {
  const {
    previewMode,
    fromPosition = 0,
    rawSourceAsset,
    refs,
    stopPreviewAudio,
    stopSelectionLoopPreview,
    stopSourceAuditionPreview,
    bundle,
    auditionView,
    audioEngine,
    synthMode,
    waveformMix,
    auditionBlendAmount,
    selectionStartSec,
    selectionDurationSec,
    destructiveAudioProfile,
    warpAudioProfile,
    setPlayheadPosition,
    setIsPlaying,
  } = params;
  if (!rawSourceAsset) return false;
  const ctx = refs.sourceAuditionCtxRef.current ?? new AudioContext({ sampleRate: rawSourceAsset.sampleRate });
  refs.sourceAuditionCtxRef.current = ctx;
  if (ctx.state === 'suspended') await ctx.resume();
  stopPreviewAudio();
  stopSelectionLoopPreview();
  stopSourceAuditionPreview(false);
  const overlayEnabled = previewMode === 'sourceWindow' && bundle && auditionView !== 'none' && auditionBlendAmount > 0;
  const overlay = overlayEnabled && bundle
    ? { audioEngine, spectralData: buildSpectralDataFromComposite(bundle, auditionView as CanonicalSourceView, 'none', 0), synthMode, waveformMix, amount: auditionBlendAmount }
    : null;
  const buffer = previewMode === 'sourceFull'
    ? buildDirectSourceSelectionBuffer(ctx, rawSourceAsset, 0, rawSourceAsset.originalDuration)
    : await buildAuditionSelectionBuffer(ctx, rawSourceAsset, selectionStartSec, selectionDurationSec, overlay, destructiveAudioProfile, warpAudioProfile);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.92, ctx.currentTime + 0.02);
  const duration = Math.max(0.05, buffer.duration);
  const startOffset = Math.max(0, Math.min(duration - 0.001, fromPosition * duration));
  source.start(0, startOffset);
  refs.sourceAuditionSourceRef.current = source;
  refs.sourceAuditionGainRef.current = gain;
  refs.sourceAuditionModeRef.current = previewMode;
  refs.sourceAuditionStartTimeRef.current = ctx.currentTime - startOffset;
  refs.sourceAuditionDurationRef.current = duration;
  const updatePlayhead = () => {
    if (!refs.sourceAuditionSourceRef.current || !refs.sourceAuditionCtxRef.current) return;
    const elapsed = Math.max(0, refs.sourceAuditionCtxRef.current.currentTime - refs.sourceAuditionStartTimeRef.current);
    setPlayheadPosition(Math.max(0, Math.min(1, elapsed / Math.max(0.05, refs.sourceAuditionDurationRef.current))));
    refs.sourceAuditionAnimationRef.current = requestAnimationFrame(updatePlayhead);
  };
  refs.sourceAuditionAnimationRef.current = requestAnimationFrame(updatePlayhead);
  source.onended = () => {
    if (refs.sourceAuditionSourceRef.current !== source) return;
    stopSourceAuditionPreview();
    setIsPlaying(false);
  };
  return true;
}

export function previewMaterial(refs: PreviewAudioRefs, blobUrl: string) {
  stopPreviewAudio(refs);
  const audio = new Audio(blobUrl);
  refs.audioPreviewRef.current = audio;
  void audio.play().catch((error) => console.warn('[xensonar][canonical-forge][preview-material]', error));
}
