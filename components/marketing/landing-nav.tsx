"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/app/brand-mark";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#producto", label: "Producto" },
  { href: "#precios", label: "Precios" },
  { href: "#preguntas", label: "Preguntas" },
] as const;

export function LandingNav({
  variant = "hero",
}: {
  /** `solid` para páginas claras (p. ej. legales) sin hero oscuro. */
  variant?: "hero" | "solid";
}) {
  const [scrolled, setScrolled] = useState(variant === "solid");
  const solid = variant === "solid" || scrolled;

  useEffect(() => {
    if (variant === "solid") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-200",
        solid
          ? "border-b border-border bg-background/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <div
          className={cn(
            !solid && "[&_span.text-foreground]:text-white",
          )}
        >
          <BrandMark href="/" />
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={variant === "solid" ? `/${l.href}` : l.href}
              className={cn(
                "text-body-sm font-medium transition-colors",
                solid
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-white/80 hover:text-white",
              )}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              !solid &&
                "[&_button]:text-white [&_button:hover]:bg-white/10 [&_button:hover]:text-white",
            )}
          >
            <ThemeToggle />
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className={
              !solid
                ? "text-white hover:bg-white/10 hover:text-white"
                : undefined
            }
          >
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/registro">Crear mi tienda</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
