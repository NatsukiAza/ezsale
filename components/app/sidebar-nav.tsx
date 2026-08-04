"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartColumn,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Store,
  Users,
} from "lucide-react";
import { useState } from "react";
import { clearGateCookieClient } from "@/lib/supabase/gate-cookie";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/app/sidebar-context";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { BrandMark } from "@/components/app/brand-mark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/new-sale", label: "Nueva venta", icon: Plus, teamOnly: false },
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard, teamOnly: false },
  { href: "/products", label: "Productos", icon: Package, teamOnly: false },
  { href: "/reports", label: "Reportes", icon: ChartColumn, teamOnly: true },
  { href: "/team", label: "Equipo", icon: Users, teamOnly: true },
  { href: "/cuenta", label: "Cuenta", icon: CreditCard, teamOnly: false },
] as const;

export type SidebarUser = {
  displayName: string;
  email?: string | null;
  isAdmin: boolean;
  /** admin o manager: reportes / equipo */
  canManageTeam: boolean;
  tiendaNombre?: string | null;
};

type SidebarNavProps = {
  user: SidebarUser;
};

function NavLinks({
  canManageTeam,
  collapsed,
  onNavigate,
}: {
  canManageTeam: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = navItems.filter((item) => !item.teamOnly || canManageTeam);

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Principal">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const link = (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors duration-100",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }
        return link;
      })}
    </nav>
  );
}

function SidebarBody({
  user,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: {
  user: SidebarUser;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
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
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center px-2" : "px-3",
        )}
      >
        <BrandMark
          compact={collapsed}
          href="/dashboard"
          onClick={onNavigate}
        />
      </div>

      {!collapsed && user.tiendaNombre ? (
        <div className="space-y-1 px-3 py-3">
          <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <Store className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="truncate font-medium text-foreground">
              {user.tiendaNombre}
            </span>
          </div>
          {user.isAdmin ? (
            <Link
              href="/seleccionar-tienda"
              onClick={onNavigate}
              className="block truncate pl-6 text-caption text-primary hover:underline"
            >
              Cambiar tienda
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto py-2">
        <NavLinks
          canManageTeam={user.canManageTeam}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      </div>

      <div className="mt-auto border-t border-sidebar-border p-2">
        {!collapsed ? (
          <div className="mb-2 px-2.5">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            {user.email ? (
              <p className="truncate text-caption text-muted-foreground">
                {user.email}
              </p>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-center gap-1",
            collapsed ? "flex-col" : "justify-between",
          )}
        >
          <ThemeToggle />
          {onToggleCollapse ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hidden lg:inline-flex"
                  aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
                  onClick={onToggleCollapse}
                >
                  {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expandir" : "Colapsar"}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent side="right">Cerrar sesión</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export function SidebarNav({ user }: SidebarNavProps) {
  const { collapsed, toggle } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 z-40 flex h-14 w-full items-center gap-2 border-b border-border bg-background px-3 lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Abrir menú"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(85vw,16rem)] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <SidebarBody
              user={user}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <BrandMark href="/dashboard" />
        {user.tiendaNombre ? (
          <>
            <Separator orientation="vertical" className="h-4" />
            <span className="truncate text-body-sm text-muted-foreground">
              {user.tiendaNombre}
            </span>
          </>
        ) : null}
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-14" : "w-[15.5rem]",
        )}
      >
        <SidebarBody
          user={user}
          collapsed={collapsed}
          onToggleCollapse={toggle}
        />
      </aside>
    </>
  );
}
