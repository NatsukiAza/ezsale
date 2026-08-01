import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAccesoTienda } from "@/lib/billing/access";
import {
  GATE_COOKIE,
  GATE_TTL_MS,
  parseGate,
  serializeGate,
} from "@/lib/supabase/gate-cookie";

function needsPerfilGate(path: string, isProtected: boolean, isAuthPage: boolean) {
  return (
    isProtected ||
    isAuthPage ||
    path.startsWith("/auth/cambiar-password") ||
    path.startsWith("/reports") ||
    path.startsWith("/team") ||
    path.startsWith("/cuenta")
  );
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
) {
  const u = request.nextUrl.clone();
  u.pathname = pathname;
  const redirect = NextResponse.redirect(u);
  from.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value);
  });
  return redirect;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/new-sale") ||
    path.startsWith("/products") ||
    path.startsWith("/reports") ||
    path.startsWith("/team") ||
    path.startsWith("/cuenta") ||
    path.startsWith("/registro/completar");
  const isAuthPage = path === "/login" || path === "/registro";
  const isCuenta = path.startsWith("/cuenta");

  if (!url || !key) {
    if (isProtected) {
      const u = request.nextUrl.clone();
      u.pathname = "/login";
      return NextResponse.redirect(u);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (
    authError &&
    (authError.code === "refresh_token_not_found" ||
      authError.message?.includes("Refresh Token"))
  ) {
    await supabase.auth.signOut();
  }

  if (path.startsWith("/auth/cambiar-password") && !user) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  let debeCambiarPassword = false;
  let esAdmin = false;
  let billingBlocked = false;

  if (user && needsPerfilGate(path, isProtected, isAuthPage)) {
    const cached = parseGate(request.cookies.get(GATE_COOKIE)?.value);
    // En /cuenta siempre refrescar cobro (vuelta de MP / pago reciente)
    const forceBillingRefresh = isCuenta;

    if (cached && !forceBillingRefresh) {
      debeCambiarPassword = cached.debeCambiarPassword;
      esAdmin = cached.rol === "admin";
      billingBlocked = cached.billingBlocked;

      // Soft-delete sigue requiriendo lectura de perfil
      const { data: perfilSoft } = await supabase
        .from("perfiles")
        .select("eliminado_en")
        .eq("id", user.id)
        .maybeSingle();
      if (perfilSoft?.eliminado_en) {
        await supabase.auth.signOut();
        supabaseResponse.cookies.set(GATE_COOKIE, "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
        return redirectWithCookies(request, "/login", supabaseResponse);
      }
    } else {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("debe_cambiar_password, rol, eliminado_en, id_tienda")
        .eq("id", user.id)
        .maybeSingle();

      if (perfil?.eliminado_en) {
        await supabase.auth.signOut();
        supabaseResponse.cookies.set(GATE_COOKIE, "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
        return redirectWithCookies(request, "/login", supabaseResponse);
      }

      debeCambiarPassword = perfil?.debe_cambiar_password === true;
      esAdmin = perfil?.rol === "admin";

      let billingPhase = "ok";
      if (perfil?.id_tienda) {
        const { data: tienda } = await supabase
          .from("tiendas")
          .select("created_at, cobro_exento, pagado_hasta, plan")
          .eq("id", perfil.id_tienda)
          .maybeSingle();
        if (tienda) {
          const acceso = getAccesoTienda({
            created_at: tienda.created_at as string,
            cobro_exento: Boolean(tienda.cobro_exento),
            pagado_hasta: (tienda.pagado_hasta as string | null) ?? null,
            plan: (tienda.plan as string | null) ?? null,
          });
          billingBlocked = !acceso.allowed;
          billingPhase = acceso.phase;
        }
      }

      supabaseResponse.cookies.set(
        GATE_COOKIE,
        serializeGate({
          debeCambiarPassword,
          rol: (perfil?.rol as string) ?? "normal",
          billingBlocked,
          billingPhase,
        }),
        {
          path: "/",
          maxAge: Math.floor(GATE_TTL_MS / 1000),
          sameSite: "lax",
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
        },
      );
    }
  } else if (!user) {
    supabaseResponse.cookies.set(GATE_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
  }

  if (debeCambiarPassword) {
    const allowed =
      path.startsWith("/auth/cambiar-password") || path.startsWith("/auth/callback");
    if (!allowed) {
      return redirectWithCookies(
        request,
        "/auth/cambiar-password",
        supabaseResponse,
      );
    }
  } else if (path.startsWith("/auth/cambiar-password") && user) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  if (
    user &&
    !debeCambiarPassword &&
    billingBlocked &&
    isProtected &&
    !isCuenta &&
    !path.startsWith("/registro/completar")
  ) {
    return redirectWithCookies(request, "/cuenta", supabaseResponse);
  }

  if (
    user &&
    !debeCambiarPassword &&
    !esAdmin &&
    (path.startsWith("/reports") || path.startsWith("/team"))
  ) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  if (isProtected && !user) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (isAuthPage && user) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  return supabaseResponse;
}
