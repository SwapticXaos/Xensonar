import { reportXensonarPromiseFailure } from '@/features/xensonar/diagnostics/runtimeIssueReporter';
import type { Dispatch,SetStateAction } from 'react';
import { buildForgeExportContext,exportThroughForgeAdapter } from '../forgeBridge';
import { CANONICAL_INTAKE_COMMIT_EVENT,CANONICAL_INTAKE_RAW_SEND_EVENT } from '../materialIntake/adapters/target/canonicalForgeTargetAdapter';
import type { CommittedLoopPayload } from '../materialIntake/types';
import { registerExternalMaterialPackage } from '../materialLibrary';
import {
MELODIC_SAMPLE_FROM_BLOB_EVENT,
MELODIC_SAMPLE_FROM_RAW_SELECTION_EVENT,
completeMelodicSampleRequest,
type MelodicSampleBlobPayload,
type MelodicSampleRawSelectionPayload,
} from '../melodicSampleBridge';
import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import { buildDefaultGuideMarkers,clampBars,clampGuideSegments } from '../spectralForge/state/storeMaterialExport';
import type { CanonicalSourceView } from './analysis';
import { stopAllForge2Preview as stopAllForge2PreviewAction } from './forgePlaybackActions';
import { buildTransferBlob,type DestructiveAudioProfile,type SynthMode,type TransferMode,type WarpAudioProfile,type WaveformMix } from './selectionAudioTransfer';
import type { CanonicalForgeWorkspace } from './sessionTypes';
import { sanitizeName } from './spectralWorkspaceUtils';

export type SourcePreviewMode = 'forge' | 'sourceWindow' | 'sourceFull';

type MaterialExportConfigLike = {
  name: string;
  adapterId: string;
  bpm: number;
  bars: number;
  guideSegments: number;
  guideMarkers: number[];
};

type LastAutoCorrectLike = {
  bpm: number;
  confidence: number;
  startSec: number;
  durationSec: number;
  bars: number;
  candidates: Array<{ bars: number; durationSec: number; fitScore: number }>;
} | null;

export function registerCanonicalIntakeEventBridge(args: {
  materialExport: MaterialExportConfigLike;
  spectralData: any;
  synthMode: SynthMode;
  waveformMix: WaveformMix;
  sourceView: CanonicalSourceView;
  activeWorkspace: CanonicalForgeWorkspace;
  destructiveAudioProfile: DestructiveAudioProfile;
  warpAudioProfile: WarpAudioProfile;
  activeHandoffProfile: any;
  canonicalProducer: any;
  applySelection: (source: AudioSourceAsset, startSec: number, durationSec: number, status?: string, options?: { preserveDetailSelection?: boolean; resetDetailViewport?: boolean }) => Promise<void>;
  createTransferMetadata: (args: {
    materialExport: MaterialExportConfigLike;
    transfer: { sourceVersion: string; renderMode: string };
    selectionDurationSec: number;
    activeWorkspace: CanonicalForgeWorkspace;
    activeHandoffProfile: any;
    effectiveTransferMode: TransferMode;
    stableId?: string;
    projectLabel?: string;
  }) => any;
  registerMelodicSampleFromBlob: (blob: Blob, name: string, options?: { assignToSelectedTrack?: boolean; successStatus?: string; failureStatus?: string }) => Promise<{ id: string; name: string }>;
  setPendingImageImport: Dispatch<SetStateAction<any>>;
  setRawSourceAsset: Dispatch<SetStateAction<AudioSourceAsset | null>>;
  setMaterialExport: Dispatch<SetStateAction<MaterialExportConfigLike>>;
  setLastAutoCorrect: Dispatch<SetStateAction<LastAutoCorrectLike>>;
  setDetailSelectionStartSec: Dispatch<SetStateAction<number>>;
  setDetailSelectionDurationSec: Dispatch<SetStateAction<number>>;
  setDetailSelectionDirty: Dispatch<SetStateAction<boolean>>;
  setDetailViewportStartSec: Dispatch<SetStateAction<number>>;
  setDetailViewportDurationSec: Dispatch<SetStateAction<number>>;
  setSourcePreviewMode: Dispatch<SetStateAction<SourcePreviewMode>>;
  setStatus: (status: string) => void;
  setBusy: Dispatch<SetStateAction<boolean>>;
}) {
  const handleSharedCommit = (event: Event) => {
    const payload = (event as CustomEvent<CommittedLoopPayload>).detail;
    if (!payload?.source?.sourceAsset) return;
    void (async () => {
      stopAllForge2PreviewAction({ actions: { stopPreviewAudio: () => undefined, stopSelectionLoopPreview: () => undefined, setIsPlaying: () => undefined, setPlayheadPosition: () => undefined, setClipPreviewStep: () => undefined, setStatus: args.setStatus }, statusMessage: 'Gemeinsame Materialschleuse übernimmt neuen Loop ...' });
      const nextBars = clampBars(args.materialExport.bars);
      const nextGuideSegments = clampGuideSegments(nextBars);
      args.setPendingImageImport(null);
      args.setRawSourceAsset(payload.source.sourceAsset);
      args.setMaterialExport((state) => ({
        ...state,
        name: sanitizeName(payload.source.label.replace(/\.[^.]+$/, '')),
        bpm: state.bpm,
        bars: nextBars,
        guideSegments: nextGuideSegments,
        guideMarkers: buildDefaultGuideMarkers(nextGuideSegments),
      }));
      args.setLastAutoCorrect(payload.repairResult ? {
        bpm: payload.repairResult.primary.bpm,
        confidence: payload.repairResult.primary.confidence,
        startSec: payload.repairResult.primary.startSec,
        durationSec: payload.repairResult.primary.durationSec,
        bars: payload.repairResult.primary.bars,
        candidates: payload.repairResult.candidates.map((candidate) => ({
          bars: candidate.bars,
          durationSec: candidate.durationSec,
          fitScore: candidate.fitScore ?? candidate.confidence,
        })),
      } : null);
      args.setDetailSelectionStartSec(payload.selection.fineLoopRange.startSec);
      args.setDetailSelectionDurationSec(payload.selection.fineLoopRange.durationSec);
      args.setDetailSelectionDirty(true);
      args.setDetailViewportStartSec(payload.selection.detailViewport.startSec);
      args.setDetailViewportDurationSec(payload.selection.detailViewport.durationSec);
      args.setSourcePreviewMode('sourceWindow');
      await args.applySelection(
        payload.source.sourceAsset,
        payload.selection.fineLoopRange.startSec,
        payload.selection.fineLoopRange.durationSec,
        payload.repairResult ? 'autocorrect' : 'manual',
        { preserveDetailSelection: true, resetDetailViewport: false },
      );
      args.setStatus('Der gemeinsame Intake-Block hat den Loop in SyntheticForge übernommen.');
    })();
  };

  const handleSharedRawSend = (event: Event) => {
    const payload = (event as CustomEvent<CommittedLoopPayload>).detail;
    if (!payload?.source?.sourceAsset) return;
    void (async () => {
      const nextBars = clampBars(args.materialExport.bars);
      const nextGuideSegments = clampGuideSegments(nextBars);
      const nextExport = {
        ...args.materialExport,
        name: sanitizeName(payload.source.label.replace(/\.[^.]+$/, '')),
        bpm: args.materialExport.bpm,
        bars: nextBars,
        guideSegments: nextGuideSegments,
        guideMarkers: buildDefaultGuideMarkers(nextGuideSegments),
      };
      args.setBusy(true);
      args.setStatus('Gemeinsame Materialschleuse sendet Rohloop an Xensonar ...');
      try {
        const transfer = await buildTransferBlob({
          transferMode: 'source-direct',
          spectralData: args.spectralData,
          synthMode: args.synthMode,
          waveformMix: args.waveformMix,
          rawSourceAsset: payload.source.sourceAsset,
          selectionStartSec: payload.selection.fineLoopRange.startSec,
          selectionDurationSec: payload.selection.fineLoopRange.durationSec,
          sourceView: args.sourceView,
          activeWorkspace: args.activeWorkspace,
          destructiveProfile: args.destructiveAudioProfile,
          warpProfile: args.warpAudioProfile,
        });
        const metadata = args.createTransferMetadata({
          materialExport: nextExport,
          transfer,
          selectionDurationSec: payload.selection.fineLoopRange.durationSec,
          activeWorkspace: args.activeWorkspace,
          activeHandoffProfile: args.activeHandoffProfile,
          effectiveTransferMode: 'source-direct',
        });
        const pkg = exportThroughForgeAdapter(nextExport.adapterId, buildForgeExportContext(metadata, transfer.blob, args.canonicalProducer));
        registerExternalMaterialPackage(pkg);
        args.setStatus('Der Rohloop aus der gemeinsamen Materialschleuse wurde an Xensonar gesendet.');
      } catch (error) {
        reportXensonarPromiseFailure('material', 'canonical-intake-raw-send', error);
        args.setStatus('Rohsendung aus der gemeinsamen Materialschleuse fehlgeschlagen.');
      } finally {
        args.setBusy(false);
      }
    })();
  };

  const handleRawSelectionAsMelodicSample = (event: Event) => {
    const payload = (event as CustomEvent<MelodicSampleRawSelectionPayload>).detail;
    if (!payload?.source?.sourceAsset || !payload?.selection) return;
    void (async () => {
      const requestId = payload.requestId;
      const sampleDuration = payload.selection.fineLoopRange.durationSec;
      if (sampleDuration > 5.001) {
        const message = `Roh-Sample für Melodic Loop ist auf 5,0s begrenzt · aktuell ${sampleDuration.toFixed(2)}s.`;
        args.setStatus(message);
        if (requestId) completeMelodicSampleRequest({ requestId, ok: false, error: message });
        return;
      }
      const transfer = await buildTransferBlob({
        transferMode: 'source-direct',
        spectralData: args.spectralData,
        synthMode: args.synthMode,
        waveformMix: args.waveformMix,
        rawSourceAsset: payload.source.sourceAsset,
        selectionStartSec: payload.selection.fineLoopRange.startSec,
        selectionDurationSec: payload.selection.fineLoopRange.durationSec,
        sourceView: args.sourceView,
        activeWorkspace: args.activeWorkspace,
        destructiveProfile: args.destructiveAudioProfile,
        warpProfile: args.warpAudioProfile,
      });
      const sourceName = sanitizeName(payload.source.label.replace(/\.[^.]+$/, ''));
      const startLabel = Math.max(0, payload.selection.fineLoopRange.startSec).toFixed(2).replace('.', '-');
      const endLabel = Math.max(payload.selection.fineLoopRange.startSec + payload.selection.fineLoopRange.durationSec, 0).toFixed(2).replace('.', '-');
      const sampleName = `${sourceName || 'roh-sample'} ${startLabel}-${endLabel}.wav`;
      const saved = await args.registerMelodicSampleFromBlob(transfer.blob, sampleName, {
        successStatus: `${sampleName} als Roh-Sample in Melodic Loop abgelegt.`,
        failureStatus: 'Roh-Sample für Melodic Loop fehlgeschlagen.',
      });
      if (requestId) completeMelodicSampleRequest({ requestId, ok: true, sampleId: saved.id, name: saved.name });
    })().catch((error) => {
      reportXensonarPromiseFailure('samples', 'canonical-raw-selection-to-melodic-sample', error);
      const message = 'Roh-Sample für Melodic Loop fehlgeschlagen.';
      args.setStatus(message);
      if (payload.requestId) completeMelodicSampleRequest({ requestId: payload.requestId, ok: false, error: message });
    });
  };

  const handleBlobAsMelodicSample = (event: Event) => {
    const payload = (event as CustomEvent<MelodicSampleBlobPayload>).detail;
    if (!payload?.blob) return;
    void args.registerMelodicSampleFromBlob(payload.blob, payload.name || 'sample.wav', {
      successStatus: `${payload.name || 'Sample'} in Melodic Loop abgelegt.`,
      failureStatus: 'Sample-Übernahme für Melodic Loop fehlgeschlagen.',
    }).then((saved) => {
      if (payload.requestId) completeMelodicSampleRequest({ requestId: payload.requestId, ok: true, sampleId: saved.id, name: saved.name });
    }).catch((error) => {
      reportXensonarPromiseFailure('samples', 'canonical-blob-to-melodic-sample', error);
      if (payload.requestId) completeMelodicSampleRequest({ requestId: payload.requestId, ok: false, error: 'Sample-Übernahme für Melodic Loop fehlgeschlagen.' });
    });
  };

  window.addEventListener(CANONICAL_INTAKE_COMMIT_EVENT, handleSharedCommit as EventListener);
  window.addEventListener(CANONICAL_INTAKE_RAW_SEND_EVENT, handleSharedRawSend as EventListener);
  window.addEventListener(MELODIC_SAMPLE_FROM_RAW_SELECTION_EVENT, handleRawSelectionAsMelodicSample as EventListener);
  window.addEventListener(MELODIC_SAMPLE_FROM_BLOB_EVENT, handleBlobAsMelodicSample as EventListener);
  return () => {
    window.removeEventListener(CANONICAL_INTAKE_COMMIT_EVENT, handleSharedCommit as EventListener);
    window.removeEventListener(CANONICAL_INTAKE_RAW_SEND_EVENT, handleSharedRawSend as EventListener);
    window.removeEventListener(MELODIC_SAMPLE_FROM_RAW_SELECTION_EVENT, handleRawSelectionAsMelodicSample as EventListener);
    window.removeEventListener(MELODIC_SAMPLE_FROM_BLOB_EVENT, handleBlobAsMelodicSample as EventListener);
  };
}
