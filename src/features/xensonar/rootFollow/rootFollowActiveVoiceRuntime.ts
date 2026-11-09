import { createAudioWorkletVoicePoolPreparation } from "../../../core/audio/audioWorkletVoicePoolBoundary";
import type { RootFollowActiveSynthVoice } from "./rootFollowRendererTypes";

export const ROOT_FOLLOW_DIRECT_VOICE_POOL_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "root-follow-direct",
    backend: "main-thread-pooled",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: true,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "main-thread-pool-active",
    notes: [
      "Bestehende activeSynthVoices-Map bleibt Referenz; der optionale Main-Thread-Pool darf Root-Follow-Direct/Synth-Duplikate durch laufende Stimmen vertreten, ohne Sample-/Material-/Granular-Pfade zu ersetzen.",
      "Root-Follow-Dichte-, Late-Grain- und Stale-Policies liefern Shadow-Plan und optionalem Main-Thread-Pool dieselben Admission-/Stale-Entscheidungen.",
      "Blob-URL-Worklet-Loading bleibt wegen Singlefile-HTML ein expliziter Artefaktvertrag.",
    ],
  });



export const ROOT_FOLLOW_WORKLET_SHADOW_BRIDGE_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "root-follow-direct",
    backend: "audio-worklet-candidate",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: true,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "worklet-shadow",
    notes: [
      "Worklet Shadow Bridge lädt ein stummes Root-Follow-Direct/Synth-Probe-Worklet über Blob-URL, ohne den Legacy- oder Main-Thread-Pool-Klangpfad zu ersetzen.",
      "Der Shadow-Bridge-Port erhält nur Renderplan-/Policy-/Voice-Pool-Diagnosedaten; keine Material-/Sample-/Granular-Buffer werden in dieser Stufe übertragen.",
      "Singlefile-HTML und file://-Kontexte bleiben Fail-open: wenn Blob-URL AudioWorklet nicht verfügbar ist, bleibt der Main-Thread-Referenzpfad hörbar.",
    ],
  });

export const ROOT_FOLLOW_RETUNE_CENT_THRESHOLD = 1.5;
export const ROOT_FOLLOW_RETUNE_PRESTART_GUARD_SEC = 0.002;

export function cleanupFinishedRootFollowSynthVoices(args: {
  now: number;
  activeSynthVoices: Map<string, RootFollowActiveSynthVoice>;
}) {
  const { now, activeSynthVoices } = args;
  for (const [id, voice] of activeSynthVoices.entries()) {
    if (voice.endTime < now - 0.08) {
      activeSynthVoices.delete(id);
    }
  }
}

export function retuneRootFollowActiveSynthVoices(args: {
  now: number;
  ratio: number;
  activeSynthVoices: Map<string, RootFollowActiveSynthVoice>;
}) {
  const { now, ratio, activeSynthVoices } = args;
  activeSynthVoices.forEach((voice) => {
    if (voice.endTime < now - 0.08) return;
    if (Number.isFinite(voice.noteStart ?? NaN) && now < Number(voice.noteStart) - ROOT_FOLLOW_RETUNE_PRESTART_GUARD_SEC) {
      return;
    }
    const previousRatio = Number.isFinite(voice.lastAppliedRatio ?? NaN)
      ? Number(voice.lastAppliedRatio)
      : null;
    if (previousRatio !== null) {
      const centDelta = Math.abs(
        1200 *
          Math.log2(Math.max(0.0001, ratio) / Math.max(0.0001, previousRatio)),
      );
      if (centDelta < ROOT_FOLLOW_RETUNE_CENT_THRESHOLD) return;
    }
    voice.lastAppliedRatio = ratio;
    const targetValue = Math.max(0.0001, voice.baseTargetValue * ratio);
    voice.frequencyTargets.forEach((param) => {
      try {
        const cancellable = param as AudioParam & {
          cancelAndHoldAtTime?: (time: number) => AudioParam;
        };
        if (typeof cancellable.cancelAndHoldAtTime === "function")
          cancellable.cancelAndHoldAtTime(now);
        else param.cancelScheduledValues(now);
        param.setTargetAtTime(targetValue, now, 0.026);
      } catch {
        try {
          param.setTargetAtTime(targetValue, now, 0.026);
        } catch {}
      }
    });
  });
}

export function registerRootFollowActiveSynthVoice(args: {
  activeSynthVoices: Map<string, RootFollowActiveSynthVoice>;
  id: string;
  endTime: number;
  baseTargetValue: number;
  frequencyTargets: AudioParam[];
  localPitchCurve?: Float32Array | null;
  noteStart?: number;
  noteEnd?: number;
  lastAppliedRatio?: number | null;
}) {
  const {
    activeSynthVoices,
    id,
    endTime,
    baseTargetValue,
    frequencyTargets,
    localPitchCurve,
    noteStart,
    noteEnd,
    lastAppliedRatio = null,
  } = args;
  activeSynthVoices.set(id, {
    id,
    endTime,
    baseTargetValue,
    frequencyTargets,
    localPitchCurve,
    noteStart,
    noteEnd,
    lastAppliedRatio,
  });
}


export const ROOT_FOLLOW_WORKLET_DIRECT_PILOT_PREPARATION = {
  version: 1,
  backend: "audio-worklet-direct-pilot",
  migrationStage: "worklet-direct-pilot",
  scope: "Root-Follow Direct/Synth only",
  referencePath: "Legacy/Main-Thread bleibt Fallback; Material-/Granular-/Samplepfade bleiben Legacy",
} as const;

export const ROOT_FOLLOW_GRANULAR_WORKLET_RENDER_PLAN_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "root-follow-material",
    backend: "audio-worklet-candidate",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: true,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "worklet-granular-shadow-plan",
    notes: [
      "Root-Follow Material/Granular-Fenster werden als stummer Worklet-Renderplan gespiegelt; der hörbare Materialpfad bleibt Legacy.",
      "Diese Stufe überträgt noch keine AudioBuffer/Sample-Blöcke und aktiviert keinen granularen Worklet-Klangkörper.",
      "Der Plan enthält Fensterzeiten, Source-Offsets, Playback-Rate, Krise/Dichte/Stale-Metadaten und dient dem späteren Sample-Elastic-Worklet-Vertrag.",
    ],
  });

export const ROOT_FOLLOW_WORKLET_BUFFER_SHADOW_TRANSFER_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "root-follow-material",
    backend: "audio-worklet-candidate",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: true,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "worklet-buffer-shadow-transfer",
    notes: [
      "Root-Follow Material/Granular bekommt zusätzlich zum Renderplan einen bounded Sample-/Buffer-Transfer-Shadow: nur kleine kopierte Fenster gehen ins Worklet.",
      "Der Original-AudioBuffer wird nicht verschoben, der hörbare Materialpfad bleibt Legacy und activeAudioPath bleibt false.",
      "Diese Stufe validiert Buffer-Identität, Kanalstatistik, Transfergröße und Blob-URL-Worklet-PostMessage-Vertrag vor jedem aktiven Sample-Elastic-Worklet.",
    ],
  });

export const ROOT_FOLLOW_GRANULAR_WORKLET_ACTIVE_PILOT_PREPARATION =
  createAudioWorkletVoicePoolPreparation({
    laneId: "root-follow-material",
    backend: "audio-worklet-active",
    preservesMainThreadReferencePath: true,
    sampleAccurateSchedulingTarget: true,
    stableLaneClockContract: "shared-audio-time",
    migrationStage: "dual-path-a-b",
    notes: [
      "Root-Follow Material/Granular bekommt einen kleinen aktiven Sample-Elastic-Pilot aus bounded Bufferfenstern im Worklet.",
      "Der Legacy-Materialpfad bleibt hörbar als Referenz/Fallback; der Pilot ist additiv und nicht der vollständige Sample-Elastic-Ersatz.",
      "Diese Stufe prüft aktive Buffer-Wiedergabe, Envelope, Playback-Rate und Blob-URL-Worklet-Vertrag vor einem ersetzenden Granular-Worklet.",
    ],
  });
