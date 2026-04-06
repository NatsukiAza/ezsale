"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida. Volvé a iniciar sesión.");
      return;
    }

    const { error: updAuth } = await supabase.auth.updateUser({ password });
    if (updAuth) {
      setLoading(false);
      setError(mapAuthErrorMessage(updAuth.message));
      return;
    }

    const { error: updPerfil } = await supabase
      .from("perfiles")
      .update({ debe_cambiar_password: false })
      .eq("id", user.id);

    if (updPerfil) {
      setLoading(false);
      setError(updPerfil.message ?? "No se pudo actualizar el perfil.");
      return;
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-5 rounded-4xl border border-stone-200/80 bg-surface-container-lowest/90 p-8 shadow-xl backdrop-blur-sm"
    >
      <div className="space-y-1 text-center">
        <h2 className="font-headline text-2xl font-extrabold text-on-surface">
          Nueva contraseña
        </h2>
        <p className="text-sm text-on-surface-variant">
          Es la primera vez que entrás con una cuenta invitada. Elegí una contraseña
          definitiva para continuar.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="np-password" className="text-sm font-medium text-on-surface">
          Nueva contraseña
        </label>
        <input
          id="np-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 text-on-surface outline-none ring-1 ring-stone-200/80 transition-all focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="np-confirm" className="text-sm font-medium text-on-surface">
          Confirmar contraseña
        </label>
        <input
          id="np-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 text-on-surface outline-none ring-1 ring-stone-200/80 transition-all focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {error ? (
        <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-linear-to-br from-primary to-primary-dim py-4 font-bold text-on-primary shadow-lg shadow-primary/25 transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Guardando…" : "Guardar y continuar"}
      </button>

      <p className="text-center text-sm text-on-surface-variant">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="font-semibold text-primary hover:underline"
        >
          Cerrar sesión
        </button>
      </p>
    </form>
  );
}
