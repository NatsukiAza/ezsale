import { formatArs } from "@/lib/format";
import { cn } from "@/lib/utils";

const products = [
  { name: "Café con leche", price: 3200 },
  { name: "Medialuna", price: 1800 },
  { name: "Tostado jamón y queso", price: 4500 },
  { name: "Jugo de naranja", price: 2800 },
  { name: "Capuccino", price: 3500 },
  { name: "Croissant", price: 2200 },
];

const cart = [
  { name: "Café con leche", qty: 2, price: 3200 },
  { name: "Medialuna", qty: 3, price: 1800 },
  { name: "Tostado jamón y queso", qty: 1, price: 4500 },
];

const payments = ["Efectivo", "Mercado Pago", "Tarjeta", "Transferencia"];

type PosMockProps = {
  className?: string;
  animateCart?: boolean;
};

export function PosMock({ className, animateCart = false }: PosMockProps) {
  const subtotal = cart.reduce((s, l) => s + l.qty * l.price, 0);

  return (
    <div
      className={cn(
        "flex h-[20rem] overflow-hidden rounded-lg border border-border bg-background text-[10px] leading-tight text-foreground sm:h-[24rem] sm:text-[11px] md:text-xs",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col bg-surface-sunken">
        <div className="flex flex-wrap gap-1 border-b border-border bg-card p-2">
          {["Todos", "Cafetería", "Panadería", "Salados"].map((c, i) => (
            <span
              key={c}
              className={
                i === 0
                  ? "rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground"
                  : "rounded-md border border-border bg-card px-2 py-1 text-muted-foreground"
              }
            >
              {c}
            </span>
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-1.5 overflow-hidden p-2 sm:grid-cols-3">
          {products.map((p, i) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col justify-between rounded-md border border-border bg-card p-2",
                animateCart && i < 3 && "pos-demo-product",
                animateCart && i === 0 && "[animation-delay:0s]",
                animateCart && i === 1 && "[animation-delay:1.6s]",
                animateCart && i === 2 && "[animation-delay:3.2s]",
              )}
            >
              <span className="line-clamp-2 font-medium">{p.name}</span>
              <span className="mt-1 font-mono tabular-nums text-muted-foreground">
                {formatArs(p.price)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex w-[42%] shrink-0 flex-col border-l border-border bg-card sm:w-44 md:w-48">
        <div className="border-b border-border px-2.5 py-2 font-medium">
          Carrito
        </div>
        <div className="flex-1 space-y-2 overflow-hidden p-2.5">
          {cart.map((line, i) => (
            <div
              key={line.name}
              className={cn(
                "space-y-0.5",
                animateCart && "pos-demo-line",
                animateCart && i === 0 && "[animation-delay:0.4s]",
                animateCart && i === 1 && "[animation-delay:2s]",
                animateCart && i === 2 && "[animation-delay:3.6s]",
              )}
            >
              <div className="flex justify-between gap-1">
                <span className="truncate font-medium">{line.name}</span>
                <span className="tabular-nums text-muted-foreground">
                  ×{line.qty}
                </span>
              </div>
              <p className="font-mono tabular-nums">
                {formatArs(line.qty * line.price)}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t border-border p-2.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono tabular-nums">{formatArs(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Total</span>
            <span className="font-display text-sm font-bold tabular-nums">
              {formatArs(subtotal)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {payments.map((p, i) => (
              <span
                key={p}
                className={
                  i === 0
                    ? "rounded-md border border-primary bg-primary-subtle px-1.5 py-1 text-center text-primary-subtle-foreground"
                    : "rounded-md border border-border px-1.5 py-1 text-center text-muted-foreground"
                }
              >
                {p}
              </span>
            ))}
          </div>
          <div className="rounded-md bg-primary py-2 text-center font-medium text-primary-foreground">
            Registrar venta
          </div>
        </div>
      </aside>
    </div>
  );
}
