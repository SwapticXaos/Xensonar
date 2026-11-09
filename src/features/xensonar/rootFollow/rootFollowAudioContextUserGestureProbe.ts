export type StableLaneAudioContextUserGestureBlockerReason =
  | "proof-ready"
  | "frame-activity-without-relief"
  | "audio-context-suspended-user-gesture-missing"
  | "audio-context-suspended"
  | "audio-context-closed"
  | "audio-context-interrupted"
  | "not-stable-lane-test-mode"
  | "stable-lane-stress-recorder-missing"
  | "stable-lane-plan-not-published"
  | "worklet-frame-advance-missing"
  | "stable-lane-warmup"
  | "stable-lane-fallback"
  | "no-proof-in-window"
  | "not-in-browser-runtime";

export type StableLaneAudioContextUserGestureProbeSnapshot = {
  version: 1;
  probeKind: "stable-lane-audio-context-user-gesture";
  audioContextState: string;
  userActivationState: string;
  userActivationIsActive: boolean | null;
  userActivationHasBeenActive: boolean | null;
  documentVisibilityState: string;
  blockerReason: StableLaneAudioContextUserGestureBlockerReason;
  stableLaneProofState: string;
  rootFollowVoiceEngineMode: string;
  stressComparisonPresent: boolean;
  frameDelta: number;
  laneQuanta: number;
  planTransportPostedCount: number;
  planTransportPendingCount: number;
};

type StableLaneAudioContextProbeInput = {
  rootFollowVoiceEngineMode: string;
  stableLaneProofState: string;
  stressComparisonPresent: boolean;
  frameDelta: number;
  laneQuanta: number;
  planTransportPostedCount: number;
  planTransportPendingCount: number;
};

export function readStableLaneUserActivationDetails() {
  if (typeof navigator === "undefined" || !("userActivation" in navigator)) {
    return {
      userActivationState: "unknown",
      userActivationIsActive: null,
      userActivationHasBeenActive: null,
    };
  }
  const activation = (navigator as Navigator & { userActivation?: { isActive?: boolean; hasBeenActive?: boolean } }).userActivation;
  if (!activation) {
    return {
      userActivationState: "unknown",
      userActivationIsActive: null,
      userActivationHasBeenActive: null,
    };
  }
  const isActive = activation.isActive === true;
  const hasBeenActive = activation.hasBeenActive === true;
  return {
    userActivationState: `${isActive ? "active" : "inactive"} / ${hasBeenActive ? "has-been-active" : "never-active"}`,
    userActivationIsActive: isActive,
    userActivationHasBeenActive: hasBeenActive,
  };
}

export function readStableLaneAudioContextStateFromGlobals() {
  if (typeof window === "undefined") return "not-in-browser-runtime";
  const candidates = [
    (window as any).__XENSONAR_AUDIO_CONTEXT_STATE__,
    (window as any).__XENSONAR_ROOT_FOLLOW_AUDIO_CONTEXT_STATE__,
    (window as any).__XENSONAR_AUDIO_CONTEXT__?.state,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return "unknown";
}

export function classifyStableLaneAudioContextUserGestureBlocker(
  input: StableLaneAudioContextProbeInput & {
    audioContextState: string;
    userActivationHasBeenActive: boolean | null;
  },
): StableLaneAudioContextUserGestureBlockerReason {
  if (input.audioContextState === "not-in-browser-runtime") return "not-in-browser-runtime";
  if (input.stableLaneProofState === "relief-ready") return "proof-ready";
  if (input.stableLaneProofState === "frame-activity-without-relief") return "frame-activity-without-relief";
  if (input.audioContextState === "closed") return "audio-context-closed";
  if (input.audioContextState === "interrupted") return "audio-context-interrupted";
  if (input.audioContextState === "suspended" && input.userActivationHasBeenActive === false) {
    return "audio-context-suspended-user-gesture-missing";
  }
  if (input.audioContextState === "suspended") return "audio-context-suspended";
  if (input.rootFollowVoiceEngineMode !== "worklet-stable-lane-pilot") return "not-stable-lane-test-mode";
  if (!input.stressComparisonPresent) return "stable-lane-stress-recorder-missing";
  if (input.stableLaneProofState === "fallback") return "stable-lane-fallback";
  if (input.stableLaneProofState === "warmup") return "stable-lane-warmup";
  if (input.planTransportPostedCount <= 0 && input.frameDelta <= 0 && input.laneQuanta <= 0) {
    return "stable-lane-plan-not-published";
  }
  if (input.planTransportPostedCount > 0 && input.frameDelta <= 0 && input.laneQuanta <= 0) {
    return "worklet-frame-advance-missing";
  }
  return "no-proof-in-window";
}

export function detectStableLaneAudioContextUserGestureProbe(
  input: StableLaneAudioContextProbeInput,
): StableLaneAudioContextUserGestureProbeSnapshot {
  const activation = readStableLaneUserActivationDetails();
  const audioContextState = readStableLaneAudioContextStateFromGlobals();
  const blockerReason = classifyStableLaneAudioContextUserGestureBlocker({
    ...input,
    audioContextState,
    userActivationHasBeenActive: activation.userActivationHasBeenActive,
  });
  return {
    version: 1,
    probeKind: "stable-lane-audio-context-user-gesture",
    audioContextState,
    userActivationState: activation.userActivationState,
    userActivationIsActive: activation.userActivationIsActive,
    userActivationHasBeenActive: activation.userActivationHasBeenActive,
    documentVisibilityState: typeof document !== "undefined" ? document.visibilityState : "not-in-browser-runtime",
    blockerReason,
    stableLaneProofState: input.stableLaneProofState,
    rootFollowVoiceEngineMode: input.rootFollowVoiceEngineMode,
    stressComparisonPresent: input.stressComparisonPresent,
    frameDelta: input.frameDelta,
    laneQuanta: input.laneQuanta,
    planTransportPostedCount: input.planTransportPostedCount,
    planTransportPendingCount: input.planTransportPendingCount,
  };
}
