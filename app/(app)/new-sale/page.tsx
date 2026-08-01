import { NewSaleView } from "@/app/(app)/new-sale/_components/new-sale-view";
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
  const { supabase, user, perfil } = await getPerfilTienda();
  if (!supabase || !user) redirect("/login");
  if (!perfil?.id_tienda) redirect("/registro/completar");

  const idTienda = perfil.id_tienda;

  const [catsRes, mediosRes, productosRes, ventasRes] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nombre")
      .eq("id_tienda", idTienda)
      .is("eliminado_en", null)
      .order("nombre"),
    supabase.from("medios_pago").select("id, nombre").order("nombre"),
    supabase
      .from("productos")
      .select("id, id_categoria, nombre, precio_actual")
      .eq("id_tienda", idTienda)
      .is("eliminado_en", null),
    supabase.rpc("unidades_vendidas_por_tienda", { p_id_tienda: idTienda }),
  ]);

  const loadError =
    catsRes.error?.message ??
    mediosRes.error?.message ??
    productosRes.error?.message ??
    null;

  const ventasMap = new Map<string, number>();
  if (!ventasRes.error && ventasRes.data) {
    for (const row of ventasRes.data as Array<{
      id_product: string;
      unidades: number | string;
    }>) {
      ventasMap.set(row.id_product, Number(row.unidades));
    }
  }

  const productos = (productosRes.data ?? [])
    .map((row) => ({
      id: row.id as string,
      id_categoria: row.id_categoria as string,
      nombre: row.nombre as string,
      precio_actual: Number(row.precio_actual),
      nombre_busqueda: searchFold(row.nombre as string),
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
      categorias={(catsRes.data ?? []) as { id: string; nombre: string }[]}
      mediosPago={(mediosRes.data ?? []) as { id: string; nombre: string }[]}
      productos={productos}
      loadError={loadError}
    />
  );
}
