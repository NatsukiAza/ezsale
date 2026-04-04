import { LoginForm } from "@/app/components/login-form";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-stone-200/60 bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-headline text-xl font-extrabold tracking-tight text-primary-dim">
            EZSale
          </span>
          <Link
            href="/registro"
            className="rounded-full border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Registrar tienda
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        {!configured ? (
          <div className="mb-10 rounded-2xl border border-tertiary-container/50 bg-tertiary-container/20 px-4 py-3 text-center text-sm text-on-tertiary-container">
            Configura{" "}
            <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code className="rounded bg-surface px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
            <code className="rounded bg-surface px-1">.env.local</code> y ejecuta la migración SQL
            en Supabase.
          </div>
        ) : null}

        <div className="grid items-start gap-12 lg:grid-cols-[1fr_420px] lg:gap-16">
          <div className="space-y-8">
            <p className="font-label text-xs font-semibold tracking-widest text-primary uppercase">
              Software de gestión gastronómica
            </p>
            <h1 className="font-headline text-4xl leading-tight font-extrabold tracking-tight text-on-surface md:text-5xl lg:text-6xl">
              Ventas, inventario y equipo en un solo panel multi-tienda
            </h1>
            <p className="max-w-xl text-lg text-on-surface-variant">
              EZSale organiza tu operación por <strong className="text-on-surface">tienda</strong>:
              cada negocio tiene su catálogo, ventas y usuarios. Inicia sesión para ver el panel de
              la tienda vinculada a tu cuenta.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: "point_of_sale",
                  title: "Ventas en vivo",
                  desc: "Registra tickets y medios de pago con totales claros.",
                },
                {
                  icon: "inventory_2",
                  title: "Productos e inventario",
                  desc: "Catálogo por categorías y precios actualizados.",
                },
                {
                  icon: "bar_chart",
                  title: "Reportes",
                  desc: "Periodos, métodos de pago y detalle de ventas.",
                },
                {
                  icon: "groups",
                  title: "Equipo",
                  desc: "Usuarios por tienda con roles admin o normal.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="flex gap-3 rounded-2xl border border-stone-100 bg-surface-container-lowest p-4 shadow-sm"
                >
                  <span className="material-symbols-outlined shrink-0 text-2xl text-primary">
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-headline font-bold text-on-surface">{item.title}</p>
                    <p className="text-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:sticky lg:top-24">
            <LoginForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200/60 py-8 text-center text-sm text-on-surface-variant">
        EZSale — panel seguro por tienda asociada a tu usuario
      </footer>
    </div>
  );
}
