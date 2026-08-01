import { Reveal } from "@/components/marketing/reveal";
import { PosMock } from "@/components/marketing/mock/pos-mock";
import { MetricsSnippet } from "@/components/marketing/mock/metrics-snippet";
import { PaymentSnippet } from "@/components/marketing/mock/payment-snippet";

const blocks = [
  {
    title: "Una venta, tres toques",
    body: "Elegí el producto, confirmá el medio de pago y listo. Descuentos por línea o por ticket, sin salir del carrito.",
    visual: "pos" as const,
  },
  {
    title: "Los números sin planillas",
    body: "Total del día, ticket promedio y ventas de la semana en el panel. Sin exportar a Excel para saber cómo vas.",
    visual: "metrics" as const,
  },
  {
    title: "Todas tus sucursales, una cuenta",
    body: "Mirá el desglose por medio de pago y el historial por período. Ideal si tenés más de un local.",
    visual: "payments" as const,
  },
];

export function LandingFeatures() {
  return (
    <section id="producto" className="bg-background py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
          <h2 className="text-section-title">Todo el mostrador en una pantalla</h2>
          <p className="mt-3 text-body text-muted-foreground md:text-base md:leading-relaxed">
            Ventas, catálogo, reportes y equipo. Lo que necesitás para cobrar y
            entender el negocio, sin herramientas de más.
          </p>
        </Reveal>

        <div className="space-y-14 md:space-y-16">
          {blocks.map((block, i) => (
            <Reveal key={block.title}>
              <div
                className={
                  i % 2 === 1
                    ? "grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16 [&_>div:first-child]:md:order-2"
                    : "grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16"
                }
              >
                <div>
                  <h3 className="font-display text-h1 tracking-tight">
                    {block.title}
                  </h3>
                  <p className="mt-3 max-w-md text-body text-muted-foreground md:text-base md:leading-relaxed">
                    {block.body}
                  </p>
                </div>
                <div>
                  {block.visual === "pos" ? (
                    <PosMock animateCart className="shadow-overlay-sm" />
                  ) : null}
                  {block.visual === "metrics" ? <MetricsSnippet /> : null}
                  {block.visual === "payments" ? <PaymentSnippet /> : null}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
