import { reportSalesRows, reportsPaymentMethods } from "@/data";
import { TopAppBar } from "./top-app-bar";

type ReportsViewProps = {
  activeHref: "/sales" | "/reports";
};

export function ReportsView({ activeHref }: ReportsViewProps) {
  return (
    <div className="min-h-screen pb-12">
      <TopAppBar activeHref={activeHref} title="Reportes de Ventas" />
      <main className="mx-auto max-w-5xl px-6 pt-28 pb-20">
        <section className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <h2 className="font-headline mb-4 text-sm font-bold tracking-[0.1em] text-on-surface-variant uppercase">
              Seleccionar Periodo
            </h2>
            <div className="inline-flex rounded-full bg-surface-container p-1">
              <button
                type="button"
                className="rounded-full bg-surface-container-lowest px-8 py-2 text-sm font-bold text-primary shadow-sm transition-all"
              >
                Mensual
              </button>
              <button
                type="button"
                className="rounded-full px-8 py-2 text-sm font-medium text-on-surface-variant transition-all hover:text-on-surface"
              >
                Anual
              </button>
            </div>
          </div>
          <div className="text-right">
            <span className="font-label mb-1 block text-xs tracking-widest text-on-surface-variant uppercase">
              Total Facturado Octubre
            </span>
            <div className="font-headline text-5xl font-extrabold tracking-tighter text-primary">
              $2.485.200
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-secondary">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span className="text-sm font-medium">+12.4% vs mes anterior</span>
            </div>
          </div>
        </section>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col justify-between rounded-3xl border border-stone-100 bg-surface-container-low p-8 md:col-span-1">
            <div>
              <h3 className="font-headline mb-6 text-lg font-bold">Métodos de Pago</h3>
              <div className="space-y-4">
                {reportsPaymentMethods.map((m) => (
                  <div key={m.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${m.colorClass}`} />
                      <span className="text-sm font-medium">{m.label}</span>
                    </div>
                    <span className="text-sm font-bold">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 border-t border-outline-variant/10 pt-6">
              <button
                type="button"
                className="w-full rounded-xl bg-surface-container-lowest py-3 text-sm font-bold text-primary shadow-sm transition-all hover:bg-white"
              >
                Ver detalles
              </button>
            </div>
          </div>

          <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl border border-stone-100 bg-surface-container-highest p-8 md:col-span-2">
            <div className="relative z-10">
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Crecimiento Diario
              </h3>
              <p className="text-sm text-on-surface-variant">
                Ventas brutas registradas por día
              </p>
            </div>
            <div className="absolute bottom-0 left-0 flex h-48 w-full items-end gap-2 px-4">
              <div className="h-[40%] flex-1 rounded-t-lg bg-primary/20" />
              <div className="h-[60%] flex-1 rounded-t-lg bg-primary/20" />
              <div className="h-[55%] flex-1 rounded-t-lg bg-primary/20" />
              <div className="h-[75%] flex-1 rounded-t-lg bg-primary/30" />
              <div className="h-[90%] flex-1 rounded-t-lg bg-primary/40" />
              <div className="h-full flex-1 rounded-t-lg bg-primary shadow-[0_0_20px_rgba(160,65,45,0.2)]" />
              <div className="h-[45%] flex-1 rounded-t-lg bg-primary/20" />
            </div>
          </div>
        </div>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-headline text-2xl font-bold tracking-tight">
              Ventas Detalladas
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-container-high"
                aria-label="Filtrar"
              >
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-container-high"
                aria-label="Descargar"
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-stone-100 bg-surface-container-lowest shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-8 py-5 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                      Fecha & Hora
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                      Items Vendidos
                    </th>
                    <th className="px-8 py-5 text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                      Metodo
                    </th>
                    <th className="px-8 py-5 text-right text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">
                      Monto Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {reportSalesRows.map((row) => (
                    <tr key={row.ticket} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="font-medium">{row.time}</div>
                        <div className="text-xs text-on-surface-variant">{row.ticket}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="max-w-xs truncate text-sm">{row.items}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.method === "Efectivo"
                              ? "bg-surface-container-high text-on-surface-variant"
                              : "bg-secondary-container text-on-secondary-container"
                          }`}
                        >
                          {row.method}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-headline font-bold text-primary">
                        {row.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
