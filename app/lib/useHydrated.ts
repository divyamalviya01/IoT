import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during pre-render and the first client render, true after hydration. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
