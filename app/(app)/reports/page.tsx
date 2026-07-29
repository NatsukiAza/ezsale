import { ReportsView } from "./_components/reports-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function todayLocalYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayStartEnd(ymd: string): { start: Date; end: Date } {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { start, end };
}

export default async function ReportsPage() {
  const { supabase, user, perfil } = await getPerfilTienda();
  if (!supabase || !user) redirect("/");
  if (!perfil?.id_tienda) redirect("/registro/completar");
  if (perfil.rol !== "admin") redirect("/dashboard");

  const idTienda = perfil.id_tienda;
  const { start, end } = dayStartEnd(todayLocalYmd());

  const [ventasRes, perfilesRes] = await Promise.all([
    supabase
      .from("ventas")
      .select(
        `
        id,
        fecha_venta,
        monto_total,
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
      .eq("id_tienda", idTienda),
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
      initialVentas={initialVentas}
      initialNamesByUser={namesByUser}
      initialLoadError={ventasRes.error?.message ?? null}
    />
  );
}
