"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FormField } from "@/components/app/form-field";
import { TerminosAcceptCheckbox } from "@/components/legal/terminos-accept-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TERMINOS_VERSION } from "@/lib/legal/terminos";

export function CompleteStoreForm() {
  const router = useRouter();
  const [nombreTienda, setNombreTienda] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!aceptoTerminos) {
      setError("Debés aceptar los Términos y Condiciones para continuar.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    setLoading(true);

    const { error: rpcError } = await supabase.rpc(
      "create_tienda_y_perfil_admin",
      {
        p_nombre_tienda: nombreTienda,
        p_nombre: nombre,
        p_apellido: apellido,
        p_plan: null,
        p_tyc_version: TERMINOS_VERSION,
      },
    );

    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.push("/seleccionar-tienda");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-[26.25rem] space-y-5 rounded-lg border border-border bg-card p-6"
    >
      <div className="space-y-1">
        <h1 className="text-h1">Completar datos de tu negocio</h1>
        <p className="text-body-sm text-muted-foreground">
          Tu cuenta ya existe; creá la organización, la primera tienda y tu perfil de administrador.
        </p>
      </div>

      <FormField id="cs-nombre-tienda" label="Nombre de la tienda">
        <Input
          id="cs-nombre-tienda"
          required
          value={nombreTienda}
          onChange={(e) => setNombreTienda(e.target.value)}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="cs-nombre" label="Tu nombre">
          <Input
            id="cs-nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </FormField>
        <FormField id="cs-apellido" label="Apellido">
          <Input
            id="cs-apellido"
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
          />
        </FormField>
      </div>

      <TerminosAcceptCheckbox
        id="cs-acepto-terminos"
        checked={aceptoTerminos}
        onCheckedChange={setAceptoTerminos}
        invalid={Boolean(error && !aceptoTerminos)}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !aceptoTerminos}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        {loading ? "Guardando…" : "Crear tienda y continuar"}
      </Button>

      <p className="text-center text-body-sm">
        <Link href="/" className="font-medium text-primary hover:underline">
          Volver al inicio
        </Link>
      </p>
    </form>
  );
}
