import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import {
  getSessionSecret,
  isSessionPayload,
  SESSION_AUDIENCE,
  SESSION_COOKIE_NAME,
  SESSION_ISSUER,
} from "@/lib/security/session";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 1. Retrieve the token cookie
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Define route classifications
  const isAdminRoute = path.startsWith("/admin");
  const isEmployeeRoute = path.startsWith("/employee");
  const isClientRoute = path.startsWith("/client");
  const isLoginRoute = path === "/login";

  // 2. No session token found
  const key = getSessionSecret();
  if (!token || !key) {
    // If attempting to visit a protected route, redirect to login page
    if (isAdminRoute || isEmployeeRoute || isClientRoute) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      if (token) response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
    // Allow access to public pages (like / or /login)
    return NextResponse.next();
  }

  // 3. Session token exists, attempt to verify it
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (!isSessionPayload(payload)) throw new Error("Invalid session claims");

    const userRole = payload.role as string;

    // If verified user attempts to access /login, redirect to their dashboard
    if (isLoginRoute) {
      if (userRole === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else if (userRole === "employee") {
        return NextResponse.redirect(new URL("/employee", request.url));
      } else if (userRole === "client") {
        return NextResponse.redirect(new URL("/client", request.url));
      }
    }

    // Role Guard redirects: ensure user role matches the directory path
    if (isAdminRoute && userRole !== "admin") {
      // Bouncer: send to correct dashboard
      const dest = userRole === "employee" ? "/employee" : "/client";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (isEmployeeRoute && userRole !== "employee") {
      const dest = userRole === "admin" ? "/admin" : "/client";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (isClientRoute && userRole !== "client") {
      const dest = userRole === "admin" ? "/admin" : "/employee";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    // All guards passed, allow access
    return NextResponse.next();
  } catch (error) {
    console.error("[Middleware] JWT verification failed:", error);
    // Token is corrupt/expired, clear it and redirect to login page
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

// Config to specify matching paths
export const config = {
  matcher: [
    "/admin/:path*",
    "/employee/:path*",
    "/client/:path*",
    "/login",
  ],
};
