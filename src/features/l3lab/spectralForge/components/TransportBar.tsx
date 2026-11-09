import { donorHearingRuntime, useDonorHearingRuntime } from '../donorV2/donorHearingRuntime';
import { playSelectedDonorHearing } from '../donorV2/donorHearingPlayback';
import * as React from "react";
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  useStore,
  type ForgeProjectSnapshot,
} from "../state/store";
import { audioEngine } from "../audio/AudioEngine";
import { getForge3BodyField } from "../../forge3/bodyField";
import {
  prepareAudioSourceAsset,
  importAudioSourceToSpectralData,
  retargetAudioSourceAsset,
  attachAnalysisCacheToSourceAsset,
} from "../audio/AudioImporter";
import { consumeForgeAudioHandoff } from "../../forgeAudioHandoff";
import { buildBodyFromForgeMainPath } from "../body/mediatedAudioBodyFactory";
import {
  getForge3BodyUiLabel,
  isForge3BodyActive,
} from "../forge3/bodyFieldDomain";
import type { Forge3AudioMode } from "../types/spectralForgeUiTypes";
import { GLOBAL_UNDO_DOMAIN } from "../model/forge3Layers";
import { playSpectralForgeBasisHearingPreview, prewarmSpectralForgeBasisHearingPreview } from "./transportBar/spectralForgeBasisHearingPreview";
import { createSpectralForgePreviewRequest, type SpectralForgePreviewRequest } from "./previewSession/spectralForgePreviewSessionTypes";
import { previewRouteWaitingLabel } from "./previewSession/spectralForgePreviewRoute";
import { isTransportPreviewPrepared, resolveSpectralForgeTransportReadyGate } from "./previewSession/spectralForgeTransportReadyGate";
import {
  buildSpectralForgeTransportPrewarmInputSnapshot,
  deriveSpectralForgeTransportPreview,
} from "./previewSession/spectralForgeTransportPreviewDerivation";
import { resolveBasisHearingPlaybackStatus, resolveSpectralForgeTransportPlaybackGate } from "./previewSession/spectralForgeTransportPlaybackGate";
import { resolveSpectralForgePlaybackCacheStatus, resolveSpectralForgeTransportPrewarmStatus } from "./previewSession/spectralForgeTransportPreviewStatus";
import { useSpectralForgePreviewSession } from "./previewSession/useSpectralForgePreviewSession";
import { useTransportPreviewActivityGate } from "./previewSession/useTransportPreviewActivityGate";
import { useTransportImportWorkflow } from "./transportBar/useTransportImportWorkflow";
import { useTransportMaterialActions } from "./transportBar/useTransportMaterialActions";
import {
  buildForge3TransportBadges,
  formatTransportTime,
  resolveBasisHearingBridgeFill,
  resolveTransportDurationLabel,
  resolveTransportPlayButtonViewModel,
} from "./transportBar/transportBarUiModel";
import { TransportBarPresentation } from "./transportBar/TransportBarPresentation";

interface TransportBarProps {
  variant?: "legacy" | "forge3";
  forge3AudioMode?: Forge3AudioMode;
  onChangeForge3AudioMode?: (mode: Forge3AudioMode) => void;
}

export interface TransportBarHandle {
  openImageImportDialog: () => void;
}

const TransportBar = forwardRef<TransportBarHandle, TransportBarProps>(
  function TransportBar(
    {
      variant = "legacy",
      forge3AudioMode = "classic",
      onChangeForge3AudioMode,
    },
    ref,
  ) {
    const donorHearing = useDonorHearingRuntime();
    const spectralData = useStore((s) => s.spectralData);
    const synthMode = useStore((s) => s.synthMode);
    const waveformMix = useStore((s) => s.waveformMix);
    const isPlaying = useStore((s) => s.isPlaying);
    const setIsPlaying = useStore((s) => s.setIsPlaying);
    const playheadPosition = useStore((s) => s.playheadPosition);
    const setPlayheadPosition = useStore((s) => s.setPlayheadPosition);
    const setShowPlayheadMarker = useStore((s) => s.setShowPlayheadMarker);
    React.useEffect(() => {
      if (!donorHearing.selected) return;
      const playing = donorHearing.phase === 'playing';
      setIsPlaying(playing);
      setShowPlayheadMarker(playing);
      if (!playing) setPlayheadPosition(0);
    }, [donorHearing.selected, donorHearing.phase, setIsPlaying, setShowPlayheadMarker, setPlayheadPosition]);
    const pushUndo = useStore((s) => s.pushUndo);
    const triggerRender = useStore((s) => s.triggerRender);
    const renderVersion = useStore((s) => s.renderVersion);
    const materialExport = useStore((s) => s.materialExport);
    const updateMaterialExport = useStore((s) => s.updateMaterialExport);
    const basisHearingTransportBridge = useStore((s) => s.basisHearingTransportBridge);
    const sourceAsset = useStore((s) => s.sourceAsset);
    const setSourceAsset = useStore((s) => s.setSourceAsset);
    const sourcePreviewMode = useStore((s) => s.sourcePreviewMode);
    const setSourcePreviewMode = useStore((s) => s.setSourcePreviewMode);
    const sourceAssetContext = useStore((s) => s.sourceAssetContext);
    const activeMediatedBody = useStore((s) => s.activeMediatedBody);
    const carrierIntegralSelection = useStore((s) => s.carrierIntegralSelection);
    const carrierIntegralSynthLab = useStore((s) => s.carrierIntegralSynthLab);
    const carrierIntegralHarmonicXplore = useStore((s) => s.carrierIntegralHarmonicXplore);
    const createProjectSnapshot = useStore((s) => s.createProjectSnapshot);

    const previewDerivation = React.useMemo(
      () => deriveSpectralForgeTransportPreview({
        donorSelected: Boolean(donorHearing.selected),
        variant,
        hasSourceAsset: Boolean(sourceAsset),
        sourcePreviewMode,
        carrierIntegralSelection,
        carrierIntegralSynthLab,
        carrierIntegralHarmonicXplore,
        renderVersion,
        synthMode,
        waveformMix,
        materialExport,
      }),
      [
        carrierIntegralHarmonicXplore,
        carrierIntegralSelection,
        carrierIntegralSynthLab,
        donorHearing.selected,
        materialExport.bars,
        materialExport.bpm,
        materialExport.loopPreview,
        renderVersion,
        sourceAsset,
        sourcePreviewMode,
        synthMode,
        variant,
        waveformMix,
      ],
    );
    const {
      previewDurationSec,
      previewPlaybackRate,
      previewRenderRouteKind,
      previewRenderCanAutoAfterPaint,
      previewLoopAppliesToCurrentRoute,
      previewLoopEnabled,
      currentPreviewPreparedToken,
      currentPreviewRequest,
    } = previewDerivation;

    const [workflowBusy, setWorkflowBusy] = useState(false);
    const [workflowProgress, setWorkflowProgress] = useState(0);
    const playbackRenderProgressRef = useRef(0);
    const [statusMessage, setStatusMessage] = useState<string>("");
    const {
      pendingImageImport, pendingAudioImport, fileInputRef, imagePreviewCanvasRef, audioPreviewCanvasRef,
      closeImageImport, closeAudioImport, handleImportFile, handleConfirmAudioImport, handleConfirmImageImport,
      updatePendingImageImport, updatePendingAudioImport,
    } = useTransportImportWorkflow({
      variant, spectralData, isPlaying, setIsPlaying, pushUndo, setSourceAsset, setSourcePreviewMode,
      setPlayheadPosition, setShowPlayheadMarker, triggerRender, setWorkflowBusy, setWorkflowProgress, setStatusMessage,
    });
    const currentTransportPlaybackRequestRef = useRef<SpectralForgePreviewRequest | null>(null);
    const {
      previewSessionDriver,
      getSessionState: getPreviewSessionState,
      transportPrewarmState,
      getTransportPreparedPayload,
      rememberTransportPreparedPayload,
      clearTransportPreparedPayload,
      setTransportPreparedRequestKey,
      setTransportPrewarmRendering,
      setTransportPrewarmProgress,
      isSerialPrewarmInFlight,
      beginTransportSerialPrewarmRun,
      finishTransportSerialPrewarmRun,
      requestTransportSerialPrewarmRerun,
      requestTransportSerialPrewarmRerunIfInFlight,
      hasSerialPrewarmRerun,
      consumeSerialPrewarmRerun,
      beginTransportPrewarmSchedule,
      isCurrentTransportPrewarmSchedule,
      setTransportPrewarmTimer,
      clearTransportPrewarmTimer,
    } = useSpectralForgePreviewSession();
    const preparedPreviewToken = transportPrewarmState.preparedRequestKey;
    const prewarmRendering = transportPrewarmState.prewarmRendering;
    const prewarmProgress = transportPrewarmState.prewarmProgress;
    const currentPreviewPrewarmInput = buildSpectralForgeTransportPrewarmInputSnapshot({
      spectralData,
      synthMode,
      waveformMix,
      preview: previewDerivation,
      carrierIntegralSelection,
      carrierIntegralSynthLab,
      carrierIntegralHarmonicXplore,
      previewBpm: materialExport.bpm,
    });
    const latestPreviewPrewarmInputRef = useRef(currentPreviewPrewarmInput);
    latestPreviewPrewarmInputRef.current = currentPreviewPrewarmInput;
    const { getQuietWindowState } = useTransportPreviewActivityGate();
    useImperativeHandle(
      ref,
      () => ({
        openImageImportDialog: () => {
          if (variant === "forge3") fileInputRef.current?.click();
        },
      }),
      [variant],
    );

    useEffect(() => {
      const pending = consumeForgeAudioHandoff("legacy");
      if (!pending) return;

      let cancelled = false;
      void (async () => {
        setWorkflowBusy(true);
        setWorkflowProgress(0.04);
        setStatusMessage(
          `Lade ${pending.name} aus ${pending.origin} in SpectralForge ...`,
        );
        try {
          const file = new File([pending.blob], pending.fileName, {
            type: pending.blob.type || "audio/wav",
          });
          const source = await prepareAudioSourceAsset(file, (progress) => {
            if (!cancelled) setWorkflowProgress(progress * 0.35);
          });
          const sourceWindow = retargetAudioSourceAsset(source, {
            startSec: 0,
          });
          if (cancelled) return;
          if (isPlaying) {
            audioEngine.stop();
            setIsPlaying(false);
          }
          pushUndo();
          await importAudioSourceToSpectralData(
            sourceWindow,
            spectralData,
            { readMode: "hybrid" },
            (progress) => {
              if (!cancelled) setWorkflowProgress(0.35 + progress * 0.35);
            },
          );
          const enrichedSource = await attachAnalysisCacheToSourceAsset(
            sourceWindow,
            (progress) => {
              if (!cancelled) setWorkflowProgress(0.7 + progress * 0.3);
            },
          );
          if (cancelled) return;
          updateMaterialExport({
            name: pending.name,
            role: pending.role,
            bars: Math.max(1, Math.min(16, pending.bars)),
            bpm: pending.bpm,
          });
          setSourceAsset(enrichedSource, "forge3_main");
          audioEngine.invalidateBuffer();
          triggerRender();
          setPlayheadPosition(0);
          setSourcePreviewMode("sourceWindow");
          setStatusMessage(
            `${pending.name} liegt jetzt als Quelle in SpectralForge.`,
          );
          window.setTimeout(() => setStatusMessage(""), 2600);
        } catch (error) {
          console.error("[xensonar][forge1][handoff]", error);
          if (!cancelled) {
            setStatusMessage(
              "Melodic-Loop-Handoff nach SpectralForge fehlgeschlagen",
            );
            window.setTimeout(() => setStatusMessage(""), 2800);
          }
        } finally {
          if (!cancelled) {
            setWorkflowBusy(false);
            setWorkflowProgress(0);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [
      isPlaying,
      pushUndo,
      setIsPlaying,
      setPlayheadPosition,
      setSourceAsset,
      setSourcePreviewMode,
      spectralData,
      triggerRender,
      updateMaterialExport,
    ]);

    const runSerialAfterPaintPreviewRender = useCallback(() => {
      if (!beginTransportSerialPrewarmRun()) return;
      void (async () => {
        try {
          do {
            consumeSerialPrewarmRerun();
            const input = latestPreviewPrewarmInputRef.current;
            if (input.routeKind === "none") break;
            const inputPreviewRequest = createSpectralForgePreviewRequest({
              identity: { requestKey: input.token, routeKind: input.routeKind },
              reason: 'after-paint-preview',
              loopPreview: previewLoopEnabled,
            });
            const inputStillCurrent = () => {
              const newest = latestPreviewPrewarmInputRef.current;
              return newest.token === input.token && newest.routeKind === input.routeKind;
            };
            if (!previewSessionDriver.beginPrewarm(inputPreviewRequest)) {
              requestTransportSerialPrewarmRerun();
              continue;
            }
            setTransportPreparedRequestKey((current) => current === input.token ? null : current);
            if (input.routeKind !== "basis-hearing") clearTransportPreparedPayload();
            setTransportPrewarmRendering(true);
            setTransportPrewarmProgress(0.035);
            setStatusMessage(resolveSpectralForgeTransportPrewarmStatus({
              routeKind: input.routeKind,
              phase: 'start',
            }));

            // Let React/browser paint the grey render button before the renderer starts.
            // This is not a fake play animation: it is the actual after-paint render
            // lifecycle that will either fill the cache or join an existing inflight render.
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
            await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

            const basisHearingSnapshot = input.routeKind === "basis-hearing"
              ? createProjectSnapshot()
              : null;
            const result = input.routeKind === "basis-hearing"
              ? await prewarmSpectralForgeBasisHearingPreview({
                  snapshot: basisHearingSnapshot!,
                  machineId: input.machineId,
                  selection: input.selection,
                  synthLab: input.synthLab,
                  harmonicXplore: input.harmonicXplore,
                  previewBpm: input.previewBpm,
                  previewGain: 1,
                  previewPitchSemitones: 0,
                  onRenderProgress: (progress: number) => {
                    if (!inputStillCurrent()) return;
                    previewSessionDriver.reportProgress(inputPreviewRequest, progress);
                    setTransportPrewarmProgress(Math.max(0.035, progress));
                  },
                })
              : await audioEngine.prewarmPreviewRender(
                  input.spectralData,
                  input.synthMode,
                  input.waveformMix,
                  (progress: number) => {
                    if (!inputStillCurrent()) return;
                    previewSessionDriver.reportProgress(inputPreviewRequest, progress);
                    setTransportPrewarmProgress(Math.max(0.035, progress));
                  },
                );
            const newestInput = latestPreviewPrewarmInputRef.current;
            const staleCompletion = newestInput.token !== input.token || newestInput.routeKind !== input.routeKind;
            if (staleCompletion) {
              previewSessionDriver.markStale(inputPreviewRequest);
              requestTransportSerialPrewarmRerun();
              setTransportPrewarmRendering(false);
              setTransportPrewarmProgress(0);
              setStatusMessage(resolveSpectralForgeTransportPrewarmStatus({
                routeKind: input.routeKind,
                phase: 'stale',
              }));
              continue;
            }

            const previewPrepared = !("warmed" in result) || result.warmed !== false;
            if (previewPrepared) {
              previewSessionDriver.markReady(
                inputPreviewRequest,
                'cacheHit' in result ? Boolean((result as { cacheHit?: boolean }).cacheHit) : false,
              );
            }
            setTransportPrewarmProgress(previewPrepared ? 1 : 0);
            if (!hasSerialPrewarmRerun()) {
              if (previewPrepared) {
                setTransportPreparedRequestKey(input.token);
                if (input.routeKind === "basis-hearing" && basisHearingSnapshot) {
                  rememberTransportPreparedPayload(input.token, basisHearingSnapshot);
                }
              } else {
                clearTransportPreparedPayload(input.token);
              }
              setStatusMessage(resolveSpectralForgeTransportPrewarmStatus({
                routeKind: input.routeKind,
                phase: previewPrepared ? 'ready' : 'unprepared',
                rendered: Boolean(result.rendered),
              }));
            }

            if (!hasSerialPrewarmRerun()) {
              window.setTimeout(() => {
                if (!isSerialPrewarmInFlight() && !hasSerialPrewarmRerun()) {
                  setStatusMessage('');
                }
              }, 900);
            }
          } while (hasSerialPrewarmRerun());
        } catch (err) {
          previewSessionDriver.markError(
            createSpectralForgePreviewRequest({
              identity: {
                requestKey: latestPreviewPrewarmInputRef.current.token,
                routeKind: latestPreviewPrewarmInputRef.current.routeKind,
              },
              reason: 'after-paint-preview',
              loopPreview: previewLoopEnabled,
            }),
            err instanceof Error ? err.message : String(err),
          );
          console.warn('SpectralForge serial preview render failed:', err);
          setTransportPrewarmProgress(0);
          setStatusMessage(resolveSpectralForgeTransportPrewarmStatus({
            routeKind: latestPreviewPrewarmInputRef.current.routeKind,
            phase: 'failed',
          }));
          window.setTimeout(() => setStatusMessage(''), 1600);
        } finally {
          if (finishTransportSerialPrewarmRun()) {
            window.setTimeout(() => runSerialAfterPaintPreviewRender(), 0);
            return;
          }
          window.setTimeout(() => {
            if (!isSerialPrewarmInFlight() && !hasSerialPrewarmRerun()) {
              setTransportPrewarmRendering(false);
            }
          }, 140);
        }
      })();
    }, [
      consumeSerialPrewarmRerun,
      createProjectSnapshot,
      hasSerialPrewarmRerun,
      isSerialPrewarmInFlight,
      beginTransportSerialPrewarmRun,
      finishTransportSerialPrewarmRun,
      previewLoopEnabled,
      previewSessionDriver,
      requestTransportSerialPrewarmRerun,
    ]);

    useEffect(() => {
      if (!previewRenderCanAutoAfterPaint || isPlaying || workflowBusy) return;
      if (previewRenderRouteKind === "spectral" && renderVersion <= 0) return;
      if (isTransportPreviewPrepared({
        currentRequest: currentPreviewRequest,
        preparedRequestKey: preparedPreviewToken,
      })) {
        const preparedRequest = createSpectralForgePreviewRequest({
          identity: currentPreviewRequest,
          reason: 'transport-prepared-cache-hit',
          loopPreview: previewLoopEnabled,
        });
        previewSessionDriver.schedule(preparedRequest);
        previewSessionDriver.markReady(preparedRequest, true);
        clearTransportPrewarmTimer();
        consumeSerialPrewarmRerun();
        setTransportPrewarmRendering(false);
        setTransportPrewarmProgress(1);
        return;
      }
      clearTransportPreparedPayload();
      clearTransportPrewarmTimer();

      const tokenAtSchedule = beginTransportPrewarmSchedule();
      previewSessionDriver.schedule(createSpectralForgePreviewRequest({
        identity: currentPreviewRequest,
        reason: 'after-paint-preview',
        loopPreview: previewLoopEnabled,
      }));
      setTransportPreparedRequestKey((current) => current === currentPreviewPreparedToken ? null : current);

      requestTransportSerialPrewarmRerunIfInFlight();
      setTransportPrewarmRendering(false);
      setTransportPrewarmProgress(0);
      setStatusMessage(previewRenderRouteKind === "basis-hearing"
        ? 'Hörweise vorgemerkt · wartet auf ruhigen Reglerstand'
        : 'Vorschau vorgemerkt · Rendert nach zwei Sekunden Werkzeug-Ruhe');

      const initialQuietWindow = getQuietWindowState(previewRenderRouteKind);
      const scheduleColdRender = () => {
        if (!isCurrentTransportPrewarmSchedule(tokenAtSchedule)) return;
        if (isPlaying || workflowBusy) return;

        const quietWindow = getQuietWindowState(previewRenderRouteKind);
        if (quietWindow.blocked) {
          setStatusMessage(previewRouteWaitingLabel(previewRenderRouteKind, quietWindow.pointerDown));
          setTransportPrewarmTimer(window.setTimeout(
            scheduleColdRender,
            Math.max(quietWindow.retryDelayMs, quietWindow.remainingQuietMs),
          ));
          return;
        }

        setTransportPrewarmTimer(null);
        runSerialAfterPaintPreviewRender();
      };

      setTransportPrewarmTimer(window.setTimeout(scheduleColdRender, initialQuietWindow.firstDelayMs));

      return () => {
        clearTransportPrewarmTimer();
      };
    }, [
      beginTransportPrewarmSchedule,
      clearTransportPreparedPayload,
      clearTransportPrewarmTimer,
      currentPreviewPreparedToken,
      currentPreviewRequest,
      getQuietWindowState,
      isCurrentTransportPrewarmSchedule,
      isPlaying,
      previewRenderCanAutoAfterPaint,
      previewLoopEnabled,
      previewSessionDriver,
      preparedPreviewToken,
      previewRenderRouteKind,
      renderVersion,
      workflowBusy,
      runSerialAfterPaintPreviewRender,
      setTransportPrewarmTimer,
    ]);

    const getActivePreviewDuration = useCallback(() => {
      if (donorHearingRuntime.getSnapshot().selected) return previewDurationSec;
      if (sourceAsset && sourcePreviewMode === "sourceFull")
        return Math.max(0.05, sourceAsset.originalDuration);
      if (sourceAsset && sourcePreviewMode === "sourceWindow")
        return Math.max(0.05, sourceAsset.importDurationSec);
      return previewDurationSec;
    }, [previewDurationSec, sourceAsset, sourcePreviewMode]);

    const handlePlay = useCallback(async () => {
      if (donorHearingRuntime.getSnapshot().selected) {
        const phase = donorHearingRuntime.getSnapshot().phase;
        if (phase === 'playing' || phase === 'rendering') { donorHearingRuntime.stop(); setIsPlaying(false); setShowPlayheadMarker(false); return; }
        setStatusMessage('Donor wird vorbereitet …');
        try {
          const started = await playSelectedDonorHearing(spectralData, previewDurationSec, {
            loopPreview: previewLoopEnabled,
            onPosition: setPlayheadPosition,
            onEnd: () => { setIsPlaying(false); setShowPlayheadMarker(false); setPlayheadPosition(0); },
          });
          setIsPlaying(started); setShowPlayheadMarker(started);
          setStatusMessage(started ? 'Donor' : '');
        } catch (error) { setStatusMessage(error instanceof Error ? error.message : 'Donor-Vorschau fehlgeschlagen'); }
        return;
      }
      if (isPlaying) {
        audioEngine.stop();
        const activePlaybackRequest = currentTransportPlaybackRequestRef.current;
        if (activePlaybackRequest) {
          previewSessionDriver.markPlayEnded(activePlaybackRequest);
          currentTransportPlaybackRequestRef.current = null;
        }
        setIsPlaying(false);
        setPlayheadPosition(0);
        setShowPlayheadMarker(false);
        return;
      }

      const playFrom = 0;
      const playRequestKey = currentPreviewPreparedToken;
      const playbackGate = resolveSpectralForgeTransportPlaybackGate({
        currentRequest: currentPreviewRequest,
        preparedRequestKey: preparedPreviewToken,
        serialPrewarmInFlight: isSerialPrewarmInFlight(),
      });
      const previewIsPrepared = playbackGate.previewIsPrepared;

      if (!playbackGate.canStartPlayback) {
        setWorkflowBusy(false);
        playbackRenderProgressRef.current = 0;
        setShowPlayheadMarker(false);
        setStatusMessage(playbackGate.blockedStatusMessage ?? 'Vorhören wartet auf automatische Vorbereitung');
        window.setTimeout(() => setStatusMessage(''), 1400);
        return;
      }

      if (previewIsPrepared) {
        consumeSerialPrewarmRerun();
        setTransportPrewarmRendering(false);
        setTransportPrewarmProgress(1);
      }

      const playNeedsRenderFeedback = false;
      const renderFeedbackStartedAt = performance.now();
      setWorkflowBusy(false);
      playbackRenderProgressRef.current = 1;
      setPlayheadPosition(playFrom);

      const playSessionRequest = createSpectralForgePreviewRequest({
        identity: { requestKey: playRequestKey, routeKind: previewRenderRouteKind },
        reason: 'transport-playback',
        loopPreview: previewLoopEnabled,
      });

      const markPlaybackStarted = () => {
        currentTransportPlaybackRequestRef.current = playSessionRequest;
        previewSessionDriver.markPlaying(playSessionRequest);
        setIsPlaying(true);
        setShowPlayheadMarker(true);
      };

      const finish = () => {
        if (currentTransportPlaybackRequestRef.current?.identity.requestKey === playSessionRequest.identity.requestKey) {
          currentTransportPlaybackRequestRef.current = null;
        }
        previewSessionDriver.markPlayEnded(playSessionRequest);
        setIsPlaying(false);
        setPlayheadPosition(0);
        setShowPlayheadMarker(false);
      };

      try {
        if (
          variant === "forge3" &&
          sourceAsset &&
          sourcePreviewMode === "forge"
        ) {
          if (forge3AudioMode === "body") {
            const body =
              activeMediatedBody ??
              buildBodyFromForgeMainPath(
                spectralData,
                getForge3BodyField(),
                sourceAsset,
              );
            await audioEngine.playFromMediatedAudioBody(body, {
              sourceAsset,
              loopDurationSec: previewDurationSec,
              fromPosition: playFrom,
              onPosition: (pos: number) => setPlayheadPosition(pos),
              onEnd: finish,
              renderMode: "body_contract_preview",
            });
          } else {
            await audioEngine.playForge3BodyPreview(
              sourceAsset,
              spectralData,
              getForge3BodyField(),
              previewDurationSec,
              playFrom,
              (pos: number) => setPlayheadPosition(pos),
              finish,
            );
          }
          markPlaybackStarted();
        } else if (sourceAsset && sourcePreviewMode !== "forge") {
          await audioEngine.playSourceAsset(
            sourceAsset,
            sourcePreviewMode === "sourceFull" ? "full" : "window",
            playFrom,
            (pos: number) => setPlayheadPosition(pos),
            finish,
          );
          markPlaybackStarted();
        } else if (carrierIntegralSelection.source !== "default") {
          setStatusMessage(resolveBasisHearingPlaybackStatus({
            previewIsPrepared,
            machineId: String(carrierIntegralSelection.machineId),
          }));
          const preparedSnapshot =
            getTransportPreparedPayload<ForgeProjectSnapshot>(currentPreviewPreparedToken) ??
            createProjectSnapshot();
          markPlaybackStarted();
          const result = await playSpectralForgeBasisHearingPreview({
            snapshot: preparedSnapshot,
            machineId: carrierIntegralSelection.machineId,
            selection: carrierIntegralSelection,
            synthLab: carrierIntegralSynthLab,
            harmonicXplore: carrierIntegralHarmonicXplore,
            previewBpm: materialExport.bpm,
            previewGain: 1,
            previewPitchSemitones: 0,
            loopPreview: previewLoopEnabled,
            onRenderProgress: (progress: number) => playbackRenderProgressRef.current = Math.max(0.035, progress),
            onAudioPosition: (pos: number) => setPlayheadPosition(pos),
            onAudioEnd: finish,
          });
          if (!result.played) {
            setStatusMessage(result.reason || "Hörweise konnte nicht vorgespielt werden");
            finish();
          } else {
            playbackRenderProgressRef.current = 1;
            setTransportPreparedRequestKey(currentPreviewPreparedToken);
            rememberTransportPreparedPayload(currentPreviewPreparedToken, preparedSnapshot);
            window.setTimeout(() => setStatusMessage(""), 2400);
          }
        } else {
          const previewResult = await audioEngine.play(
            spectralData,
            synthMode,
            waveformMix,
            playFrom,
            (pos: number) => setPlayheadPosition(pos),
            finish,
            (progress: number) => playbackRenderProgressRef.current = progress,
            {
              beatGuideAudible: materialExport.beatGuideAudible,
              beatGuideVolume: materialExport.beatGuideVolume,
              bars: materialExport.bars,
              guideSegments: materialExport.guideSegments,
              guideMarkers: materialExport.guideMarkers,
              loopPreview: previewLoopEnabled,
              loopDurationSec: previewDurationSec,
              playbackRate: previewPlaybackRate,
            },
          );
          markPlaybackStarted();
          playbackRenderProgressRef.current = 1;
          setTransportPreparedRequestKey(currentPreviewPreparedToken);
          setStatusMessage(resolveSpectralForgePlaybackCacheStatus({ cacheHit: previewResult.cacheHit }));
          window.setTimeout(() => setStatusMessage(''), 900);
        }
      } catch (err) {
        console.error("Playback error:", err);
        setIsPlaying(false);
      } finally {
        if (playNeedsRenderFeedback) {
          const elapsed = performance.now() - renderFeedbackStartedAt;
          if (elapsed < 140) {
            await new Promise((resolve) => window.setTimeout(resolve, 140 - elapsed));
          }
        }
        setWorkflowBusy(false);
      }
    }, [
      activeMediatedBody,
      carrierIntegralHarmonicXplore,
      carrierIntegralSelection,
      carrierIntegralSynthLab,
      createProjectSnapshot,
      getTransportPreparedPayload,
      currentPreviewPreparedToken,
      currentPreviewRequest,
      forge3AudioMode,
      isPlaying,
      materialExport.bars,
      materialExport.beatGuideAudible,
      materialExport.beatGuideVolume,
      materialExport.bpm,
      materialExport.guideMarkers,
      materialExport.guideSegments,
      preparedPreviewToken,
      previewDurationSec,
      previewLoopEnabled,
      previewPlaybackRate,
      previewRenderRouteKind,
      previewSessionDriver,
      rememberTransportPreparedPayload,
      consumeSerialPrewarmRerun,
      isSerialPrewarmInFlight,
      setIsPlaying,
      setPlayheadPosition,
      setShowPlayheadMarker,
      sourceAsset,
      sourcePreviewMode,
      spectralData,
      synthMode,
      waveformMix,
      variant,
    ]);

    const handleStop = useCallback(() => {
      donorHearingRuntime.stop();
      audioEngine.stop();
      const activePlaybackRequest = currentTransportPlaybackRequestRef.current;
      if (activePlaybackRequest) {
        previewSessionDriver.markPlayEnded(activePlaybackRequest);
        currentTransportPlaybackRequestRef.current = null;
      }
      setIsPlaying(false);
      setPlayheadPosition(0);
      setShowPlayheadMarker(false);
    }, [previewSessionDriver, setIsPlaying, setPlayheadPosition, setShowPlayheadMarker]);

    const {
      handleDownloadCurrentPreview,
      handleSendCurrentPreviewToXensonar,
      handleExport,
    } = useTransportMaterialActions({
      variant,
      forge3AudioMode,
      activeMediatedBody,
      previewDurationSec,
      sourceAsset,
      sourcePreviewMode,
      spectralData,
      synthMode,
      waveformMix,
      materialExport,
      getActivePreviewDuration,
      setWorkflowBusy,
      setWorkflowProgress,
      setStatusMessage,
    });

    const formatActivePreviewTime = (pos: number) =>
      formatTransportTime(pos, getActivePreviewDuration());

    const forge3BodyActive = isForge3BodyActive(sourceAsset, sourcePreviewMode);
    const forge3BodyLabel = getForge3BodyUiLabel(forge3BodyActive);
    const undoBadgeLabel = `Undo: ${GLOBAL_UNDO_DOMAIN === "workbench" ? "Werkbank" : GLOBAL_UNDO_DOMAIN}`;
    const forge3TransportBadges = buildForge3TransportBadges({
      undoBadgeLabel,
      sourceAssetContext,
      forge3BodyActive,
      forge3BodyLabel,
    });
    const basisHearingBridgeFill = resolveBasisHearingBridgeFill({
      routeKind: previewRenderRouteKind,
      bridgeRequestKey: basisHearingTransportBridge.requestKey,
      currentRequestKey: currentPreviewPreparedToken,
      bridgeMachineId: basisHearingTransportBridge.machineId,
      currentMachineId: carrierIntegralSelection.machineId,
      bridgePhase: basisHearingTransportBridge.phase,
      bridgeProgress: basisHearingTransportBridge.progress,
      isPlaying,
    });
    const transportReadyGate = resolveSpectralForgeTransportReadyGate({
      currentRequest: currentPreviewRequest,
      preparedRequestKey: preparedPreviewToken,
      rendering: workflowBusy,
      renderProgress: workflowProgress,
      prewarmRendering,
      prewarmProgress,
      isPlaying,
      sessionState: getPreviewSessionState(),
    });
    const previewReadyForImmediatePlay = transportReadyGate.readyForImmediatePlay;
    const renderFillActive = transportReadyGate.renderFillActive || basisHearingBridgeFill.fillActive;
    const renderFillPercent = basisHearingBridgeFill.fillActive
      ? basisHearingBridgeFill.fillPercent
      : transportReadyGate.renderFillPercent;
    const playButtonView = resolveTransportPlayButtonViewModel({
      renderFillActive,
      renderFillPercent,
      isPlaying,
      rendering: workflowBusy,
      previewReadyForImmediatePlay,
      previewRenderRouteKind,
    });
    const transportDurationLabel = resolveTransportDurationLabel({
      variant,
      hasSourceAsset: !!sourceAsset,
      sourcePreviewMode,
      previewDurationSec,
      sourceOriginalDuration: sourceAsset?.originalDuration,
      sourceImportStartSec: sourceAsset?.importStartSec,
      sourceImportDurationSec: sourceAsset?.importDurationSec,
    });
    const previewBpmInputValue = Number.isFinite(materialExport.bpm)
      ? Math.round(materialExport.bpm)
      : 108;
    const previewBpmDisabled = !!sourceAsset && sourcePreviewMode !== "forge";
    const previewLoopToggleDisabled = !previewLoopAppliesToCurrentRoute;

    return (
      <TransportBarPresentation
        variant={variant}
        forge3AudioMode={forge3AudioMode}
        onChangeForge3AudioMode={onChangeForge3AudioMode}
        fileInputRef={fileInputRef}
        handleImportFile={handleImportFile}
        handlePlay={handlePlay}
        handleStop={handleStop}
        rendering={workflowBusy}
        renderFillActive={renderFillActive}
        renderFillPercent={renderFillPercent}
        donorHearingPhase={donorHearing.phase}
        donorHearingSelected={!!donorHearing.selected}
        playButtonView={playButtonView}
        forge3TransportBadges={forge3TransportBadges}
        handleSendCurrentPreviewToXensonar={handleSendCurrentPreviewToXensonar}
        handleDownloadCurrentPreview={handleDownloadCurrentPreview}
        playheadPosition={playheadPosition}
        setPlayheadPosition={setPlayheadPosition}
        setShowPlayheadMarker={setShowPlayheadMarker}
        previewBpmInputValue={previewBpmInputValue}
        previewBpmDisabled={previewBpmDisabled}
        updateMaterialExport={updateMaterialExport}
        previewLoopToggleDisabled={previewLoopToggleDisabled}
        previewLoopEnabled={previewLoopEnabled}
        sourceAssetPresent={!!sourceAsset}
        sourcePreviewMode={sourcePreviewMode}
        setSourcePreviewMode={setSourcePreviewMode}
        transportDurationLabel={transportDurationLabel}
        formatActivePreviewTime={formatActivePreviewTime}
        statusMessage={statusMessage}
        handleExport={handleExport}
        pendingAudioImport={pendingAudioImport}
        audioPreviewCanvasRef={audioPreviewCanvasRef}
        closeAudioImport={closeAudioImport}
        updatePendingAudioImport={updatePendingAudioImport}
        handleConfirmAudioImport={handleConfirmAudioImport}
        pendingImageImport={pendingImageImport}
        imagePreviewCanvasRef={imagePreviewCanvasRef}
        spectralWidth={spectralData.width}
        spectralHeight={spectralData.height}
        closeImageImport={closeImageImport}
        updatePendingImageImport={updatePendingImageImport}
        handleConfirmImageImport={handleConfirmImageImport}
      />
    );
  },
);

export default TransportBar;
