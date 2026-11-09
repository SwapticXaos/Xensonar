import { describe, expect, it } from "vitest";

import { CANVAS_WIDTH } from "../../../shared/canvasConstants";
import { DRONE_MAX_FREQ, DRONE_MIN_FREQ } from "../../resonance/config/constants";
import { planSequencerStep } from "../drumBassScheduler";
import { buildHyperPatternContext, deriveStepTiming } from "../policy";

type SequencerParams = Parameters<typeof planSequencerStep>[0]["params"];

const createParams = (overrides: Partial<SequencerParams> = {}): SequencerParams => ({
  quantizeSubdivision: "16",
  quantizeBpm: 120,
  quantizeMicroTightness: 0.4,
  hyperCalibrateOn: false,
  hyperCalibratedReady: false,
  hyperCalibratedPattern: [],
  hyperCali2On: false,
  hyperCali2Ready: false,
  hyperCali2Weights64: [],
  hyperCali2PitchOffsets: [],
  bassRootMode: "fixed",
  bassRootHz: 110,
  bassVolume: 0.7,
  bassActive: true,
  bassPattern: "walking",
  drumActive: true,
  drumPattern: "four_on_floor",
  drumVolume: 0.8,
  harmonyCascadeSteps: 2,
  particleSystem: "ji",
  ...overrides,
});

const buildPatterns = (params: SequencerParams) =>
  buildHyperPatternContext({
    hyperCalibrateOn: params.hyperCalibrateOn,
    hyperCalibratedReady: params.hyperCalibratedReady,
    hyperCalibratedPattern: params.hyperCalibratedPattern,
    hyperCali2On: params.hyperCali2On,
    hyperCali2Ready: params.hyperCali2Ready,
    hyperCali2Weights64: params.hyperCali2Weights64,
    hyperCali2PitchOffsets: params.hyperCali2PitchOffsets,
  });

const clampFreq = (freq: number, min = 35, max = 520) => Math.min(max, Math.max(min, freq));

describe("drum/bass scheduler adapter plan", () => {
  it("plans kick + walking bass + cascade events on a bar anchor", () => {
    const params = createParams({ harmonyCascadeSteps: 3 });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 8, // baseStep=8, four-on-floor kick + walking bass interval
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });

    expect(plan.drum?.kickVol).toBeGreaterThan(0);
    expect(plan.drum?.snareVol).toBeUndefined();
    expect(plan.drum?.hatVol).toBeUndefined();

    expect(plan.bass?.freq).toBeCloseTo(161.3, 1);
    expect(plan.bass?.dur).toBeGreaterThan(0.13);
    expect(plan.bass?.vol).toBeCloseTo(params.bassVolume);

    expect(plan.cascadePlan).toHaveLength(3);
    expect(plan.cascadePlan[0].leadFreq).toBeGreaterThan(plan.cascadePlan[0].bassFreq);
    expect(plan.cascadePlan[0].time).toBeGreaterThanOrEqual(plan.nextNoteTime);
  });

  it("suppresses events on tight microsteps with weak long-pattern weight", () => {
    const params = createParams({
      quantizeSubdivision: "64",
      quantizeMicroTightness: 0.92,
      hyperCali2On: true,
      hyperCali2Ready: true,
      hyperCali2Weights64: Array(64).fill(0.05),
      hyperCali2PitchOffsets: Array(64).fill(0),
      bassPattern: "offbeat",
      harmonyCascadeSteps: 2,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 2, // microstep with low hyper2 weight
      cursorX: 400,
      cursorY: 120,
      gameWidth: 800,
      freqFromY: () => 180,
      clampFreq,
    });

    expect(plan.drum).toBeUndefined();
    expect(plan.bass).toBeNull();
    expect(plan.cascadePlan).toHaveLength(0);
  });

  it("returns empty cascade plan when harmonyCascadeSteps is 0", () => {
    const params = createParams({ harmonyCascadeSteps: 0, bassActive: true });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 0,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });

    expect(plan.cascadePlan).toHaveLength(0);
  });

  it("produces valid step timing at BPM boundaries 30 and 240 (aligns with resonance quantizeBpm clamp)", () => {
    const at30 = deriveStepTiming(30, "16");
    const at240 = deriveStepTiming(240, "16");
    expect(Number.isFinite(at30.stepSeconds)).toBe(true);
    expect(at30.stepSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(at240.stepSeconds)).toBe(true);
    expect(at240.stepSeconds).toBeGreaterThan(0);
    expect(at30.stepSeconds).toBeGreaterThan(at240.stepSeconds);
  });

  it("produces valid plan at BPM 30 (constraint boundary) so adapter stays safe when resonance applies 30–240 clamp", () => {
    const params = createParams({ quantizeBpm: 30, bassActive: true, drumActive: true, harmonyCascadeSteps: 2 });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);
    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 8,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    expect(Number.isFinite(timing.stepSeconds)).toBe(true);
    expect(timing.stepSeconds).toBeGreaterThan(0);
    expect(plan.nextNoteTime).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(plan.nextNoteTime)).toBe(true);
    if (plan.bass) {
      expect(Number.isFinite(plan.bass.freq)).toBe(true);
      expect(Number.isFinite(plan.bass.dur)).toBe(true);
      expect(Number.isFinite(plan.bass.vol)).toBe(true);
    }
    plan.cascadePlan.forEach((c) => {
      expect(Number.isFinite(c.leadFreq)).toBe(true);
      expect(Number.isFinite(c.bassFreq)).toBe(true);
      expect(Number.isFinite(c.time)).toBe(true);
    });
  });

  it("produces valid step timing at subdivision boundaries 32 and 64 (all QuantizeSubdivision values)", () => {
    const at32_120 = deriveStepTiming(120, "32");
    const at64_120 = deriveStepTiming(120, "64");
    expect(Number.isFinite(at32_120.stepSeconds)).toBe(true);
    expect(at32_120.stepSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(at64_120.stepSeconds)).toBe(true);
    expect(at64_120.stepSeconds).toBeGreaterThan(0);
    expect(at64_120.stepSeconds).toBeLessThan(at32_120.stepSeconds);
    expect(at32_120.stepsPerBar).toBe(32);
    expect(at64_120.stepsPerBar).toBe(64);
  });

  it("produces valid plan when quantizeMicroTightness at boundaries 0 and 1 (aligns with resonance constraint)", () => {
    const at0 = createParams({
      quantizeMicroTightness: 0,
      bassActive: true,
      drumActive: true,
      harmonyCascadeSteps: 2,
    });
    const at1 = createParams({
      quantizeMicroTightness: 1,
      bassActive: true,
      drumActive: true,
      harmonyCascadeSteps: 2,
    });
    const timing0 = deriveStepTiming(at0.quantizeBpm, at0.quantizeSubdivision);
    const timing1 = deriveStepTiming(at1.quantizeBpm, at1.quantizeSubdivision);
    const plan0 = planSequencerStep({
      params: at0,
      timing: timing0,
      patternContext: buildPatterns(at0),
      nextStep: 8,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    const plan1 = planSequencerStep({
      params: at1,
      timing: timing1,
      patternContext: buildPatterns(at1),
      nextStep: 8,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    expect(Number.isFinite(plan0.nextNoteTime)).toBe(true);
    expect(plan0.nextNoteTime).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(plan1.nextNoteTime)).toBe(true);
    expect(plan1.nextNoteTime).toBeGreaterThanOrEqual(0);
    if (plan0.bass) {
      expect(Number.isFinite(plan0.bass.freq)).toBe(true);
      expect(Number.isFinite(plan0.bass.vol)).toBe(true);
      expect(Number.isFinite(plan0.bass.dur)).toBe(true);
    }
    if (plan1.bass) {
      expect(Number.isFinite(plan1.bass.freq)).toBe(true);
      expect(Number.isFinite(plan1.bass.vol)).toBe(true);
      expect(Number.isFinite(plan1.bass.dur)).toBe(true);
    }
  });

  it("uses fixed bass root when bassRootMode is fixed (bass freq in sensible range)", () => {
    const params = createParams({
      bassRootMode: "fixed",
      bassRootHz: 82.5,
      bassActive: true,
      harmonyCascadeSteps: 2,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);
    const freqFromYStub = () => 999;

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 0,
      cursorX: 400,
      cursorY: 100,
      gameWidth: CANVAS_WIDTH,
      freqFromY: freqFromYStub,
      clampFreq,
    });

    expect(plan.bass?.freq).toBeDefined();
    expect(plan.bass!.freq).toBeGreaterThan(0);
    expect(plan.bass!.freq).toBeLessThanOrEqual(520);
    expect(plan.bass!.freq).toBeGreaterThanOrEqual(35);
    if (plan.cascadePlan.length > 0) {
      expect(plan.cascadePlan[0].bassFreq).toBeGreaterThan(0);
      expect(plan.cascadePlan[0].bassFreq).toBeLessThanOrEqual(520);
    }
  });

  it("uses fixed bass root value in plan (walking step 0: root * applyLongPatternPitchOffset)", () => {
    const bassRootHz = 82.5;
    const params = createParams({
      bassRootMode: "fixed",
      bassRootHz,
      bassActive: true,
      bassPattern: "walking",
      harmonyCascadeSteps: 0,
      hyperCali2On: false,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 0,
      cursorX: 400,
      cursorY: 100,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 999,
      clampFreq,
    });

    expect(plan.bass).not.toBeNull();
    expect(plan.bass!.freq).toBeDefined();
    const expectedRoot = bassRootHz * (0.94 + 1 * 0.16);
    expect(plan.bass!.freq).toBeCloseTo(expectedRoot, 1);
  });

  it("produces valid plan when bassRootHz at DRONE_MIN_FREQ and DRONE_MAX_FREQ (constraint boundary integration)", () => {
    const atMin = createParams({
      bassRootMode: "fixed",
      bassRootHz: DRONE_MIN_FREQ,
      bassActive: true,
      harmonyCascadeSteps: 1,
    });
    const atMax = createParams({
      bassRootMode: "fixed",
      bassRootHz: DRONE_MAX_FREQ,
      bassActive: true,
      harmonyCascadeSteps: 1,
    });
    const timingMin = deriveStepTiming(atMin.quantizeBpm, atMin.quantizeSubdivision);
    const timingMax = deriveStepTiming(atMax.quantizeBpm, atMax.quantizeSubdivision);
    const planMin = planSequencerStep({
      params: atMin,
      timing: timingMin,
      patternContext: buildPatterns(atMin),
      nextStep: 0,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    const planMax = planSequencerStep({
      params: atMax,
      timing: timingMax,
      patternContext: buildPatterns(atMax),
      nextStep: 0,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    expect(planMin.bass?.freq).toBeDefined();
    expect(planMin.bass!.freq).toBeGreaterThanOrEqual(35);
    expect(planMin.bass!.freq).toBeLessThanOrEqual(520);
    expect(planMax.bass?.freq).toBeDefined();
    expect(planMax.bass!.freq).toBeGreaterThanOrEqual(35);
    expect(planMax.bass!.freq).toBeLessThanOrEqual(520);
  });

  it("uses cursor-driven root when bassRootMode is auto", () => {
    const params = createParams({
      bassRootMode: "auto",
      bassRootHz: 110,
      bassActive: true,
      harmonyCascadeSteps: 1,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);
    const cursorFreq = 176;
    const freqFromYStub = () => cursorFreq;

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 0,
      cursorX: 500,
      cursorY: 180,
      gameWidth: CANVAS_WIDTH,
      freqFromY: freqFromYStub,
      clampFreq,
    });

    expect(plan.bass?.freq).toBeDefined();
    expect(plan.bass!.freq).toBeGreaterThan(0);
    expect(plan.bass!.freq).toBeLessThanOrEqual(520);
  });

  it("caps cascade plan length at harmonyCascadeSteps", () => {
    const params = createParams({ harmonyCascadeSteps: 5, bassActive: true });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 8,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });

    expect(plan.cascadePlan.length).toBeLessThanOrEqual(5);
    expect(plan.cascadePlan.length).toBeGreaterThanOrEqual(0);
  });

  it("suppresses drum and bass when hyper pattern has 0 at base step (gate closed)", () => {
    const params = createParams({
      hyperCalibrateOn: true,
      hyperCalibratedReady: true,
      hyperCalibratedPattern: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      bassActive: true,
      drumActive: true,
      harmonyCascadeSteps: 1,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 0,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });

    expect(plan.drum).toBeUndefined();
    expect(plan.bass).toBeNull();
    expect(plan.cascadePlan).toHaveLength(0);
  });

  it("returns empty plan when both drum and bass are inactive", () => {
    const params = createParams({
      drumActive: false,
      bassActive: false,
      harmonyCascadeSteps: 2,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 8,
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });

    expect(plan.drum).toBeUndefined();
    expect(plan.bass).toBeNull();
    expect(plan.cascadePlan).toHaveLength(0);
  });

  it("returns cascade plan from drum anchor when bass is inactive (cursor-driven root)", () => {
    const params = createParams({
      bassActive: false,
      drumActive: true,
      harmonyCascadeSteps: 2,
      drumPattern: "four_on_floor",
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);
    const cursorFreq = 165;
    const freqFromYStub = () => cursorFreq;

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 8, // quarter anchor -> isDrumCascadeAnchor true
      cursorX: 550,
      cursorY: 180,
      gameWidth: CANVAS_WIDTH,
      freqFromY: freqFromYStub,
      clampFreq,
    });

    expect(plan.bass).toBeNull();
    expect(plan.drum?.kickVol).toBeGreaterThan(0);
    expect(plan.cascadePlan.length).toBeGreaterThan(0);
    expect(plan.cascadePlan.length).toBeLessThanOrEqual(2);
    if (plan.cascadePlan[0]) {
      expect(plan.cascadePlan[0].bassFreq).toBeGreaterThan(0);
      expect(plan.cascadePlan[0].leadFreq).toBeGreaterThan(0);
    }
  });

  it("returns cascade plan from bass anchor when drum is inactive (bass-only cascade root)", () => {
    const params = createParams({
      drumActive: false,
      bassActive: true,
      bassPattern: "walking",
      harmonyCascadeSteps: 2,
      bassRootMode: "fixed",
      bassRootHz: 82.5,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 0, // walking bass triggers at baseStep % 4 === 0
      cursorX: 550,
      cursorY: 200,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });

    expect(plan.drum).toBeUndefined();
    expect(plan.bass).not.toBeNull();
    expect(plan.bass!.freq).toBeGreaterThan(0);
    expect(plan.cascadePlan.length).toBeGreaterThan(0);
    expect(plan.cascadePlan.length).toBeLessThanOrEqual(2);
    if (plan.cascadePlan[0]) {
      expect(plan.cascadePlan[0].bassFreq).toBeGreaterThan(0);
      expect(plan.cascadePlan[0].leadFreq).toBeGreaterThan(0);
    }
  });

  it("plans valid step at 64 subdivision and BPM 240 (upper bound; vision §5 robust scheduling)", () => {
    const params = createParams({
      quantizeSubdivision: "64",
      quantizeBpm: 240,
      bassActive: true,
      drumActive: true,
      harmonyCascadeSteps: 2,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);
    expect(timing.stepSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(timing.stepSeconds)).toBe(true);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 16,
      cursorX: 400,
      cursorY: 250,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    expect(plan).toBeDefined();
    expect(plan.cascadePlan).toBeDefined();
    expect(Array.isArray(plan.cascadePlan)).toBe(true);
  });

  it("plans valid step at 16 subdivision and BPM 30 (lower bound; vision §5 robust scheduling)", () => {
    const params = createParams({
      quantizeSubdivision: "16",
      quantizeBpm: 30,
      bassActive: true,
      drumActive: true,
      harmonyCascadeSteps: 1,
    });
    const timing = deriveStepTiming(params.quantizeBpm, params.quantizeSubdivision);
    const patternContext = buildPatterns(params);
    expect(timing.stepSeconds).toBeGreaterThan(0);
    expect(Number.isFinite(timing.stepSeconds)).toBe(true);

    const plan = planSequencerStep({
      params,
      timing,
      patternContext,
      nextStep: 4,
      cursorX: 400,
      cursorY: 250,
      gameWidth: CANVAS_WIDTH,
      freqFromY: () => 220,
      clampFreq,
    });
    expect(plan).toBeDefined();
    expect(plan.cascadePlan).toBeDefined();
    expect(Array.isArray(plan.cascadePlan)).toBe(true);
  });
});
