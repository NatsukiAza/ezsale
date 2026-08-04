import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAccesoTienda } from "@/lib/billing/access";
import { ACTIVE_STORE_COOKIE } from "@/lib/stores/constants";
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
    path.startsWith("/cuenta") ||
    path.startsWith("/seleccionar-tienda")
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

function puedeVerTeamOReports(rol: string) {
  return rol === "admin" || rol === "manager";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const path = request.nextUrl.pathname;
  const isAppShell =
    path.startsWith("/dashboard") ||
    path.startsWith("/new-sale") ||
    path.startsWith("/products") ||
    path.startsWith("/reports") ||
    path.startsWith("/team");
  const isProtected =
    isAppShell ||
    path.startsWith("/cuenta") ||
    path.startsWith("/registro/completar") ||
    path.startsWith("/seleccionar-tienda");
  const isAuthPage = path === "/login" || path === "/registro";
  const isCuenta = path.startsWith("/cuenta");
  const isSelector = path.startsWith("/seleccionar-tienda");

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
  let rol = "normal";
  let billingBlocked = false;
  let tieneOrg = false;

  if (user && needsPerfilGate(path, isProtected, isAuthPage)) {
    const cached = parseGate(request.cookies.get(GATE_COOKIE)?.value);
    const forceBillingRefresh = isCuenta || isSelector;

    if (cached && !forceBillingRefresh) {
      debeCambiarPassword = cached.debeCambiarPassword;
      rol = cached.rol;
      billingBlocked = cached.billingBlocked;
      tieneOrg = true;

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
        .select(
          "debe_cambiar_password, rol, eliminado_en, id_organizacion, id_tienda",
        )
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
      rol = (perfil?.rol as string) ?? "normal";
      tieneOrg = Boolean(perfil?.id_organizacion);

      let billingPhase = "ok";
      if (perfil?.id_organizacion) {
        const { data: org } = await supabase
          .from("organizaciones")
          .select("created_at, cobro_exento, pagado_hasta, plan")
          .eq("id", perfil.id_organizacion)
          .maybeSingle();
        if (org) {
          const acceso = getAccesoTienda({
            created_at: org.created_at as string,
            cobro_exento: Boolean(org.cobro_exento),
            pagado_hasta: (org.pagado_hasta as string | null) ?? null,
            plan: (org.plan as string | null) ?? null,
          });
          billingBlocked = !acceso.allowed;
          billingPhase = acceso.phase;
        }
      }

      supabaseResponse.cookies.set(
        GATE_COOKIE,
        serializeGate({
          debeCambiarPassword,
          rol,
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
    return redirectWithCookies(request, "/seleccionar-tienda", supabaseResponse);
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

  // App shell requiere cookie de tienda activa (admins) o asignación (manager/normal)
  if (user && !debeCambiarPassword && !billingBlocked && isAppShell && tieneOrg) {
    const cookieStore = request.cookies.get(ACTIVE_STORE_COOKIE)?.value;
    const needsStore =
      rol === "admin" ? !cookieStore : false; // manager/normal se resuelven en layout
    if (rol === "admin" && needsStore) {
      return redirectWithCookies(request, "/seleccionar-tienda", supabaseResponse);
    }
  }

  if (
    user &&
    !debeCambiarPassword &&
    !puedeVerTeamOReports(rol) &&
    (path.startsWith("/reports") || path.startsWith("/team"))
  ) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  if (isProtected && !user) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (isAuthPage && user) {
    return redirectWithCookies(request, "/seleccionar-tienda", supabaseResponse);
  }

  return supabaseResponse;
}
