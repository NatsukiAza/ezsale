import { redirect } from "next/navigation";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan, parsePlanId } from "@/lib/billing/plans";
import { getReportesMinDate } from "@/lib/billing/access";
import { loadOrgTiendas } from "@/lib/stores/load-org-tiendas";
import { StorePicker } from "./_components/store-picker";

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SeleccionarTiendaPage() {
  const { user, perfil, acceso, tienda } = await getPerfilTienda();

  if (!user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");
  if (acceso && !acceso.allowed) redirect("/cuenta");

  const plan = getPlan(parsePlanId(tienda?.plan));
  const minDate = getReportesMinDate(plan.reportesAnios);
  const reportesMinYmd = minDate ? toYmd(minDate) : null;

  const admin = createAdminClient();
  const loaded = admin
    ? await loadOrgTiendas({
        admin,
        idOrganizacion: perfil.id_organizacion,
        rol: perfil.rol,
        idTiendaAsignada: perfil.id_tienda_asignada,
        knownOrg: tienda
          ? {
              nombre: tienda.nombre,
              plan: tienda.plan,
              exceso_tiendas_hasta: tienda.exceso_tiendas_hasta,
            }
          : null,
      })
    : null;

  return (
    <StorePicker
      isAdmin={perfil.rol === "admin"}
      organizacionNombre={tienda?.nombre ?? "Tu negocio"}
      idOrganizacion={perfil.id_organizacion}
      reportesMinYmd={reportesMinYmd}
      initialList={loaded?.ok ? loaded.data : null}
      billing={
        acceso?.phase === "atrasado"
          ? {
              diasRestantes: acceso.diasRestantes,
              neverPaid: acceso.neverPaid,
            }
          : null
      }
    />
  );
}
