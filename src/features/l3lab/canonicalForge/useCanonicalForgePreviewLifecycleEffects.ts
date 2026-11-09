import { useEffect } from 'react';
import { reportXensonarPromiseFailure } from '@/features/xensonar/diagnostics/runtimeIssueReporter';

export function useCanonicalForgePreviewLifecycleEffects(args: {
  stopPreviewAudio: () => void;
  stopLoopComposerPreview: () => void;
  stopSelectionLoopPreview: () => void;
  setStatus: (value: string) => void;
  selectionStartSec: number;
  selectionDurationSec: number;
  detailSelectionStartSec: number;
  detailSelectionDurationSec: number;
  detailSelectionDirty: boolean;
  selectionLoopPreviewPlaying: boolean;
  startSelectionLoopPreview: () => Promise<any>;
  auditionView: any;
  auditionBlendAmount: number;
  isPlaying: boolean;
  sourceAuditionModeRef: { current: any };
  startSourceAuditionPreview: (mode: any, playheadPosition: number) => Promise<boolean>;
  playheadPosition: number;
  setIsPlaying: (value: boolean) => void;
  setPlayheadPosition: (value: number) => void;
}) {
  const {
    stopPreviewAudio,
    stopLoopComposerPreview,
    stopSelectionLoopPreview,
    setStatus,
    selectionStartSec,
    selectionDurationSec,
    detailSelectionStartSec,
    detailSelectionDurationSec,
    detailSelectionDirty,
    selectionLoopPreviewPlaying,
    startSelectionLoopPreview,
    auditionView,
    auditionBlendAmount,
    isPlaying,
    sourceAuditionModeRef,
    startSourceAuditionPreview,
    playheadPosition,
    setIsPlaying,
    setPlayheadPosition,
  } = args;

  useEffect(() => {
    return () => {
      stopPreviewAudio();
      stopLoopComposerPreview();
      stopSelectionLoopPreview();
    };
  }, []);

  useEffect(() => {
    if (!selectionLoopPreviewPlaying) return;
    void startSelectionLoopPreview().catch((error) => {
      reportXensonarPromiseFailure('audio', 'canonical-selection-loop-preview-live-mask-restart', error);
      stopSelectionLoopPreview();
      setStatus('Loop-Vorhörer konnte nach Maskenänderung nicht neu gestartet werden.');
    });
  }, [selectionStartSec, selectionDurationSec, detailSelectionStartSec, detailSelectionDurationSec, detailSelectionDirty]);

  useEffect(() => {
    if (!selectionLoopPreviewPlaying) return;
    void startSelectionLoopPreview().catch((error) => {
      reportXensonarPromiseFailure('audio', 'canonical-selection-loop-preview', error);
      setStatus('Auswahl-Loop konnte nicht gestartet werden.');
    });
  }, [auditionView, auditionBlendAmount]);

  useEffect(() => {
    if (!isPlaying || !sourceAuditionModeRef.current) return;
    const currentMode = sourceAuditionModeRef.current;
    void startSourceAuditionPreview(currentMode, playheadPosition)
      .then((started) => {
        if (!started) {
          setIsPlaying(false);
          setPlayheadPosition(0);
        }
      })
      .catch((error) => {
        reportXensonarPromiseFailure('audio', 'canonical-source-audition-preview', error, { currentMode, playheadPosition });
        setIsPlaying(false);
        setPlayheadPosition(0);
        setStatus('Vorhören konnte nicht gestartet werden.');
      });
  }, [auditionView, auditionBlendAmount]);
}
