import { describe, expect, it } from "vitest";
import {
  resolveResonanceCursorFrame,
  setKeyboardCursorPitch,
  stepKeyboardGridCursor,
  syncPointerDrivenCursor,
} from "../resonanceCursorControl";
import { createInitialNexusRefsState } from "../resonanceRefs";

describe("resonanceCursorControl", () => {
  const snapYToGrid = (y: number) => Math.round(y / 10) * 10;
  const stepYToGrid = (currentY: number, direction: 1 | -1) => currentY - direction * 10;

  it("syncs pointer input to exact X and snapped Y while clearing keyboard override", () => {
    const refs = createInitialNexusRefsState(800, 600);
    refs.keyboardCursorYOverride = 260;

    const next = syncPointerDrivenCursor(refs, 123.4, 257, {
      lockCursorToGrid: true,
      gridBase: 440,
      gridTuning: "12edo",
      gameWidth: 800,
      gameHeight: 600,
      snapYToGrid: (y) => snapYToGrid(y),
    });

    expect(next).toEqual({ x: 123.4, y: 260 });
    expect(refs.pointerCursorX).toBe(123.4);
    expect(refs.pointerCursorY).toBe(257);
    expect(refs.keyboardCursorYOverride).toBeNull();
  });

  it("steps keyboard grid cursor from the snapped pointer anchor when no override exists", () => {
    const refs = createInitialNexusRefsState(800, 600);
    refs.pointerCursorY = 257;

    const nextY = stepKeyboardGridCursor(refs, 1, {
      lockCursorToGrid: true,
      gridBase: 440,
      gridTuning: "12edo",
      gameHeight: 600,
      snapYToGrid: (y) => snapYToGrid(y),
      stepYToGrid: (currentY, direction) => stepYToGrid(currentY, direction),
    });

    expect(nextY).toBe(250);
    expect(refs.keyboardCursorYOverride).toBe(250);
    expect(refs.cursorY).toBe(250);
  });

  it("keeps keyboard override active for frame resolution until the mouse moves again", () => {
    const refs = createInitialNexusRefsState(800, 600);
    refs.pointerCursorY = 257;
    refs.keyboardCursorYOverride = 240;

    resolveResonanceCursorFrame(refs, {
      lockCursorToGrid: true,
      gridBase: 440,
      gridTuning: "12edo",
      gameWidth: 800,
      gameHeight: 600,
      snapYToGrid: (y) => snapYToGrid(y),
    });

    expect(refs.cursorY).toBe(240);

    syncPointerDrivenCursor(refs, 220, 311, {
      lockCursorToGrid: true,
      gridBase: 440,
      gridTuning: "12edo",
      gameWidth: 800,
      gameHeight: 600,
      snapYToGrid: (y) => snapYToGrid(y),
    });

    expect(refs.keyboardCursorYOverride).toBeNull();
    expect(refs.cursorX).toBe(220);
    expect(refs.cursorY).toBe(310);
  });

  it("clears grid keyboard override when grid lock is turned off", () => {
    const refs = createInitialNexusRefsState(800, 600);
    refs.cursorY = 275;
    refs.keyboardCursorYOverride = 240;

    resolveResonanceCursorFrame(refs, {
      lockCursorToGrid: false,
      gridBase: 440,
      gridTuning: "12edo",
      gameWidth: 800,
      gameHeight: 600,
      snapYToGrid: (y) => snapYToGrid(y),
    });

    expect(refs.keyboardCursorYOverride).toBeNull();
    expect(refs.cursorY).toBe(275);
  });

  it("stores played keyboard pitches as the active Y override when grid lock is on", () => {
    const refs = createInitialNexusRefsState(800, 600);

    const nextY = setKeyboardCursorPitch(refs, 187, {
      lockCursorToGrid: true,
      gameHeight: 600,
    });

    expect(nextY).toBe(187);
    expect(refs.keyboardCursorYOverride).toBe(187);
    expect(refs.cursorY).toBe(187);
  });
});
