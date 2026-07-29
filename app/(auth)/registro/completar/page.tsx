import { CompleteStoreForm } from "@/app/components/complete-store-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/app/brand-mark";

export const dynamic = "force-dynamic";

export default async function CompletarRegistroPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <BrandMark href="/" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <CompleteStoreForm />
      </main>
    </div>
  );
}
