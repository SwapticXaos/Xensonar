import { describe, expect, it, vi } from "vitest";

import { createDefaultResonanceState } from "../config/defaults";
import { DRONE_JI_OVERTONES } from "../config/overtones";
import { getDroneSlice, getQuantizeSlice } from "../config/stateSlices";
import {
  getResonanceDroneRhythmGain,
  syncResonanceAudioFrame,
} from "../resonanceAudioFrameSync";
import { createInitialNexusRefsState } from "../resonanceRefs";

function createAudioParamSpy() {
  return {
    setTargetAtTime: vi.fn(),
  } as unknown as AudioParam;
}

function createGainNodeSpy() {
  return {
    gain: createAudioParamSpy(),
  } as unknown as GainNode;
}

function createOscillatorNodeSpy() {
  return {
    frequency: createAudioParamSpy(),
  } as unknown as OscillatorNode;
}

describe("resonanceAudioFrameSync", () => {
  it("computes stable rhythm gain patterns from the quantize clock", () => {
    expect(getResonanceDroneRhythmGain("Off", 120, 0.31)).toBe(1);
    expect(getResonanceDroneRhythmGain("Synkope", 120, 0)).toBe(1);
    expect(getResonanceDroneRhythmGain("Synkope", 120, 0.125)).toBe(0);
    expect(getResonanceDroneRhythmGain("Puls 1/16", 120, 0.0625)).toBeCloseTo(0.5, 5);
  });

  it("returns 1 for unknown rhythm mode (fallback; vision §5 robust audio)", () => {
    expect(getResonanceDroneRhythmGain("UnknownMode", 120, 0.5)).toBe(1);
    expect(getResonanceDroneRhythmGain("", 120, 0.5)).toBe(1);
  });

  it("clamps BPM to 40..240 for rhythm gain so invalid quantizeBpm cannot break sync", () => {
    const at40 = getResonanceDroneRhythmGain("Puls 1/8", 40, 0.1);
    const at240 = getResonanceDroneRhythmGain("Puls 1/8", 240, 0.1);
    expect(Number.isFinite(at40)).toBe(true);
    expect(Number.isFinite(at240)).toBe(true);
    expect(at40).toBeGreaterThanOrEqual(0);
    expect(at40).toBeLessThanOrEqual(1);
    expect(at240).toBeGreaterThanOrEqual(0);
    expect(at240).toBeLessThanOrEqual(1);
  });

  it("Puls 1/4 produces gain in [0,1] across beat cycle", () => {
    const beatLen = 60 / 120;
    const atStart = getResonanceDroneRhythmGain("Puls 1/4", 120, 0);
    const atMid = getResonanceDroneRhythmGain("Puls 1/4", 120, beatLen * 0.5);
    const atEnd = getResonanceDroneRhythmGain("Puls 1/4", 120, beatLen - 0.001);
    expect(atStart).toBeGreaterThanOrEqual(0);
    expect(atStart).toBeLessThanOrEqual(1);
    expect(atMid).toBeGreaterThanOrEqual(0);
    expect(atMid).toBeLessThanOrEqual(1);
    expect(atEnd).toBeGreaterThanOrEqual(0);
    expect(atEnd).toBeLessThanOrEqual(1);
  });

  it("applies frame-synchronous drone, flanger, and JI targets through the canonical simulation state", () => {
    const state = createDefaultResonanceState();
    const overtone = DRONE_JI_OVERTONES[0];
    state.droneTimbre = 0.5;
    state.droneFlanger = 0.25;
    state.droneRhythm = "Puls 1/8";
    state.quantizeBpm = 128;
    state.droneJIOvertones[overtone.label] = 0.75;

    const refs = createInitialNexusRefsState(900, 520);
    refs.droneVolumeBus = createGainNodeSpy();
    refs.droneRhythmGain = createGainNodeSpy();
    refs.manualJiMaster = createGainNodeSpy();
    refs.flangerWet = createGainNodeSpy();
    refs.flangerFeedback = createGainNodeSpy();
    refs.manualJiOscs[overtone.label] = createOscillatorNodeSpy();
    refs.manualJiGains[overtone.label] = createGainNodeSpy();
    refs.jiOscs[overtone.label] = createOscillatorNodeSpy();
    refs.jiGains[overtone.label] = createGainNodeSpy();

    const audioTime = 1.5;
    const baseFreq = 220;
    syncResonanceAudioFrame({
      refs,
      audioTime,
      drone: getDroneSlice({ current: state }),
      quantize: getQuantizeSlice({ current: state }),
      droneVolume: 0.36,
      baseFreq,
    });

    expect(refs.droneVolumeBus.gain.setTargetAtTime).toHaveBeenCalledWith(0.36, audioTime, 0.03);
    expect(refs.droneRhythmGain.gain.setTargetAtTime).toHaveBeenCalledWith(
      getResonanceDroneRhythmGain("Puls 1/8", 128, audioTime),
      audioTime,
      0.03,
    );
    expect(refs.manualJiMaster.gain.setTargetAtTime).toHaveBeenCalledWith(1, audioTime, 0.05);
    expect(refs.flangerWet.gain.setTargetAtTime).toHaveBeenCalledWith(0.2, audioTime, 0.05);
    expect(refs.flangerFeedback.gain.setTargetAtTime).toHaveBeenCalledWith(0.525, audioTime, 0.05);

    expect(refs.manualJiOscs[overtone.label].frequency.setTargetAtTime).toHaveBeenCalledWith(
      baseFreq * overtone.ratio,
      audioTime,
      0.03,
    );
    expect(refs.manualJiGains[overtone.label].gain.setTargetAtTime).toHaveBeenCalledWith(
      0.75 * (0.004 + 0.1 * 0.5),
      audioTime,
      0.05,
    );
    expect(refs.jiOscs[overtone.label].frequency.setTargetAtTime).toHaveBeenCalledWith(
      baseFreq * overtone.ratio,
      audioTime,
      0.04,
    );
    expect(refs.jiGains[overtone.label].gain.setTargetAtTime).toHaveBeenCalledWith(
      0.75 * (0.006 + 0.5 * 0.022),
      audioTime,
      0.05,
    );
  });
});
