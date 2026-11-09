import { useEffect, useRef } from "react";

/**
 * Listen for cross-tab localStorage updates for a single key.
 * Uses a ref so callers can pass inline callbacks without re-binding the listener every render.
 */
export function useStorageKeyListener(key: string, onKeyChange: () => void) {
  const onKeyChangeRef = useRef(onKeyChange);
  useEffect(() => {
    onKeyChangeRef.current = onKeyChange;
  }, [onKeyChange]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      onKeyChangeRef.current();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);
}

