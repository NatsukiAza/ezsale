import { ProductsView } from "./_components/products-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function categoriaNombreFromJoin(row: { categorias: unknown }): string | null {
  const c = row.categorias;
  if (c == null) return null;
  if (Array.isArray(c)) {
    const first = c[0] as { nombre?: string } | undefined;
    return first?.nombre ?? null;
  }
  return (c as { nombre: string }).nombre;
}

export default async function ProductsPage() {
  const { supabase, user, perfil } = await getPerfilTienda();
  if (!supabase || !user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");

  const idOrganizacion = perfil.id_organizacion;
  const isAdmin = perfil.rol === "admin";

  const [catsRes, prodsRes] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, nombre, id_padre")
      .eq("id_organizacion", idOrganizacion)
      .is("eliminado_en", null)
      .order("nombre"),
    supabase
      .from("productos")
      .select(
        "id, id_categoria, nombre, descripcion, precio_actual, categorias ( nombre )",
      )
      .eq("id_organizacion", idOrganizacion)
      .is("eliminado_en", null)
      .order("nombre"),
  ]);

  const loadError =
    catsRes.error?.message ?? prodsRes.error?.message ?? null;

  const catRows = (catsRes.data ?? []) as {
    id: string;
    nombre: string;
    id_padre: string | null;
  }[];
  const idToName = new Map(catRows.map((c) => [c.id, c.nombre]));
  const categorias = catRows.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    id_padre: c.id_padre,
    parentNombre: c.id_padre ? (idToName.get(c.id_padre) ?? null) : null,
  }));

  const productos = (prodsRes.data ?? []).map((row) => {
    const nombreRow = row.nombre as string;
    const descripcionRow = row.descripcion as string;
    const categoriaNombre = categoriaNombreFromJoin(
      row as { categorias: unknown },
    );
    return {
      id: row.id as string,
      id_categoria: row.id_categoria as string,
      nombre: nombreRow,
      descripcion: descripcionRow,
      precio_actual: Number(row.precio_actual),
      categoriaNombre,
      searchText: searchFold(
        `${nombreRow} ${descripcionRow} ${categoriaNombre ?? ""}`,
      ),
    };
  });

  return (
    <ProductsView
      idOrganizacion={idOrganizacion}
      isAdmin={isAdmin}
      initialCategorias={categorias}
      initialProductos={productos}
      initialLoadError={loadError}
    />
  );
}
