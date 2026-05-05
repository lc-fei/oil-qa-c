import { useSyncExternalStore } from 'react';

type Listener = () => void;

export function createStore<TState>(initialState: TState) {
  let state = initialState;
  const listeners = new Set<Listener>();

  function setState(updater: Partial<TState> | ((current: TState) => TState)) {
    state = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function useStore<TSelected>(selector: (current: TState) => TSelected) {
    return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
  }

  return {
    getState: () => state,
    setState,
    useStore,
  };
}
