export type VoicePoolLaneId =
  | "root-follow-direct"
  | "root-follow-material"
  | "particles"
  | "wave-starter";

export type VoicePoolBackend =
  | "main-thread-legacy"
  | "main-thread-pooled"
  | "audio-worklet-candidate"
  | "audio-worklet-active";

export type AudioWorkletVoicePoolPreparation = {
  version: 1;
  laneId: VoicePoolLaneId;
  backend: VoicePoolBackend;
  preservesMainThreadReferencePath: boolean;
  requiresBlobUrlWorkletLoading: true;
  sampleAccurateSchedulingTarget: boolean;
  stableLaneClockContract: "shared-audio-time" | "local-worklet-clock";
  migrationStage:
    | "contract-only"
    | "shadow-plan"
    | "main-thread-pool-active"
    | "worklet-shadow"
    | "worklet-direct-pilot"
    | "worklet-granular-shadow-plan"
    | "worklet-buffer-shadow-transfer"
    | "dual-path-a-b"
    | "worklet-primary";
  notes: readonly string[];
};

export function createAudioWorkletVoicePoolPreparation(
  value: Omit<
    AudioWorkletVoicePoolPreparation,
    "version" | "requiresBlobUrlWorkletLoading"
  >,
): AudioWorkletVoicePoolPreparation {
  return {
    version: 1,
    requiresBlobUrlWorkletLoading: true,
    ...value,
    notes: [...value.notes],
  };
}

export function isAudioWorkletVoicePoolActive(
  preparation: AudioWorkletVoicePoolPreparation | null | undefined,
): boolean {
  return preparation?.backend === "audio-worklet-active";
}

export function describeAudioWorkletVoicePoolPreparation(
  preparation: AudioWorkletVoicePoolPreparation,
): string {
  const reference = preparation.preservesMainThreadReferencePath
    ? "Legacy-Main-Thread bleibt Referenzpfad"
    : "kein Legacy-Referenzpfad";
  const scheduling = preparation.sampleAccurateSchedulingTarget
    ? "samplegenaue Planung ist Ziel"
    : "noch keine samplegenaue Zielbindung";
  return `${preparation.laneId}: ${preparation.migrationStage} · ${preparation.backend} · ${reference} · ${scheduling}`;
}
