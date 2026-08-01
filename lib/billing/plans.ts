import { formatArs } from "@/lib/format";

export type PlanId = "local" | "sucursales" | "cadena" | "empresa";

export type PlanDefinition = {
  id: PlanId;
  name: string;
  maxUsuarios: number;
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
    reportesAnios: 2,
    precioArs: 50_000,
    mpPlanIdEnv: "MP_PLAN_LOCAL",
  },
  sucursales: {
    id: "sucursales",
    name: "Sucursales",
    maxUsuarios: 30,
    reportesAnios: 4,
    precioArs: 150_000,
    mpPlanIdEnv: "MP_PLAN_SUCURSALES",
  },
  cadena: {
    id: "cadena",
    name: "Cadena",
    maxUsuarios: 100,
    reportesAnios: 5,
    precioArs: 199_999,
    mpPlanIdEnv: "MP_PLAN_CADENA",
  },
  empresa: {
    id: "empresa",
    name: "Empresa",
    maxUsuarios: Number.POSITIVE_INFINITY,
    reportesAnios: Number.POSITIVE_INFINITY,
    precioArs: null,
    mpPlanIdEnv: null,
  },
};

/** Plan efectivo para límites cuando aún no eligieron (trial). */
export const DEFAULT_PLAN_FOR_LIMITS: PlanId = "local";

export const TRIAL_DAYS = 30;
export const GRACE_DAYS = 30;

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

export const CHECKOUT_PLANS: PlanId[] = ["local", "sucursales", "cadena"];
