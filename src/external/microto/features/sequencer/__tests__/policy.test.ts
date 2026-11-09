import { describe, expect, it } from "vitest";

import { CANVAS_WIDTH } from "../../../shared/canvasConstants";
import {
  applyLongPatternPitchOffset,
  buildHarmonyCascadePlan,
  buildHyperPatternContext,
  computeSequencerStepState,
  deriveStepTiming,
  quantizeSubFactor,
  resolveComposerRootHz,
} from "../policy";

describe("sequencer policy helpers", () => {
  const basePatterns = buildHyperPatternContext({
    hyperCalibrateOn: false,
    hyperCalibratedReady: false,
    hyperCalibratedPattern: [],
    hyperCali2On: false,
    hyperCali2Ready: false,
    hyperCali2Weights64: [],
    hyperCali2PitchOffsets: [],
  });

  it("derives timing from bpm and subdivision", () => {
    const timing = deriveStepTiming(120, "32");
    expect(timing.subdivision).toBe("32");
    expect(timing.subFactor).toBe(quantizeSubFactor("32"));
    expect(timing.stepsPerBar).toBe(32);
    expect(timing.stepSeconds).toBeCloseTo(0.0625, 6);
  });

  it("returns finite positive stepSeconds for edge BPM 0 and negative (clamp path; scheduler guard)", () => {
    // quantizeStepSeconds uses clamp(bpm, QUANTIZE_BPM_MIN, QUANTIZE_BPM_MAX). So 0 and negative
    // are clamped to 30; we get finite positive stepSeconds. Locks sequencer timing contract.
    const atZero = deriveStepTiming(0, "16");
    const atNegative = deriveStepTiming(-100, "16");
    expect(Number.isFinite(atZero.stepSeconds)).toBe(true);
    expect(atZero.stepSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(atNegative.stepSeconds)).toBe(true);
    expect(atNegative.stepSeconds).toBeGreaterThan(0);
    expect(atZero.stepsPerBar).toBeGreaterThan(0);
    expect(atNegative.stepsPerBar).toBeGreaterThan(0);
  });

  it("builds hyper pattern context only when toggles are on and ready", () => {
    const off = buildHyperPatternContext({
      hyperCalibrateOn: true,
      hyperCalibratedReady: false,
      hyperCalibratedPattern: [1, 0],
      hyperCali2On: true,
      hyperCali2Ready: false,
      hyperCali2Weights64: [0.1],
      hyperCali2PitchOffsets: [3],
    });
    expect(off.hyperPattern).toBeNull();
    expect(off.hyper2Pattern).toBeNull();
    expect(off.patternLen).toBe(16);
    expect(off.hyper2Len).toBe(64);

    const on = buildHyperPatternContext({
      hyperCalibrateOn: true,
      hyperCalibratedReady: true,
      hyperCalibratedPattern: [1, 0],
      hyperCali2On: true,
      hyperCali2Ready: true,
      hyperCali2Weights64: [0.1, 0.8],
      hyperCali2PitchOffsets: [2, -2],
    });
    expect(on.hyperPattern).toEqual([1, 0]);
    expect(on.hyper2Pattern).toEqual([0.1, 0.8]);
    expect(on.hyper2PitchOffsets).toEqual([2, -2]);
    expect(on.hyper2Len).toBe(2);
  });

  it("computes base step state with wide-open patterns", () => {
    const state = computeSequencerStepState({
      nextStep: 0,
      subFactor: 1,
      stepsPerBar: 16,
      grooveTightness: 0.4,
      patterns: basePatterns,
    });

    expect(state.baseStep).toBe(0);
    expect(state.isMicroStep).toBe(false);
    expect(state.finalHit).toBe(true);
    expect(state.finalNearHit).toBe(true);
    expect(state.heavyHitAllowed).toBe(true);
    expect(state.bassHitAllowed).toBe(true);
    expect(state.hatMicroGain).toBe(1);
  });

  it("gates micro hits when long-pattern weight is low and groove is tight", () => {
    const microSuppressed = computeSequencerStepState({
      nextStep: 2,
      subFactor: 4,
      stepsPerBar: 64,
      grooveTightness: 0.82,
      patterns: {
        hyperPattern: null,
        patternLen: 16,
        hyper2Pattern: Array(64).fill(0.12),
        hyper2PitchOffsets: null,
        hyper2Len: 64,
      },
    });

    expect(microSuppressed.isMicroStep).toBe(true);
    expect(microSuppressed.finalHit).toBe(false);
    expect(microSuppressed.finalNearHit).toBe(false);
    expect(microSuppressed.heavyHitAllowed).toBe(false);
    expect(microSuppressed.bassHitAllowed).toBe(false);
    expect(microSuppressed.hatMicroGain).toBeLessThan(0.5);
  });

  it("opens micro window when gate pattern aligns and weight is healthy", () => {
    const microOpen = computeSequencerStepState({
      nextStep: 18, // baseStep=4, subStep=2 with subFactor=4
      subFactor: 4,
      stepsPerBar: 64,
      grooveTightness: 0.2,
      patterns: {
        hyperPattern: null,
        patternLen: 16,
        hyper2Pattern: Array(64).fill(0.9),
        hyper2PitchOffsets: null,
        hyper2Len: 64,
      },
    });

    expect(microOpen.isMicroStep).toBe(true);
    expect(microOpen.finalHit).toBe(true);
    expect(microOpen.finalNearHit).toBe(true);
    expect(microOpen.heavyHitAllowed).toBe(true);
    expect(microOpen.bassHitAllowed).toBe(true);
    expect(microOpen.hatMicroGain).toBeGreaterThan(0.3);
  });

  it("suppresses heavy/bass hits on 32nd-note microsteps when groove is tight", () => {
    const microTight = computeSequencerStepState({
      nextStep: 1,
      subFactor: 2,
      stepsPerBar: 32,
      grooveTightness: 0.76,
      patterns: {
        hyperPattern: null,
        patternLen: 16,
        hyper2Pattern: Array(32).fill(0.6),
        hyper2PitchOffsets: null,
        hyper2Len: 32,
      },
    });

    expect(microTight.isMicroStep).toBe(true);
    expect(microTight.finalHit).toBe(false);
    expect(microTight.finalNearHit).toBe(true);
    expect(microTight.heavyHitAllowed).toBe(false);
    expect(microTight.bassHitAllowed).toBe(false);
    expect(microTight.hatMicroGain).toBeCloseTo(0.5, 2);
  });

  it("picks auto bass root from cursor when enabled", () => {
    const autoRoot = resolveComposerRootHz({
      bassRootMode: "auto",
      bassRootHz: 55,
      cursorY: 120,
      freqFromY: () => 220,
    });
    expect(autoRoot).toBeCloseTo(55, 3);

    const fixedRoot = resolveComposerRootHz({
      bassRootMode: "fixed",
      bassRootHz: 70,
      cursorY: 120,
      freqFromY: () => 220,
    });
    expect(fixedRoot).toBe(70);
  });

  it("applies long-pattern pitch offsets with weight shaping", () => {
    const pitched = applyLongPatternPitchOffset({
      rootHz: 110,
      longStepBase: 0,
      hyper2PitchOffsets: [2],
      longWeight: 0.5,
    });
    expect(pitched).toBeGreaterThan(120);
    expect(pitched).toBeLessThan(130);

    const clamped = applyLongPatternPitchOffset({
      rootHz: 110,
      longStepBase: 1,
      hyper2PitchOffsets: [20],
      longWeight: 0.1,
    });
    expect(clamped).toBeCloseTo(157.56, 2);
  });

  it("builds harmony cascade plans respecting bounds and steering", () => {
    const plan = buildHarmonyCascadePlan({
      harmonyCascadeSteps: 3,
      anchorTime: 1,
      rootHz: 110,
      baseStep: 0,
      longWeight: 0.8,
      ratios: [1, 1.25, 1.5, 1.75],
      cursorX: 550,
      gameWidth: CANVAS_WIDTH,
      stepSeconds: 0.5,
      bassVolume: 0.6,
      clampFreq: (freq, min = 35, max = 520) => Math.min(max, Math.max(min, freq)),
    });

    expect(plan).toHaveLength(3);
    expect(plan[0].time).toBeCloseTo(1.248, 3);
    expect(plan[0].bassFreq).toBeCloseTo(110, 3);
    expect(plan[0].bassVol).toBeGreaterThan(0.3);
    expect(plan[0].leadFreq).toBeGreaterThan(plan[0].bassFreq);
  });

  it("returns empty cascade plan when steps are zero or ratios missing", () => {
    expect(
      buildHarmonyCascadePlan({
        harmonyCascadeSteps: 0,
        anchorTime: 1,
        rootHz: 110,
        baseStep: 0,
        longWeight: 0.8,
        ratios: [],
        cursorX: 0,
        gameWidth: 100,
        stepSeconds: 0.5,
        bassVolume: 0.6,
        clampFreq: (freq) => freq,
      }),
    ).toEqual([]);
  });
});
