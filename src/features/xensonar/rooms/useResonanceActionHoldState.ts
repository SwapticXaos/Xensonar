import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

export type ResonanceActionBadges = {
  octave: boolean;
  sustain: boolean;
  swell: boolean;
};

export type ResonanceActionHoldState = {
  resonanceActionBadges: ResonanceActionBadges;
  waveSoundSwellHeldRef: MutableRefObject<boolean>;
  waveSoundSwellRef: MutableRefObject<number>;
  waveStartOctaveHoldRef: MutableRefObject<boolean>;
  longToneHoldRef: MutableRefObject<boolean>;
  enterHoldRef: MutableRefObject<boolean>;
  setSustainHoldActive: (active: boolean) => void;
  setSwellHoldActive: (active: boolean) => void;
  setOctaveHoldActive: (active: boolean) => void;
  setEnterHoldActive: (active: boolean) => void;
  resetResonanceActionHolds: () => void;
};

export function useResonanceActionHoldState(resonanceInputActive: boolean): ResonanceActionHoldState {
  const [resonanceActionBadges, setResonanceActionBadges] = useState<ResonanceActionBadges>({ octave: false, sustain: false, swell: false });
  const waveSoundSwellHeldRef = useRef(false);
  const waveSoundSwellRef = useRef(0);
  const waveStartOctaveHoldRef = useRef(false);
  const longToneHoldRef = useRef(false);
  const enterHoldRef = useRef(false);

  const setSustainHoldActive = useCallback((active: boolean) => {
    longToneHoldRef.current = active;
    setResonanceActionBadges((prev) => (prev.sustain === active ? prev : { ...prev, sustain: active }));
  }, []);

  const setSwellHoldActive = useCallback((active: boolean) => {
    waveSoundSwellHeldRef.current = active;
    setResonanceActionBadges((prev) => (prev.swell === active ? prev : { ...prev, swell: active }));
  }, []);

  const setOctaveHoldActive = useCallback((active: boolean) => {
    waveStartOctaveHoldRef.current = active;
    setResonanceActionBadges((prev) => (prev.octave === active ? prev : { ...prev, octave: active }));
  }, []);

  const setEnterHoldActive = useCallback((active: boolean) => {
    enterHoldRef.current = active;
  }, []);

  const resetResonanceActionHolds = useCallback(() => {
    waveSoundSwellHeldRef.current = false;
    waveSoundSwellRef.current = 0;
    waveStartOctaveHoldRef.current = false;
    longToneHoldRef.current = false;
    enterHoldRef.current = false;
    setResonanceActionBadges({ octave: false, sustain: false, swell: false });
  }, []);

  useEffect(() => {
    if (!resonanceInputActive) return;
    let raf = 0;
    const tick = () => {
      if (waveSoundSwellHeldRef.current) {
        waveSoundSwellRef.current = Math.min(1, waveSoundSwellRef.current + 0.028);
      } else {
        waveSoundSwellRef.current = Math.max(0, waveSoundSwellRef.current - 0.12);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [resonanceInputActive]);

  return {
    resonanceActionBadges,
    waveSoundSwellHeldRef,
    waveSoundSwellRef,
    waveStartOctaveHoldRef,
    longToneHoldRef,
    enterHoldRef,
    setSustainHoldActive,
    setSwellHoldActive,
    setOctaveHoldActive,
    setEnterHoldActive,
    resetResonanceActionHolds,
  };
}
