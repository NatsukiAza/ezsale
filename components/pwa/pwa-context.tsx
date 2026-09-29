"use client";

import { createContext, useContext } from "react";

export type PwaInstallContextValue = {
  ready: boolean;
  showCta: boolean;
  canNativeInstall: boolean;
  isAppleTouch: boolean;
  isAndroid: boolean;
  inAppBrowser: boolean;
  modalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  nativeInstall: () => Promise<void>;
};

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(
  null,
);

export function usePwaInstall() {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaProvider");
  }
  return ctx;
}
