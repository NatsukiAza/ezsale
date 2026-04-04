/** Traduce mensajes típicos de Supabase Auth al español */
export function mapAuthErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirma tu correo antes de iniciar sesión (revisa la bandeja de entrada).";
  }
  if (lower.includes("user already registered") || lower.includes("already been registered")) {
    return "Ese correo ya está registrado. Inicia sesión o usa otro email.";
  }
  if (lower.includes("password should be at least")) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  if (lower.includes("invalid email")) {
    return "El correo no es válido.";
  }
  return message;
}
