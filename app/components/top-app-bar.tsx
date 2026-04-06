"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SignOutButton } from "@/app/components/sign-out-button";
import { useEffect, useState } from "react";

const nav = [
  { href: "/dashboard", label: "Panel" },
  { href: "/products", label: "Productos" },
  { href: "/reports", label: "Reportes" },
  { href: "/team", label: "Equipo" },
];

type TopAppBarProps = {
  title?: string;
  activeHref?: string;
};

export function TopAppBar({
  title,
  activeHref = "/dashboard",
}: TopAppBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    async function loadName() {
      const supabase = createClient();
      if (!supabase) {
        setDisplayName(null);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDisplayName(null);
        return;
      }
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("nombre, apellido")
        .eq("id", user.id)
        .maybeSingle();
      const full =
        perfil && `${perfil.nombre ?? ""} ${perfil.apellido ?? ""}`.trim();
      setDisplayName(
        full && full.length > 0
          ? full
          : (user.email?.split("@")[0] ?? "Usuario"),
      );
    }
    void loadName();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    function closeIfDesktop() {
      if (mq.matches) setMenuOpen(false);
    }
    mq.addEventListener("change", closeIfDesktop);
    return () => mq.removeEventListener("change", closeIfDesktop);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full bg-stone-50/80 shadow-sm backdrop-blur-md">
      <div
        className={`flex w-full items-center justify-between px-6 py-4 ${
          menuOpen ? "relative z-80 bg-stone-50 shadow-sm" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            className="rounded-full bg-stone-100 p-2 text-primary shadow-sm ring-1 ring-stone-300/90 transition-colors duration-200 hover:bg-stone-200 active:scale-95 md:hidden"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
          <Link
            href="/dashboard"
            className="font-headline text-xl font-extrabold tracking-tighter text-primary-dim"
          >
            EZSale
          </Link>
        </div>
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Principal"
        >
          {nav.map((item) => {
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive
                    ? "font-bold text-primary"
                    : "text-stone-500 transition-colors hover:text-primary"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          {title ? (
            <span className="hidden font-headline text-xl font-bold text-primary lg:block">
              {title}
            </span>
          ) : null}
          <SignOutButton />
          <span
            className="max-w-[min(42vw,11rem)] truncate text-right text-sm font-semibold text-stone-700"
            title={displayName ?? undefined}
          >
            {displayName ?? "…"}
          </span>
        </div>
      </div>
      <div className="h-px bg-stone-200/50" />

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-60 bg-black/45 md:hidden"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="mobile-nav-drawer"
            className="fixed top-0 left-0 z-70 flex h-full w-[min(85vw,280px)] flex-col bg-stone-50 shadow-2xl md:hidden"
            aria-label="Menú móvil"
          >
            <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-4">
              <span className="font-headline text-lg font-extrabold text-primary-dim">
                EZSale
              </span>
              <button
                type="button"
                className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <ul className="flex flex-col gap-1 p-3 bg-stone-50 border border-stone-300 rounded-b-3xl shadow-2xl">
              {nav.map((item) => {
                const isActive = activeHref === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={
                        isActive
                          ? "block rounded-xl bg-primary-container/30 px-4 py-3 font-bold text-primary"
                          : "block rounded-xl px-4 py-3 text-stone-600 transition-colors hover:bg-stone-200"
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      ) : null}
    </header>
  );
}
