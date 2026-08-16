"use client";

import { mapAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import {
  CHECKOUT_PLANS,
  PLANS,
  type PlanId,
  formatIntroPlanPrice,
  formatPlanPrice,
  introDiscountNote,
} from "@/lib/billing/plans";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FormField } from "@/components/app/form-field";
import { TerminosAcceptCheckbox } from "@/components/legal/terminos-accept-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TERMINOS_VERSION } from "@/lib/legal/terminos";
import { cn } from "@/lib/utils";

export function RegisterForm({
  initialPlan = null,
}: {
  initialPlan?: PlanId | null;
}) {
  const router = useRouter();
  const [nombreTienda, setNombreTienda] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [plan, setPlan] = useState<PlanId>(
    initialPlan && CHECKOUT_PLANS.includes(initialPlan)
      ? initialPlan
      : "local",
  );
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInAfterRegister() {
    const supabase = createClient();
    if (!supabase) return false;
    const { data: signData, error: signErr } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
    if (signErr) {
      setError(mapAuthErrorMessage(signErr.message));
      return false;
    }
    const user = signData.user;
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
      router.push("/seleccionar-tienda");
    }
    router.refresh();
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (!aceptoTerminos) {
      setError("Debés aceptar los Términos y Condiciones para continuar.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

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
        plan,
        aceptoTerminos: true,
        terminosVersion: TERMINOS_VERSION,
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
          p_plan: plan,
          p_tyc_version: TERMINOS_VERSION,
        },
      );

      setLoading(false);

      if (rpcError) {
        setError(mapAuthErrorMessage(rpcError.message));
        return;
      }

      router.push("/seleccionar-tienda");
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
          Se crea la tienda y tu usuario queda como administrador. Tenés 30
          días de prueba. En la primera suscripción, los 3 primeros meses van
          al 50%.
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

      <div className="space-y-2">
        <p className="text-sm font-medium">Plan</p>
        <div className="grid gap-2">
          {CHECKOUT_PLANS.map((id) => {
            const p = PLANS[id];
            const active = plan === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPlan(id)}
                className={cn(
                  "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <span className="font-medium">{p.name}</span>
                {p.precioArs != null ? (
                  <span className="ml-2">
                    <span className="text-muted-foreground line-through">
                      {formatPlanPrice(id)}
                    </span>{" "}
                    <span>{formatIntroPlanPrice(id)}</span>
                  </span>
                ) : (
                  <span className="ml-2 text-muted-foreground">
                    {formatPlanPrice(id)}
                  </span>
                )}
                {p.precioArs != null ? (
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    {introDiscountNote(p.precioArs)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

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
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </FormField>

      <FormField id="reg-confirm-password" label="Confirmar contraseña">
        <div className="relative">
          <Input
            id="reg-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={
              showConfirmPassword
                ? "Ocultar confirmación de contraseña"
                : "Mostrar confirmación de contraseña"
            }
            aria-pressed={showConfirmPassword}
          >
            {showConfirmPassword ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </FormField>

      <TerminosAcceptCheckbox
        checked={aceptoTerminos}
        onCheckedChange={setAceptoTerminos}
        invalid={Boolean(error && !aceptoTerminos)}
      />

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

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !aceptoTerminos}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Creando…" : "Crear tienda y registrarme"}
      </Button>

      <p className="text-center text-body-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
