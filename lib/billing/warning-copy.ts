export function formatDias(n: number): string {
  return `${n} día${n === 1 ? "" : "s"}`;
}

/** Texto de la gracia (trial vencido o cobro fallido). */
export function atrasadoWarningText(opts: {
  neverPaid: boolean;
  diasRestantes: number | null;
}): { lead: string; plazo: string; cta: string } {
  const days =
    opts.diasRestantes != null && opts.diasRestantes >= 0
      ? opts.diasRestantes
      : null;
  const lead = opts.neverPaid
    ? "Tu período de prueba terminó."
    : "No pudimos cobrar tu suscripción.";
  const cta = opts.neverPaid ? "Elegir plan" : "Ir a Cuenta";

  if (days == null) {
    return {
      lead,
      plazo: opts.neverPaid
        ? "Suscribite para no perder el acceso."
        : "Regularizá el pago para no perder el acceso.",
      cta,
    };
  }
  if (days === 0) {
    return {
      lead,
      plazo: opts.neverPaid
        ? "Hoy es el último día para suscribirte antes de que se bloquee el acceso."
        : "Hoy es el último día para regularizar el pago antes de que se bloquee el acceso.",
      cta,
    };
  }
  const accion = opts.neverPaid ? "suscribirte" : "regularizar el pago";
  return {
    lead,
    plazo: `Tenés ${formatDias(days)} para ${accion} antes de que se bloquee el acceso.`,
    cta,
  };
}
