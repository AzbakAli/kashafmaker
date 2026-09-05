import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");
  const pathname = req.nextUrl.pathname;
  const role = req.auth?.user?.role;

  if (isApiAuth) return NextResponse.next();

  if (!isLoggedIn && !isLoginPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (role === "OPERATOR") {
    if (pathname.startsWith("/settings") || pathname.startsWith("/templates")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (role === "MANAGER" && pathname.startsWith("/settings")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
