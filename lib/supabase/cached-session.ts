import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type PerfilBasico = {
  id_tienda: string;
  rol: "admin" | "normal" | string;
};

/**
 * Dedup en un mismo request de React: layout (footer) + página pueden compartir
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
  }> => {
    const { supabase, user } = await getServerSession();
    if (!supabase || !user) {
      return { supabase, user, perfil: null };
    }
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id_tienda, rol")
      .eq("id", user.id)
      .maybeSingle();
    if (!perfil?.id_tienda) {
      return { supabase, user, perfil: null };
    }
    return {
      supabase,
      user,
      perfil: {
        id_tienda: perfil.id_tienda as string,
        rol: perfil.rol as string,
      },
    };
  },
);
