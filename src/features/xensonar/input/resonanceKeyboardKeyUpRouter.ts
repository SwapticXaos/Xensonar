import { runResonanceKeyUpHoldBoundary } from './resonanceArrowHoldKeyBoundary';
import type {
  ResonanceArrowState,
  ResonanceHoldKeyActions,
} from './resonanceKeyboardCommandActions';

export type ResonanceKeyboardKeyUpRouterRuntime = {
  event: KeyboardEvent;
  arrowState: ResonanceArrowState;
};

export type ResonanceKeyboardKeyUpRouterActions = {
  holdActions: ResonanceHoldKeyActions;
};

export type ResonanceKeyboardKeyUpRouterArgs = {
  runtime: ResonanceKeyboardKeyUpRouterRuntime;
  actions: ResonanceKeyboardKeyUpRouterActions;
};

export type ResonanceKeyboardKeyUpRouterResult =
  | { handled: true; route: 'arrow-hold-release' }
  | { handled: false; route: 'ignored' };

export function runResonanceKeyboardKeyUpRouter({
  runtime,
  actions,
}: ResonanceKeyboardKeyUpRouterArgs): ResonanceKeyboardKeyUpRouterResult {
  const { event, arrowState } = runtime;
  const { holdActions } = actions;

  const handled = runResonanceKeyUpHoldBoundary({
    event,
    arrowState,
    holdActions,
  });

  return handled
    ? { handled: true, route: 'arrow-hold-release' }
    : { handled: false, route: 'ignored' };
}
