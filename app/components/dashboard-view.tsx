import Link from "next/link";
import { TopAppBar } from "./top-app-bar";

export type VentaHoyItem = {
  id: string;
  vendedor: string;
  hora: string;
  monto: number;
  items: number;
};

export type DiaSemanaItem = {
  dateKey: string;
  label: string;
  monto: number;
  esHoy: boolean;
};

export type BestsellerItem = {
  nombre: string;
  unidades: number;
};

type DashboardViewProps = {
  tiendaNombre?: string | null;
  totalHoy: number;
  cantidadVentasHoy: number;
  ventasHoy: VentaHoyItem[];
  diasSemana: DiaSemanaItem[];
  totalSemana: number;
  bestsellers: BestsellerItem[];
};

function formatArs(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

export function DashboardView({
  tiendaNombre,
  totalHoy,
  cantidadVentasHoy,
  ventasHoy,
  diasSemana,
  totalSemana,
  bestsellers,
}: DashboardViewProps) {
  const maxSemana = Math.max(...diasSemana.map((d) => d.monto), 1);
  const barMaxPx = 200;

  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref="/dashboard" />
      {tiendaNombre ? (
        <div className="border-b border-stone-200/60 bg-secondary-container/30 px-6 py-2 text-center text-sm font-medium text-on-secondary-container">
          Panel de{" "}
          <span className="font-headline font-bold text-secondary">{tiendaNombre}</span>
        </div>
      ) : null}
      <main className="mx-auto max-w-6xl space-y-10 px-6 pt-24">
        <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary to-primary-dim p-8 text-on-primary shadow-xl md:p-12">
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-3xl" />
          <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-container">
                Total vendido hoy
              </p>
              <h1 className="text-5xl font-extrabold tracking-tighter md:text-7xl">
                {formatArs(totalHoy)}
              </h1>
              <div className="flex items-center gap-2 text-sm font-medium text-secondary-container">
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                <span>
                  {cantidadVentasHoy === 1
                    ? "1 venta hoy"
                    : `${cantidadVentasHoy} ventas hoy`}
                </span>
              </div>
            </div>
            <Link
              href="/new-sale"
              className="group flex items-center justify-center gap-3 rounded-full bg-surface-container-lowest px-8 py-4 font-bold text-primary shadow-lg transition-all duration-200 active:scale-95"
            >
              <span className="material-symbols-outlined">add_circle</span>
              <span>Nueva venta</span>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Ventas de hoy</h2>
              <Link
                href="/reports"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="space-y-3">
              {ventasHoy.length === 0 ? (
                <p className="rounded-2xl border border-stone-100 bg-surface-container-lowest px-4 py-6 text-sm text-on-surface-variant">
                  No hay ventas registradas hoy.
                </p>
              ) : (
                ventasHoy.map((v) => (
                  <div
                    key={v.id}
                    className="group flex flex-col gap-3 rounded-2xl border border-stone-100 bg-surface-container-lowest p-4 transition-colors duration-200 hover:bg-surface-container-low sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface">{v.vendedor}</p>
                      <p className="text-xs text-on-surface-variant">{v.hora}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 sm:text-right">
                      <span className="text-sm tabular-nums text-on-surface-variant">
                        {v.items} ítems
                      </span>
                      <span className="font-bold tabular-nums text-primary">
                        {formatArs(v.monto)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Ventas de la semana</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Total:{" "}
                  <span className="font-semibold text-on-surface">{formatArs(totalSemana)}</span>
                </p>
              </div>
              <Link
                href="/reports"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver más
              </Link>
            </div>
            <div className="flex aspect-video items-end justify-between gap-2 rounded-4xl border border-stone-100 bg-surface-container-lowest p-6 md:gap-3 lg:aspect-auto lg:h-[320px] lg:p-8">
              {diasSemana.map((item) => {
                const hPx =
                  item.monto > 0
                    ? Math.max(10, (item.monto / maxSemana) * barMaxPx)
                    : 6;
                return (
                  <div key={item.dateKey} className="flex min-w-0 flex-1 flex-col items-center gap-3">
                    <div
                      style={{ height: `${hPx}px` }}
                      className={`group relative w-full rounded-t-xl transition-colors hover:bg-primary-dim ${
                        item.esHoy ? "bg-primary" : "bg-primary-container/20"
                      }`}
                    >
                      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-on-surface px-2 py-1 text-[10px] text-surface opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {formatArs(item.monto)}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${
                        item.esHoy ? "text-primary" : "text-stone-400"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1">
          <div className="flex min-h-[160px] flex-col justify-between rounded-4xl bg-tertiary-container p-6 text-on-tertiary-container">
            <div className="flex items-start justify-between gap-4">
              <span className="material-symbols-outlined text-3xl">star</span>
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                Por unidades vendidas
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <h3 className="font-headline text-lg font-bold">Top 3 productos</h3>
              {bestsellers.length === 0 ? (
                <p className="text-sm opacity-80">Todavía no hay datos de ventas.</p>
              ) : (
                <ol className="space-y-3">
                  {bestsellers.map((b, i) => (
                    <li
                      key={`${b.nombre}-${i}`}
                      className="flex items-center justify-between gap-4 border-b border-on-tertiary-container/15 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-on-tertiary-container/15 text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="truncate font-semibold">{b.nombre}</span>
                      </div>
                      <span className="shrink-0 text-sm opacity-90">
                        {b.unidades} u.
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </main>
      <Link
        href="/new-sale"
        className="group fixed right-6 bottom-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Nueva venta"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="pointer-events-none absolute right-full mr-4 rounded-lg bg-on-surface px-3 py-2 text-xs font-bold whitespace-nowrap text-surface opacity-0 transition-opacity group-hover:opacity-100">
          Nueva venta
        </span>
      </Link>
    </div>
  );
}
