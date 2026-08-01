import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CHECKOUT_PLANS,
  getPlan,
  parsePlanId,
  type PlanId,
} from "@/lib/billing/plans";
import {
  createPreApprovalClient,
  extractMercadoPagoError,
  getMercadoPagoAccessToken,
  getMercadoPagoBackUrl,
} from "@/lib/billing/mercadopago";
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

  // En TEST, MP exige que el pagador sea usuario de prueba.
  // El panel solo muestra "Usuario", pero la cuenta tiene un email interno
  // (suele ser test_user_…@testuser.com). Podés forzar ese email acá.
  const payerEmail =
    process.env.MP_TEST_PAYER_EMAIL?.trim() || user.email;

  const { data: miPerfil } = await supabase
    .from("perfiles")
    .select("id_tienda, rol, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();

  if (!miPerfil?.id_tienda || miPerfil.eliminado_en) {
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

  const idTienda = miPerfil.id_tienda as string;
  const { data: tienda } = await admin
    .from("tiendas")
    .select("id, nombre, plan, cobro_exento, mp_preapproval_id, mp_payer_email")
    .eq("id", idTienda)
    .maybeSingle();

  if (!tienda) {
    return NextResponse.json(
      { ok: false, error: "Tienda no encontrada." },
      { status: 404 },
    );
  }

  if (tienda.cobro_exento) {
    return NextResponse.json(
      { ok: false, error: "Esta tienda está exenta de cobro." },
      { status: 400 },
    );
  }

  const requested = parsePlanId(body.plan) ?? parsePlanId(tienda.plan);
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

  const existingId = tienda.mp_preapproval_id as string | null;
  const samePlan = parsePlanId(tienda.plan) === requested;
  const samePayer =
    (tienda.mp_payer_email as string | null)?.toLowerCase() ===
    payerEmail.toLowerCase();

  // No reutilizar un link viejo creado con otro email (ej. Gmail real en TEST).
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

  // Suscripción con pago pendiente (sin plan asociado): MP devuelve init_point
  // para que el usuario complete el medio de pago. Con preapproval_plan_id
  // exige card_token_id (checkout con tarjeta tokenizada).
  const backUrl = getMercadoPagoBackUrl();
  const tiendaNombre = String(tienda.nombre ?? "tienda");

  try {
    const created = await preApproval.create({
      body: {
        reason: `EZSale ${planDef.name} - ${tiendaNombre}`,
        external_reference: idTienda,
        payer_email: payerEmail,
        back_url: backUrl,
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: planDef.precioArs,
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

    const { error: updErr } = await admin
      .from("tiendas")
      .update({
        plan: requested as PlanId,
        mp_preapproval_id: created.id,
        mp_payer_email: payerEmail,
        estado_mp: created.status ?? "pending",
      })
      .eq("id", idTienda);

    if (updErr) {
      console.error("[billing] update tienda after checkout", updErr);
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
