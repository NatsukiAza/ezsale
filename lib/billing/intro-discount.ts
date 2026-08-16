import type { PreApproval } from "mercadopago";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INTRO_DISCOUNT_MONTHS } from "@/lib/billing/plans";
import { extractMercadoPagoError } from "@/lib/billing/mercadopago";

export type OrgPromoRow = {
  id: string;
  mp_precio_lleno_ars: unknown;
  mp_promo_meses: unknown;
  mp_promo_ciclos_cobrados: unknown;
  mp_preapproval_id: unknown;
};

function toInt(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return fallback;
}

function toPositiveInt(value: unknown): number | null {
  const n = toInt(value, 0);
  return n > 0 ? n : null;
}

/**
 * Tras N cobros intro, sube el PreApproval al precio de lista.
 * Prefiere `summarized.charged_quantity`; si falta, incrementa una vez por evento.
 */
export async function maybeBumpIntroPrice(params: {
  admin: SupabaseClient;
  preApproval: PreApproval;
  org: OrgPromoRow;
  preapprovalId: string;
  chargedQuantity: number | null;
  eventId: string;
}): Promise<void> {
  const fullPrice = toPositiveInt(params.org.mp_precio_lleno_ars);
  if (fullPrice == null) return;
  if (
    typeof params.org.mp_preapproval_id === "string" &&
    params.org.mp_preapproval_id &&
    params.org.mp_preapproval_id !== params.preapprovalId
  ) {
    return;
  }

  const mesesRaw = toInt(params.org.mp_promo_meses, INTRO_DISCOUNT_MONTHS);
  const meses = mesesRaw > 0 ? mesesRaw : INTRO_DISCOUNT_MONTHS;
  let ciclos = toInt(params.org.mp_promo_ciclos_cobrados, 0);

  if (
    typeof params.chargedQuantity === "number" &&
    Number.isFinite(params.chargedQuantity) &&
    params.chargedQuantity > 0
  ) {
    ciclos = Math.max(ciclos, params.chargedQuantity);
  } else {
    const { data: ev } = await params.admin
      .from("mp_webhook_events")
      .select("promo_ciclo_contado")
      .eq("id", params.eventId)
      .maybeSingle();

    if (!ev?.promo_ciclo_contado) {
      ciclos += 1;
      await params.admin
        .from("mp_webhook_events")
        .update({ promo_ciclo_contado: true })
        .eq("id", params.eventId);
    }
  }

  const { error: ciclosErr } = await params.admin
    .from("organizaciones")
    .update({ mp_promo_ciclos_cobrados: ciclos })
    .eq("id", params.org.id);
  if (ciclosErr) {
    console.error("[billing] promo ciclos update", ciclosErr);
  }

  if (ciclos < meses) return;

  try {
    await params.preApproval.update({
      id: params.preapprovalId,
      body: {
        auto_recurring: {
          transaction_amount: fullPrice,
          currency_id: "ARS",
        },
      },
    });
  } catch (e) {
    console.error(
      "[billing] promo bump PUT failed",
      extractMercadoPagoError(e),
      e,
    );
    return;
  }

  const { error: clearErr } = await params.admin
    .from("organizaciones")
    .update({
      mp_precio_lleno_ars: null,
      mp_promo_meses: 0,
    })
    .eq("id", params.org.id);
  if (clearErr) {
    console.error("[billing] promo clear after bump", clearErr);
  }
}
