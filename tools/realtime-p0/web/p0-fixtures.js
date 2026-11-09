export const P0_PROFILE = Object.freeze({
  sampleRate: 48000,
  channels: 2,
  voiceSlots: 16,
  tailSlots: 4,
  tokenSlots: 128,
  pendingGroups: 64,
  maxBlockFrames: 256,
  leaseMs: 1500,
  heartbeatMs: 250,
});

export function webAudioLowpassCoefficients(sampleRate, cutoffHz, qDb) {
  const f0 = Math.min(sampleRate * 0.499, Math.max(1, cutoffHz));
  const omega = 2 * Math.PI * f0 / sampleRate;
  const cos = Math.cos(omega);
  const sin = Math.sin(omega);
  const alpha = sin / (2 * Math.pow(10, qDb / 20));
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

export function legacy323Envelope(sampleRate, durationSeconds, heldLong = false) {
  const actualDur = heldLong ? durationSeconds * 6 : durationSeconds;
  const attackDur = Math.min(0.032, Math.max(0.005, actualDur * 0.18));
  const releaseDur = Math.min(0.14, Math.max(0.03, actualDur * 0.42));
  const releaseStart = Math.max(attackDur + 0.006, actualDur - releaseDur);
  const releaseTimeConstant = Math.max(0.01, releaseDur * 0.34);
  const stopSeconds = releaseStart + releaseDur + 0.08;
  return {
    actualDur,
    attackDur,
    releaseDur,
    releaseStart,
    releaseTimeConstant,
    stopSeconds,
    attackFrames: Math.max(1, Math.round(attackDur * sampleRate)),
    releaseStartFrames: Math.max(1, Math.round(releaseStart * sampleRate)),
    stopFrames: Math.max(2, Math.round(stopSeconds * sampleRate)),
    releaseCoef: Math.exp(-1 / (releaseTimeConstant * sampleRate)),
    maxLatenessSeconds: Math.max(0.018, Math.min(0.09, actualDur * 0.4 + attackDur)),
  };
}

export function gatedEnvelope(sampleRate) {
  return {
    attackFrames: Math.max(1, Math.round(0.032 * sampleRate)),
    releaseFrames: Math.max(1, Math.round(0.03 * sampleRate)),
    panicFrames: Math.max(1, Math.round(0.005 * sampleRate)),
  };
}

export const P0_PROGRAM_STEPS = Object.freeze([
  [[1, 0.024], [1.5, 0.018], [2, 0.014]],
  [],
  [[1.5, 0.02]],
  [],
  [[1, 0.024], [2, 0.014]],
  [],
  [[1.5, 0.02]],
  [],
  [[1, 0.024], [1.5, 0.018], [2, 0.014]],
  [],
  [[2, 0.018]],
  [],
  [[1.5, 0.02]],
  [],
  [[1, 0.024]],
  [],
]);

export function makeLegacyNote(sampleRate, tokenSlot, tokenGeneration, frequencyHz, heldLong = false, peak = 0.04, cutoffHz = 2400, qDb = 1) {
  const env = legacy323Envelope(sampleRate, 0.18, heldLong);
  const coeff = webAudioLowpassCoefficients(sampleRate, cutoffHz, qDb);
  return {
    tokenSlot,
    tokenGeneration,
    kind: 1,
    frequencyHz,
    peak,
    ...coeff,
    attackFrames: env.attackFrames,
    releaseStartFrames: env.releaseStartFrames,
    stopFrames: env.stopFrames,
    releaseCoef: env.releaseCoef,
  };
}

export function makeGatedNote(sampleRate, tokenSlot, tokenGeneration, frequencyHz, peak = 0.04, cutoffHz = 2400, qDb = 1) {
  const env = gatedEnvelope(sampleRate);
  const coeff = webAudioLowpassCoefficients(sampleRate, cutoffHz, qDb);
  return {
    tokenSlot,
    tokenGeneration,
    kind: 2,
    frequencyHz,
    peak,
    ...coeff,
    attackFrames: env.attackFrames,
    releaseStartFrames: 0xffffffff,
    stopFrames: 0xffffffff,
    releaseCoef: 1,
  };
}
