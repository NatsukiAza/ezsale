import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    const u = request.nextUrl.clone();
    u.pathname = "/";
    return NextResponse.redirect(u);
  }

  let debeCambiarPassword = false;
  if (user) {
    const { data: perfilPw } = await supabase
      .from("perfiles")
      .select("debe_cambiar_password")
      .eq("id", user.id)
      .maybeSingle();
    debeCambiarPassword = perfilPw?.debe_cambiar_password === true;
  }

  if (debeCambiarPassword) {
    const allowed =
      path.startsWith("/auth/cambiar-password") || path.startsWith("/auth/callback");
    if (!allowed) {
      const u = request.nextUrl.clone();
      u.pathname = "/auth/cambiar-password";
      return NextResponse.redirect(u);
    }
  } else if (path.startsWith("/auth/cambiar-password") && user) {
    const u = request.nextUrl.clone();
    u.pathname = "/dashboard";
    return NextResponse.redirect(u);
  }

  const isAuthPage = path === "/" || path === "/registro";

  if (isProtected && !user) {
    const u = request.nextUrl.clone();
    u.pathname = "/";
    return NextResponse.redirect(u);
  }

  if (isAuthPage && user) {
    const u = request.nextUrl.clone();
    u.pathname = "/dashboard";
    return NextResponse.redirect(u);
  }

  return supabaseResponse;
}
