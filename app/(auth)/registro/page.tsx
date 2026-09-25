import { RegisterForm } from "@/app/components/register-form";
import { preconnect } from "react-dom";
import { isSupabaseConfigured } from "@/lib/env";
import { parsePlanId } from "@/lib/billing/plans";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/app/brand-mark";

export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const configured = isSupabaseConfigured();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) preconnect(supabaseUrl);
  const sp = await searchParams;
  const initialPlan = parsePlanId(sp.plan);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <BrandMark href="/" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
        {!configured ? (
          <Alert className="max-w-[26.25rem]">
            <AlertDescription>
              Falta configurar Supabase en{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                .env.local
              </code>
              .
            </AlertDescription>
          </Alert>
        ) : null}
        <RegisterForm initialPlan={initialPlan} />
      </main>
    </div>
  );
}
