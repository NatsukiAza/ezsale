"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    if (!supabase) {
      router.push("/");
      return;
    }
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-primary disabled:opacity-50"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
    >
      <span className="material-symbols-outlined text-xl">logout</span>
    </button>
  );
}
