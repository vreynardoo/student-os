import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { shouldRedirectToLogin } from "@/lib/auth/route-protection";

export default auth((req) => {
  if (shouldRedirectToLogin(req.nextUrl.pathname, !!req.auth)) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/courses/:path*", "/tasks/:path*", "/schedule/:path*", "/advisor/:path*"],
};
