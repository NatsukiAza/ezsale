"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompleteStoreForm() {
  const router = useRouter();
  const [nombreTienda, setNombreTienda] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    setLoading(true);

    const { error: rpcError } = await supabase.rpc("create_tienda_y_perfil_admin", {
      p_nombre_tienda: nombreTienda,
      p_nombre: nombre,
      p_apellido: apellido,
    });

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-lg space-y-4xl border border-stone-200/80 bg-surface-container-lowest p-8 shadow-xl"
    >
      <div className="space-y-1 text-center">
        <h1 className="font-headline text-2xl font-extrabold text-on-surface">
          Completar datos de tu tienda
        </h1>
        <p className="text-sm text-on-surface-variant">
          Tu cuenta ya existe; crea la tienda y tu perfil de administrador.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="cs-nombre-tienda">
          Nombre de la tienda *
        </label>
        <input
          id="cs-nombre-tienda"
          required
          value={nombreTienda}
          onChange={(e) => setNombreTienda(e.target.value)}
          className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="cs-nombre">
            Tu nombre *
          </label>
          <input
            id="cs-nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="cs-apellido">
            Apellido
          </label>
          <input
            id="cs-apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            className="w-full rounded-xl border-none bg-surface-container-low px-4 py-3 outline-none ring-1 ring-stone-200/80 focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {error ? (
        <p
          className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-linear-to-br from-primary to-primary-dim py-4 font-bold text-on-primary shadow-lg disabled:opacity-60"
      >
        {loading ? "Guardando…" : "Crear tienda y continuar"}
      </button>

      <p className="text-center text-sm">
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </p>
    </form>
  );
}
