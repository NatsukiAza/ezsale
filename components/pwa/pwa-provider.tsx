"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  isAndroidDevice,
  isAppleTouchDevice,
  isInAppBrowser,
  isInstallSurface,
  isStandaloneDisplay,
} from "@/lib/pwa/detect";
import {
  PwaInstallContext,
  type PwaInstallContextValue,
} from "@/components/pwa/pwa-context";
import { InstallModal } from "@/components/pwa/install-modal";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function snapshot() {
  return {
    standalone: isStandaloneDisplay(),
    installSurface: isInstallSurface(),
    isAppleTouch: isAppleTouchDevice(),
    isAndroid: isAndroidDevice(),
    inAppBrowser: isInAppBrowser(),
  };
}

export function PwaProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [installSurface, setInstallSurface] = useState(false);
  const [isAppleTouch, setIsAppleTouch] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(() => {
    const next = snapshot();
    setStandalone(next.standalone);
    setInstallSurface(next.installSurface);
    setIsAppleTouch(next.isAppleTouch);
    setIsAndroid(next.isAndroid);
    setInAppBrowser(next.inAppBrowser);
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);

    const desktopMq = window.matchMedia(
      "(pointer: fine) and (hover: hover) and (min-width: 1024px)",
    );
    const standaloneMq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => refresh();
    desktopMq.addEventListener("change", onChange);
    standaloneMq.addEventListener("change", onChange);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      refresh();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
    }

    return () => {
      desktopMq.removeEventListener("change", onChange);
      standaloneMq.removeEventListener("change", onChange);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [refresh]);

  const showCta = ready && !standalone && installSurface;

  const nativeInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      ready,
      showCta,
      canNativeInstall: Boolean(deferredPrompt),
      isAppleTouch,
      isAndroid,
      inAppBrowser,
      modalOpen,
      openModal: () => setModalOpen(true),
      closeModal: () => setModalOpen(false),
      nativeInstall,
    }),
    [
      ready,
      showCta,
      deferredPrompt,
      isAppleTouch,
      isAndroid,
      inAppBrowser,
      modalOpen,
      nativeInstall,
    ],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <InstallModal />
    </PwaInstallContext.Provider>
  );
}
