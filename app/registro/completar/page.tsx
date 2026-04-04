import { CompleteStoreForm } from "@/app/components/complete-store-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    <div className="min-h-dvh bg-gradient-to-b from-surface-container-low to-surface py-12 px-6">
      <CompleteStoreForm />
    </div>
  );
}
