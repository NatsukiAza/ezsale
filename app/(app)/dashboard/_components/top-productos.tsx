import { Skeleton } from "@/components/ui/skeleton";
import { getPerfilTienda } from "@/lib/supabase/cached-session";

const TOP_PRODUCTOS_DIAS = 90;

export type TopProductosResult =
  | { error: string }
  | { bestsellers: { nombre: string; unidades: number }[] };

export async function loadTopProductos(
  idTienda: string,
): Promise<TopProductosResult> {
  const { supabase } = await getPerfilTienda();
  if (!supabase) return { error: "Sin sesión" };

  const now = new Date();
  const topDesde = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (TOP_PRODUCTOS_DIAS - 1),
      0,
      0,
      0,
    ),
  );

  const bestRes = await supabase.rpc("top_productos_por_tienda", {
    p_id_tienda: idTienda,
    p_limit: 3,
    p_desde: topDesde.toISOString(),
  });

  if (bestRes.error) return { error: bestRes.error.message };

  return {
    bestsellers: (bestRes.data ?? []).map(
      (row: { nombre: string; unidades: string | number }) => ({
        nombre: row.nombre,
        unidades: Number(row.unidades),
      }),
    ),
  };
}

export async function TopProductosList({
  promise,
}: {
  promise: Promise<TopProductosResult>;
}) {
  const result = await promise;
  if ("error" in result) {
    return (
      <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
        No se pudo cargar el top de productos.
      </p>
    );
  }

  if (result.bestsellers.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
        Todavía no hay top — las primeras ventas del día se anotan acá.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {result.bestsellers.map((b, i) => (
        <li
          key={`${b.nombre}-${i}`}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-caption font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <span className="truncate text-sm font-medium">{b.nombre}</span>
          </div>
          <span className="shrink-0 font-mono text-body-sm tabular-nums text-muted-foreground">
            {b.unidades} u.
          </span>
        </li>
      ))}
    </ol>
  );
}

export function TopProductosFallback() {
  return (
    <div className="space-y-2 px-4 py-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
