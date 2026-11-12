import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { canManageData } from "@/lib/constants";

const encoder = new TextEncoder();

async function verify(token) {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(process.env.JWT_SECRET || ""));
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Public admin login page must stay reachable
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const isProtectedPage = pathname.startsWith("/admin");
  const isProtectedApi =
    (pathname.startsWith("/api/applications") &&
      !(pathname === "/api/applications" && req.method === "POST")) || // public create stays open
    pathname.startsWith("/api/seats");

  const isTrackApi = pathname.startsWith("/api/track");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }
  if (isTrackApi || isAuthApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  const payload = token ? await verify(token) : null;

  if (!payload) {
    if (isProtectedPage) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Excel export/import restricted to data-admin roles (Super Admin)
  if (
    (pathname.startsWith("/api/applications/export") ||
      pathname.startsWith("/api/applications/import")) &&
    !canManageData(payload.role)
  ) {
    return NextResponse.json({ error: "Not authorized for this action" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/applications/:path*", "/api/seats/:path*"],
};
