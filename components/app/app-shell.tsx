"use client";

import { usePathname } from "next/navigation";
import { PrivacyProvider } from "@/components/app/privacy";
import { SidebarProvider, useSidebar } from "@/components/app/sidebar-context";
import {
  SidebarNav,
  type SidebarUser,
} from "@/components/app/sidebar-nav";
import { cn } from "@/lib/utils";

type AppShellProps = {
  user: SidebarUser;
  children: React.ReactNode;
  className?: string;
};

function AppShellInner({ user, children, className }: AppShellProps) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const fullWidth = pathname.startsWith("/new-sale");

  return (
    <PrivacyProvider>
      <div className={cn("bg-atmosphere", fullWidth ? "h-dvh overflow-hidden" : "min-h-dvh")}>
        <SidebarNav user={user} />
        <div
          className={cn(
            "transition-[padding] duration-200",
            fullWidth
              ? "h-full overflow-hidden pt-14 lg:pt-0"
              : "min-h-dvh pt-14 lg:pt-0",
            collapsed ? "lg:pl-14" : "lg:pl-[15.5rem]",
            className,
          )}
        >
          <div
            className={cn(
              "mx-auto w-full",
              fullWidth ? "h-full max-w-none" : "max-w-[75rem]",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </PrivacyProvider>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner {...props} />
    </SidebarProvider>
  );
}
