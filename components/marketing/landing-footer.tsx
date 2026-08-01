import Link from "next/link";
import { BrandMark } from "@/components/app/brand-mark";

const columns = [
  {
    title: "Producto",
    links: [
      { href: "/#producto", label: "Funciones" },
      { href: "/#precios", label: "Precios" },
      { href: "/#preguntas", label: "Preguntas" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/registro", label: "Crear tienda" },
      { href: "/login", label: "Iniciar sesión" },
      { href: "mailto:hola@ezsale.app", label: "Contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terminos", label: "Términos" },
      { href: "/terminos#8-datos-personales-y-privacidad", label: "Privacidad" },
    ],
  },
] as const;

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 text-neutral-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="[&_span.text-foreground]:text-white">
            <BrandMark href="/" />
          </div>
          <p className="mt-3 max-w-xs text-body-sm text-neutral-400">
            Punto de venta multi-tienda para comercios y gastronomía en
            Argentina.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-label text-white">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("mailto:") ? (
                    <a
                      href={l.href}
                      className="text-body-sm text-neutral-400 transition-colors hover:text-white"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-body-sm text-neutral-400 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-neutral-800 py-5 text-center text-caption text-neutral-500">
        © {year} EZSale
      </div>
    </footer>
  );
}
