"use client";

import { cn } from "@/lib/utils";
import { formatArs, formatNumber } from "@/lib/format";
import { usePrivacy } from "@/components/app/privacy";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

type MoneyProps = {
  value: number;
  /** Cifras de métrica: fuente display en vez de mono. Ver DESIGN.md § 3.3 */
  display?: boolean;
  /** Ignora el modo privacidad. Solo para totales que el usuario acaba de tipear. */
  alwaysVisible?: boolean;
  /** Anima el valor cuando cambia (count-up / count-down). */
  animate?: boolean;
  className?: string;
};

export function Money({
  value,
  display = false,
  alwaysVisible = false,
  animate = false,
  className,
}: MoneyProps) {
  const { hidden } = usePrivacy();
  const masked = hidden && !alwaysVisible;
  const animated = useAnimatedNumber(value, display ? 800 : 500, {
    fromZeroOnMount: animate,
  });
  const shown = animate && !masked ? animated : value;

  return (
    <span
      className={cn(
        "tabular-nums",
        display ? "font-display font-bold [font-optical-sizing:auto]" : "font-mono",
        masked && "select-none",
        className,
      )}
      aria-label={masked ? "Importe oculto" : undefined}
    >
      {masked ? (
        <>
          <span aria-hidden="true">$&nbsp;********</span>
          <span className="sr-only">Importe oculto</span>
        </>
      ) : (
        formatArs(shown)
      )}
    </span>
  );
}

type AnimatedCountProps = {
  value: number;
  className?: string;
  /** Decimales al formatear (0 = entero). */
  fractionDigits?: number;
};

/** Contador entero/decimal animado (tickets, unidades, etc.). */
export function AnimatedCount({
  value,
  className,
  fractionDigits = 0,
}: AnimatedCountProps) {
  const animated = useAnimatedNumber(value, 700, { fromZeroOnMount: true });
  const rounded =
    fractionDigits === 0
      ? Math.round(animated)
      : Number(animated.toFixed(fractionDigits));

  return (
    <span className={cn("tabular-nums", className)}>
      {fractionDigits === 0
        ? formatNumber(rounded)
        : rounded.toLocaleString("es-AR", {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
          })}
    </span>
  );
}
