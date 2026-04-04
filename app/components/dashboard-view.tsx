import Link from "next/link";
import {
  dashboardTotalToday,
  dashboardTrend,
  todaySales,
  weekSalesBars,
} from "@/data";
import { TopAppBar } from "./top-app-bar";

type DashboardViewProps = {
  tiendaNombre?: string | null;
};

export function DashboardView({ tiendaNombre }: DashboardViewProps) {
  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref="/dashboard" />
      {tiendaNombre ? (
        <div className="border-b border-stone-200/60 bg-secondary-container/30 px-6 py-2 text-center text-sm font-medium text-on-secondary-container">
          Panel de{" "}
          <span className="font-headline font-bold text-secondary">{tiendaNombre}</span>
        </div>
      ) : null}
      <main className="mx-auto max-w-6xl space-y-10 px-6 pt-24">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-dim p-8 text-on-primary shadow-xl md:p-12">
          <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container/20 blur-3xl" />
          <div className="relative z-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-container">
                Total Sales Today
              </p>
              <h1 className="text-5xl font-extrabold tracking-tighter md:text-7xl">
                {dashboardTotalToday}
              </h1>
              <div className="flex items-center gap-2 text-sm font-medium text-secondary-container">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>{dashboardTrend}</span>
              </div>
            </div>
            <Link
              href="/new-sale"
              className="group flex items-center justify-center gap-3 rounded-full bg-surface-container-lowest px-8 py-4 font-bold text-primary shadow-lg transition-all duration-200 active:scale-95"
            >
              <span className="material-symbols-outlined">add_circle</span>
              <span>Nueva Venta</span>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Ventas de Hoy</h2>
              <Link
                href="/reports"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="space-y-3">
              {todaySales.map((item) => (
                <div
                  key={item.title}
                  className="group flex items-center justify-between rounded-2xl border border-stone-100 bg-surface-container-lowest p-4 transition-colors duration-200 hover:bg-surface-container-low"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container text-secondary">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{item.title}</p>
                      <p className="text-xs text-on-surface-variant">{item.meta}</p>
                    </div>
                  </div>
                  <p className="font-bold text-primary">{item.price}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Ventas del Mes</h2>
              <div className="flex gap-1 rounded-lg bg-surface-container-high p-1">
                <button
                  type="button"
                  className="rounded-md bg-surface-container-lowest px-3 py-1 text-xs font-bold shadow-sm"
                >
                  Sales
                </button>
                <button
                  type="button"
                  className="rounded-md px-3 py-1 text-xs font-medium text-on-surface-variant hover:text-on-surface"
                >
                  Volume
                </button>
              </div>
            </div>
            <div className="flex aspect-[16/9] items-end justify-between gap-2 rounded-[2rem] border border-stone-100 bg-surface-container-lowest p-8 md:gap-4 lg:aspect-auto lg:h-[320px]">
              {weekSalesBars.map((item) => (
                <div key={item.day} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    style={{ height: item.h }}
                    className={`group relative w-full rounded-t-xl transition-colors hover:bg-primary-dim ${
                      item.active ? "bg-primary" : "bg-primary-container/20"
                    }`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-on-surface px-2 py-1 text-[10px] text-surface opacity-0 transition-opacity group-hover:opacity-100">
                      {item.val}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      item.active ? "text-primary" : "text-stone-400"
                    }`}
                  >
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="flex min-h-[160px] flex-col justify-between rounded-[2rem] bg-secondary-container p-6 md:col-span-2">
            <span className="material-symbols-outlined text-3xl text-secondary">
              inventory_2
            </span>
            <div>
              <h3 className="font-bold text-on-secondary-container">Low Stock Items</h3>
              <p className="text-sm text-on-secondary-container/80">
                8 ingredients need restocking soon
              </p>
            </div>
          </div>
          <div className="flex min-h-[160px] flex-col justify-between rounded-[2rem] bg-surface-container-high p-6 md:col-span-1">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">
              group
            </span>
            <div>
              <h3 className="font-bold">Staff Active</h3>
              <p className="text-sm text-on-surface-variant">12 members on shift</p>
            </div>
          </div>
          <div className="flex min-h-[160px] flex-col justify-between rounded-[2rem] bg-tertiary-container p-6 text-on-tertiary-container md:col-span-1">
            <span className="material-symbols-outlined text-3xl">star</span>
            <div>
              <h3 className="font-bold">Bestseller</h3>
              <p className="text-sm opacity-80">Ribeye Steak Special</p>
            </div>
          </div>
        </div>
      </main>
      <Link
        href="/new-sale"
        className="group fixed right-6 bottom-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Nueva venta"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="pointer-events-none absolute right-full mr-4 rounded-lg bg-on-surface px-3 py-2 text-xs font-bold whitespace-nowrap text-surface opacity-0 transition-opacity group-hover:opacity-100">
          Nueva Venta
        </span>
      </Link>
    </div>
  );
}
