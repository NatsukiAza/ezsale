import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertBillingAllowed } from "@/lib/billing/assert-access";
import { getPlan, parsePlanId } from "@/lib/billing/plans";
import { NextResponse } from "next/server";

type Body = {
  email?: string;
  password?: string;
  nombre?: string;
  apellido?: string;
  esAdmin?: boolean;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Servidor no configurado." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Iniciá sesión para continuar." }, { status: 401 });
  }

  const { data: miPerfil, error: perfilErr } = await supabase
    .from("perfiles")
    .select("id_tienda, rol, eliminado_en")
    .eq("id", user.id)
    .maybeSingle();

  if (perfilErr || !miPerfil?.id_tienda || miPerfil.eliminado_en) {
    return NextResponse.json(
      { ok: false, error: perfilErr?.message ?? "No se encontró tu perfil." },
      { status: 400 },
    );
  }

  if (miPerfil.rol !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Solo los administradores pueden invitar usuarios." },
      { status: 403 },
    );
  }

  const idTienda = miPerfil.id_tienda as string;

  const { data: tiendaBilling } = await supabase
    .from("tiendas")
    .select("created_at, cobro_exento, pagado_hasta, plan")
    .eq("id", idTienda)
    .maybeSingle();

  if (tiendaBilling) {
    const blocked = assertBillingAllowed({
      created_at: tiendaBilling.created_at as string,
      cobro_exento: Boolean(tiendaBilling.cobro_exento),
      pagado_hasta: (tiendaBilling.pagado_hasta as string | null) ?? null,
      plan: (tiendaBilling.plan as string | null) ?? null,
    });
    if (blocked) return blocked;
  }

  const plan = getPlan(parsePlanId(tiendaBilling?.plan));
  const { count: activosCount, error: countErr } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("id_tienda", idTienda)
    .is("eliminado_en", null);

  if (countErr) {
    return NextResponse.json(
      { ok: false, error: countErr.message },
      { status: 400 },
    );
  }

  const activos = activosCount ?? 0;
  if (Number.isFinite(plan.maxUsuarios) && activos >= plan.maxUsuarios) {
    return NextResponse.json(
      {
        ok: false,
        error: `Tu plan ${plan.name} permite hasta ${plan.maxUsuarios} usuarios. Subí de plan o eliminá un usuario.`,
      },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Alta de usuarios no disponible: falta SUPABASE_SERVICE_ROLE_KEY en el servidor.",
      },
      { status: 501 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const apellido = typeof body.apellido === "string" ? body.apellido.trim() : "";
  const esAdmin = body.esAdmin === true;

  if (!email || !password || !nombre) {
    return NextResponse.json(
      { ok: false, error: "Correo, nombre y contraseña son obligatorios." },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "La contraseña debe tener al menos 6 caracteres." },
      { status: 400 },
    );
  }

  const rol = esAdmin ? "admin" : "normal";

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    const alreadyExists = /already|registered|exists/i.test(authError?.message ?? "");
    if (alreadyExists) {
      const { data: listed } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const existing = listed?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === email,
      );
      if (existing) {
        const { data: perfilExistente } = await admin
          .from("perfiles")
          .select("id, id_tienda, eliminado_en")
          .eq("id", existing.id)
          .maybeSingle();

        if (
          perfilExistente?.eliminado_en &&
          perfilExistente.id_tienda === idTienda
        ) {
          const { error: reactivateErr } = await admin
            .from("perfiles")
            .update({
              eliminado_en: null,
              nombre,
              apellido: apellido || "",
              rol,
              debe_cambiar_password: true,
            })
            .eq("id", existing.id);

          if (reactivateErr) {
            return NextResponse.json(
              {
                ok: false,
                error: reactivateErr.message ?? "No se pudo reactivar el usuario.",
              },
              { status: 400 },
            );
          }

          const { error: unbanErr } = await admin.auth.admin.updateUserById(
            existing.id,
            {
              password,
              ban_duration: "none",
              email_confirm: true,
            },
          );
          if (unbanErr) {
            await admin
              .from("perfiles")
              .update({ eliminado_en: perfilExistente.eliminado_en })
              .eq("id", existing.id);
            return NextResponse.json(
              {
                ok: false,
                error: unbanErr.message ?? "No se pudo reactivar el acceso.",
              },
              { status: 400 },
            );
          }

          return NextResponse.json({ ok: true });
        }
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: authError?.message ?? "No se pudo crear la cuenta.",
      },
      { status: 400 },
    );
  }

  const userId = authData.user.id;

  const { error: insertErr } = await admin.from("perfiles").insert({
    id: userId,
    id_tienda: idTienda,
    nombre,
    apellido: apellido || "",
    rol,
    debe_cambiar_password: true,
  });

  if (insertErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { ok: false, error: insertErr.message ?? "No se pudo crear el perfil." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
