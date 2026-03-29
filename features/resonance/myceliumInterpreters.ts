import type { MyceliumSnapshot } from "../topology/myceliumSnapshot";

export interface DroneMyceliumMod {
  filterBias: number;
  vibratoBias: number;
  flangerBias: number;
  formantCenterHz: number;
  formantQ: number;
  formantWet: number;
}

export type MyzelBallMode = "scanner" | "orbit" | "pressure";
export type MyzelNodeMode = "ji" | "hybrid" | "field";

export interface MyzelLayerMod {
  baseHz: number;
  masterGain: number;
  bodyGain: number;
  carrierGain: number;
  subGain: number;
  overtoneRatios: number[];
  overtoneGains: number[];
  formantCenters: number[];
  formantGains: number[];
  formantQ: number;
  lowpassHz: number;
  pan: number;
  shimmer: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const norm = (value: number, max: number) => clamp(max <= 0 ? 0 : value / max, 0, 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const parseRatio = (label: string | null): number | null => {
  if (!label) return null;
  if (label.toLowerCase() === "root") return 1;
  const match = label.match(/(\d+)\/(\d+)/);
  if (!match) return null;
  const num = Number(match[1]);
  const den = Number(match[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
};

const rankNodes = (snapshot: MyceliumSnapshot) =>
  Object.entries(snapshot.nodeEnergyByLabel)
    .map(([label, energy]) => {
      let weighted = energy;
      if (label === snapshot.activeNodeLabel) weighted += 0.24;
      if (label === snapshot.nearestNodeLabel) weighted += 0.18;
      return [label, weighted] as const;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

const octaveIntoFormantRange = (freq: number) => {
  let out = freq;
  while (out < 240) out *= 2;
  while (out > 2600) out /= 2;
  return clamp(out, 220, 2800);
};

export function deriveDroneMyceliumMod(
  snapshot: MyceliumSnapshot,
  amount: number,
): DroneMyceliumMod {
  const a = clamp(amount, 0, 1);
  const energyBias = clamp(snapshot.maxEnergy, 0, 1);
  const realityBias = clamp(snapshot.rawReality, 0, 1);
  const tensionBias = clamp(snapshot.tension, 0, 1);
  const slimBias = clamp(snapshot.slimLayers, 0, 1);
  const motionBias = norm(snapshot.myceliumBallSpeed, 12);
  const constellationTension = clamp(snapshot.constellationTension ?? 0, 0, 1);
  const constellationFlux = clamp(snapshot.constellationFlux ?? 0, 0, 1);
  const constellationBrightness = clamp(snapshot.constellationBrightness ?? 0.5, 0, 1);

  const filterBias = clamp(((energyBias - 0.5) * 0.18 + (realityBias - 0.5) * 0.1 + (constellationBrightness - 0.5) * 0.12) * a, -0.16, 0.16);
  const vibratoBias = clamp((motionBias * 0.13 + tensionBias * 0.05 + constellationFlux * 0.08) * a, 0, 0.22);
  const flangerBias = clamp((motionBias * 0.06 + (1 - slimBias) * 0.04 + constellationFlux * 0.05 + constellationTension * 0.03) * a, 0, 0.14);

  const yBias = 1 - clamp(snapshot.cursorNormalizedY, 0, 1);
  const formantFocus = clamp(snapshot.cursorNormalizedX * 0.5 + yBias * 0.2 + constellationBrightness * 0.3, 0, 1);
  const formantCenterHz = lerp(240, 2800, formantFocus);
  const spreadBias = clamp(snapshot.layoutSpread, 0, 1);
  const formantQ = lerp(9.5, 1.8, spreadBias);
  const focusBias = clamp((energyBias * 0.55 + snapshot.nearestNodeEnergy * 0.2 + constellationTension * 0.15 + constellationFlux * 0.1) * a, 0, 1);
  const formantWet = clamp(0.04 + focusBias * 0.18 + motionBias * 0.04 + yBias * 0.02 * a + constellationBrightness * 0.03, 0, 0.32);

  return {
    filterBias,
    vibratoBias,
    flangerBias,
    formantCenterHz,
    formantQ,
    formantWet,
  };
}

export function deriveMyzelLayerMod(
  snapshot: MyceliumSnapshot,
  intensity: number,
  baseHz: number,
  ballMode: MyzelBallMode,
  nodeMode: MyzelNodeMode,
): MyzelLayerMod {
  const amount = clamp(intensity, 0, 1);
  const motion = norm(snapshot.myceliumBallSpeed, 12);
  const spread = clamp(snapshot.layoutSpread, 0, 1);
  const coherence = clamp(snapshot.coherence, 0, 1);
  const tensionField = clamp(snapshot.tensionField, 0, 1);
  const nearestPull = 1 - clamp(snapshot.ballToNearestNodeNormDist, 0, 1);
  const scannerX = clamp(snapshot.cursorNormalizedX, 0, 1);
  const scannerY = 1 - clamp(snapshot.cursorNormalizedY, 0, 1);
  const topNodes = rankNodes(snapshot);
  const constellationRatios = (snapshot.constellationRatios?.length ? snapshot.constellationRatios : [1.25, 1.5, 1.875]).slice(0, 3);

  const fallbackRatios = [
    1.25 + scannerX * 0.45,
    1.5 + spread * 0.22,
    1.875 - scannerY * 0.18,
  ];

  const overtoneRatios = topNodes.map(([label], idx) => {
    const jiRatio = parseRatio(label) ?? (label?.toLowerCase() === "root" ? 1 : null);
    const fieldRatio = fallbackRatios[idx] ?? (1.25 + idx * 0.25);
    const topologyRatio = nodeMode === "field"
      ? fieldRatio
      : nodeMode === "ji"
        ? (jiRatio ?? fieldRatio)
        : (jiRatio ? lerp(fieldRatio, jiRatio, 0.72) : fieldRatio);
    const constellationRatio = constellationRatios[idx] ?? fieldRatio;
    const constellationBlend = clamp(0.18 + tensionField * 0.22 + motion * 0.1 + (snapshot.constellationFlux ?? 0) * 0.16, 0.12, 0.58);
    return lerp(topologyRatio, constellationRatio, constellationBlend);
  });
  while (overtoneRatios.length < 3) overtoneRatios.push(fallbackRatios[overtoneRatios.length] ?? 1.5);

  const topWeights = topNodes.map(([, weight]) => clamp(weight, 0, 1.25));
  while (topWeights.length < 3) topWeights.push(0);
  const totalWeight = Math.max(0.001, topWeights.reduce((sum, value) => sum + value, 0));

  const overtoneGains = topWeights.map((weight, idx) => {
    const normWeight = weight / totalWeight;
    const slotBias = idx === 0 ? 1 : idx === 1 ? 0.78 : 0.6;
    const base = 0.018 + normWeight * 0.14;
    const shaped = nodeMode === "field" ? base * (0.75 + spread * 0.35) : base;
    const constellationLift = 1 + (snapshot.constellationTension ?? 0) * 0.22 + (snapshot.constellationFlux ?? 0) * 0.28;
    return clamp(shaped * slotBias * (0.38 + amount * 0.95) * constellationLift, 0.004, 0.22);
  });

  const ballScan = clamp(scannerX * 0.62 + scannerY * 0.38, 0, 1);
  const baseCenters = overtoneRatios.map((ratio, idx) => octaveIntoFormantRange(baseHz * ratio * (idx === 0 ? 6 : idx === 1 ? 8 : 10)));

  const formantCenters = baseCenters.map((center, idx) => {
    if (ballMode === "scanner") {
      const scanMul = 0.82 + ballScan * (0.42 + idx * 0.05) + (snapshot.constellationBrightness ?? 0.5) * 0.08;
      return center * scanMul;
    }
    if (ballMode === "orbit") {
      const orbitMul = 0.92 + motion * 0.1 + idx * 0.015 + (0.5 - Math.abs(scannerX - 0.5)) * 0.06;
      return center * orbitMul;
    }
    const pressureMul = 0.84 + nearestPull * 0.2 + tensionField * 0.12;
    return center * pressureMul;
  }).map((value) => clamp(value, 170, 3600));

  const formantGains = topWeights.map((weight, idx) => {
    const normWeight = weight / totalWeight;
    const ballBias = ballMode === "pressure"
      ? 0.42 + nearestPull * 0.7 + tensionField * 0.18
      : ballMode === "orbit"
        ? 0.4 + coherence * 0.42 + motion * 0.12
        : 0.38 + ballScan * 0.5;
    const constellationBias = 1 + (snapshot.constellationTension ?? 0) * 0.25 + (snapshot.constellationFlux ?? 0) * 0.32;
    return clamp((0.04 + normWeight * 0.16) * ballBias * amount * (idx === 0 ? 1 : 0.8) * constellationBias, 0.008, 0.3);
  });

  const formantQ = clamp(
    ballMode === "pressure"
      ? lerp(2.6, 11, nearestPull * 0.68 + tensionField * 0.32)
      : ballMode === "orbit"
        ? lerp(2.4, 7.2, motion * 0.55 + coherence * 0.45)
        : lerp(2.8, 9, coherence * 0.58 + (1 - spread) * 0.42),
    1.6,
    11,
  );

  const centroidPan = ((snapshot.constellationCentroidX ?? 0.5) - 0.5) * 0.42;
  const pan = clamp(
    (ballMode === "orbit"
      ? (scannerX - 0.5) * (0.95 + motion * 0.5)
      : ballMode === "scanner"
        ? (scannerX - 0.5) * 0.55
        : (scannerX - 0.5) * 0.28) + centroidPan,
    -0.98,
    0.98,
  );

  const shimmer = clamp(
    ballMode === "pressure"
      ? (tensionField * 0.08 + motion * 0.04 + (snapshot.constellationTension ?? 0) * 0.06 + (snapshot.constellationFlux ?? 0) * 0.08) * amount
      : ballMode === "orbit"
        ? (motion * 0.06 + (1 - coherence) * 0.03 + (snapshot.constellationFlux ?? 0) * 0.08) * amount
        : (ballScan * 0.025 + (1 - coherence) * 0.03 + (snapshot.constellationBrightness ?? 0.5) * 0.03 + (snapshot.constellationFlux ?? 0) * 0.05) * amount,
    0,
    0.2,
  );

  const lowpassHz = clamp(
    ballMode === "pressure"
      ? lerp(260, 1900, tensionField * 0.34 + snapshot.rawReality * 0.22 + nearestPull * 0.2 + (snapshot.constellationBrightness ?? 0.5) * 0.24)
      : lerp(360, 2800, (1 - spread) * 0.22 + snapshot.maxEnergy * 0.16 + (1 - snapshot.rawReality) * 0.08 + coherence * 0.22 + (snapshot.constellationBrightness ?? 0.5) * 0.2 + (snapshot.constellationFlux ?? 0) * 0.12),
    220,
    3600,
  );

  const bodyGain = clamp((0.035 + amount * 0.12) * (0.5 + nearestPull * 0.14 + snapshot.maxEnergy * 0.2 + (snapshot.constellationTension ?? 0) * 0.16 + (snapshot.constellationFlux ?? 0) * 0.12), 0.015, 0.26);
  const masterGain = clamp((0.045 + amount * 0.16) * (0.46 + snapshot.maxEnergy * 0.36 + (snapshot.constellationTension ?? 0) * 0.12 + (snapshot.constellationFlux ?? 0) * 0.16), 0.015, 0.34);
  const carrierGain = clamp(0.03 + amount * 0.1 + snapshot.rawReality * 0.025 + (snapshot.constellationBrightness ?? 0.5) * 0.03, 0.015, 0.18);
  const subGain = clamp(0.04 + (1 - spread) * 0.04 + amount * 0.05 + (snapshot.constellationTension ?? 0) * 0.03, 0.02, 0.22);

  return {
    baseHz,
    masterGain,
    bodyGain,
    carrierGain,
    subGain,
    overtoneRatios,
    overtoneGains,
    formantCenters,
    formantGains,
    formantQ,
    lowpassHz,
    pan,
    shimmer,
  };
}
