import { useSyncExternalStore } from 'react';

type Listener = () => void;
type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
type GetState<T> = () => T;
type StateCreator<T> = (set: SetState<T>, get: GetState<T>) => T;

type BoundStore<T> = {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: (listener: Listener) => () => void;
};

export function create<T>(creator: StateCreator<T>): BoundStore<T> {
  let state: T;
  const listeners = new Set<Listener>();

  const getState: GetState<T> = () => state;

  const setState: SetState<T> = (partial, replace = false) => {
    const nextPartial = typeof partial === 'function' ? partial(state) : partial;
    const nextState = replace ? (nextPartial as T) : Object.assign({}, state, nextPartial);
    if (Object.is(nextState, state)) return;
    state = nextState;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = creator(setState, getState);

  function useBoundStore<U>(selector?: (state: T) => U) {
    const sel = selector ?? ((s: T) => s as unknown as U);
    return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
  }

  (useBoundStore as BoundStore<T>).getState = getState;
  (useBoundStore as BoundStore<T>).setState = setState;
  (useBoundStore as BoundStore<T>).subscribe = subscribe;
  return useBoundStore as BoundStore<T>;
}
