import { isEditableTarget } from '../resonanceKeyboard';
import { isForgeHotkeyTarget, isMaterialLoopManagerTarget } from '../rooms/resonanceInputRouting';

export type ResonanceArrowState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export type ResonanceKeyboardAudioCommandArgs = {
  event: KeyboardEvent;
  key: string;
  ensureAudioReady: () => Promise<unknown>;
  command: () => void;
  reportFailure: (error: unknown, context: Record<string, unknown>) => void;
  failureContext?: Record<string, unknown>;
};

export const shouldIgnoreResonanceKeyboardTarget = (event: KeyboardEvent) => (
  isEditableTarget(event.target)
  || isForgeHotkeyTarget(event.target)
  || isMaterialLoopManagerTarget(event.target)
);

export const shouldIgnoreResonanceKeyboardDown = (
  event: KeyboardEvent,
  managedLoopMaterial: unknown,
) => shouldIgnoreResonanceKeyboardTarget(event) || !!managedLoopMaterial;

export const setResonanceArrowKeyState = (
  arrowState: ResonanceArrowState,
  key: string,
  isPressed: boolean,
) => {
  if (key === 'ArrowLeft') {
    arrowState.left = isPressed;
    return true;
  }
  if (key === 'ArrowRight') {
    arrowState.right = isPressed;
    return true;
  }
  if (key === 'ArrowUp') {
    arrowState.up = isPressed;
    return true;
  }
  if (key === 'ArrowDown') {
    arrowState.down = isPressed;
    return true;
  }
  return false;
};

export const runResonanceKeyboardAudioCommand = ({
  event,
  key,
  ensureAudioReady,
  command,
  reportFailure,
  failureContext = {},
}: ResonanceKeyboardAudioCommandArgs) => {
  event.preventDefault();
  void ensureAudioReady()
    .then(command)
    .catch((error) => reportFailure(error, { key, ...failureContext }));
};



export const isResonanceSustainExtendKey = (
  event: Pick<KeyboardEvent, 'code' | 'key'>,
) => event.code === 'Equal' || event.key === '`' || event.key === '´';

export type ResonanceHoldKeyActions = {
  setSustainHoldActive: (isActive: boolean) => void;
  setSwellHoldActive: (isActive: boolean) => void;
  setOctaveHoldActive: (isActive: boolean) => void;
  setEnterHoldActive?: (isActive: boolean) => void;
  releaseHeldScheduledTones?: () => void;
};

export const handleResonanceMomentaryHoldKeyDown = (
  event: KeyboardEvent,
  actions: ResonanceHoldKeyActions,
) => {
  if (isResonanceSustainExtendKey(event)) {
    event.preventDefault();
    actions.setSustainHoldActive(true);
    return true;
  }
  if (event.code === 'Space') {
    event.preventDefault();
    actions.setSwellHoldActive(true);
    return true;
  }
  if (event.code === 'Backspace') {
    event.preventDefault();
    actions.setOctaveHoldActive(true);
    return true;
  }
  return false;
};

export const handleResonanceHoldKeyUp = (
  event: KeyboardEvent,
  actions: ResonanceHoldKeyActions,
) => {
  if (isResonanceSustainExtendKey(event)) {
    actions.setSustainHoldActive(false);
    actions.releaseHeldScheduledTones?.();
    return true;
  }
  if (event.code === 'Space') {
    actions.setSwellHoldActive(false);
    return true;
  }
  if (event.code === 'Backspace') {
    actions.setOctaveHoldActive(false);
    return true;
  }
  if (event.key === 'Enter') {
    actions.setEnterHoldActive?.(false);
    return true;
  }
  return false;
};
