import {
  EXCESO_TIENDAS_DIAS,
  PURGA_TIENDA_SOFT_DELETE_DIAS,
  getPlan,
  type PlanId,
} from "@/lib/billing/plans";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TiendaRow = {
  id: string;
  nombre: string;
  created_at: string;
  eliminado_en: string | null;
};

/**
 * Si el plan nuevo deja la org sobre maxTiendas, setea (o conserva) el deadline.
 * Si ya está dentro del cupo, limpia exceso_tiendas_hasta.
 */
export function computeExcesoTiendasHasta(params: {
  plan: PlanId | null | undefined;
  tiendasActivas: number;
  excesoActual: string | null | undefined;
  now?: Date;
}): string | null {
  const max = getPlan(params.plan).maxTiendas;
  const now = params.now ?? new Date();
  if (params.tiendasActivas <= max) return null;
  if (params.excesoActual) return params.excesoActual;
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + EXCESO_TIENDAS_DIAS);
  return until.toISOString();
}

/**
 * Soft-delete lazy de tiendas más nuevas + perfiles de esas tiendas.
 * Idempotente. Usa service-role client.
 */
export async function enforceExcesoTiendas(params: {
  admin: SupabaseClient;
  idOrganizacion: string;
  plan: PlanId | null | undefined;
  excesoHasta: string | null | undefined;
  now?: Date;
}): Promise<{ pruned: string[] }> {
  const now = params.now ?? new Date();
  const max = getPlan(params.plan).maxTiendas;

  const { data: activas, error } = await params.admin
    .from("tiendas")
    .select("id, nombre, created_at, eliminado_en")
    .eq("id_organizacion", params.idOrganizacion)
    .is("eliminado_en", null)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const list = (activas ?? []) as TiendaRow[];

  if (list.length <= max) {
    if (params.excesoHasta) {
      await params.admin
        .from("organizaciones")
        .update({ exceso_tiendas_hasta: null })
        .eq("id", params.idOrganizacion);
    }
    return { pruned: [] };
  }

  const deadline = params.excesoHasta
    ? new Date(params.excesoHasta)
    : null;
  if (!deadline || Number.isNaN(deadline.getTime()) || deadline > now) {
    return { pruned: [] };
  }

  const toKeep = list.slice(0, max);
  const toPrune = list.slice(max); // más nuevas (lista ordenada por created_at ASC)
  const pruneIds = toPrune.map((t) => t.id);
  void toKeep;

  const stamp = now.toISOString();
  await softDeleteTiendasYUsuarios({
    admin: params.admin,
    idOrganizacion: params.idOrganizacion,
    tiendaIds: pruneIds,
    stamp,
  });

  await params.admin
    .from("organizaciones")
    .update({ exceso_tiendas_hasta: null })
    .eq("id", params.idOrganizacion);

  return { pruned: pruneIds };
}

export async function softDeleteTiendasYUsuarios(params: {
  admin: SupabaseClient;
  idOrganizacion: string;
  tiendaIds: string[];
  stamp?: string;
}): Promise<{ userIds: string[] }> {
  if (params.tiendaIds.length === 0) return { userIds: [] };
  const stamp = params.stamp ?? new Date().toISOString();

  const { error: tErr } = await params.admin
    .from("tiendas")
    .update({ eliminado_en: stamp })
    .eq("id_organizacion", params.idOrganizacion)
    .in("id", params.tiendaIds)
    .is("eliminado_en", null);
  if (tErr) throw tErr;

  const { data: perfiles, error: pErr } = await params.admin
    .from("perfiles")
    .select("id, rol")
    .eq("id_organizacion", params.idOrganizacion)
    .in("id_tienda", params.tiendaIds)
    .is("eliminado_en", null);
  if (pErr) throw pErr;

  const userIds = (perfiles ?? [])
    .filter((p) => p.rol !== "admin")
    .map((p) => p.id as string);

  if (userIds.length > 0) {
    const { error: uErr } = await params.admin
      .from("perfiles")
      .update({ eliminado_en: stamp })
      .in("id", userIds)
      .is("eliminado_en", null);
    if (uErr) throw uErr;

    // Ban auth users in parallel batches
    await Promise.all(
      userIds.map(async (id) => {
        try {
          await params.admin.auth.admin.updateUserById(id, {
            ban_duration: "876000h",
          });
        } catch {
          /* best-effort */
        }
      }),
    );
  }

  // Clear exceso if now within limit
  const { count } = await params.admin
    .from("tiendas")
    .select("id", { count: "exact", head: true })
    .eq("id_organizacion", params.idOrganizacion)
    .is("eliminado_en", null);

  // Caller may clear exceso; we clear if under any reasonable plan later

  return { userIds };
}

export async function restoreTiendaYUsuarios(params: {
  admin: SupabaseClient;
  idOrganizacion: string;
  idTienda: string;
  maxUsuarios: number;
}): Promise<{ restoredUsers: number; skippedUsers: number }> {
  const { error: tErr } = await params.admin
    .from("tiendas")
    .update({ eliminado_en: null })
    .eq("id", params.idTienda)
    .eq("id_organizacion", params.idOrganizacion)
    .not("eliminado_en", "is", null);
  if (tErr) throw tErr;

  const { count: activos } = await params.admin
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("id_organizacion", params.idOrganizacion)
    .is("eliminado_en", null);

  const cupo = Math.max(0, params.maxUsuarios - (activos ?? 0));

  const { data: candidatos, error: cErr } = await params.admin
    .from("perfiles")
    .select("id")
    .eq("id_organizacion", params.idOrganizacion)
    .eq("id_tienda", params.idTienda)
    .not("eliminado_en", "is", null)
    .neq("rol", "admin")
    .order("created_at", { ascending: true });
  if (cErr) throw cErr;

  const all = candidatos ?? [];
  const toRestore = all.slice(0, cupo).map((p) => p.id as string);
  const skipped = all.length - toRestore.length;

  if (toRestore.length > 0) {
    const { error: uErr } = await params.admin
      .from("perfiles")
      .update({ eliminado_en: null })
      .in("id", toRestore);
    if (uErr) throw uErr;

    await Promise.all(
      toRestore.map(async (id) => {
        try {
          await params.admin.auth.admin.updateUserById(id, {
            ban_duration: "none",
          });
        } catch {
          /* best-effort */
        }
      }),
    );
  }

  return { restoredUsers: toRestore.length, skippedUsers: skipped };
}

/**
 * Borra definitivamente una tienda ya soft-deleted: ventas, detalle, usuarios y la fila.
 * No toca admins de org (id_tienda null).
 */
export async function purgeTiendaPermanente(params: {
  admin: SupabaseClient;
  idOrganizacion: string;
  idTienda: string;
}): Promise<void> {
  const { admin, idOrganizacion, idTienda } = params;

  const { data: tienda, error: tErr } = await admin
    .from("tiendas")
    .select("id, eliminado_en")
    .eq("id", idTienda)
    .eq("id_organizacion", idOrganizacion)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!tienda) throw new Error("Tienda no encontrada.");
  if (!tienda.eliminado_en) {
    throw new Error("Solo se pueden borrar definitivamente tiendas desactivadas.");
  }

  const { data: ventas, error: vErr } = await admin
    .from("ventas")
    .select("id")
    .eq("id_tienda", idTienda);
  if (vErr) throw vErr;

  const ventaIds = (ventas ?? []).map((v) => v.id as string);
  if (ventaIds.length > 0) {
    // Borrar en lotes por si hay muchas
    const chunk = 200;
    for (let i = 0; i < ventaIds.length; i += chunk) {
      const slice = ventaIds.slice(i, i + chunk);
      const { error: dErr } = await admin
        .from("detalle_ventas")
        .delete()
        .in("id_venta", slice);
      if (dErr) throw dErr;
    }
    const { error: delV } = await admin
      .from("ventas")
      .delete()
      .eq("id_tienda", idTienda);
    if (delV) throw delV;
  }

  const { data: perfiles, error: pErr } = await admin
    .from("perfiles")
    .select("id, rol")
    .eq("id_organizacion", idOrganizacion)
    .eq("id_tienda", idTienda);
  if (pErr) throw pErr;

  const userIds = (perfiles ?? [])
    .filter((p) => p.rol !== "admin")
    .map((p) => p.id as string);

  for (const userId of userIds) {
    // Por si quedaron ventas del usuario en otra tienda (p.ej. tras un traslado)
    const { data: otras } = await admin
      .from("ventas")
      .select("id")
      .eq("id_usuario", userId);
    const otrasIds = (otras ?? []).map((v) => v.id as string);
    if (otrasIds.length > 0) {
      const chunk = 200;
      for (let i = 0; i < otrasIds.length; i += chunk) {
        const slice = otrasIds.slice(i, i + chunk);
        await admin.from("detalle_ventas").delete().in("id_venta", slice);
      }
      await admin.from("ventas").delete().eq("id_usuario", userId);
    }

    const { error: delPerfil } = await admin
      .from("perfiles")
      .delete()
      .eq("id", userId);
    if (delPerfil) throw delPerfil;

    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      /* perfil ya borrado; auth best-effort */
    }
  }

  const { error: delT } = await admin
    .from("tiendas")
    .delete()
    .eq("id", idTienda)
    .eq("id_organizacion", idOrganizacion);
  if (delT) throw delT;
}

/**
 * Limpieza lazy: tiendas soft-deleted hace ≥ PURGA_TIENDA_SOFT_DELETE_DIAS.
 * Scope por organización (al cargar el selector).
 */
export async function purgeTiendasVencidas(params: {
  admin: SupabaseClient;
  idOrganizacion: string;
  now?: Date;
}): Promise<{ purged: string[] }> {
  const now = params.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - PURGA_TIENDA_SOFT_DELETE_DIAS);

  const { data: vencidas, error } = await params.admin
    .from("tiendas")
    .select("id")
    .eq("id_organizacion", params.idOrganizacion)
    .not("eliminado_en", "is", null)
    .lte("eliminado_en", cutoff.toISOString());
  if (error) throw error;

  const purged: string[] = [];
  for (const row of vencidas ?? []) {
    const id = row.id as string;
    await purgeTiendaPermanente({
      admin: params.admin,
      idOrganizacion: params.idOrganizacion,
      idTienda: id,
    });
    purged.push(id);
  }
  return { purged };
}
