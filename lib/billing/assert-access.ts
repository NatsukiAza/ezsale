import { getAccesoTienda, type TiendaBilling } from "@/lib/billing/access";
import { NextResponse } from "next/server";

/** Respuesta 402 si la tienda no tiene acceso por cobro. */
export function assertBillingAllowed(tienda: TiendaBilling) {
  const acceso = getAccesoTienda(tienda);
  if (acceso.allowed) return null;
  return NextResponse.json(
    {
      ok: false,
      error:
        "La suscripción está vencida. Regularizá el pago para seguir usando EZSale.",
      code: "billing_blocked",
    },
    { status: 402 },
  );
}
