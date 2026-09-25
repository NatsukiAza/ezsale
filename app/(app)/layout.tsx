import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { BillingBanner } from "@/components/app/billing-banner";
import { BillingLockedShell } from "@/components/app/billing-locked-shell";
import { getPerfilTienda } from "@/lib/supabase/cached-session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    perfil,
    tiendaNombre,
    organizacionNombre,
    acceso,
    tieneTiendaActiva,
  } = await getPerfilTienda();

  if (!user) {
    redirect("/login");
  }
  if (!perfil?.id_organizacion) {
    redirect("/registro/completar");
  }

  const billingBlocked = Boolean(acceso && !acceso.allowed);

  // /cuenta es el paywall: no puede exigir tienda activa. Si no, admin sin
  // cookie entra en loop cuenta → seleccionar-tienda → (middleware) cuenta.
  if (!billingBlocked && (!tieneTiendaActiva || !perfil.id_tienda)) {
    redirect("/seleccionar-tienda");
  }

  if (billingBlocked) {
    return (
      <BillingLockedShell orgName={organizacionNombre ?? tiendaNombre}>
        {children}
      </BillingLockedShell>
    );
  }

  const displayName =
    `${perfil.nombre ?? ""} ${perfil.apellido ?? ""}`.trim() ||
    user.email?.split("@")[0] ||
    "Usuario";

  const canManageTeam = perfil.rol === "admin" || perfil.rol === "manager";

  return (
    <AppShell
      user={{
        displayName,
        email: user.email,
        isAdmin: perfil.rol === "admin",
        canManageTeam,
        tiendaNombre,
      }}
      banner={
        acceso ? (
          <BillingBanner
            phase={acceso.phase}
            diasRestantes={acceso.diasRestantes}
            neverPaid={acceso.neverPaid}
          />
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
