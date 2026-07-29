"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** En el primer montaje anima desde 0 hasta el valor. Ideal para métricas del panel. */
  fromZeroOnMount?: boolean;
};

/**
 * Anima un número desde el valor anterior (o 0 en el primer render)
 * hasta `target` con ease-out. Respeta prefers-reduced-motion.
 */
export function useAnimatedNumber(
  target: number,
  durationMs = 700,
  options: Options = {},
) {
  const { fromZeroOnMount = false } = options;
  const [display, setDisplay] = useState(fromZeroOnMount ? 0 : target);
  const fromRef = useRef(fromZeroOnMount ? 0 : target);
  const frameRef = useRef<number | null>(null);
  const prefersReduced = useRef(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    // Primer paint con fromZeroOnMount: forzar animación aunque target === from
    const isFirstMount = !hasMounted.current;
    hasMounted.current = true;

    const from = fromRef.current;
    if (from === target && !(isFirstMount && fromZeroOnMount && target !== 0)) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    if (prefersReduced.current) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const delta = target - from;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + delta * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, fromZeroOnMount]);

  return display;
}
