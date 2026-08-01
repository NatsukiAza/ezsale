import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/marketing/reveal";

const faqs = [
  {
    q: "¿Necesito instalar algo?",
    a: "No. EZSale corre en el navegador. Abrís la URL, iniciás sesión y cobrás. Funciona en notebook, escritorio y celular.",
  },
  {
    q: "¿Sirve para gastronomía y para comercio?",
    a: "Sí. El catálogo por categorías, los medios de pago y los reportes sirven igual para un café, un kiosco o una tienda de barrio.",
  },
  {
    q: "¿Puedo manejar varias tiendas con una cuenta?",
    a: "Sí, según el plan. Sucursales, Cadena y Empresa permiten multi-tienda. Cambiás de local sin cambiar de usuario.",
  },
  {
    q: "Si cambio el precio de un producto, ¿qué pasa con las ventas viejas?",
    a: "Nada. Al registrar una venta se congela el precio histórico. Los reportes siguen mostrando lo que cobraste ese día.",
  },
  {
    q: "¿Puedo limitar quién ve los reportes?",
    a: "Sí. Los usuarios con rol normal cargan ventas y ven el panel básico. Solo los admin acceden a Reportes y Equipo.",
  },
  {
    q: "¿Hasta cuándo llegan los reportes?",
    a: "Depende del plan: 2 años (Local), 4 años (Sucursales), 5 años (Cadena) o de por vida (Empresa).",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Sí. Desde Cuenta podés iniciar un nuevo checkout de Mercado Pago con otro plan. Si necesitás Empresa, escribinos a hola@ezsale.app.",
  },
  {
    q: "¿Se pueden ocultar los montos delante del cliente?",
    a: "Sí. Hay un toggle de privacidad en el panel y en reportes que oculta los importes sin perder el layout.",
  },
] as const;

export function LandingFaq() {
  return (
    <section
      id="preguntas"
      className="bg-surface-cream py-section md:py-section-lg"
    >
      <div className="mx-auto max-w-3xl px-6">
        <Reveal className="mb-8 text-center md:mb-10">
          <h2 className="text-section-title">Preguntas frecuentes</h2>
        </Reveal>

        <Reveal>
          <Accordion
            type="single"
            collapsible
            className="rounded-xl border border-border bg-card px-5"
          >
            {faqs.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
