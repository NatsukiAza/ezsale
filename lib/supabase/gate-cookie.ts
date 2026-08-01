/** Cookie de middleware para evitar consultar `perfiles` en cada navegación. */
export const GATE_COOKIE = "ez_gate";

/** TTL de la cache de gate (ms). */
export const GATE_TTL_MS = 10 * 60 * 1000;

export type GatePayload = {
  debeCambiarPassword: boolean;
  rol: string;
  /** Acceso de cobro bloqueado (trial/pago vencido + gracia). */
  billingBlocked: boolean;
  /** ok | trial | atrasado | bloqueado */
  billingPhase: string;
  exp: number;
};

export function serializeGate(
  payload: Omit<GatePayload, "exp">,
): string {
  const exp = Date.now() + GATE_TTL_MS;
  return [
    payload.debeCambiarPassword ? "1" : "0",
    payload.rol,
    payload.billingBlocked ? "1" : "0",
    payload.billingPhase || "ok",
    String(exp),
  ].join(".");
}

export function parseGate(raw: string | undefined): GatePayload | null {
  if (!raw) return null;
  const parts = raw.split(".");
  // Nuevo: flag.rol.blocked.phase.exp (5)
  // Viejo: flag.rol.exp (3) → invalidar para forzar refresh
  if (parts.length === 5) {
    const [flag, rol, blocked, phase, expStr] = parts;
    if ((flag !== "0" && flag !== "1") || !rol || !expStr) return null;
    if (blocked !== "0" && blocked !== "1") return null;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || Date.now() > exp) return null;
    return {
      debeCambiarPassword: flag === "1",
      rol,
      billingBlocked: blocked === "1",
      billingPhase: phase || "ok",
      exp,
    };
  }
  return null;
}

/** Borrar la cookie en el browser (p. ej. tras cambiar la contraseña). */
export function clearGateCookieClient() {
  if (typeof document === "undefined") return;
  document.cookie = `${GATE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
