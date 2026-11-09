import { type RefObject, useEffect, useRef } from "react";
import { registerRaf, unregisterRaf } from "./rafCount";
import {
  noteMissingCanvasContext,
  noteMissingRafRoomId,
  noteVisualFrameError,
  sanitizeVisualMaxFrameMs,
  shouldSkipVisualDraw,
  VISUAL_RUNTIME_MAX_DT_SECONDS,
} from "./visualRuntimeContract";

/**
 * Shared RAF loop primitive: runs update(dt, now?) then draw(ctx) each frame when active.
 * Use for room-scoped canvas simulations to centralize frame pacing and RAF accounting.
 *
 * Contract: init/audio setup stays in the room hook; this hook only runs the loop.
 * Consumers must: (1) pass active that becomes false on room leave/unmount so cleanup runs;
 * (2) pass update/draw that read latest state refs;
 * (3) ensure draw reads state that update just wrote (same frame). Optional `now` is for draw-time-dependent effects.
 * See docu/EVOLUTION-optimal-program-flow-v1.md §4.2, docu/STRUCTURE-optimization-v1.md, docu/REFLECTION-related-functions-consistency-v1.md §7 and §7a.
 *
 * Optional maxFrameMs (e.g. 18 for ~60 FPS): when frame delta exceeds this, draw is skipped to catch up (vision §5 stable frame pacing).
 */
export type UseSimulationLoopOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  /** Second arg `now` (frame time) is optional for consumers that need it (e.g. landscape animation). */
  update: (dt: number, now?: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
  /** When true (default), register/unregister with rafCount for DiagnosticsHUD. */
  registerRaf?: boolean;
  /** Optional room id (e.g. "RESONANCE") for dev observability and lifecycle leak check. Pass when registerRaf is true. */
  roomId?: string;
  /** When set (e.g. 18 ms), skip draw when frame delta exceeds this to catch up (vision §5 stable ~60 FPS). */
  maxFrameMs?: number;
};

export function useSimulationLoop({
  canvasRef,
  active,
  update,
  draw,
  registerRaf: doRegisterRaf = true,
  roomId,
  maxFrameMs,
}: UseSimulationLoopOptions): void {
  const animIdRef = useRef<number>(0);
  const runningRef = useRef(false);
  const lastRef = useRef<number>(0);
  const updateRef = useRef(update);
  const drawRef = useRef(draw);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const ctxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const missingContextFramesRef = useRef(0);
  const consecutiveFrameErrorsRef = useRef(0);

  updateRef.current = update;
  drawRef.current = draw;

  useEffect(() => {
    if (!active) return;

    runningRef.current = true;
    if (doRegisterRaf) noteMissingRafRoomId(roomId);
    if (doRegisterRaf) registerRaf(roomId);
    const sanitizedMaxFrameMs = sanitizeVisualMaxFrameMs(maxFrameMs, roomId);

    const resolveContext = (): CanvasRenderingContext2D | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      if (ctxRef.current != null && ctxCanvasRef.current === canvas) {
        return ctxRef.current;
      }
      const ctx = canvas.getContext("2d");
      ctxRef.current = ctx;
      ctxCanvasRef.current = canvas;
      return ctx;
    };

    const loop = (now: number) => {
      const last = lastRef.current;
      const dt = last === 0 ? 0 : Math.min((now - last) / 1000, VISUAL_RUNTIME_MAX_DT_SECONDS);
      lastRef.current = now;

      try {
        updateRef.current(dt, now);
        const skipDraw = shouldSkipVisualDraw(dt, sanitizedMaxFrameMs);
        if (!skipDraw) {
          const ctx = resolveContext();
          if (ctx) {
            missingContextFramesRef.current = 0;
            drawRef.current(ctx);
          } else {
            missingContextFramesRef.current += 1;
            noteMissingCanvasContext(roomId, missingContextFramesRef.current);
          }
        }
        consecutiveFrameErrorsRef.current = 0;
      } catch (error) {
        consecutiveFrameErrorsRef.current += 1;
        noteVisualFrameError(roomId, error, consecutiveFrameErrorsRef.current);
      } finally {
        if (runningRef.current) {
          animIdRef.current = requestAnimationFrame(loop);
        }
      }
    };

    lastRef.current = performance.now();
    missingContextFramesRef.current = 0;
    consecutiveFrameErrorsRef.current = 0;
    animIdRef.current = requestAnimationFrame(loop);

    return () => {
      runningRef.current = false;
      cancelAnimationFrame(animIdRef.current);
      if (doRegisterRaf) unregisterRaf(roomId);
      ctxRef.current = null;
      ctxCanvasRef.current = null;
      lastRef.current = 0;
      missingContextFramesRef.current = 0;
      consecutiveFrameErrorsRef.current = 0;
    };
  }, [active, doRegisterRaf, roomId, maxFrameMs, canvasRef]);
}
