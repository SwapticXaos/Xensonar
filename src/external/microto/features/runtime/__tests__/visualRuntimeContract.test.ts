import { describe, expect, it, vi } from "vitest";
import {
  sanitizeVisualMaxFrameMs,
  shouldSkipVisualDraw,
  VISUAL_RUNTIME_CONTRACT,
  VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS,
  VISUAL_RUNTIME_MAX_DT_SECONDS,
  VISUAL_RUNTIME_WARN_MISSING_CONTEXT_FRAMES,
} from "../visualRuntimeContract";

describe("visualRuntimeContract", () => {
  it("exports contract guidance strings for core visual-runtime invariants", () => {
    expect(typeof VISUAL_RUNTIME_CONTRACT.contextLifecycle).toBe("string");
    expect(typeof VISUAL_RUNTIME_CONTRACT.inputLifecycle).toBe("string");
    expect(typeof VISUAL_RUNTIME_CONTRACT.loopSequencing).toBe("string");
    expect(typeof VISUAL_RUNTIME_CONTRACT.framePacing).toBe("string");
    expect(VISUAL_RUNTIME_CONTRACT.loopSequencing.toLowerCase()).toMatch(/update|draw/);
    expect(VISUAL_RUNTIME_CONTRACT.framePacing.toLowerCase()).toMatch(/dt|maxframems/);
  });

  it("exports stable default pacing values", () => {
    expect(VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS).toBe(18);
    expect(VISUAL_RUNTIME_MAX_DT_SECONDS).toBe(0.1);
    expect(VISUAL_RUNTIME_WARN_MISSING_CONTEXT_FRAMES).toBeGreaterThan(0);
  });

  it("sanitizes maxFrameMs values", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(sanitizeVisualMaxFrameMs(undefined, "ROOM")).toBeUndefined();
    expect(sanitizeVisualMaxFrameMs(18, "ROOM")).toBe(18);
    expect(sanitizeVisualMaxFrameMs(0, "ROOM")).toBeUndefined();
    expect(sanitizeVisualMaxFrameMs(Number.NaN, "ROOM")).toBeUndefined();
    warnSpy.mockRestore();
  });

  it("computes draw-skip pacing guard", () => {
    expect(shouldSkipVisualDraw(0.016, 18)).toBe(false);
    expect(shouldSkipVisualDraw(0.05, 18)).toBe(true);
    expect(shouldSkipVisualDraw(0.05, undefined)).toBe(false);
  });
});
