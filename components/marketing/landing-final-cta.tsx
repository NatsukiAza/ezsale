import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export function LandingFinalCta() {
  return (
    <section className="bg-hero-radial py-section md:py-section-lg">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-section-title text-white">
            Empezá a cobrar con EZSale
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-white/75 md:text-base md:leading-relaxed">
            Creá tu tienda en minutos. Tenés 30 días de prueba sin tarjeta.
            Después activás el plan con Mercado Pago.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="xl">
              <Link href="/registro">
                Crear mi tienda
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
