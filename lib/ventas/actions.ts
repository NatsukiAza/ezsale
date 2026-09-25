"use server";

import { revalidatePath } from "next/cache";

/** Invalida Panel y Caja tras registrar una venta (evita RSC/router cache stale). */
export async function revalidateVentas() {
  revalidatePath("/dashboard");
  revalidatePath("/caja");
  revalidatePath("/reports");
}
