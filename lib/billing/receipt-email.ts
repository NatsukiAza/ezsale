import { Resend } from "resend";
import { formatArs, formatLongDate } from "@/lib/format";
import { PLANS, type PlanId, isPlanId } from "@/lib/billing/plans";

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function getFromEmail() {
  return (
    process.env.EMAIL_FROM?.trim() || "EZSale <onboarding@resend.dev>"
  );
}

export type ReceiptEmailInput = {
  to: string[];
  tiendaNombre: string;
  plan: PlanId | null;
  montoArs: number | null;
  pagadoHasta: Date;
  paymentId: string;
  paidAt: Date;
};

export async function sendSubscriptionReceiptEmail(
  input: ReceiptEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  if (input.to.length === 0) {
    return { sent: false, error: "no_recipients" };
  }

  const resend = getResend();
  if (!resend) {
    console.warn("[billing] RESEND_API_KEY missing; skip receipt email");
    return { sent: false, error: "resend_not_configured" };
  }

  const planName =
    input.plan && isPlanId(input.plan) ? PLANS[input.plan].name : "Suscripción";
  const montoLabel =
    input.montoArs != null ? formatArs(input.montoArs) : "—";
  const hastaLabel = formatLongDate(input.pagadoHasta);
  const paidLabel = formatLongDate(input.paidAt);

  const subject = `Comprobante de pago — EZSale ${planName}`;
  const text = [
    `Hola,`,
    ``,
    `Registramos el pago de la suscripción de EZSale para la tienda "${input.tiendaNombre}".`,
    ``,
    `Plan: ${planName}`,
    `Monto: ${montoLabel}`,
    `Fecha de pago: ${paidLabel}`,
    `Cubierto hasta: ${hastaLabel}`,
    `ID de pago (Mercado Pago): ${input.paymentId}`,
    ``,
    `Este es un comprobante de pago de suscripción, no una factura fiscal.`,
    ``,
    `— Equipo EZSale`,
  ].join("\n");

  const html = `
    <p>Hola,</p>
    <p>Registramos el pago de la suscripción de <strong>EZSale</strong> para la tienda <strong>${escapeHtml(input.tiendaNombre)}</strong>.</p>
    <ul>
      <li><strong>Plan:</strong> ${escapeHtml(planName)}</li>
      <li><strong>Monto:</strong> ${escapeHtml(montoLabel)}</li>
      <li><strong>Fecha de pago:</strong> ${escapeHtml(paidLabel)}</li>
      <li><strong>Cubierto hasta:</strong> ${escapeHtml(hastaLabel)}</li>
      <li><strong>ID de pago (Mercado Pago):</strong> ${escapeHtml(input.paymentId)}</li>
    </ul>
    <p style="color:#666;font-size:14px">Este es un comprobante de pago de suscripción, no una factura fiscal.</p>
    <p>— Equipo EZSale</p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: getFromEmail(),
      to: input.to,
      subject,
      text,
      html,
    });
    if (error) {
      console.error("[billing] Resend error", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "send_failed";
    console.error("[billing] Resend throw", e);
    return { sent: false, error: msg };
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
