import { formatArs } from "@/lib/format";
import {
  ChartColumn,
  LayoutDashboard,
  Package,
  Plus,
  Store,
  Users,
} from "lucide-react";

const nav = [
  { label: "Nueva venta", icon: Plus, active: false },
  { label: "Panel", icon: LayoutDashboard, active: true },
  { label: "Productos", icon: Package, active: false },
  { label: "Reportes", icon: ChartColumn, active: false },
  { label: "Equipo", icon: Users, active: false },
] as const;

const weekBars = [
  { day: "Lun", h: 42 },
  { day: "Mar", h: 68 },
  { day: "Mié", h: 55 },
  { day: "Jue", h: 78 },
  { day: "Vie", h: 92 },
  { day: "Sáb", h: 70 },
  { day: "Dom", h: 38 },
];

const topProducts = [
  { name: "Café con leche", qty: 48 },
  { name: "Medialuna", qty: 36 },
  { name: "Tostado jamón y queso", qty: 22 },
];

const sales = [
  { time: "18:42", seller: "María", items: 3, amount: 9450 },
  { time: "18:28", seller: "Lucas", items: 2, amount: 5200 },
  { time: "17:55", seller: "María", items: 5, amount: 14800 },
];

export function DashboardMock() {
  return (
    <div className="absolute inset-0 flex overflow-hidden bg-background text-[9px] leading-tight text-foreground sm:text-[10px] md:text-[11px]">
      <aside className="hidden w-[28%] max-w-40 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-2 sm:flex">
        <div className="mb-3 px-1.5 font-display text-sm font-bold tracking-tight">
          <span className="text-primary">EZ</span>
          <span>Sale</span>
        </div>
        <div className="mb-3 flex items-center gap-1.5 px-1.5 text-muted-foreground">
          <Store className="size-3 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Café Central</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={
                  item.active
                    ? "flex items-center gap-1.5 rounded-md bg-primary/10 px-1.5 py-1.5 font-medium text-primary"
                    : "flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sidebar-foreground"
                }
              >
                <Icon className="size-3 shrink-0" strokeWidth={1.75} />
                {item.label}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
          <div>
            <p className="font-display text-sm font-semibold tracking-tight">
              Buenos días, María
            </p>
            <p className="text-muted-foreground">Café Central</p>
          </div>
          <div className="rounded-md bg-primary px-2 py-1 font-medium text-primary-foreground">
            Nueva venta
          </div>
        </header>

        <div className="flex-1 space-y-2.5 overflow-hidden p-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Metric
              label="Total de hoy"
              value={formatArs(186400)}
              hero
            />
            <Metric label="Ventas de hoy" value="24" hint="24 tickets" />
            <Metric label="Ticket promedio" value={formatArs(7767)} />
            <Metric
              label="Total semana"
              value={formatArs(942300)}
              hint="Últimos 7 días"
            />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-2.5 lg:col-span-2">
              <p className="mb-2 font-medium">Ventas de la semana</p>
              <div className="flex h-20 items-end gap-1.5 sm:h-24">
                {weekBars.map((b) => (
                  <div
                    key={b.day}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-sm bg-chart-1/80"
                      style={{ height: `${b.h}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {b.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden rounded-lg border border-border bg-card p-2.5 sm:block">
              <p className="mb-2 font-medium">Top productos</p>
              <ol className="space-y-1.5">
                {topProducts.map((p, i) => (
                  <li key={p.name} className="flex items-center gap-2">
                    <span className="flex size-4 items-center justify-center rounded bg-surface-sunken text-[9px] font-medium">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {p.qty} u.
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="hidden rounded-lg border border-border bg-card sm:block">
            <div className="border-b border-border px-2.5 py-1.5 font-medium">
              Ventas de hoy
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-surface-sunken text-left text-[9px] text-muted-foreground">
                  <th className="px-2.5 py-1 font-medium">Hora</th>
                  <th className="px-2.5 py-1 font-medium">Vendedor</th>
                  <th className="px-2.5 py-1 text-right font-medium">Ítems</th>
                  <th className="px-2.5 py-1 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.time} className="border-t border-border">
                    <td className="px-2.5 py-1 tabular-nums">{s.time}</td>
                    <td className="px-2.5 py-1">{s.seller}</td>
                    <td className="px-2.5 py-1 text-right tabular-nums">
                      {s.items}
                    </td>
                    <td className="px-2.5 py-1 text-right font-mono tabular-nums">
                      {formatArs(s.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  hero,
}: {
  label: string;
  value: string;
  hint?: string;
  hero?: boolean;
}) {
  return (
    <div
      className={
        hero
          ? "rounded-lg border border-border border-l-2 border-l-primary bg-card p-2"
          : "rounded-lg border border-border bg-card p-2"
      }
    >
      <p className="text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-bold tabular-nums tracking-tight sm:text-base">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[9px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
