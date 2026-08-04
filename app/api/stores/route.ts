import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPlan, parsePlanId } from "@/lib/billing/plans";
import {
  ACTIVE_STORE_COOKIE,
  ACTIVE_STORE_MAX_AGE_SEC,
} from "@/lib/stores/constants";
import {
  computeExcesoTiendasHasta,
  enforceExcesoTiendas,
  purgeTiendaPermanente,
  purgeTiendasVencidas,
  restoreTiendaYUsuarios,
  softDeleteTiendasYUsuarios,
} from "@/lib/stores/exceso-tiendas";

async function requireOrgMember() {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Servidor no configurado." },
        { status: 500 },
      ),
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Iniciá sesión." },
        { status: 401 },
      ),
    };
  }
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id_organizacion, id_tienda, rol, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();
  if (!perfil?.id_organizacion || perfil.eliminado_en) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Perfil inválido." },
        { status: 400 },
      ),
    };
  }
  return {
    supabase,
    user,
    idOrganizacion: perfil.id_organizacion as string,
    idTiendaAsignada: (perfil.id_tienda as string | null) ?? null,
    rol: perfil.rol as string,
  };
}

export async function GET() {
  const ctx = await requireOrgMember();
  if ("error" in ctx) return ctx.error;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 501 },
    );
  }

  const { data: org } = await admin
    .from("organizaciones")
    .select("nombre, plan, exceso_tiendas_hasta")
    .eq("id", ctx.idOrganizacion)
    .maybeSingle();

  if (!org) {
    return NextResponse.json(
      { ok: false, error: "Organización no encontrada." },
      { status: 404 },
    );
  }

  const planId = parsePlanId(org.plan) ?? undefined;
  await enforceExcesoTiendas({
    admin,
    idOrganizacion: ctx.idOrganizacion,
    plan: planId,
    excesoHasta: (org.exceso_tiendas_hasta as string | null) ?? null,
  });
  // Limpieza: soft-delete ≥ 60 días → borrado permanente
  await purgeTiendasVencidas({
    admin,
    idOrganizacion: ctx.idOrganizacion,
  });

  const { data: orgFresh } = await admin
    .from("organizaciones")
    .select("nombre, plan, exceso_tiendas_hasta")
    .eq("id", ctx.idOrganizacion)
    .single();

  let query = admin
    .from("tiendas")
    .select("id, nombre, created_at, eliminado_en")
    .eq("id_organizacion", ctx.idOrganizacion)
    .order("created_at", { ascending: true });

  if (ctx.rol !== "admin") {
    if (!ctx.idTiendaAsignada) {
      return NextResponse.json(
        { ok: false, error: "Sin tienda asignada." },
        { status: 400 },
      );
    }
    query = query.eq("id", ctx.idTiendaAsignada).is("eliminado_en", null);
  }

  const { data: tiendas, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 },
    );
  }

  const plan = getPlan(parsePlanId(orgFresh?.plan));
  const activas = (tiendas ?? []).filter((t) => !t.eliminado_en);
  const eliminadas =
    ctx.rol === "admin"
      ? (tiendas ?? []).filter((t) => t.eliminado_en)
      : [];

  return NextResponse.json({
    ok: true,
    organizacion: {
      nombre: orgFresh?.nombre ?? org.nombre,
      plan: orgFresh?.plan ?? org.plan,
      planNombre: plan.name,
      exceso_tiendas_hasta:
        (orgFresh?.exceso_tiendas_hasta as string | null) ?? null,
      maxTiendas: plan.maxTiendas,
      tiendasActivas: activas.length,
    },
    tiendas: activas,
    tiendasEliminadas: eliminadas,
    rol: ctx.rol,
  });
}

type Body = {
  action?: "select" | "create" | "delete" | "restore" | "purge" | "rename";
  idTienda?: string;
  nombre?: string;
};

export async function POST(request: Request) {
  const ctx = await requireOrgMember();
  if ("error" in ctx) return ctx.error;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Petición inválida" },
      { status: 400 },
    );
  }

  const action = body.action;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 501 },
    );
  }

  if (action === "select") {
    const idTienda =
      typeof body.idTienda === "string" ? body.idTienda.trim() : "";
    if (!idTienda) {
      return NextResponse.json(
        { ok: false, error: "Falta id de tienda." },
        { status: 400 },
      );
    }

    if (ctx.rol !== "admin" && idTienda !== ctx.idTiendaAsignada) {
      return NextResponse.json(
        { ok: false, error: "No podés entrar a esa tienda." },
        { status: 403 },
      );
    }

    const { data: tienda } = await admin
      .from("tiendas")
      .select("id")
      .eq("id", idTienda)
      .eq("id_organizacion", ctx.idOrganizacion)
      .is("eliminado_en", null)
      .maybeSingle();

    if (!tienda) {
      return NextResponse.json(
        { ok: false, error: "Tienda no encontrada." },
        { status: 404 },
      );
    }

    const res = NextResponse.json({ ok: true, idTienda });
    res.cookies.set(ACTIVE_STORE_COOKIE, idTienda, {
      path: "/",
      maxAge: ACTIVE_STORE_MAX_AGE_SEC,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  }

  if (ctx.rol !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Solo el administrador puede gestionar tiendas." },
      { status: 403 },
    );
  }

  const { data: org } = await admin
    .from("organizaciones")
    .select("plan, exceso_tiendas_hasta")
    .eq("id", ctx.idOrganizacion)
    .maybeSingle();
  if (!org) {
    return NextResponse.json(
      { ok: false, error: "Organización no encontrada." },
      { status: 404 },
    );
  }

  const plan = getPlan(parsePlanId(org.plan));

  if (action === "create") {
    const nombre =
      typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "Indicá el nombre de la tienda." },
        { status: 400 },
      );
    }

    const { count } = await admin
      .from("tiendas")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", ctx.idOrganizacion)
      .is("eliminado_en", null);

    if ((count ?? 0) >= plan.maxTiendas) {
      return NextResponse.json(
        {
          ok: false,
          error: `Tu plan permite hasta ${plan.maxTiendas} tienda(s).`,
        },
        { status: 403 },
      );
    }
    if (org.exceso_tiendas_hasta) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tenés tiendas de más para tu plan. Eliminá las extras antes de crear otra.",
        },
        { status: 403 },
      );
    }

    const { data: created, error } = await admin
      .from("tiendas")
      .insert({ id_organizacion: ctx.idOrganizacion, nombre })
      .select("id, nombre")
      .single();
    if (error || !created) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "No se pudo crear." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, tienda: created });
  }

  if (action === "rename") {
    const idTienda =
      typeof body.idTienda === "string" ? body.idTienda.trim() : "";
    const nombre =
      typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (!idTienda) {
      return NextResponse.json(
        { ok: false, error: "Falta id de tienda." },
        { status: 400 },
      );
    }
    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "Indicá el nombre de la tienda." },
        { status: 400 },
      );
    }

    const { data: updated, error } = await admin
      .from("tiendas")
      .update({ nombre })
      .eq("id", idTienda)
      .eq("id_organizacion", ctx.idOrganizacion)
      .is("eliminado_en", null)
      .select("id, nombre")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 400 },
      );
    }
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Tienda no encontrada o desactivada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, tienda: updated });
  }

  if (action === "delete") {
    const idTienda =
      typeof body.idTienda === "string" ? body.idTienda.trim() : "";
    if (!idTienda) {
      return NextResponse.json(
        { ok: false, error: "Falta id de tienda." },
        { status: 400 },
      );
    }

    const { count } = await admin
      .from("tiendas")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", ctx.idOrganizacion)
      .is("eliminado_en", null);

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { ok: false, error: "No podés eliminar la única tienda activa." },
        { status: 400 },
      );
    }

    await softDeleteTiendasYUsuarios({
      admin,
      idOrganizacion: ctx.idOrganizacion,
      tiendaIds: [idTienda],
    });

    const { count: restantes } = await admin
      .from("tiendas")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", ctx.idOrganizacion)
      .is("eliminado_en", null);

    if ((restantes ?? 0) <= plan.maxTiendas) {
      await admin
        .from("organizaciones")
        .update({ exceso_tiendas_hasta: null })
        .eq("id", ctx.idOrganizacion);
    }

    const res = NextResponse.json({ ok: true });
    // Si eliminó la activa, limpiar cookie
    // (el cliente debería re-seleccionar)
    return res;
  }

  if (action === "restore") {
    const idTienda =
      typeof body.idTienda === "string" ? body.idTienda.trim() : "";
    if (!idTienda) {
      return NextResponse.json(
        { ok: false, error: "Falta id de tienda." },
        { status: 400 },
      );
    }

    const { count } = await admin
      .from("tiendas")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", ctx.idOrganizacion)
      .is("eliminado_en", null);

    if ((count ?? 0) >= plan.maxTiendas) {
      return NextResponse.json(
        {
          ok: false,
          error: `Tu plan permite hasta ${plan.maxTiendas} tienda(s) activas.`,
        },
        { status: 403 },
      );
    }

    const result = await restoreTiendaYUsuarios({
      admin,
      idOrganizacion: ctx.idOrganizacion,
      idTienda,
      maxUsuarios: plan.maxUsuarios,
    });

    const exceso = computeExcesoTiendasHasta({
      plan: parsePlanId(org.plan),
      tiendasActivas: (count ?? 0) + 1,
      excesoActual: (org.exceso_tiendas_hasta as string | null) ?? null,
    });
    await admin
      .from("organizaciones")
      .update({ exceso_tiendas_hasta: exceso })
      .eq("id", ctx.idOrganizacion);

    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "purge") {
    const idTienda =
      typeof body.idTienda === "string" ? body.idTienda.trim() : "";
    if (!idTienda) {
      return NextResponse.json(
        { ok: false, error: "Falta id de tienda." },
        { status: 400 },
      );
    }

    try {
      await purgeTiendaPermanente({
        admin,
        idOrganizacion: ctx.idOrganizacion,
        idTienda,
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "No se pudo borrar definitivamente.";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, error: "Acción no válida." },
    { status: 400 },
  );
}
