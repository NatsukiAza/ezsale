import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  getAccesoTienda,
  type AccesoTienda,
} from "@/lib/billing/access";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type PerfilBasico = {
  id_tienda: string;
  rol: "admin" | "normal" | string;
  nombre: string | null;
  apellido: string | null;
};

export type TiendaBillingRow = {
  nombre: string | null;
  created_at: string;
  cobro_exento: boolean;
  pagado_hasta: string | null;
  plan: string | null;
  estado_mp: string | null;
  mp_preapproval_id: string | null;
  nota_cobro: string | null;
};

/**
 * Dedup en un mismo request de React: layout + página pueden compartir
 * la misma sesión y perfil sin repetir round-trips a Supabase.
 */
export const getServerSession = cache(
  async (): Promise<{
    supabase: SupabaseClient | null;
    user: User | null;
  }> => {
    const supabase = await createClient();
    if (!supabase) {
      return { supabase: null, user: null };
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return { supabase, user };
  },
);

export const getPerfilTienda = cache(
  async (): Promise<{
    supabase: SupabaseClient | null;
    user: User | null;
    perfil: PerfilBasico | null;
    tiendaNombre: string | null;
    tienda: TiendaBillingRow | null;
    acceso: AccesoTienda | null;
  }> => {
    const { supabase, user } = await getServerSession();
    if (!supabase || !user) {
      return {
        supabase,
        user,
        perfil: null,
        tiendaNombre: null,
        tienda: null,
        acceso: null,
      };
    }
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id_tienda, rol, nombre, apellido, eliminado_en")
      .eq("id", user.id)
      .maybeSingle();
    if (!perfil?.id_tienda || perfil.eliminado_en) {
      return {
        supabase,
        user,
        perfil: null,
        tiendaNombre: null,
        tienda: null,
        acceso: null,
      };
    }

    const idTienda = perfil.id_tienda as string;
    const { data: tiendaRow } = await supabase
      .from("tiendas")
      .select(
        "nombre, created_at, cobro_exento, pagado_hasta, plan, estado_mp, mp_preapproval_id, nota_cobro",
      )
      .eq("id", idTienda)
      .maybeSingle();

    const tienda: TiendaBillingRow | null = tiendaRow
      ? {
          nombre: (tiendaRow.nombre as string | null) ?? null,
          created_at: tiendaRow.created_at as string,
          cobro_exento: Boolean(tiendaRow.cobro_exento),
          pagado_hasta: (tiendaRow.pagado_hasta as string | null) ?? null,
          plan: (tiendaRow.plan as string | null) ?? null,
          estado_mp: (tiendaRow.estado_mp as string | null) ?? null,
          mp_preapproval_id:
            (tiendaRow.mp_preapproval_id as string | null) ?? null,
          nota_cobro: (tiendaRow.nota_cobro as string | null) ?? null,
        }
      : null;

    const acceso = tienda
      ? getAccesoTienda({
          created_at: tienda.created_at,
          cobro_exento: tienda.cobro_exento,
          pagado_hasta: tienda.pagado_hasta,
          plan: tienda.plan,
        })
      : null;

    return {
      supabase,
      user,
      perfil: {
        id_tienda: idTienda,
        rol: perfil.rol as string,
        nombre: (perfil.nombre as string | null) ?? null,
        apellido: (perfil.apellido as string | null) ?? null,
      },
      tiendaNombre: tienda?.nombre ?? null,
      tienda,
      acceso,
    };
  },
);
