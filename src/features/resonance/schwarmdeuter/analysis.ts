import type {
  Bounds2D,
  ParticleFrameInput,
  ParticleVoiceSnapshot,
  SchwarmdeuterParams,
  SwarmDescriptorVector,
  SwarmRawMetrics,
  SwarmState,
} from "./types";

const EPS = 1e-6;
const DEFAULT_BOUNDS: Bounds2D = { width: 1, height: 1 };
const SIMPLE_INTERVALS = [
  1,
  16 / 15,
  10 / 9,
  9 / 8,
  6 / 5,
  5 / 4,
  4 / 3,
  3 / 2,
  8 / 5,
  5 / 3,
  15 / 8,
  2,
];

interface MemoryPoint {
  time: number;
  vector: number[];
}

interface InternalMemory {
  previousTime: number | null;
  previousCount: number;
  previousCenter: { x: number; y: number } | null;
  previousEnergy: number;
  shortVector: number[] | null;
  midVector: number[] | null;
  history: MemoryPoint[];
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (value: number) => value * value * (3 - 2 * value);
const emaAlpha = (dt: number, tau: number) => 1 - Math.exp(-dt / Math.max(EPS, tau));
const hypot = (x: number, y: number) => Math.hypot(x, y);

const normalizedParticleEnergy = (particle: ParticleVoiceSnapshot) => {
  if (particle.energy !== undefined) return Math.max(0, particle.energy);
  if (particle.life !== undefined) return Math.max(0.1, particle.life);
  return 1;
};

const getPitchHz = (particle: ParticleVoiceSnapshot) => {
  if (particle.freq && particle.freq > 0) return particle.freq;
  if (particle.ratio && particle.ratio > 0) return 220 * particle.ratio;
  return null;
};

const pitchEntropy = (frequencies: number[]) => {
  if (frequencies.length < 2) return 0;
  const bins = new Array(12).fill(0);
  frequencies.forEach((freq) => {
    const midiLike = 69 + 12 * Math.log2(freq / 440);
    const index = ((Math.round(midiLike) % 12) + 12) % 12;
    bins[index] += 1;
  });
  const total = frequencies.length;
  let entropy = 0;
  bins.forEach((count) => {
    if (count <= 0) return;
    const probability = count / total;
    entropy -= probability * Math.log2(probability);
  });
  return clamp01(entropy / Math.log2(12));
};

const intervalCohesion = (frequencies: number[]) => {
  if (frequencies.length < 2) return 0;
  const sample = frequencies.slice(0, 18);
  let score = 0;
  let pairs = 0;
  for (let i = 0; i < sample.length; i += 1) {
    for (let j = i + 1; j < sample.length; j += 1) {
      const hi = Math.max(sample[i], sample[j]);
      const lo = Math.max(EPS, Math.min(sample[i], sample[j]));
      const ratio = hi / lo;
      const ratioInOctave = ratio > 2 ? ratio / Math.pow(2, Math.floor(Math.log2(ratio))) : ratio;
      let bestDistance = Number.POSITIVE_INFINITY;
      SIMPLE_INTERVALS.forEach((target) => {
        const distance = Math.abs(Math.log2(ratioInOctave / target));
        if (distance < bestDistance) bestDistance = distance;
      });
      score += 1 - clamp01(bestDistance / 0.1);
      pairs += 1;
    }
  }
  return pairs > 0 ? clamp01(score / pairs) : 0;
};

const closePairDensity = (particles: ParticleVoiceSnapshot[], bounds: Bounds2D) => {
  if (particles.length < 2) return { closePairs: 0, densityPeak: 0, clusterCount: particles.length };
  const sample = particles.slice(0, 72);
  const diag = Math.max(1, Math.hypot(bounds.width, bounds.height));
  const nearThreshold = diag * 0.09;
  let closePairs = 0;
  let maxNeighbors = 0;
  const gridSize = 6;
  const occupied = new Set<string>();

  for (let i = 0; i < sample.length; i += 1) {
    let neighbors = 0;
    const a = sample[i];
    const cellX = clamp(Math.floor((a.x / Math.max(1, bounds.width)) * gridSize), 0, gridSize - 1);
    const cellY = clamp(Math.floor((a.y / Math.max(1, bounds.height)) * gridSize), 0, gridSize - 1);
    occupied.add(`${cellX}:${cellY}`);
    for (let j = i + 1; j < sample.length; j += 1) {
      const b = sample[j];
      if (hypot(a.x - b.x, a.y - b.y) <= nearThreshold) {
        closePairs += 1;
        neighbors += 1;
      }
    }
    if (neighbors > maxNeighbors) maxNeighbors = neighbors;
  }

  const densityPeak = clamp01(maxNeighbors / Math.max(1, sample.length / 2));
  return {
    closePairs,
    densityPeak,
    clusterCount: Math.max(1, occupied.size),
  };
};

const recurrenceHint = (history: MemoryPoint[], currentVector: number[], time: number) => {
  if (history.length < 3) return 0;
  let bestSimilarity = 0;
  for (const point of history) {
    const age = time - point.time;
    if (age < 0.7 || age > 8) continue;
    let dot = 0;
    let aMag = 0;
    let bMag = 0;
    for (let i = 0; i < currentVector.length; i += 1) {
      dot += currentVector[i] * point.vector[i];
      aMag += currentVector[i] * currentVector[i];
      bMag += point.vector[i] * point.vector[i];
    }
    const similarity = dot / Math.max(EPS, Math.sqrt(aMag * bMag));
    if (similarity > bestSimilarity) bestSimilarity = similarity;
  }
  return clamp01((bestSimilarity - 0.55) / 0.45);
};

const differenceScore = (current: number[], target: number[] | null) => {
  if (!target || current.length !== target.length) return 0;
  let sum = 0;
  for (let i = 0; i < current.length; i += 1) {
    sum += Math.abs(current[i] - target[i]);
  }
  return clamp01(sum / current.length);
};

export class SwarmAnalyser {
  private memory: InternalMemory = {
    previousTime: null,
    previousCount: 0,
    previousCenter: null,
    previousEnergy: 0,
    shortVector: null,
    midVector: null,
    history: [],
  };

  update(frame: ParticleFrameInput, params: SchwarmdeuterParams): SwarmState {
    const particles = frame.particles ?? [];
    const bounds = frame.bounds ?? DEFAULT_BOUNDS;
    const dt = frame.dt ?? (this.memory.previousTime === null ? 1 / 60 : Math.max(1 / 240, frame.time - this.memory.previousTime));
    const time = frame.time;

    const activeCount = particles.length;
    const diag = Math.max(1, hypot(bounds.width, bounds.height));

    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;
    let meanVx = 0;
    let meanVy = 0;
    let meanSpeed = 0;
    let energySum = 0;
    const frequencies: number[] = [];

    particles.forEach((particle) => {
      const weight = normalizedParticleEnergy(particle);
      const speed = hypot(particle.vx, particle.vy);
      totalWeight += weight;
      weightedX += particle.x * weight;
      weightedY += particle.y * weight;
      meanVx += particle.vx * weight;
      meanVy += particle.vy * weight;
      meanSpeed += speed * weight;
      energySum += weight;
      const hz = getPitchHz(particle);
      if (hz !== null) frequencies.push(hz);
    });

    const safeWeight = Math.max(EPS, totalWeight);
    meanVx /= safeWeight;
    meanVy /= safeWeight;
    meanSpeed /= safeWeight;

    const centerOfMassX = activeCount > 0 ? weightedX / safeWeight : bounds.width * 0.5;
    const centerOfMassY = activeCount > 0 ? weightedY / safeWeight : bounds.height * 0.5;

    let directionMagnitude = 0;
    let speedVariance = 0;
    let dispersion = 0;
    let orbitalityAccumulator = 0;
    particles.forEach((particle) => {
      const weight = normalizedParticleEnergy(particle);
      const speed = hypot(particle.vx, particle.vy);
      if (speed > EPS) {
        directionMagnitude += ((particle.vx / speed) * meanVx + (particle.vy / speed) * meanVy) * weight;
      }
      speedVariance += weight * Math.pow(speed - meanSpeed, 2);
      const dx = particle.x - centerOfMassX;
      const dy = particle.y - centerOfMassY;
      dispersion += weight * hypot(dx, dy);
      const denom = Math.max(EPS, hypot(dx, dy) * speed);
      orbitalityAccumulator += weight * Math.abs((dx * particle.vy - dy * particle.vx) / denom);
    });

    speedVariance /= safeWeight;
    dispersion = activeCount > 0 ? dispersion / safeWeight : 0;
    const directionCoherence = activeCount > 0 ? clamp01(hypot(meanVx, meanVy) / Math.max(EPS, meanSpeed + Math.sqrt(speedVariance))) : 0;
    const normalizedDispersion = clamp01(dispersion / (diag * 0.42));
    const orbitality = activeCount > 0 ? clamp01(orbitalityAccumulator / safeWeight) : 0;

    const centerDrift = this.memory.previousCenter
      ? clamp01(hypot(centerOfMassX - this.memory.previousCenter.x, centerOfMassY - this.memory.previousCenter.y) / Math.max(EPS, dt * diag * 0.35))
      : 0;

    const { closePairs, densityPeak, clusterCount } = closePairDensity(particles, bounds);
    const collisionImpulseSum = particles.reduce((sum, particle) => sum + Math.max(0, particle.collisionImpulse ?? 0), 0);
    const collisionRate = clamp01((closePairs / Math.max(EPS, activeCount * 6)) * 0.75 + collisionImpulseSum / Math.max(EPS, activeCount * 6));

    const spawnByFlag = particles.reduce((sum, particle) => sum + (particle.justSpawned ? 1 : 0), 0);
    const spawnDelta = Math.max(0, activeCount - this.memory.previousCount);
    const spawnRate = clamp01((spawnByFlag > 0 ? spawnByFlag : spawnDelta) / Math.max(1, activeCount * dt * 2.5));

    const entropy = pitchEntropy(frequencies);
    const interval = intervalCohesion(frequencies);
    const spectralCentroidHz = frequencies.length
      ? clamp(
          frequencies.reduce((sum, value) => sum + value, 0) / frequencies.length,
          70,
          4000,
        )
      : 220;

    const meanEnergy = activeCount > 0 ? energySum / activeCount : 0;
    const energySlope = clamp((meanEnergy - this.memory.previousEnergy) / Math.max(EPS, dt), -1, 1);

    const currentVector = [
      clamp01(activeCount / 48),
      spawnRate,
      collisionRate,
      clamp01(meanSpeed / 520),
      clamp01(speedVariance / (320 * 320)),
      directionCoherence,
      normalizedDispersion,
      densityPeak,
      clamp01(clusterCount / 16),
      entropy,
      interval,
      clamp01(energySlope * 0.5 + 0.5),
      orbitality,
      centerDrift,
    ];

    const recurrence = recurrenceHint(this.memory.history, currentVector, time);
    const shortDifference = differenceScore(currentVector, this.memory.shortVector);
    const midDifference = differenceScore(currentVector, this.memory.midVector);
    const stability = 1 - clamp01(0.6 * shortDifference + 0.4 * midDifference);

    const density = clamp01((1 - normalizedDispersion) * 0.45 + densityPeak * 0.35 + clamp01(activeCount / 48) * 0.2);
    const cohesion = clamp01(
      directionCoherence * 0.36 +
        density * 0.28 +
        interval * 0.18 +
        (1 - clamp01(clusterCount / 16)) * 0.08 +
        stability * 0.1,
    );
    const turbulence = clamp01(
      clamp01(speedVariance / (260 * 260)) * 0.34 +
        (1 - directionCoherence) * 0.22 +
        collisionRate * 0.18 +
        centerDrift * 0.14 +
        clamp01(energySlope * 0.5 + 0.5) * 0.12,
    );
    const crystallization = clamp01(
      (1 - entropy) * 0.42 + interval * 0.34 + density * 0.14 + stability * 0.1,
    );

    const positiveSlope = clamp01((energySlope + 0.15) / 0.55);
    const pressure = clamp01(density * 0.38 + collisionRate * 0.24 + spawnRate * 0.16 + positiveSlope * 0.22);

    const sensitivityBoost = lerp(0.75, 1.55, params.sensitivity);
    const fracture = clamp01(
      smoothstep(clamp01((shortDifference * 0.58 + midDifference * 0.42) * sensitivityBoost)) * 0.82 + recurrence * 0.18,
    );

    const descriptors: SwarmDescriptorVector = {
      cohesion,
      turbulence,
      crystallization,
      pressure,
      fracture,
      orbitality,
      recurrence: clamp01(recurrence * 0.7 + stability * 0.15 + (1 - fracture) * 0.15),
    };

    const raw: SwarmRawMetrics = {
      activeCount,
      spawnRate,
      collisionRate,
      meanSpeed,
      speedVariance,
      directionCoherence,
      centerOfMassX,
      centerOfMassY,
      centerDrift,
      normalizedDispersion,
      localDensityPeak: densityPeak,
      clusterCount,
      pitchEntropy: entropy,
      intervalCohesion: interval,
      topologyStability: stability,
      energySlope,
      orbitality,
      recurrenceHint: recurrence,
      spectralCentroidHz,
    };

    const shortTau = lerp(0.24, 0.9, clamp01(params.memorySeconds / 3));
    const midTau = lerp(0.9, 3.2, clamp01(params.memorySeconds / 4));
    const shortAlpha = emaAlpha(dt, shortTau);
    const midAlpha = emaAlpha(dt, midTau);
    this.memory.shortVector = this.memory.shortVector
      ? this.memory.shortVector.map((value, index) => lerp(value, currentVector[index], shortAlpha))
      : [...currentVector];
    this.memory.midVector = this.memory.midVector
      ? this.memory.midVector.map((value, index) => lerp(value, currentVector[index], midAlpha))
      : [...currentVector];

    this.memory.history.push({ time, vector: [...currentVector] });
    this.memory.history = this.memory.history.filter((point) => time - point.time <= 10);
    this.memory.previousTime = time;
    this.memory.previousCount = activeCount;
    this.memory.previousCenter = { x: centerOfMassX, y: centerOfMassY };
    this.memory.previousEnergy = meanEnergy;

    return { time, dt, raw, descriptors };
  }
}
