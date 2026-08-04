import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_STORE_COOKIE } from "@/lib/stores/constants";
import { NextResponse } from "next/server";

type PatchBody = {
  nombre?: string;
  apellido?: string;
  rol?: "admin" | "manager" | "normal";
  /** @deprecated */
  esAdmin?: boolean;
  /** Mover a otra tienda (solo admin org). */
  id_tienda?: string | null;
};

async function requireTeamManager() {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: NextResponse.json({ ok: false, error: "Servidor no configurado." }, { status: 500 }),
    };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 }) };
  }
  const { data: perfil, error: pe } = await supabase
    .from("perfiles")
    .select("id_organizacion, id_tienda, rol, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();
  if (pe || !perfil?.id_organizacion || perfil.eliminado_en) {
    return {
      error: NextResponse.json(
        { ok: false, error: pe?.message ?? "No se encontró tu perfil." },
        { status: 400 },
      ),
    };
  }
  if (perfil.rol !== "admin" && perfil.rol !== "manager") {
    return {
      error: NextResponse.json({ ok: false, error: "Sin permiso." }, { status: 403 }),
    };
  }

  const cookieStore = await cookies();
  const cookieTienda = cookieStore.get(ACTIVE_STORE_COOKIE)?.value;
  const idTiendaActiva =
    perfil.rol === "admin"
      ? cookieTienda ?? null
      : (perfil.id_tienda as string | null);

  return {
    supabase,
    user,
    idOrganizacion: perfil.id_organizacion as string,
    idTiendaActiva,
    rol: perfil.rol as string,
  };
}

function canManageTarget(params: {
  actorRol: string;
  actorTienda: string | null;
  target: { id_organizacion: string; id_tienda: string | null; rol: string };
  idOrganizacion: string;
}): boolean {
  if (params.target.id_organizacion !== params.idOrganizacion) return false;
  if (params.actorRol === "admin") return true;
  // manager: solo usuarios de su tienda, no admins
  if (params.target.rol === "admin") return false;
  return (
    params.actorTienda != null &&
    params.target.id_tienda === params.actorTienda
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTeamManager();
  if ("error" in ctx && ctx.error) return ctx.error;

  const { id: targetId } = await context.params;
  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Falta el usuario." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 501 },
    );
  }

  const { data: target, error: te } = await admin
    .from("perfiles")
    .select("id, id_organizacion, id_tienda, nombre, apellido, rol, eliminado_en")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target || target.eliminado_en) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }
  if (
    !canManageTarget({
      actorRol: ctx.rol,
      actorTienda: ctx.idTiendaActiva,
      target: target as {
        id_organizacion: string;
        id_tienda: string | null;
        rol: string;
      },
      idOrganizacion: ctx.idOrganizacion,
    })
  ) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const { data: authUser, error: ae } = await admin.auth.admin.getUserById(targetId);
  if (ae || !authUser.user?.email) {
    return NextResponse.json(
      { ok: false, error: ae?.message ?? "No se pudo leer el correo." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    email: authUser.user.email,
    nombre: target.nombre,
    apellido: target.apellido,
    rol: target.rol,
    id_tienda: target.id_tienda,
    esAdmin: target.rol === "admin",
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTeamManager();
  if ("error" in ctx && ctx.error) return ctx.error;

  const { id: targetId } = await context.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const apellido = typeof body.apellido === "string" ? body.apellido.trim() : "";

  if (!nombre) {
    return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 501 },
    );
  }

  const { data: target, error: te } = await admin
    .from("perfiles")
    .select("id, id_organizacion, id_tienda, rol, eliminado_en")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target || target.eliminado_en) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }
  if (
    !canManageTarget({
      actorRol: ctx.rol,
      actorTienda: ctx.idTiendaActiva,
      target: target as {
        id_organizacion: string;
        id_tienda: string | null;
        rol: string;
      },
      idOrganizacion: ctx.idOrganizacion,
    })
  ) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  let newRol: "admin" | "manager" | "normal" =
    body.rol === "admin" || body.rol === "manager" || body.rol === "normal"
      ? body.rol
      : body.esAdmin === true
        ? "admin"
        : body.esAdmin === false
          ? "normal"
          : (target.rol as "admin" | "manager" | "normal");

  if (ctx.rol === "manager" && (newRol === "admin" || target.rol === "admin")) {
    return NextResponse.json(
      { ok: false, error: "Un manager no puede cambiar roles de administrador." },
      { status: 403 },
    );
  }

  // Mover de tienda: solo admin org
  let newIdTienda: string | null =
    newRol === "admin" ? null : (target.id_tienda as string | null);

  if (body.id_tienda !== undefined) {
    if (ctx.rol !== "admin") {
      return NextResponse.json(
        { ok: false, error: "Solo el administrador puede mover usuarios." },
        { status: 403 },
      );
    }
    if (newRol === "admin") {
      newIdTienda = null;
    } else {
      const dest =
        typeof body.id_tienda === "string" ? body.id_tienda.trim() : "";
      if (!dest) {
        return NextResponse.json(
          { ok: false, error: "Indicá la tienda destino." },
          { status: 400 },
        );
      }
      const { data: destOk } = await admin
        .from("tiendas")
        .select("id")
        .eq("id", dest)
        .eq("id_organizacion", ctx.idOrganizacion)
        .is("eliminado_en", null)
        .maybeSingle();
      if (!destOk) {
        return NextResponse.json(
          { ok: false, error: "Tienda destino no válida." },
          { status: 400 },
        );
      }
      newIdTienda = dest;
    }
  } else if (newRol !== "admin" && !newIdTienda) {
    // Al bajar de admin necesita tienda: usar activa
    if (!ctx.idTiendaActiva) {
      return NextResponse.json(
        {
          ok: false,
          error: "Asigná una tienda al usuario (o seleccioná una tienda activa).",
        },
        { status: 400 },
      );
    }
    newIdTienda = ctx.idTiendaActiva;
  }

  const wasAdmin = target.rol === "admin";
  const demoting = wasAdmin && newRol !== "admin";

  if (demoting) {
    const { count, error: ce } = await admin
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", ctx.idOrganizacion)
      .eq("rol", "admin")
      .is("eliminado_en", null);

    if (ce || count === null || count <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "No podés quitar el rol de administrador al único admin.",
        },
        { status: 400 },
      );
    }
  }

  const { error: upErr } = await admin
    .from("perfiles")
    .update({
      nombre,
      apellido: apellido || "",
      rol: newRol,
      id_tienda: newIdTienda,
    })
    .eq("id", targetId)
    .eq("id_organizacion", ctx.idOrganizacion);

  if (upErr) {
    return NextResponse.json(
      { ok: false, error: upErr.message ?? "No se pudo actualizar." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireTeamManager();
  if ("error" in ctx && ctx.error) return ctx.error;

  const { id: targetId } = await context.params;

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 501 },
    );
  }

  const { data: target, error: te } = await admin
    .from("perfiles")
    .select("id, id_organizacion, id_tienda, rol, eliminado_en")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target || target.eliminado_en) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }
  if (
    !canManageTarget({
      actorRol: ctx.rol,
      actorTienda: ctx.idTiendaActiva,
      target: target as {
        id_organizacion: string;
        id_tienda: string | null;
        rol: string;
      },
      idOrganizacion: ctx.idOrganizacion,
    })
  ) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  if (target.rol === "admin") {
    if (ctx.rol !== "admin") {
      return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
    }
    const { count, error: ce } = await admin
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("id_organizacion", ctx.idOrganizacion)
      .eq("rol", "admin")
      .is("eliminado_en", null);

    if (ce || count === null || count <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "No podés eliminar al único administrador.",
        },
        { status: 400 },
      );
    }
  }

  const { data: softRow, error: softErr } = await admin
    .from("perfiles")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("id", targetId)
    .eq("id_organizacion", ctx.idOrganizacion)
    .is("eliminado_en", null)
    .select("id")
    .maybeSingle();

  if (softErr || !softRow) {
    return NextResponse.json(
      {
        ok: false,
        error: softErr?.message ?? "No se pudo eliminar la cuenta.",
      },
      { status: 400 },
    );
  }

  const { error: banErr } = await admin.auth.admin.updateUserById(targetId, {
    ban_duration: "876600h",
  });
  if (banErr) {
    await admin
      .from("perfiles")
      .update({ eliminado_en: null })
      .eq("id", targetId);
    return NextResponse.json(
      { ok: false, error: banErr.message ?? "No se pudo desactivar el acceso." },
      { status: 400 },
    );
  }

  try {
    await admin.auth.admin.signOut(targetId, "global");
  } catch {
    // Best-effort
  }

  return NextResponse.json({ ok: true });
}
