"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ezsale:stay-on-new-sale";

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readStay(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

export function useStayOnNewSale() {
  const stayOnNewSale = useSyncExternalStore(
    subscribe,
    readStay,
    getServerSnapshot,
  );

  const setStayOnNewSale = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // private browsing / quota
    }
    emit();
  }, []);

  return { stayOnNewSale, setStayOnNewSale };
}
