"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { BrandMark } from "@/components/app/brand-mark";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { clearGateCookieClient } from "@/lib/supabase/gate-cookie";
import { createClient } from "@/lib/supabase/client";

type BillingLockedShellProps = {
  orgName?: string | null;
  children: React.ReactNode;
};

export function BillingLockedShell({
  orgName,
  children,
}: BillingLockedShellProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    setSigningOut(true);
    if (supabase) await supabase.auth.signOut();
    clearGateCookieClient();
    setSigningOut(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark href="/cuenta" />
          {orgName ? (
            <span className="truncate text-body-sm text-muted-foreground">
              {orgName}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar sesión"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
          >
            <LogOut />
          </Button>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[75rem] flex-1">{children}</div>
    </div>
  );
}
