"use server";

import { revalidatePath } from "next/cache";

/** Invalida Panel y Caja tras mutar gastos (evita RSC/router cache stale). */
export async function revalidateCaja() {
  revalidatePath("/caja");
  revalidatePath("/dashboard");
}
