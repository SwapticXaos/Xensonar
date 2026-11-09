import { useRef } from 'react';

export type CanonicalSourceAuditionMode = 'sourceWindow' | 'sourceFull';

export function useCanonicalForgePreviewRefs() {
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const selectionLoopPreviewCtxRef = useRef<AudioContext | null>(null);
  const selectionLoopPreviewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const selectionLoopPreviewGainRef = useRef<GainNode | null>(null);
  const selectionLoopPreviewStartTimeRef = useRef(0);
  const selectionLoopPreviewDurationRef = useRef(0);
  const selectionLoopPreviewAnimationRef = useRef<number | null>(null);

  const sourceAuditionCtxRef = useRef<AudioContext | null>(null);
  const sourceAuditionSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const sourceAuditionGainRef = useRef<GainNode | null>(null);
  const sourceAuditionStartTimeRef = useRef(0);
  const sourceAuditionDurationRef = useRef(0);
  const sourceAuditionAnimationRef = useRef<number | null>(null);
  const sourceAuditionModeRef = useRef<CanonicalSourceAuditionMode | null>(null);

  return {
    audioPreviewRef,
    selectionLoopPreviewCtxRef,
    selectionLoopPreviewSourceRef,
    selectionLoopPreviewGainRef,
    selectionLoopPreviewStartTimeRef,
    selectionLoopPreviewDurationRef,
    selectionLoopPreviewAnimationRef,
    sourceAuditionCtxRef,
    sourceAuditionSourceRef,
    sourceAuditionGainRef,
    sourceAuditionStartTimeRef,
    sourceAuditionDurationRef,
    sourceAuditionAnimationRef,
    sourceAuditionModeRef,
  };
}
