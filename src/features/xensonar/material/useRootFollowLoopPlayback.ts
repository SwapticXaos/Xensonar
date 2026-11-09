import { prepareRootFollowSynthPlayback } from '../rootFollow/rootFollowSamplePreparation';
import { useEffect, useRef } from "react";
import type { MaterialEntry } from "../../l3lab/materialLibrary";
import {
  getEffectiveMaterialLoopCycleDurationSec,
  getMaterialLoopBarDurationSec,
  type MaterialLoopTimeMode,
} from "./materialLoopMath";
import type { RootFollowBankEntryConfig } from "../rootFollow/rootFollowTypes";
import type {
  RootFollowPlaybackRefs,
  RootFollowDynamicRefs,
} from "../rootFollow/rootFollowRendererTypes";
import type { RootFollowRuntimePolicy } from "../performanceCrisis/performanceCrisisRuntimePolicies";
import { resolveCrisisQuantizedValue } from "../performanceCrisis/crisisQuantizationFallbackPolicy";
import {
  createEmptyRootFollowSessionState,
  resetRootFollowSessionState,
} from "../rootFollow/rootFollowSession";
import { firstRootFollowSliceOnGridAtOrAfter } from "../rootFollow/rootFollowMicroCutSafety";
import { markAudioTrafficEvent } from "../audioTraffic/audioTrafficForensics";
import { scheduleRootFollowMaterialWindow } from "../rootFollow/rootFollowMaterialRenderer";
import { scheduleRootFollowSynthWindow } from "../rootFollow/rootFollowSynthFacade";
import {
  publishRootFollowRuntimeTraffic,
  stopRootFollowPlaybackNodesBoundary,
} from "../rootFollow/rootFollowRuntimeBoundary";
import {
  resolveRootFollowGranularSettings,
  type RootFollowGranularSettings,
} from "../rootFollow/rootFollowGranularSettings";
import {
  buildRootFollowImpulseRasterRenderWindow,
  isRootFollowImpulseRasterAllMuted,
  isRootFollowImpulseRasterBypass,
  normalizeRootFollowImpulseRasterPolicy,
  resolveRootFollowImpulseRasterSlotDecision,
  type RootFollowImpulseRasterClockMode,
} from "../rootFollow/rootFollowImpulseRasterPolicy";
import {
  beginRootFollowLifecycleSession,
  closeRootFollowLifecycleSession,
  markRootFollowLifecycleSchedulerTick,
  summarizeRootFollowLifecycleContractProbe,
} from "../rootFollow/rootFollowLifecycleContractProbe";
import {
  recordRootFollowPlaybackTruthEvent,
  resolveRootFollowGateCloseReason,
} from '../rootFollow/rootFollowPlaybackTruthProbe';

type UseRootFollowLoopPlaybackArgs = {
  audioCtx: AudioContext | null;
  nexusActive: boolean;
  rootFollowLoopActive: boolean;
  selectedRootFollowLoop: MaterialEntry | null;
  selectedRootFollowLoopConfig: RootFollowBankEntryConfig | null;
  quantizeBpm: number;
  rootFollowLoopTimeMode: MaterialLoopTimeMode;
  rootFollowLoopVolume: number;
  rootFollowLoopGranulationMode: "flowing" | "grainy";
  rootFollowGranularSettings: RootFollowGranularSettings;
  rootFollowImpulsRasterEvery: number;
  rootFollowImpulsRasterCycleDiv: number;
  rootFollowImpulsRasterClockMode: RootFollowImpulseRasterClockMode;
  rootFollowImpulsRasterPattern: number[];
  refs: RootFollowPlaybackRefs;
  getRhythmBus: (ctx: AudioContext) => AudioNode;
  rootFollowPreviewActive: boolean;
  rootFollowPlayfieldInside: boolean;
  playfieldCursorInside: boolean;
  ensureMyzelPostFxRouter: (ctx: AudioContext) => void;
  getForgeSend: () => GainNode | null;
  getCurrentRootHz: () => number;
  getAudioPressureBias?: () => number;
  rootFollowPolicy?: RootFollowRuntimePolicy;
};

export function useRootFollowLoopPlayback({
  audioCtx,
  nexusActive,
  rootFollowLoopActive,
  selectedRootFollowLoop,
  selectedRootFollowLoopConfig,
  quantizeBpm,
  rootFollowLoopTimeMode,
  rootFollowLoopVolume,
  rootFollowLoopGranulationMode,
  rootFollowGranularSettings,
  rootFollowImpulsRasterEvery,
  rootFollowImpulsRasterCycleDiv,
  rootFollowImpulsRasterClockMode,
  rootFollowImpulsRasterPattern,
  refs,
  getRhythmBus,
  rootFollowPreviewActive,
  rootFollowPlayfieldInside,
  playfieldCursorInside,
  ensureMyzelPostFxRouter,
  getForgeSend,
  getCurrentRootHz,
  getAudioPressureBias,
  rootFollowPolicy,
}: UseRootFollowLoopPlaybackArgs) {
  const sessionStateRef = useRef(createEmptyRootFollowSessionState());
  const firstSchedulerTickRecordedRef = useRef(false);
  const firstRenderWindowRecordedRef = useRef(false);
  const dynamicRefs = useRef<RootFollowDynamicRefs>({
    volumeRef: { current: rootFollowLoopVolume },
    getRhythmBusRef: { current: getRhythmBus },
    ensureMyzelPostFxRouterRef: { current: ensureMyzelPostFxRouter },
    getForgeSendRef: { current: getForgeSend },
    getCurrentRootHzRef: { current: getCurrentRootHz },
    granulationModeRef: { current: rootFollowLoopGranulationMode },
    granularSettingsRef: { current: rootFollowGranularSettings },
  });

  useEffect(() => {
    dynamicRefs.current.volumeRef.current = rootFollowLoopVolume;
    if (audioCtx && refs.gainRef.current) {
      refs.gainRef.current.gain.setValueAtTime(
        Math.max(0.0001, rootFollowLoopVolume),
        audioCtx.currentTime,
      );
    }
  }, [audioCtx, rootFollowLoopVolume]);

  useEffect(() => {
    dynamicRefs.current.getRhythmBusRef.current = getRhythmBus;
    dynamicRefs.current.ensureMyzelPostFxRouterRef.current =
      ensureMyzelPostFxRouter;
    dynamicRefs.current.getForgeSendRef.current = getForgeSend;
    dynamicRefs.current.getCurrentRootHzRef.current = getCurrentRootHz;
    dynamicRefs.current.granulationModeRef.current =
      rootFollowLoopGranulationMode;
    dynamicRefs.current.granularSettingsRef.current =
      rootFollowGranularSettings;
  }, [
    getRhythmBus,
    ensureMyzelPostFxRouter,
    getForgeSend,
    getCurrentRootHz,
    rootFollowLoopGranulationMode,
    rootFollowGranularSettings,
  ]);

  useEffect(() => {
    const entry = selectedRootFollowLoop;
    const entryConfig = selectedRootFollowLoopConfig;
    const ctx = audioCtx;
    const effectivePlaybackGate = playfieldCursorInside;
    const selectedEntryExists = !!entry;
    const gateCloseReason = resolveRootFollowGateCloseReason({
      audioCtx: ctx,
      nexusActive,
      rootFollowLoopActive,
      effectivePlaybackGate,
      selectedEntryExists,
    });
    if (
      !ctx ||
      !nexusActive ||
      !rootFollowLoopActive ||
      !playfieldCursorInside ||
      !entry
    ) {
      recordRootFollowPlaybackTruthEvent({
        stage: 'gate-close',
        audioNowSec: ctx?.currentTime ?? null,
        token: refs.tokenRef.current,
        entry,
        entryConfig,
        rootFollowLoopActive,
        rootFollowPreviewActive,
        rootFollowPlayfieldInside,
        effectivePlaybackGate,
        selectedEntryExists,
        timerActive: refs.timerRef.current !== null,
        gainConnected: refs.gainRef.current !== null,
        activeNodes: refs.activeNodesRef.current.size,
        activeSynthVoices: refs.activeSynthVoicesRef.current.size,
        cacheSize: refs.cacheRef.current.size,
        stopReason: gateCloseReason,
        detail: {
          nexusActive,
          reason: gateCloseReason,
        },
      });
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "gate-close",
        audioNowSec: ctx?.currentTime ?? null,
        detail: {
          nexusActive,
          rootFollowLoopActive,
          playfieldCursorInside,
          rootFollowPreviewActive,
          rootFollowPlayfieldInside,
          effectivePlaybackGate,
          hasEntry: !!entry,
          reason: gateCloseReason,
        },
      });
      closeRootFollowLifecycleSession({
        token: refs.tokenRef.current,
        loopId: entry?.id ?? null,
        audioNowSec: ctx?.currentTime ?? null,
        stage: "gate-close",
      });
      refs.lifecycleProbeRef = refs.lifecycleProbeRef ?? { current: null };
      refs.lifecycleProbeRef.current =
        summarizeRootFollowLifecycleContractProbe();
      resetRootFollowSessionState(sessionStateRef.current);
      stopRootFollowPlaybackNodesBoundary(refs);
      publishRootFollowRuntimeTraffic({
        refs,
        activeRequested: rootFollowLoopActive,
        gateOpen: false,
        selectedRootFollowLoop: entry,
        selectedRootFollowLoopConfig: entryConfig,
        granulationMode: rootFollowLoopGranulationMode,
        volume: rootFollowLoopVolume,
        currentRootHz: null,
        stage: "gate-close",
      });
      return;
    }

    let cancelled = false;
    refs.tokenRef.current += 1;
    const token = refs.tokenRef.current;
    firstSchedulerTickRecordedRef.current = false;
    firstRenderWindowRecordedRef.current = false;
    const isSynthDirect =
      entryConfig?.sourceKind === "synth" &&
      entryConfig.renderMode === "direct" &&
      !!entryConfig.synthPattern;
    beginRootFollowLifecycleSession({
      token,
      loopId: entry.id,
      loopName: entry.name ?? null,
      sourceKind: entryConfig?.sourceKind ?? null,
      renderMode: entryConfig?.renderMode ?? null,
      audioNowSec: ctx.currentTime,
      rootHz: getCurrentRootHz(),
    });
    refs.lifecycleProbeRef = refs.lifecycleProbeRef ?? { current: null };
    refs.lifecycleProbeRef.current =
      summarizeRootFollowLifecycleContractProbe();
    recordRootFollowPlaybackTruthEvent({
      stage: 'gate-open',
      audioNowSec: ctx.currentTime,
      token,
      entry,
      entryConfig,
      rootFollowLoopActive,
      rootFollowPreviewActive,
      rootFollowPlayfieldInside,
      effectivePlaybackGate: true,
      selectedEntryExists: true,
      timerActive: refs.timerRef.current !== null,
      gainConnected: refs.gainRef.current !== null,
      activeNodes: refs.activeNodesRef.current.size,
      activeSynthVoices: refs.activeSynthVoicesRef.current.size,
      cacheSize: refs.cacheRef.current.size,
      detail: { rootHz: getCurrentRootHz() },
    });
    markAudioTrafficEvent(refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "gate-open",
      audioNowSec: ctx.currentTime,
      detail: {
        loopId: entry.id,
        sourceKind: entryConfig?.sourceKind ?? null,
        renderMode: entryConfig?.renderMode ?? null,
        rootFollowPreviewActive,
        rootFollowPlayfieldInside,
      },
    });
    publishRootFollowRuntimeTraffic({
      refs,
      activeRequested: rootFollowLoopActive,
      gateOpen: true,
      selectedRootFollowLoop: entry,
      selectedRootFollowLoopConfig: entryConfig,
      granulationMode: rootFollowLoopGranulationMode,
      volume: rootFollowLoopVolume,
      currentRootHz: getCurrentRootHz(),
      stage: "gate-open",
    });

    let preparation: Promise<unknown> | null = null;
    const ensureEntryBuffer = async () => {
      if (isSynthDirect && entryConfig?.synthPattern) {
        if (!preparation) {
          preparation = prepareRootFollowSynthPlayback(ctx, entryConfig, refs);
        }
        return preparation;
      }
      let buffer = refs.cacheRef.current.get(entry.id);
      if (!buffer) {
        const data = await entry.blob.arrayBuffer();
        buffer = await ctx.decodeAudioData(data.slice(0));
        refs.cacheRef.current.set(entry.id, buffer);
      }
      return buffer;
    };

    const ensureRootFollowGain = () => {
      if (!refs.gainRef.current) {
        const gain = ctx.createGain();
        const targetVolume = Math.max(
          0.0001,
          dynamicRefs.current.volumeRef.current,
        );
        // Root-Follow audio is grain-cloud based; on cursor entry the first scheduler
        // window has no previous cloud to overlap with. A short boundary ramp hides
        // that unavoidable cold-start edge without changing the steady-state level.
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(
          targetVolume,
          ctx.currentTime + 0.075,
        );
        gain.connect(dynamicRefs.current.getRhythmBusRef.current(ctx));
        dynamicRefs.current.ensureMyzelPostFxRouterRef.current(ctx);
        const forgeSend = dynamicRefs.current.getForgeSendRef.current();
        if (forgeSend) gain.connect(forgeSend);
        refs.gainRef.current = gain;
      } else {
        const targetVolume = Math.max(
          0.0001,
          dynamicRefs.current.volumeRef.current,
        );
        refs.gainRef.current.gain.cancelScheduledValues(ctx.currentTime);
        refs.gainRef.current.gain.setTargetAtTime(
          targetVolume,
          ctx.currentTime,
          0.018,
        );
      }
    };

    const resolveEffectiveRootHzForWindow = (transportAnchor: number) => {
      const liveRootHz = dynamicRefs.current.getCurrentRootHzRef.current();
      const quantized = resolveCrisisQuantizedValue({
        liveValue: liveRootHz,
        nowSec: ctx.currentTime,
        anchorSec: transportAnchor,
        bpm: quantizeBpm,
        pressureBias: getAudioPressureBias?.() ?? 0,
        policy: rootFollowPolicy?.quantization,
        state: {
          get value() {
            return sessionStateRef.current.quantizedRootHz;
          },
          set value(next: number | null) {
            sessionStateRef.current.quantizedRootHz = next;
          },
          get lastAcceptedTimeSec() {
            return sessionStateRef.current.quantizedRootAcceptSec;
          },
          set lastAcceptedTimeSec(next: number | null) {
            sessionStateRef.current.quantizedRootAcceptSec = next;
          },
        },
      });
      return quantized;
    };

    const scheduleSliceTick = async () => {
      await ensureEntryBuffer();
      if (cancelled || refs.tokenRef.current !== token) return;

      if (!firstSchedulerTickRecordedRef.current) {
        firstSchedulerTickRecordedRef.current = true;
        recordRootFollowPlaybackTruthEvent({
          stage: 'scheduler-first-tick',
          audioNowSec: ctx.currentTime,
          token,
          entry,
          entryConfig,
          rootFollowLoopActive,
          rootFollowPreviewActive,
          rootFollowPlayfieldInside,
          effectivePlaybackGate: true,
          selectedEntryExists: true,
          timerActive: refs.timerRef.current !== null,
          gainConnected: refs.gainRef.current !== null,
          activeNodes: refs.activeNodesRef.current.size,
          activeSynthVoices: refs.activeSynthVoicesRef.current.size,
          cacheSize: refs.cacheRef.current.size,
        });
      }
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "scheduler-tick",
        audioNowSec: ctx.currentTime,
        detail: {
          token,
          activeNodes: refs.activeNodesRef.current.size,
          activeSynthVoices: refs.activeSynthVoicesRef.current.size,
        },
      });
      publishRootFollowRuntimeTraffic({
        refs,
        activeRequested: rootFollowLoopActive,
        gateOpen: true,
        selectedRootFollowLoop: entry,
        selectedRootFollowLoopConfig: entryConfig,
        granulationMode: dynamicRefs.current.granulationModeRef.current,
        volume: dynamicRefs.current.volumeRef.current,
        currentRootHz: dynamicRefs.current.getCurrentRootHzRef.current(),
        stage: "scheduler-tick",
      });

      ensureRootFollowGain();

      const barDur = getMaterialLoopBarDurationSec(quantizeBpm);
      if (
        !Number.isFinite(sessionStateRef.current.transportAnchor ?? NaN) ||
        sessionStateRef.current.transportAnchor === null
      ) {
        sessionStateRef.current.transportAnchor =
          Math.ceil((ctx.currentTime + 0.02) / barDur) * barDur;
      }
      const transportAnchor = sessionStateRef.current.transportAnchor;
      const activeGranularSettings = resolveRootFollowGranularSettings(
        dynamicRefs.current.granularSettingsRef.current,
        dynamicRefs.current.granulationModeRef.current,
      );
      const materialStepSec = Math.max(
        0.001,
        activeGranularSettings.stepMs / 1000,
      );
      const firstRestartLeadFloorSec = firstRenderWindowRecordedRef.current ? 0 : 0.024;
      const minStart = Math.max(
        ctx.currentTime +
          Math.max(
            isSynthDirect ? 0.018 : activeGranularSettings.startLeadMs / 1000,
            firstRestartLeadFloorSec,
          ),
        transportAnchor,
      );
      if (
        !Number.isFinite(sessionStateRef.current.nextSliceStart ?? NaN) ||
        sessionStateRef.current.nextSliceStart === null
      ) {
        sessionStateRef.current.nextSliceStart = isSynthDirect
          ? minStart
          : firstRootFollowSliceOnGridAtOrAfter({
              transportAnchor,
              stepSec: materialStepSec,
              earliestStart: minStart,
            });
      }

      const impulsePolicy = normalizeRootFollowImpulseRasterPolicy({
        every: rootFollowImpulsRasterEvery,
        cycleDiv: rootFollowImpulsRasterCycleDiv,
        counterDiv: rootFollowImpulsRasterEvery,
        clockMode: rootFollowImpulsRasterClockMode,
        pattern: rootFollowImpulsRasterPattern,
      });
      if (isRootFollowImpulseRasterAllMuted(impulsePolicy)) {
        // A deliberately all-muted impulse pattern is a valid musical state,
        // but it must not keep the scheduler polling forever without producing
        // audio. Pattern changes retrigger this effect and restart playback.
        if (refs.timerRef.current !== null) {
          window.clearTimeout(refs.timerRef.current);
          refs.timerRef.current = null;
        }
        stopRootFollowPlaybackNodesBoundary(refs);
        resetRootFollowSessionState(sessionStateRef.current);
        recordRootFollowPlaybackTruthEvent({
          stage: 'impulse-raster-all-muted',
          audioNowSec: ctx.currentTime,
          token,
          entry,
          entryConfig,
          rootFollowLoopActive,
          rootFollowPreviewActive,
          rootFollowPlayfieldInside,
          effectivePlaybackGate: true,
          selectedEntryExists: true,
          timerActive: refs.timerRef.current !== null,
          gainConnected: refs.gainRef.current !== null,
          activeNodes: refs.activeNodesRef.current.size,
          activeSynthVoices: refs.activeSynthVoicesRef.current.size,
          cacheSize: refs.cacheRef.current.size,
          stopReason: 'impulse-raster-all-muted',
          detail: {
            counterDiv: impulsePolicy.counterDiv,
            cycleDiv: impulsePolicy.cycleDiv,
            activeSegments: 0,
          },
        });
        markAudioTrafficEvent(refs.trafficRef?.current, {
          subsystem: "root-follow",
          kind: "scheduler-tick",
          audioNowSec: ctx.currentTime,
          detail: {
            token,
            reason: "impulse-raster-all-muted-idle",
            counterDiv: impulsePolicy.counterDiv,
            cycleDiv: impulsePolicy.cycleDiv,
            activeSegments: 0,
          },
        });
        return;
      }
      const impulseBypass = isRootFollowImpulseRasterBypass(impulsePolicy);
      const rootFollowCycleDurationSec =
        getEffectiveMaterialLoopCycleDurationSec(
          entry,
          rootFollowLoopTimeMode,
          quantizeBpm,
        );
      const impulseSlotDecision = resolveRootFollowImpulseRasterSlotDecision({
        candidateStartSec: sessionStateRef.current.nextSliceStart,
        transportAnchorSec: transportAnchor,
        cycleDurationSec: rootFollowCycleDurationSec,
        policy: impulsePolicy,
      });
      const impulseRasterRenderWindow =
        buildRootFollowImpulseRasterRenderWindow({
          decision: impulseSlotDecision,
          policy: impulsePolicy,
          cycleDurationSec: rootFollowCycleDurationSec,
        });
      sessionStateRef.current.globalSlotCounter =
        impulseSlotDecision.globalSlot;
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "scheduler-tick",
        audioNowSec: ctx.currentTime,
        detail: {
          token,
          impulseRasterSlot: impulseSlotDecision.audible
            ? "impulse-raster-slot-audible"
            : "impulse-raster-slot-muted",
          globalSlot: impulseSlotDecision.globalSlot,
          counterDiv: impulsePolicy.counterDiv,
          cycleDiv: impulsePolicy.cycleDiv,
          beatBasisDiv: impulsePolicy.cycleDiv,
          rootFollowTaktRatioDiv: impulsePolicy.counterDiv,
          cycleSlotIndex: impulseSlotDecision.cycleSlotIndex,
          counterIndex: impulseSlotDecision.counterIndex,
          patternIndex: impulseSlotDecision.patternIndex,
          counterPattern: impulsePolicy.pattern,
          rootFollowTaktPattern: impulsePolicy.pattern,
          slotStartSec: impulseSlotDecision.slotStartSec,
          slotEndSec: impulseSlotDecision.slotEndSec,
          slotDurSec: impulseSlotDecision.slotDurationSec,
          rootFollowWindowStartSec:
            impulseSlotDecision.rootFollowWindowStartSec,
          rootFollowWindowEndSec: impulseSlotDecision.rootFollowWindowEndSec,
          rootFollowWindowDurSec:
            impulseSlotDecision.rootFollowWindowDurationSec,
          impulseRasterClockMode: impulsePolicy.clockMode,
          fragmentTimeCompression:
            impulseRasterRenderWindow &&
            impulseRasterRenderWindow.clockMode === "fragment-compress"
              ? {
                  sourceCycleDurSec: impulseRasterRenderWindow.cycleDurationSec,
                  renderFragmentDurSec:
                    impulseRasterRenderWindow.slotDurationSec,
                  speedFactor:
                    impulseRasterRenderWindow.cycleDurationSec /
                    Math.max(0.001, impulseRasterRenderWindow.slotDurationSec),
                }
              : null,
          mutePatternWindow:
            impulseRasterRenderWindow &&
            impulseRasterRenderWindow.clockMode === "mute-pattern"
              ? {
                  sourceCycleDurSec: impulseRasterRenderWindow.cycleDurationSec,
                  rootFollowWindowDurSec:
                    impulseRasterRenderWindow.rootFollowWindowDurationSec,
                  speedFactor:
                    impulseRasterRenderWindow.cycleDurationSec /
                    Math.max(
                      0.001,
                      impulseRasterRenderWindow.rootFollowWindowDurationSec,
                    ),
                  interpretation: "whole-root-follow-window-muted-by-segments",
                }
              : null,
          clockSource:
            impulsePolicy.clockMode === "mute-pattern"
              ? "timeline-derived-root-follow-window-mute-pattern"
              : "timeline-derived-slot-fragment-compression",
        },
      });
      if (!impulseSlotDecision.audible) {
        // Muted slots only suppress audible scheduling. The carrier/material
        // transport keeps moving to the next slot boundary; no tick-local
        // counter is allowed to invent a separate tempo here.
        sessionStateRef.current.nextSliceStart = Math.max(
          sessionStateRef.current.nextSliceStart,
          impulseSlotDecision.slotEndSec,
        );
        const mutedDelayMs = Math.max(
          8,
          Math.min(
            250,
            (sessionStateRef.current.nextSliceStart - ctx.currentTime - 0.06) *
              1000,
          ),
        );
        refs.timerRef.current = window.setTimeout(() => {
          void scheduleSliceTick().catch(error => {
            if (cancelled || refs.tokenRef.current !== token) return;
            console.error("[root-follow] scheduler", error);
            stopRootFollowPlaybackNodesBoundary(refs);
          });
        }, mutedDelayMs);
        return;
      }

      const rootFollowQuantizedWindow =
        resolveEffectiveRootHzForWindow(transportAnchor);
      const lifecycleRootHz = rootFollowQuantizedWindow.value;
      const renderDynamicRefs: RootFollowDynamicRefs = {
        ...dynamicRefs.current,
        getCurrentRootHzRef: { current: () => lifecycleRootHz },
      };
      markRootFollowLifecycleSchedulerTick({
        token,
        loopId: entry.id,
        audioNowSec: ctx.currentTime,
        rootHz: lifecycleRootHz,
        transportAnchorSec: transportAnchor,
        nextSliceStartSec: sessionStateRef.current.nextSliceStart,
        stage: rootFollowQuantizedWindow.decision.active
          ? "scheduler-tick-quantized-fallback"
          : "scheduler-tick",
      });
      refs.lifecycleProbeRef = refs.lifecycleProbeRef ?? { current: null };
      refs.lifecycleProbeRef.current =
        summarizeRootFollowLifecycleContractProbe();

      const renderWindowStartSec = sessionStateRef.current.nextSliceStart;
      const renderResult =
        isSynthDirect && entryConfig
          ? await scheduleRootFollowSynthWindow({
              ctx,
              entry,
              entryConfig,
              rootFollowLoopTimeMode,
              quantizeBpm,
              refs,
              dynamicRefs: renderDynamicRefs,
              transportAnchor,
              nextSliceStart: sessionStateRef.current.nextSliceStart,
              sessionAnchorHz: sessionStateRef.current.sessionAnchorHz,
              rootFollowPolicy,
              audioPressureBias: getAudioPressureBias?.() ?? 0,
            })
          : await scheduleRootFollowMaterialWindow({
              ctx,
              entry,
              quantizeBpm,
              rootFollowLoopTimeMode,
              refs,
              dynamicRefs: renderDynamicRefs,
              transportAnchor,
              nextSliceStart: sessionStateRef.current.nextSliceStart,
              sessionAnchorHz: sessionStateRef.current.sessionAnchorHz,
              materialSmoothedRootHz:
                sessionStateRef.current.materialSmoothedRootHz,
              rootFollowPolicy,
              audioPressureBias: getAudioPressureBias?.() ?? 0,
              impulseRasterWindow: impulseRasterRenderWindow,
            });

      if (cancelled || refs.tokenRef.current !== token) return;
      if (!firstRenderWindowRecordedRef.current) {
        firstRenderWindowRecordedRef.current = true;
        const coldStartLeadMs = (renderWindowStartSec - ctx.currentTime) * 1000;
        recordRootFollowPlaybackTruthEvent({
          stage: 'first-render-window',
          audioNowSec: ctx.currentTime,
          token,
          entry,
          entryConfig,
          rootFollowLoopActive,
          rootFollowPreviewActive,
          rootFollowPlayfieldInside,
          effectivePlaybackGate: true,
          selectedEntryExists: true,
          timerActive: refs.timerRef.current !== null,
          gainConnected: refs.gainRef.current !== null,
          activeNodes: refs.activeNodesRef.current.size,
          activeSynthVoices: refs.activeSynthVoicesRef.current.size,
          cacheSize: refs.cacheRef.current.size,
          coldStartLeadMs,
          detail: {
            renderWindowStartSec,
            restartLeadFloorMs: 24,
            delayMs: renderResult.delayMs,
            synthDirect: isSynthDirect,
            qualityMode: isSynthDirect ? 'synth-direct' : activeGranularSettings.qualityMode,
          },
        });
      }
      sessionStateRef.current.nextSliceStart = renderResult.nextSliceStart;
      sessionStateRef.current.sessionAnchorHz = renderResult.sessionAnchorHz;
      if ("materialSmoothedRootHz" in renderResult) {
        const nextMaterialSmoothedRootHz = renderResult.materialSmoothedRootHz;
        sessionStateRef.current.materialSmoothedRootHz =
          typeof nextMaterialSmoothedRootHz === "number" &&
          Number.isFinite(nextMaterialSmoothedRootHz)
            ? nextMaterialSmoothedRootHz
            : null;
      }
      publishRootFollowRuntimeTraffic({
        refs,
        activeRequested: rootFollowLoopActive,
        gateOpen: true,
        selectedRootFollowLoop: entry,
        selectedRootFollowLoopConfig: entryConfig,
        granulationMode: dynamicRefs.current.granulationModeRef.current,
        volume: dynamicRefs.current.volumeRef.current,
        currentRootHz: lifecycleRootHz,
        stage: isSynthDirect
          ? "synth-window"
          : activeGranularSettings.qualityMode === "fragment"
            ? "material-grain-window"
            : "material-flow-window",
      });

      refs.lifecycleProbeRef = refs.lifecycleProbeRef ?? { current: null };
      refs.lifecycleProbeRef.current =
        summarizeRootFollowLifecycleContractProbe();

      refs.timerRef.current = window.setTimeout(
        () => {
          void scheduleSliceTick().catch(error => {
            if (cancelled || refs.tokenRef.current !== token) return;
            console.error("[root-follow] scheduler", error);
            stopRootFollowPlaybackNodesBoundary(refs);
          });
        },
        !impulseBypass
          ? Math.max(
              8,
              Math.min(
                renderResult.delayMs,
                (impulseSlotDecision.slotEndSec - ctx.currentTime - 0.06) *
                  1000,
              ),
            )
          : renderResult.delayMs,
      );
    };

    void scheduleSliceTick().catch((error) => {
      if (cancelled) return;
      console.error("[xensonar][root-follow-loop]", error);
      recordRootFollowPlaybackTruthEvent({
        stage: 'scheduler-error',
        audioNowSec: ctx.currentTime,
        token,
        entry,
        entryConfig,
        rootFollowLoopActive,
        rootFollowPreviewActive,
        rootFollowPlayfieldInside,
        effectivePlaybackGate: true,
        selectedEntryExists: true,
        timerActive: refs.timerRef.current !== null,
        gainConnected: refs.gainRef.current !== null,
        activeNodes: refs.activeNodesRef.current.size,
        activeSynthVoices: refs.activeSynthVoicesRef.current.size,
        cacheSize: refs.cacheRef.current.size,
        stopReason: 'scheduler-error',
        detail: { message: error instanceof Error ? error.message : String(error) },
      });
      closeRootFollowLifecycleSession({
        token,
        loopId: entry.id,
        audioNowSec: ctx.currentTime,
        stage: "scheduler-error",
      });
      resetRootFollowSessionState(sessionStateRef.current);
      stopRootFollowPlaybackNodesBoundary(refs);
    });

    return () => {
      cancelled = true;
      refs.tokenRef.current += 1;
      recordRootFollowPlaybackTruthEvent({
        stage: 'cleanup',
        audioNowSec: ctx.currentTime,
        token,
        entry,
        entryConfig,
        rootFollowLoopActive,
        rootFollowPreviewActive,
        rootFollowPlayfieldInside,
        effectivePlaybackGate: playfieldCursorInside,
        selectedEntryExists: true,
        timerActive: refs.timerRef.current !== null,
        gainConnected: refs.gainRef.current !== null,
        activeNodes: refs.activeNodesRef.current.size,
        activeSynthVoices: refs.activeSynthVoicesRef.current.size,
        cacheSize: refs.cacheRef.current.size,
        stopReason: 'cleanup-token-replaced',
      });
      markAudioTrafficEvent(refs.trafficRef?.current, {
        subsystem: "root-follow",
        kind: "stop-cleanup",
        audioNowSec: ctx.currentTime,
        detail: { loopId: entry.id, token },
      });
      closeRootFollowLifecycleSession({
        token,
        loopId: entry.id,
        audioNowSec: ctx.currentTime,
        stage: "cleanup",
      });
      refs.lifecycleProbeRef = refs.lifecycleProbeRef ?? { current: null };
      refs.lifecycleProbeRef.current =
        summarizeRootFollowLifecycleContractProbe();
      resetRootFollowSessionState(sessionStateRef.current);
      stopRootFollowPlaybackNodesBoundary(refs);
      publishRootFollowRuntimeTraffic({
        refs,
        activeRequested: rootFollowLoopActive,
        gateOpen: false,
        selectedRootFollowLoop: entry,
        selectedRootFollowLoopConfig: entryConfig,
        granulationMode: rootFollowLoopGranulationMode,
        volume: rootFollowLoopVolume,
        currentRootHz: null,
        stage: "cleanup",
      });
    };
  }, [
    audioCtx,
    nexusActive,
    rootFollowLoopActive,
    selectedRootFollowLoop,
    selectedRootFollowLoopConfig,
    quantizeBpm,
    rootFollowLoopTimeMode,
    rootFollowImpulsRasterEvery,
    rootFollowImpulsRasterCycleDiv,
    rootFollowImpulsRasterClockMode,
    rootFollowImpulsRasterPattern,
    playfieldCursorInside,
    rootFollowPreviewActive,
    rootFollowPlayfieldInside,
    getAudioPressureBias,
    rootFollowPolicy,
  ]);
}
