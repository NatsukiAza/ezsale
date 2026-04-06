"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopAppBar } from "./top-app-bar";

type ReportsViewProps = {
  /** @default "/reports" */
  activeHref?: "/reports";
};

type Period = "day" | "month" | "year";

type DetalleVentaRow = {
  cantidad: number;
  subtotal: number | string;
  precio_unitario_historico: number | string;
  productos: { nombre: string } | { nombre: string }[] | null;
};

type VentaRow = {
  id: string;
  fecha_venta: string;
  monto_total: number | string;
  id_usuario: string;
  medios_pago: { nombre: string } | { nombre: string }[] | null;
  detalle_ventas: DetalleVentaRow[] | null;
};

function medioNombre(v: VentaRow): string {
  const m = v.medios_pago;
  if (!m) return "—";
  if (Array.isArray(m)) return m[0]?.nombre ?? "—";
  return m.nombre;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

function todayLocalYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function monthStartEnd(y: number, m: number): { start: Date; end: Date } {
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0);
  return { start, end };
}

function yearStartEnd(y: number): { start: Date; end: Date } {
  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y + 1, 0, 1, 0, 0, 0, 0);
  return { start, end };
}

function dayStartEnd(ymd: string): { start: Date; end: Date } {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { start, end };
}

function productNombre(d: DetalleVentaRow): string {
  const p = d.productos;
  if (!p) return "Producto";
  if (Array.isArray(p)) return p[0]?.nombre ?? "Producto";
  return p.nombre;
}

function formatDateTimeLabel(iso: string) {
  const d = new Date(iso);
  return {
    fecha: new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d),
    hora: new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d),
  };
}

export function ReportsView({ activeHref = "/reports" }: ReportsViewProps) {
  const [period, setPeriod] = useState<Period>("day");
  const [dayDate, setDayDate] = useState(todayLocalYmd);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1 };
  });
  const [yearAnchor, setYearAnchor] = useState(() => new Date().getFullYear());

  const [ventas, setVentas] = useState<VentaRow[]>([]);
  const [namesByUser, setNamesByUser] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeLabel = useMemo(() => {
    if (period === "day") {
      const d = new Date(dayDate + "T12:00:00");
      return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(d);
    }
    if (period === "month") {
      const d = new Date(monthAnchor.y, monthAnchor.m - 1, 1);
      return new Intl.DateTimeFormat("es-AR", {
        month: "long",
        year: "numeric",
      }).format(d);
    }
    return String(yearAnchor);
  }, [period, dayDate, monthAnchor, yearAnchor]);

  const { start, end } = useMemo(() => {
    if (period === "day") return dayStartEnd(dayDate);
    if (period === "month") return monthStartEnd(monthAnchor.y, monthAnchor.m);
    return yearStartEnd(yearAnchor);
  }, [period, dayDate, monthAnchor, yearAnchor]);

  const totalFacturado = useMemo(
    () => ventas.reduce((s, v) => s + Number(v.monto_total), 0),
    [ventas],
  );

  const mediosBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of ventas) {
      const label = medioNombre(v);
      map.set(label, (map.get(label) ?? 0) + Number(v.monto_total));
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    return entries.map(([label, amount]) => ({
      label,
      amount,
      pct: Math.round((amount / total) * 1000) / 10,
    }));
  }, [ventas]);

  /** Barras para vista mensual (día del mes) o anual (mes) */
  const chartBars = useMemo(() => {
    if (period === "day") {
      const t = totalFacturado;
      return [{ key: "d", label: "Día", h: t > 0 ? 100 : 8, value: t }];
    }
    if (period === "month") {
      const { y, m } = monthAnchor;
      const daysInMonth = new Date(y, m, 0).getDate();
      const byDay: number[] = Array.from({ length: daysInMonth }, () => 0);
      for (const v of ventas) {
        const d = new Date(v.fecha_venta).getDate();
        if (d >= 1 && d <= daysInMonth) {
          byDay[d - 1] += Number(v.monto_total);
        }
      }
      const max = Math.max(...byDay, 1);
      return byDay.map((value, i) => ({
        key: `d-${i}`,
        label: String(i + 1),
        h: (value / max) * 100,
        value,
      }));
    }
    const byMonth: number[] = Array(12).fill(0);
    for (const v of ventas) {
      const d = new Date(v.fecha_venta);
      if (d.getFullYear() === yearAnchor) {
        byMonth[d.getMonth()] += Number(v.monto_total);
      }
    }
    const max = Math.max(...byMonth, 1);
    const meses = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
    return byMonth.map((value, i) => ({
      key: `m-${i}`,
      label: meses[i],
      h: (value / max) * 100,
      value,
    }));
  }, [period, ventas, totalFacturado, monthAnchor, yearAnchor]);

  const loadVentas = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!supabase) {
        setLoadError("Supabase no está configurado.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadError("Iniciá sesión para ver reportes.");
        return;
      }

      const { data: perfil, error: pe } = await supabase
        .from("perfiles")
        .select("id_tienda")
        .eq("id", user.id)
        .maybeSingle();

      if (pe || !perfil?.id_tienda) {
        setLoadError(pe?.message ?? "No se encontró tu tienda.");
        return;
      }

      const tid = perfil.id_tienda as string;

      const { data: rows, error: ve } = await supabase
        .from("ventas")
        .select(
          `
        id,
        fecha_venta,
        monto_total,
        id_usuario,
        medios_pago ( nombre ),
        detalle_ventas (
          cantidad,
          subtotal,
          precio_unitario_historico,
          productos ( nombre )
        )
      `,
        )
        .eq("id_tienda", tid)
        .gte("fecha_venta", start.toISOString())
        .lt("fecha_venta", end.toISOString())
        .order("fecha_venta", { ascending: false });

      if (ve) {
        setLoadError(ve.message);
        setVentas([]);
        return;
      }

      const list = (rows ?? []) as unknown as VentaRow[];
      setVentas(list);

      const ids = [...new Set(list.map((v) => v.id_usuario))];
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("perfiles")
          .select("id, nombre, apellido")
          .in("id", ids);
        const nm: Record<string, string> = {};
        for (const p of profs ?? []) {
          const full = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim();
          nm[p.id as string] = full || "Usuario";
        }
        setNamesByUser(nm);
      } else {
        setNamesByUser({});
      }

      setLoadError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar reportes.";
      setLoadError(msg);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    setLoading(true);
    void loadVentas();
  }, [loadVentas]);

  const now = new Date();
  const todayYmd = todayLocalYmd();
  const canNextDay = dayDate < todayYmd;
  const currentMonth = {
    y: now.getFullYear(),
    m: now.getMonth() + 1,
  };
  const canNextMonth =
    monthAnchor.y < currentMonth.y ||
    (monthAnchor.y === currentMonth.y && monthAnchor.m < currentMonth.m);
  const currentYear = now.getFullYear();
  const canNextYear = yearAnchor < currentYear;

  function shiftMonth(delta: number) {
    setMonthAnchor((prev) => {
      const d = new Date(prev.y, prev.m - 1 + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    });
  }

  function shiftYear(delta: number) {
    setYearAnchor((y) => y + delta);
  }

  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref={activeHref} title="Reportes de Ventas" />
      <main className="mx-auto max-w-5xl px-6 pt-28 pb-20">
        {loadError ? (
          <p
            className="mb-6 rounded-xl bg-error-container/30 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {loadError}
          </p>
        ) : null}

        <section className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="space-y-4">
            <h2 className="font-headline text-sm font-bold tracking-[0.1em] text-on-surface-variant uppercase">
              Seleccionar periodo
            </h2>
            <div className="inline-flex flex-wrap gap-1 rounded-full bg-surface-container p-1">
              {(
                [
                  { id: "day" as const, label: "Día" },
                  { id: "month" as const, label: "Mensual" },
                  { id: "year" as const, label: "Anual" },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriod(id)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all sm:px-8 ${
                    period === id
                      ? "bg-surface-container-lowest font-bold text-primary shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {period === "day" ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDayDate((d) => addDaysYmd(d, -1))}
                  className="rounded-full bg-surface-container-high px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-highest"
                  aria-label="Día anterior"
                >
                  <span className="material-symbols-outlined text-xl">
                    chevron_left
                  </span>
                </button>
                <input
                  type="date"
                  value={dayDate}
                  max={todayYmd}
                  onChange={(e) => setDayDate(e.target.value)}
                  className="rounded-xl border-none bg-surface-container-low px-3 py-2 text-on-surface ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  disabled={!canNextDay}
                  onClick={() => setDayDate((d) => addDaysYmd(d, 1))}
                  className="rounded-full bg-surface-container-high px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Día siguiente"
                >
                  <span className="material-symbols-outlined text-xl">
                    chevron_right
                  </span>
                </button>
              </div>
            ) : null}

            {period === "month" ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  className="rounded-full bg-surface-container-high px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-highest"
                  aria-label="Mes anterior"
                >
                  <span className="material-symbols-outlined text-xl">
                    chevron_left
                  </span>
                </button>
                <span className="min-w-[10rem] text-center font-semibold capitalize text-on-surface">
                  {rangeLabel}
                </span>
                <button
                  type="button"
                  disabled={!canNextMonth}
                  onClick={() => shiftMonth(1)}
                  className="rounded-full bg-surface-container-high px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Mes siguiente"
                >
                  <span className="material-symbols-outlined text-xl">
                    chevron_right
                  </span>
                </button>
              </div>
            ) : null}

            {period === "year" ? (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => shiftYear(-1)}
                  className="rounded-full bg-surface-container-high px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-highest"
                  aria-label="Año anterior"
                >
                  <span className="material-symbols-outlined text-xl">
                    chevron_left
                  </span>
                </button>
                <span className="min-w-[5rem] text-center font-headline text-xl font-bold text-on-surface">
                  {yearAnchor}
                </span>
                <button
                  type="button"
                  disabled={!canNextYear}
                  onClick={() => shiftYear(1)}
                  className="rounded-full bg-surface-container-high px-3 py-2 text-on-surface transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Año siguiente"
                >
                  <span className="material-symbols-outlined text-xl">
                    chevron_right
                  </span>
                </button>
              </div>
            ) : null}

            {period === "day" ? (
              <p className="text-sm capitalize text-on-surface-variant">
                {rangeLabel}
              </p>
            ) : null}
          </div>

          <div className="text-right">
            <span className="font-label mb-1 block text-xs tracking-widest text-on-surface-variant uppercase">
              Total facturado
            </span>
            <div className="font-headline text-4xl font-extrabold tracking-tighter text-primary sm:text-5xl">
              {loading ? "…" : formatMoney(totalFacturado)}
            </div>
            <div className="mt-2 text-sm text-on-surface-variant">
              {loading
                ? "…"
                : `${ventas.length} venta${ventas.length === 1 ? "" : "s"}`}
            </div>
          </div>
        </section>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-3xl border border-stone-100 bg-surface-container-low p-8 md:col-span-1">
            <div>
              <h3 className="font-headline mb-6 text-lg font-bold">
                Métodos de pago
              </h3>
              {mediosBreakdown.length === 0 ? (
                <p className="text-sm text-on-surface-variant">
                  Sin datos en este periodo.
                </p>
              ) : (
                <div className="space-y-4">
                  {mediosBreakdown.map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-sm font-medium">{m.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold">
                          {formatMoney(m.amount)}
                        </span>
                        <span className="ml-2 text-xs text-on-surface-variant">
                          ({m.pct}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-3xl border border-stone-100 bg-surface-container-highest p-8 md:col-span-2">
            <div className="relative z-10">
              <h3 className="font-headline text-lg font-bold text-on-surface">
                {period === "day"
                  ? "Total del día"
                  : period === "month"
                    ? "Facturación por día"
                    : "Facturación por mes"}
              </h3>
              <p className="text-sm text-on-surface-variant">
                Montos en el periodo seleccionado
              </p>
            </div>
            <div
              className={`mt-6 flex flex-1 items-end gap-0.5 overflow-x-auto pb-2 ${
                period === "month" ? "min-h-40" : "min-h-32"
              }`}
            >
              {chartBars.map((bar) => (
                <div
                  key={bar.key}
                  className="flex min-w-[1.25rem] flex-1 flex-col items-center gap-1"
                  title={`${bar.label}: ${formatMoney(bar.value)}`}
                >
                  <div className="flex h-36 w-full max-w-8 items-end justify-center">
                    <div
                      className="w-full max-w-6 rounded-t-md bg-primary/40 transition-all"
                      style={{
                        height: `${Math.max(bar.h, bar.value > 0 ? 8 : 4)}%`,
                        minHeight: bar.value > 0 ? "4px" : "2px",
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-medium text-on-surface-variant">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold tracking-tight">
              Ventas detalladas
            </h3>
          </div>

          {loading ? (
            <p className="text-on-surface-variant">Cargando ventas…</p>
          ) : ventas.length === 0 ? (
            <p className="rounded-2xl border border-outline-variant/20 bg-surface-container-low/50 px-6 py-10 text-center text-on-surface-variant">
              No hay ventas en este periodo.
            </p>
          ) : (
            <ul className="space-y-6">
              {ventas.map((v) => {
                const { fecha, hora } = formatDateTimeLabel(v.fecha_venta);
                const usuario =
                  namesByUser[v.id_usuario] ?? "Usuario desconocido";
                const detalles = v.detalle_ventas ?? [];
                return (
                  <li
                    key={v.id}
                    className="overflow-hidden rounded-[2rem] border border-stone-100 bg-surface-container-lowest shadow-sm"
                  >
                    <div className="flex flex-col gap-4 border-b border-stone-100/80 bg-surface-container-low px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">{fecha}</p>
                        <p className="text-sm text-on-surface-variant">
                          {hora}
                        </p>
                        <p className="mt-2 text-sm">
                          <span className="text-on-surface-variant">
                            Vendedor:{" "}
                          </span>
                          <span className="font-medium text-on-surface">
                            {usuario}
                          </span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            medioNombre(v) === "Efectivo"
                              ? "bg-surface-container-high text-on-surface-variant"
                              : "bg-secondary-container text-on-secondary-container"
                          }`}
                        >
                          {medioNombre(v)}
                        </span>
                        <p className="mt-2 font-headline text-2xl font-bold text-primary">
                          {formatMoney(Number(v.monto_total))}
                        </p>
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      <p className="mb-3 font-label text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                        Productos
                      </p>
                      <ul className="divide-y divide-stone-100">
                        {detalles.map((d, i) => (
                          <li
                            key={`${v.id}-${i}`}
                            className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0"
                          >
                            <span className="font-medium text-on-surface">
                              {productNombre(d)}
                            </span>
                            <span className="text-sm text-on-surface-variant">
                              Cant. {d.cantidad} ×{" "}
                              {formatMoney(Number(d.precio_unitario_historico))}
                            </span>
                            <span className="ml-auto font-semibold tabular-nums text-on-surface">
                              {formatMoney(Number(d.subtotal))}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
