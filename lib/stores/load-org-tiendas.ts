import {
  PURGA_TIENDA_SOFT_DELETE_DIAS,
  getPlan,
  parsePlanId,
} from "@/lib/billing/plans";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enforceExcesoTiendas,
  purgeTiendasVencidas,
  type TiendaRow,
} from "@/lib/stores/exceso-tiendas";

export type OrgTiendaListItem = {
  id: string;
  nombre: string;
  created_at: string;
  eliminado_en: string | null;
};

export type OrgTiendasPayload = {
  organizacion: {
    nombre: string;
    plan: string | null;
    planNombre: string;
    exceso_tiendas_hasta: string | null;
    maxTiendas: number;
    tiendasActivas: number;
  };
  tiendas: OrgTiendaListItem[];
  tiendasEliminadas: OrgTiendaListItem[];
  rol: string;
};

type KnownOrg = {
  nombre: string | null;
  plan: string | null;
  exceso_tiendas_hasta: string | null;
};

/**
 * Una lectura de organización + tiendas. El mantenimiento (exceso de plan y
 * purga a los 60 días) solo pega de nuevo a la base si hay algo que hacer.
 */
export async function loadOrgTiendas(params: {
  admin: SupabaseClient;
  idOrganizacion: string;
  rol: string;
  idTiendaAsignada: string | null;
  /** Si la página ya cargó la org, evita repetir ese round-trip. */
  knownOrg?: KnownOrg | null;
}): Promise<
  { ok: true; data: OrgTiendasPayload } | { ok: false; error: string; status: number }
> {
  if (params.rol !== "admin" && !params.idTiendaAsignada) {
    return { ok: false, error: "Sin tienda asignada.", status: 400 };
  }

  const tiendasQuery = params.admin
    .from("tiendas")
    .select("id, nombre, created_at, eliminado_en")
    .eq("id_organizacion", params.idOrganizacion)
    .order("created_at", { ascending: true });

  const orgQuery = params.knownOrg
    ? Promise.resolve({ data: params.knownOrg, error: null })
    : params.admin
        .from("organizaciones")
        .select("nombre, plan, exceso_tiendas_hasta")
        .eq("id", params.idOrganizacion)
        .maybeSingle();

  const [orgRes, tiendasRes] = await Promise.all([orgQuery, tiendasQuery]);

  if (orgRes.error) {
    return { ok: false, error: orgRes.error.message, status: 400 };
  }
  if (!orgRes.data) {
    return { ok: false, error: "Organización no encontrada.", status: 404 };
  }
  if (tiendasRes.error) {
    return { ok: false, error: tiendasRes.error.message, status: 400 };
  }

  let orgNombre = (orgRes.data.nombre as string | null) ?? "";
  let planRaw = (orgRes.data.plan as string | null) ?? null;
  let excesoHasta = (orgRes.data.exceso_tiendas_hasta as string | null) ?? null;
  let rows = (tiendasRes.data ?? []) as TiendaRow[];

  const plan = getPlan(parsePlanId(planRaw));
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - PURGA_TIENDA_SOFT_DELETE_DIAS);

  const activasCount = rows.filter((t) => !t.eliminado_en).length;
  const overLimit = activasCount > plan.maxTiendas;
  const deadline = excesoHasta ? new Date(excesoHasta) : null;
  const deadlinePassed =
    deadline != null && !Number.isNaN(deadline.getTime()) && deadline <= now;
  const shouldMaintain = (overLimit && deadlinePassed) || (!overLimit && excesoHasta != null);
  const shouldPurge = rows.some(
    (t) => t.eliminado_en != null && new Date(t.eliminado_en) <= cutoff,
  );

  if (shouldMaintain || shouldPurge) {
    await Promise.all([
      shouldMaintain
        ? enforceExcesoTiendas({
            admin: params.admin,
            idOrganizacion: params.idOrganizacion,
            plan: parsePlanId(planRaw) ?? undefined,
            excesoHasta,
            now,
          })
        : Promise.resolve(null),
      shouldPurge
        ? purgeTiendasVencidas({
            admin: params.admin,
            idOrganizacion: params.idOrganizacion,
            now,
          })
        : Promise.resolve(null),
    ]);

    const [orgFresh, tiendasFresh] = await Promise.all([
      params.admin
        .from("organizaciones")
        .select("nombre, plan, exceso_tiendas_hasta")
        .eq("id", params.idOrganizacion)
        .maybeSingle(),
      params.admin
        .from("tiendas")
        .select("id, nombre, created_at, eliminado_en")
        .eq("id_organizacion", params.idOrganizacion)
        .order("created_at", { ascending: true }),
    ]);

    if (tiendasFresh.error) {
      return { ok: false, error: tiendasFresh.error.message, status: 400 };
    }
    if (orgFresh.data) {
      orgNombre = (orgFresh.data.nombre as string | null) ?? orgNombre;
      planRaw = (orgFresh.data.plan as string | null) ?? planRaw;
      excesoHasta =
        (orgFresh.data.exceso_tiendas_hasta as string | null) ?? null;
    }
    rows = (tiendasFresh.data ?? []) as TiendaRow[];
  }

  const planFinal = getPlan(parsePlanId(planRaw));
  let activas = rows.filter((t) => !t.eliminado_en);
  let eliminadas =
    params.rol === "admin" ? rows.filter((t) => t.eliminado_en) : [];

  if (params.rol !== "admin") {
    activas = activas.filter((t) => t.id === params.idTiendaAsignada);
    eliminadas = [];
  }

  return {
    ok: true,
    data: {
      organizacion: {
        nombre: orgNombre,
        plan: planRaw,
        planNombre: planFinal.name,
        exceso_tiendas_hasta: excesoHasta,
        maxTiendas: planFinal.maxTiendas,
        tiendasActivas: activas.length,
      },
      tiendas: activas,
      tiendasEliminadas: eliminadas,
      rol: params.rol,
    },
  };
}
