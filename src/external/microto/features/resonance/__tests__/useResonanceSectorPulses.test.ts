import { describe, expect, it } from "vitest";
import { createDefaultWaveStartOvertoneMix, createEmptyOvertoneMix } from "../config/overtones";
import { buildDirectedPulseCastVoices } from "../useResonanceSectorPulses";

const emptyMix = createEmptyOvertoneMix();
const defaultArgs = [emptyMix, "sine" as const, false, 0] as const;

describe("buildDirectedPulseCastVoices", () => {
  it("builds a clear two-voice cast for one-shot sector pulses", () => {
    const voices = buildDirectedPulseCastVoices(440, "right", "one_shot", ...defaultArgs);
    expect(voices).toHaveLength(2);
    expect(voices[0].volume).toBeGreaterThan(0);
    expect(voices[0].durationSeconds).toBeGreaterThan(0);
    expect(voices[1].freq).toBeGreaterThan(voices[0].freq);
  });

  it("adds a low tail voice for persistent sector pulses", () => {
    const voices = buildDirectedPulseCastVoices(440, "right", "persistent", ...defaultArgs);
    expect(voices).toHaveLength(3);
    expect(voices[2].type).toBe("sine");
    expect(voices[2].freq).toBeLessThan(voices[0].freq);
    expect(voices[2].durationSeconds).toBeGreaterThan(voices[0].durationSeconds);
  });

  it("varies the lead frequency by direction", () => {
    const left = buildDirectedPulseCastVoices(440, "left", "one_shot", ...defaultArgs);
    const up = buildDirectedPulseCastVoices(440, "up", "one_shot", ...defaultArgs);
    const right = buildDirectedPulseCastVoices(440, "right", "one_shot", ...defaultArgs);

    expect(left[0].freq).not.toBe(right[0].freq);
    expect(up[0].freq).not.toBe(right[0].freq);
  });

  it("adds harmonic accent voices when the wave-start overtone mixer is opened up", () => {
    const voices = buildDirectedPulseCastVoices(
      440,
      "right",
      "one_shot",
      createDefaultWaveStartOvertoneMix(),
      "square",
      false,
      0,
    );
    expect(voices.length).toBeGreaterThan(2);
    expect(voices[2].type).toBe("square");
  });

  it("lifts root and fifth by one octave while Backspace boost is active", () => {
    const normal = buildDirectedPulseCastVoices(440, "up", "one_shot", ...defaultArgs);
    const boosted = buildDirectedPulseCastVoices(440, "up", "one_shot", emptyMix, "sine", true, 0);
    expect(boosted[0].freq).toBeCloseTo(normal[0].freq * 2);
    expect(boosted[1].freq).toBeCloseTo(normal[1].freq * 2);
  });

  it("ramps cast volume when Space-drive is held", () => {
    const quiet = buildDirectedPulseCastVoices(440, "right", "one_shot", ...defaultArgs);
    const loud = buildDirectedPulseCastVoices(440, "right", "one_shot", emptyMix, "sine", false, 1);
    expect(loud[0].volume).toBeGreaterThan(quiet[0].volume);
    expect(loud[1].volume).toBeGreaterThan(quiet[1].volume);
  });
});
