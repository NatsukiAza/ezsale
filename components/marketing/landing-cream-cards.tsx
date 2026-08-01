import {
  EyeOff,
  FolderTree,
  Percent,
  Tag,
  UserCog,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const cards = [
  {
    icon: UserCog,
    title: "Roles admin y normal",
    body: "Los vendedores cobran; los admins ven reportes y gestionan el equipo.",
  },
  {
    icon: Percent,
    title: "Descuentos flexibles",
    body: "Porcentaje por línea o monto fijo sobre el ticket. El total se recalcula solo.",
  },
  {
    icon: Wallet,
    title: "Medios de pago",
    body: "Efectivo, Mercado Pago, tarjeta, transferencia — o los que uses vos.",
  },
  {
    icon: Tag,
    title: "Precio histórico",
    body: "Al vender se congela el precio. Cambiá el catálogo sin romper reportes viejos.",
  },
  {
    icon: EyeOff,
    title: "Ocultar importes",
    body: "Un toque y los montos se ocultan si hay un cliente mirando la pantalla.",
  },
  {
    icon: FolderTree,
    title: "Categorías y subcategorías",
    body: "Organizá el catálogo como en el local: cafés, panadería, salados, etc.",
  },
] as const;

export function LandingCreamCards() {
  return (
    <section className="bg-surface-cream py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-8 max-w-2xl text-center md:mb-10">
          <h2 className="text-section-title">Lo que ya viene resuelto</h2>
          <p className="mt-3 text-body text-muted-foreground md:text-base md:leading-relaxed">
            Detalles del día a día que no deberían ser un proyecto aparte.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.title} delay={i * 0.04}>
                <article className="h-full rounded-xl border border-border bg-card p-5 shadow-overlay-sm">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-md bg-surface-sunken">
                    <Icon
                      className="size-[18px] text-foreground"
                      strokeWidth={1.75}
                    />
                  </div>
                  <h3 className="text-h3">{card.title}</h3>
                  <p className="mt-2 text-body-sm text-muted-foreground">
                    {card.body}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
