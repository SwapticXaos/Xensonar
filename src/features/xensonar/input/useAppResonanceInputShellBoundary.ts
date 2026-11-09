import { useRef } from 'react';
import type { Room } from '../domain/runtimeTypes';
import { useResonanceActionHoldState } from '../rooms/useResonanceActionHoldState';
import { useResonanceInputIndicator } from './useResonanceInputIndicator';

export type AppResonanceInputShellBoundaryArgs = {
  room: Room;
  nexusActive: boolean;
};

export type AppKeyboardInputRefState = {
  left: boolean;
  right: boolean;
  shoot: boolean;
};

export function useAppResonanceInputShellBoundary({
  room,
  nexusActive,
}: AppResonanceInputShellBoundaryArgs) {
  const keyRef = useRef<AppKeyboardInputRefState>({ left: false, right: false, shoot: false });
  const resonanceInputActive = room === 'RESONANCE' && nexusActive;
  const gameInputActive = room === 'GAME';
  const resonanceInputIndicator = useResonanceInputIndicator(resonanceInputActive);
  const resonanceActionHoldState = useResonanceActionHoldState(resonanceInputActive);

  return {
    keyRef,
    gameInputActive,
    resonanceInputActive,
    resonanceInputIndicator,
    ...resonanceActionHoldState,
  };
}
