import { ReportsView } from "@/app/components/reports-view";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle();
      if (perfil?.rol !== "admin") {
        redirect("/dashboard");
      }
    }
  }

  return <ReportsView />;
}
