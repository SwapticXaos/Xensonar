import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { StampData } from '../spectralForge/audio/SpectralData';

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element && (
    element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
    || element.isContentEditable
  );
}

function isStampTransformKey(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const code = event.code;
  return key === 'escape'
    || key === 'enter'
    || key === 'r'
    || key === 'arrowright'
    || key === 'arrowleft'
    || key === 'arrowup'
    || key === 'arrowdown'
    || code === 'KeyQ'
    || code === 'KeyE'
    || key === 'q'
    || key === 'e';
}

export function useCanonicalStampHotkeys(args: {
  forgeRootRef: RefObject<HTMLElement | null>;
  forgeHotkeyScopeActiveRef: MutableRefObject<boolean>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  activeTool: string;
  stampPhase: 'idle' | 'selecting' | 'stamping';
  stampData: StampData | null;
  isStampSelectingRef: MutableRefObject<boolean>;
  stampSelEndRef: MutableRefObject<{ x: number; y: number } | null>;
  stampArrowHoldRef: MutableRefObject<Record<string, number>>;
  setStampSelStart: (value: { x: number; y: number } | null) => void;
  setStampPhase: (value: 'idle' | 'selecting' | 'stamping') => void;
  setStatus: (value: string) => void;
  setStampRotation: (updater: (value: number) => number) => void;
  setStampScaleX: (updater: (value: number) => number) => void;
  setStampScaleY: (updater: (value: number) => number) => void;
  getStampArrowDelta: (event: KeyboardEvent, key: string) => number;
}) {
  const handleStampTransformKey = (event: KeyboardEvent, scopeMode: 'strict' | 'fallback') => {
    if (args.activeTool !== 'stamp') return false;
    if (!isStampTransformKey(event)) return false;

    const target = event.target as HTMLElement | null;
    if (isEditableTarget(target)) return false;

    const root = args.forgeRootRef.current;
    const scopeActive = args.forgeHotkeyScopeActiveRef.current
      || (!!root && !!target && root.contains(target))
      || (!!root && !!document.activeElement && root.contains(document.activeElement));

    if (scopeMode === 'strict' && !scopeActive) return false;
    if (scopeMode === 'fallback' && !args.forgeHotkeyScopeActiveRef.current) return false;

    const key = event.key.toLowerCase();
    const code = event.code;

    event.preventDefault();
    event.stopPropagation();

    if (key === 'escape') {
      if (args.isStampSelectingRef.current) {
        args.isStampSelectingRef.current = false;
        args.setStampSelStart(null);
        args.stampSelEndRef.current = null;
        args.setStampPhase(args.stampData ? 'stamping' : 'idle');
        args.setStatus('Stamp-Auswahl abgebrochen.');
      } else {
        args.setStampPhase(args.stampData ? 'stamping' : 'idle');
      }
      return true;
    }
    if (key === 'r') {
      args.setStampPhase('selecting');
      args.setStatus('Stamp steht auf Rechteck-Aufnahme.');
      return true;
    }
    if (key === 'enter' && args.stampData) {
      args.setStampPhase('stamping');
      args.setStatus('Stamp steht auf Einsetzen.');
      return true;
    }
    if (code === 'KeyQ' || key === 'q') {
      args.setStampRotation((v) => v - Math.PI / 32);
      return true;
    }
    if (code === 'KeyE' || key === 'e') {
      args.setStampRotation((v) => v + Math.PI / 32);
      return true;
    }
    if (key === 'arrowright') {
      const delta = args.getStampArrowDelta(event, key);
      args.setStampScaleX((v) => Math.min(4, v + delta));
      return true;
    }
    if (key === 'arrowleft') {
      const delta = args.getStampArrowDelta(event, key);
      args.setStampScaleX((v) => Math.max(0.2, v - delta));
      return true;
    }
    if (key === 'arrowup') {
      const delta = args.getStampArrowDelta(event, key);
      args.setStampScaleY((v) => Math.min(4, v + delta));
      return true;
    }
    if (key === 'arrowdown') {
      const delta = args.getStampArrowDelta(event, key);
      args.setStampScaleY((v) => Math.max(0.2, v - delta));
      return true;
    }
    return false;
  };

  useEffect(() => {
    const onStampKeyCapture = (event: KeyboardEvent) => {
      handleStampTransformKey(event, 'strict');
    };
    window.addEventListener('keydown', onStampKeyCapture, true);
    return () => window.removeEventListener('keydown', onStampKeyCapture, true);
  });

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (!(key in args.stampArrowHoldRef.current)) return;
      delete args.stampArrowHoldRef.current[key];
    };
    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  });

  useEffect(() => {
    const canvas = args.canvasRef.current;
    if (!canvas) return;
    const handleNativeWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (args.activeTool !== 'stamp' || args.stampPhase !== 'stamping' || !args.stampData) return;
      const zoomFactor = event.deltaY < 0 ? 1.085 : 1 / 1.085;
      args.setStampScaleX((value) => Math.max(0.2, Math.min(4, value * zoomFactor)));
      args.setStampScaleY((value) => Math.max(0.2, Math.min(4, value * zoomFactor)));
    };
    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel as EventListener);
  }, [args.canvasRef, args.activeTool, args.stampPhase, args.stampData, args.setStampScaleX, args.setStampScaleY]);

  return {
    handleStampTransformKey,
  };
}
