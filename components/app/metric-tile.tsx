import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

type MetricTileProps = {
  label: string;
  value: ReactNode;
  change?: number | null;
  changeLabel?: string;
  hint?: string;
  /** Métrica principal: más grande, riel de arcilla, sin borde completo. */
  hero?: boolean;
  /** SVG o sparkline debajo del valor. */
  footer?: ReactNode;
  /** Delay de entrada en ms (stagger). */
  staggerMs?: number;
  className?: string;
};

export function MetricTile({
  label,
  value,
  change,
  changeLabel,
  hint,
  hero = false,
  footer,
  staggerMs = 0,
  className,
}: MetricTileProps) {
  const hasChange = typeof change === "number" && Number.isFinite(change);
  const isUp = hasChange && change > 0;
  const isDown = hasChange && change < 0;

  return (
    <div
      className={cn(
        "metric-enter flex flex-col",
        hero
          ? "gap-2 rounded-lg border-l-[3px] border-l-primary bg-card/80 py-5 pr-5 pl-5"
          : "gap-1.5 rounded-lg border border-border bg-card p-4",
        className,
      )}
      style={
        staggerMs > 0
          ? ({ "--metric-delay": `${staggerMs}ms` } as CSSProperties)
          : undefined
      }
    >
      <p className="text-label text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular-nums",
          hero ? "text-display-lg" : "text-display text-[1.5rem] leading-8",
        )}
      >
        {value}
      </p>
      {hasChange || hint || footer ? (
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div className="min-w-0">
            {hasChange || hint ? (
              <p className="text-caption text-muted-foreground">
                {hasChange ? (
                  <span
                    className={cn(
                      "font-medium tabular-nums",
                      isUp && "text-success",
                      isDown && "text-destructive",
                    )}
                  >
                    {formatPercent(change)}
                  </span>
                ) : null}
                {hasChange && changeLabel ? " " : null}
                {hasChange ? changeLabel : hint}
              </p>
            ) : null}
          </div>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
