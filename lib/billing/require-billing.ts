import { assertBillingAllowed } from "@/lib/billing/assert-access";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Helper reutilizable en route handlers: 402 si la tienda está bloqueada por cobro.
 */
export async function requireBillingOr402() {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Servidor no configurado." },
        { status: 500 },
      ),
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Iniciá sesión." },
        { status: 401 },
      ),
    };
  }
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id_tienda, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.id_tienda || perfil.eliminado_en) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Perfil inválido." },
        { status: 400 },
      ),
    };
  }
  const { data: tienda } = await supabase
    .from("tiendas")
    .select("created_at, cobro_exento, pagado_hasta, plan")
    .eq("id", perfil.id_tienda)
    .maybeSingle();
  if (!tienda) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Tienda no encontrada." },
        { status: 404 },
      ),
    };
  }
  const blocked = assertBillingAllowed({
    created_at: tienda.created_at as string,
    cobro_exento: Boolean(tienda.cobro_exento),
    pagado_hasta: (tienda.pagado_hasta as string | null) ?? null,
    plan: (tienda.plan as string | null) ?? null,
  });
  if (blocked) return { error: blocked };
  return { supabase, user, idTienda: perfil.id_tienda as string };
}
