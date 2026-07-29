/** Cookie de middleware para evitar consultar `perfiles` en cada navegación. */
export const GATE_COOKIE = "ez_gate";

/** TTL de la cache de gate (ms). */
export const GATE_TTL_MS = 10 * 60 * 1000;

export type GatePayload = {
  debeCambiarPassword: boolean;
  rol: string;
  exp: number;
};

export function serializeGate(payload: Omit<GatePayload, "exp">): string {
  const exp = Date.now() + GATE_TTL_MS;
  return `${payload.debeCambiarPassword ? "1" : "0"}.${payload.rol}.${exp}`;
}

export function parseGate(raw: string | undefined): GatePayload | null {
  if (!raw) return null;
  const [flag, rol, expStr] = raw.split(".");
  if ((flag !== "0" && flag !== "1") || !rol || !expStr) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return {
    debeCambiarPassword: flag === "1",
    rol,
    exp,
  };
}

/** Borrar la cookie en el browser (p. ej. tras cambiar la contraseña). */
export function clearGateCookieClient() {
  if (typeof document === "undefined") return;
  document.cookie = `${GATE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
