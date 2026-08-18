import { LoginForm } from "@/app/components/login-form";
import Link from "next/link";
import { preconnect } from "react-dom";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/app/brand-mark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) preconnect(supabaseUrl);

  const configured = isSupabaseConfigured();
  const sp = await searchParams;
  const initialError =
    sp.error === "eliminada"
      ? "Esta cuenta fue eliminada. Contactá a un administrador."
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <BrandMark href="/" />
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-[26.25rem] flex-1 flex-col justify-center px-6 py-12">
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

        <LoginForm initialError={initialError} />

        <p className="mt-6 text-center text-body-sm text-muted-foreground">
          <Link href="/" className="font-medium text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}
