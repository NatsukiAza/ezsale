import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  INTRO_DISCOUNT_MONTHS,
  PLANS,
  introDiscountNote,
  precioIntroArs,
  type PlanId,
} from "@/lib/billing/plans";

type Plan = {
  name: string;
  price: string | null;
  priceList?: string;
  priceNote: string;
  priceCaption?: string;
  description: string;
  featured?: boolean;
  dark?: boolean;
  cta: { label: string; href: string };
  features: string[];
};

function paidPlan(
  id: Exclude<PlanId, "empresa">,
  extras: Omit<Plan, "name" | "price" | "priceList" | "priceNote" | "priceCaption">,
): Plan {
  const def = PLANS[id];
  const list = def.precioArs!;
  return {
    name: def.name,
    price: formatArs(precioIntroArs(list)),
    priceList: formatArs(list),
    priceNote: "/mes",
    priceCaption: introDiscountNote(list),
    ...extras,
  };
}

const plans: Plan[] = [
  paidPlan("local", {
    description: "Un local, lo esencial para empezar a cobrar.",
    cta: { label: "Crear mi tienda", href: "/registro?plan=local" },
    features: [
      "Hasta 5 usuarios",
      "1 tienda",
      "Reportes hasta 2 años atrás",
      "Ventas, productos y equipo",
    ],
  }),
  paidPlan("sucursales", {
    description: "Para quien ya tiene más de un punto de venta.",
    featured: true,
    cta: { label: "Crear mi tienda", href: "/registro?plan=sucursales" },
    features: [
      "Hasta 30 usuarios",
      "Hasta 5 tiendas",
      "Reportes hasta 4 años atrás",
      "Roles admin y normal",
    ],
  }),
  paidPlan("cadena", {
    description: "Escala con más locales y más historial.",
    cta: { label: "Crear mi tienda", href: "/registro?plan=cadena" },
    features: [
      "Hasta 60 usuarios",
      "Hasta 10 tiendas",
      "Reportes hasta 5 años atrás",
      "Soporte prioritario",
    ],
  }),
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

const includedInAll = [
  {
    label: "Stock por tienda",
    detail: "Recuento y traspasos entre locales. Lo activás cuando lo usás.",
  },
  {
    label: "Roles admin y normal",
    detail: "Los vendedores cobran; los admins ven reportes y el equipo.",
  },
  {
    label: "Catálogo compartido",
    detail: "Los mismos productos en todas las tiendas de la cuenta.",
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
            Suscripción mensual en pesos. Probá 30 días y, en tu primera
            suscripción, los {INTRO_DISCOUNT_MONTHS} primeros meses van al 50%.
            Si el cobro falla, tenés un mes de gracia.
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
                <div className="mt-3">
                  {plan.price ? (
                    <>
                      {plan.priceList ? (
                        <p
                          className={cn(
                            "text-body-sm text-muted-foreground line-through",
                            plan.dark && "text-neutral-500",
                          )}
                        >
                          {plan.priceList}
                          {plan.priceNote}
                        </p>
                      ) : null}
                      <div className="flex items-baseline gap-1">
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
                      </div>
                      {plan.priceCaption ? (
                        <p
                          className={cn(
                            "mt-1 text-caption text-muted-foreground",
                            plan.dark && "text-neutral-400",
                          )}
                        >
                          {plan.priceCaption}
                        </p>
                      ) : null}
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

        <Reveal className="mt-8 md:mt-10">
          <div className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="text-body-sm font-medium text-foreground">
              En todos los planes
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-3">
              {includedInAll.map((item) => (
                <li key={item.label} className="flex items-start gap-2.5">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="text-body-sm text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-caption text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
