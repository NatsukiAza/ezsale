"use client";

import { createClient } from "@/lib/supabase/client";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Loader2,
  Minus,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { MetricTile } from "@/components/app/metric-tile";
import { Money } from "@/components/app/money";
import { PrivacyToggle } from "@/components/app/privacy";
import { EmptyState } from "@/components/app/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
  /** null = aún no cargado; [] = sin líneas. */
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

function iconForMedioPago(nombre: string): ComponentType<{ className?: string; strokeWidth?: number }> {
  switch (nombre) {
    case "Efectivo":
      return Banknote;
    case "Mercado Pago":
      return QrCode;
    case "Transferencia":
      return Landmark;
    default:
      return CreditCard;
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

export function ReportsView({
  idTienda,
  initialVentas,
  initialNamesByUser,
  initialLoadError = null,
}: {
  idTienda: string;
  initialVentas: VentaRow[];
  initialNamesByUser: Record<string, string>;
  initialLoadError?: string | null;
}) {
  const [period, setPeriod] = useState<Period>("day");
  const [dayDate, setDayDate] = useState(todayLocalYmd);
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1 };
  });
  const [yearAnchor, setYearAnchor] = useState(() => new Date().getFullYear());

  const [ventas, setVentas] = useState<VentaRow[]>(initialVentas);
  const [namesByUser, setNamesByUser] =
    useState<Record<string, string>>(initialNamesByUser);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | null>(null);

  const [mediosPago, setMediosPago] = useState<MedioPagoRow[]>([]);
  const [productosTienda, setProductosTienda] = useState<ProductoOpcion[]>([]);
  const [editOptionsLoaded, setEditOptionsLoaded] = useState(false);
  const [loadingEditOptions, setLoadingEditOptions] = useState(false);
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

  const ticketPromedio = ventas.length > 0 ? totalFacturado / ventas.length : 0;

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

  const loadVentas = useCallback(async () => {
    try {
      const supabase = createClient();
      if (!supabase) {
        setLoadError("Supabase no está configurado.");
        return;
      }

      const tid = idTienda;

      const [ventasRes, perfilesRes] = await Promise.all([
        supabase
          .from("ventas")
          .select(
            `
        id,
        fecha_venta,
        monto_total,
        id_usuario,
        id_medio_pago,
        medios_pago ( nombre )
      `,
          )
          .eq("id_tienda", tid)
          .gte("fecha_venta", start.toISOString())
          .lt("fecha_venta", end.toISOString())
          .order("fecha_venta", { ascending: false }),
        supabase
          .from("perfiles")
          .select("id, nombre, apellido")
          .eq("id_tienda", tid),
      ]);

      if (ventasRes.error) {
        setLoadError(ventasRes.error.message);
        setVentas([]);
        return;
      }

      const list = (ventasRes.data ?? []).map((row) => ({
        id: row.id as string,
        fecha_venta: row.fecha_venta as string,
        monto_total: row.monto_total as number | string,
        id_usuario: row.id_usuario as string,
        id_medio_pago: row.id_medio_pago as string,
        medios_pago: row.medios_pago as VentaRow["medios_pago"],
        detalle_ventas: null,
      }));
      setVentas(list);

      const nm: Record<string, string> = {};
      for (const p of perfilesRes.data ?? []) {
        const full = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim();
        nm[p.id as string] = full || "Usuario";
      }
      setNamesByUser(nm);
      setLoadError(null);
      setExpanded(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar reportes.";
      setLoadError(msg);
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [idTienda, start, end]);

  const isInitialDayRange = useMemo(() => {
    const today = dayStartEnd(todayLocalYmd());
    return (
      period === "day" &&
      start.getTime() === today.start.getTime() &&
      end.getTime() === today.end.getTime()
    );
  }, [period, start, end]);

  const skipFirstFetch = useRef(isInitialDayRange);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    setLoading(true);
    void loadVentas();
  }, [loadVentas]);

  async function ensureDetalle(ventaId: string): Promise<DetalleVentaRow[]> {
    const existing = ventas.find((v) => v.id === ventaId);
    if (existing?.detalle_ventas) return existing.detalle_ventas;

    const supabase = createClient();
    if (!supabase) return [];

    setLoadingDetalleId(ventaId);
    const { data, error } = await supabase
      .from("detalle_ventas")
      .select(
        `
        id_product,
        cantidad,
        subtotal,
        precio_unitario_historico,
        descuento_porcentaje,
        productos ( nombre )
      `,
      )
      .eq("id_venta", ventaId)
      .order("id");

    setLoadingDetalleId(null);
    if (error) {
      setLoadError(error.message);
      return [];
    }

    const detalle = (data ?? []) as unknown as DetalleVentaRow[];
    setVentas((prev) =>
      prev.map((v) =>
        v.id === ventaId ? { ...v, detalle_ventas: detalle } : v,
      ),
    );
    return detalle;
  }

  async function ensureEditOptions() {
    if (editOptionsLoaded || loadingEditOptions) return;
    const supabase = createClient();
    if (!supabase) return;

    setLoadingEditOptions(true);
    const [medRes, prodRes] = await Promise.all([
      supabase.from("medios_pago").select("id, nombre").order("nombre"),
      supabase
        .from("productos")
        .select("id, nombre, precio_actual")
        .eq("id_tienda", idTienda)
        .order("nombre"),
    ]);

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
    setEditOptionsLoaded(true);
    setLoadingEditOptions(false);
  }

  async function toggleExpanded(ventaId: string) {
    if (expanded === ventaId) {
      setExpanded(null);
      return;
    }
    setExpanded(ventaId);
    await ensureDetalle(ventaId);
  }

  async function openEdit(v: VentaRow) {
    const detalle = await ensureDetalle(v.id);
    void ensureEditOptions();

    const lines: Record<string, EditableLine> = {};
    for (const d of detalle) {
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
    setEditingVenta({ ...v, detalle_ventas: detalle });
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
    <div className="pb-10">
      <PageHeader
        title="Reportes"
        description={capitalize(rangeLabel)}
        actions={<PrivacyToggle />}
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="month">Mensual</TabsTrigger>
            <TabsTrigger value="year">Anual</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1.5">
          {period === "day" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Día anterior"
                onClick={() => setDayDate((d) => addDaysYmd(d, -1))}
              >
                <ChevronLeft />
              </Button>
              <Input
                type="date"
                value={dayDate}
                max={todayYmd}
                onChange={(e) => setDayDate(e.target.value)}
                className="h-8 w-auto"
                aria-label="Elegir día"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canNextDay}
                aria-label="Día siguiente"
                onClick={() => setDayDate((d) => addDaysYmd(d, 1))}
              >
                <ChevronRight />
              </Button>
            </>
          ) : null}

          {period === "month" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Mes anterior"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-32 text-center text-sm font-medium capitalize">
                {rangeLabel}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canNextMonth}
                aria-label="Mes siguiente"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight />
              </Button>
            </>
          ) : null}

          {period === "year" ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Año anterior"
                onClick={() => shiftYear(-1)}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-14 text-center text-sm font-medium tabular-nums">
                {yearAnchor}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={!canNextYear}
                aria-label="Año siguiente"
                onClick={() => shiftYear(1)}
              >
                <ChevronRight />
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {loadError ? (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="space-y-8 px-6 py-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricTile
            label="Total facturado"
            value={<Money value={totalFacturado} display />}
          />
          <MetricTile
            label="Ventas"
            value={<span className="tabular-nums">{ventas.length}</span>}
            hint={
              ventas.length === 1
                ? "1 venta en el período"
                : `${ventas.length} ventas en el período`
            }
          />
          <MetricTile
            label="Ticket promedio"
            value={<Money value={ticketPromedio} display />}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-h2">Métodos de pago</h2>
          {mediosBreakdown.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Sin datos en este período.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
              {mediosBreakdown.map((m) => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="flex items-center gap-1.5">
                      <Money value={m.amount} />
                      <span className="text-caption text-muted-foreground tabular-nums">
                        ({m.pct}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-sm bg-muted">
                    <div
                      className="h-full rounded-sm bg-primary transition-[width] duration-160"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-h2">Ventas del período</h2>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-md" />
              ))}
            </div>
          ) : ventas.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No hay ventas en este período"
              description="Cuando registres ventas en el rango elegido, van a aparecer acá."
            />
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow className="hover:bg-transparent">
                  <DataTableHead className="w-8" />
                  <DataTableHead>Fecha</DataTableHead>
                  <DataTableHead>Vendedor</DataTableHead>
                  <DataTableHead>Medio de pago</DataTableHead>
                  <DataTableHead className="text-right">Monto</DataTableHead>
                  <DataTableHead className="w-10" />
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {ventas.map((v) => {
                  const isOpen = expanded === v.id;
                  const { fecha, hora } = formatDateTimeLabel(v.fecha_venta);
                  const usuario =
                    namesByUser[v.id_usuario] ?? "Usuario desconocido";
                  const detalles = v.detalle_ventas;
                  return (
                    <Fragment key={v.id}>
                      <DataTableRow className={cn(isOpen && "bg-muted/40")}>
                        <DataTableCell className="w-8 pr-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={
                              isOpen ? "Ocultar detalle" : "Ver detalle"
                            }
                            aria-expanded={isOpen}
                            onClick={() => void toggleExpanded(v.id)}
                          >
                            {isOpen ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </Button>
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">
                              {fecha}
                            </span>
                            <span className="text-caption text-muted-foreground">
                              {hora}
                            </span>
                          </div>
                        </DataTableCell>
                        <DataTableCell>{usuario}</DataTableCell>
                        <DataTableCell className="text-muted-foreground">
                          {medioNombre(v)}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <Money value={Number(v.monto_total)} />
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Editar venta del ${fecha}`}
                            onClick={() => void openEdit(v)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        </DataTableCell>
                      </DataTableRow>
                      {isOpen ? (
                        <DataTableRow className="hover:bg-transparent">
                          <DataTableCell
                            colSpan={6}
                            className="bg-surface-sunken/60 py-3"
                          >
                            {detalles == null || loadingDetalleId === v.id ? (
                              <p className="flex items-center gap-2 pl-8 text-body-sm text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" />
                                Cargando detalle…
                              </p>
                            ) : detalles.length === 0 ? (
                              <p className="pl-8 text-body-sm text-muted-foreground">
                                Sin detalle de productos.
                              </p>
                            ) : (
                              <ul className="space-y-1.5 pl-8">
                                {detalles.map((d, i) => (
                                  <li
                                    key={`${v.id}-${i}`}
                                    className="flex flex-wrap items-center justify-between gap-2 text-body-sm"
                                  >
                                    <span className="font-medium">
                                      {productNombre(d)}
                                    </span>
                                    <span className="text-muted-foreground">
                                      <span className="font-mono tabular-nums">
                                        {d.cantidad}
                                      </span>
                                      {" × "}
                                      <Money
                                        value={Number(
                                          d.precio_unitario_historico,
                                        )}
                                      />
                                      {Number(d.descuento_porcentaje ?? 0) >
                                      0 ? (
                                        <span className="ml-1 font-medium text-primary">
                                          (−{Number(d.descuento_porcentaje)}%)
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="font-mono font-medium tabular-nums">
                                      <Money value={Number(d.subtotal)} />
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </section>
      </div>

      <Dialog
        open={editingVenta !== null}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar venta</DialogTitle>
            <DialogDescription>
              {editingVenta
                ? `${formatDateTimeLabel(editingVenta.fecha_venta).fecha} · ${
                    formatDateTimeLabel(editingVenta.fecha_venta).hora
                  }`
                : null}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-label text-muted-foreground">Productos</h3>
              {editLineList.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-body-sm text-muted-foreground">
                  Agregá al menos un producto debajo.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {editLineList.map((line) => {
                    const d = clampDescuentoPct(line.descuento_porcentaje);
                    const sub =
                      line.precio_unitario * line.cantidad * (1 - d / 100);
                    return (
                      <li
                        key={line.id_product}
                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                            <span className="truncate">{line.nombre}</span>
                            {!line.isExisting ? (
                              <Badge variant="outline" className="shrink-0">
                                nuevo
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-caption text-muted-foreground">
                            <Money value={line.precio_unitario} alwaysVisible />{" "}
                            c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label="Quitar uno"
                            onClick={() =>
                              setEditLineQty(
                                line.id_product,
                                line.cantidad - 1,
                              )
                            }
                          >
                            <Minus />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium tabular-nums">
                            {line.cantidad}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            aria-label="Agregar uno"
                            onClick={() =>
                              setEditLineQty(
                                line.id_product,
                                line.cantidad + 1,
                              )
                            }
                          >
                            <Plus />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Label
                            htmlFor={`edit-desc-${line.id_product}`}
                            className="text-caption text-muted-foreground"
                          >
                            Desc. %
                          </Label>
                          <Input
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
                            className="h-8 w-14 text-center"
                            aria-label={`Descuento porcentual para ${line.nombre}`}
                          />
                        </div>
                        <span className="w-24 text-right font-mono text-sm font-medium tabular-nums">
                          <Money value={sub} alwaysVisible />
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Quitar ${line.nombre}`}
                          onClick={() => setEditLineQty(line.id_product, 0)}
                        >
                          <Trash2 className="text-destructive" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-label text-muted-foreground">
                Agregar producto
              </h3>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar por nombre…"
                  autoComplete="off"
                  className="pl-8"
                  aria-label="Buscar productos por nombre"
                />
              </div>
              {productosDisponibles.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  {loadingEditOptions || !editOptionsLoaded
                    ? "Cargando productos…"
                    : productosTienda.length === 0
                      ? "No hay productos en la tienda."
                      : "Sin coincidencias."}
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {productosDisponibles.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addProductoToEdit(p)}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left transition-colors duration-100 hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {p.nombre}
                          </span>
                          <span className="block text-caption text-muted-foreground">
                            <Money value={p.precio_actual} alwaysVisible />
                          </span>
                        </span>
                        <Plus className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-label text-muted-foreground">
                Método de pago
              </h3>
              {mediosPago.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  Cargando medios de pago…
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {mediosPago.map((m) => {
                    const Icon = iconForMedioPago(m.nombre);
                    const active = editMedioId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEditMedioId(m.id)}
                        aria-pressed={active}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 text-caption font-medium transition-colors duration-100",
                          active
                            ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                            : "border-border hover:bg-accent",
                        )}
                      >
                        <Icon className="size-[18px]" strokeWidth={1.75} />
                        {m.nombre}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-label text-muted-foreground">Total</span>
              <span className="font-display text-h1 tabular-nums">
                <Money value={editTotal} display alwaysVisible />
              </span>
            </div>

            {editError ? (
              <Alert variant="destructive">
                <AlertDescription>{editError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={closeEdit}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleGuardarEdicion()}
              disabled={
                savingEdit || editLineList.length === 0 || !editMedioId
              }
            >
              {savingEdit ? <Loader2 className="animate-spin" /> : null}
              {savingEdit ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
