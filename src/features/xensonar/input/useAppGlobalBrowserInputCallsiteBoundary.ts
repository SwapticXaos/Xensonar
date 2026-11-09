import { useGameInputBridge } from './useGameInputBridge';
import { useGlobalArrowCapture } from './useGlobalArrowCapture';
import { useGlobalScrollCapture } from './useGlobalScrollCapture';
import type { GameKeyState } from '../rooms/resonanceInputRouting';

type MutableRefLike<T> = { current: T };

export type AppGlobalBrowserInputCallsiteBoundaryArgs = {
  readonly gameInputActive: boolean;
  readonly resonanceInputActive: boolean;
  readonly keyRef: MutableRefLike<GameKeyState>;
};

export const APP_GLOBAL_BROWSER_INPUT_CALLSITE_BOUNDARY_CONTRACT = {
  patch: '3.2.91.6.9.132_app_global_browser_input_callsite_boundary',
  scope: 'callsite-boundary-only',
  preservesHookOrder: true,
  browserInputContainmentOnly: true,
  wrapsGlobalScrollCapture: true,
  wrapsGlobalArrowCapture: true,
  wrapsGameInputBridge: true,
  wrapsDiagnosticsHooks: false,
  wrapsResonanceMusicalKeyGate: false,
  appStillOwnsResonanceHotkeyBody: true,
  appStillOwnsArrowMotionRaf: true,
  runtimeOwned: false,
  audioMutating: false,
  musicalCommandOwned: false,
  packagePersistenceOwned: false,
  visibleUiChangedByBoundary: false,
} as const;

/**
 * App-level browser/game input containment callsite. It preserves the previous
 * top-level hook order while keeping musical resonance commands in App.tsx.
 */
export function useAppGlobalBrowserInputCallsiteBoundary({
  gameInputActive,
  resonanceInputActive,
  keyRef,
}: AppGlobalBrowserInputCallsiteBoundaryArgs) {
  useGlobalScrollCapture();
  useGlobalArrowCapture({ gameInputActive, resonanceInputActive });
  useGameInputBridge({ gameInputActive, keyRef });
}
