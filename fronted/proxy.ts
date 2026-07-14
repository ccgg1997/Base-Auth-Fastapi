import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-config";

export function proxy(request: NextRequest) {
  if (!request.cookies.get(AUTH_COOKIE_NAME)?.value) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/menu/:path*"],
};
