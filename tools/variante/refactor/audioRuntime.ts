import type { Params } from "./types";

export const MIN_AUDIO_GAIN = 0.0001;

type EchoRuntime = {
  wet: GainNode;
  dry: GainNode;
  feedback: GainNode;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function rampGainParam(param: AudioParam | null | undefined, now: number, target: number, timeConstant: number) {
  if (!param) return;
  param.cancelScheduledValues(now);
  param.setTargetAtTime(Math.max(MIN_AUDIO_GAIN, target), now, Math.max(0.01, timeConstant));
}

export function rampLinearParam(param: AudioParam | null | undefined, now: number, target: number, duration: number) {
  if (!param) return;
  param.cancelScheduledValues(now);
  param.setValueAtTime(Math.max(MIN_AUDIO_GAIN, param.value), now);
  param.linearRampToValueAtTime(Math.max(MIN_AUDIO_GAIN, target), now + Math.max(0.01, duration));
}

export function applyRefucktorMixParams(
  now: number,
  master: GainNode | null,
  echo: EchoRuntime | null,
  params: Pick<Params, "masterVolume" | "echoOn" | "echoFeedback" | "echoMix">,
) {
  if (master) {
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(clamp(params.masterVolume, MIN_AUDIO_GAIN, 1.25), now, 0.035);
  }
  if (!echo) return;
  echo.feedback.gain.cancelScheduledValues(now);
  echo.feedback.gain.setTargetAtTime(params.echoOn ? clamp(params.echoFeedback, 0, 0.92) : 0, now, 0.045);
  echo.wet.gain.cancelScheduledValues(now);
  echo.wet.gain.setTargetAtTime(params.echoOn ? clamp(params.echoMix, 0, 0.85) : 0, now, 0.045);
  echo.dry.gain.cancelScheduledValues(now);
  echo.dry.gain.setTargetAtTime(1, now, 0.045);
}

export function openRefucktorPowerGate(powerGate: GainNode | null, now: number, duration = 0.18) {
  if (!powerGate) return;
  powerGate.gain.cancelScheduledValues(now);
  powerGate.gain.setValueAtTime(MIN_AUDIO_GAIN, now);
  powerGate.gain.exponentialRampToValueAtTime(1, now + Math.max(0.03, duration));
}

export function closeRefucktorPowerGate(powerGate: GainNode | null, now: number, duration = 0.11) {
  if (!powerGate) return;
  powerGate.gain.cancelScheduledValues(now);
  powerGate.gain.setValueAtTime(Math.max(powerGate.gain.value, MIN_AUDIO_GAIN), now);
  powerGate.gain.exponentialRampToValueAtTime(MIN_AUDIO_GAIN, now + Math.max(0.03, duration));
}
