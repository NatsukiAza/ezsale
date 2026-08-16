import { formatArs } from "@/lib/format";

export type PlanId = "local" | "sucursales" | "cadena" | "empresa";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  maxUsuarios: number;
  maxTiendas: number;
  reportesAnios: number;
  /** null = a medida / sin checkout MP */
  precioArs: number | null;
  mpPlanIdEnv: string | null;
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  local: {
    id: "local",
    name: "Local",
    maxUsuarios: 5,
    maxTiendas: 1,
    reportesAnios: 2,
    precioArs: 50_000,
    mpPlanIdEnv: "MP_PLAN_LOCAL",
  },
  sucursales: {
    id: "sucursales",
    name: "Sucursales",
    maxUsuarios: 30,
    maxTiendas: 5,
    reportesAnios: 4,
    precioArs: 100_000,
    mpPlanIdEnv: "MP_PLAN_SUCURSALES",
  },
  cadena: {
    id: "cadena",
    name: "Cadena",
    maxUsuarios: 60,
    maxTiendas: 10,
    reportesAnios: 5,
    precioArs: 199_999,
    mpPlanIdEnv: "MP_PLAN_CADENA",
  },
  empresa: {
    id: "empresa",
    name: "Empresa",
    maxUsuarios: Number.POSITIVE_INFINITY,
    maxTiendas: Number.POSITIVE_INFINITY,
    reportesAnios: Number.POSITIVE_INFINITY,
    precioArs: null,
    mpPlanIdEnv: null,
  },
};

/**
 * Plan efectivo para límites cuando `plan` es null (cortesía / caridad).
 * Usa Cadena: hasta 10 tiendas y 60 usuarios.
 */
export const DEFAULT_PLAN_FOR_LIMITS: PlanId = "cadena";

export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 15;

/** Primera suscripción: factor sobre el precio de lista. */
export const INTRO_DISCOUNT_FACTOR = 0.5;
/** Ciclos mensuales al precio introductorio. */
export const INTRO_DISCOUNT_MONTHS = 3;

/** Días para eliminar tiendas extra tras bajar de plan. */
export const EXCESO_TIENDAS_DIAS = 15;

/** Tras soft-delete, purga definitiva de tienda (ventas + usuarios) a los N días. */
export const PURGA_TIENDA_SOFT_DELETE_DIAS = 60;

export function isPlanId(value: unknown): value is PlanId {
  return (
    value === "local" ||
    value === "sucursales" ||
    value === "cadena" ||
    value === "empresa"
  );
}

export function parsePlanId(value: unknown): PlanId | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return isPlanId(v) ? v : null;
}

export function getPlan(plan: PlanId | null | undefined): PlanDefinition {
  if (plan && isPlanId(plan)) return PLANS[plan];
  return PLANS[DEFAULT_PLAN_FOR_LIMITS];
}

export function getMercadoPagoPlanId(plan: PlanId): string | null {
  const def = PLANS[plan];
  if (!def.mpPlanIdEnv) return null;
  const id = process.env[def.mpPlanIdEnv]?.trim();
  return id || null;
}

export function formatPlanPrice(plan: PlanId): string {
  const precio = PLANS[plan].precioArs;
  if (precio == null) return "A medida";
  return `${formatArs(precio)}/mes`;
}

export function precioIntroArs(precioListaArs: number): number {
  return Math.round(precioListaArs * INTRO_DISCOUNT_FACTOR);
}

/** Primera suscripción = la org nunca tuvo un cobro acreditado. */
export function isIntroEligible(
  pagadoHasta: string | Date | null | undefined,
): boolean {
  return pagadoHasta == null;
}

export function formatIntroPlanPrice(plan: PlanId): string {
  const precio = PLANS[plan].precioArs;
  if (precio == null) return "A medida";
  return `${formatArs(precioIntroArs(precio))}/mes`;
}

export function introDiscountNote(precioListaArs: number): string {
  return `50% los primeros ${INTRO_DISCOUNT_MONTHS} meses, después ${formatArs(precioListaArs)}/mes`;
}

export const CHECKOUT_PLANS: PlanId[] = ["local", "sucursales", "cadena"];
