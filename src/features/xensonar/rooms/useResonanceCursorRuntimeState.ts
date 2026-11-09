import { useCallback, useRef, type MutableRefObject } from "react";
import { GAME_HEIGHT, GAME_WIDTH } from "../domain/instrumentData";
import { publishResonanceCursorHudHz } from "./resonanceCursorHudLiveChannel";
import { freqFromY } from "./resonanceRuntimeMath";

export type ResonanceFocusCursorSource = "mouse" | "keyboard" | "arrow" | "grid" | "auto";

export type ResonanceCursorRuntimeState = {
  cursorHudHz: number;
  setCursorHudHz: (value: number | ((prev: number) => number)) => void;
  cursorHudHzRef: MutableRefObject<number>;
  cursorHudLastUpdateRef: MutableRefObject<number>;
  focusCursorRef: MutableRefObject<{ x: number; y: number }>;
  focusCursorLastInputRef: MutableRefObject<ResonanceFocusCursorSource>;
};

export function useResonanceCursorRuntimeState(): ResonanceCursorRuntimeState {
  const initialCursorHzRef = useRef<number | null>(null);
  if (initialCursorHzRef.current === null) initialCursorHzRef.current = freqFromY(GAME_HEIGHT / 2);
  const cursorHudHzRef = useRef(initialCursorHzRef.current);
  const cursorHudLastUpdateRef = useRef(0);
  const focusCursorRef = useRef({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });
  const focusCursorLastInputRef = useRef<ResonanceFocusCursorSource>("auto");

  // Live pitch HUD is presentation-only. Updating it must not invalidate the
  // complete App tree on every keyboard/gliss target. Keep the canonical value
  // in a ref and publish it to the small status-strip owner instead.
  const setCursorHudHz = useCallback((value: number | ((prev: number) => number)) => {
    const next = typeof value === "function" ? value(cursorHudHzRef.current) : value;
    if (!Number.isFinite(next)) return;
    cursorHudHzRef.current = next;
    publishResonanceCursorHudHz(next);
  }, []);

  return {
    cursorHudHz: cursorHudHzRef.current,
    setCursorHudHz,
    cursorHudHzRef,
    cursorHudLastUpdateRef,
    focusCursorRef,
    focusCursorLastInputRef,
  };
}
