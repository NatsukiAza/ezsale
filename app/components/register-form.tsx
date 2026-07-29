"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/app/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RegisterForm() {
  const router = useRouter();
  const [nombreTienda, setNombreTienda] = useState("");
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
    if (perfilLogin?.debe_cambiar_password === true) {
      router.push("/auth/cambiar-password");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);

    const supabase = createClient();
    if (!supabase) {
      setError(
        "Supabase no está configurado. Añade las variables en .env.local.",
      );
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
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
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

      const { error: rpcError } = await supabase.rpc(
        "create_tienda_y_perfil_admin",
        {
          p_nombre_tienda: nombreTienda,
          p_nombre: nombre,
          p_apellido: apellido,
        },
      );

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
        apiJson.error ??
          "No se pudo registrar. Revisa los datos e inténtalo de nuevo.",
      ),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-[26.25rem] space-y-5 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-1">
        <h1 className="text-h1">Registrar tienda</h1>
        <p className="text-body-sm text-muted-foreground">
          Se crea la tienda y tu usuario queda como administrador
        </p>
      </div>

      <FormField id="nombre-tienda" label="Nombre de la tienda">
        <Input
          id="nombre-tienda"
          required
          value={nombreTienda}
          onChange={(e) => setNombreTienda(e.target.value)}
          placeholder="Ej. Café Central"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="nombre" label="Nombre">
          <Input
            id="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </FormField>
        <FormField id="apellido" label="Apellido">
          <Input
            id="apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />
        </FormField>
      </div>

      <FormField id="reg-email" label="Correo">
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>

      <FormField id="reg-password" label="Contraseña" hint="Mínimo 6 caracteres">
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {hint ? (
        <Alert>
          <AlertDescription>{hint}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Creando…" : "Crear tienda y registrarme"}
      </Button>

      <p className="text-center text-body-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/" className="font-medium text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
