import { createAdminClient } from "@/lib/supabase/admin";
import {
  createInvoiceClient,
  createPreApprovalClient,
  verifyMercadoPagoWebhook,
} from "@/lib/billing/mercadopago";
import { parsePlanId } from "@/lib/billing/plans";
import { sendSubscriptionReceiptEmail } from "@/lib/billing/receipt-email";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type MpNotifyBody = {
  id?: string | number;
  type?: string;
  action?: string;
  data?: { id?: string | number };
  entity?: string;
};

function addOneMonth(from: Date): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

async function claimEvent(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  eventId: string,
  topic: string,
): Promise<"new" | "exists"> {
  const { error } = await admin.from("mp_webhook_events").insert({
    id: eventId,
    topic,
    email_enviado: false,
  });
  if (error) {
    if (error.code === "23505") return "exists";
    console.error("[billing] webhook claim", error);
    // Continuar de todos modos para no perder sync
    return "new";
  }
  return "new";
}

async function syncPreapproval(preapprovalId: string) {
  const admin = createAdminClient();
  const client = createPreApprovalClient();
  if (!admin || !client) return;

  const sub = await client.get({ id: preapprovalId });
  const tiendaId =
    typeof sub.external_reference === "string"
      ? sub.external_reference
      : null;

  let query = admin.from("tiendas").update({
    estado_mp: sub.status ?? null,
    mp_preapproval_id: sub.id ?? preapprovalId,
    ...(sub.payer_email ? { mp_payer_email: sub.payer_email } : {}),
    ...(sub.next_payment_date && sub.status === "authorized"
      ? { pagado_hasta: sub.next_payment_date }
      : {}),
  });

  if (tiendaId) {
    query = query.eq("id", tiendaId);
  } else {
    query = query.eq("mp_preapproval_id", preapprovalId);
  }

  const { error } = await query;
  if (error) console.error("[billing] sync preapproval", error);
}

async function syncAuthorizedPayment(
  invoiceId: string,
  eventId: string,
) {
  const admin = createAdminClient();
  const invoices = createInvoiceClient();
  const preApproval = createPreApprovalClient();
  if (!admin || !invoices) return;

  const invoice = await invoices.get({ id: invoiceId });
  const paymentStatus = invoice.payment?.status;
  const preapprovalId = invoice.preapproval_id;
  if (!preapprovalId) {
    console.warn("[billing] invoice sin preapproval_id", invoiceId);
    return;
  }

  let tiendaId: string | null =
    typeof invoice.external_reference === "string"
      ? invoice.external_reference
      : null;
  let nextPayment: string | null = null;
  let estadoMp: string | null = null;

  if (preApproval) {
    try {
      const sub = await preApproval.get({ id: preapprovalId });
      if (!tiendaId && typeof sub.external_reference === "string") {
        tiendaId = sub.external_reference;
      }
      nextPayment = sub.next_payment_date ?? null;
      estadoMp = sub.status ?? null;
    } catch (e) {
      console.error("[billing] get preapproval for invoice", e);
    }
  }

  const approved =
    paymentStatus === "approved" || invoice.status === "processed";

  if (!approved) {
    if (tiendaId && estadoMp) {
      await admin
        .from("tiendas")
        .update({ estado_mp: estadoMp, mp_preapproval_id: preapprovalId })
        .eq("id", tiendaId);
    }
    return;
  }

  const pagadoHasta = nextPayment
    ? new Date(nextPayment)
    : addOneMonth(
        new Date(invoice.debit_date ?? invoice.date_created ?? Date.now()),
      );

  let tiendaQuery = admin
    .from("tiendas")
    .update({
      pagado_hasta: pagadoHasta.toISOString(),
      estado_mp: estadoMp ?? "authorized",
      mp_preapproval_id: preapprovalId,
    })
    .select("id, nombre, plan, pagado_hasta");

  if (tiendaId) {
    tiendaQuery = tiendaQuery.eq("id", tiendaId);
  } else {
    tiendaQuery = tiendaQuery.eq("mp_preapproval_id", preapprovalId);
  }

  const { data: tiendas, error } = await tiendaQuery;
  if (error) {
    console.error("[billing] update tienda on payment", error);
    return;
  }

  const tienda = tiendas?.[0];
  if (!tienda) return;

  const { data: ev } = await admin
    .from("mp_webhook_events")
    .select("email_enviado")
    .eq("id", eventId)
    .maybeSingle();

  if (ev?.email_enviado) return;

  const { data: admins } = await admin
    .from("perfiles")
    .select("id")
    .eq("id_tienda", tienda.id)
    .eq("rol", "admin")
    .is("eliminado_en", null);

  const adminIds = (admins ?? []).map((a) => a.id as string);
  const emails: string[] = [];
  for (const id of adminIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    const email = data.user?.email;
    if (email) emails.push(email);
  }

  const paymentId =
    invoice.payment?.id?.toString() ?? invoice.id?.toString() ?? invoiceId;
  const plan = parsePlanId(tienda.plan);

  const result = await sendSubscriptionReceiptEmail({
    to: emails,
    tiendaNombre: (tienda.nombre as string) || "Tu tienda",
    plan,
    montoArs:
      typeof invoice.transaction_amount === "number"
        ? invoice.transaction_amount
        : null,
    pagadoHasta,
    paymentId,
    paidAt: new Date(invoice.debit_date ?? invoice.date_created ?? Date.now()),
  });

  if (result.sent) {
    await admin
      .from("mp_webhook_events")
      .update({ email_enviado: true })
      .eq("id", eventId);
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let body: MpNotifyBody = {};
  try {
    body = (await request.json()) as MpNotifyBody;
  } catch {
    body = {};
  }

  const dataId =
    (body.data?.id != null ? String(body.data.id) : null) ||
    url.searchParams.get("data.id") ||
    url.searchParams.get("id");

  const topic =
    body.type ||
    body.action ||
    body.entity ||
    url.searchParams.get("type") ||
    url.searchParams.get("topic") ||
    "unknown";

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  const verified = verifyMercadoPagoWebhook({
    xSignature,
    xRequestId,
    dataId,
  });
  if (!verified.ok) {
    console.warn("[billing] webhook signature fail", verified.reason);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Ack rápido: procesamos en el mismo request pero respondemos 200 al final;
  // MP reintenta si no hay 200.
  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const eventId = `${topic}:${dataId}`;
  await claimEvent(admin, eventId, topic);

  try {
    const t = topic.toLowerCase();
    if (
      t.includes("subscription_authorized_payment") ||
      t.includes("authorized_payment") ||
      t === "subscription_authorized_payment"
    ) {
      await syncAuthorizedPayment(dataId, eventId);
    } else if (
      t.includes("subscription_preapproval") ||
      t.includes("preapproval") ||
      t === "subscription_preapproval"
    ) {
      await syncPreapproval(dataId);
    } else if (t === "payment") {
      // Pago subyacente: no extendemos acceso solo con esto; el invoice es la fuente.
    }
  } catch (e) {
    console.error("[billing] webhook process", e);
    // Igual 200 para no loop infinito; el claim evita re-proceso parcial raro —
    // si falló sync, borrar claim permitiría retry. Mejor borrar en error.
    await admin.from("mp_webhook_events").delete().eq("id", eventId);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** MP a veces usa GET para validar la URL */
export async function GET() {
  return NextResponse.json({ ok: true });
}
