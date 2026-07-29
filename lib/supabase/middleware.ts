import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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
    path.startsWith("/team")
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
    path.startsWith("/registro/completar");
  const isAuthPage = path === "/" || path === "/registro";

  if (!url || !key) {
    if (isProtected) {
      const u = request.nextUrl.clone();
      u.pathname = "/";
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
  } = await supabase.auth.getUser();

  if (path.startsWith("/auth/cambiar-password") && !user) {
    return redirectWithCookies(request, "/", supabaseResponse);
  }

  let debeCambiarPassword = false;
  let esAdmin = false;

  if (user && needsPerfilGate(path, isProtected, isAuthPage)) {
    const cached = parseGate(request.cookies.get(GATE_COOKIE)?.value);
    if (cached) {
      debeCambiarPassword = cached.debeCambiarPassword;
      esAdmin = cached.rol === "admin";
    } else {
      const { data: perfil } = await supabase
        .from("perfiles")
        .select("debe_cambiar_password, rol")
        .eq("id", user.id)
        .maybeSingle();
      debeCambiarPassword = perfil?.debe_cambiar_password === true;
      esAdmin = perfil?.rol === "admin";
      supabaseResponse.cookies.set(
        GATE_COOKIE,
        serializeGate({
          debeCambiarPassword,
          rol: (perfil?.rol as string) ?? "normal",
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
    !esAdmin &&
    (path.startsWith("/reports") || path.startsWith("/team"))
  ) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  if (isProtected && !user) {
    return redirectWithCookies(request, "/", supabaseResponse);
  }

  if (isAuthPage && user) {
    return redirectWithCookies(request, "/dashboard", supabaseResponse);
  }

  return supabaseResponse;
}
