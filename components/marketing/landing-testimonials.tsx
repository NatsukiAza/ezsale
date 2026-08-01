import Image from "next/image";
import { Reveal } from "@/components/marketing/reveal";

const testimonials = [
  {
    quote:
      "Gracias a EZSale pudimos pasar de un excel con ventas a un sistema que cumple todas nuestras necesidades y es fácil de usar.",
    name: "Carolina",
    role: "Dueña",
    place: "Sacred Coffee",
    logo: "/landing/logos-testimonios/logo-sacred.png",
    logoAlt: "Sacred Coffee",
  },
  {
    quote:
      "Ahora me es más fácil registrar mis ventas y puedo ocupar más tiempo a otras tareas del trabajo.",
    name: "Sergio",
    role: "Dueño",
    place: "Magoo Bikes",
    logo: "/landing/logos-testimonios/logo-magoobikes.jpg",
    logoAlt: "Magoo Bikes",
  },
] as const;

export function LandingTestimonials() {
  return (
    <section className="bg-background py-section md:py-section-lg">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
          <h2 className="text-section-title">Quienes ya cobran con EZSale</h2>
          <p className="mt-4 text-body text-muted-foreground md:text-base md:leading-relaxed">
            Comercios reales que dejaron el Excel y el cuaderno atrás.
          </p>
        </Reveal>

        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.05}>
              <blockquote className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
                <Image
                  src={t.logo}
                  alt={t.logoAlt}
                  width={120}
                  height={40}
                  className="mb-4 h-8 w-auto object-contain"
                  style={{ width: "auto" }}
                />
                <p className="flex-1 text-body text-foreground md:leading-relaxed">
                  “{t.quote}”
                </p>
                <footer className="mt-5 border-t border-border pt-4">
                  <p className="text-label text-foreground">{t.name}</p>
                  <p className="text-caption text-muted-foreground">
                    {t.role} · {t.place}
                  </p>
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
