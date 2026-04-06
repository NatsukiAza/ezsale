import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
    .select("id_tienda, rol")
    .eq("id", user.id)
    .maybeSingle();

  if (perfilErr || !miPerfil?.id_tienda) {
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

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      {
        ok: false,
        error: authError?.message ?? "No se pudo crear la cuenta.",
      },
      { status: 400 },
    );
  }

  const userId = authData.user.id;
  const idTienda = miPerfil.id_tienda as string;

  const { error: insertErr } = await admin.from("perfiles").insert({
    id: userId,
    id_tienda: idTienda,
    nombre,
    apellido: apellido || "",
    rol: esAdmin ? "admin" : "normal",
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
