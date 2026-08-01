"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { clearGateCookieClient } from "@/lib/supabase/gate-cookie";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/app/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

    clearGateCookieClient();
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    clearGateCookieClient();
    router.push("/login");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[26.25rem] space-y-5 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-1">
        <h2 className="text-h1">Nueva contraseña</h2>
        <p className="text-body-sm text-muted-foreground">
          Es la primera vez que entrás con una cuenta invitada. Elegí una
          contraseña definitiva para continuar.
        </p>
      </div>

      <FormField id="np-password" label="Nueva contraseña">
        <Input
          id="np-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>

      <FormField id="np-confirm" label="Confirmar contraseña">
        <Input
          id="np-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </FormField>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Guardando…" : "Guardar y continuar"}
      </Button>

      <p className="text-center text-body-sm">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="font-medium text-primary hover:underline"
        >
          Cerrar sesión
        </button>
      </p>
    </form>
  );
}
