 "use client";

import Link from "next/link";
import { useState } from "react";
import { TopAppBar } from "./top-app-bar";

export type VentaHoyLinea = {
  nombre: string;
  cantidad: number;
};

export type VentaHoyItem = {
  id: string;
  vendedor: string;
  hora: string;
  monto: number;
  /** Total de unidades en la venta (suma de cantidades). */
  items: number;
  lineas: VentaHoyLinea[];
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
  /** Si false (rol normal), no se muestran enlaces a reportes. */
  esAdmin?: boolean;
  /** Nombre para mostrar en el TopAppBar; evita un fetch en cliente. */
  displayName?: string | null;
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
  esAdmin = true,
  displayName,
  totalHoy,
  cantidadVentasHoy,
  ventasHoy,
  diasSemana,
  totalSemana,
  bestsellers,
}: DashboardViewProps) {
  const [showTotalHoy, setShowTotalHoy] = useState(false);
  const maxSemana = Math.max(...diasSemana.map((d) => d.monto), 1);
  const barMaxPx = 200;

  return (
    <div className="min-h-screen pb-12">
      <TopAppBar
        activeHref="/dashboard"
        initialDisplayName={displayName ?? null}
        initialIsAdmin={esAdmin}
      />
      <main className="mx-auto max-w-6xl space-y-10 px-6 pt-24">
        <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-primary to-primary-dim p-8 text-on-primary shadow-xl md:p-12">
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-3xl" />
          <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-container">
                Total vendido hoy
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-5xl font-extrabold tracking-tighter md:text-7xl">
                  {showTotalHoy ? formatArs(totalHoy) : "********"}
                </h1>
                <button
                  type="button"
                  onClick={() => setShowTotalHoy((v) => !v)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-lowest/20 text-on-primary transition-colors hover:bg-surface-container-lowest/30"
                  aria-label={
                    showTotalHoy ? "Ocultar total vendido hoy" : "Mostrar total vendido hoy"
                  }
                  aria-pressed={showTotalHoy}
                >
                  <span className="material-symbols-outlined">
                    {showTotalHoy ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-secondary-container">
                <span className="material-symbols-outlined text-sm">
                  receipt_long
                </span>
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
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Ventas de hoy
                </h2>
                {cantidadVentasHoy > 5 ? (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    Últimas 5 ventas · {cantidadVentasHoy} en total hoy
                  </p>
                ) : null}
              </div>
              {esAdmin ? (
                <Link
                  href="/reports"
                  className="shrink-0 text-sm font-semibold text-primary hover:underline"
                >
                  Ver todas
                </Link>
              ) : null}
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
                    className="shadow-xl group rounded-2xl border border-stone-100 bg-surface-container-lowest p-4 transition-colors duration-200 hover:bg-surface-container-low"
                  >
                    {v.lineas.length > 0 ? (
                      <ul className="space-y-2">
                        {v.lineas.map((line, idx) => (
                          <li
                            key={`${v.id}-${idx}`}
                            className="flex items-baseline justify-between gap-3 text-base font-semibold leading-snug text-on-surface sm:text-lg"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="tabular-nums text-primary">
                                {line.cantidad}
                              </span>
                              <span className="text-on-surface-variant">
                                {" "}
                                ×{" "}
                              </span>
                              <span>{line.nombre}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-on-surface-variant">
                        Sin detalle de productos.
                      </p>
                    )}
                    <div className="mt-4 flex flex-col gap-3 border-t border-stone-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-on-surface-variant">
                          {v.vendedor}
                        </p>
                        <p className="text-[11px] text-outline">{v.hora}</p>
                      </div>
                      <div className="flex shrink-0 items-baseline justify-between gap-4 sm:justify-end sm:text-right">
                        <span className="text-xs tabular-nums text-on-surface-variant">
                          {v.items} ítems
                        </span>
                        <span className="text-lg font-bold tabular-nums text-primary sm:text-xl">
                          {showTotalHoy ? formatArs(v.monto) : "********"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">
                  Ventas de la semana
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Total:{" "}
                  <span className="font-semibold text-on-surface">
                    {showTotalHoy ? formatArs(totalSemana) : "********"}
                  </span>
                </p>
              </div>
              {esAdmin ? (
                <Link
                  href="/reports"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Ver más
                </Link>
              ) : null}
            </div>
            <div className="flex aspect-video items-end justify-between gap-2 rounded-4xl border border-stone-100 bg-surface-container-lowest p-6 md:gap-3 lg:aspect-auto lg:h-[320px] lg:p-8">
              {diasSemana.map((item) => {
                const hPx =
                  item.monto > 0
                    ? Math.max(10, (item.monto / maxSemana) * barMaxPx)
                    : 6;
                return (
                  <div
                    key={item.dateKey}
                    className="flex min-w-0 flex-1 flex-col items-center gap-3"
                  >
                    <div
                      style={{ height: `${hPx}px` }}
                      className={`group relative w-full rounded-t-xl transition-colors hover:bg-primary-dim ${
                        item.esHoy ? "bg-primary" : "bg-primary-container/20"
                      }`}
                    >
                      <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-on-surface px-2 py-1 text-[10px] text-surface opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        {showTotalHoy ? formatArs(item.monto) : "********"}
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
              <h3 className="font-headline text-lg font-bold">
                Top 3 productos
              </h3>
              {bestsellers.length === 0 ? (
                <p className="text-sm opacity-80">
                  Todavía no hay datos de ventas.
                </p>
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
                        <span className="truncate font-semibold">
                          {b.nombre}
                        </span>
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
