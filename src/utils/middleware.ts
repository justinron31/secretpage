// middleware.ts
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes
  const protectedRoutes = [
    "/secret-page-1",
    "/secret-page-2",
    "/secret-page-3",
  ];

  if (protectedRoutes.includes(req.nextUrl.pathname) && !session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/secret-page-1", "/secret-page-2", "/secret-page-3"],
};
