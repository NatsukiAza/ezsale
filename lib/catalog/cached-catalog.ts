import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type CachedCategoria = {
  id: string;
  nombre: string;
  id_padre: string | null;
};

export type CachedProducto = {
  id: string;
  id_categoria: string;
  nombre: string;
  descripcion: string;
  precio_actual: number;
  categoriaNombre: string | null;
};

export type CachedCatalog = {
  categorias: CachedCategoria[];
  productos: CachedProducto[];
  error: string | null;
};

function categoriaNombreFromJoin(row: { categorias: unknown }): string | null {
  const c = row.categorias;
  if (c == null) return null;
  if (Array.isArray(c)) {
    const first = c[0] as { nombre?: string } | undefined;
    return first?.nombre ?? null;
  }
  return (c as { nombre: string }).nombre;
}

async function fetchCatalogForOrg(orgId: string): Promise<CachedCatalog> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      categorias: [],
      productos: [],
      error: "Supabase admin no está configurado.",
    };
  }

  const [catsRes, prodsRes] = await Promise.all([
    admin
      .from("categorias")
      .select("id, nombre, id_padre")
      .eq("id_organizacion", orgId)
      .is("eliminado_en", null)
      .order("nombre"),
    admin
      .from("productos")
      .select(
        "id, id_categoria, nombre, descripcion, precio_actual, categorias ( nombre )",
      )
      .eq("id_organizacion", orgId)
      .is("eliminado_en", null)
      .order("nombre"),
  ]);

  if (catsRes.error || prodsRes.error) {
    return {
      categorias: [],
      productos: [],
      error: catsRes.error?.message ?? prodsRes.error?.message ?? "Error",
    };
  }

  const categorias = (catsRes.data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    id_padre: (c.id_padre as string | null) ?? null,
  }));

  const productos = (prodsRes.data ?? []).map((row) => ({
    id: row.id as string,
    id_categoria: row.id_categoria as string,
    nombre: row.nombre as string,
    descripcion: (row.descripcion as string) ?? "",
    precio_actual: Number(row.precio_actual),
    categoriaNombre: categoriaNombreFromJoin(
      row as { categorias: unknown },
    ),
  }));

  return { categorias, productos, error: null };
}

export function getCachedCatalog(orgId: string): Promise<CachedCatalog> {
  return unstable_cache(
    async () => fetchCatalogForOrg(orgId),
    ["catalog", orgId],
    { revalidate: 60, tags: [`catalog-${orgId}`] },
  )();
}
