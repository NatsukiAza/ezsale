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
  id_product: string;
  cantidad: number;
  subtotal: number | string;
  precio_unitario_historico: number | string;
  descuento_porcentaje?: number | string | null;
  productos: { nombre: string } | { nombre: string }[] | null;
};

type VentaRow = {
  id: string;
  fecha_venta: string;
  monto_total: number | string;
  id_usuario: string;
  id_medio_pago: string;
  medios_pago: { nombre: string } | { nombre: string }[] | null;
  detalle_ventas: DetalleVentaRow[] | null;
};

type MedioPagoRow = { id: string; nombre: string };
type ProductoOpcion = {
  id: string;
  nombre: string;
  precio_actual: number;
  nombre_busqueda: string;
};

type EditableLine = {
  id_product: string;
  nombre: string;
  /** Precio histórico para líneas existentes; precio actual para nuevas. */
  precio_unitario: number;
  cantidad: number;
  descuento_porcentaje: number;
  /** True si la línea ya estaba en la venta original. */
  isExisting: boolean;
};

function medioNombre(v: VentaRow): string {
  const m = v.medios_pago;
  if (!m) return "—";
  if (Array.isArray(m)) return m[0]?.nombre ?? "—";
  return m.nombre;
}

function clampDescuentoPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function iconForMedioPago(nombre: string) {
  switch (nombre) {
    case "Efectivo":
      return "payments";
    case "Mercado Pago":
      return "qr_code_2";
    case "Transferencia":
      return "account_balance";
    case "Tarjeta":
      return "credit_card";
    default:
      return "credit_card";
  }
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

  const [mediosPago, setMediosPago] = useState<MedioPagoRow[]>([]);
  const [productosTienda, setProductosTienda] = useState<ProductoOpcion[]>([]);
  const [editingVenta, setEditingVenta] = useState<VentaRow | null>(null);
  const [editLines, setEditLines] = useState<Record<string, EditableLine>>({});
  const [editMedioId, setEditMedioId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
        id_medio_pago,
        medios_pago ( nombre ),
        detalle_ventas (
          id_product,
          cantidad,
          subtotal,
          precio_unitario_historico,
          descuento_porcentaje,
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

  useEffect(() => {
    let cancelled = false;
    async function loadEditOptions() {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("id_tienda")
        .eq("id", user.id)
        .maybeSingle();
      const tid = perfil?.id_tienda as string | undefined;
      if (!tid) return;

      const [medRes, prodRes] = await Promise.all([
        supabase.from("medios_pago").select("id, nombre").order("nombre"),
        supabase
          .from("productos")
          .select("id, nombre, precio_actual")
          .eq("id_tienda", tid)
          .order("nombre"),
      ]);

      if (cancelled) return;

      if (!medRes.error && medRes.data) {
        setMediosPago(medRes.data as MedioPagoRow[]);
      }
      if (!prodRes.error && prodRes.data) {
        const rows = prodRes.data as Array<{
          id: string;
          nombre: string;
          precio_actual: number | string;
        }>;
        setProductosTienda(
          rows.map((p) => ({
            id: p.id,
            nombre: p.nombre,
            precio_actual: Number(p.precio_actual),
            nombre_busqueda: searchFold(p.nombre),
          })),
        );
      }
    }
    void loadEditOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  function openEdit(v: VentaRow) {
    const lines: Record<string, EditableLine> = {};
    for (const d of v.detalle_ventas ?? []) {
      const nombre = productNombre(d);
      const precio = Number(d.precio_unitario_historico);
      const cantidad = Math.max(1, Math.floor(Number(d.cantidad)));
      const desc = clampDescuentoPct(Number(d.descuento_porcentaje ?? 0));
      const cur = lines[d.id_product];
      if (cur) {
        cur.cantidad += cantidad;
      } else {
        lines[d.id_product] = {
          id_product: d.id_product,
          nombre,
          precio_unitario: precio,
          cantidad,
          descuento_porcentaje: desc,
          isExisting: true,
        };
      }
    }
    setEditLines(lines);
    setEditMedioId(v.id_medio_pago);
    setProductSearch("");
    setEditError(null);
    setEditingVenta(v);
  }

  function closeEdit() {
    if (savingEdit) return;
    setEditingVenta(null);
    setEditLines({});
    setEditMedioId(null);
    setProductSearch("");
    setEditError(null);
  }

  function setEditLineQty(id: string, qty: number) {
    if (qty < 1) {
      setEditLines((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setEditLines((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, cantidad: qty } };
    });
  }

  function setEditLineDescuento(id: string, raw: string) {
    const n = raw === "" ? 0 : Number.parseInt(raw, 10);
    const pct = raw === "" || Number.isNaN(n) ? 0 : clampDescuentoPct(n);
    setEditLines((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, descuento_porcentaje: pct } };
    });
  }

  function addProductoToEdit(p: ProductoOpcion) {
    setEditLines((prev) => {
      const cur = prev[p.id];
      if (cur) {
        return {
          ...prev,
          [p.id]: { ...cur, cantidad: cur.cantidad + 1 },
        };
      }
      return {
        ...prev,
        [p.id]: {
          id_product: p.id,
          nombre: p.nombre,
          precio_unitario: p.precio_actual,
          cantidad: 1,
          descuento_porcentaje: 0,
          isExisting: false,
        },
      };
    });
  }

  async function handleGuardarEdicion() {
    if (!editingVenta) return;
    setEditError(null);
    const lines = Object.values(editLines);
    if (lines.length === 0) {
      setEditError("La venta debe tener al menos un producto.");
      return;
    }
    if (!editMedioId) {
      setEditError("Elegí un medio de pago.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setEditError("Supabase no está configurado.");
      return;
    }

    setSavingEdit(true);
    const payload = lines.map((l) => ({
      id_product: l.id_product,
      cantidad: Math.max(1, Math.floor(l.cantidad)),
      descuento_porcentaje: clampDescuentoPct(l.descuento_porcentaje),
      // Solo enviamos el precio histórico cuando ya existía la línea; para
      // las nuevas líneas dejamos que el RPC use el precio actual.
      ...(l.isExisting
        ? { precio_unitario_historico: l.precio_unitario }
        : {}),
    }));

    const { error } = await supabase.rpc("editar_venta", {
      p_id_venta: editingVenta.id,
      p_id_medio_pago: editMedioId,
      p_items: payload,
    });

    if (error) {
      setSavingEdit(false);
      setEditError(error.message);
      return;
    }

    await loadVentas();
    setSavingEdit(false);
    setEditingVenta(null);
    setEditLines({});
    setEditMedioId(null);
    setProductSearch("");
  }

  const editLineList = useMemo(
    () =>
      Object.values(editLines).sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es"),
      ),
    [editLines],
  );

  const editTotal = useMemo(
    () =>
      editLineList.reduce(
        (s, l) =>
          s +
          l.precio_unitario *
            l.cantidad *
            (1 - clampDescuentoPct(l.descuento_porcentaje) / 100),
        0,
      ),
    [editLineList],
  );

  const productosDisponibles = useMemo(() => {
    const q = searchFold(productSearch.trim());
    if (!q) return productosTienda.slice(0, 8);
    return productosTienda
      .filter((p) => p.nombre_busqueda.includes(q))
      .slice(0, 8);
  }, [productSearch, productosTienda]);

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
                    className="relative overflow-hidden rounded-[2rem] border border-stone-100 bg-surface-container-lowest shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant shadow-sm ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-low hover:text-primary"
                      aria-label={`Editar venta del ${fecha}`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        edit
                      </span>
                    </button>
                    <div className="flex flex-col gap-4 border-b border-stone-100/80 bg-surface-container-low px-6 py-5 pr-16 sm:flex-row sm:items-start sm:justify-between sm:pr-16">
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
                              {Number(d.descuento_porcentaje ?? 0) > 0 ? (
                                <span className="ml-1 font-semibold text-primary">
                                  (−{Number(d.descuento_porcentaje)}%)
                                </span>
                              ) : null}
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

      {editingVenta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-sale-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar"
            onClick={closeEdit}
          />
          <div
            className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-4xl border border-stone-200/80 bg-surface-container-lowest shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-5 sm:px-8">
              <div>
                <h2
                  id="edit-sale-title"
                  className="font-headline text-2xl font-extrabold text-on-surface"
                >
                  Editar venta
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {formatDateTimeLabel(editingVenta.fecha_venta).fecha} ·{" "}
                  {formatDateTimeLabel(editingVenta.fecha_venta).hora}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-xl p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
              <section className="space-y-3">
                <h3 className="font-label text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                  Productos
                </h3>
                {editLineList.length === 0 ? (
                  <p className="rounded-xl border border-stone-200/80 bg-surface-container-low/50 px-4 py-3 text-sm text-on-surface-variant">
                    Agregá al menos un producto debajo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {editLineList.map((line) => {
                      const d = clampDescuentoPct(line.descuento_porcentaje);
                      const sub =
                        line.precio_unitario *
                        line.cantidad *
                        (1 - d / 100);
                      return (
                        <li
                          key={line.id_product}
                          className="rounded-2xl border border-stone-100 bg-surface-container-low px-4 py-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-on-surface">
                                {line.nombre}
                              </p>
                              <p className="text-xs text-on-surface-variant">
                                {formatMoney(line.precio_unitario)} c/u
                                {line.isExisting ? null : (
                                  <span className="ml-1.5 rounded-full bg-secondary-container px-1.5 py-0.5 text-[10px] font-semibold text-on-secondary-container">
                                    nuevo
                                  </span>
                                )}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditLineQty(line.id_product, 0)}
                              className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-error"
                              aria-label={`Quitar ${line.nombre}`}
                            >
                              <span className="material-symbols-outlined text-lg">
                                delete
                              </span>
                            </button>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/60 pt-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditLineQty(
                                    line.id_product,
                                    line.cantidad - 1,
                                  )
                                }
                                className="rounded-lg bg-surface-container-high px-2 py-1 text-lg leading-none text-on-surface"
                                aria-label="Quitar uno"
                              >
                                −
                              </button>
                              <span className="min-w-8 text-center font-bold tabular-nums">
                                {line.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditLineQty(
                                    line.id_product,
                                    line.cantidad + 1,
                                  )
                                }
                                className="rounded-lg bg-surface-container-high px-2 py-1 text-lg leading-none text-on-surface"
                                aria-label="Agregar uno"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label
                                className="text-[11px] font-medium text-on-surface-variant"
                                htmlFor={`edit-desc-${line.id_product}`}
                              >
                                Desc. %
                              </label>
                              <input
                                id={`edit-desc-${line.id_product}`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={100}
                                step={1}
                                value={d}
                                onChange={(e) =>
                                  setEditLineDescuento(
                                    line.id_product,
                                    e.target.value,
                                  )
                                }
                                className="w-14 rounded-lg border-none bg-surface-container-high px-2 py-1.5 text-center text-sm font-semibold tabular-nums text-on-surface outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/35"
                                aria-label={`Descuento porcentual para ${line.nombre}`}
                              />
                            </div>
                            <span className="font-bold tabular-nums text-primary">
                              {formatMoney(sub)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="mt-6 space-y-3">
                <h3 className="font-label text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                  Agregar producto
                </h3>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="material-symbols-outlined text-lg text-outline">
                      search
                    </span>
                  </div>
                  <input
                    type="search"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar por nombre…"
                    autoComplete="off"
                    className="w-full rounded-xl border-none bg-surface-container-low py-2.5 pr-3 pl-10 text-on-surface outline-none ring-1 ring-stone-200/80 placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/30"
                    aria-label="Buscar productos por nombre"
                  />
                </div>
                {productosDisponibles.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    {productosTienda.length === 0
                      ? "Cargando productos…"
                      : "Sin coincidencias."}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {productosDisponibles.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addProductoToEdit(p)}
                          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-surface-container-lowest px-3 py-2 text-left transition-colors hover:bg-surface-container-low"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-on-surface">
                              {p.nombre}
                            </p>
                            <p className="text-xs font-bold text-primary">
                              {formatMoney(p.precio_actual)}
                            </p>
                          </div>
                          <span
                            className="material-symbols-outlined shrink-0 rounded-full bg-primary p-1.5 text-base text-on-primary"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                            aria-hidden="true"
                          >
                            add
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-6 space-y-3">
                <h3 className="font-label text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                  Método de pago
                </h3>
                {mediosPago.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">
                    Cargando medios de pago…
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {mediosPago.map((m) => {
                      const active = editMedioId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setEditMedioId(m.id)}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-semibold transition-all active:scale-95 ${
                            active
                              ? "border-primary bg-surface-container-lowest text-primary"
                              : "border-stone-200 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                          }`}
                        >
                          <span className="material-symbols-outlined text-2xl">
                            {iconForMedioPago(m.nombre)}
                          </span>
                          {m.nombre}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="border-t border-stone-100 bg-surface-container-low px-6 py-4 sm:px-8">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">
                  Total
                </span>
                <span className="font-headline text-2xl font-extrabold text-on-surface">
                  {formatMoney(editTotal)}
                </span>
              </div>
              {editError ? (
                <p
                  className="mb-3 rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
                  role="alert"
                >
                  {editError}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={savingEdit}
                  className="rounded-2xl px-6 py-3 font-semibold text-on-surface-variant ring-1 ring-stone-200/80 transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleGuardarEdicion()}
                  disabled={
                    savingEdit ||
                    editLineList.length === 0 ||
                    !editMedioId
                  }
                  className="rounded-2xl bg-linear-to-br from-primary to-primary-dim px-6 py-3 font-bold text-on-primary shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEdit ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
