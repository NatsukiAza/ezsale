import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getPerfilTienda } from "@/lib/supabase/cached-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, perfil, tiendaNombre } = await getPerfilTienda();

  if (!user) {
    redirect("/");
  }
  if (!perfil?.id_tienda) {
    redirect("/registro/completar");
  }

  const displayName =
    `${perfil.nombre ?? ""} ${perfil.apellido ?? ""}`.trim() ||
    user.email?.split("@")[0] ||
    "Usuario";

  return (
    <AppShell
      user={{
        displayName,
        email: user.email,
        isAdmin: perfil.rol === "admin",
        tiendaNombre,
      }}
    >
      {children}
    </AppShell>
  );
}
