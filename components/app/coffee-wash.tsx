"use client";

import { useEffect } from "react";
import { useAmbientBackground } from "@/lib/preferences/ambient-background";

const wash = (
  <div className="coffee-wash motion-reduce:hidden" aria-hidden>
    <div className="coffee-wash-a" />
    <div className="coffee-wash-b" />
  </div>
);

const SCROLL_PAUSE_MS = 150;

export function CoffeeWash() {
  const { enabled } = useAmbientBackground();

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    let timer = 0;
    let scrolling = false;

    const resume = () => {
      scrolling = false;
      root.classList.remove("is-scrolling");
    };

    const onScroll = () => {
      if (!scrolling) {
        scrolling = true;
        root.classList.add("is-scrolling");
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(resume, SCROLL_PAUSE_MS);
    };

    document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.clearTimeout(timer);
      resume();
    };
  }, [enabled]);

  return enabled ? wash : null;
}
