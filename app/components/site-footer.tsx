import Link from "next/link";
import { getPerfilTienda } from "@/lib/supabase/cached-session";

const enlacesBase = [
  { href: "/dashboard", label: "Panel", adminOnly: false },
  { href: "/new-sale", label: "Nueva venta", adminOnly: false },
  { href: "/products", label: "Productos", adminOnly: false },
  { href: "/reports", label: "Reportes", adminOnly: true },
  { href: "/team", label: "Equipo", adminOnly: true },
] as const;

export async function SiteFooter() {
  const { perfil } = await getPerfilTienda();
  const esAdmin = perfil?.rol === "admin";

  const enlacesRapidos = enlacesBase.filter((item) => !item.adminOnly || esAdmin);

  return (
    <footer className="shrink-0 border-t border-stone-200/70 bg-stone-100/80 text-on-surface backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-headline text-lg font-extrabold tracking-tight text-primary-dim">
              EZSale
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              Plataforma de gestión para tu negocio: ventas, inventario, reportes y equipo en un
              solo lugar.
            </p>
          </div>

          <div>
            <h2 className="font-label text-[11px] font-bold tracking-widest text-stone-500 uppercase">
              Navegación
            </h2>
            <ul className="mt-4 space-y-2.5">
              {enlacesRapidos.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    className="text-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-label text-[11px] font-bold tracking-widest text-stone-500 uppercase">
              Producto
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-on-surface-variant">
              <li>Multi-tienda segura</li>
              <li>Ventas y medios de pago</li>
              <li>Catálogo y categorías</li>
              <li>Reportes por periodo</li>
            </ul>
          </div>

          <div>
            <h2 className="font-label text-[11px] font-bold tracking-widest text-stone-500 uppercase">
              Desarrollo
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
              Diseño y desarrollo por{" "}
              <a
                href="https://santinoazarola.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-2 transition-colors hover:text-primary-dim hover:underline"
              >
                Santino Azarola
              </a>
              .
            </p>
            <p className="mt-3 text-xs leading-relaxed text-outline">
              ¿Consultas sobre el producto? Contactá al administrador de tu tienda.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-200/80 pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-on-surface-variant">
            © {new Date().getFullYear()} EZSale. Todos los derechos reservados.
          </p>
          <p className="text-xs text-outline">
            Hecho con dedicación ·{" "}
            <a
              href="https://santinoazarola.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              santinoazarola.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
