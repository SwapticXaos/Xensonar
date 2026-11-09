/**
 * Lightweight visual-runtime contract for canvas room loops.
 * Keeps loop semantics and guardrails in one place:
 * - update(dt, now) runs before draw(ctx),
 * - dt is clamped,
 * - draw can be skipped when frame pacing is exceeded,
 * - diagnostics warnings are dev-only and warn-once where possible.
 */

export const VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS = 18;
export const VISUAL_RUNTIME_MAX_DT_SECONDS = 0.1;
export const VISUAL_RUNTIME_WARN_MISSING_CONTEXT_FRAMES = 30;

export const VISUAL_RUNTIME_CONTRACT = {
  contextLifecycle:
    "Resolve and cache one 2D context per canvas instance; reset cached context on unmount or canvas switch.",
  inputLifecycle:
    "Bind input only while room is active (useRoomInput/useCanvasRoom); unbind on room switch and unmount.",
  loopSequencing:
    "Each frame runs update(dt, now) before draw(ctx); draw should only read state written by update.",
  framePacing:
    "Clamp dt to VISUAL_RUNTIME_MAX_DT_SECONDS and skip draw when delta exceeds maxFrameMs (default VISUAL_RUNTIME_DEFAULT_MAX_FRAME_MS).",
} as const;

const devWarnings = new Set<string>();

function isDevRuntime(): boolean {
  return typeof import.meta !== "undefined" && !!import.meta.env?.DEV;
}

function warnOnce(key: string, message: string): void {
  if (!isDevRuntime()) return;
  if (devWarnings.has(key)) return;
  devWarnings.add(key);
  console.warn(`[XENSONAR dev] ${message}`);
}

export function sanitizeVisualMaxFrameMs(
  maxFrameMs: number | undefined,
  roomId?: string,
): number | undefined {
  if (maxFrameMs == null) return undefined;
  if (Number.isFinite(maxFrameMs) && maxFrameMs > 0) return maxFrameMs;
  warnOnce(
    `invalid-maxFrameMs:${roomId ?? "unknown"}`,
    `Invalid maxFrameMs (${String(maxFrameMs)}) for room "${roomId ?? "unknown"}". Falling back to no draw-skip guard.`,
  );
  return undefined;
}

export function shouldSkipVisualDraw(dtSeconds: number, maxFrameMs: number | undefined): boolean {
  return maxFrameMs != null && dtSeconds * 1000 > maxFrameMs;
}

export function noteMissingRafRoomId(roomId?: string): void {
  if (roomId) return;
  warnOnce(
    "missing-raf-room-id",
    "useSimulationLoop called with registerRaf=true and no roomId. RAF diagnostics labels may be ambiguous.",
  );
}

export function noteMissingCanvasContext(roomId: string | undefined, missingFrames: number): void {
  if (missingFrames < VISUAL_RUNTIME_WARN_MISSING_CONTEXT_FRAMES) return;
  warnOnce(
    `missing-canvas-context:${roomId ?? "unknown"}`,
    `Canvas 2D context unavailable for ${missingFrames} frames in room "${roomId ?? "unknown"}".`,
  );
}

export function noteVisualFrameError(
  roomId: string | undefined,
  error: unknown,
  consecutiveErrors: number,
): void {
  if (!isDevRuntime()) return;
  if (consecutiveErrors !== 1 && consecutiveErrors % 30 !== 0) return;
  console.error(
    `[XENSONAR dev] useSimulationLoop frame error in room "${roomId ?? "unknown"}" (consecutive=${consecutiveErrors}).`,
    error,
  );
}
