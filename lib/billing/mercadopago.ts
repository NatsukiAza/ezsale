import { MercadoPagoConfig, PreApproval, Invoice } from "mercadopago";
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

export function getMercadoPagoAccessToken(): string | null {
  return process.env.MP_ACCESS_TOKEN?.trim() || null;
}

export function getMercadoPagoWebhookSecret(): string | null {
  return process.env.MP_WEBHOOK_SECRET?.trim() || null;
}

export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}

/**
 * Mercado Pago suele rechazar localhost en back_url.
 * En local devolvemos una URL https válida; el webhook es la fuente de verdad del acceso.
 */
export function getMercadoPagoBackUrl(): string {
  const app = getAppUrl();
  if (/localhost|127\.0\.0\.1/i.test(app)) {
    return "https://www.mercadopago.com.ar";
  }
  return `${app}/cuenta?mp=return`;
}

export function extractMercadoPagoError(e: unknown): string {
  if (!e || typeof e !== "object") {
    return e instanceof Error ? e.message : "Error al crear suscripción";
  }
  const err = e as {
    message?: string;
    cause?: unknown;
    status?: number;
  };
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "Error al crear suscripción";
  }
}

export function createMercadoPagoClient() {
  const accessToken = getMercadoPagoAccessToken();
  if (!accessToken) return null;
  return new MercadoPagoConfig({ accessToken });
}

export function createPreApprovalClient() {
  const config = createMercadoPagoClient();
  if (!config) return null;
  return new PreApproval(config);
}

export function createInvoiceClient() {
  const config = createMercadoPagoClient();
  if (!config) return null;
  return new Invoice(config);
}

export function verifyMercadoPagoWebhook(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): { ok: true } | { ok: false; reason: string } {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) {
    // Sin secret en dev: permitir (log). En prod conviene configurarlo.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "MP_WEBHOOK_SECRET missing" };
    }
    return { ok: true };
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: opts.xSignature,
      xRequestId: opts.xRequestId,
      dataId: opts.dataId,
      secret,
      toleranceSeconds: 600,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof InvalidWebhookSignatureError) {
      return { ok: false, reason: e.reason };
    }
    return { ok: false, reason: "signature_error" };
  }
}
