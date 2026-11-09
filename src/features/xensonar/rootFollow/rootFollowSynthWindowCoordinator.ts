import { getMaterialLoopInterpretationFactor } from '../material/materialLoopMath';
import type {
  RootFollowSynthRenderArgs,
  RootFollowSynthRenderResult,
} from "./rootFollowRendererTypes";
import type {
  RootFollowCarrierTimbreSnapshot,
  RootFollowSynthRenderSourceKind,
} from "./rootFollowTypes";
import {
  buildRootFollowGranularRenderTuning,
  resolveRootFollowGranularSettings,
} from "./rootFollowGranularSettings";
import {
  applyRootFollowCrisisDensityToGranularSettings,
  buildRootFollowCrisisRenderEnvelope,
  limitRootFollowDirectEventsUnderCrisis,
} from "./rootFollowCrisisRenderPolicy";
import { clamp } from "../rooms/resonanceRuntimeMath";
import { markAudioTrafficEvent } from "../audioTraffic/audioTrafficForensics";
import { type RootFollowLocalField } from "./rootFollowLocalFieldAutomation";
import {
  buildRootFollowDirectEventWindow,
  type RootFollowDirectTrafficProfile,
} from "./rootFollowDirectEventWindow";
import {
  cleanupFinishedRootFollowSynthVoices,
  retuneRootFollowActiveSynthVoices,
} from "./rootFollowActiveVoiceRuntime";
import {
  applyRootFollowMainThreadVoicePoolAdmission,
  buildRootFollowVoicePoolShadowEvents,
} from "./rootFollowVoicePoolShadowRuntime";
import {
  publishRootFollowWorkletShadowPlan,
  routeRootFollowWorkletDirectPilotEvents,
  type RootFollowWorkletDirectPilotEvent,
} from "./rootFollowWorkletShadowBridge";

export type RootFollowDirectNoteSchedulerArgs = {
  ctx: AudioContext;
  destination: GainNode;
  refs: RootFollowSynthRenderArgs["refs"];
  noteId: string;
  noteStart: number;
  noteDuration: number;
  baseFrequency: number;
  targetFrequency: number;
  velocity: number;
  trackVolume: number;
  trackPan: number;
  presetId: string | null;
  noteClass?:
    | "standard"
    | "material-base"
    | "material-fragment"
    | "carrier-field"
    | "carrier-fragment";
  renderSourceKind?: RootFollowSynthRenderSourceKind | null;
  materialAnchorHz?: number | null;
  sampleOffsetSec?: number | null;
  samplePlaybackDurationSec?: number | null;
  localField?: RootFollowLocalField;
  renderStart?: number | null;
  renderEnd?: number | null;
  granulationMode?: "flowing" | "grainy";
  granularQualityMode?: "base" | "fragment";
  granularTuning?: ReturnType<
    typeof buildRootFollowGranularRenderTuning
  > | null;
  trafficProfile?: RootFollowDirectTrafficProfile | null;
  compiledGainCurve?: number[] | null;
  compiledPitchSemitones?: number[] | null;
  fadeInSec?: number;
  fadeOutSec?: number;
  materialPitchMode?: string | null;
  carrierIntegralTimbre?: RootFollowCarrierTimbreSnapshot | null;
};

export type RootFollowDirectNoteScheduler = (
  args: RootFollowDirectNoteSchedulerArgs,
) => void;

export async function coordinateRootFollowSynthWindow(args: {
  renderArgs: RootFollowSynthRenderArgs;
  scheduleDirectNote: RootFollowDirectNoteScheduler;
}): Promise<RootFollowSynthRenderResult> {
  const { renderArgs, scheduleDirectNote } = args;
  const {
    ctx,
    entry,
    entryConfig,
    quantizeBpm,
    refs,
    dynamicRefs,
    transportAnchor,
  } = renderArgs;
  const pattern = entryConfig.synthPattern;
  if (!pattern || !refs.gainRef.current) {
    return {
      nextSliceStart: renderArgs.nextSliceStart,
      sessionAnchorHz: renderArgs.sessionAnchorHz,
      delayMs: 24,
    };
  }

  const beatDurationSec = 60 / Math.max(40, quantizeBpm || 108) * getMaterialLoopInterpretationFactor(renderArgs.rootFollowLoopTimeMode ?? 'normal');
  const loopDurationSec = Math.max(
    0.25,
    Math.max(1, pattern.bars) *
      Math.max(1, pattern.beatsPerBar) *
      beatDurationSec,
  );
  const leadTimeSec = 0.12;
  const minimumLeadInSec = 0.018;
  const minStart = Math.max(
    ctx.currentTime + minimumLeadInSec,
    transportAnchor,
  );
  let nextSliceStart = Math.max(renderArgs.nextSliceStart, minStart);
  if (nextSliceStart < ctx.currentTime - 0.05) {
    nextSliceStart = ctx.currentTime + minimumLeadInSec;
  }

  const liveTargetHz = clamp(
    dynamicRefs.getCurrentRootHzRef.current(),
    27.5,
    3520,
  );
  let sessionAnchorHz = renderArgs.sessionAnchorHz;
  if (!Number.isFinite(sessionAnchorHz ?? NaN) || sessionAnchorHz === null) {
    sessionAnchorHz = Number.isFinite(entry.rootHz ?? NaN)
      ? Math.max(1, Number(entry.rootHz))
      : Math.max(1, pattern.baseHz || liveTargetHz);
  }
  const ratio = clamp(liveTargetHz / Math.max(1, sessionAnchorHz), 0.125, 8);

  cleanupFinishedRootFollowSynthVoices({
    now: ctx.currentTime,
    activeSynthVoices: refs.activeSynthVoicesRef.current,
  });
  retuneRootFollowActiveSynthVoices({
    now: ctx.currentTime,
    ratio,
    activeSynthVoices: refs.activeSynthVoicesRef.current,
  });
  markAudioTrafficEvent(refs.trafficRef?.current, {
    subsystem: "root-follow",
    kind: "retune-sample",
    audioNowSec: ctx.currentTime,
    detail: {
      mode: "synth-direct",
      targetHz: liveTargetHz,
      sessionAnchorHz,
      ratio,
      activeSynthVoices: refs.activeSynthVoicesRef.current.size,
    },
  });

  const crisisEnvelope = buildRootFollowCrisisRenderEnvelope({
    policy: renderArgs.rootFollowPolicy,
    pressureBias: renderArgs.audioPressureBias ?? 0,
  });
  const granularSettings = applyRootFollowCrisisDensityToGranularSettings({
    settings: resolveRootFollowGranularSettings(
      dynamicRefs.granularSettingsRef.current,
      dynamicRefs.granulationModeRef.current,
    ),
    envelope: crisisEnvelope,
  });
  const granularTuning = buildRootFollowGranularRenderTuning(granularSettings);
  const granularMode =
    granularSettings.preset === "flowing" ||
    granularSettings.preset === "grainy"
      ? granularSettings.preset
      : dynamicRefs.granulationModeRef.current;

  const horizon = ctx.currentTime + leadTimeSec;
  const directEventWindow = buildRootFollowDirectEventWindow({
    entryConfig,
    pattern,
    beatDurationSec,
    loopDurationSec,
    transportAnchor,
    nextSliceStart,
    horizon,
    sessionAnchorHz,
    ratio,
  });
  const scheduleEvents = limitRootFollowDirectEventsUnderCrisis({
    events: directEventWindow.events,
    envelope: crisisEnvelope,
    currentTime: ctx.currentTime,
    getEventTime: (event) => event.renderStart,
    getEventClass: event => `${event.renderSourceKind}:${event.track.id}`,
  });

  const shadowEvents = buildRootFollowVoicePoolShadowEvents({
    events: scheduleEvents,
    getId: (event) => event.note.id,
    getNoteStart: (event) => event.noteStart,
    getNoteDuration: (event) => event.noteDuration,
    getTargetFrequency: (event) => event.targetFrequency,
    getSourceKind: (event) => event.renderSourceKind,
    getNoteClass: (event) => event.note.noteClass ?? null,
    getPresetId: (event) => event.presetId,
  });
  const voicePoolAdmission = applyRootFollowMainThreadVoicePoolAdmission({
    mode: renderArgs.rootFollowPolicy?.voiceEngineMode ?? 'shadow-plan',
    now: ctx.currentTime,
    activeSynthVoices: refs.activeSynthVoicesRef.current,
    events: scheduleEvents,
    shadowEvents,
    crisisEnvelope,
    maxPoolSize: 48,
  });
  const voicePoolShadow = voicePoolAdmission.summary;
  const pooledScheduleEvents = voicePoolAdmission.eventsToSchedule;

  let finalScheduleEvents = pooledScheduleEvents;
  let workletDirectPilotPostedCount = 0;
  let workletDirectPilotFallbackReason: string | null = null;

  if (renderArgs.rootFollowPolicy?.voiceEngineMode === 'worklet-shadow') {
    publishRootFollowWorkletShadowPlan({
      ctx,
      audioNowSec: ctx.currentTime,
      shadowEvents,
      voicePool: voicePoolShadow,
      crisisEnvelope,
      trafficRef: refs.trafficRef,
    });
  } else if (renderArgs.rootFollowPolicy?.voiceEngineMode === 'worklet-direct-pilot') {
    const pilotEvents: RootFollowWorkletDirectPilotEvent[] = pooledScheduleEvents
      .filter((event) => event.renderSourceKind === 'synth-live' && !event.note.carrierIntegralTimbre && !entryConfig.synthPatch?.carrierIntegralTimbre && !event.note.localField && !event.note.compiledGainCurve && !event.note.compiledPitchSemitones)
      .map((event) => ({
        id: event.note.id,
        startSec: Math.max(ctx.currentTime + 0.002, event.noteStart),
        endSec: Math.max(event.noteStart + 0.024, event.noteStart + event.noteDuration),
        frequencyHz: event.targetFrequency,
        gain: clamp(
          (event.note.velocity ?? 0.8) * (event.track.volume ?? 0.8) * 0.045 * crisisEnvelope.densityScale,
          0.006,
          0.16,
        ),
      }));
    const directPilot = await routeRootFollowWorkletDirectPilotEvents({
      ctx,
      audioNowSec: ctx.currentTime,
      pilotEvents,
      shadowEvents,
      voicePool: voicePoolShadow,
      crisisEnvelope,
      trafficRef: refs.trafficRef,
    });
    workletDirectPilotPostedCount = directPilot.postedEventCount;
    workletDirectPilotFallbackReason = directPilot.fallbackReason;
    if (directPilot.handledEventIds.size > 0) {
      finalScheduleEvents = pooledScheduleEvents.filter((event) => !directPilot.handledEventIds.has(event.note.id));
    }
  }

  if (scheduleEvents.length > 0 || voicePoolShadow.existingVoiceCount > 0) {
    markAudioTrafficEvent(refs.trafficRef?.current, {
      subsystem: "root-follow",
      kind: "direct-event-window",
      audioNowSec: ctx.currentTime,
      detail: {
        eventCount: finalScheduleEvents.length,
        originalEventCount: directEventWindow.events.length,
        ratio,
        horizonSec: horizon,
        nextSliceStart,
        crisis: {
          densityScale: crisisEnvelope.densityScale,
          densityReduction: crisisEnvelope.densityReduction,
          lateGrainStrategy: crisisEnvelope.lateGrainStrategy,
          staleWindowMs: crisisEnvelope.staleWindowMs,
        },
        voicePoolShadow: {
          mode: voicePoolShadow.mode,
          audiblePath: voicePoolShadow.audiblePath,
          preservesLegacyPath: voicePoolShadow.preservesLegacyPath,
          plannedVoiceCount: voicePoolShadow.plannedVoiceCount,
          scheduledVoiceCount: voicePoolShadow.scheduledVoiceCount,
          workletDirectPilotPostedCount,
          workletDirectPilotFallbackReason,
          pooledVoiceCount: voicePoolShadow.pooledVoiceCount,
          existingVoiceCount: voicePoolShadow.existingVoiceCount,
          activeVoiceCount: voicePoolShadow.activeVoiceCount,
          releasingVoiceCount: voicePoolShadow.releasingVoiceCount,
          stealableVoiceCount: voicePoolShadow.stealableVoiceCount,
          staleEventCount: voicePoolShadow.staleEventCount,
          lateEventCount: voicePoolShadow.lateEventCount,
          wouldReuseVoiceCount: voicePoolShadow.wouldReuseVoiceCount,
          wouldCreateVoiceCount: voicePoolShadow.wouldCreateVoiceCount,
          wouldStealVoiceCount: voicePoolShadow.wouldStealVoiceCount,
          maxPoolPressure: voicePoolShadow.maxPoolPressure,
          workletShadowMuted: voicePoolShadow.mode === 'worklet-shadow',
          workletDirectPilotActive: renderArgs.rootFollowPolicy?.voiceEngineMode === 'worklet-direct-pilot',
        },
      },
    });
  }

  for (const event of finalScheduleEvents) {
    scheduleDirectNote({
      ctx,
      destination: refs.gainRef.current,
      refs,
      noteId: event.note.id,
      noteStart: event.noteStart,
      noteDuration: event.noteDuration,
      baseFrequency: event.noteBaseHz,
      targetFrequency: event.targetFrequency,
      velocity: clamp(event.note.velocity ?? 0.8, 0, 1),
      trackVolume: clamp(event.track.volume ?? 0.8, 0, 1),
      trackPan: clamp(event.note.panOverride ?? event.track.pan ?? 0, -1, 1),
      presetId: event.presetId,
      noteClass: event.note.noteClass,
      renderSourceKind: event.renderSourceKind,
      materialAnchorHz: event.note.anchorHz,
      sampleOffsetSec: event.note.sampleOffsetSec,
      samplePlaybackDurationSec:
        event.note.samplePlaybackDurationSec ??
        event.note.sourceLoopDurationSec,
      localField: event.note.localField,
      compiledGainCurve: event.note.compiledGainCurve,
      compiledPitchSemitones: event.note.compiledPitchSemitones,
      materialPitchMode: event.note.materialPitchMode,
      fadeInSec: event.note.fadeInBeats * beatDurationSec,
      fadeOutSec: event.note.fadeOutBeats * beatDurationSec,
      renderStart: event.renderStart,
      renderEnd: event.renderEnd,
      granulationMode: granularMode,
      granularQualityMode: granularSettings.qualityMode,
      granularTuning,
      trafficProfile: event.trafficProfile,
      carrierIntegralTimbre:
        event.note.carrierIntegralTimbre ?? entryConfig.synthPatch?.carrierIntegralTimbre ?? null,
    });
  }

  return {
    nextSliceStart: horizon,
    sessionAnchorHz,
    delayMs: 24,
  };
}
