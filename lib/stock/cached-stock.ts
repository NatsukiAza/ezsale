import { cache } from "react";
import { getServerSession } from "@/lib/supabase/cached-session";

export type StockByProductId = Record<string, number>;

function rowsToSparseMap(
  rows: Array<{ id_producto: string; cantidad: number | string }> | null,
): StockByProductId {
  const map: StockByProductId = {};
  if (!rows) return map;
  for (const row of rows) {
    map[row.id_producto] = Number(row.cantidad);
  }
  return map;
}

/**
 * Cantidades de la tienda actual. Solo filas existentes (sin cargar = clave ausente).
 * Dedup por request; no cachear entre requests (cambia en cada venta).
 */
export const getStockCantidades = cache(
  async (idTienda: string): Promise<StockByProductId> => {
    if (!idTienda) return {};
    const { supabase } = await getServerSession();
    if (!supabase) return {};
    const { data, error } = await supabase
      .from("stock_tienda")
      .select("id_producto, cantidad")
      .eq("id_tienda", idTienda);
    if (error || !data) return {};
    return rowsToSparseMap(
      data as Array<{ id_producto: string; cantidad: number | string }>,
    );
  },
);
