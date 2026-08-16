import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  getAccesoTienda,
  type AccesoTienda,
} from "@/lib/billing/access";
import { ACTIVE_STORE_COOKIE } from "@/lib/stores/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionUser = {
  id: string;
  email?: string;
};

export type RolPerfil = "admin" | "manager" | "normal" | string;

type PerfilBasico = {
  /** Organización (billing / catálogo). */
  id_organizacion: string;
  /** Tienda operativa activa (caja). */
  id_tienda: string;
  /** Asignación fija; null para admin. */
  id_tienda_asignada: string | null;
  rol: RolPerfil;
  nombre: string | null;
  apellido: string | null;
};

/** Billing vive en organizaciones; se mantiene el nombre de tipo por compat. */
export type TiendaBillingRow = {
  nombre: string | null;
  created_at: string;
  cobro_exento: boolean;
  pagado_hasta: string | null;
  plan: string | null;
  estado_mp: string | null;
  mp_preapproval_id: string | null;
  nota_cobro: string | null;
  exceso_tiendas_hasta: string | null;
};

/**
 * Dedup en un mismo request de React: layout + página pueden compartir
 * la misma sesión y perfil sin repetir round-trips a Supabase.
 */
export const getServerSession = cache(
  async (): Promise<{
    supabase: SupabaseClient | null;
    user: SessionUser | null;
  }> => {
    const supabase = await createClient();
    if (!supabase) {
      return { supabase: null, user: null };
    }
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const sub = claims?.sub;
    if (!sub) {
      return { supabase, user: null };
    }
    const email = claims.email;
    return {
      supabase,
      user: {
        id: sub,
        email: typeof email === "string" ? email : undefined,
      },
    };
  },
);

async function resolveTiendaActiva(params: {
  supabase: SupabaseClient;
  idOrganizacion: string;
  rol: string;
  idTiendaAsignada: string | null;
  cookieId: string | undefined;
}): Promise<{ id: string; nombre: string } | null> {
  const { supabase, idOrganizacion, rol, idTiendaAsignada, cookieId } = params;

  if (rol !== "admin") {
    if (!idTiendaAsignada) return null;
    const { data } = await supabase
      .from("tiendas")
      .select("id, nombre")
      .eq("id", idTiendaAsignada)
      .eq("id_organizacion", idOrganizacion)
      .is("eliminado_en", null)
      .maybeSingle();
    if (!data) return null;
    return { id: data.id as string, nombre: data.nombre as string };
  }

  // Admin: cookie si es válida; si no, null (debe ir al selector)
  if (cookieId) {
    const { data } = await supabase
      .from("tiendas")
      .select("id, nombre")
      .eq("id", cookieId)
      .eq("id_organizacion", idOrganizacion)
      .is("eliminado_en", null)
      .maybeSingle();
    if (data) {
      return { id: data.id as string, nombre: data.nombre as string };
    }
  }
  return null;
}

export const getPerfilTienda = cache(
  async (): Promise<{
    supabase: SupabaseClient | null;
    user: SessionUser | null;
    perfil: PerfilBasico | null;
    /** Nombre de la caja activa. */
    tiendaNombre: string | null;
    /** Nombre de la organización. */
    organizacionNombre: string | null;
    /** Billing de la organización (alias histórico `tienda`). */
    tienda: TiendaBillingRow | null;
    acceso: AccesoTienda | null;
    tieneTiendaActiva: boolean;
    /** Controla stock; no es un gate de navegación. */
    usaStock: boolean;
  }> => {
    const empty = {
      perfil: null as PerfilBasico | null,
      tiendaNombre: null as string | null,
      organizacionNombre: null as string | null,
      tienda: null as TiendaBillingRow | null,
      acceso: null as AccesoTienda | null,
      tieneTiendaActiva: false,
      usaStock: false,
    };

    const { supabase, user } = await getServerSession();
    if (!supabase || !user) {
      return { supabase, user, ...empty };
    }

    const { data: perfil } = await supabase
      .from("perfiles")
      .select(
        "id_organizacion, id_tienda, rol, nombre, apellido, eliminado_en",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!perfil?.id_organizacion || perfil.eliminado_en) {
      return { supabase, user, ...empty };
    }

    const idOrganizacion = perfil.id_organizacion as string;
    const idTiendaAsignada = (perfil.id_tienda as string | null) ?? null;
    const rol = perfil.rol as string;

    const cookieStore = await cookies();
    const cookieId = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;

    const [orgRes, activa] = await Promise.all([
      supabase
        .from("organizaciones")
        .select(
          "nombre, created_at, cobro_exento, pagado_hasta, plan, estado_mp, mp_preapproval_id, nota_cobro, exceso_tiendas_hasta, usa_stock",
        )
        .eq("id", idOrganizacion)
        .maybeSingle(),
      resolveTiendaActiva({
        supabase,
        idOrganizacion,
        rol,
        idTiendaAsignada,
        cookieId,
      }),
    ]);

    const orgRow = orgRes.data;
    const organizacion: TiendaBillingRow | null = orgRow
      ? {
          nombre: (orgRow.nombre as string | null) ?? null,
          created_at: orgRow.created_at as string,
          cobro_exento: Boolean(orgRow.cobro_exento),
          pagado_hasta: (orgRow.pagado_hasta as string | null) ?? null,
          plan: (orgRow.plan as string | null) ?? null,
          estado_mp: (orgRow.estado_mp as string | null) ?? null,
          mp_preapproval_id:
            (orgRow.mp_preapproval_id as string | null) ?? null,
          nota_cobro: (orgRow.nota_cobro as string | null) ?? null,
          exceso_tiendas_hasta:
            (orgRow.exceso_tiendas_hasta as string | null) ?? null,
        }
      : null;

    const acceso = organizacion
      ? getAccesoTienda({
          created_at: organizacion.created_at,
          cobro_exento: organizacion.cobro_exento,
          pagado_hasta: organizacion.pagado_hasta,
          plan: organizacion.plan,
        })
      : null;

    const usaStock = Boolean(orgRow?.usa_stock);

    if (!activa) {
      return {
        supabase,
        user,
        perfil: {
          id_organizacion: idOrganizacion,
          id_tienda: "",
          id_tienda_asignada: idTiendaAsignada,
          rol,
          nombre: (perfil.nombre as string | null) ?? null,
          apellido: (perfil.apellido as string | null) ?? null,
        },
        tiendaNombre: null,
        organizacionNombre: organizacion?.nombre ?? null,
        tienda: organizacion,
        acceso,
        tieneTiendaActiva: false,
        usaStock,
      };
    }

    return {
      supabase,
      user,
      perfil: {
        id_organizacion: idOrganizacion,
        id_tienda: activa.id,
        id_tienda_asignada: idTiendaAsignada,
        rol,
        nombre: (perfil.nombre as string | null) ?? null,
        apellido: (perfil.apellido as string | null) ?? null,
      },
      tiendaNombre: activa.nombre,
      organizacionNombre: organizacion?.nombre ?? null,
      tienda: organizacion,
      acceso,
      tieneTiendaActiva: true,
      usaStock,
    };
  },
);
