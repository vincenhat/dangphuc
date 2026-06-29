"use client";

/**
 * useState that mirrors its value to localStorage under `key`, so a selection
 * survives component unmount/remount (e.g. switching the Nursing top-level
 * tabs away from Lessons and back).
 *
 * SSR-safe: starts from `initial`, then hydrates from storage on mount.
 *
 * Key changes are handled: when `key` changes, the value re-hydrates from the
 * new key's stored value, falling back to `initial` if nothing is stored. This
 * lets callers use a dynamic key (e.g. one per subject) and still keep an
 * independent persisted selection per key.
 */

import { useEffect, useRef, useState } from "react";

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const keyRef = useRef(key);
  const hydrated = useRef(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  // Load the saved value on mount and whenever the key changes. Falls back to
  // the initial value when nothing is stored for the (new) key.
  useEffect(() => {
    keyRef.current = key;
    hydrated.current = false;
    let next = initialRef.current;
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) next = JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    setValue(next);
    hydrated.current = true;
  }, [key]);

  // Persist after hydration so we never clobber storage with the initial value.
  // Depends on `value` only; the current key is read from a ref so a key change
  // alone never writes a stale value to the new key.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [value]);

  return [value, setValue];
}
