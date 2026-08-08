import { CajaView } from "./_components/caja-view";
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

export default async function CajaPage() {
  const { supabase, user, perfil, tiendaNombre } = await getPerfilTienda();
  if (!supabase || !user) redirect("/login");
  if (!perfil?.id_organizacion) redirect("/registro/completar");
  if (!perfil.id_tienda) redirect("/seleccionar-tienda");

  const idTienda = perfil.id_tienda;
  const canManageGastos =
    perfil.rol === "admin" || perfil.rol === "manager";
  const { start, end } = dayStartEnd(todayLocalYmd());

  const [ventasRes, gastosRes] = await Promise.all([
    supabase
      .from("ventas")
      .select(
        `
        id,
        fecha_venta,
        monto_total,
        id_medio_pago,
        medios_pago ( nombre )
      `,
      )
      .eq("id_tienda", idTienda)
      .gte("fecha_venta", start.toISOString())
      .lt("fecha_venta", end.toISOString())
      .order("fecha_venta", { ascending: false }),
    supabase
      .from("gastos")
      .select("id, monto, descripcion, fecha_gasto, id_usuario")
      .eq("id_tienda", idTienda)
      .gte("fecha_gasto", start.toISOString())
      .lt("fecha_gasto", end.toISOString())
      .order("fecha_gasto", { ascending: false }),
  ]);

  const initialVentas = (ventasRes.data ?? []).map((row) => ({
    id: row.id as string,
    fecha_venta: row.fecha_venta as string,
    monto_total: row.monto_total as number | string,
    id_medio_pago: row.id_medio_pago as string,
    medios_pago: row.medios_pago as
      | { nombre: string }
      | { nombre: string }[]
      | null,
  }));

  const initialGastos = (gastosRes.data ?? []).map((row) => ({
    id: row.id as string,
    monto: row.monto as number | string,
    descripcion: row.descripcion as string,
    fecha_gasto: row.fecha_gasto as string,
    id_usuario: row.id_usuario as string,
  }));

  const loadError =
    ventasRes.error?.message ?? gastosRes.error?.message ?? null;

  return (
    <CajaView
      idTienda={idTienda}
      tiendaNombre={tiendaNombre}
      canManageGastos={canManageGastos}
      initialDayYmd={todayLocalYmd()}
      initialVentas={initialVentas}
      initialGastos={initialGastos}
      initialLoadError={loadError}
    />
  );
}
