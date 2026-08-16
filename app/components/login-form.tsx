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
      setError(
        "Supabase no está configurado. Añade las variables en .env.local.",
      );
      return;
    }
    setLoading(true);
    const { data: signData, error: signError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
    if (signError) {
      setLoading(false);
      setError(mapAuthErrorMessage(signError.message));
      return;
    }

    const user = signData.user;
    const { data: perfilLogin } = user
      ? await supabase
          .from("perfiles")
          .select("debe_cambiar_password, eliminado_en")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };

    if (perfilLogin?.eliminado_en) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Esta cuenta fue eliminada. Contactá a un administrador.");
      return;
    }

    setLoading(false);
    if (perfilLogin?.debe_cambiar_password === true) {
      router.push("/auth/cambiar-password");
    } else {
      router.push("/seleccionar-tienda");
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[26.25rem] space-y-5 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-1">
        <h2 className="text-h1">Iniciar sesión</h2>
        <p className="text-body-sm text-muted-foreground">
          Accedé al panel de tu tienda
        </p>
      </div>

      <FormField id="login-email" label="Correo" error={null}>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
        />
      </FormField>

      <FormField id="login-password" label="Contraseña">
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Entrando…" : "Entrar"}
      </Button>

      <p className="text-center text-body-sm text-muted-foreground">
        ¿Primera vez?{" "}
        <Link
          href="/registro"
          className="font-medium text-primary hover:underline"
        >
          Crear tienda y cuenta
        </Link>
      </p>
    </form>
  );
}
