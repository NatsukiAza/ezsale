import { DashboardView } from "@/app/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id_tienda")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.id_tienda) {
    redirect("/registro/completar");
  }

  const { data: tienda } = await supabase
    .from("tiendas")
    .select("nombre")
    .eq("id", perfil.id_tienda)
    .maybeSingle();
  const tiendaNombre = tienda?.nombre ?? null;

  return <DashboardView tiendaNombre={tiendaNombre} />;
}
