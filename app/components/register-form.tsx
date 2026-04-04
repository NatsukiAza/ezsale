"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [nombreTienda, setNombreTienda] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInAfterRegister() {
    const supabase = createClient();
    if (!supabase) return false;
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signErr) {
      setError(mapAuthErrorMessage(signErr.message));
      return false;
    }
    router.push("/dashboard");
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado. Añade las variables en .env.local.");
      return;
    }
    setLoading(true);

    const apiRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        nombreTienda,
        direccion,
        telefono,
        nombre,
        apellido,
      }),
    });

    const apiJson = (await apiRes.json()) as {
      ok?: boolean;
      fallback?: boolean;
      error?: string;
    };

    if (apiRes.ok && apiJson.ok) {
      const ok = await signInAfterRegister();
      setLoading(false);
      if (!ok) {
        setHint(
          "Cuenta creada. Si no entró el panel, inicia sesión manualmente con el mismo correo y contraseña.",
        );
      }
      return;
    }

    if (apiRes.status === 501 && apiJson.fallback) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/registro/completar`,
        },
      });

      if (signError) {
        setLoading(false);
        setError(mapAuthErrorMessage(signError.message));
        return;
      }

      if (!data.session) {
        setLoading(false);
        setHint(
          "Te enviamos un enlace de confirmación. Después de confirmar, inicia sesión: se te pedirá completar los datos de la tienda si aún no existen.",
        );
        return;
      }

      const { error: rpcError } = await supabase.rpc("create_tienda_y_perfil_admin", {
        p_nombre_tienda: nombreTienda,
        p_direccion: direccion,
        p_telefono: telefono,
        p_nombre: nombre,
        p_apellido: apellido,
      });

      setLoading(false);

      if (rpcError) {
        setError(mapAuthErrorMessage(rpcError.message));
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    setLoading(false);
    setError(
      mapAuthErrorMessage(
        apiJson.error ?? "No se pudo registrar. Revisa los datos e inténtalo de nuevo.",
      ),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-lg space-y-8 rounded-[2rem] border border-stone-200/80 bg-surface-container-lowest/95 p-8 shadow-xl backdrop-blur-sm md:p-10"
    >
      <div className="space-y-1 text-center">
        <h1 className="font-headline text-2xl font-extrabold text-on-surface md:text-3xl">
          Registrar tienda y administrador
        </h1>
        <p className="text-sm text-on-surface-variant">
          Se crea la tienda y tu usuario queda como administrador por defecto
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-label text-xs font-bold tracking-widest text-primary uppercase">
          Datos de la tienda
        </h2>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="nombre-tienda">
            Nombre de la tienda *
          </label>
          <input
            id="nombre-tienda"
            required
            value={nombreTienda}
            onChange={(e) => setNombreTienda(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
            placeholder="Ej. Café Central"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="direccion">
            Dirección
          </label>
          <input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
            placeholder="Calle y número"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="telefono">
            Teléfono
          </label>
          <input
            id="telefono"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
            placeholder="+54 …"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-label text-xs font-bold tracking-widest text-primary uppercase">
          Tu cuenta (administrador)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="nombre">
              Nombre *
            </label>
            <input
              id="nombre"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="apellido">
              Apellido
            </label>
            <input
              id="apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reg-email">
            Correo *
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="reg-password">
            Contraseña *
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p className="rounded-lg bg-tertiary-container/40 px-3 py-2 text-sm text-on-tertiary-container">
          {hint}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary-dim py-4 font-bold text-on-primary shadow-lg shadow-primary/25 transition-transform active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Creando…" : "Crear tienda y registrarme"}
      </button>

      <p className="text-center text-sm text-on-surface-variant">
        ¿Ya tienes cuenta?{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
