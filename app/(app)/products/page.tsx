import { ProductsView } from "./_components/products-view";
import { getCachedCatalog } from "@/lib/catalog/cached-catalog";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function searchFold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default async function ProductsPage() {
  const { user, perfil } = await getPerfilTienda();
  if (!user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");

  const idOrganizacion = perfil.id_organizacion;
  const isAdmin = perfil.rol === "admin";

  const catalog = await getCachedCatalog(idOrganizacion);

  const idToName = new Map(catalog.categorias.map((c) => [c.id, c.nombre]));
  const categorias = catalog.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    id_padre: c.id_padre,
    parentNombre: c.id_padre ? (idToName.get(c.id_padre) ?? null) : null,
  }));

  const productos = catalog.productos.map((row) => ({
    id: row.id,
    id_categoria: row.id_categoria,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio_actual: row.precio_actual,
    categoriaNombre: row.categoriaNombre,
    searchText: searchFold(
      `${row.nombre} ${row.descripcion} ${row.categoriaNombre ?? ""}`,
    ),
  }));

  return (
    <ProductsView
      idOrganizacion={idOrganizacion}
      isAdmin={isAdmin}
      initialCategorias={categorias}
      initialProductos={productos}
      initialLoadError={catalog.error}
    />
  );
}
