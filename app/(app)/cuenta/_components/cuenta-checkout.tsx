"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CHECKOUT_PLANS,
  PLANS,
  type PlanId,
  formatIntroPlanPrice,
  formatPlanPrice,
  introDiscountNote,
} from "@/lib/billing/plans";
import { clearGateCookieClient } from "@/lib/supabase/gate-cookie";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type CuentaCheckoutProps = {
  currentPlan: PlanId | null;
  isAdmin: boolean;
  cobroExento: boolean;
  introEligible: boolean;
};

export function CuentaCheckout({
  currentPlan,
  isAdmin,
  cobroExento,
  introEligible,
}: CuentaCheckoutProps) {
  const [selected, setSelected] = useState<PlanId>(
    currentPlan && CHECKOUT_PLANS.includes(currentPlan)
      ? currentPlan
      : "local",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cobroExento) {
    return (
      <Alert>
        <AlertDescription>
          Esta tienda está marcada como cortesía: no requiere pago.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isAdmin) {
    return (
      <Alert>
        <AlertDescription>
          Pedile al administrador de la tienda que reactive o elija el plan de
          suscripción.
        </AlertDescription>
      </Alert>
    );
  }

  async function startCheckout() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        init_point?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.init_point) {
        setError(json.error ?? "No se pudo iniciar el pago.");
        setLoading(false);
        return;
      }
      clearGateCookieClient();
      window.location.href = json.init_point;
    } catch {
      setError("Error de red al iniciar el pago.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {CHECKOUT_PLANS.map((id) => {
          const plan = PLANS[id];
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="font-medium">{plan.name}</div>
              {introEligible && plan.precioArs != null ? (
                <div className="mt-1 space-y-0.5">
                  <div className="text-sm">
                    <span className="text-muted-foreground line-through">
                      {formatPlanPrice(id)}
                    </span>{" "}
                    <span className="font-medium">
                      {formatIntroPlanPrice(id)}
                    </span>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {introDiscountNote(plan.precioArs)}
                  </p>
                </div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatPlanPrice(id)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-body-sm text-muted-foreground">
        Empresa es a medida:{" "}
        <a
          href="mailto:hola@ezsale.app"
          className="font-medium text-primary hover:underline"
        >
          hola@ezsale.app
        </a>
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="button" onClick={startCheckout} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Redirigiendo…" : "Pagar con Mercado Pago"}
      </Button>
    </div>
  );
}
