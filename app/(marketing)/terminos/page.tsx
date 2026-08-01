import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { SimpleMarkdown } from "@/lib/legal/simple-md";
import { TERMINOS_UPDATED_LABEL } from "@/lib/legal/terminos";

export const metadata: Metadata = {
  title: "Términos y Condiciones — EZSale",
  description:
    "Términos y condiciones de uso del software EZSale (SaaS) para gestión de ventas.",
};

async function loadTerminosMarkdown() {
  const filePath = path.join(
    process.cwd(),
    "docs",
    "legal",
    "terminos-y-condiciones.md",
  );
  return readFile(filePath, "utf8");
}

export default async function TerminosPage() {
  const source = await loadTerminosMarkdown();

  return (
    <>
      <LandingNav variant="solid" />
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-24">
        <p className="text-caption text-muted-foreground">
          Documento vigente · {TERMINOS_UPDATED_LABEL}
        </p>
        <article className="mt-4">
          <SimpleMarkdown source={source} />
        </article>
      </main>
      <LandingFooter />
    </>
  );
}
