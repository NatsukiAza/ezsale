import { CuentaCheckout } from "./_components/cuenta-checkout";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { formatLongDate } from "@/lib/format";
import { PLANS, parsePlanId } from "@/lib/billing/plans";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ mp?: string }>;
}) {
  const { user, perfil, tienda, acceso, tiendaNombre } = await getPerfilTienda();
  if (!user) redirect("/login");
  if (!perfil?.id_organizacion || !tienda || !acceso)
    redirect("/registro/completar");

  const sp = await searchParams;
  const returnedFromMp = sp.mp === "return";
  const planId = parsePlanId(tienda.plan);
  const planName = planId ? PLANS[planId].name : "Sin plan elegido";
  const isAdmin = perfil.rol === "admin";

  const phaseLabel: Record<string, string> = {
    ok: "Al día",
    trial: "Período de prueba",
    atrasado: "Pago pendiente",
    bloqueado: "Acceso bloqueado",
  };

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-h1">Cuenta y suscripción</h1>
        <p className="mt-2 text-body text-muted-foreground">
          {tiendaNombre ?? "Tu tienda"} · gestioná el plan de EZSale
        </p>
      </div>

      {acceso.phase === "bloqueado" ? (
        <Alert variant="destructive">
          <AlertDescription>
            No recibimos el pago de tu suscripción. El acceso está bloqueado
            hasta que regularices el cobro.
          </AlertDescription>
        </Alert>
      ) : null}

      {returnedFromMp ? (
        <Alert>
          <AlertDescription>
            Si acabás de pagar, el acceso se actualiza cuando Mercado Pago
            confirma el cobro (puede tardar unos minutos). Si no se habilita,
            recargá esta página.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight">Estado</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{planName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Estado</dt>
            <dd className="font-medium">
              {tienda.cobro_exento
                ? "Cortesía (sin cobro)"
                : phaseLabel[acceso.phase] ?? acceso.phase}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cubierto hasta</dt>
            <dd className="font-medium">
              {tienda.cobro_exento
                ? "—"
                : formatLongDate(acceso.cubiertoHasta)}
            </dd>
          </div>
          {acceso.phase === "atrasado" || acceso.phase === "bloqueado" ? (
            <div>
              <dt className="text-muted-foreground">Bloqueo</dt>
              <dd className="font-medium">
                {formatLongDate(acceso.bloqueoEn)}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight">
          {acceso.phase === "bloqueado" || acceso.phase === "atrasado"
            ? "Reactivar suscripción"
            : "Suscribirse o cambiar plan"}
        </h2>
        <CuentaCheckout
          currentPlan={planId}
          isAdmin={isAdmin}
          cobroExento={tienda.cobro_exento}
          introEligible={tienda.pagado_hasta == null}
        />
      </section>
    </div>
  );
}
