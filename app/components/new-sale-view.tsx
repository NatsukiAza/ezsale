"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { newSaleCategories, newSaleProducts, newSaleSubfilters } from "@/data";

export function NewSaleView() {
  const router = useRouter();
  const [cartCount, setCartCount] = useState(3);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface">
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-stone-50/80 px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-full p-2 text-primary transition-colors duration-200 hover:bg-stone-100 active:scale-95"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline text-xl font-extrabold tracking-tighter text-primary-dim">
            EZSale
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100"
            aria-label="Buscar"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        </div>
        <div className="absolute right-0 bottom-0 left-0 h-px bg-stone-200/50" />
      </nav>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pt-24 pb-40">
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="font-label text-[10px] font-medium tracking-widest text-stone-500 uppercase">
              Categorías
            </span>
          </div>
          <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
            {newSaleCategories.map((cat, i) => (
              <button
                key={cat}
                type="button"
                className={`shrink-0 rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                  i === 0
                    ? "bg-primary text-on-primary shadow-md"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="flex items-center gap-4 rounded-2xl bg-surface-container-low p-3">
          <span className="pl-2 font-label text-[10px] font-medium tracking-widest text-stone-500 uppercase">
            Viendo:
          </span>
          <div className="flex gap-2">
            {newSaleSubfilters.map((label, i) => (
              <button
                key={label}
                type="button"
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                  i === 0
                    ? "bg-primary-container/20 text-primary"
                    : "font-medium text-stone-500 hover:bg-stone-200/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {newSaleProducts.map((prod) => (
            <div
              key={prod.name}
              className="group flex items-center justify-between rounded-2xl border border-stone-100 bg-surface-container-lowest p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="space-y-1">
                <h3 className="font-bold text-on-surface">{prod.name}</h3>
                <p className="font-bold text-primary">{prod.price}</p>
              </div>
              <button
                type="button"
                onClick={() => setCartCount((c) => c + 1)}
                className="flex items-center justify-center rounded-full bg-primary p-3 text-on-primary shadow-lg transition-transform active:scale-90"
                aria-label={`Agregar ${prod.name}`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  add
                </span>
              </button>
            </div>
          ))}
        </section>

        <div className="fixed right-4 bottom-10 left-4 z-40 mx-auto max-w-5xl">
          <div className="flex items-center justify-between rounded-3xl border border-primary/10 bg-surface-container-lowest p-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-4 pl-2">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container/30 text-primary">
                <span className="material-symbols-outlined">shopping_basket</span>
                <span className="absolute -top-2 -right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-on-primary">
                  {cartCount}
                </span>
              </div>
              <div>
                <p className="font-label text-[10px] tracking-widest text-stone-500 uppercase">
                  Total a pagar
                </p>
                <p className="font-headline text-xl font-extrabold text-on-surface">
                  ${(cartCount * 7.5).toFixed(2)}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              Continuar
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        <section className="mt-12 mb-12 space-y-8 rounded-[2.5rem] border border-stone-200/50 bg-stone-100 p-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-primary">payments</span>
            <h2 className="font-headline text-xl font-extrabold">Método de Pago</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-primary bg-surface-container-lowest p-5 font-bold text-primary shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">payments</span>
              <span className="text-xs">Efectivo</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-stone-200 bg-surface-container-lowest p-5 font-medium text-stone-500 transition-colors hover:bg-stone-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">qr_code_2</span>
              <span className="text-xs">Mercado Pago</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-stone-200 bg-surface-container-lowest p-5 font-medium text-stone-500 transition-colors hover:bg-stone-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-3xl">credit_card</span>
              <span className="text-xs">Tarjeta</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex w-full items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-primary to-primary-dim py-6 text-xl font-bold text-on-primary shadow-xl shadow-primary/30 transition-transform active:scale-95"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            Registrar Venta
          </button>
        </section>
      </main>
    </div>
  );
}
