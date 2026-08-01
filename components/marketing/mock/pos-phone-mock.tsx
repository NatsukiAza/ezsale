import { formatArs } from "@/lib/format";

const lines = [
  { name: "Café con leche", qty: 2, price: 3200 },
  { name: "Medialuna", qty: 3, price: 1800 },
  { name: "Tostado jamón y queso", qty: 1, price: 4500 },
];

export function PosPhoneMock() {
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  return (
    <div className="flex h-full flex-col bg-background text-[11px] text-foreground">
      <header className="flex h-11 shrink-0 items-center border-b border-border px-3 pt-4">
        <p className="font-display text-sm font-semibold">Carrito</p>
      </header>

      <div className="flex-1 space-y-3 overflow-hidden p-3">
        {lines.map((line) => (
          <div
            key={line.name}
            className="flex items-start justify-between gap-2 border-b border-border pb-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{line.name}</p>
              <p className="mt-0.5 text-muted-foreground">
                {formatArs(line.price)} · ×{line.qty}
              </p>
            </div>
            <p className="shrink-0 font-mono tabular-nums">
              {formatArs(line.qty * line.price)}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border bg-card p-3 pb-4">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono tabular-nums">{formatArs(total)}</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="font-medium">Total</span>
          <span className="font-display text-xl font-bold tabular-nums tracking-tight">
            {formatArs(total)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {["Efectivo", "Mercado Pago", "Tarjeta", "Transferencia"].map(
            (p, i) => (
              <span
                key={p}
                className={
                  i === 1
                    ? "rounded-md border border-primary bg-primary-subtle px-2 py-2 text-center text-primary-subtle-foreground"
                    : "rounded-md border border-border px-2 py-2 text-center text-muted-foreground"
                }
              >
                {p}
              </span>
            ),
          )}
        </div>
        <div className="rounded-md bg-primary py-2.5 text-center font-medium text-primary-foreground">
          Registrar venta
        </div>
      </div>
    </div>
  );
}
