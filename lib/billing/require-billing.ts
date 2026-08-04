import { assertBillingAllowed } from "@/lib/billing/assert-access";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Helper reutilizable en route handlers: 402 si la organización está bloqueada por cobro.
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
    .select("id_organizacion, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.id_organizacion || perfil.eliminado_en) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Perfil inválido." },
        { status: 400 },
      ),
    };
  }
  const { data: org } = await supabase
    .from("organizaciones")
    .select("created_at, cobro_exento, pagado_hasta, plan")
    .eq("id", perfil.id_organizacion)
    .maybeSingle();
  if (!org) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Organización no encontrada." },
        { status: 404 },
      ),
    };
  }
  const blocked = assertBillingAllowed({
    created_at: org.created_at as string,
    cobro_exento: Boolean(org.cobro_exento),
    pagado_hasta: (org.pagado_hasta as string | null) ?? null,
    plan: (org.plan as string | null) ?? null,
  });
  if (blocked) return { error: blocked };
  return {
    supabase,
    user,
    idOrganizacion: perfil.id_organizacion as string,
  };
}
