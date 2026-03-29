import type { MyzelPostFxGroupId } from "../xensonar/architecture/machineRooms";

type MyzelScopedSourceKey = "particles" | "drone" | "waves" | "myzel" | "forge";

export type MyzelPostFxSourceKey = MyzelScopedSourceKey;

export type MyzelPostFxTelemetry = {
  focusLabel: string;
  totalSend: number;
  weights: Record<MyzelScopedSourceKey, number>;
  colorHz: number;
  spaceMs: number;
};

export type MyzelPostFxRouter = {
  inputs: Record<MyzelScopedSourceKey, GainNode>;
  merge: GainNode;
  highpass: BiquadFilterNode;
  lowpass: BiquadFilterNode;
  color: BiquadFilterNode;
  shaper: WaveShaperNode;
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  output: GainNode;
  telemetry: MyzelPostFxTelemetry;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const SOURCE_KEYS: MyzelScopedSourceKey[] = ["particles", "drone", "waves", "myzel", "forge"];

const FOCUS_WEIGHTS: Record<MyzelPostFxGroupId, Record<MyzelScopedSourceKey, number>> = {
  master: { particles: 0.78, drone: 0.78, waves: 0.72, myzel: 0.84, forge: 0.7 },
  particles: { particles: 1.0, drone: 0.18, waves: 0.34, myzel: 0.12, forge: 0.14 },
  drone: { particles: 0.16, drone: 1.0, waves: 0.18, myzel: 0.3, forge: 0.2 },
  waves: { particles: 0.22, drone: 0.14, waves: 1.0, myzel: 0.12, forge: 0.32 },
  forge: { particles: 0.14, drone: 0.22, waves: 0.28, myzel: 0.16, forge: 1.0 },
};

const FOCUS_LABELS: Record<MyzelPostFxGroupId, string> = {
  master: "Master",
  particles: "Partikel",
  drone: "Drone",
  waves: "Wellenstarter",
  forge: "Forge Material",
};

const createSoftCurve = (amount = 0.5) => {
  const n = 2048;
  const curve = new Float32Array(n);
  const drive = 1 + amount * 10;
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
  }
  return curve;
};

export const createMyzelPostFxRouter = (ctx: AudioContext, destination: AudioNode): MyzelPostFxRouter => {
  const merge = ctx.createGain();
  const highpass = ctx.createBiquadFilter();
  const lowpass = ctx.createBiquadFilter();
  const color = ctx.createBiquadFilter();
  const shaper = ctx.createWaveShaper();
  const delay = ctx.createDelay(0.6);
  const feedback = ctx.createGain();
  const wet = ctx.createGain();
  const output = ctx.createGain();

  highpass.type = "highpass";
  highpass.frequency.value = 90;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 4200;
  color.type = "peaking";
  color.frequency.value = 1700;
  color.Q.value = 0.82;
  color.gain.value = 0;
  shaper.curve = createSoftCurve(0.2);
  shaper.oversample = "4x";
  delay.delayTime.value = 0.12;
  feedback.gain.value = 0.18;
  wet.gain.value = 0;
  output.gain.value = 0.4;

  merge.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(color);
  color.connect(shaper);
  shaper.connect(wet);
  shaper.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(output);
  output.connect(destination);

  const inputs = SOURCE_KEYS.reduce<Record<MyzelScopedSourceKey, GainNode>>((acc, key) => {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(merge);
    acc[key] = gain;
    return acc;
  }, {} as Record<MyzelScopedSourceKey, GainNode>);

  return {
    inputs,
    merge,
    highpass,
    lowpass,
    color,
    shaper,
    delay,
    feedback,
    wet,
    output,
    telemetry: {
      focusLabel: FOCUS_LABELS.master,
      totalSend: 0,
      weights: { particles: 0, drone: 0, waves: 0, myzel: 0, forge: 0 },
      colorHz: color.frequency.value,
      spaceMs: delay.delayTime.value * 1000,
    },
  };
};

export const updateMyzelPostFxRouter = (
  router: MyzelPostFxRouter,
  params: {
    enabled: boolean;
    focusGroup: MyzelPostFxGroupId;
    depth: number;
    parallel: number;
    sourceLevels: Record<MyzelScopedSourceKey, number>;
    liveMasterShares: { main: number; drone: number; rhythm: number; space: number };
  },
  now: number,
): MyzelPostFxTelemetry => {
  const enabled = params.enabled;
  const depth = clamp(params.depth, 0, 1);
  const parallel = clamp(params.parallel, 0, 1);
  const focusWeights = FOCUS_WEIGHTS[params.focusGroup] ?? FOCUS_WEIGHTS.master;
  const masterDensity = clamp(params.liveMasterShares.main + params.liveMasterShares.drone + params.liveMasterShares.rhythm + params.liveMasterShares.space, 0, 1);
  const sendScale = enabled ? parallel * (0.18 + depth * 0.82) : 0;

  let totalSend = 0;
  const weights = { particles: 0, drone: 0, waves: 0, myzel: 0, forge: 0 } as Record<MyzelScopedSourceKey, number>;

  SOURCE_KEYS.forEach((key) => {
    const activity = clamp(params.sourceLevels[key], 0, 1);
    const focus = focusWeights[key] ?? 0;
    const masterLean = params.focusGroup === "master" ? 0.76 + masterDensity * 0.24 : 1;
    const weight = clamp(sendScale * focus * (0.28 + activity * 0.72) * masterLean, 0, 1.1);
    router.inputs[key].gain.setTargetAtTime(weight, now, 0.08);
    weights[key] = clamp(weight, 0, 1);
    totalSend += weights[key];
  });

  const colorHz = params.focusGroup === "drone"
    ? 320 + depth * 860
    : params.focusGroup === "particles"
      ? 2300 + depth * 2600
      : params.focusGroup === "waves"
        ? 1600 + depth * 2200
        : params.focusGroup === "forge"
          ? 820 + depth * 1650
          : 1100 + depth * 1900;

  const lowpassHz = params.focusGroup === "drone"
    ? 1800 + depth * 2600
    : params.focusGroup === "particles"
      ? 3400 + depth * 5400
      : params.focusGroup === "waves"
        ? 2800 + depth * 4300
        : params.focusGroup === "forge"
          ? 2200 + depth * 3200
          : 2600 + depth * 4200;

  const highpassHz = params.focusGroup === "drone"
    ? 40 + depth * 80
    : params.focusGroup === "particles"
      ? 180 + depth * 220
      : params.focusGroup === "waves"
        ? 120 + depth * 180
        : params.focusGroup === "forge"
          ? 90 + depth * 120
          : 70 + depth * 120;

  const delaySec = params.focusGroup === "drone"
    ? 0.16 + depth * 0.14
    : params.focusGroup === "particles"
      ? 0.045 + depth * 0.08
      : params.focusGroup === "waves"
        ? 0.065 + depth * 0.1
        : params.focusGroup === "forge"
          ? 0.095 + depth * 0.12
          : 0.11 + depth * 0.12;

  router.highpass.frequency.setTargetAtTime(highpassHz, now, 0.12);
  router.lowpass.frequency.setTargetAtTime(lowpassHz, now, 0.12);
  router.color.frequency.setTargetAtTime(colorHz, now, 0.12);
  router.color.gain.setTargetAtTime(enabled ? (-1 + depth * 6) : 0, now, 0.12);
  router.delay.delayTime.setTargetAtTime(delaySec, now, 0.12);
  router.feedback.gain.setTargetAtTime(enabled ? clamp(0.08 + depth * 0.34 + parallel * 0.12, 0, 0.52) : 0, now, 0.12);
  router.wet.gain.setTargetAtTime(enabled ? clamp(0.1 + parallel * 0.58 + depth * 0.2, 0, 0.95) : 0, now, 0.12);
  router.output.gain.setTargetAtTime(enabled ? clamp(0.18 + totalSend * 0.22, 0.14, 0.68) : 0, now, 0.12);
  router.shaper.curve = createSoftCurve(0.12 + depth * 0.42);

  const telemetry = {
    focusLabel: FOCUS_LABELS[params.focusGroup],
    totalSend: clamp(totalSend / SOURCE_KEYS.length, 0, 1),
    weights,
    colorHz,
    spaceMs: delaySec * 1000,
  } satisfies MyzelPostFxTelemetry;

  router.telemetry = telemetry;
  return telemetry;
};
