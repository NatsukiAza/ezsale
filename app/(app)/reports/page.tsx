import { ReportsView } from "./_components/reports-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { getPlan, parsePlanId } from "@/lib/billing/plans";
import { getReportesMinDate } from "@/lib/billing/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const REPORTS_PAGE_SIZE = 50;

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStartEnd(y: number, m: number): { start: Date; end: Date } {
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 1, 0, 0, 0, 0);
  return { start, end };
}

function medioLabel(
  medios: { nombre: string } | { nombre: string }[] | null,
): string {
  if (!medios) return "—";
  if (Array.isArray(medios)) return medios[0]?.nombre ?? "—";
  return medios.nombre;
}

export default async function ReportsPage() {
  const { supabase, user, perfil, tienda } = await getPerfilTienda();
  if (!supabase || !user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");
  if (!perfil.id_tienda) redirect("/seleccionar-tienda");
  if (perfil.rol !== "admin" && perfil.rol !== "manager") {
    redirect("/dashboard");
  }

  const idOrganizacion = perfil.id_organizacion;
  const idTienda = perfil.id_tienda;
  const plan = getPlan(parsePlanId(tienda?.plan));
  const minDate = getReportesMinDate(plan.reportesAnios);
  const reportesMinYmd = minDate ? toYmd(minDate) : null;

  const now = new Date();
  let { start, end } = monthStartEnd(now.getFullYear(), now.getMonth() + 1);
  if (reportesMinYmd) {
    const minStart = new Date(
      Number(reportesMinYmd.slice(0, 4)),
      Number(reportesMinYmd.slice(5, 7)) - 1,
      Number(reportesMinYmd.slice(8, 10)),
      0,
      0,
      0,
      0,
    );
    if (start < minStart) start = minStart;
  }

  const listSelect = `
        id,
        fecha_venta,
        monto_total,
        descuento_monto,
        id_usuario,
        id_medio_pago,
        medios_pago ( nombre )
      `;

  const [ventasRes, summaryRes, perfilesRes] = await Promise.all([
    supabase
      .from("ventas")
      .select(listSelect)
      .eq("id_tienda", idTienda)
      .gte("fecha_venta", start.toISOString())
      .lt("fecha_venta", end.toISOString())
      .order("fecha_venta", { ascending: false })
      .range(0, REPORTS_PAGE_SIZE - 1),
    supabase
      .from("ventas")
      .select("monto_total, id_medio_pago, medios_pago ( nombre )")
      .eq("id_tienda", idTienda)
      .gte("fecha_venta", start.toISOString())
      .lt("fecha_venta", end.toISOString()),
    supabase
      .from("perfiles")
      .select("id, nombre, apellido")
      .eq("id_organizacion", idOrganizacion)
      .or(`id_tienda.eq.${idTienda},id_tienda.is.null`),
  ]);

  const namesByUser: Record<string, string> = {};
  for (const p of perfilesRes.data ?? []) {
    const full = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim();
    namesByUser[p.id as string] = full || "Usuario";
  }

  const initialVentas = (ventasRes.data ?? []).map((row) => ({
    id: row.id as string,
    fecha_venta: row.fecha_venta as string,
    monto_total: row.monto_total as number | string,
    descuento_monto: (row.descuento_monto as number | string | null) ?? 0,
    id_usuario: row.id_usuario as string,
    id_medio_pago: row.id_medio_pago as string,
    medios_pago: row.medios_pago as
      | { nombre: string }
      | { nombre: string }[]
      | null,
    detalle_ventas: null as null,
  }));

  let totalMonto = 0;
  const mediosMap = new Map<string, number>();
  for (const row of summaryRes.data ?? []) {
    const monto = Number(row.monto_total);
    totalMonto += monto;
    const label = medioLabel(
      row.medios_pago as { nombre: string } | { nombre: string }[] | null,
    );
    mediosMap.set(label, (mediosMap.get(label) ?? 0) + monto);
  }
  const totalCount = summaryRes.data?.length ?? 0;
  const mediosEntries = [...mediosMap.entries()].sort((a, b) => b[1] - a[1]);
  const mediosTotal = mediosEntries.reduce((s, [, n]) => s + n, 0) || 1;

  return (
    <ReportsView
      idTienda={idTienda}
      idOrganizacion={idOrganizacion}
      initialVentas={initialVentas}
      initialNamesByUser={namesByUser}
      initialLoadError={
        ventasRes.error?.message ?? summaryRes.error?.message ?? null
      }
      initialSummary={{
        totalMonto,
        totalCount,
        mediosBreakdown: mediosEntries.map(([label, amount]) => ({
          label,
          amount,
          pct: Math.round((amount / mediosTotal) * 1000) / 10,
        })),
      }}
      initialHasMore={totalCount > initialVentas.length}
      reportesMinYmd={reportesMinYmd}
    />
  );
}
