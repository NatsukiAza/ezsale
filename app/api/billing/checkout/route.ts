import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CHECKOUT_PLANS,
  INTRO_DISCOUNT_MONTHS,
  getPlan,
  isIntroEligible,
  parsePlanId,
  precioIntroArs,
  type PlanId,
} from "@/lib/billing/plans";
import {
  createPreApprovalClient,
  extractMercadoPagoError,
  getMercadoPagoAccessToken,
  getMercadoPagoBackUrl,
} from "@/lib/billing/mercadopago";
import { computeExcesoTiendasHasta } from "@/lib/stores/exceso-tiendas";
import { NextResponse } from "next/server";

type Body = {
  plan?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  if (!getMercadoPagoAccessToken()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Mercado Pago no está configurado (falta MP_ACCESS_TOKEN).",
      },
      { status: 501 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Servidor no configurado." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Iniciá sesión para continuar." },
      { status: 401 },
    );
  }

  const payerEmail =
    process.env.MP_TEST_PAYER_EMAIL?.trim() || user.email;

  const { data: miPerfil } = await supabase
    .from("perfiles")
    .select("id_organizacion, rol, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();

  if (!miPerfil?.id_organizacion || miPerfil.eliminado_en) {
    return NextResponse.json(
      { ok: false, error: "No se encontró tu perfil." },
      { status: 400 },
    );
  }
  if (miPerfil.rol !== "admin") {
    return NextResponse.json(
      {
        ok: false,
        error: "Solo el administrador puede gestionar la suscripción.",
      },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 501 },
    );
  }

  const idOrg = miPerfil.id_organizacion as string;
  const { data: org } = await admin
    .from("organizaciones")
    .select(
      "id, nombre, plan, cobro_exento, pagado_hasta, mp_preapproval_id, mp_payer_email, exceso_tiendas_hasta",
    )
    .eq("id", idOrg)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      { ok: false, error: "Organización no encontrada." },
      { status: 404 },
    );
  }

  if (org.cobro_exento) {
    return NextResponse.json(
      { ok: false, error: "Esta organización está exenta de cobro." },
      { status: 400 },
    );
  }

  const requested = parsePlanId(body.plan) ?? parsePlanId(org.plan);
  if (!requested || !CHECKOUT_PLANS.includes(requested)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Elegí un plan (Local, Sucursales o Cadena). Empresa se coordina por correo.",
      },
      { status: 400 },
    );
  }

  const planDef = getPlan(requested);
  if (planDef.precioArs == null) {
    return NextResponse.json(
      { ok: false, error: "Ese plan no tiene precio fijo de checkout." },
      { status: 400 },
    );
  }

  const preApproval = createPreApprovalClient();
  if (!preApproval) {
    return NextResponse.json(
      { ok: false, error: "No se pudo inicializar Mercado Pago." },
      { status: 501 },
    );
  }

  const existingId = org.mp_preapproval_id as string | null;
  const samePlan = parsePlanId(org.plan) === requested;
  const samePayer =
    (org.mp_payer_email as string | null)?.toLowerCase() ===
    payerEmail.toLowerCase();
  const introEligible = isIntroEligible(
    (org.pagado_hasta as string | null) ?? null,
  );
  const chargeAmount = introEligible
    ? precioIntroArs(planDef.precioArs)
    : planDef.precioArs;

  if (existingId && samePlan && samePayer) {
    try {
      const existing = await preApproval.get({ id: existingId });
      if (
        existing.init_point &&
        (existing.status === "pending" || existing.status === "authorized")
      ) {
        return NextResponse.json({
          ok: true,
          init_point: existing.init_point,
          preapproval_id: existing.id,
        });
      }
    } catch {
      // crear uno nuevo
    }
  }

  const backUrl = getMercadoPagoBackUrl();
  const orgNombre = String(org.nombre ?? "negocio");

  try {
    const created = await preApproval.create({
      body: {
        reason: `EZSale ${planDef.name} - ${orgNombre}`,
        external_reference: idOrg,
        payer_email: payerEmail,
        back_url: backUrl,
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: chargeAmount,
          currency_id: "ARS",
        },
      },
    });

    if (!created.id || !created.init_point) {
      return NextResponse.json(
        { ok: false, error: "Mercado Pago no devolvió el link de pago." },
        { status: 502 },
      );
    }

    const { count: activas } = await admin
      .from("tiendas")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", idOrg)
      .is("eliminado_en", null);

    const exceso = computeExcesoTiendasHasta({
      plan: requested,
      tiendasActivas: activas ?? 0,
      excesoActual: (org.exceso_tiendas_hasta as string | null) ?? null,
    });

    const { error: updErr } = await admin
      .from("organizaciones")
      .update({
        plan: requested as PlanId,
        mp_preapproval_id: created.id,
        mp_payer_email: payerEmail,
        estado_mp: created.status ?? "pending",
        exceso_tiendas_hasta: exceso,
        ...(introEligible
          ? {
              mp_promo_meses: INTRO_DISCOUNT_MONTHS,
              mp_promo_ciclos_cobrados: 0,
              mp_precio_lleno_ars: planDef.precioArs,
            }
          : {
              mp_promo_meses: 0,
              mp_promo_ciclos_cobrados: 0,
              mp_precio_lleno_ars: null,
            }),
      })
      .eq("id", idOrg);

    if (updErr) {
      console.error("[billing] update org after checkout", updErr);
    }

    return NextResponse.json({
      ok: true,
      init_point: created.init_point,
      preapproval_id: created.id,
    });
  } catch (e) {
    const msg = extractMercadoPagoError(e);
    console.error("[billing] preapproval create", e);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
