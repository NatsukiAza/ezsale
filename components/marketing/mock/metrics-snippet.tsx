import { formatArs } from "@/lib/format";

const weekBars = [42, 68, 55, 78, 92, 70, 38];

export function MetricsSnippet() {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-xs text-foreground shadow-overlay-sm">
      <div className="rounded-lg border border-border border-l-2 border-l-primary p-3">
        <p className="text-muted-foreground">Total de hoy</p>
        <p className="font-display text-2xl font-bold tabular-nums tracking-tight">
          {formatArs(186400)}
        </p>
        <p className="mt-1 text-body-sm text-success">+18% vs. ayer</p>
      </div>
      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 font-medium">Ventas de la semana</p>
        <div className="flex h-16 items-end gap-1.5">
          {weekBars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-chart-1/80"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
