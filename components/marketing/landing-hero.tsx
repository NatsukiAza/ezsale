"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotebookFrame } from "@/components/marketing/device/notebook-frame";
import { DashboardMock } from "@/components/marketing/mock/dashboard-mock";
import { Reveal, RevealHeroMock } from "@/components/marketing/reveal";

export function LandingHero() {
  const [loadVideo, setLoadVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (reduce || !desktop) return;

    const id = window.requestAnimationFrame(() => setLoadVideo(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!loadVideo || !videoRef.current) return;
    const el = videoRef.current;
    const play = () => {
      void el.play().catch(() => {
        /* autoplay bloqueado: el poster/radial alcanza */
      });
    };
    if (el.readyState >= 2) play();
    else el.addEventListener("loadeddata", play, { once: true });
  }, [loadVideo]);

  return (
    <section className="relative overflow-hidden bg-hero-radial pt-14 text-white">
      <div className="absolute inset-0">
        {loadVideo ? (
          <video
            ref={videoRef}
            className="h-full w-full scale-105 object-cover opacity-50 blur-[2px]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          >
            <source src="/landing/hero.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div className="absolute inset-0 bg-neutral-950/45" />
        <div className="absolute inset-0 bg-hero-radial-overlay" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-8 md:pt-24 md:pb-12">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-body-sm font-medium text-white/70">
            Punto de venta para comercios y gastronomía
          </p>
          <h1 className="text-hero text-white">
            Cobrá en segundos. Entendé tu negocio.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-body text-white/75 md:text-base md:leading-relaxed">
            EZSale es el punto de venta para comercios y gastronomía en
            Argentina. Cargá una venta en tres toques, mirá los números del día
            al instante y manejá todas tus sucursales desde una sola cuenta.
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
              <a href="#precios">Ver precios</a>
            </Button>
          </div>
        </Reveal>

        <RevealHeroMock className="mt-14 md:mt-16">
          <NotebookFrame>
            <DashboardMock />
          </NotebookFrame>
        </RevealHeroMock>
      </div>
    </section>
  );
}
