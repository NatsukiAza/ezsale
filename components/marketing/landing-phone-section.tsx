import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneFrame } from "@/components/marketing/device/phone-frame";
import { PosPhoneMock } from "@/components/marketing/mock/pos-phone-mock";
import { Reveal } from "@/components/marketing/reveal";
import { InstallButton } from "@/components/pwa/install-button";

export function LandingPhoneSection() {
  return (
    <section className="bg-clay-field overflow-hidden py-section md:py-section-lg">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-2 md:gap-16">
        <Reveal>
          <p className="mb-3 text-body-sm font-medium text-white/70">
            También en el bolsillo
          </p>
          <h2 className="text-section-title text-white">
            También desde el celular
          </h2>
          <p className="mt-4 max-w-md text-body text-white/80 md:text-base md:leading-relaxed">
            El carrito completo en la mano: productos, descuentos, medios de pago
            y total. Ideal para mesas, ferias o cuando el mostrador está lejos.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              size="xl"
              className="bg-white text-[var(--clay-800)] hover:bg-white/90"
            >
              <Link href="/registro">
                Crear mi tienda
                <ArrowRight />
              </Link>
            </Button>
            <InstallButton
              size="xl"
              variant="outline"
              className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            />
          </div>
        </Reveal>

        <Reveal delay={0.1} y={24} className="flex justify-center md:justify-end">
          <PhoneFrame className="w-[min(100%,18rem)] md:w-[20rem] md:translate-y-4">
            <PosPhoneMock />
          </PhoneFrame>
        </Reveal>
      </div>
    </section>
  );
}
