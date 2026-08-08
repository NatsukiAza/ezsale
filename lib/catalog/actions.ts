"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateCatalog(orgId: string) {
  if (!orgId) return;
  revalidateTag(`catalog-${orgId}`, { expire: 0 });
  revalidatePath("/new-sale");
  revalidatePath("/products");
}
