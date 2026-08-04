import { ReportsView } from "./_components/reports-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { getPlan, parsePlanId } from "@/lib/billing/plans";
import { getReportesMinDate } from "@/lib/billing/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function todayLocalYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayStartEnd(ymd: string): { start: Date; end: Date } {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { start, end };
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

  const { start, end } = dayStartEnd(todayLocalYmd());

  const [ventasRes, perfilesRes] = await Promise.all([
    supabase
      .from("ventas")
      .select(
        `
        id,
        fecha_venta,
        monto_total,
        descuento_monto,
        id_usuario,
        id_medio_pago,
        medios_pago ( nombre )
      `,
      )
      .eq("id_tienda", idTienda)
      .gte("fecha_venta", start.toISOString())
      .lt("fecha_venta", end.toISOString())
      .order("fecha_venta", { ascending: false }),
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

  return (
    <ReportsView
      idTienda={idTienda}
      idOrganizacion={idOrganizacion}
      initialVentas={initialVentas}
      initialNamesByUser={namesByUser}
      initialLoadError={ventasRes.error?.message ?? null}
      reportesMinYmd={reportesMinYmd}
    />
  );
}
