import type { Metadata } from "next";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingCreamCards } from "@/components/marketing/landing-cream-cards";
import { LandingPhoneSection } from "@/components/marketing/landing-phone-section";
import { LandingTestimonials } from "@/components/marketing/landing-testimonials";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { LandingFinalCta } from "@/components/marketing/landing-final-cta";
import { LandingFooter } from "@/components/marketing/landing-footer";

export const metadata: Metadata = {
  title: "EZSale — Punto de venta para comercios y gastronomía",
  description:
    "Cargá una venta en tres toques, mirá los números del día y manejá todas tus sucursales desde una sola cuenta.",
};

export default function MarketingHomePage() {
  return (
    <>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingCreamCards />
        <LandingPhoneSection />
        <LandingTestimonials />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
