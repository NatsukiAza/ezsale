import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/new-sale/:path*",
    "/products/:path*",
    "/reports/:path*",
    "/caja/:path*",
    "/team/:path*",
    "/cuenta/:path*",
    "/login",
    "/registro",
    "/registro/:path*",
    "/auth/:path*",
    "/seleccionar-tienda/:path*",
  ],
};
