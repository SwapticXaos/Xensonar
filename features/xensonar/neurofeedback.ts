import { DEFAULT_NEUROFEEDBACK_MAPPINGS } from "./constants";
import { clamp } from "./helpers";
import type {
  NeurofeedbackBand,
  NeurofeedbackMapping,
  NeurofeedbackMetric,
  NeurofeedbackProfile,
  NeurofeedbackSample,
  NeurofeedbackTarget,
} from "./types";

const metricFallbacks: NeurofeedbackMetric[] = [
  "calm",
  "focus",
  "arousal",
  "valence",
  "alpha_ratio",
  "theta_beta_ratio",
  "signal_quality",
];

export const createDefaultNeurofeedbackProfile = (): NeurofeedbackProfile => ({
  source: "mock",
  status: "idle",
  enabled: false,
  sampleRateHz: 10,
  controlMix: 0.5,
  mappings: DEFAULT_NEUROFEEDBACK_MAPPINGS.map((mapping) => ({ ...mapping })),
  lastSample: null,
});

export const createMockNeurofeedbackSample = (timeSeconds: number): NeurofeedbackSample => {
  const alpha = 0.55 + Math.sin(timeSeconds * 0.42) * 0.22;
  const theta = 0.45 + Math.cos(timeSeconds * 0.31 + 0.8) * 0.18;
  const beta = 0.5 + Math.sin(timeSeconds * 0.67 + 1.4) * 0.2;
  const gamma = 0.38 + Math.cos(timeSeconds * 0.91 + 0.4) * 0.1;
  const calm = clamp(alpha * 0.9 - beta * 0.2 + 0.35, 0, 1);
  const focus = clamp(beta * 0.85 - theta * 0.15 + 0.28, 0, 1);
  const arousal = clamp(beta * 0.6 + gamma * 0.5 - alpha * 0.2, 0, 1);
  const valence = clamp(0.5 + Math.sin(timeSeconds * 0.18) * 0.22, 0, 1);
  const alphaRatio = clamp(alpha / Math.max(0.08, beta + theta), 0, 1);
  const thetaBetaRatio = clamp(theta / Math.max(0.08, beta), 0, 1);
  const quality = clamp(0.82 + Math.sin(timeSeconds * 0.13) * 0.1, 0, 1);

  return {
    timestamp: performance.now(),
    bands: {
      delta: clamp(0.32 + Math.sin(timeSeconds * 0.12) * 0.08, 0, 1),
      theta,
      alpha,
      beta,
      gamma,
    },
    metrics: {
      calm,
      focus,
      arousal,
      valence,
      alpha_ratio: alphaRatio,
      theta_beta_ratio: thetaBetaRatio,
      signal_quality: quality,
    },
    quality,
  };
};

export const getMetricValue = (sample: NeurofeedbackSample | null, metric: NeurofeedbackMetric) => {
  if (!sample) return 0;
  return clamp(sample.metrics[metric] ?? 0, 0, 1);
};

export const smoothMetricValue = (previous: number, next: number, smoothing: number) => {
  const s = clamp(smoothing, 0, 0.999);
  return previous * s + next * (1 - s);
};

export const mapMetricToTargetDelta = (value: number, mapping: NeurofeedbackMapping) => {
  const centered = (mapping.invert ? 1 - value : value) - 0.5;
  return centered * 2 * clamp(mapping.amount, 0, 1);
};

export const listNeurofeedbackMetrics = () => metricFallbacks;
export const listNeurofeedbackBands = (): NeurofeedbackBand[] => ["delta", "theta", "alpha", "beta", "gamma"];
export const listNeurofeedbackTargets = (): NeurofeedbackTarget[] => [
  "droneTimbre",
  "droneVolume",
  "waveRadius",
  "particleVolume",
  "echoDecay",
  "cursorY",
  "gridBase",
];
