import * as React from 'react';
/**
 * Shared first-run hint hook: localStorage-backed "show once" overlay for room discoverability.
 * Aligns with vision §5 (controls understandable from on-screen panels) and §8 (reduce duplication).
 * Use in rooms that display a short hint (legend/keys) on first visit.
 * When dismissOnGlobalInput and firstRunDismissRef are set, the ref is used by the global keydown handler (single listener; vision §8).
 */

import { useCallback, useEffect, useState } from "react";

export type UseFirstRunHintOptions = {
  /** Auto-dismiss after this many ms (default 8000). */
  timeoutMs?: number;
  /** When true, dismiss on any keydown or pointerdown (global). When false, room calls dismissHint from its handlers. */
  dismissOnGlobalInput?: boolean;
  /** When set with dismissOnGlobalInput, register dismissHint here so global handler can call it (single keydown; vision §8). No local listeners added. */
  firstRunDismissRef?: React.MutableRefObject<(() => void) | null>;
};

/**
 * Returns { showFirstRunHint, dismissHint }.
 * - showFirstRunHint: true until user dismisses or timeout.
 * - dismissHint: call to hide and persist (localStorage).
 */
export function useFirstRunHint(
  storageKey: string,
  options?: UseFirstRunHintOptions,
): { showFirstRunHint: boolean; dismissHint: () => void } {
  const { timeoutMs = 8000, dismissOnGlobalInput = false, firstRunDismissRef } = options ?? {};

  const [showFirstRunHint, setShowFirstRunHint] = useState(
    () => typeof localStorage !== "undefined" && !localStorage.getItem(storageKey),
  );

  const dismissHint = useCallback(() => {
    setShowFirstRunHint(false);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* localStorage may be unavailable (private mode, etc.) */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!showFirstRunHint) return;
    const t = window.setTimeout(dismissHint, timeoutMs);
    return () => clearTimeout(t);
  }, [showFirstRunHint, dismissHint, timeoutMs]);

  useEffect(() => {
    if (!showFirstRunHint || !dismissOnGlobalInput) {
      if (firstRunDismissRef) firstRunDismissRef.current = null;
      return;
    }
    if (firstRunDismissRef) {
      firstRunDismissRef.current = dismissHint;
      return () => {
        firstRunDismissRef.current = null;
      };
    }
    const onInput = () => dismissHint();
    window.addEventListener("keydown", onInput);
    window.addEventListener("pointerdown", onInput);
    return () => {
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("pointerdown", onInput);
    };
  }, [showFirstRunHint, dismissHint, dismissOnGlobalInput, firstRunDismissRef]);

  return { showFirstRunHint, dismissHint };
}
