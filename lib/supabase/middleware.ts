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

type OrgBilling = {
  created_at: string;
  cobro_exento: boolean;
  pagado_hasta: string | null;
  plan: string | null;
};

function hasAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("-auth-token") && !c.name.includes("code-verifier"),
    );
}

function needsPerfilGate(path: string, isProtected: boolean) {
  return isProtected || path.startsWith("/auth/cambiar-password");
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
  search?: string,
) {
  const u = request.nextUrl.clone();
  u.pathname = pathname;
  if (search !== undefined) u.search = search;
  const redirect = NextResponse.redirect(u);
  from.cookies.getAll().forEach((c) => {
    redirect.cookies.set(c.name, c.value);
  });
  return redirect;
}

function puedeVerTeamOReports(rol: string) {
  return rol === "admin" || rol === "manager";
}

function orgFromPerfilEmbed(value: unknown): OrgBilling | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const org = row as Record<string, unknown>;
  if (typeof org.created_at !== "string") return null;
  return {
    created_at: org.created_at,
    cobro_exento: Boolean(org.cobro_exento),
    pagado_hasta:
      typeof org.pagado_hasta === "string" ? org.pagado_hasta : null,
    plan: typeof org.plan === "string" ? org.plan : null,
  };
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
    path.startsWith("/caja") ||
    path.startsWith("/team");
  const isProtected =
    isAppShell ||
    path.startsWith("/cuenta") ||
    path.startsWith("/registro/completar") ||
    path.startsWith("/seleccionar-tienda");
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

  // Visitante anónimo: no hay JWT que verificar ni tokens que refrescar.
  if (!hasAuthCookie(request)) {
    if (path.startsWith("/auth/cambiar-password") || isProtected) {
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

  // getClaims verifica la firma del JWT en local (JWKS cacheado). getUser()
  // pega siempre al Auth server y era el costo dominante de cada navegación.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  if (path.startsWith("/auth/cambiar-password") && !userId) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  let debeCambiarPassword = false;
  let rol = "normal";
  let billingBlocked = false;
  let tieneOrg = false;

  if (userId && needsPerfilGate(path, isProtected)) {
    const cached = parseGate(request.cookies.get(GATE_COOKIE)?.value);
    const forceBillingRefresh = isCuenta;

    if (cached && !forceBillingRefresh) {
      // Soft-delete se chequea en RSC (getPerfilTienda); el gate evita
      // un round-trip extra a perfiles en cada navegación (TTL ~10 min).
      debeCambiarPassword = cached.debeCambiarPassword;
      rol = cached.rol;
      billingBlocked = cached.billingBlocked;
      tieneOrg = true;
    } else {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select(
          "debe_cambiar_password, rol, eliminado_en, id_organizacion, id_tienda, organizaciones!perfiles_id_organizacion_fkey(created_at, cobro_exento, pagado_hasta, plan)",
        )
        .eq("id", userId)
        .maybeSingle();

      if (perfil?.eliminado_en) {
        await supabase.auth.signOut();
        supabaseResponse.cookies.set(GATE_COOKIE, "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
        return redirectWithCookies(
          request,
          "/login",
          supabaseResponse,
          "?error=eliminada",
        );
      }

      debeCambiarPassword = perfil?.debe_cambiar_password === true;
      rol = (perfil?.rol as string) ?? "normal";
      tieneOrg = Boolean(perfil?.id_organizacion);

      let billingPhase = "ok";
      const org = orgFromPerfilEmbed(perfil?.organizaciones);
      if (org) {
        const acceso = getAccesoTienda({
          created_at: org.created_at,
          cobro_exento: org.cobro_exento,
          pagado_hasta: org.pagado_hasta,
          plan: org.plan,
        });
        billingBlocked = !acceso.allowed;
        billingPhase = acceso.phase;
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
  } else if (!userId) {
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
  } else if (path.startsWith("/auth/cambiar-password") && userId) {
    return redirectWithCookies(request, "/seleccionar-tienda", supabaseResponse);
  }

  if (
    userId &&
    !debeCambiarPassword &&
    billingBlocked &&
    isProtected &&
    !isCuenta &&
    !path.startsWith("/registro/completar")
  ) {
    return redirectWithCookies(request, "/cuenta", supabaseResponse);
  }

  // App shell requiere cookie de tienda activa (admins) o asignación (manager/normal)
  if (userId && !debeCambiarPassword && !billingBlocked && isAppShell && tieneOrg) {
    const cookieStore = request.cookies.get(ACTIVE_STORE_COOKIE)?.value;
    const needsStore =
      rol === "admin" ? !cookieStore : false; // manager/normal se resuelven en layout
    if (rol === "admin" && needsStore) {
      return redirectWithCookies(request, "/seleccionar-tienda", supabaseResponse);
    }
  }

  if (
    userId &&
    !debeCambiarPassword &&
    !puedeVerTeamOReports(rol) &&
    (path.startsWith("/reports") || path.startsWith("/team"))
  ) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  if (isProtected && !userId) {
    return redirectWithCookies(request, "/login", supabaseResponse);
  }

  if (isAuthPage && userId) {
    return redirectWithCookies(request, "/seleccionar-tienda", supabaseResponse);
  }

  return supabaseResponse;
}
