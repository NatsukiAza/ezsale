import { DashboardView } from "@/app/components/dashboard-view";
import { getPerfilTienda } from "@/lib/supabase/cached-session";
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

  const [hoyRes, semRes, bestRes] = await Promise.all([
    supabase
      .from("ventas")
      .select("id, id_usuario, monto_total, fecha_venta")
      .eq("id_tienda", idTienda)
      .gte("fecha_venta", todayStart.toISOString())
      .lt("fecha_venta", todayEnd.toISOString())
      .order("fecha_venta", { ascending: false }),
    supabase
      .from("ventas")
      .select("monto_total, fecha_venta")
      .eq("id_tienda", idTienda)
      .gte("fecha_venta", weekStart.toISOString())
      .lt("fecha_venta", weekEnd.toISOString()),
    supabase.rpc("top_productos_por_tienda", {
      p_id_tienda: idTienda,
      p_limit: 3,
    }),
  ]);

  if (hoyRes.error) {
    return { error: hoyRes.error.message } as const;
  }
  if (semRes.error) {
    return { error: semRes.error.message } as const;
  }
  if (bestRes.error) {
    return { error: bestRes.error.message } as const;
  }

  const rowsHoyAll = hoyRes.data ?? [];
  const totalHoy = rowsHoyAll.reduce((s, v) => s + Number(v.monto_total), 0);
  const cantidadVentasHoy = rowsHoyAll.length;

  const rowsHoyLista = rowsHoyAll.slice(0, 5);
  const uids = [...new Set(rowsHoyLista.map((v) => v.id_usuario))];
  const vidsLista = rowsHoyLista.map((v) => v.id as string);

  const nameByUser = new Map<string, string>();
  const lineasPorVenta = new Map<string, { nombre: string; cantidad: number }[]>();

  if (uids.length > 0 || vidsLista.length > 0) {
    const [perfilesRes, detsRes] = await Promise.all([
      uids.length > 0
        ? supabase.from("perfiles").select("id, nombre, apellido").in("id", uids)
        : Promise.resolve({ data: [] as const, error: null }),
      vidsLista.length > 0
        ? supabase
            .from("detalle_ventas")
            .select("id_venta, cantidad, productos ( nombre )")
            .in("id_venta", vidsLista)
            .order("id")
        : Promise.resolve({ data: [] as const, error: null }),
    ]);

    if (perfilesRes.error) {
      return { error: perfilesRes.error.message } as const;
    }
    if (detsRes.error) {
      return { error: detsRes.error.message } as const;
    }

    for (const p of perfilesRes.data ?? []) {
      const nombre = `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "Usuario";
      nameByUser.set(p.id, nombre);
    }

    function nombreProducto(row: { productos: unknown }): string {
      const pr = row.productos;
      if (pr == null) return "Producto";
      if (Array.isArray(pr)) {
        const first = pr[0] as { nombre?: string } | undefined;
        return first?.nombre ?? "Producto";
      }
      return (pr as { nombre: string }).nombre;
    }

    for (const row of detsRes.data ?? []) {
      const vid = row.id_venta as string;
      const nombre = nombreProducto(row as { productos: unknown });
      const cantidad = Number(row.cantidad);
      const list = lineasPorVenta.get(vid) ?? [];
      list.push({ nombre, cantidad });
      lineasPorVenta.set(vid, list);
    }
  }

  const ventasHoy = rowsHoyLista.map((v) => {
    const id = v.id as string;
    const fv = new Date(v.fecha_venta as string);
    const hora = fv.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const lineas = lineasPorVenta.get(id) ?? [];
    const items = lineas.reduce((s, l) => s + l.cantidad, 0);
    return {
      id,
      vendedor: nameByUser.get(v.id_usuario as string) ?? "Usuario",
      hora,
      monto: Number(v.monto_total),
      items,
      lineas,
    };
  });

  const montoPorDia = new Map<string, number>();
  for (const row of semRes.data ?? []) {
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

  const bestsellers = (bestRes.data ?? []).map(
    (row: { nombre: string; unidades: string | number }) => ({
      nombre: row.nombre,
      unidades: Number(row.unidades),
    }),
  );

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
  const { supabase, user, perfil } = await getPerfilTienda();

  if (!supabase) {
    redirect("/");
  }
  if (!user) {
    redirect("/");
  }
  if (!perfil?.id_tienda) {
    redirect("/registro/completar");
  }

  const idTienda = perfil.id_tienda;
  const esAdmin = perfil.rol === "admin";

  const [data, tiendaRes] = await Promise.all([
    loadDashboardData(supabase, idTienda),
    supabase.from("tiendas").select("nombre").eq("id", idTienda).maybeSingle(),
  ]);

  const tiendaNombre = tiendaRes.data?.nombre ?? null;

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
      esAdmin={esAdmin}
      totalHoy={data.totalHoy}
      cantidadVentasHoy={data.cantidadVentasHoy}
      ventasHoy={data.ventasHoy}
      diasSemana={data.diasSemana}
      totalSemana={data.totalSemana}
      bestsellers={data.bestsellers}
    />
  );
}
