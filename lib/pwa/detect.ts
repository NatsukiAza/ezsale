export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

/** Teléfono o tablet. Oculto en computadora (mouse + pantalla ancha). */
export function isInstallSurface(): boolean {
  if (typeof window === "undefined") return false;
  return !window.matchMedia(
    "(pointer: fine) and (hover: hover) and (min-width: 1024px)",
  ).matches;
}

export function isAppleTouchDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|Pinterest|Snapchat|TikTok|Bytedance|MicroMessenger/i.test(
    navigator.userAgent,
  );
}
