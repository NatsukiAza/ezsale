import { NewSaleView } from "@/app/(app)/new-sale/_components/new-sale-view";
import { getCachedCatalog } from "@/lib/catalog/cached-catalog";
import { getStockCantidades } from "@/lib/stock/cached-stock";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default async function NewSalePage() {
  const { supabase, user, perfil, usaStock } = await getPerfilTienda();
  if (!supabase || !user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");
  if (!perfil.id_tienda) redirect("/seleccionar-tienda");

  const idOrganizacion = perfil.id_organizacion;
  const idTienda = perfil.id_tienda;

  const stockPromise = usaStock
    ? getStockCantidades(idTienda)
    : Promise.resolve(null);

  const [catalog, mediosRes, ventasRes, stockByProductId] = await Promise.all([
    getCachedCatalog(idOrganizacion),
    supabase.from("medios_pago").select("id, nombre").order("nombre"),
    supabase.rpc("unidades_vendidas_por_tienda", { p_id_tienda: idTienda }),
    stockPromise,
  ]);

  const loadError =
    catalog.error ?? mediosRes.error?.message ?? null;

  const ventasMap = new Map<string, number>();
  if (!ventasRes.error && ventasRes.data) {
    for (const row of ventasRes.data as Array<{
      id_product: string;
      unidades: number | string;
    }>) {
      ventasMap.set(row.id_product, Number(row.unidades));
    }
  }

  const productos = catalog.productos
    .map((row) => ({
      id: row.id,
      id_categoria: row.id_categoria,
      nombre: row.nombre,
      precio_actual: row.precio_actual,
      nombre_busqueda: searchFold(row.nombre),
    }))
    .sort((a, b) => {
      const ua = ventasMap.get(a.id) ?? 0;
      const ub = ventasMap.get(b.id) ?? 0;
      if (ub !== ua) return ub - ua;
      return a.nombre.localeCompare(b.nombre, "es");
    });

  return (
    <NewSaleView
      idTienda={idTienda}
      categorias={catalog.categorias.map((c) => ({
        id: c.id,
        nombre: c.nombre,
      }))}
      mediosPago={(mediosRes.data ?? []) as { id: string; nombre: string }[]}
      productos={productos}
      stockByProductId={stockByProductId}
      loadError={loadError}
    />
  );
}
