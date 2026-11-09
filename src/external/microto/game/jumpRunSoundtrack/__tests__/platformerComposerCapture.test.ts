/**
 * Locks platformerComposerCapture contract: reset, push trim at MAX_MOVEMENT_EVENTS, record shape, processMovementFrame.
 * Branch A reliability; single-responsibility capture module.
 */
import { describe, expect, it } from "vitest";
import { MAX_MOVEMENT_EVENTS } from "../platformerArrangementTypes";
import {
  type PlatformerCaptureState,
  processMovementFrame,
  pushMovementEvent,
  recordMovementEvent,
  resetCompositionCapture,
} from "../platformerComposerCapture";

function createCaptureState(overrides: Partial<PlatformerCaptureState> = {}): PlatformerCaptureState {
  return {
    phrase: [],
    completionPhrase: [],
    nextCompletionAt: 0,
    completionStep: 0,
    completionLoopArmed: false,
    completionTheme: null,
    completionIntroPattern: null,
    nextCompletionIntroAt: 0,
    completionIntroStep: 0,
    completionIntroComplete: false,
    completionCyclePattern: null,
    completionCycleKey: "",
    nextMotionSampleAt: 0,
    motionSampleIndex: 0,
    lastMovementTime: 0,
    lastMotionDir: 0,
    eventOrdinal: 0,
    movementEvents: [],
    completionPattern: null,
    completionArrangement: null,
    ...overrides,
  };
}

describe("platformerComposerCapture", () => {
  describe("resetCompositionCapture", () => {
    it("clears all capture-related state", () => {
      const m = createCaptureState({
        movementEvents: [{ kind: "motion", semi: 5, energy: 0.5, t: 1, lane: 0, airborne: false }],
        completionPhrase: [0, 3, 7],
        completionStep: 10,
        lastMovementTime: 100,
        lastMotionDir: 1,
      });
      resetCompositionCapture(m);
      expect(m.movementEvents).toHaveLength(0);
      expect(m.completionPhrase).toHaveLength(0);
      expect(m.completionStep).toBe(0);
      expect(m.lastMovementTime).toBe(0);
      expect(m.lastMotionDir).toBe(0);
      expect(m.eventOrdinal).toBe(0);
      expect(m.nextCompletionAt).toBe(0);
      expect(m.completionLoopArmed).toBe(false);
      expect(m.completionTheme).toBeNull();
      expect(m.completionCycleKey).toBe("");
    });
  });

  describe("pushMovementEvent", () => {
    it("appends event to movementEvents", () => {
      const m = createCaptureState();
      pushMovementEvent(m, { kind: "motion", semi: 0, energy: 0.5, t: 0, lane: 0, airborne: false });
      expect(m.movementEvents).toHaveLength(1);
      expect(m.movementEvents[0].kind).toBe("motion");
      expect(m.movementEvents[0].semi).toBe(0);
      expect(m.movementEvents[0].ordinal).toBe(0);
      expect(m.eventOrdinal).toBe(1);
    });

    it("trims to maxEvents when exceeding limit", () => {
      const m = createCaptureState();
      const cap = 5;
      for (let i = 0; i < cap + 3; i++) {
        pushMovementEvent(m, { kind: "motion", semi: i, energy: 0.5, t: i, lane: 0, airborne: false }, cap);
      }
      expect(m.movementEvents).toHaveLength(cap);
      expect(m.movementEvents[0].semi).toBe(3);
      expect(m.movementEvents[cap - 1].semi).toBe(cap + 2);
    });

    it("uses MAX_MOVEMENT_EVENTS as default trim limit", () => {
      const m = createCaptureState();
      for (let i = 0; i < MAX_MOVEMENT_EVENTS + 2; i++) {
        pushMovementEvent(m, { kind: "motion", semi: i, energy: 0.5, t: i, lane: 0, airborne: false });
      }
      expect(m.movementEvents).toHaveLength(MAX_MOVEMENT_EVENTS);
      expect(m.movementEvents[0].semi).toBe(2);
    });
  });

  describe("recordMovementEvent", () => {
    it("pushes event with clamped semi and energy", () => {
      const m = createCaptureState({ lastMovementTime: 1.5 });
      recordMovementEvent(m, "step", 12, 0.8, 2, false);
      expect(m.movementEvents).toHaveLength(1);
      expect(m.movementEvents[0].kind).toBe("step");
      expect(m.movementEvents[0].semi).toBe(12);
      expect(m.movementEvents[0].energy).toBe(0.8);
      expect(m.movementEvents[0].t).toBe(1.5);
      expect(m.movementEvents[0].lane).toBe(2);
      expect(m.movementEvents[0].airborne).toBe(false);
      expect(m.movementEvents[0].ordinal).toBe(0);
    });

    it("clamps semi to [-18, 24] and energy to [0.05, 1]", () => {
      const m = createCaptureState();
      recordMovementEvent(m, "jump", -25, 0.02, 0, true);
      expect(m.movementEvents[0].semi).toBe(-18);
      expect(m.movementEvents[0].energy).toBe(0.05);
      recordMovementEvent(m, "land", 30, 1.5, 0, false);
      expect(m.movementEvents[1].semi).toBe(24);
      expect(m.movementEvents[1].energy).toBe(1);
    });

    it("includes detail when finite number", () => {
      const m = createCaptureState();
      recordMovementEvent(m, "phase_gate", 0, 0.5, 0, false, 1.234);
      expect(m.movementEvents[0].detail).toBe(1.234);
    });
  });

  describe("processMovementFrame", () => {
    it("emits motion event and updates lastMovementTime and motionSampleIndex", () => {
      const m = createCaptureState();
      const pushed: number[] = [];
      processMovementFrame(m, 500, 200, 100, 0, true, 0, (semi) => pushed.push(semi));
      expect(m.movementEvents).toHaveLength(1);
      expect(m.movementEvents[0].kind).toBe("motion");
      expect(m.lastMovementTime).toBe(0);
      expect(m.motionSampleIndex).toBe(1);
      expect(m.nextMotionSampleAt).toBe(0.11);
    });

    it("calls pushPhrase when speedNorm > 0.22 and motionSampleIndex even", () => {
      const m = createCaptureState();
      const pushed: number[] = [];
      processMovementFrame(m, 500, 200, 200, 0, true, 0, (semi) => pushed.push(semi));
      expect(pushed.length).toBeGreaterThanOrEqual(0);
      m.motionSampleIndex = 0;
      processMovementFrame(m, 500, 200, 250, 0, true, 0.12, (semi) => pushed.push(semi));
      expect(pushed).toContain(m.movementEvents[m.movementEvents.length - 1].semi);
    });

    it("emits turn event when direction changes", () => {
      const m = createCaptureState({ lastMotionDir: 1 });
      processMovementFrame(m, 100, 300, -100, 0, true, 0, () => {});
      expect(m.movementEvents.some((e) => e.kind === "turn")).toBe(true);
    });
  });
});
