import { cn } from "@/lib/utils";

type SparklineProps = {
  values: number[];
  className?: string;
  /** Color del trazo — default chart-1 / primary. */
  stroke?: string;
};

/** Mini sparkline SVG para métricas (sin ejes ni tooltips). */
export function Sparkline({
  values,
  className,
  stroke = "var(--chart-1)",
}: SparklineProps) {
  const w = 72;
  const h = 24;
  const pad = 1;

  if (values.length < 2) {
    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className={cn("shrink-0", className)}
        aria-hidden
      />
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.9}
      />
    </svg>
  );
}
