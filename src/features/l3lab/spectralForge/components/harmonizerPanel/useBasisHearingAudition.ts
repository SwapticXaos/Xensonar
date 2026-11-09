import { donorHearingRuntime } from '../../donorV2/donorHearingRuntime';
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import {
  applyCarrierIntegralSelectionPatch,
  normalizeCarrierIntegralHarmonicXplorePatch,
  type CarrierIntegralMachineId,
} from '../../integral';
import { useStore } from '../../state/store';
import {
  playSpectralForgeBasisHearingPreview,
  prewarmSpectralForgeBasisHearingPreview,
  type SpectralForgeBasisHearingPrewarmResult,
} from '../transportBar/spectralForgeBasisHearingPreview';
import { createSpectralForgePreviewRequest, type SpectralForgePreviewRequest } from '../previewSession/spectralForgePreviewSessionTypes';
import { buildSpectralForgeTransportPreviewRequestKey } from '../previewSession/spectralForgePreviewRequestKey';
import { useSpectralForgePreviewSession, type SpectralForgePreviewSessionDriver } from '../previewSession/useSpectralForgePreviewSession';
import {
  buildBasisHearingStableRequestKey,
  createBasisHearingPreparedEntry,
  type BasisHearingPreparedEntry,
} from './basisHearingPreviewCache';
import {
  resolveBasisHearingAuditionUi,
  type BasisHearingAuditionUiState,
} from './basisHearingAuditionUi';
import type { SpectralForgeBasisHearingOption } from './spectralForgeBasisHearingModes';

export type BasisHearingOptionUi = ReturnType<typeof resolveBasisHearingAuditionUi>;


type BasisHearingCoupledSessionUpdate =
  | { type: 'progress'; progress: number }
  | { type: 'ready'; cacheHit: boolean }
  | { type: 'playing' }
  | { type: 'play-ended' }
  | { type: 'error'; message: string };

function updateBasisHearingAndSession(args: {
  previewSessionDriver: SpectralForgePreviewSessionDriver;
  previewRequest: SpectralForgePreviewRequest;
  setBasisHearingAudition: Dispatch<SetStateAction<BasisHearingAuditionUiState>>;
  ui: SetStateAction<BasisHearingAuditionUiState>;
  session: BasisHearingCoupledSessionUpdate;
}): void {
  switch (args.session.type) {
    case 'progress':
      args.previewSessionDriver.reportProgress(args.previewRequest, args.session.progress);
      break;
    case 'ready':
      args.previewSessionDriver.markReady(args.previewRequest, args.session.cacheHit);
      break;
    case 'playing':
      args.previewSessionDriver.markPlaying(args.previewRequest);
      break;
    case 'play-ended':
      args.previewSessionDriver.markPlayEnded(args.previewRequest);
      break;
    case 'error':
      args.previewSessionDriver.markError(args.previewRequest, args.session.message);
      break;
    default:
      break;
  }
  args.setBasisHearingAudition(args.ui);
}

export type UseBasisHearingAuditionResult = {
  cancelPendingAudition: (stopAudio?: boolean) => void;
  selectedHearingMachine: CarrierIntegralMachineId;
  selectAndPreviewHearingOption: (option: SpectralForgeBasisHearingOption) => void;
  resolveOptionUi: (option: SpectralForgeBasisHearingOption) => BasisHearingOptionUi;
};

export function useBasisHearingAudition(): UseBasisHearingAuditionResult {
  const carrierIntegralSelection = useStore(s => s.carrierIntegralSelection);
  const setCarrierIntegralSelection = useStore(s => s.setCarrierIntegralSelection);
  const carrierIntegralSynthLab = useStore(s => s.carrierIntegralSynthLab);
  const carrierIntegralHarmonicXplore = useStore(s => s.carrierIntegralHarmonicXplore);
  const setCarrierIntegralHarmonicXplore = useStore(s => s.setCarrierIntegralHarmonicXplore);
  const materialExport = useStore(s => s.materialExport);
  const renderVersion = useStore(s => s.renderVersion);
  const synthMode = useStore(s => s.synthMode);
  const waveformMix = useStore(s => s.waveformMix);
  const setBasisHearingTransportBridge = useStore(s => s.setBasisHearingTransportBridge);
  const createProjectSnapshot = useStore(s => s.createProjectSnapshot);
  const setIsPlaying = useStore(s => s.setIsPlaying);
  const setPlayheadPosition = useStore(s => s.setPlayheadPosition);
  const setShowPlayheadMarker = useStore(s => s.setShowPlayheadMarker);

  const [basisHearingChosenOptionId, setBasisHearingChosenOptionId] = useState<string | null>(null);
  const [basisHearingAudition, setBasisHearingAudition] = useState<BasisHearingAuditionUiState>({
    optionId: null,
    phase: 'idle',
    progress: 0,
    cacheHit: null,
  });

  const previewSession = useSpectralForgePreviewSession<
    BasisHearingPreparedEntry,
    SpectralForgeBasisHearingPrewarmResult
  >();
  const {
    beginGeneration,
    getOrStartInflight,
    getPreparedEntry,
    isCurrentGeneration,
    previewSessionDriver,
    rememberPreparedEntry,
  } = previewSession;

  const selectedHearingMachine = carrierIntegralSelection.machineId;

  const selectAndPreviewHearingOption = useCallback((option: SpectralForgeBasisHearingOption) => {
    donorHearingRuntime.selectCarrier();
    const generation = beginGeneration();
    const harmonicXplorePatch = option.harmonicXploreProfileId
      ? {
          profileId: option.harmonicXploreProfileId,
          source: 'user' as const,
        }
      : null;
    const nextHarmonicXplore = harmonicXplorePatch
      ? normalizeCarrierIntegralHarmonicXplorePatch(carrierIntegralHarmonicXplore, harmonicXplorePatch)
      : carrierIntegralHarmonicXplore;
    const selection = applyCarrierIntegralSelectionPatch(carrierIntegralSelection, {
      machineId: option.machineId,
      source: 'user',
    });
    const snapshotBase = createProjectSnapshot();
    const snapshot = {
      ...snapshotBase,
      carrierIntegralSelection: selection,
      carrierIntegralSynthLab,
      carrierIntegralHarmonicXplore: nextHarmonicXplore,
    };
    const request = {
      snapshot,
      machineId: option.machineId,
      selection,
      synthLab: carrierIntegralSynthLab,
      harmonicXplore: nextHarmonicXplore,
      previewBpm: materialExport.bpm,
      previewGain: 1,
      previewPitchSemitones: 0,
      loopPreview: !!materialExport.loopPreview,
    };
    const stableRequestKey = buildBasisHearingStableRequestKey({
      option,
      snapshot,
      selection,
      synthLab: carrierIntegralSynthLab,
      harmonicXplore: nextHarmonicXplore,
      previewBpm: materialExport.bpm,
      previewGain: 1,
      previewPitchSemitones: 0,
    });
    const transportRequestKey = buildSpectralForgeTransportPreviewRequestKey({
      routeKind: 'basis-hearing',
      renderVersion,
      synthMode,
      waveformMix,
      machineId: option.machineId,
      carrierIntegralSource: selection.source,
      carrierIntegralPreset: selection.presetId,
      carrierIntegralBodySource: selection.bodySourceMode,
      carrierIntegralParams: selection.paramsPatch,
      synthLab: carrierIntegralSynthLab,
      harmonicXplore: nextHarmonicXplore,
      bars: materialExport.bars,
      bpm: materialExport.bpm,
    });
    const preparedEntry = getPreparedEntry(stableRequestKey);
    const previewRequest = createSpectralForgePreviewRequest({
      identity: { requestKey: stableRequestKey, routeKind: 'basis-hearing' },
      reason: preparedEntry ? 'prepared-cache-reuse' : 'basis-hearing-click',
      loopPreview: request.loopPreview,
    });
    previewSessionDriver.schedule(previewRequest);

    setBasisHearingChosenOptionId(option.id);
    if (harmonicXplorePatch) {
      setCarrierIntegralHarmonicXplore(harmonicXplorePatch);
    }
    setCarrierIntegralSelection({ machineId: option.machineId, source: 'user' });
    audioEngine.stop();
    setIsPlaying(false);
    setShowPlayheadMarker(false);
    setPlayheadPosition(0);
    setBasisHearingAudition({
      optionId: option.id,
      phase: preparedEntry ? 'ready' : 'preparing',
      progress: preparedEntry ? 1 : 0.035,
      cacheHit: preparedEntry ? true : null,
    });
    setBasisHearingTransportBridge({
      requestKey: transportRequestKey,
      optionId: option.id,
      machineId: option.machineId,
      phase: preparedEntry ? 'ready' : 'preparing',
      progress: preparedEntry ? 1 : 0.035,
      loopPreview: request.loopPreview,
      updatedAt: Date.now(),
    });

    const isCurrentAudition = () => isCurrentGeneration(generation) && previewSessionDriver.isCurrentRequest(previewRequest);

    const playPrepared = (cacheHit: boolean | null) => {
      if (!isCurrentAudition()) return Promise.resolve({
        played: false,
        reason: 'basis hearing request is stale before playback start',
        machineId: option.machineId,
        cacheHit: cacheHit ?? undefined,
      });
      setIsPlaying(true);
      setShowPlayheadMarker(true);
      setPlayheadPosition(0);
      setBasisHearingTransportBridge({
        requestKey: transportRequestKey,
        optionId: option.id,
        machineId: option.machineId,
        phase: 'playing',
        progress: 1,
        loopPreview: request.loopPreview,
        updatedAt: Date.now(),
      });
      updateBasisHearingAndSession({
        previewSessionDriver,
        previewRequest,
        setBasisHearingAudition,
        session: { type: 'playing' },
        ui: { optionId: option.id, phase: 'playing', progress: 1, cacheHit: cacheHit ?? true },
      });
      return playSpectralForgeBasisHearingPreview({
        ...request,
        onAudioPosition: (pos: number) => {
          if (!isCurrentAudition()) return;
          setPlayheadPosition(pos);
        },
        onAudioEnd: () => {
          if (!isCurrentAudition()) return;
          setIsPlaying(false);
          setShowPlayheadMarker(false);
          setPlayheadPosition(0);
          setBasisHearingTransportBridge({
            requestKey: transportRequestKey,
            optionId: option.id,
            machineId: option.machineId,
            phase: 'ready',
            progress: 1,
            loopPreview: request.loopPreview,
            updatedAt: Date.now(),
          });
          updateBasisHearingAndSession({
            previewSessionDriver,
            previewRequest,
            setBasisHearingAudition,
            session: { type: 'play-ended' },
            ui: { optionId: option.id, phase: 'ready', progress: 1, cacheHit: true },
          });
        },
      }).then((result) => ({ ...result, cacheHit: result.cacheHit ?? cacheHit ?? undefined }));
    };

    const getPrewarmPromise = () => getOrStartInflight(
      stableRequestKey,
      () => prewarmSpectralForgeBasisHearingPreview({
        ...request,
        onRenderProgress: (progress: number) => {
          if (!isCurrentAudition()) return;
          const safeProgress = Math.max(0.035, Math.min(1, progress));
          updateBasisHearingAndSession({
            previewSessionDriver,
            previewRequest,
            setBasisHearingAudition,
            session: { type: 'progress', progress: safeProgress },
            ui: (current) => current.optionId === option.id
              ? { ...current, phase: 'preparing', progress: safeProgress }
              : current,
          });
          setBasisHearingTransportBridge({
            requestKey: transportRequestKey,
            optionId: option.id,
            machineId: option.machineId,
            phase: 'preparing',
            progress: safeProgress,
            loopPreview: request.loopPreview,
            updatedAt: Date.now(),
          });
        },
      }).then((prewarmResult) => {
        rememberPreparedEntry(stableRequestKey, createBasisHearingPreparedEntry(prewarmResult));
        return prewarmResult;
      }),
      () => {
        previewSessionDriver.beginPrewarm(previewRequest);
      },
    );

    const prewarmOrReuse = preparedEntry
      ? Promise.resolve<SpectralForgeBasisHearingPrewarmResult>({
          warmed: true,
          cacheHit: true,
          cacheKey: preparedEntry.cacheKey,
          rendered: false,
          reason: 'Basis-Hearing prepared cache reused',
          machineId: option.machineId,
        })
      : getPrewarmPromise();

    void prewarmOrReuse.then((prewarmResult) => {
      if (!isCurrentAudition()) return null;
      rememberPreparedEntry(stableRequestKey, createBasisHearingPreparedEntry(prewarmResult));
      updateBasisHearingAndSession({
        previewSessionDriver,
        previewRequest,
        setBasisHearingAudition,
        session: { type: 'ready', cacheHit: prewarmResult.cacheHit || Boolean(preparedEntry) },
        ui: { optionId: option.id, phase: 'ready', progress: 1, cacheHit: prewarmResult.cacheHit || Boolean(preparedEntry) },
      });
      setBasisHearingTransportBridge({
        requestKey: transportRequestKey,
        optionId: option.id,
        machineId: option.machineId,
        phase: 'ready',
        progress: 1,
        loopPreview: request.loopPreview,
        updatedAt: Date.now(),
      });
      if (!previewSessionDriver.canPlay(previewRequest)) return null;
      return playPrepared(prewarmResult.cacheHit || Boolean(preparedEntry));
    }).then((result) => {
      if (!result || !isCurrentAudition()) return;
      if (!result.played) {
        setIsPlaying(false);
        setShowPlayheadMarker(false);
        setPlayheadPosition(0);
        updateBasisHearingAndSession({
          previewSessionDriver,
          previewRequest,
          setBasisHearingAudition,
          session: { type: 'error', message: result.reason || 'basis hearing preview did not play' },
          ui: { optionId: option.id, phase: 'error', progress: 0, cacheHit: result.cacheHit ?? null },
        });
        setBasisHearingTransportBridge({
          requestKey: transportRequestKey,
          optionId: option.id,
          machineId: option.machineId,
          phase: 'error',
          progress: 0,
          loopPreview: request.loopPreview,
          updatedAt: Date.now(),
        });
        return;
      }
      setIsPlaying(true);
      setShowPlayheadMarker(true);
      setBasisHearingTransportBridge({
        requestKey: transportRequestKey,
        optionId: option.id,
        machineId: option.machineId,
        phase: 'playing',
        progress: 1,
        loopPreview: request.loopPreview,
        updatedAt: Date.now(),
      });
      updateBasisHearingAndSession({
        previewSessionDriver,
        previewRequest,
        setBasisHearingAudition,
        session: { type: 'playing' },
        ui: { optionId: option.id, phase: 'playing', progress: 1, cacheHit: result.cacheHit ?? true },
      });
    }).catch((error) => {
      if (!isCurrentAudition()) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error('[xensonar][spectralforge][basis-hearing-preview]', error);
      setIsPlaying(false);
      setShowPlayheadMarker(false);
      setPlayheadPosition(0);
      updateBasisHearingAndSession({
        previewSessionDriver,
        previewRequest,
        setBasisHearingAudition,
        session: { type: 'error', message },
        ui: { optionId: option.id, phase: 'error', progress: 0, cacheHit: null },
      });
      setBasisHearingTransportBridge({
        requestKey: transportRequestKey,
        optionId: option.id,
        machineId: option.machineId,
        phase: 'error',
        progress: 0,
        loopPreview: request.loopPreview,
        updatedAt: Date.now(),
      });
    });
  }, [
    carrierIntegralHarmonicXplore,
    carrierIntegralSelection,
    carrierIntegralSynthLab,
    createProjectSnapshot,
    beginGeneration,
    getOrStartInflight,
    getPreparedEntry,
    isCurrentGeneration,
    materialExport.bars,
    materialExport.bpm,
    materialExport.loopPreview,
    renderVersion,
    synthMode,
    waveformMix,
    previewSessionDriver,
    rememberPreparedEntry,
    setCarrierIntegralHarmonicXplore,
    setCarrierIntegralSelection,
    setBasisHearingTransportBridge,
    setIsPlaying,
    setPlayheadPosition,
    setShowPlayheadMarker,
  ]);

  const resolveOptionUi = useCallback((option: SpectralForgeBasisHearingOption) => {
    const activeBySelection = selectedHearingMachine === option.machineId &&
      (!option.harmonicXploreProfileId || carrierIntegralHarmonicXplore.profileId === option.harmonicXploreProfileId);
    return resolveBasisHearingAuditionUi({
      optionId: option.id,
      activeBySelection,
      chosenOptionId: basisHearingChosenOptionId,
      audition: basisHearingAudition,
    });
  }, [
    basisHearingAudition,
    basisHearingChosenOptionId,
    carrierIntegralHarmonicXplore.profileId,
    selectedHearingMachine,
  ]);

  const cancelPendingAudition = useCallback((stopAudio = true) => {
    beginGeneration();
    if (stopAudio) audioEngine.stop();
    setBasisHearingChosenOptionId(null);
    setBasisHearingAudition({ optionId: null, phase: 'idle', progress: 0, cacheHit: null });
    setIsPlaying(false);
  }, [beginGeneration, setIsPlaying]);

  return {
    cancelPendingAudition,
    selectedHearingMachine,
    selectAndPreviewHearingOption,
    resolveOptionUi,
  };
}
