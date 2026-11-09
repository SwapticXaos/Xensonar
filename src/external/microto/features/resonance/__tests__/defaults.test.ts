import { describe, expect, it } from "vitest";

import { applyResonanceStateConstraints, createDefaultResonanceState } from "../config/defaults";
import { DEFAULT_SWARM_COUNT, DRONE_MAX_FREQ, DRONE_MIN_FREQ } from "../config/constants";
import {
  createDefaultWaveStartOvertoneMix,
  DEFAULT_OVERTONE_BY_PRESET,
  DRONE_JI_OVERTONES,
} from "../config/overtones";

describe("resonance defaults + constraints", () => {
  it("produces no NaN in numeric fields used by runtime (safe baseline)", () => {
    const state = createDefaultResonanceState();
    const numericKeys = Object.keys(state).filter(
      (k) => typeof (state as Record<string, unknown>)[k] === "number",
    ) as (keyof typeof state)[];
    for (const key of numericKeys) {
      const value = state[key] as number;
      expect(Number.isNaN(value), `default ${String(key)} must not be NaN`).toBe(false);
    }
    expect(state.agentVolumes.every((v) => !Number.isNaN(v))).toBe(true);
  });

  it("creates a playable baseline matching canonical defaults", () => {
    const state = createDefaultResonanceState();

    expect(state.gridBase).toBe(440);
    expect(state.particleVolume).toBe(0.3);
    expect(state.gridOn).toBe(true);
    expect(state.lockCursorToGrid).toBe(true);
    expect(state.quantizeOn).toBe(true);
    expect(state.quantizeSubdivision).toBe("16");
    expect(state.drumActive).toBe(true);
    expect(state.bassActive).toBe(false);
    expect(state.particleSystem).toBe("ji");
    expect(state.churchMode).toBe("lydian");
    expect(state.swarmCount).toBe(DEFAULT_SWARM_COUNT);
    expect(state.agentEnabled).toHaveLength(DEFAULT_SWARM_COUNT);
    expect(state.agentVolumes).toHaveLength(DEFAULT_SWARM_COUNT);
    expect(Object.keys(state.droneJIOvertonesByPreset)).toEqual(Object.keys(DEFAULT_OVERTONE_BY_PRESET));
    expect(Object.keys(state.droneJIOvertones)).toHaveLength(DRONE_JI_OVERTONES.length);
    expect(Object.keys(state.waveStartOvertones)).toHaveLength(DRONE_JI_OVERTONES.length);
    expect(state.droneOvertoneWaveform).toBe("sine");
    expect(state.waveStartWaveform).toBe("square");
  });

  it("sanitizes echoTempo to 50–2000 ms so preset load cannot leave invalid delay params", () => {
    const base = createDefaultResonanceState();
    const zero = applyResonanceStateConstraints(base, { echoTempo: 0 });
    const negative = applyResonanceStateConstraints(base, { echoTempo: -100 });
    const extreme = applyResonanceStateConstraints(base, { echoTempo: 99999 });
    const nan = applyResonanceStateConstraints(base, { echoTempo: NaN } as any);

    expect(zero.echoTempo).toBe(50);
    expect(negative.echoTempo).toBe(50);
    expect(extreme.echoTempo).toBe(2000);
    expect(nan.echoTempo).toBe(400);
  });

  it("sanitizes echoTempo Infinity/-Infinity so preset load cannot leave invalid delay params", () => {
    const base = createDefaultResonanceState();
    const inf = applyResonanceStateConstraints(base, { echoTempo: Infinity } as any);
    const negInf = applyResonanceStateConstraints(base, { echoTempo: -Infinity } as any);
    expect(inf.echoTempo).toBe(400);
    expect(negInf.echoTempo).toBe(400);
  });

  it("preserves echoTempo at exact boundaries 50 and 2000 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at50 = applyResonanceStateConstraints(base, { echoTempo: 50 });
    const at2000 = applyResonanceStateConstraints(base, { echoTempo: 2000 });
    expect(at50.echoTempo).toBe(50);
    expect(at2000.echoTempo).toBe(2000);
  });

  it("clamps numeric fields and normalizes agent vectors", () => {
    const constrained = applyResonanceStateConstraints(createDefaultResonanceState(), {
      gridBase: 4,
      cursorSpeed: 99,
      cursorGravity: -2,
      swarmWildness: 5,
      droneTimbre: 2,
      droneVibrato: -2,
      droneFlanger: 4,
      drumVolume: 5,
      bassVolume: -1,
      particleVolume: 3,
      particlePreset: "crystal_bowl",
      bassRootHz: DRONE_MAX_FREQ + 200,
      harmonyCascadeSteps: 99,
      quantizeBpm: 3,
      quantizeMicroTightness: 4,
      swarmCount: 100,
      agentEnabled: [false, true],
      agentVolumes: [2, -1],
    });

    expect(constrained.gridBase).toBeGreaterThanOrEqual(16);
    expect(constrained.cursorSpeed).toBeLessThanOrEqual(18);
    expect(constrained.cursorGravity).toBeGreaterThanOrEqual(0);
    expect(constrained.swarmWildness).toBeLessThanOrEqual(1.2);
    expect(constrained.droneTimbre).toBeLessThanOrEqual(1);
    expect(constrained.droneVibrato).toBeGreaterThanOrEqual(0);
    expect(constrained.droneFlanger).toBeLessThanOrEqual(1);
    expect(constrained.drumVolume).toBeLessThanOrEqual(1);
    expect(constrained.bassVolume).toBeGreaterThanOrEqual(0);
    expect(constrained.particleVolume).toBeLessThanOrEqual(0.24);
    expect(constrained.bassRootHz).toBeLessThanOrEqual(DRONE_MAX_FREQ);
    expect(constrained.bassRootHz).toBeGreaterThanOrEqual(DRONE_MIN_FREQ);
    expect(constrained.harmonyCascadeSteps).toBeLessThanOrEqual(12);
    expect(constrained.quantizeBpm).toBeGreaterThanOrEqual(30);
    expect(constrained.quantizeMicroTightness).toBeLessThanOrEqual(1);
    expect(constrained.swarmCount).toBe(48);
    expect(constrained.agentEnabled).toHaveLength(48);
    expect(constrained.agentVolumes).toHaveLength(48);
    expect(constrained.agentVolumes.every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(constrained.agentEnabled[0]).toBe(false);
  });

  it("fills overtone presets and matches current drone preset when missing data", () => {
    const constrained = applyResonanceStateConstraints(createDefaultResonanceState(), {
      dronePreset: "saxophon",
      droneJIOvertonesByPreset: { warm_pad: { Root: 1 } } as any,
      droneJIOvertones: undefined,
      particleSystem: "12edo",
      churchMode: "ionian",
      swarmCount: 7,
      agentEnabled: [false],
      agentVolumes: [0.5, 2, -1],
    });

    expect(constrained.droneJIOvertonesByPreset.saxophon).toBeDefined();
    expect(Object.keys(constrained.droneJIOvertones)).toHaveLength(DRONE_JI_OVERTONES.length);
    expect(constrained.agentEnabled).toHaveLength(7);
    expect(constrained.agentEnabled[0]).toBe(false);
    expect(constrained.agentVolumes[0]).toBeCloseTo(0.5);
    expect(constrained.agentVolumes[1]).toBe(1);
    expect(constrained.agentVolumes[2]).toBe(0);
  });

  it("guards against non-finite inputs and preserves sane minima", () => {
    const base = createDefaultResonanceState();
    const constrained = applyResonanceStateConstraints(base, {
      droneTimbre: Number.NaN,
      droneVibrato: Number.POSITIVE_INFINITY,
      particleVolume: Number.NaN,
      quantizeMicroTightness: Number.POSITIVE_INFINITY,
      swarmCount: 2,
      agentEnabled: undefined,
      agentVolumes: undefined,
    });

    expect(constrained.droneTimbre).toBe(0);
    expect(constrained.droneVibrato).toBe(0);
    expect(constrained.particleVolume).toBe(0);
    expect(constrained.quantizeMicroTightness).toBe(0);
    expect(constrained.swarmCount).toBe(4);
    expect(constrained.agentEnabled).toHaveLength(4);
    expect(constrained.agentVolumes).toHaveLength(4);
    expect(constrained.agentVolumes.every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(base.swarmCount).toBe(DEFAULT_SWARM_COUNT);
  });

  it("enforces gridBase minimum 16 and swarmCount bounds 4..48", () => {
    const base = createDefaultResonanceState();
    const low = applyResonanceStateConstraints(base, { gridBase: 1, swarmCount: 1 });
    const high = applyResonanceStateConstraints(base, { gridBase: 1000, swarmCount: 99 });
    expect(low.gridBase).toBe(16);
    expect(low.swarmCount).toBe(4);
    expect(high.swarmCount).toBe(48);
    expect(high.gridBase).toBe(1000);
  });

  it("preserves gridBase at exact minimum 16 so harmonic root and cursor interval stay valid at lower bound", () => {
    const base = createDefaultResonanceState();
    const at16 = applyResonanceStateConstraints(base, { gridBase: 16 });
    expect(at16.gridBase).toBe(16);
  });

  it("clamps gridBase 0 and negative to 16 so preset load cannot leave invalid harmonic root", () => {
    const base = createDefaultResonanceState();
    const zero = applyResonanceStateConstraints(base, { gridBase: 0 });
    const negative = applyResonanceStateConstraints(base, { gridBase: -100 });
    expect(zero.gridBase).toBe(16);
    expect(negative.gridBase).toBe(16);
  });

  it("preserves gridBase at high values (no upper clamp) so preset load and UI can set high harmonic root", () => {
    const base = createDefaultResonanceState();
    const high = applyResonanceStateConstraints(base, { gridBase: 20000 });
    expect(high.gridBase).toBe(20000);
  });

  it("clamps quantizeBpm to 30..240 for safe preset load and UI", () => {
    const base = createDefaultResonanceState();
    const low = applyResonanceStateConstraints(base, { quantizeBpm: 10 });
    const high = applyResonanceStateConstraints(base, { quantizeBpm: 300 });
    expect(low.quantizeBpm).toBe(30);
    expect(high.quantizeBpm).toBe(240);
  });

  it("preserves quantizeBpm at exact boundaries 30 and 240 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at30 = applyResonanceStateConstraints(base, { quantizeBpm: 30 });
    const at240 = applyResonanceStateConstraints(base, { quantizeBpm: 240 });
    expect(at30.quantizeBpm).toBe(30);
    expect(at240.quantizeBpm).toBe(240);
  });

  it("sanitizes quantizeBpm 0 and negative so preset load cannot leave invalid BPM", () => {
    const base = createDefaultResonanceState();
    const zero = applyResonanceStateConstraints(base, { quantizeBpm: 0 });
    const negative = applyResonanceStateConstraints(base, { quantizeBpm: -10 });
    expect(zero.quantizeBpm).toBe(30);
    expect(negative.quantizeBpm).toBe(30);
  });

  it("sanitizes bassRootHz NaN/Infinity so preset load cannot leave invalid value", () => {
    const base = createDefaultResonanceState();
    const nanBass = applyResonanceStateConstraints(base, { bassRootHz: NaN } as any);
    const infBass = applyResonanceStateConstraints(base, { bassRootHz: Infinity } as any);
    const negInfBass = applyResonanceStateConstraints(base, { bassRootHz: -Infinity } as any);
    expect(nanBass.bassRootHz).toBe(DRONE_MIN_FREQ);
    expect(infBass.bassRootHz).toBe(DRONE_MIN_FREQ);
    expect(negInfBass.bassRootHz).toBe(DRONE_MIN_FREQ);
  });

  it("sanitizes droneFlanger NaN/Infinity so preset load cannot leave invalid drone params", () => {
    const base = createDefaultResonanceState();
    const nanFlanger = applyResonanceStateConstraints(base, { droneFlanger: NaN } as any);
    const infFlanger = applyResonanceStateConstraints(base, { droneFlanger: Infinity } as any);
    expect(nanFlanger.droneFlanger).toBe(0);
    expect(infFlanger.droneFlanger).toBe(0);
  });

  it("preserves bassRootHz at exact boundaries DRONE_MIN_FREQ and DRONE_MAX_FREQ (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const atMin = applyResonanceStateConstraints(base, { bassRootHz: DRONE_MIN_FREQ });
    const atMax = applyResonanceStateConstraints(base, { bassRootHz: DRONE_MAX_FREQ });
    expect(atMin.bassRootHz).toBe(DRONE_MIN_FREQ);
    expect(atMax.bassRootHz).toBe(DRONE_MAX_FREQ);
  });

  it("clamps bassRootHz below DRONE_MIN_FREQ to DRONE_MIN_FREQ (preset load safety)", () => {
    const base = createDefaultResonanceState();
    const below = applyResonanceStateConstraints(base, { bassRootHz: DRONE_MIN_FREQ - 100 });
    const zero = applyResonanceStateConstraints(base, { bassRootHz: 0 });
    expect(below.bassRootHz).toBe(DRONE_MIN_FREQ);
    expect(zero.bassRootHz).toBe(DRONE_MIN_FREQ);
  });

  it("preserves harmonyCascadeSteps at exact boundaries 0 and 12 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at0 = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 0 });
    const at12 = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 12 });
    expect(at0.harmonyCascadeSteps).toBe(0);
    expect(at12.harmonyCascadeSteps).toBe(12);
  });

  it("preserves swarmCount at exact boundaries 4 and 48 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at4 = applyResonanceStateConstraints(base, { swarmCount: 4 });
    const at48 = applyResonanceStateConstraints(base, { swarmCount: 48 });
    expect(at4.swarmCount).toBe(4);
    expect(at48.swarmCount).toBe(48);
  });

  it("sanitizes swarmCount NaN/Infinity so preset load cannot leave invalid agent count", () => {
    const base = createDefaultResonanceState();
    const nan = applyResonanceStateConstraints(base, { swarmCount: NaN } as any);
    const inf = applyResonanceStateConstraints(base, { swarmCount: Infinity } as any);
    const negInf = applyResonanceStateConstraints(base, { swarmCount: -Infinity } as any);
    expect(nan.swarmCount).toBe(DEFAULT_SWARM_COUNT);
    expect(inf.swarmCount).toBe(DEFAULT_SWARM_COUNT);
    expect(negInf.swarmCount).toBe(DEFAULT_SWARM_COUNT);
    expect(nan.agentEnabled).toHaveLength(DEFAULT_SWARM_COUNT);
    expect(nan.agentVolumes).toHaveLength(DEFAULT_SWARM_COUNT);
  });

  it("sanitizes droneJIOvertones NaN/Infinity so preset load cannot leave invalid overtone mix", () => {
    const base = createDefaultResonanceState();
    const rawWithNaN = { ...base.droneJIOvertones, "3/2": NaN, "5/4": Infinity } as Record<string, number>;
    const constrained = applyResonanceStateConstraints(base, { droneJIOvertones: rawWithNaN });
    expect(constrained.droneJIOvertones["3/2"]).toBe(0);
    expect(constrained.droneJIOvertones["5/4"]).toBe(0);
    expect(Object.values(constrained.droneJIOvertones).every((v) => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
  });

  it("sanitizes quantizeMicroTightness NaN/Infinity so preset load cannot leave invalid value", () => {
    const base = createDefaultResonanceState();
    const nan = applyResonanceStateConstraints(base, { quantizeMicroTightness: NaN } as any);
    const inf = applyResonanceStateConstraints(base, { quantizeMicroTightness: Infinity } as any);
    expect(nan.quantizeMicroTightness).toBe(0);
    expect(inf.quantizeMicroTightness).toBe(0);
  });

  it("preserves quantizeMicroTightness at exact boundaries 0 and 1 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at0 = applyResonanceStateConstraints(base, { quantizeMicroTightness: 0 });
    const at1 = applyResonanceStateConstraints(base, { quantizeMicroTightness: 1 });
    expect(at0.quantizeMicroTightness).toBe(0);
    expect(at1.quantizeMicroTightness).toBe(1);
  });

  it("preserves droneTimbre, droneVibrato, droneFlanger at exact boundaries 0 and 1 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at0 = applyResonanceStateConstraints(base, { droneTimbre: 0, droneVibrato: 0, droneFlanger: 0 });
    const at1 = applyResonanceStateConstraints(base, { droneTimbre: 1, droneVibrato: 1, droneFlanger: 1 });
    expect(at0.droneTimbre).toBe(0);
    expect(at0.droneVibrato).toBe(0);
    expect(at0.droneFlanger).toBe(0);
    expect(at1.droneTimbre).toBe(1);
    expect(at1.droneVibrato).toBe(1);
    expect(at1.droneFlanger).toBe(1);
  });

  it("preserves drumVolume and bassVolume at exact boundaries 0 and 1 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at0 = applyResonanceStateConstraints(base, { drumVolume: 0, bassVolume: 0 });
    const at1 = applyResonanceStateConstraints(base, { drumVolume: 1, bassVolume: 1 });
    expect(at0.drumVolume).toBe(0);
    expect(at0.bassVolume).toBe(0);
    expect(at1.drumVolume).toBe(1);
    expect(at1.bassVolume).toBe(1);
  });

  it("clamps particle volume for crystal_bowl preset to 0.24", () => {
    const base = createDefaultResonanceState();
    const loud = applyResonanceStateConstraints(base, {
      particlePreset: "crystal_bowl",
      particleVolume: 1.5,
    });
    expect(loud.particleVolume).toBe(0.24);
  });

  it("clamps particleVolume to 0..1 when not crystal_bowl so preset load cannot leave invalid value", () => {
    const base = createDefaultResonanceState();
    expect(base.particlePreset).not.toBe("crystal_bowl");
    const negative = applyResonanceStateConstraints(base, { particleVolume: -0.2 });
    const aboveOne = applyResonanceStateConstraints(base, { particleVolume: 1.8 });
    expect(negative.particleVolume).toBe(0);
    expect(aboveOne.particleVolume).toBe(1);
  });

  it("preserves particleVolume at exact boundaries 0 and 1 when not crystal_bowl (clamp01 inclusive range)", () => {
    const base = createDefaultResonanceState();
    expect(base.particlePreset).not.toBe("crystal_bowl");
    const at0 = applyResonanceStateConstraints(base, { particleVolume: 0 });
    const at1 = applyResonanceStateConstraints(base, { particleVolume: 1 });
    expect(at0.particleVolume).toBe(0);
    expect(at1.particleVolume).toBe(1);
  });

  it("sanitizes overtone waveform values and wave-start overtone mix", () => {
    const base = createDefaultResonanceState();
    const constrained = applyResonanceStateConstraints(base, {
      droneOvertoneWaveform: "triangle" as any,
      waveStartWaveform: "noise" as any,
      waveStartOvertones: {
        ...createDefaultWaveStartOvertoneMix(),
        "3/2": 1.8,
        "5/4": -0.4,
      },
    });
    expect(constrained.droneOvertoneWaveform).toBe("sine");
    expect(constrained.waveStartWaveform).toBe("square");
    expect(constrained.waveStartOvertones["3/2"]).toBe(1);
    expect(constrained.waveStartOvertones["5/4"]).toBe(0);
  });

  it("maintains agent volume bounds and normalizes NaN to 0", () => {
    const base = createDefaultResonanceState();
    const next = applyResonanceStateConstraints(base, {
      swarmCount: 4,
      agentVolumes: [1.5, -0.5, Number.NaN, 0.8],
    });
    expect(next.agentVolumes).toEqual([1, 0, 0, 0.8]);
  });

  it("clamps harmonyCascadeSteps to 0..12 and rounds to integer", () => {
    const base = createDefaultResonanceState();
    const below = applyResonanceStateConstraints(base, { harmonyCascadeSteps: -1 });
    const above = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 13 });
    const fractional = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 5.7 });
    expect(below.harmonyCascadeSteps).toBe(0);
    expect(above.harmonyCascadeSteps).toBe(12);
    expect(fractional.harmonyCascadeSteps).toBe(6);
  });

  it("preserves harmonyCascadeSteps at exact boundaries 0 and 12 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at0 = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 0 });
    const at12 = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 12 });
    expect(at0.harmonyCascadeSteps).toBe(0);
    expect(at12.harmonyCascadeSteps).toBe(12);
  });

  it("sanitizes quantizeBpm and gridBase NaN/Infinity/-Infinity so preset load cannot leave invalid values", () => {
    const base = createDefaultResonanceState();
    const nanBpm = applyResonanceStateConstraints(base, { quantizeBpm: NaN } as any);
    const infBpm = applyResonanceStateConstraints(base, { quantizeBpm: Infinity } as any);
    const negInfBpm = applyResonanceStateConstraints(base, { quantizeBpm: -Infinity } as any);
    const nanGrid = applyResonanceStateConstraints(base, { gridBase: NaN } as any);
    expect(nanBpm.quantizeBpm).toBe(108);
    expect(infBpm.quantizeBpm).toBe(108);
    expect(negInfBpm.quantizeBpm).toBe(108);
    expect(nanGrid.gridBase).toBe(440);
  });

  it("sanitizes gridBase Infinity and -Infinity so preset load cannot leave invalid harmonic root", () => {
    const base = createDefaultResonanceState();
    const infGrid = applyResonanceStateConstraints(base, { gridBase: Infinity } as any);
    const negInfGrid = applyResonanceStateConstraints(base, { gridBase: -Infinity } as any);
    expect(infGrid.gridBase).toBe(440);
    expect(negInfGrid.gridBase).toBe(440);
  });

  it("sanitizes harmonyCascadeSteps and swarmCount NaN/Infinity so preset load cannot leave invalid values", () => {
    const base = createDefaultResonanceState();
    const nanSteps = applyResonanceStateConstraints(base, { harmonyCascadeSteps: NaN } as any);
    const infSteps = applyResonanceStateConstraints(base, { harmonyCascadeSteps: Infinity } as any);
    const nanSwarm = applyResonanceStateConstraints(base, { swarmCount: NaN } as any);
    expect(nanSteps.harmonyCascadeSteps).toBe(0);
    expect(infSteps.harmonyCascadeSteps).toBe(0);
    expect(nanSwarm.swarmCount).toBe(DEFAULT_SWARM_COUNT);
  });

  it("clamps harmonyCascadeSteps to 0..12 so preset load cannot leave out-of-range cascade", () => {
    const base = createDefaultResonanceState();
    const neg = applyResonanceStateConstraints(base, { harmonyCascadeSteps: -1 });
    const over = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 99 });
    const frac = applyResonanceStateConstraints(base, { harmonyCascadeSteps: 6.7 });
    expect(neg.harmonyCascadeSteps).toBe(0);
    expect(over.harmonyCascadeSteps).toBe(12);
    expect(frac.harmonyCascadeSteps).toBe(7);
  });

  it("sanitizes cursorSpeed and cursorGravity NaN/Infinity so preset load cannot leave invalid values", () => {
    const base = createDefaultResonanceState();
    const nanSpeed = applyResonanceStateConstraints(base, { cursorSpeed: NaN } as any);
    const infGravity = applyResonanceStateConstraints(base, { cursorGravity: Infinity } as any);
    expect(nanSpeed.cursorSpeed).toBe(4);
    expect(infGravity.cursorGravity).toBe(0.62);
  });

  it("sanitizes swarmWildness NaN/Infinity so preset load cannot leave invalid value", () => {
    const base = createDefaultResonanceState();
    const nan = applyResonanceStateConstraints(base, { swarmWildness: NaN } as any);
    const inf = applyResonanceStateConstraints(base, { swarmWildness: Infinity } as any);
    expect(nan.swarmWildness).toBe(0.94);
    expect(inf.swarmWildness).toBe(0.94);
  });

  it("preserves swarmWildness at exact boundaries 0 and 1.2 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const at0 = applyResonanceStateConstraints(base, { swarmWildness: 0 });
    const at12 = applyResonanceStateConstraints(base, { swarmWildness: 1.2 });
    expect(at0.swarmWildness).toBe(0);
    expect(at12.swarmWildness).toBe(1.2);
  });

  it("preserves cursorSpeed at exact boundaries 0.5 and 18 and cursorGravity at 0 and 1.4 (inclusive range)", () => {
    const base = createDefaultResonanceState();
    const speedLow = applyResonanceStateConstraints(base, { cursorSpeed: 0.5 });
    const speedHigh = applyResonanceStateConstraints(base, { cursorSpeed: 18 });
    const gravLow = applyResonanceStateConstraints(base, { cursorGravity: 0 });
    const gravHigh = applyResonanceStateConstraints(base, { cursorGravity: 1.4 });
    expect(speedLow.cursorSpeed).toBe(0.5);
    expect(speedHigh.cursorSpeed).toBe(18);
    expect(gravLow.cursorGravity).toBe(0);
    expect(gravHigh.cursorGravity).toBe(1.4);
  });

  it("sanitizes droneTimbre NaN/Infinity so preset load cannot leave invalid timbre", () => {
    const base = createDefaultResonanceState();
    const nan = applyResonanceStateConstraints(base, { droneTimbre: NaN } as any);
    const inf = applyResonanceStateConstraints(base, { droneTimbre: Infinity } as any);
    expect(nan.droneTimbre).toBe(0);
    expect(inf.droneTimbre).toBe(0);
  });

  it("sanitizes quantizeSubdivision to valid 16|32|64 so preset load cannot leave invalid value", () => {
    const base = createDefaultResonanceState();
    const invalid = applyResonanceStateConstraints(base, {
      quantizeSubdivision: "8" as any,
    });
    expect(invalid.quantizeSubdivision).toBe("16");
    const invalid99 = applyResonanceStateConstraints(base, {
      quantizeSubdivision: "99" as any,
    });
    expect(invalid99.quantizeSubdivision).toBe("16");
    const valid16 = applyResonanceStateConstraints(base, { quantizeSubdivision: "16" });
    expect(valid16.quantizeSubdivision).toBe("16");
    const valid32 = applyResonanceStateConstraints(base, { quantizeSubdivision: "32" });
    expect(valid32.quantizeSubdivision).toBe("32");
    const valid64 = applyResonanceStateConstraints(base, { quantizeSubdivision: "64" });
    expect(valid64.quantizeSubdivision).toBe("64");
  });

  it("sanitizes invalid droneOvertoneWaveform and waveStartWaveform so preset load cannot leave unsupported OscillatorType", () => {
    const base = createDefaultResonanceState();
    const invalidDrone = applyResonanceStateConstraints(base, {
      droneOvertoneWaveform: "invalid" as any,
    });
    const invalidWaveStart = applyResonanceStateConstraints(base, {
      waveStartWaveform: "triangle" as any,
    });
    expect(invalidDrone.droneOvertoneWaveform).toBe("sine");
    expect(invalidWaveStart.waveStartWaveform).toBe("square");
    const validSine = applyResonanceStateConstraints(base, { droneOvertoneWaveform: "sine" });
    const validSaw = applyResonanceStateConstraints(base, { waveStartWaveform: "sawtooth" });
    expect(validSine.droneOvertoneWaveform).toBe("sine");
    expect(validSaw.waveStartWaveform).toBe("sawtooth");
  });

  it("clamps droneJIOvertones to [0,1] so preset load and UI cannot leave invalid mix", () => {
    const base = createDefaultResonanceState();
    const constrained = applyResonanceStateConstraints(base, {
      droneJIOvertones: {
        "3/2": 1.8,
        "5/4": -0.2,
        "4/3": 0.5,
        "9/8": Number.NaN,
      } as Record<string, number>,
    });
    expect(constrained.droneJIOvertones["3/2"]).toBe(1);
    expect(constrained.droneJIOvertones["5/4"]).toBe(0);
    expect(constrained.droneJIOvertones["4/3"]).toBe(0.5);
    expect(constrained.droneJIOvertones["9/8"]).toBe(0);
    const values = Object.values(constrained.droneJIOvertones);
    expect(values.every((v) => typeof v === "number" && v >= 0 && v <= 1)).toBe(true);
  });

  it("clamps waveStartOvertones to [0,1] so preset load and UI cannot leave invalid sector pulse mix", () => {
    const base = createDefaultResonanceState();
    const constrained = applyResonanceStateConstraints(base, {
      waveStartOvertones: {
        "3/2": 2.1,
        "5/4": -0.3,
        "9/8": 0.6,
        "7/4": Number.NaN,
      } as Record<string, number>,
    });
    expect(constrained.waveStartOvertones["3/2"]).toBe(1);
    expect(constrained.waveStartOvertones["5/4"]).toBe(0);
    expect(constrained.waveStartOvertones["9/8"]).toBe(0.6);
    expect(constrained.waveStartOvertones["7/4"]).toBe(0);
    const values = Object.values(constrained.waveStartOvertones);
    expect(values.every((v) => typeof v === "number" && v >= 0 && v <= 1)).toBe(true);
  });

  it("with empty partial returns valid constrained state (idempotent for valid current)", () => {
    const current = createDefaultResonanceState();
    const result = applyResonanceStateConstraints(current, {});
    expect(result.gridBase).toBe(current.gridBase);
    expect(result.quantizeBpm).toBeGreaterThanOrEqual(30);
    expect(result.quantizeBpm).toBeLessThanOrEqual(240);
    expect(result.quantizeSubdivision).toMatch(/^(16|32|64)$/);
    expect(result.bassRootHz).toBeGreaterThanOrEqual(DRONE_MIN_FREQ);
    expect(result.bassRootHz).toBeLessThanOrEqual(DRONE_MAX_FREQ);
    expect(result.agentVolumes.every((v) => v >= 0 && v <= 1)).toBe(true);
  });

  it("sanitizes invalid particleSystem to ji so preset load cannot leave unsupported value", () => {
    const base = createDefaultResonanceState();
    const invalid = applyResonanceStateConstraints(base, {
      particleSystem: "invalid" as any,
    });
    expect(invalid.particleSystem).toBe("ji");
    const valid12edo = applyResonanceStateConstraints(base, { particleSystem: "12edo" });
    expect(valid12edo.particleSystem).toBe("12edo");
    const validBp = applyResonanceStateConstraints(base, { particleSystem: "bp" });
    expect(validBp.particleSystem).toBe("bp");
  });

  it("sanitizes invalid churchMode to lydian so preset load cannot leave unsupported value", () => {
    const base = createDefaultResonanceState();
    const invalid = applyResonanceStateConstraints(base, {
      churchMode: "invalid" as any,
    });
    expect(invalid.churchMode).toBe("lydian");
    const validIonian = applyResonanceStateConstraints(base, { churchMode: "ionian" });
    expect(validIonian.churchMode).toBe("ionian");
    const validAeolian = applyResonanceStateConstraints(base, { churchMode: "aeolian" });
    expect(validAeolian.churchMode).toBe("aeolian");
  });

  it("sanitizes invalid particlePreset to woodblock so preset load cannot leave unsupported value", () => {
    const base = createDefaultResonanceState();
    const invalid = applyResonanceStateConstraints(base, {
      particlePreset: "typo" as any,
    });
    expect(invalid.particlePreset).toBe("woodblock");
    const invalidLegacy = applyResonanceStateConstraints(base, {
      particlePreset: "old_removed_preset" as any,
    });
    expect(invalidLegacy.particlePreset).toBe("woodblock");
    const emptyString = applyResonanceStateConstraints(base, { particlePreset: "" as any });
    expect(emptyString.particlePreset).toBe("woodblock");
    const validGong = applyResonanceStateConstraints(base, { particlePreset: "gong" });
    expect(validGong.particlePreset).toBe("gong");
    const validGlassPing = applyResonanceStateConstraints(base, { particlePreset: "glass_ping" });
    expect(validGlassPing.particlePreset).toBe("glass_ping");
    const validDust = applyResonanceStateConstraints(base, { particlePreset: "dust" });
    expect(validDust.particlePreset).toBe("dust");
    const validPebble = applyResonanceStateConstraints(base, { particlePreset: "pebble" });
    expect(validPebble.particlePreset).toBe("pebble");
  });

  it("sanitizes invalid dronePreset to warm_pad so preset load cannot leave unsupported value", () => {
    const base = createDefaultResonanceState();
    const invalid = applyResonanceStateConstraints(base, {
      dronePreset: "typo" as any,
    });
    expect(invalid.dronePreset).toBe("warm_pad");
    const invalidLegacy = applyResonanceStateConstraints(base, {
      dronePreset: "old_removed_preset" as any,
    });
    expect(invalidLegacy.dronePreset).toBe("warm_pad");
    const validAmber = applyResonanceStateConstraints(base, { dronePreset: "amber_drone" });
    expect(validAmber.dronePreset).toBe("amber_drone");
    const validSaxophon = applyResonanceStateConstraints(base, { dronePreset: "saxophon" });
    expect(validSaxophon.dronePreset).toBe("saxophon");
  });

  it("sanitizes invalid gridTuning to 12edo so preset load cannot leave unsupported value", () => {
    const base = createDefaultResonanceState();
    const invalid = applyResonanceStateConstraints(base, {
      gridTuning: "invalid" as any,
    });
    expect(invalid.gridTuning).toBe("12edo");
    const invalidEdo = applyResonanceStateConstraints(base, {
      gridTuning: "99edo" as any,
    });
    expect(invalidEdo.gridTuning).toBe("12edo");
    const validJi = applyResonanceStateConstraints(base, { gridTuning: "ji" });
    expect(validJi.gridTuning).toBe("ji");
    const validBp = applyResonanceStateConstraints(base, { gridTuning: "bp" });
    expect(validBp.gridTuning).toBe("bp");
    const valid22 = applyResonanceStateConstraints(base, { gridTuning: "22edo" });
    expect(valid22.gridTuning).toBe("22edo");
  });

  it("preserves all valid gridTuning values (17edo, 19edo, 31edo) so preset load keeps supported EDOs", () => {
    const base = createDefaultResonanceState();
    const valid17 = applyResonanceStateConstraints(base, { gridTuning: "17edo" });
    const valid19 = applyResonanceStateConstraints(base, { gridTuning: "19edo" });
    const valid31 = applyResonanceStateConstraints(base, { gridTuning: "31edo" });
    expect(valid17.gridTuning).toBe("17edo");
    expect(valid19.gridTuning).toBe("19edo");
    expect(valid31.gridTuning).toBe("31edo");
  });

  it("sanitizes particleMute and clickSoundOnly to boolean so preset load cannot leave invalid type", () => {
    const current = createDefaultResonanceState();
    expect(current.particleMute).toBe(false);
    expect(current.clickSoundOnly).toBe(true);

    const withTrue = applyResonanceStateConstraints(current, { particleMute: true, clickSoundOnly: false });
    expect(withTrue.particleMute).toBe(true);
    expect(withTrue.clickSoundOnly).toBe(false);

    const invalidMute = applyResonanceStateConstraints(current, { particleMute: "yes" as unknown as boolean });
    expect(invalidMute.particleMute).toBe(false);
    const invalidClick = applyResonanceStateConstraints(current, { clickSoundOnly: 1 as unknown as boolean });
    expect(invalidClick.clickSoundOnly).toBe(true);
  });

  it("does not mutate input current or partial (safe for preset load and UI)", () => {
    const current = createDefaultResonanceState();
    const partial = { gridBase: 220, quantizeBpm: 90 } as Partial<typeof current>;
    const originalGridBase = current.gridBase;
    const originalQuantizeBpm = current.quantizeBpm;
    const partialGridBase = partial.gridBase;
    const partialQuantizeBpm = partial.quantizeBpm;

    applyResonanceStateConstraints(current, partial);

    expect(current.gridBase).toBe(originalGridBase);
    expect(current.quantizeBpm).toBe(originalQuantizeBpm);
    expect(partial.gridBase).toBe(partialGridBase);
    expect(partial.quantizeBpm).toBe(partialQuantizeBpm);
  });

  it("returns a new object (reference inequality with current and partial) so preset load and UI can rely on non-mutation", () => {
    const current = createDefaultResonanceState();
    const partial = { gridBase: 220 } as Partial<typeof current>;
    const result = applyResonanceStateConstraints(current, partial);
    expect(result).not.toBe(current);
    expect(result).not.toBe(partial);
    expect(result.gridBase).toBe(220);
  });
});
