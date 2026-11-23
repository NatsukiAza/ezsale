"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ezsale:ambient-background";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function getServerSnapshot() {
  return true;
}

export function useAmbientBackground() {
  const enabled = useSyncExternalStore(
    subscribe,
    readEnabled,
    getServerSnapshot,
  );

  const setEnabled = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // private browsing / quota
    }
    emit();
  }, []);

  return { enabled, setEnabled };
}
