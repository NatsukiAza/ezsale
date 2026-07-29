import { LoginForm } from "@/app/components/login-form";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/app/brand-mark";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <BrandMark href="/" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm">
            <Link href="/registro">Registrar tienda</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[68.75rem] flex-1 px-6 py-12 md:py-16">
        {!configured ? (
          <Alert className="mb-8">
            <AlertDescription>
              Configurá{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              y{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              en{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                .env.local
              </code>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid items-start gap-12 lg:grid-cols-[1fr_26.25rem] lg:gap-16">
          <div className="space-y-6">
            <h1 className="text-display-lg max-w-xl">
              Ventas y catálogo, sin complicaciones
            </h1>
            <p className="max-w-lg text-body text-muted-foreground md:text-base md:leading-relaxed">
              EZSale es un punto de venta multi-tienda: registrá tickets,
              administrá productos y mirá reportes desde un solo panel.
            </p>
            <ul className="space-y-3 text-body-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Ventas — </span>
                Carrito, descuentos y medios de pago en segundos.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Productos —{" "}
                </span>
                Catálogo por categorías con precios actualizados.
              </li>
              <li>
                <span className="font-medium text-foreground">Equipo — </span>
                Usuarios por tienda con roles admin o normal.
              </li>
            </ul>
          </div>

          <div className="lg:sticky lg:top-8">
            <LoginForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-caption text-muted-foreground">
        EZSale — panel por tienda asociada a tu usuario
      </footer>
    </div>
  );
}
