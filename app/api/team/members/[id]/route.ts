import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type PatchBody = {
  nombre?: string;
  apellido?: string;
  esAdmin?: boolean;
};

async function requireAdminSameTienda() {
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
    .select("id_tienda, rol, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();
  if (pe || !perfil?.id_tienda || perfil.eliminado_en) {
    return {
      error: NextResponse.json(
        { ok: false, error: pe?.message ?? "No se encontró tu perfil." },
        { status: 400 },
      ),
    };
  }
  if (perfil.rol !== "admin") {
    return {
      error: NextResponse.json({ ok: false, error: "Solo administradores." }, { status: 403 }),
    };
  }
  return { supabase, user, idTienda: perfil.id_tienda as string };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdminSameTienda();
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
    .select("id, id_tienda, nombre, apellido, rol, eliminado_en")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target || target.eliminado_en) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }
  if (target.id_tienda !== ctx.idTienda) {
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
    esAdmin: target.rol === "admin",
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAdminSameTienda();
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
  const esAdmin = body.esAdmin === true;

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
    .select("id, id_tienda, rol, eliminado_en")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target || target.eliminado_en) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }
  if (target.id_tienda !== ctx.idTienda) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  const newRol = esAdmin ? "admin" : "normal";
  const wasAdmin = target.rol === "admin";
  const demoting = wasAdmin && newRol === "normal";

  if (demoting) {
    const { count, error: ce } = await admin
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("id_tienda", ctx.idTienda)
      .eq("rol", "admin")
      .is("eliminado_en", null);

    if (ce || count === null || count <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "No podés quitar el rol de administrador al único admin de la tienda.",
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
    })
    .eq("id", targetId)
    .eq("id_tienda", ctx.idTienda);

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
  const ctx = await requireAdminSameTienda();
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
    .select("id, id_tienda, rol, eliminado_en")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target || target.eliminado_en) {
    return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
  }
  if (target.id_tienda !== ctx.idTienda) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 403 });
  }

  if (target.rol === "admin") {
    const { count, error: ce } = await admin
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("id_tienda", ctx.idTienda)
      .eq("rol", "admin")
      .is("eliminado_en", null);

    if (ce || count === null || count <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "No podés eliminar al único administrador de la tienda.",
        },
        { status: 400 },
      );
    }
  }

  const { data: softRow, error: softErr } = await admin
    .from("perfiles")
    .update({ eliminado_en: new Date().toISOString() })
    .eq("id", targetId)
    .eq("id_tienda", ctx.idTienda)
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

  // Bloquear login y cerrar sesiones activas (el perfil y las ventas se conservan).
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
    // Best-effort: el ban ya impide nuevos inicios de sesión.
  }

  return NextResponse.json({ ok: true });
}
