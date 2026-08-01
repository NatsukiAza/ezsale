import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  price: string | null;
  priceNote: string;
  description: string;
  featured?: boolean;
  dark?: boolean;
  cta: { label: string; href: string };
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Local",
    price: formatArs(50000),
    priceNote: "/mes",
    description: "Un local, lo esencial para empezar a cobrar.",
    cta: { label: "Crear mi tienda", href: "/registro?plan=local" },
    features: [
      "Hasta 5 usuarios",
      "1 tienda",
      "Reportes hasta 2 años atrás",
      "Ventas, productos y equipo",
    ],
  },
  {
    name: "Sucursales",
    price: formatArs(150000),
    priceNote: "/mes",
    description: "Para quien ya tiene más de un punto de venta.",
    featured: true,
    cta: { label: "Crear mi tienda", href: "/registro?plan=sucursales" },
    features: [
      "Hasta 30 usuarios",
      "Hasta 5 tiendas",
      "Reportes hasta 4 años atrás",
      "Roles admin y normal",
    ],
  },
  {
    name: "Cadena",
    price: formatArs(199999),
    priceNote: "/mes",
    description: "Escala con más locales y más historial.",
    cta: { label: "Crear mi tienda", href: "/registro?plan=cadena" },
    features: [
      "Hasta 100 usuarios",
      "Hasta 20 tiendas",
      "Reportes hasta 5 años atrás",
      "Soporte prioritario",
    ],
  },
  {
    name: "Empresa",
    price: null,
    priceNote: "A medida",
    description: "Sin techos. Armamos el plan con vos.",
    dark: true,
    cta: { label: "Hablar con nosotros", href: "mailto:hola@ezsale.app" },
    features: [
      "Usuarios ilimitados",
      "Tiendas ilimitadas",
      "Reportes de por vida",
      "Soporte dedicado",
    ],
  },
];

const comparison = [
  {
    label: "Usuarios",
    values: ["5", "30", "100", "Ilimitados"],
  },
  {
    label: "Tiendas",
    values: ["1", "5", "20", "Ilimitadas"],
  },
  {
    label: "Historial de reportes",
    values: ["2 años", "4 años", "5 años", "De por vida"],
  },
  {
    label: "Roles admin / normal",
    values: ["Sí", "Sí", "Sí", "Sí"],
  },
  {
    label: "Medios de pago",
    values: ["Incluidos", "Incluidos", "Incluidos", "Incluidos"],
  },
  {
    label: "Soporte",
    values: ["Estándar", "Estándar", "Prioritario", "Dedicado"],
  },
] as const;

export function LandingPricing() {
  return (
    <section
      id="precios"
      className="bg-pricing-radial py-section md:py-section-lg"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <h2 className="text-section-title">Precios claros, sin sorpresas</h2>
          <p className="mt-4 text-body text-muted-foreground md:text-base md:leading-relaxed">
            Suscripción mensual en pesos. Probá 30 días y después pagás con
            Mercado Pago. Si el cobro falla, tenés un mes de gracia.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.04}>
              <article
                className={cn(
                  "relative flex h-full flex-col rounded-xl border p-5",
                  plan.featured &&
                    "border-primary shadow-overlay-sm ring-1 ring-primary/20",
                  plan.dark &&
                    "border-neutral-800 bg-neutral-950 text-neutral-100",
                  !plan.featured && !plan.dark && "border-border bg-card",
                )}
              >
                {plan.featured ? (
                  <span className="absolute -top-2.5 left-5 rounded-md bg-primary px-2 py-0.5 text-caption font-medium text-primary-foreground">
                    Más elegido
                  </span>
                ) : null}
                <h3
                  className={cn(
                    "font-display text-h1 tracking-tight",
                    plan.dark && "text-white",
                  )}
                >
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  {plan.price ? (
                    <>
                      <span
                        className={cn(
                          "font-display text-display font-bold tabular-nums tracking-tight",
                          plan.dark && "text-white",
                        )}
                      >
                        {plan.price}
                      </span>
                      <span
                        className={cn(
                          "text-body-sm text-muted-foreground",
                          plan.dark && "text-neutral-400",
                        )}
                      >
                        {plan.priceNote}
                      </span>
                    </>
                  ) : (
                    <span className="font-display text-display font-bold tracking-tight text-white">
                      {plan.priceNote}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-2 text-body-sm text-muted-foreground",
                    plan.dark && "text-neutral-400",
                  )}
                >
                  {plan.description}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-body-sm">
                      <Check
                        className={cn(
                          "mt-0.5 size-4 shrink-0 text-primary",
                          plan.dark && "text-[var(--clay-400)]",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className={plan.dark ? "text-neutral-200" : undefined}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-6 w-full"
                  variant={plan.featured ? "default" : plan.dark ? "secondary" : "outline"}
                  size="lg"
                >
                  <Link href={plan.cta.href}>{plan.cta.label}</Link>
                </Button>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-12 md:mt-16">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[40rem] text-left text-body-sm">
              <thead>
                <tr className="border-b border-border bg-surface-sunken">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Comparación
                  </th>
                  {plans.map((p) => (
                    <th
                      key={p.name}
                      className="px-4 py-3 font-medium text-foreground"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.label}
                    </td>
                    {row.values.map((v, i) => (
                      <td
                        key={`${row.label}-${i}`}
                        className="px-4 py-3 tabular-nums text-foreground"
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
