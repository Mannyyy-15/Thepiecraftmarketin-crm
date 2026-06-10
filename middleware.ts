import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "7f5ae1278fd908819ab26c6d093b137e0c4a45a33c1f01c9a62ef3ff3c4372ab";
const key = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 1. Retrieve the token cookie
  const token = request.cookies.get("token")?.value;

  // Define route classifications
  const isAdminRoute = path.startsWith("/admin");
  const isEmployeeRoute = path.startsWith("/employee");
  const isClientRoute = path.startsWith("/client");
  const isLoginRoute = path === "/login";

  // 2. No session token found
  if (!token) {
    // If attempting to visit a protected route, redirect to login page
    if (isAdminRoute || isEmployeeRoute || isClientRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Allow access to public pages (like / or /login)
    return NextResponse.next();
  }

  // 3. Session token exists, attempt to verify it
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

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
    response.cookies.delete("token");
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
