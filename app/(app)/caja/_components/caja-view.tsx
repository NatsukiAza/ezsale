"use client";

import { createClient } from "@/lib/supabase/client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { MetricTile } from "@/components/app/metric-tile";
import { Money } from "@/components/app/money";
import { PrivacyToggle } from "@/components/app/privacy";
import { EmptyState } from "@/components/app/empty-state";
import { FormField } from "@/components/app/form-field";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
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
import { formatArs } from "@/lib/format";

export type CajaVentaRow = {
  id: string;
  fecha_venta: string;
  monto_total: number | string;
  id_medio_pago: string;
  medios_pago: { nombre: string } | { nombre: string }[] | null;
};

export type CajaGastoRow = {
  id: string;
  monto: number | string;
  descripcion: string;
  fecha_gasto: string;
  id_usuario: string;
};

function todayLocalYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function dayStartEnd(ymd: string): { start: Date; end: Date } {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { start, end };
}

function fechaGastoForDay(ymd: string): string {
  if (ymd === todayLocalYmd()) return new Date().toISOString();
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
}

function medioNombre(v: CajaVentaRow): string {
  const m = v.medios_pago;
  if (!m) return "—";
  if (Array.isArray(m)) return m[0]?.nombre ?? "—";
  return m.nombre;
}

function formatHora(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type CajaViewProps = {
  idTienda: string;
  tiendaNombre?: string | null;
  canManageGastos: boolean;
  initialDayYmd: string;
  initialVentas: CajaVentaRow[];
  initialGastos: CajaGastoRow[];
  initialLoadError?: string | null;
};

export function CajaView({
  idTienda,
  tiendaNombre,
  canManageGastos,
  initialDayYmd,
  initialVentas,
  initialGastos,
  initialLoadError = null,
}: CajaViewProps) {
  const [dayDate, setDayDate] = useState(initialDayYmd);
  const [ventas, setVentas] = useState(initialVentas);
  const [gastos, setGastos] = useState(initialGastos);
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CajaGastoRow | null>(null);
  const [montoRaw, setMontoRaw] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<CajaGastoRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const skipFirstLoad = useRef(true);

  const dayLabel = useMemo(() => {
    const d = new Date(dayDate + "T12:00:00");
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  }, [dayDate]);

  const totalVentas = useMemo(
    () => ventas.reduce((s, v) => s + Number(v.monto_total), 0),
    [ventas],
  );
  const totalGastos = useMemo(
    () => gastos.reduce((s, g) => s + Number(g.monto), 0),
    [gastos],
  );
  const enCaja = totalVentas - totalGastos;

  const loadDay = useCallback(
    async (ymd: string) => {
      setLoading(true);
      setLoadError(null);
      const supabase = createClient();
      if (!supabase) {
        setLoadError("Supabase no está configurado.");
        setLoading(false);
        return;
      }
      const { start, end } = dayStartEnd(ymd);

      const [ventasRes, gastosRes] = await Promise.all([
        supabase
          .from("ventas")
          .select(
            `
            id,
            fecha_venta,
            monto_total,
            id_medio_pago,
            medios_pago ( nombre )
          `,
          )
          .eq("id_tienda", idTienda)
          .gte("fecha_venta", start.toISOString())
          .lt("fecha_venta", end.toISOString())
          .order("fecha_venta", { ascending: false }),
        supabase
          .from("gastos")
          .select("id, monto, descripcion, fecha_gasto, id_usuario")
          .eq("id_tienda", idTienda)
          .gte("fecha_gasto", start.toISOString())
          .lt("fecha_gasto", end.toISOString())
          .order("fecha_gasto", { ascending: false }),
      ]);

      if (ventasRes.error || gastosRes.error) {
        setLoadError(
          ventasRes.error?.message ??
            gastosRes.error?.message ??
            "Error al cargar",
        );
        setLoading(false);
        return;
      }

      setVentas(
        (ventasRes.data ?? []).map((row) => ({
          id: row.id as string,
          fecha_venta: row.fecha_venta as string,
          monto_total: row.monto_total as number | string,
          id_medio_pago: row.id_medio_pago as string,
          medios_pago: row.medios_pago as
            | { nombre: string }
            | { nombre: string }[]
            | null,
        })),
      );
      setGastos(
        (gastosRes.data ?? []).map((row) => ({
          id: row.id as string,
          monto: row.monto as number | string,
          descripcion: row.descripcion as string,
          fecha_gasto: row.fecha_gasto as string,
          id_usuario: row.id_usuario as string,
        })),
      );
      setLoading(false);
    },
    [idTienda],
  );

  useEffect(() => {
    if (skipFirstLoad.current) {
      skipFirstLoad.current = false;
      if (dayDate === initialDayYmd) return;
    }
    void loadDay(dayDate);
  }, [dayDate, initialDayYmd, loadDay]);

  function openCreate() {
    setEditing(null);
    setMontoRaw("");
    setDescripcion("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(g: CajaGastoRow) {
    setEditing(g);
    setMontoRaw(String(Number(g.monto)));
    setDescripcion(g.descripcion);
    setFormError(null);
    setFormOpen(true);
  }

  async function saveGasto() {
    const monto = Number(montoRaw.replace(",", "."));
    const desc = descripcion.trim();
    if (!Number.isFinite(monto) || monto <= 0) {
      setFormError("Ingresá un monto mayor a cero.");
      return;
    }
    if (!desc) {
      setFormError("La descripción es obligatoria.");
      return;
    }

    setSaving(true);
    setFormError(null);
    const supabase = createClient();
    if (!supabase) {
      setSaving(false);
      setFormError("Supabase no está configurado.");
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("gastos")
        .update({ monto, descripcion: desc })
        .eq("id", editing.id);
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        setFormError("Sesión expirada. Volvé a iniciar sesión.");
        return;
      }
      const { error } = await supabase.from("gastos").insert({
        id_tienda: idTienda,
        id_usuario: user.id,
        monto,
        descripcion: desc,
        fecha_gasto: fechaGastoForDay(dayDate),
      });
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    }

    setFormOpen(false);
    setEditing(null);
    await loadDay(dayDate);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setDeleteLoading(false);
      setLoadError("Supabase no está configurado.");
      setDeleting(null);
      return;
    }
    const { error } = await supabase
      .from("gastos")
      .delete()
      .eq("id", deleting.id);
    setDeleteLoading(false);
    if (error) {
      setLoadError(error.message);
      setDeleting(null);
      return;
    }
    setDeleting(null);
    await loadDay(dayDate);
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Caja"
        description={
          tiendaNombre
            ? `${tiendaNombre} · ${capitalize(dayLabel)}`
            : capitalize(dayLabel)
        }
        actions={
          <>
            <PrivacyToggle />
            {canManageGastos ? (
              <Button type="button" onClick={openCreate}>
                <Plus />
                Registrar gasto
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex items-center gap-1.5">
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
            onChange={(e) => {
              const v = e.target.value;
              if (v) setDayDate(v);
            }}
            className="h-8 w-auto"
            aria-label="Elegir día"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Día siguiente"
            onClick={() => setDayDate((d) => addDaysYmd(d, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div className="space-y-8 px-6 py-6">
        {loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {loading ? (
            <>
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </>
          ) : (
            <>
              <MetricTile
                label="Total ventas"
                value={<Money value={totalVentas} display />}
                staggerMs={0}
              />
              <MetricTile
                label="Total gastos"
                value={<Money value={totalGastos} display />}
                staggerMs={80}
              />
              <MetricTile
                hero
                label="En caja"
                value={<Money value={enCaja} display />}
                staggerMs={160}
              />
            </>
          )}
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-h2">Ventas del día</h2>
            {loading ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : ventas.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Sin ventas"
                description="No hay ventas registradas en este día."
              />
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Hora</DataTableHead>
                    <DataTableHead>Medio</DataTableHead>
                    <DataTableHead className="text-right">Monto</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {ventas.map((v) => (
                    <DataTableRow key={v.id}>
                      <DataTableCell className="tabular-nums">
                        {formatHora(v.fecha_venta)}
                      </DataTableCell>
                      <DataTableCell>{medioNombre(v)}</DataTableCell>
                      <DataTableCell className="text-right">
                        <Money value={Number(v.monto_total)} display />
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-h2">Gastos del día</h2>
            {loading ? (
              <Skeleton className="h-40 rounded-lg" />
            ) : gastos.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Sin gastos"
                description={
                  canManageGastos
                    ? "Registrá un gasto con el botón de arriba."
                    : "No hay gastos registrados en este día."
                }
              />
            ) : (
              <DataTable>
                <DataTableHeader>
                  <DataTableRow>
                    <DataTableHead>Hora</DataTableHead>
                    <DataTableHead>Descripción</DataTableHead>
                    <DataTableHead className="text-right">Monto</DataTableHead>
                    {canManageGastos ? (
                      <DataTableHead className="w-24 text-right">
                        <span className="sr-only">Acciones</span>
                      </DataTableHead>
                    ) : null}
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {gastos.map((g) => (
                    <DataTableRow key={g.id}>
                      <DataTableCell className="tabular-nums">
                        {formatHora(g.fecha_gasto)}
                      </DataTableCell>
                      <DataTableCell className="max-w-[14rem] truncate">
                        {g.descripcion}
                      </DataTableCell>
                      <DataTableCell className="text-right">
                        <Money value={Number(g.monto)} display />
                      </DataTableCell>
                      {canManageGastos ? (
                        <DataTableCell className="text-right">
                          <div className="inline-flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Editar gasto"
                              onClick={() => openEdit(g)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Eliminar gasto"
                              onClick={() => setDeleting(g)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </DataTableCell>
                      ) : null}
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!saving) setFormOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar gasto" : "Registrar gasto"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modificá el monto o la descripción del gasto."
                : `Se registra para el ${capitalize(dayLabel)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <FormField id="gasto-monto" label="Monto" error={null}>
              <Input
                id="gasto-monto"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                value={montoRaw}
                onChange={(e) => setMontoRaw(e.target.value)}
                disabled={saving}
              />
            </FormField>
            <FormField id="gasto-desc" label="Descripción" error={null}>
              <Input
                id="gasto-desc"
                type="text"
                placeholder="Ej. Alquiler, mercadería…"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={saving}
                maxLength={500}
              />
            </FormField>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void saveGasto()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {saving
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setDeleting(null);
        }}
        title="Eliminar gasto"
        description={
          deleting ? (
            <p>
              Se va a eliminar{" "}
              <span className="font-medium text-foreground">
                {deleting.descripcion}
              </span>{" "}
              por {formatArs(Number(deleting.monto))}. Esta acción no se puede
              deshacer.
            </p>
          ) : null
        }
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
