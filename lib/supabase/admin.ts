import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role: solo en rutas API del servidor.
 * Permite crear usuario + tienda + perfil en un solo flujo.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
