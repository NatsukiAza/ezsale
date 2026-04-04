import { RegisterForm } from "@/app/components/register-form";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";

export default function RegistroPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface-container-low to-surface py-10 md:py-16">
      <div className="mb-8 flex justify-center px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Volver al inicio
        </Link>
      </div>

      {!configured ? (
        <p className="mx-auto mb-8 max-w-lg rounded-2xl border border-error/30 bg-error-container/15 px-4 py-3 text-center text-sm text-error">
          Falta configurar Supabase en <code className="rounded bg-surface px-1">.env.local</code>
        </p>
      ) : null}

      <RegisterForm />
    </div>
  );
}
