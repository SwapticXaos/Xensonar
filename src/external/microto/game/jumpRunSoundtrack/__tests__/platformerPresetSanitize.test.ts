/**
 * Locks platformer preset sanitization contract (pure module).
 * Extracted for testability; platformerPresetPersistence delegates to these functions.
 */

import { describe, expect, it } from "vitest";
import { MAX_MOVEMENT_EVENTS } from "../platformerArrangementTypes";
import {
  MAX_EVENTS,
  MAX_PHRASE_LENGTH,
  sanitizeArrangementMode,
  sanitizeFinite,
  sanitizeFormMode,
  sanitizeId,
  sanitizeMovementEvents,
  sanitizeName,
  sanitizePhrase,
  sanitizePreset,
  sanitizePresetItem,
  sanitizeTuningMode,
} from "../platformerPresetSanitize";

describe("platformerPresetSanitize", () => {
  describe("MAX_EVENTS / MAX_MOVEMENT_EVENTS single source", () => {
    it("MAX_EVENTS equals MAX_MOVEMENT_EVENTS (capture/sanitize parity)", () => {
      expect(MAX_EVENTS).toBe(MAX_MOVEMENT_EVENTS);
    });
    it("MAX_MOVEMENT_EVENTS is 640 (canonical event cap)", () => {
      expect(MAX_MOVEMENT_EVENTS).toBe(640);
    });
  });

  describe("sanitizeFinite", () => {
    it("returns fallback for non-number", () => {
      expect(sanitizeFinite("x", 5, 0, 10)).toBe(5);
      expect(sanitizeFinite(null, 5, 0, 10)).toBe(5);
    });

    it("clamps value to [min, max]", () => {
      expect(sanitizeFinite(3, 5, 0, 10)).toBe(3);
      expect(sanitizeFinite(-1, 5, 0, 10)).toBe(0);
      expect(sanitizeFinite(99, 5, 0, 10)).toBe(10);
    });

    it("returns fallback for NaN or Infinity", () => {
      expect(sanitizeFinite(NaN, 5, 0, 10)).toBe(5);
      expect(sanitizeFinite(Infinity, 5, 0, 10)).toBe(5);
    });
  });

  describe("sanitizeName", () => {
    it("returns fallback for empty or non-string", () => {
      expect(sanitizeName("", "Default")).toBe("Default");
      expect(sanitizeName("   ", "Default")).toBe("Default");
      expect(sanitizeName(null, "Default")).toBe("Default");
    });

    it("trims and slices to 40 chars", () => {
      expect(sanitizeName("  Loop A  ", "Default")).toBe("Loop A");
      expect(sanitizeName("a".repeat(50), "Default")).toHaveLength(40);
    });
  });

  describe("sanitizeId", () => {
    it("returns null for non-string or empty", () => {
      expect(sanitizeId(null)).toBeNull();
      expect(sanitizeId(123)).toBeNull();
      expect(sanitizeId("")).toBeNull();
      expect(sanitizeId("   ")).toBeNull();
    });

    it("trims and slices to 64 chars", () => {
      expect(sanitizeId("  abc-123  ")).toBe("abc-123");
      expect(sanitizeId("x".repeat(80))).toHaveLength(64);
    });
  });

  describe("sanitizePhrase", () => {
    it("returns empty for non-array", () => {
      expect(sanitizePhrase(null)).toEqual([]);
      expect(sanitizePhrase({})).toEqual([]);
    });

    it("filters non-finite and clamps to [-36, 48]", () => {
      expect(sanitizePhrase([0, 3, 7, 10])).toEqual([0, 3, 7, 10]);
      expect(sanitizePhrase([1, "bad", 999, NaN])).toEqual([1, 48]);
      expect(sanitizePhrase([-40, -36, 48, 60])).toEqual([-36, -36, 48, 48]);
    });

    it("stops at MAX_PHRASE_LENGTH", () => {
      const long = Array.from({ length: 50 }, (_, i) => i);
      expect(sanitizePhrase(long)).toHaveLength(MAX_PHRASE_LENGTH);
    });
  });

  describe("sanitizeMovementEvents", () => {
    it("returns empty for non-array", () => {
      expect(sanitizeMovementEvents(null)).toEqual([]);
    });

    it("accepts valid event kinds and sanitizes fields", () => {
      const events = sanitizeMovementEvents([
        { kind: "step", semi: 3, energy: 0.8, t: 0.1, lane: 1, airborne: false },
        { kind: "npc_orb", semi: 7, energy: 0.9, t: 0.2, lane: 2, airborne: true, ordinal: 9 },
        { kind: "mode_shift", semi: 10, energy: 0.75, t: 0.21, lane: 2, airborne: false },
        { kind: "puzzle_step", semi: 11, energy: 0.8, t: 0.3, lane: 3, airborne: false },
        { kind: "gate_unlock", semi: 19, energy: 1, t: 0.5, lane: 0, airborne: false },
      ]);
      expect(events).toHaveLength(5);
      expect(events[0]).toEqual({ kind: "step", semi: 3, energy: 0.8, t: 0.1, lane: 1, airborne: false, ordinal: 0 });
      expect(events[1]).toEqual({ kind: "npc_orb", semi: 7, energy: 0.9, t: 0.2, lane: 2, airborne: true, ordinal: 9 });
      expect(events[2]).toEqual({ kind: "mode_shift", semi: 10, energy: 0.75, t: 0.21, lane: 2, airborne: false, ordinal: 2 });
      expect(events[3]).toEqual({ kind: "puzzle_step", semi: 11, energy: 0.8, t: 0.3, lane: 3, airborne: false, ordinal: 3 });
      expect(events[4]).toEqual({ kind: "gate_unlock", semi: 19, energy: 1, t: 0.5, lane: 0, airborne: false, ordinal: 4 });
    });

    it("skips invalid kind and uses motion fallback", () => {
      const events = sanitizeMovementEvents([
        { kind: "bad_kind", semi: 2, energy: 0.5, t: 0, lane: 0, airborne: false },
      ]);
      expect(events).toHaveLength(0);
    });

    it("clamps semi, energy, t, lane and optional detail", () => {
      const events = sanitizeMovementEvents([
        { kind: "step", semi: 999, energy: 99, t: -4, lane: 1234, airborne: 0 },
        { kind: "phase_gate", semi: 2, energy: 0.4, t: 0.1, lane: 0, airborne: false, detail: 99 },
      ]);
      expect(events[0].semi).toBe(48);
      expect(events[0].energy).toBe(1);
      expect(events[0].t).toBe(0);
      expect(events[0].lane).toBe(64);
      expect(events[0].airborne).toBe(false);
      expect(events[1].detail).toBe(8);
    });

    it("stops at MAX_EVENTS", () => {
      const many = Array.from({ length: 700 }, () => ({
        kind: "step",
        semi: 0,
        energy: 0.5,
        t: 0,
        lane: 0,
        airborne: false,
      }));
      expect(sanitizeMovementEvents(many)).toHaveLength(MAX_EVENTS);
    });
  });

  describe("sanitizeTuningMode", () => {
    it("accepts 12edo, 19edo, 22edo, ji, bp", () => {
      expect(sanitizeTuningMode("12edo")).toBe("12edo");
      expect(sanitizeTuningMode("19edo")).toBe("19edo");
      expect(sanitizeTuningMode("22edo")).toBe("22edo");
      expect(sanitizeTuningMode("ji")).toBe("ji");
      expect(sanitizeTuningMode("bp")).toBe("bp");
    });

    it("returns 12edo for unknown", () => {
      expect(sanitizeTuningMode("unknown")).toBe("12edo");
      expect(sanitizeTuningMode(null)).toBe("12edo");
    });
  });

  describe("sanitizeArrangementMode", () => {
    it("accepts balanced, cinematic, percussive, glitch", () => {
      expect(sanitizeArrangementMode("balanced")).toBe("balanced");
      expect(sanitizeArrangementMode("cinematic")).toBe("cinematic");
      expect(sanitizeArrangementMode("percussive")).toBe("percussive");
      expect(sanitizeArrangementMode("glitch")).toBe("glitch");
    });

    it("returns balanced for unknown", () => {
      expect(sanitizeArrangementMode("broken")).toBe("balanced");
    });
  });

  describe("sanitizeFormMode", () => {
    it("accepts auto, aaba, abab, abca, abcb, abac", () => {
      expect(sanitizeFormMode("auto")).toBe("auto");
      expect(sanitizeFormMode("aaba")).toBe("aaba");
      expect(sanitizeFormMode("abab")).toBe("abab");
      expect(sanitizeFormMode("abca")).toBe("abca");
      expect(sanitizeFormMode("abcb")).toBe("abcb");
      expect(sanitizeFormMode("abac")).toBe("abac");
    });

    it("returns auto for unknown", () => {
      expect(sanitizeFormMode("weird")).toBe("auto");
    });
  });

  describe("sanitizePreset", () => {
    it("returns null for non-object", () => {
      expect(sanitizePreset(null)).toBeNull();
      expect(sanitizePreset([])).toBeNull();
    });

    it("returns null when phrase and movementEvents are both empty", () => {
      expect(
        sanitizePreset({
          phrase: [],
          movementEvents: [],
          savedAt: 123,
        }),
      ).toBeNull();
    });

    it("sanitizes valid preset with phrase", () => {
      const preset = sanitizePreset({
        phrase: [0, 3, 7, 10],
        movementEvents: [],
        savedAt: 12345,
        tuningMode: "ji",
        arrangementMode: "balanced",
        formMode: "auto",
        sectionBias: "auto",
        evolutionDepth: 0.68,
        tempoFollow: 0.62,
        bpm: 118,
        masterVolume: 0.6,
        composerOn: true,
      });
      expect(preset).not.toBeNull();
      expect(preset!.phrase).toEqual([0, 3, 7, 10]);
      expect(preset!.tuningMode).toBe("ji");
      expect(preset!.sectionBias).toBe("auto");
      expect(preset!.bpm).toBe(118);
    });

    it("sanitizes invalid fields to safe defaults", () => {
      const preset = sanitizePreset({
        phrase: [1],
        movementEvents: [],
        savedAt: -2,
        tuningMode: "unknown",
        arrangementMode: "broken",
        formMode: "weird",
        sectionBias: "strange",
        evolutionDepth: 8,
        tempoFollow: -3,
        bpm: 999,
        masterVolume: -2,
        composerOn: "yes",
      });
      expect(preset).not.toBeNull();
      expect(preset!.tuningMode).toBe("12edo");
      expect(preset!.arrangementMode).toBe("balanced");
      expect(preset!.formMode).toBe("auto");
      expect(preset!.sectionBias).toBe("auto");
      expect(preset!.evolutionDepth).toBe(1);
      expect(preset!.tempoFollow).toBe(0);
      expect(preset!.bpm).toBe(200);
      expect(preset!.masterVolume).toBe(0);
      expect(preset!.composerOn).toBe(true);
    });
  });

  describe("sanitizePresetItem", () => {
    it("returns null for non-object", () => {
      expect(sanitizePresetItem(null)).toBeNull();
    });

    it("returns null when id is missing or empty", () => {
      expect(
        sanitizePresetItem({
          id: "",
          name: "Test",
          savedAt: 123,
          preset: { phrase: [0], movementEvents: [], savedAt: 123, tuningMode: "12edo", arrangementMode: "balanced", formMode: "auto", sectionBias: "auto", evolutionDepth: 0.68, tempoFollow: 0.62, bpm: 110, masterVolume: 0.58, composerOn: true },
        }),
      ).toBeNull();
    });

    it("returns null when preset is invalid", () => {
      expect(
        sanitizePresetItem({
          id: "test-id",
          name: "Test",
          savedAt: 123,
          preset: { phrase: [], movementEvents: [] },
        }),
      ).toBeNull();
    });

    it("sanitizes valid preset item", () => {
      const item = sanitizePresetItem({
        id: "loop-abc",
        name: "My Loop",
        savedAt: 9999,
        preset: {
          phrase: [0, 4, 7],
          movementEvents: [{ kind: "step", semi: 0, energy: 0.5, t: 0, lane: 0, airborne: false }],
          savedAt: 9999,
          tuningMode: "bp",
          arrangementMode: "cinematic",
          formMode: "abca",
          sectionBias: "B",
          evolutionDepth: 0.5,
          tempoFollow: 0.8,
          bpm: 120,
          masterVolume: 0.5,
          composerOn: false,
        },
      });
      expect(item).not.toBeNull();
      expect(item!.id).toBe("loop-abc");
      expect(item!.name).toBe("My Loop");
      expect(item!.preset.tuningMode).toBe("bp");
      expect(item!.preset.sectionBias).toBe("B");
    });
  });
});
