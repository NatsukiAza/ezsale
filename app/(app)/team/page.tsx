import { TeamView } from "./_components/team-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type RolMiembro = "admin" | "manager" | "normal";

type MiembroRow = {
  id: string;
  nombre: string;
  apellido: string;
  rol: RolMiembro;
  id_tienda: string | null;
};

type TiendaOption = { id: string; nombre: string };

export default async function TeamPage() {
  const { supabase, user, perfil } = await getPerfilTienda();
  if (!supabase || !user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");
  if (!perfil.id_tienda) redirect("/seleccionar-tienda");
  if (perfil.rol !== "admin" && perfil.rol !== "manager") {
    redirect("/dashboard");
  }

  const idOrganizacion = perfil.id_organizacion;
  const idTienda = perfil.id_tienda;
  const viewerRol = perfil.rol as "admin" | "manager";
  const isOrgAdmin = viewerRol === "admin";

  const perfilesQuery = supabase
    .from("perfiles")
    .select("id, nombre, apellido, rol, id_tienda")
    .eq("id_organizacion", idOrganizacion)
    .is("eliminado_en", null);

  const [perfilesRes, tiendasRes] = await Promise.all([
    isOrgAdmin
      ? perfilesQuery.or(
          `id_tienda.eq.${idTienda},and(id_tienda.is.null,rol.eq.admin)`,
        )
      : perfilesQuery.eq("id_tienda", idTienda),
    isOrgAdmin
      ? supabase
          .from("tiendas")
          .select("id, nombre")
          .eq("id_organizacion", idOrganizacion)
          .is("eliminado_en", null)
          .order("nombre")
      : Promise.resolve({ data: [] as TiendaOption[], error: null }),
  ]);

  const list = ((perfilesRes.data ?? []) as MiembroRow[]).map((m) => ({
    ...m,
    rol: (m.rol === "admin" || m.rol === "manager" ? m.rol : "normal") as RolMiembro,
  }));
  const me = list.find((m) => m.id === user.id);
  const rest = list
    .filter((m) => m.id !== user.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const miembros = me ? [me, ...rest] : rest;

  const tiendas = ((tiendasRes.data ?? []) as TiendaOption[]).map((t) => ({
    id: t.id as string,
    nombre: t.nombre as string,
  }));

  return (
    <TeamView
      idTienda={idTienda}
      idOrganizacion={idOrganizacion}
      viewerRol={viewerRol}
      tiendas={tiendas}
      currentUserId={user.id}
      initialMiembros={miembros}
      initialLoadError={perfilesRes.error?.message ?? null}
    />
  );
}
