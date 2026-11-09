import type {
  RootFollowSynthRenderArgs,
  RootFollowSynthRenderResult,
} from "./rootFollowRendererTypes";
import {
  scheduleRootFollowOscillatorDirectBody,
  scheduleRootFollowSampleDirectBody,
} from "./rootFollowDirectNoteRenderBody";
import { resolveRootFollowDirectNoteRenderPlan } from "./rootFollowDirectNoteResolve";
import { makeRootFollowAudioNodeRegistrar } from "./rootFollowAudioNodeRegistry";
import {
  coordinateRootFollowSynthWindow,
  type RootFollowDirectNoteSchedulerArgs,
} from "./rootFollowSynthWindowCoordinator";

function scheduleDirectNote(args: RootFollowDirectNoteSchedulerArgs) {
  const {
    ctx,
    destination,
    refs,
    noteId,
    noteStart,
    noteDuration,
    baseFrequency,
    targetFrequency,
    velocity,
    trackVolume,
    trackPan,
    presetId,
    noteClass = "standard",
    renderSourceKind: requestedRenderSourceKind = null,
    materialAnchorHz = null,
    sampleOffsetSec = null,
    samplePlaybackDurationSec = null,
    localField = null,
    renderStart = null,
    renderEnd = null,
    granulationMode = "flowing",
    granularQualityMode = granulationMode === "grainy" ? "fragment" : "base",
    granularTuning = null,
    trafficProfile = null,
    carrierIntegralTimbre = null,
  } = args;

  const resolvedDirectNote = resolveRootFollowDirectNoteRenderPlan({
    sampleOwner: refs,
    ctx,
    noteId,
    noteStart,
    noteDuration,
    velocity,
    trackVolume,
    presetId,
    noteClass,
    renderSourceKind: requestedRenderSourceKind,
    trafficProfile,
    carrierIntegralTimbre,
  });

  if (!resolvedDirectNote) return;
  if (resolvedDirectNote.kind === "sample") {
    scheduleRootFollowSampleDirectBody({
      ctx,
      destination,
      registerNode: makeRootFollowAudioNodeRegistrar(refs),
      resolved: resolvedDirectNote.resolved,
      noteId,
      noteStart: resolvedDirectNote.noteStart,
      noteDuration: resolvedDirectNote.noteDuration,
      baseFrequency,
      targetFrequency,
      trackPan,
      peak: velocity * trackVolume,
      fadeInSec: args.fadeInSec,
      fadeOutSec: args.fadeOutSec,
      materialPitchMode: args.materialPitchMode,
      noteClass,
      materialAnchorHz,
      sampleOffsetSec,
      samplePlaybackDurationSec,
      localField,
      renderStart,
      renderEnd,
      granulationMode,
      granularQualityMode,
      granularTuning,
    });
    return;
  }

  scheduleRootFollowOscillatorDirectBody({
    ctx,
    destination,
    registerNode: makeRootFollowAudioNodeRegistrar(refs),
    activeSynthVoices: refs.activeSynthVoicesRef.current,
    compiledGainCurve: args.compiledGainCurve,
    compiledPitchSemitones: args.compiledPitchSemitones,
    voiceId: resolvedDirectNote.voiceId,
    preset: resolvedDirectNote.preset,
    noteStart: resolvedDirectNote.noteStart,
    noteDuration: resolvedDirectNote.noteDuration,
    baseFrequency,
    targetFrequency,
    peak: resolvedDirectNote.peak,
    attack: Math.max(resolvedDirectNote.attack, Math.min(noteDuration * 0.8, args.fadeInSec ?? 0)),
    release: Math.max(resolvedDirectNote.release, Math.min(noteDuration * 0.8, args.fadeOutSec ?? 0)),
    trackPan,
    localField,
  });
}

export async function scheduleRootFollowSynthWindow(
  args: RootFollowSynthRenderArgs,
): Promise<RootFollowSynthRenderResult> {
  return coordinateRootFollowSynthWindow({
    renderArgs: args,
    scheduleDirectNote,
  });
}
