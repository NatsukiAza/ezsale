"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado. Añade las variables en .env.local.");
      return;
    }
    setLoading(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signError) {
      setLoading(false);
      setError(mapAuthErrorMessage(signError.message));
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfilLogin } = user
      ? await supabase
          .from("perfiles")
          .select("debe_cambiar_password")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };

    setLoading(false);
    if (perfilLogin?.debe_cambiar_password === true) {
      router.push("/auth/cambiar-password");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-5 rounded-[2rem] border border-stone-200/80 bg-surface-container-lowest/90 p-8 shadow-xl backdrop-blur-sm"
    >
      <div className="space-y-1 text-center">
        <h2 className="font-headline text-2xl font-extrabold text-on-surface">
          Iniciar sesión
        </h2>
        <p className="text-sm text-on-surface-variant">
          Accede al panel de tu tienda asociada
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium text-on-surface">
          Correo
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 text-on-surface outline-none ring-1 ring-stone-200/80 transition-all focus:ring-2 focus:ring-primary/40"
          placeholder="tu@email.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm font-medium text-on-surface">
          Contraseña
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary-dim py-4 font-bold text-on-primary shadow-lg shadow-primary/25 transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Entrando…" : "Entrar al panel"}
      </button>

      <p className="text-center text-sm text-on-surface-variant">
        ¿Primera vez?{" "}
        <Link href="/registro" className="font-semibold text-primary hover:underline">
          Crear tienda y cuenta
        </Link>
      </p>
    </form>
  );
}
