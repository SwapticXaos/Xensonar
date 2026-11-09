import { useCallback, useEffect, useRef } from 'react';
import type { SpectralForgePreviewRouteKind } from './spectralForgePreviewSessionTypes';

export type TransportPreviewQuietWindowTiming = {
  coldIdleMs: number;
  firstDelayMs: number;
  retryDelayMs: number;
};

export type TransportPreviewQuietWindowState = TransportPreviewQuietWindowTiming & {
  pointerDown: boolean;
  quietForMs: number;
  remainingQuietMs: number;
  blocked: boolean;
};

export function resolveTransportPreviewQuietWindowTiming(
  routeKind: SpectralForgePreviewRouteKind,
): TransportPreviewQuietWindowTiming {
  return routeKind === 'basis-hearing'
    ? { coldIdleMs: 520, firstDelayMs: 160, retryDelayMs: 140 }
    : { coldIdleMs: 2000, firstDelayMs: 80, retryDelayMs: 80 };
}

export function useTransportPreviewActivityGate() {
  const userPointerDownRef = useRef(false);
  const lastUserActivityAtRef = useRef(
    typeof performance !== 'undefined' ? performance.now() : 0,
  );

  useEffect(() => {
    const markToolActivity = () => {
      lastUserActivityAtRef.current = performance.now();
    };
    const handlePointerDown = () => {
      userPointerDownRef.current = true;
      markToolActivity();
    };
    const handlePointerUp = () => {
      userPointerDownRef.current = false;
      markToolActivity();
    };
    const handleWheel = () => {
      // Wheel gestures can mutate zoom/viewport/tool state. Plain pointermove is
      // intentionally ignored so post-gesture cursor motion cannot postpone the
      // cold render indefinitely.
      markToolActivity();
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const getQuietWindowState = useCallback((
    routeKind: SpectralForgePreviewRouteKind,
    now = performance.now(),
  ): TransportPreviewQuietWindowState => {
    const timing = resolveTransportPreviewQuietWindowTiming(routeKind);
    const quietForMs = now - lastUserActivityAtRef.current;
    const pointerDown = userPointerDownRef.current;
    const remainingQuietMs = Math.max(0, timing.coldIdleMs - quietForMs);
    return {
      ...timing,
      pointerDown,
      quietForMs,
      remainingQuietMs,
      blocked: pointerDown || quietForMs < timing.coldIdleMs,
    };
  }, []);

  return { getQuietWindowState };
}
