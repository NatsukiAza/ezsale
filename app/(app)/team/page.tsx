import { TeamView } from "./_components/team-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type MiembroRow = {
  id: string;
  nombre: string;
  apellido: string;
  rol: "admin" | "normal";
};

export default async function TeamPage() {
  const { supabase, user, perfil } = await getPerfilTienda();
  if (!supabase || !user) redirect("/");
  if (!perfil?.id_tienda) redirect("/registro/completar");
  if (perfil.rol !== "admin") redirect("/dashboard");

  const idTienda = perfil.id_tienda;
  const { data: rows, error } = await supabase
    .from("perfiles")
    .select("id, nombre, apellido, rol")
    .eq("id_tienda", idTienda);

  const list = (rows ?? []) as MiembroRow[];
  const me = list.find((m) => m.id === user.id);
  const rest = list
    .filter((m) => m.id !== user.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const miembros = me ? [me, ...rest] : rest;

  return (
    <TeamView
      idTienda={idTienda}
      currentUserId={user.id}
      initialMiembros={miembros}
      initialLoadError={error?.message ?? null}
    />
  );
}
