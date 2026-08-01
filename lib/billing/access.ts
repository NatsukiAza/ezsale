import {
  GRACE_DAYS,
  TRIAL_DAYS,
  type PlanId,
  parsePlanId,
} from "@/lib/billing/plans";

export type AccesoPhase = "ok" | "trial" | "atrasado" | "bloqueado";

export type TiendaBilling = {
  created_at: string | Date;
  cobro_exento: boolean;
  pagado_hasta: string | Date | null;
  plan?: string | null;
};

export type AccesoTienda = {
  allowed: boolean;
  phase: AccesoPhase;
  /** Días hasta bloqueo (atrasado/trial) o hasta vencimiento (ok). null si exento/ilimitado. */
  diasRestantes: number | null;
  /** Fecha hasta la cual el acceso está cubierto (trial o pagado), sin gracia. */
  cubiertoHasta: Date;
  /** Fecha límite absoluta (cubierto + gracia). */
  bloqueoEn: Date;
  plan: PlanId | null;
  cobroExento: boolean;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Días civiles restantes desde `now` hasta `until` (floor). Negativo si ya pasó. */
function daysUntil(until: Date, now: Date): number {
  const ms =
    startOfUtcDay(until).getTime() - startOfUtcDay(now).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Acceso a la app según cobro.
 * - cobro_exento → siempre ok
 * - sin pagado_hasta → trial = created_at + TRIAL_DAYS; al vencer → bloqueado (sin gracia)
 * - con pagado_hasta → ok hasta esa fecha; atrasado hasta +GRACE_DAYS; luego bloqueado
 */
export function getAccesoTienda(
  tienda: TiendaBilling,
  now: Date = new Date(),
): AccesoTienda {
  const plan = parsePlanId(tienda.plan ?? null);
  const cobroExento = tienda.cobro_exento === true;

  if (cobroExento) {
    const far = addDays(now, 36500);
    return {
      allowed: true,
      phase: "ok",
      diasRestantes: null,
      cubiertoHasta: far,
      bloqueoEn: far,
      plan,
      cobroExento: true,
    };
  }

  const createdAt = toDate(tienda.created_at);
  const pagadoHasta = tienda.pagado_hasta
    ? toDate(tienda.pagado_hasta)
    : null;

  const neverPaid = !pagadoHasta;
  const cubiertoHasta = neverPaid
    ? addDays(createdAt, TRIAL_DAYS)
    : pagadoHasta;
  // Trial sin gracia: al vencer trial = bloqueo. Con pago: +GRACE_DAYS de atraso.
  const bloqueoEn = neverPaid
    ? cubiertoHasta
    : addDays(cubiertoHasta, GRACE_DAYS);

  if (now.getTime() > bloqueoEn.getTime()) {
    return {
      allowed: false,
      phase: "bloqueado",
      diasRestantes: daysUntil(bloqueoEn, now),
      cubiertoHasta,
      bloqueoEn,
      plan,
      cobroExento: false,
    };
  }

  if (now.getTime() > cubiertoHasta.getTime()) {
    return {
      allowed: true,
      phase: "atrasado",
      diasRestantes: daysUntil(bloqueoEn, now),
      cubiertoHasta,
      bloqueoEn,
      plan,
      cobroExento: false,
    };
  }

  if (neverPaid) {
    return {
      allowed: true,
      phase: "trial",
      diasRestantes: daysUntil(cubiertoHasta, now),
      cubiertoHasta,
      bloqueoEn,
      plan,
      cobroExento: false,
    };
  }

  return {
    allowed: true,
    phase: "ok",
    diasRestantes: daysUntil(cubiertoHasta, now),
    cubiertoHasta,
    bloqueoEn,
    plan,
    cobroExento: false,
  };
}

/** Fecha mínima inclusive para reportes según años del plan. */
export function getReportesMinDate(
  reportesAnios: number,
  now: Date = new Date(),
): Date | null {
  if (!Number.isFinite(reportesAnios) || reportesAnios === Number.POSITIVE_INFINITY) {
    return null;
  }
  const d = new Date(now.getTime());
  d.setFullYear(d.getFullYear() - reportesAnios);
  return d;
}
