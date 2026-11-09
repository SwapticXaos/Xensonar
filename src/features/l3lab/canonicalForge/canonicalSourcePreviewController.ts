import type { MutableRefObject } from 'react';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { CanonicalAnalysisBundle, CanonicalSourceView } from './analysis';
import {
  startSelectionLoopPreview as startForgeSelectionLoopPreview,
  startSourceAuditionPreview as startForgeSourceAuditionPreview,
  stopPreviewAudio as stopForgePreviewAudio,
  stopSelectionLoopPreview as stopForgeSelectionLoopPreview,
  stopSourceAuditionPreview as stopForgeSourceAuditionPreview,
  toggleSelectionLoopPreview as toggleForgeSelectionLoopPreview,
} from './previewControllers';
import type { DestructiveAudioProfile, SynthMode, WarpAudioProfile, WaveformMix } from './selectionAudioTransfer';

export function createCanonicalSourcePreviewController(args: {
  rawSourceAsset: AudioSourceAsset | null;
  effectiveLoopPreviewSelection: { startSec: number; durationSec: number; isDetail: boolean };
  bundle: CanonicalAnalysisBundle | null;
  auditionView: CanonicalSourceView | 'none';
  audioEngine: unknown;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  auditionBlendAmount: number;
  selectionStartSec: number;
  selectionDurationSec: number;
  destructiveAudioProfile: DestructiveAudioProfile | null;
  warpAudioProfile: WarpAudioProfile | null;
  selectionSeamScore: number;
  sourceViewOptions: Array<{ id: CanonicalSourceView; label: string }>;
  previewAudioRef: MutableRefObject<HTMLAudioElement | null>;
  sourceAuditionCtxRef: MutableRefObject<AudioContext | null>;
  sourceAuditionSourceRef: MutableRefObject<AudioBufferSourceNode | null>;
  sourceAuditionGainRef: MutableRefObject<GainNode | null>;
  sourceAuditionStartTimeRef: MutableRefObject<number>;
  sourceAuditionDurationRef: MutableRefObject<number>;
  sourceAuditionAnimationRef: MutableRefObject<number | null>;
  sourceAuditionModeRef: MutableRefObject<'sourceWindow' | 'sourceFull' | null>;
  selectionLoopPreviewCtxRef: MutableRefObject<AudioContext | null>;
  selectionLoopPreviewSourceRef: MutableRefObject<AudioBufferSourceNode | null>;
  selectionLoopPreviewGainRef: MutableRefObject<GainNode | null>;
  selectionLoopPreviewStartTimeRef: MutableRefObject<number>;
  selectionLoopPreviewDurationRef: MutableRefObject<number>;
  selectionLoopPreviewAnimationRef: MutableRefObject<number | null>;
  stopAllForge2Preview: (statusMessage?: string) => void;
  setPlayheadPosition: (value: number) => void;
  setIsPlaying: (value: boolean) => void;
  setSelectionLoopPreviewPlayheadSec: (value: number | null) => void;
  setSelectionLoopPreviewPlaying: (value: boolean) => void;
  selectionLoopPreviewPlaying: boolean;
  setStatus: (value: string) => void;
}) {
  const stopPreviewAudio = () => stopForgePreviewAudio({
    audioPreviewRef: args.previewAudioRef,
  });

  const stopSourceAuditionPreview = (resetPlayhead = true) => stopForgeSourceAuditionPreview({
    refs: {
      sourceAuditionCtxRef: args.sourceAuditionCtxRef,
      sourceAuditionSourceRef: args.sourceAuditionSourceRef,
      sourceAuditionGainRef: args.sourceAuditionGainRef,
      sourceAuditionStartTimeRef: args.sourceAuditionStartTimeRef,
      sourceAuditionDurationRef: args.sourceAuditionDurationRef,
      sourceAuditionAnimationRef: args.sourceAuditionAnimationRef,
      sourceAuditionModeRef: args.sourceAuditionModeRef,
    },
    setPlayheadPosition: args.setPlayheadPosition,
    resetPlayhead,
  });

  const stopSelectionLoopPreview = () => stopForgeSelectionLoopPreview({
    refs: {
      selectionLoopPreviewCtxRef: args.selectionLoopPreviewCtxRef,
      selectionLoopPreviewSourceRef: args.selectionLoopPreviewSourceRef,
      selectionLoopPreviewGainRef: args.selectionLoopPreviewGainRef,
      selectionLoopPreviewStartTimeRef: args.selectionLoopPreviewStartTimeRef,
      selectionLoopPreviewDurationRef: args.selectionLoopPreviewDurationRef,
      selectionLoopPreviewAnimationRef: args.selectionLoopPreviewAnimationRef,
    },
    setSelectionLoopPreviewPlaying: args.setSelectionLoopPreviewPlaying,
    setSelectionLoopPreviewPlayheadSec: args.setSelectionLoopPreviewPlayheadSec,
  });

  const startSelectionLoopPreview = async () => {
    await startForgeSelectionLoopPreview({
      rawSourceAsset: args.rawSourceAsset,
      effectiveLoopPreviewSelection: args.effectiveLoopPreviewSelection,
      stopAllForge2Preview: args.stopAllForge2Preview,
      refs: {
        selectionLoopPreviewCtxRef: args.selectionLoopPreviewCtxRef,
        selectionLoopPreviewSourceRef: args.selectionLoopPreviewSourceRef,
        selectionLoopPreviewGainRef: args.selectionLoopPreviewGainRef,
        selectionLoopPreviewStartTimeRef: args.selectionLoopPreviewStartTimeRef,
        selectionLoopPreviewDurationRef: args.selectionLoopPreviewDurationRef,
        selectionLoopPreviewAnimationRef: args.selectionLoopPreviewAnimationRef,
      },
      bundle: args.bundle,
      auditionView: args.auditionView,
      audioEngine: args.audioEngine as any,
      synthMode: args.synthMode,
      waveformMix: args.waveformMix,
      auditionBlendAmount: args.auditionBlendAmount,
      destructiveAudioProfile: args.destructiveAudioProfile,
      warpAudioProfile: args.warpAudioProfile,
      selectionSeamScore: args.selectionSeamScore,
      setSelectionLoopPreviewPlayheadSec: args.setSelectionLoopPreviewPlayheadSec,
      setSelectionLoopPreviewPlaying: args.setSelectionLoopPreviewPlaying,
      setStatus: args.setStatus,
      sourceViewOptions: args.sourceViewOptions,
    });
  };

  const toggleSelectionLoopPreview = async () => {
    await toggleForgeSelectionLoopPreview({
      selectionLoopPreviewPlaying: args.selectionLoopPreviewPlaying,
      stopSelectionLoopPreview,
      startSelectionLoopPreview,
      setStatus: args.setStatus,
    });
  };

  const startSourceAuditionPreview = async (previewMode: 'sourceWindow' | 'sourceFull', fromPosition = 0) => {
    return startForgeSourceAuditionPreview({
      previewMode,
      fromPosition,
      rawSourceAsset: args.rawSourceAsset,
      refs: {
        sourceAuditionCtxRef: args.sourceAuditionCtxRef,
        sourceAuditionSourceRef: args.sourceAuditionSourceRef,
        sourceAuditionGainRef: args.sourceAuditionGainRef,
        sourceAuditionStartTimeRef: args.sourceAuditionStartTimeRef,
        sourceAuditionDurationRef: args.sourceAuditionDurationRef,
        sourceAuditionAnimationRef: args.sourceAuditionAnimationRef,
        sourceAuditionModeRef: args.sourceAuditionModeRef,
      },
      stopPreviewAudio,
      stopSelectionLoopPreview,
      stopSourceAuditionPreview,
      bundle: args.bundle,
      auditionView: args.auditionView,
      audioEngine: args.audioEngine as any,
      synthMode: args.synthMode,
      waveformMix: args.waveformMix,
      auditionBlendAmount: args.auditionBlendAmount,
      selectionStartSec: args.selectionStartSec,
      selectionDurationSec: args.selectionDurationSec,
      destructiveAudioProfile: args.destructiveAudioProfile,
      warpAudioProfile: args.warpAudioProfile,
      setPlayheadPosition: args.setPlayheadPosition,
      setIsPlaying: args.setIsPlaying,
    });
  };

  return {
    stopPreviewAudio,
    stopSourceAuditionPreview,
    stopSelectionLoopPreview,
    startSelectionLoopPreview,
    toggleSelectionLoopPreview,
    startSourceAuditionPreview,
  };
}
