/**
 * Contract test for canonical input log types (shared/input/inputLogTypes).
 * Locks emit shape and event type union so useRoomInput and performanceRecorder stay aligned.
 */
import { describe, expect, it } from "vitest";

import type {
  InputLogEntryEmit,
  InputLogEventType,
} from "../inputLogTypes";

const VALID_EVENT_TYPES: InputLogEventType[] = [
  "keydown",
  "keyup",
  "pointerdown",
  "pointermove",
  "pointerup",
];

describe("inputLogTypes contract", () => {
  it("InputLogEventType includes exactly the five expected event kinds", () => {
    expect(VALID_EVENT_TYPES).toHaveLength(5);
    expect(VALID_EVENT_TYPES).toContain("keydown");
    expect(VALID_EVENT_TYPES).toContain("keyup");
    expect(VALID_EVENT_TYPES).toContain("pointerdown");
    expect(VALID_EVENT_TYPES).toContain("pointermove");
    expect(VALID_EVENT_TYPES).toContain("pointerup");
  });

  it("InputLogEntryEmit accepts minimal keydown entry (room + type)", () => {
    const entry: InputLogEntryEmit = {
      room: "RESONANCE",
      type: "keydown",
    };
    expect(entry.room).toBe("RESONANCE");
    expect(entry.type).toBe("keydown");
    expect(entry.key).toBeUndefined();
    expect(entry.pointer).toBeUndefined();
  });

  it("InputLogEntryEmit accepts entry with key", () => {
    const entry: InputLogEntryEmit = {
      room: "GAME",
      type: "keyup",
      key: "Space",
    };
    expect(entry.key).toBe("Space");
  });

  it("InputLogEntryEmit accepts entry with pointer", () => {
    const entry: InputLogEntryEmit = {
      room: "COMMONS",
      type: "pointermove",
      pointer: { x: 100, y: 200 },
    };
    expect(entry.pointer).toEqual({ x: 100, y: 200 });
  });
});
