import {
  applyDirectionalGameIntent,
  isWheelScrollAllowedTarget as isWheelScrollAllowedTargetPolicy,
  resolveResonanceInputTargetScope,
  shouldCaptureResonanceKeyIntent,
} from './resonanceInputPolicy';
import type { GameKeyState } from './resonanceInputTypes';
export type { GameKeyState } from './resonanceInputTypes';

export function isForgeHotkeyTarget(target: EventTarget | null) {
  return resolveResonanceInputTargetScope(target) === 'forge';
}

export function isMaterialLoopManagerTarget(target: EventTarget | null) {
  return resolveResonanceInputTargetScope(target) === 'material-loop-manager';
}

export function isWheelScrollAllowedTarget(target: EventTarget | null) {
  return isWheelScrollAllowedTargetPolicy(target);
}

export function applyGameKeyState(event: KeyboardEvent, isDown: boolean, keyState: GameKeyState) {
  applyDirectionalGameIntent(event, isDown, keyState);
}

export function shouldCaptureResonanceKey(event: KeyboardEvent, quantizeOn: boolean) {
  return shouldCaptureResonanceKeyIntent(event, quantizeOn);
}

