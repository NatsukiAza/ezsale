"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Receipt } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/app/page-header";
import { MetricTile } from "@/components/app/metric-tile";
import { Money, AnimatedCount } from "@/components/app/money";
import { PrivacyToggle } from "@/components/app/privacy";
import { EmptyState } from "@/components/app/empty-state";
import { Sparkline } from "@/components/app/sparkline";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatArs } from "@/lib/format";
import { cn } from "@/lib/utils";

export type VentaHoyLinea = {
  nombre: string;
  cantidad: number;
};

export type VentaHoyItem = {
  id: string;
  vendedor: string;
  hora: string;
  monto: number;
  descuentoMonto: number;
  items: number;
  lineas: VentaHoyLinea[];
};

export type DiaSemanaItem = {
  dateKey: string;
  label: string;
  monto: number;
  esHoy: boolean;
};

export type BestsellerItem = {
  nombre: string;
  unidades: number;
};

type DashboardViewProps = {
  tiendaNombre?: string | null;
  /** Nombre de pila para el saludo del panel. */
  firstName?: string | null;
  esAdmin?: boolean;
  totalHoy: number;
  enCajaHoy: number;
  cantidadVentasHoy: number;
  ventasHoy: VentaHoyItem[];
  diasSemana: DiaSemanaItem[];
  totalSemana: number;
  bestsellers: BestsellerItem[];
};

function panelGreeting(firstName?: string | null): string {
  const h = new Date().getHours();
  const part =
    h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const name = firstName?.trim();
  return name ? `${part}, ${name}` : part;
}

const chartConfig = {
  monto: {
    label: "Ventas",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DashboardView({
  tiendaNombre,
  firstName,
  esAdmin = true,
  totalHoy,
  enCajaHoy,
  cantidadVentasHoy,
  ventasHoy,
  diasSemana,
  totalSemana,
  bestsellers,
}: DashboardViewProps) {
  const ticketPromedio =
    cantidadVentasHoy > 0 ? totalHoy / cantidadVentasHoy : 0;
  const [expanded, setExpanded] = useState<string | null>(null);
  const sparkValues = diasSemana.map((d) => d.monto);

  return (
    <div className="pb-10">
      <PageHeader
        title={panelGreeting(firstName)}
        titleClassName="text-greeting"
        description={tiendaNombre ?? undefined}
        actions={
          <>
            <PrivacyToggle />
            <Button asChild>
              <Link href="/new-sale" prefetch>
                <Plus />
                Nueva venta
              </Link>
            </Button>
          </>
        }
      />

      <div className="space-y-8 px-6 py-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
          <MetricTile
            hero
            label="Total de hoy"
            staggerMs={0}
            value={<Money value={totalHoy} display animate />}
            secondary={
              <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span>En caja</span>
                <span className="text-[1.25rem] font-medium leading-7 text-foreground">
                  <Money value={enCajaHoy} display animate />
                </span>
              </span>
            }
            hint={
              cantidadVentasHoy === 0
                ? "Todavía no vendiste nada hoy — ¿arrancamos?"
                : undefined
            }
          />
          <MetricTile
            label="Ventas de hoy"
            staggerMs={80}
            value={<AnimatedCount value={cantidadVentasHoy} />}
            hint={
              cantidadVentasHoy === 0
                ? "Sin tickets aún"
                : cantidadVentasHoy === 1
                  ? "1 ticket registrado"
                  : `${cantidadVentasHoy} tickets registrados`
            }
          />
          <MetricTile
            label="Ticket promedio"
            staggerMs={160}
            value={<Money value={ticketPromedio} display animate />}
            hint={
              cantidadVentasHoy === 0 ? "Cuando haya ventas" : undefined
            }
          />
          <MetricTile
            label="Total semana"
            staggerMs={240}
            value={<Money value={totalSemana} display animate />}
            hint="Últimos 7 días"
            footer={<Sparkline values={sparkValues} />}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-h2">Ventas de la semana</h2>
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/caja">Ver caja</Link>
                </Button>
                {esAdmin ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/reports">Ver reportes</Link>
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart
                  data={diasSemana}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) =>
                      typeof v === "number" && v >= 1000
                        ? `${Math.round(v / 1000)}k`
                        : String(v)
                    }
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          formatArs(Number(value ?? 0))
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="monto"
                    fill="var(--color-monto)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-h2">Top productos</h2>
            <div className="rounded-lg border bg-card">
              {bestsellers.length === 0 ? (
                <p className="px-4 py-8 text-center text-body-sm text-muted-foreground">
                  Todavía no hay top — las primeras ventas del día se anotan acá.
                </p>
              ) : (
                <ol className="divide-y divide-border">
                  {bestsellers.map((b, i) => (
                    <li
                      key={`${b.nombre}-${i}`}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-caption font-semibold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate text-sm font-medium">
                          {b.nombre}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-body-sm tabular-nums text-muted-foreground">
                        {b.unidades} u.
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-h2">Ventas de hoy</h2>
              {cantidadVentasHoy > 5 ? (
                <p className="text-caption text-muted-foreground">
                  Últimas 5 · {cantidadVentasHoy} en total
                </p>
              ) : null}
            </div>
            {esAdmin ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/reports">Ver todas</Link>
              </Button>
            ) : null}
          </div>

          {ventasHoy.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Todavía no vendiste nada hoy — ¿arrancamos?"
              description="La primera venta del día aparece acá en cuanto la registres."
              action={
                <Button asChild>
                  <Link href="/new-sale">
                    <Plus />
                    Nueva venta
                  </Link>
                </Button>
              }
            />
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow className="hover:bg-transparent">
                  <DataTableHead className="w-8" />
                  <DataTableHead>Hora</DataTableHead>
                  <DataTableHead>Vendedor</DataTableHead>
                  <DataTableHead className="text-right">Ítems</DataTableHead>
                  <DataTableHead className="text-right">Monto</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {ventasHoy.map((v) => {
                  const isOpen = expanded === v.id;
                  return (
                    <Fragment key={v.id}>
                      <DataTableRow
                        className={cn(isOpen && "bg-muted/40")}
                      >
                        <DataTableCell className="w-8 pr-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={
                              isOpen ? "Ocultar detalle" : "Ver detalle"
                            }
                            aria-expanded={isOpen}
                            onClick={() =>
                              setExpanded(isOpen ? null : v.id)
                            }
                          >
                            {isOpen ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </Button>
                        </DataTableCell>
                        <DataTableCell className="font-mono tabular-nums text-muted-foreground">
                          {v.hora}
                        </DataTableCell>
                        <DataTableCell>{v.vendedor}</DataTableCell>
                        <DataTableCell className="text-right font-mono tabular-nums">
                          {v.items}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span
                              className={cn(
                                v.descuentoMonto > 0 &&
                                  "text-amber-700 dark:text-amber-400",
                              )}
                            >
                              <Money value={v.monto} />
                            </span>
                            {v.descuentoMonto > 0 ? (
                              <span className="text-caption text-amber-700 dark:text-amber-400">
                                −{formatArs(v.descuentoMonto)}
                              </span>
                            ) : null}
                          </div>
                        </DataTableCell>
                      </DataTableRow>
                      {isOpen ? (
                        <DataTableRow className="hover:bg-transparent">
                          <DataTableCell
                            colSpan={5}
                            className="bg-surface-sunken/60 py-3"
                          >
                            {v.lineas.length === 0 ? (
                              <p className="text-body-sm text-muted-foreground">
                                Sin detalle de productos.
                              </p>
                            ) : (
                              <ul className="space-y-1.5 pl-8">
                                {v.lineas.map((line, idx) => (
                                  <li
                                    key={`${v.id}-line-${idx}`}
                                    className="text-body-sm"
                                  >
                                    <span className="font-mono tabular-nums text-muted-foreground">
                                      {line.cantidad}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {" "}
                                      ×{" "}
                                    </span>
                                    <span className="font-medium">
                                      {line.nombre}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </DataTableCell>
                        </DataTableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </section>
      </div>
    </div>
  );
}
