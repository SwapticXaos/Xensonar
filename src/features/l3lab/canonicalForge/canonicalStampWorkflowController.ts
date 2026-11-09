import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { StampData } from '../spectralForge/audio/SpectralData';
import { cloneStampData } from './spectralWorkspaceUtils';

export function createCanonicalStampWorkflowController(args: {
  isStampSelectingRef: MutableRefObject<boolean>;
  stampLoadedModeRef: MutableRefObject<'positive' | 'erase'>;
  stampArrowHoldRef: MutableRefObject<Record<string, number>>;
  stampSelEndRef: MutableRefObject<{ x: number; y: number } | null>;
  eraseMode: boolean;
  setStampData: Dispatch<SetStateAction<StampData | null>>;
  setStampPhase: (value: 'idle' | 'selecting' | 'stamping') => void;
  setStampSelStart: (value: { x: number; y: number } | null) => void;
  setEraseMode: (value: boolean) => void;
  setStampScaleX: (value: number) => void;
  setStampScaleY: (value: number) => void;
  setStampRotation: (value: number) => void;
  setStampFlipX: (value: boolean) => void;
  setStampFlipY: (value: boolean) => void;
  setStatus: (value: string) => void;
}) {
  const updateStampData = (next: StampData | null) => args.setStampData(next ? cloneStampData(next) : null);

  const resetStampTransforms = () => {
    args.setStampScaleX(1);
    args.setStampScaleY(1);
    args.setStampRotation(0);
    args.setStampFlipX(false);
    args.setStampFlipY(false);
    args.setStatus('Stamp-Transformation zurückgesetzt.');
  };

  const clearStampAndRestoreWorkflow = (statusMessage = 'Stamp geleert.') => {
    args.isStampSelectingRef.current = false;
    args.setStampSelStart(null);
    args.stampSelEndRef.current = null;
    updateStampData(null);
    args.setStampPhase('idle');
    args.setEraseMode(args.stampLoadedModeRef.current === 'erase');
    args.stampArrowHoldRef.current = {};
    args.setStatus(statusMessage);
  };

  const loadStampForPlacement = (
    next: StampData,
    options?: { loadedFromMode?: 'positive' | 'erase'; autoReturnToPositive?: boolean; status?: string },
  ) => {
    updateStampData(next);
    args.setStampPhase('stamping');
    resetStampTransforms();
    args.stampLoadedModeRef.current = options?.loadedFromMode ?? (args.eraseMode ? 'erase' : 'positive');
    if (options?.autoReturnToPositive) {
      args.setEraseMode(false);
    }
    if (options?.status) args.setStatus(options.status);
  };

  const getStampArrowDelta = (event: KeyboardEvent, key: string) => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (!event.repeat || !(key in args.stampArrowHoldRef.current)) {
      args.stampArrowHoldRef.current[key] = now;
      return 0.004;
    }
    const heldMs = now - args.stampArrowHoldRef.current[key];
    if (heldMs >= 6000) return 0.06;
    if (heldMs >= 4000) return 0.03;
    if (heldMs >= 2000) return 0.015;
    return 0.004;
  };

  const getEffectiveStampIntensity = () => {
    if (args.eraseMode || args.stampLoadedModeRef.current === 'erase') return 1;
    return 0.25;
  };

  return {
    resetStampTransforms,
    clearStampAndRestoreWorkflow,
    loadStampForPlacement,
    getStampArrowDelta,
    getEffectiveStampIntensity,
  };
}
