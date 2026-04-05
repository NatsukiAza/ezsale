import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type Body = {
  email?: string;
  password?: string;
  nombreTienda?: string;
  nombre?: string;
  apellido?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        ok: false,
        fallback: true,
        error:
          "Registro por servidor no disponible (falta SUPABASE_SERVICE_ROLE_KEY). Se usará el registro en el navegador.",
      },
      { status: 501 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nombreTienda = typeof body.nombreTienda === "string" ? body.nombreTienda.trim() : "";
  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const apellido = typeof body.apellido === "string" ? body.apellido.trim() : "";

  if (!email || !password || !nombreTienda || !nombre) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos obligatorios (tienda, nombre, correo y contraseña)." },
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

  const { data: tiendaRow, error: tiendaErr } = await admin
    .from("tiendas")
    .insert({ nombre: nombreTienda })
    .select("id")
    .single();

  if (tiendaErr || !tiendaRow) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { ok: false, error: tiendaErr?.message ?? "No se pudo crear la tienda." },
      { status: 400 },
    );
  }

  const { error: perfilErr } = await admin.from("perfiles").insert({
    id: userId,
    id_tienda: tiendaRow.id,
    nombre,
    apellido: apellido || "",
    rol: "admin",
  });

  if (perfilErr) {
    await admin.from("tiendas").delete().eq("id", tiendaRow.id);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { ok: false, error: perfilErr.message ?? "No se pudo crear el perfil." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
