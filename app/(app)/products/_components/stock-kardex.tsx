"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/app/empty-state";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/app/data-table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/format";

export type KardexProductoOption = {
  id: string;
  nombre: string;
};

type KardexRow = {
  id: string;
  created_at: string;
  tipo: string;
  cantidad: number;
  cantidad_resultante: number;
  id_producto: string;
  producto_nombre: string;
  id_tienda: string;
  tienda_nombre: string;
  id_traspaso: string | null;
  id_venta: string | null;
  usuario_nombre: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  venta: "Venta",
  edicion_venta: "Edición de venta",
  recuento: "Recuento",
  traspaso_salida: "Traspaso (salida)",
  traspaso_entrada: "Traspaso (entrada)",
};

const ALL = "__all__";
const PAGE_SIZE = 80;

function tipoLabel(tipo: string) {
  return TIPO_LABEL[tipo] ?? tipo;
}

export function StockKardex({
  idTienda,
  isAdmin,
  productos,
  initialProductoId = null,
}: {
  idTienda: string;
  isAdmin: boolean;
  productos: KardexProductoOption[];
  initialProductoId?: string | null;
}) {
  const [tiendaFilter, setTiendaFilter] = useState(
    isAdmin ? ALL : idTienda,
  );
  const [productoFilter, setProductoFilter] = useState(
    initialProductoId ?? ALL,
  );
  const [tipoFilter, setTipoFilter] = useState(ALL);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [rows, setRows] = useState<KardexRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const productoNombreById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of productos) map.set(p.id, p.nombre);
    return map;
  }, [productos]);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      return { error: "Supabase no está configurado.", rows: [] as KardexRow[] };
    }

    const { data, error: rpcError } = await supabase.rpc("kardex_stock", {
      p_id_tienda: tiendaFilter === ALL ? null : tiendaFilter,
      p_id_producto: productoFilter === ALL ? null : productoFilter,
      p_tipo: tipoFilter === ALL ? null : tipoFilter,
      p_desde: desde ? new Date(`${desde}T00:00:00`).toISOString() : null,
      p_hasta: hasta ? new Date(`${hasta}T23:59:59.999`).toISOString() : null,
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });

    if (rpcError) {
      return { error: rpcError.message, rows: [] as KardexRow[] };
    }
    return { error: null as string | null, rows: (data ?? []) as KardexRow[] };
  }, [tiendaFilter, productoFilter, tipoFilter, desde, hasta]);

  useEffect(() => {
    let cancelled = false;
    void load().then((result) => {
      if (cancelled) return;
      setError(result.error);
      setRows(result.rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const grouped = useMemo(() => {
    if (!rows) return [];
    type Group =
      | { kind: "single"; row: KardexRow }
      | { kind: "traspaso"; id: string; rows: KardexRow[] };
    const out: Group[] = [];
    const seenTraspaso = new Set<string>();
    for (const row of rows) {
      if (row.id_traspaso) {
        if (seenTraspaso.has(row.id_traspaso)) continue;
        seenTraspaso.add(row.id_traspaso);
        const pack = rows.filter((r) => r.id_traspaso === row.id_traspaso);
        out.push({ kind: "traspaso", id: row.id_traspaso, rows: pack });
      } else {
        out.push({ kind: "single", row });
      }
    }
    return out;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        {isAdmin ? (
          <div className="space-y-1.5">
            <p className="text-label">Tienda</p>
            <Select value={tiendaFilter} onValueChange={setTiendaFilter}>
              <SelectTrigger className="sm:w-48" aria-label="Filtrar por tienda">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                <SelectItem value={idTienda}>Esta tienda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-label">Producto</p>
          <Select value={productoFilter} onValueChange={setProductoFilter}>
            <SelectTrigger className="sm:w-56" aria-label="Filtrar por producto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {productos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-label">Tipo</p>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="sm:w-48" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {Object.entries(TIPO_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-label">Desde</p>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="sm:w-40"
            aria-label="Fecha desde"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-label">Hasta</p>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="sm:w-40"
            aria-label="Fecha hasta"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error ? (
        <p className="text-body-sm text-destructive" role="alert">
          {error}
        </p>
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="Sin movimientos"
          description="Cuando vendas, recuentes o traspases, van a aparecer acá."
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableRow className="hover:bg-transparent">
              <DataTableHead>Cuándo</DataTableHead>
              <DataTableHead>Tipo</DataTableHead>
              <DataTableHead>Producto</DataTableHead>
              <DataTableHead className="text-right">Cantidad</DataTableHead>
              <DataTableHead className="text-right">Quedó</DataTableHead>
              <DataTableHead>Quién</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {grouped.map((group) => {
              if (group.kind === "single") {
                const row = group.row;
                const nombre =
                  row.producto_nombre ||
                  productoNombreById.get(row.id_producto) ||
                  "Producto";
                return (
                  <KardexLine key={row.id} row={row} productoNombre={nombre} />
                );
              }
              return group.rows.map((row, idx) => {
                const nombre =
                  row.producto_nombre ||
                  productoNombreById.get(row.id_producto) ||
                  "Producto";
                return (
                  <KardexLine
                    key={row.id}
                    row={row}
                    productoNombre={nombre}
                    grouped={idx === 0}
                    groupSize={group.rows.length}
                  />
                );
              });
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}

function KardexLine({
  row,
  productoNombre,
  grouped = false,
  groupSize = 1,
}: {
  row: KardexRow;
  productoNombre: string;
  grouped?: boolean;
  groupSize?: number;
}) {
  const when = new Date(row.created_at);
  const signed =
    row.cantidad > 0 ? `+${row.cantidad}` : String(row.cantidad);
  return (
    <DataTableRow>
      <DataTableCell className="whitespace-nowrap text-muted-foreground">
        {formatDate(when)} · {formatTime(when)}
        {row.tienda_nombre ? (
          <span className="mt-0.5 block text-caption">{row.tienda_nombre}</span>
        ) : null}
      </DataTableCell>
      <DataTableCell>
        {tipoLabel(row.tipo)}
        {grouped ? (
          <span className="mt-0.5 block text-caption text-muted-foreground">
            {groupSize === 1
              ? "1 línea"
              : `${groupSize} líneas del mismo traspaso`}
          </span>
        ) : null}
      </DataTableCell>
      <DataTableCell className="font-medium">{productoNombre}</DataTableCell>
      <DataTableCell
        className={cn(
          "text-right font-mono tabular-nums",
          row.cantidad < 0 ? "text-destructive" : "text-foreground",
        )}
      >
        {signed}
      </DataTableCell>
      <DataTableCell className="text-right font-mono tabular-nums">
        {row.cantidad_resultante}
      </DataTableCell>
      <DataTableCell className="text-muted-foreground">
        {row.usuario_nombre?.trim() || "—"}
      </DataTableCell>
    </DataTableRow>
  );
}
