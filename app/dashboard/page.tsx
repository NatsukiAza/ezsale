import { DashboardView } from "@/app/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const DIA_CORTO_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function loadDashboardData(supabase: SupabaseClient, idTienda: string) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d = now.getUTCDate();

  const todayStart = new Date(Date.UTC(y, mo, d, 0, 0, 0));
  const todayEnd = new Date(Date.UTC(y, mo, d + 1, 0, 0, 0));
  const weekStart = new Date(Date.UTC(y, mo, d - 6, 0, 0, 0));
  const weekEnd = todayEnd;

  const { data: ventasHoyRows, error: eHoy } = await supabase
    .from("ventas")
    .select("id, id_usuario, monto_total, fecha_venta")
    .eq("id_tienda", idTienda)
    .gte("fecha_venta", todayStart.toISOString())
    .lt("fecha_venta", todayEnd.toISOString())
    .order("fecha_venta", { ascending: false });

  if (eHoy) {
    return { error: eHoy.message } as const;
  }

  const rowsHoy = ventasHoyRows ?? [];
  const totalHoy = rowsHoy.reduce((s, v) => s + Number(v.monto_total), 0);
  const cantidadVentasHoy = rowsHoy.length;

  const uids = [...new Set(rowsHoy.map((v) => v.id_usuario))];
  const nameByUser = new Map<string, string>();
  if (uids.length > 0) {
    const { data: perfiles, error: pe } = await supabase
      .from("perfiles")
      .select("id, nombre, apellido")
      .in("id", uids);
    if (!pe && perfiles) {
      for (const p of perfiles) {
        const nombre = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "Usuario";
        nameByUser.set(p.id, nombre);
      }
    }
  }

  const vidsHoy = rowsHoy.map((v) => v.id);
  const itemsByVenta = new Map<string, number>();
  if (vidsHoy.length > 0) {
    const { data: dets, error: de } = await supabase
      .from("detalle_ventas")
      .select("id_venta, cantidad")
      .in("id_venta", vidsHoy);
    if (!de && dets) {
      for (const row of dets) {
        const vid = row.id_venta as string;
        itemsByVenta.set(vid, (itemsByVenta.get(vid) ?? 0) + Number(row.cantidad));
      }
    }
  }

  const ventasHoy = rowsHoy.map((v) => {
    const fv = new Date(v.fecha_venta as string);
    const hora = fv.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return {
      id: v.id as string,
      vendedor: nameByUser.get(v.id_usuario as string) ?? "Usuario",
      hora,
      monto: Number(v.monto_total),
      items: itemsByVenta.get(v.id as string) ?? 0,
    };
  });

  const { data: ventasSemanaRows, error: eSem } = await supabase
    .from("ventas")
    .select("monto_total, fecha_venta")
    .eq("id_tienda", idTienda)
    .gte("fecha_venta", weekStart.toISOString())
    .lt("fecha_venta", weekEnd.toISOString());

  if (eSem) {
    return { error: eSem.message } as const;
  }

  const montoPorDia = new Map<string, number>();
  for (const row of ventasSemanaRows ?? []) {
    const key = utcYmd(new Date(row.fecha_venta as string));
    montoPorDia.set(key, (montoPorDia.get(key) ?? 0) + Number(row.monto_total));
  }

  const diasSemana: { dateKey: string; label: string; monto: number; esHoy: boolean }[] = [];
  const hoyKey = utcYmd(new Date(Date.UTC(y, mo, d)));
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(Date.UTC(y, mo, d - 6 + i));
    const dateKey = utcYmd(dayDate);
    const label = DIA_CORTO_ES[dayDate.getUTCDay()];
    diasSemana.push({
      dateKey,
      label,
      monto: montoPorDia.get(dateKey) ?? 0,
      esHoy: dateKey === hoyKey,
    });
  }

  const totalSemana = diasSemana.reduce((s, x) => s + x.monto, 0);

  const { data: todasVentasIds, error: eVid } = await supabase
    .from("ventas")
    .select("id")
    .eq("id_tienda", idTienda);

  if (eVid) {
    return { error: eVid.message } as const;
  }

  const allVids = (todasVentasIds ?? []).map((v) => v.id as string);
  const bestsellers: { nombre: string; unidades: number }[] = [];

  if (allVids.length > 0) {
    const { data: detsAll, error: eDet } = await supabase
      .from("detalle_ventas")
      .select("id_product, cantidad")
      .in("id_venta", allVids);

    if (eDet) {
      return { error: eDet.message } as const;
    }

    const unidadesPorProducto = new Map<string, number>();
    for (const row of detsAll ?? []) {
      const pid = row.id_product as string;
      unidadesPorProducto.set(
        pid,
        (unidadesPorProducto.get(pid) ?? 0) + Number(row.cantidad),
      );
    }

    const top = [...unidadesPorProducto.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    if (top.length > 0) {
      const ids = top.map(([id]) => id);
      const { data: prods, error: ePr } = await supabase
        .from("productos")
        .select("id, nombre")
        .in("id", ids)
        .eq("id_tienda", idTienda);

      if (ePr) {
        return { error: ePr.message } as const;
      }

      const nombrePorId = new Map((prods ?? []).map((p) => [p.id as string, p.nombre as string]));
      for (const [pid, u] of top) {
        bestsellers.push({
          nombre: nombrePorId.get(pid) ?? "Producto",
          unidades: u,
        });
      }
    }
  }

  return {
    totalHoy,
    cantidadVentasHoy,
    ventasHoy,
    diasSemana,
    totalSemana,
    bestsellers,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id_tienda")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.id_tienda) {
    redirect("/registro/completar");
  }

  const idTienda = perfil.id_tienda as string;

  const { data: tienda } = await supabase
    .from("tiendas")
    .select("nombre")
    .eq("id", idTienda)
    .maybeSingle();
  const tiendaNombre = tienda?.nombre ?? null;

  const data = await loadDashboardData(supabase, idTienda);
  if ("error" in data) {
    return (
      <div className="mx-auto max-w-6xl px-6 pt-28">
        <p className="rounded-xl bg-error-container/30 px-4 py-3 text-sm text-error" role="alert">
          No se pudieron cargar los datos del panel: {data.error}
        </p>
      </div>
    );
  }

  return (
    <DashboardView
      tiendaNombre={tiendaNombre}
      totalHoy={data.totalHoy}
      cantidadVentasHoy={data.cantidadVentasHoy}
      ventasHoy={data.ventasHoy}
      diasSemana={data.diasSemana}
      totalSemana={data.totalSemana}
      bestsellers={data.bestsellers}
    />
  );
}
