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
    .select("id_tienda, rol")
    .eq("id", user.id)
    .maybeSingle();
  if (pe || !perfil?.id_tienda) {
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
    .select("id, id_tienda, nombre, apellido, rol")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target) {
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
    .select("id, id_tienda, rol")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target) {
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
      .eq("rol", "admin");

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
    .select("id, id_tienda, rol")
    .eq("id", targetId)
    .maybeSingle();

  if (te || !target) {
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
      .eq("rol", "admin");

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

  const { error: delAuth } = await admin.auth.admin.deleteUser(targetId);
  if (delAuth) {
    return NextResponse.json(
      { ok: false, error: delAuth.message ?? "No se pudo eliminar la cuenta." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
