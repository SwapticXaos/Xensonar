import { isTargetWithinHotkeyScope, isResonanceWaveTriggerKey } from '../resonanceKeyboard';
import { MATERIAL_LOOP_HOTKEY_KEYS } from './resonanceUiConfig';
import type { GameKeyState } from './resonanceInputTypes';

export type ResonanceInputTargetScope = 'forge' | 'material-loop-manager' | 'generic';

export function resolveResonanceInputTargetScope(target: EventTarget | null): ResonanceInputTargetScope {
  if (isTargetWithinHotkeyScope(target, 'forge')) return 'forge';
  if (isTargetWithinHotkeyScope(target, 'material-loop-manager')) return 'material-loop-manager';
  return 'generic';
}

export function isWheelScrollAllowedTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest('[data-wheel-allow-scroll="true"], [data-xensonar-scroll-island], [data-spectralforge-scroll-root="true"], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, .overflow-scroll');
}

export function applyDirectionalGameIntent(event: KeyboardEvent, isDown: boolean, keyState: GameKeyState) {
  const normalizedKey = event.key.toLowerCase();
  if (event.key === 'ArrowLeft' || normalizedKey === 'a') keyState.left = isDown;
  if (event.key === 'ArrowRight' || normalizedKey === 'd') keyState.right = isDown;
  if (event.code === 'Space') {
    keyState.shoot = isDown;
    if (isDown) event.preventDefault();
  }
}

export function isMaterialLoopHotkeyKey(key: string) {
  const normalized = key.toLowerCase();
  return (
    MATERIAL_LOOP_HOTKEY_KEYS.includes(normalized as (typeof MATERIAL_LOOP_HOTKEY_KEYS)[number])
    || normalized === '#'
    || normalized === "'"
    || normalized === 'ö'
    || normalized === 'ä'
    || normalized === 'ü'
  );
}

export function shouldCaptureResonanceKeyIntent(event: KeyboardEvent, quantizeOn: boolean) {
  return (
    event.code === 'Space'
    || event.code === 'Backspace'
    || event.code === 'Backquote'
    || event.code === 'F9'
    || event.key === 'Enter'
    || isResonanceWaveTriggerKey(event.key)
    || isMaterialLoopHotkeyKey(event.key)
    || (event.code === 'Tab' && quantizeOn)
  );
}
