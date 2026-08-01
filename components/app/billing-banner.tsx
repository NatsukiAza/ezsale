"use client";

import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";
import type { AccesoPhase } from "@/lib/billing/access";

type BillingBannerProps = {
  phase: AccesoPhase;
  diasRestantes: number | null;
};

export function BillingBanner({ phase, diasRestantes }: BillingBannerProps) {
  if (phase !== "atrasado" && phase !== "trial") return null;

  const days =
    diasRestantes != null && diasRestantes >= 0 ? diasRestantes : null;

  if (phase === "atrasado") {
    return (
      <div
        role="status"
        className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-950 dark:text-amber-100"
      >
        <div className="mx-auto flex max-w-[75rem] flex-wrap items-center justify-between gap-2">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              No pudimos cobrar tu suscripción.
              {days != null
                ? ` Tenés ${days} día${days === 1 ? "" : "s"} para regularizar el pago antes de que se bloquee el acceso.`
                : " Regularizá el pago para no perder el acceso."}
            </span>
          </p>
          <Link
            href="/cuenta"
            className="shrink-0 font-medium underline underline-offset-2"
          >
            Ir a Cuenta
          </Link>
        </div>
      </div>
    );
  }

  // trial
  if (days != null && days > 7) return null;

  return (
    <div
      role="status"
      className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm text-sky-950 dark:text-sky-100"
    >
      <div className="mx-auto flex max-w-[75rem] flex-wrap items-center justify-between gap-2">
        <p className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {days == null
              ? "Estás en el período de prueba."
              : days === 0
                ? "Tu período de prueba termina hoy."
                : `Tu período de prueba termina en ${days} día${days === 1 ? "" : "s"}.`}{" "}
            Suscribite para no perder el acceso.
          </span>
        </p>
        <Link
          href="/cuenta"
          className="shrink-0 font-medium underline underline-offset-2"
        >
          Elegir plan
        </Link>
      </div>
    </div>
  );
}
