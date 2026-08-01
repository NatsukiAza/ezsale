import { formatArs } from "@/lib/format";

const methods = [
  { name: "Efectivo", amount: 412300, pct: 44 },
  { name: "Mercado Pago", amount: 298100, pct: 32 },
  { name: "Tarjeta", amount: 156800, pct: 17 },
  { name: "Transferencia", amount: 75100, pct: 7 },
];

export function PaymentSnippet() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-xs text-foreground shadow-overlay-sm">
      <p className="mb-3 font-medium">Métodos de pago · hoy</p>
      <div className="space-y-3">
        {methods.map((m) => (
          <div key={m.name} className="space-y-1">
            <div className="flex justify-between gap-2">
              <span>{m.name}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatArs(m.amount)} · {m.pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${m.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
